/**
 * Firebase Cloud Functions for the Support Kiosk (2nd Generation)
 * Version: 2.7 - Google Sheets to Firestore Sync
 * This version adds a new secure endpoint to receive data from a Google Apps
 * Script, allowing new rows in the waiver sheet to be synced back to Firestore.
 * It also corrects the Spreadsheet ID for the waiver export function.
 */
const { onRequest } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");
const fetch = require("node-fetch");
const express = require("express");
const cors = require("cors");
const { google } = require("googleapis");
const { Readable } = require("stream");
const nodemailer = require('nodemailer');
const { SpeechClient } = require("@google-cloud/speech").v1;

// Initialize Firebase Admin SDK
admin.initializeApp();
setGlobalOptions({ region: "us-central1" });

// --- Nodemailer Transport ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_EMAIL,
        pass: process.env.GMAIL_APP_PASSWORD,
    },
});


// Create an Express app instance for API endpoints
const app = express();
app.use(cors({ origin: ["https://supportkiosk-b43dd.web.app", "http://localhost:3000", "http://localhost:3001"] }));
app.use(express.json({ limit: "50mb" }));

// --- Middleware ---
const authenticate = async (req, res, next) => {
    if (!req.headers.authorization || !req.headers.authorization.startsWith('Bearer ')) {
        return res.status(403).send({error: 'Unauthorized: No token provided.'});
    }
    const idToken = req.headers.authorization.split('Bearer ')[1];
    try {
        const decodedIdToken = await admin.auth().verifyIdToken(idToken);
        req.user = decodedIdToken;
        next();
    } catch (e) {
        return res.status(403).send({error: 'Unauthorized: Invalid token.'});
    }
};

const requireLeadership = async (req, res, next) => {
    const userDoc = await admin.firestore().collection('users').doc(req.user.uid).get();
    if (!userDoc.exists || userDoc.data().role !== 'leadership') {
        return res.status(403).send({error: 'Forbidden: Insufficient permissions.'});
    }
    next();
};

// --- API Routes ---
app.post("/preauthorizeUser", authenticate, requireLeadership, async (request, response) => {
    const { email, name, role } = request.body;

    if (!email || !name || !role) {
        return response.status(400).send({ error: "Missing required fields: email, name, or role." });
    }
    if (role !== 'technician' && role !== 'leadership') {
        return response.status(400).send({ error: "Invalid role specified." });
    }

    try {
        const userRecord = await admin.auth().getUserByEmail(email);
        const uid = userRecord.uid;

        await admin.firestore().collection('users').doc(uid).set({
            email: email,
            name: name,
            role: role
        });

        return response.status(200).send({ success: true, message: `User ${email} has been authorized with the role: ${role}.` });

    } catch (error) {
        console.error("Error in preauthorizeUser:", error);
        if (error.code === 'auth/user-not-found') {
            return response.status(404).send({ error: "User not found. The user must have a Google account with this email address, but they do not need to have logged into the kiosk app." });
        }
        return response.status(500).send({ error: "Internal Server Error." });
    }
});

app.post("/findUser", async (request, response) => {
    const token = process.env.INCIDENT_IQ_API_TOKEN;
    if (!token) {
        return response.status(500).send({ error: "Server configuration error." });
    }
    if (!request.body || !request.body.searchTerm) {
        return response.status(400).send({ error: "Bad Request: Missing searchTerm." });
    }
    const { searchTerm } = request.body;
    const districtUrl = "https://normanps.incidentiq.com";
    
    const headers = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "siteid": "1e23170a-2e1b-49cd-b6a6-2d9f9e12a892",
        "client": "ApiClient",
    };

    try {
        const directUrl = `${districtUrl}/api/v1.0/users/${encodeURIComponent(searchTerm)}`;
        const directResponse = await fetch(directUrl, { method: 'GET', headers: headers });

        if (directResponse.ok) {
            const userData = await directResponse.json();
            return response.status(200).send([userData]);
        }

        if (directResponse.status !== 404) {
             const errorData = await directResponse.text();
             console.error(`Incident IQ Direct Lookup Error for "${searchTerm}". Status: ${directResponse.status}, Response:`, errorData);
             return response.status(directResponse.status).send(JSON.parse(errorData || '{}'));
        }

        console.log(`Direct lookup for "${searchTerm}" failed with 404. Falling back to search.`);
        const searchUrl = `${districtUrl}/services/users?$filter=(SearchText contains '${encodeURIComponent(searchTerm)}')`;
        const searchResponse = await fetch(searchUrl, { method: 'GET', headers: headers });

        if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            return response.status(200).send(searchData.Items || []);
        } else {
            const errorData = await searchResponse.text();
            console.error(`Incident IQ Fallback Search Error for "${searchTerm}". Status: ${searchResponse.status}, Response:`, errorData);
            return response.status(searchResponse.status).send(JSON.parse(errorData || '{}'));
        }

    } catch (error) {
        console.error("Error in /findUser endpoint:", error);
        return response.status(500).send({ error: "Internal Server Error" });
    }
});


app.post("/incidentIqProxy", async (request, response) => {
  const token = process.env.INCIDENT_IQ_API_TOKEN;
  if (!token) {
    console.error("CRITICAL: INCIDENT_IQ_API_TOKEN was not found in process.env.");
    return response.status(500).send({ error: "Server configuration error." });
  }
  if (!request.body || !request.body.path || !request.body.method) {
    console.error("Bad Request: Missing path or method in body.", request.body);
    return response.status(400).send({ error: "Bad Request: Missing path or method." });
  }
  const { path, method, body } = request.body;
  const districtUrl = "https://normanps.incidentiq.com";
  const apiUrl = `${districtUrl}${path}`;
  try {
    const apiResponse = await fetch(apiUrl, {
      method: method,
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "Accept": "application/json",
        "siteid": "1e23170a-2e1b-49cd-b6a6-2d9f9e12a892",
        "client": "ApiClient",
      },
      body: method === "POST" ? JSON.stringify(body) : null,
    });
    const responseText = await apiResponse.text();
    const responseData = responseText ? JSON.parse(responseText) : null;
    if (!apiResponse.ok) {
      console.error(`Incident IQ API Error. Response:`, responseData);
      return response.status(apiResponse.status).send(responseData);
    }
    return response.status(200).send(responseData);
  } catch (error) {
    console.error("Error in Incident IQ proxy:", error);
    return response.status(500).send({ error: "Internal Server Error" });
  }
});

app.post("/geminiProxy", async (request, response) => {
    if (!process.env.GEMINI_API_KEY) {
      console.error("Gemini API Key secret is not loaded in the environment.");
      return response.status(500).send({ error: "Server configuration error." });
    }
    if (!request.body || !request.body.body) {
        console.error("Bad Request: Missing 'body' wrapper in request.", request.body);
        return response.status(400).send({error: "Bad Request: Missing 'body' wrapper."});
    }
    const {body} = request.body;
    const apiKey = process.env.GEMINI_API_KEY;
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    try {
      const apiResponse = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      const responseData = await apiResponse.json();
      if (!apiResponse.ok) {
        console.error("Gemini API Error:", responseData);
        return response.status(apiResponse.status).send(responseData);
      }
      return response.status(200).send(responseData);
    } catch (error) {
      console.error("Error in Gemini proxy:", error);
      return response.status(500).send({error: "Internal Server Error"});
    }
});

app.post("/uploadVideo", async (request, response) => {
    const FOLDER_ID = "1eo75hAgvRoVpnarn0WMkxWaJup4FB-_U";
    if (!process.env.GOOGLE_DRIVE_CREDENTIALS) {
        console.error("Google Drive credentials secret is not set.");
        return response.status(500).send({ error: "Server configuration error." });
    }
    if (!request.body.fileName || !request.body.fileData || !request.body.metadata) {
        return response.status(400).send({ error: "Missing fileName, fileData, or metadata." });
    }
    try {
        const credentials = JSON.parse(process.env.GOOGLE_DRIVE_CREDENTIALS);
        const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ["https://www.googleapis.com/auth/drive"],
        });
        const drive = google.drive({ version: "v3", auth });
        const { fileName, fileData, metadata } = request.body;
        const buffer = Buffer.from(fileData, 'base64');
        const stream = Readable.from(buffer);
        const fileMetadata = {
            name: fileName,
            parents: [FOLDER_ID],
            properties: metadata,
         };
        const media = {
            mimeType: 'audio/webm',
            body: stream,
        };
        const file = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id, webViewLink',
            supportsAllDrives: true
        });
        await drive.permissions.create({
            fileId: file.data.id,
            requestBody: {
                role: 'reader',
                type: 'anyone',
            },
            supportsAllDrives: true
        });
        response.status(200).send({ link: file.data.webViewLink });
    } catch (error) {
        console.error("Google Drive upload failed:", error);
        response.status(500).send({ error: "Failed to upload video." });
    }
});

// NEW: Secure endpoint to sync a waiver from Google Sheets to Firestore
app.post("/syncWaiverFromSheet", async (request, response) => {
    const apiKey = request.headers['x-api-key'];
    if (apiKey !== process.env.SHEET_SYNC_API_KEY) {
        return response.status(401).send({ error: "Unauthorized" });
    }

    const waiverData = request.body;
    if (!waiverData || !waiverData.timestamp) {
        return response.status(400).send({ error: "Bad Request: Missing waiver data or timestamp." });
    }

    try {
        const waiversRef = admin.firestore().collection('waivers');
        // Prevent duplicates by checking if a waiver with the same timestamp already exists
        const snapshot = await waiversRef.where('timestamp', '==', waiverData.timestamp).get();
        if (!snapshot.empty) {
            console.log(`Waiver with timestamp ${waiverData.timestamp} already exists. Skipping.`);
            return response.status(200).send({ message: "Duplicate waiver skipped." });
        }

        await waiversRef.add(waiverData);
        console.log(`Successfully synced waiver for ${waiverData.userName} from Google Sheet.`);
        return response.status(201).send({ success: true });
    } catch (error) {
        console.error("Error syncing waiver to Firestore:", error);
        return response.status(500).send({ error: "Internal Server Error" });
    }
});

// NEW: Google Cloud Speech-to-Text endpoint for fallback transcription (iPad Safari, etc.)
app.post("/transcribeAudio", async (request, response) => {
    if (!request.body || !request.body.audioData) {
        return response.status(400).send({ error: "Missing audioData in request body." });
    }

    try {
        const { audioData, encoding = "MP4", sampleRateHertz = 16000, languageCode = "en-US" } = request.body;
        
        // Decode base64 audio data
        const audioBuffer = Buffer.from(audioData, 'base64');

        // Initialize Cloud Speech-to-Text client
        // The client will automatically use Application Default Credentials from Firebase Admin SDK
        const client = new SpeechClient();

        // Prepare the audio request
        const request_obj = {
            audio: {
                content: audioBuffer,
            },
            config: {
                encoding: encoding,
                sampleRateHertz: sampleRateHertz,
                languageCode: languageCode,
            },
        };

        // Call Google Cloud Speech-to-Text
        console.log("Calling Google Cloud Speech-to-Text API...");
        const [response_obj] = await client.recognize(request_obj);
        const transcription = response_obj.results
            .map(result => result.alternatives[0].transcript)
            .join('\n');

        console.log(`Transcription successful: ${transcription.substring(0, 100)}...`);
        return response.status(200).send({ transcript: transcription });
    } catch (error) {
        console.error("Error in transcribeAudio:", error);
        return response.status(500).send({ error: "Failed to transcribe audio. " + error.message });
    }
});




app.use('*', (request, response) => { response.status(404).send(`Route not found.`); });

exports.api = onRequest(
  { secrets: [
        "INCIDENT_IQ_API_TOKEN", 
        "GEMINI_API_KEY", 
        "GOOGLE_DRIVE_CREDENTIALS", 
        "GMAIL_EMAIL", 
        "GMAIL_APP_PASSWORD",
        "GOOGLE_SHEETS_CREDENTIALS",
        "SHEET_SYNC_API_KEY" // Add the new secret for the sync endpoint
    ] },
  app
);

exports.onMessageCreated = onDocumentCreated(
    {
        document: "messages/{messageId}",
        secrets: ["GMAIL_EMAIL", "GMAIL_APP_PASSWORD"],
    },
    async (event) => {
    const messageData = event.data.data();
    
    if (!messageData || !messageData.userLocation) {
        console.log("New message document is missing data or location. Aborting.");
        return;
    }

    try {
        const locationsRef = admin.firestore().collection('locations');
        const snapshot = await locationsRef.where('name', '==', messageData.userLocation).get();

        let toEmails;

        if (snapshot.empty) {
            console.warn(`No location found matching: ${messageData.userLocation}. Sending to fallback.`);
            toEmails = ['helpdesk@normanps.org'];
        } else {
            const locationDoc = snapshot.docs[0].data();
            const assignedEmails = locationDoc.assignedTechEmails;
            if (!assignedEmails || assignedEmails.length === 0) {
                console.warn(`Location ${messageData.userLocation} has no assigned technicians. Sending to fallback.`);
                toEmails = ['helpdesk@normanps.org'];
            } else {
                toEmails = assignedEmails;
            }
        }

        const mailOptions = {
            from: `"Support Kiosk" <helpdesk@normanps.org>`,
            to: toEmails.join(', '),
            bcc: 'tutley@normanps.org',
            subject: `New Message from ${messageData.userName} at ${messageData.userLocation}`,
            html: `
                <p>You have received a new message via the support kiosk.</p>
                <ul>
                    <li><strong>From:</strong> ${messageData.userName}</li>
                    <li><strong>School ID:</strong> ${messageData.schoolId || 'Not provided'}</li>
                    <li><strong>Location:</strong> ${messageData.userLocation}</li>
                </ul>
                <hr>
                <h3>AI Summary of Message:</h3>
                <p><em>${messageData.summary}</em></p>
                <hr>
                <p><a href="${messageData.videoLink}">Click here to watch the full video message.</a></p>
            `
        };

        await transporter.sendMail(mailOptions);
        console.log(`Message email sent successfully to: ${toEmails.join(', ')} with BCC to tutley@normanps.org`);

    } catch (error) {
        console.error("Error in onMessageCreated trigger:", error);
    }
});

exports.onWaiverCreated = onDocumentCreated(
    {
        document: "waivers/{waiverId}",
        secrets: ["GOOGLE_SHEETS_CREDENTIALS"],
    },
    async (event) => {
        const waiverData = event.data.data();
        if (!waiverData) {
            console.log("New waiver document is empty. Aborting.");
            return;
        }

        const SPREADSHEET_ID = '1SwpvoXuyZBzbL3tM_O2RGeHl2RkD9i3WFOzqiUhvqT4';
        const SHEET_NAME = 'Form Responses 1'; 

        try {
            const credentials = JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS);
            const auth = new google.auth.GoogleAuth({
                credentials,
                scopes: ["https://www.googleapis.com/auth/spreadsheets"],
            });
            const sheets = google.sheets({ version: "v4", auth });

            const nameParts = waiverData.userName.split(' ');
            const firstName = nameParts.slice(0, -1).join(' ');
            const lastName = nameParts.length > 1 ? nameParts.slice(-1).join(' ') : '';

            const row = [
                waiverData.timestamp,
                waiverData.userEmail,
                lastName,
                firstName,
                waiverData.schoolId,
                waiverData.waiverReason,
                waiverData.isFirstRequest,
                waiverData.ackFuture ? 'Yes' : 'No',
                waiverData.ackCare ? 'Yes' : 'No',
            ];

            await sheets.spreadsheets.values.append({
                spreadsheetId: SPREADSHEET_ID,
                range: `${SHEET_NAME}!A1`,
                valueInputOption: 'USER_ENTERED',
                resource: {
                    values: [row],
                },
            });

            console.log(`Successfully wrote waiver for ${waiverData.userName} to Google Sheet.`);

        } catch (error) {
            console.error("Error writing to Google Sheet:", error);
        }
    }
);
