const functions = require("firebase-functions");
const fetch = require("node-fetch");
const cors = require("cors")({origin: true});

// Set secrets in your terminal before deploying:
// firebase functions:secrets:set GEMINI_API_KEY
// firebase functions:secrets:set INCIDENT_IQ_API_TOKEN
const {gemini_api_key, incident_iq_api_token} = functions.config().secrets;

/**
 * A generic proxy for making authenticated requests to the Incident IQ API.
 */
const incidentIqProxy = functions.https.onRequest((request, response) => {
  cors(request, response, async () => {
    const {path, method, body} = request.body;
    const districtUrl = "https://normanps.incidentiq.com";
    const apiUrl = `${districtUrl}${path}`;

    try {
      const apiResponse = await fetch(apiUrl, {
        method: method,
        headers: {
          "Authorization": `Bearer ${incident_iq_api_token.value()}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
          "siteid": "1e23170a-2e1b-49cd-b6a6-2d9f9e12a892",
          "client": "ApiClient",
        },
        body: method === "POST" ? JSON.stringify(body) : null,
      });

      const responseData = await apiResponse.json();
      if (!apiResponse.ok) {
        console.error("Incident IQ API Error:", responseData);
        response.status(apiResponse.status).send(responseData);
        return;
      }
      response.status(200).send(responseData);
    } catch (error) {
      console.error("Error in Incident IQ proxy:", error);
      response.status(500).send({error: "Internal Server Error"});
    }
  });
});

/**
 * A secure proxy for making requests to the Google Generative AI (Gemini) API.
 */
const geminiProxy = functions.https.onRequest((request, response) => {
  cors(request, response, async () => {
    const {body} = request;
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${gemini_api_key.value()}`;

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
        response.status(apiResponse.status).send(responseData);
        return;
      }
      response.status(200).send(responseData);
    } catch (error) {
      console.error("Error in Gemini proxy:", error);
      response.status(500).send({error: "Internal Server Error"});
    }
  });
});

module.exports = {
  incidentIqProxy,
  geminiProxy,
};
