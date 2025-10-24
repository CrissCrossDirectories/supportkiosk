import React, { useState, useEffect, useRef, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, onSnapshot, getDoc, query, where, getDocs, updateDoc, writeBatch, arrayUnion, arrayRemove, addDoc, orderBy, limit } from 'firebase/firestore';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';


// --- Configuration ---
const firebaseConfig = {
    apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
    authDomain: "supportkiosk-b43dd.firebaseapp.com",
    projectId: "supportkiosk-b43dd",
    storageBucket: "supportkiosk-b43dd.firestorageapp",
    messagingSenderId: "315490541997",
    appId: "1:315490541997:web:21c3aff2b67ea72ab94124"
};
const FIREBASE_FUNCTIONS_URL = "https://us-central1-supportkiosk-b43dd.cloudfunctions.net";
const GEMINI_PROXY_URL = `${FIREBASE_FUNCTIONS_URL}/api/geminiProxy`;
const INCIDENTIQ_PROXY_URL = `${FIREBASE_FUNCTIONS_URL}/api/incidentIqProxy`;
const VIDEO_UPLOAD_URL = `${FIREBASE_FUNCTIONS_URL}/api/uploadVideo`;


// --- Helper Icons (as SVG/React components) ---
const NTechLogo = () => ( <img src="/ntech-logo.png" alt="N-Tech Logo" className="h-16 w-auto" /> );
const GoogleIcon = () => (<svg className="w-6 h-6" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"></path><path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"></path><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"></path><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C44.599 36.337 48 30.836 48 24c0-1.341-.138-2.65-.389-3.917z"></path></svg>);
const LogoutIcon = () => (<svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>);
const LoadingSpinner = () => (<svg className="animate-spin h-10 w-10 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>);
const TrashIcon = () => (<svg className="w-5 h-5 text-gray-400 hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>);
const ChevronUpIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" /></svg>;
const ChevronDownIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>;
const UserHistoryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 hover:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>;
const CheckCircleIcon = ({ className }) => (<svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm13.36-1.814a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" /></svg>);
const MicIcon = ({ className }) => (<svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4V4c0-2.21-1.79-4-4-4S8 1.79 8 4v4c0 2.21 1.79 4 4 4zm-2-4c0-1.1.9-2 2-2s2 .9 2 2v4c0 1.1-.9 2-2 2s-2-.9-2-2V8zm10 4h-2c0 3.31-2.69 6-6 6s-6-2.69-6-6H4c0 4.42 3.58 8 8 8v3h2v-3c4.42 0 8-3.58 8-8z"/></svg>);

// --- Main App Component ---
export default function App() {
    const [view, setView] = useState('kiosk');
    const [kioskFlow, setKioskFlow] = useState('home');
    const [user, setUser] = useState(null);
    const [userInfo, setUserInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authAttempted, setAuthAttempted] = useState(false);
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [cameraDeviceId, setCameraDeviceId] = useState(null);
    
    // --- Battery/Memory Optimization: Idle Activity Tracking ---
    const lastActivityTimeRef = useRef(Date.now());
    const activityCheckIntervalRef = useRef(null);
    
    useEffect(() => {
        // Track user activity to prevent memory accumulation
        const handleActivity = () => {
            lastActivityTimeRef.current = Date.now();
        };
        
        // Listen for touch events (iPad kiosk interaction)
        window.addEventListener('touchstart', handleActivity, { passive: true });
        window.addEventListener('touchmove', handleActivity, { passive: true });
        window.addEventListener('touchend', handleActivity, { passive: true });
        
        // Check every 5 minutes if idle for more than 30 minutes
        activityCheckIntervalRef.current = setInterval(() => {
            const idleTime = Date.now() - lastActivityTimeRef.current;
            const thirtyMinutesMs = 30 * 60 * 1000;
            
            if (idleTime > thirtyMinutesMs) {
                console.log('Kiosk idle for 30+ minutes. Restarting app to free memory...');
                window.location.reload();
            }
        }, 5 * 60 * 1000);  // Check every 5 minutes
        
        // Cleanup
        return () => {
            window.removeEventListener('touchstart', handleActivity);
            window.removeEventListener('touchmove', handleActivity);
            window.removeEventListener('touchend', handleActivity);
            if (activityCheckIntervalRef.current) {
                clearInterval(activityCheckIntervalRef.current);
            }
        };
    }, []);

    useEffect(() => {
        // Pre-load camera and audio permissions and device ID to speed up initialization
        const getMediaPermissions = async () => {
            try {
                console.log("Requesting camera and audio permissions...");
                const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                const videoTracks = stream.getVideoTracks();
                console.log("Camera permissions granted, video tracks:", videoTracks.length);
                if (videoTracks.length > 0) {
                    // Get the device ID of the first video track
                    const deviceId = videoTracks[0].getSettings().deviceId;
                    console.log("Camera device ID:", deviceId);
                    if (deviceId) {
                        setCameraDeviceId(deviceId);
                    }
                }
                // Only stop video tracks, leave the audio track available for SpeechRecognition
                stream.getVideoTracks().forEach(track => track.stop());
                console.log("Camera permission pre-loading complete");
            } catch (err) {
                console.error("Error pre-loading camera and audio:", err);
                // The user will be prompted for camera/audio access later if it failed here.
            }
        };
        getMediaPermissions();
    }, []);

    useEffect(() => {
        try {
            const app = initializeApp(firebaseConfig);
            const firestoreDb = getFirestore(app);
            const firebaseAuth = getAuth(app);
            setDb(firestoreDb);
            setAuth(firebaseAuth);

            onAuthStateChanged(firebaseAuth, async (authUser) => {
                setAuthAttempted(true);
                if (authUser && !authUser.isAnonymous) {
                    setUser(authUser);
                    const userDocRef = doc(firestoreDb, 'users', authUser.uid);
                    const unsubscribe = onSnapshot(userDocRef, (doc) => {
                        if (doc.exists()) {
                            setUserInfo({ id: doc.id, ...doc.data() });
                        } else {
                            setUserInfo({ role: 'guest' });
                        }
                        setLoading(false);
                    });
                    return () => unsubscribe();
                } else {
                    setUser(null);
                    setUserInfo(null);
                    setView('kiosk');
                    setKioskFlow('home');
                    setLoading(false);
                }
            });
        } catch (e) {
            console.error("Firebase init error:", e);
            setLoading(false); // Ensure loading stops even if Firebase fails
            setAuthAttempted(true);
        }
    }, []);

    useEffect(() => {
        if (userInfo && view === 'kiosk') {
            if (userInfo.role === 'technician') {
                setView('admin');
            } else if (userInfo.role === 'leadership') {
                setView('leadership');
            }
        }
    }, [userInfo, view]);

    const handleGoogleSignIn = async () => {
        if (!auth || !db) return;
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            const authUser = result.user;
            const email = authUser.email;

            const domain = email.substring(email.lastIndexOf('@') + 1);
            if (domain !== 'normanps.org') {
                alert("Access Denied. Please sign in with your normanps.org Google account.");
                await signOut(auth);
                return;
            }

            const userDocRef = doc(db, 'users', authUser.uid);
            const userDoc = await getDoc(userDocRef);

            if (!userDoc.exists() || (userDoc.data().role !== 'technician' && userDoc.data().role !== 'leadership')) {
                alert("Access Denied. Your account does not have administrative privileges for this system.");
                await signOut(auth);
                return;
            }
        } catch (error) {
            console.error("Authentication error:", error);
        }
    };

    const handleSignOut = () => {
        if (auth) {
            signOut(auth);
        }
    };

    const resetToKioskHome = () => {
        setView('kiosk');
        setKioskFlow('home');
    };

    if (loading || !authAttempted) {
        return (
            <div className="w-screen h-screen bg-gray-900 flex justify-center items-center">
                <LoadingSpinner />
            </div>
        );
    }

    const renderView = () => {
        // FIX: Prevent kiosk flows from rendering until the main app is fully loaded.
        if (loading) {
            return null; // Let the main loading spinner handle the UI
        }
        if (view === 'admin' && (userInfo?.role === 'technician' || userInfo?.role === 'leadership')) {
            return <AdminDashboard db={db} setView={setView} userInfo={userInfo} />;
        }
        if (view === 'leadership' && userInfo?.role === 'leadership') {
            return <LeadershipDashboard db={db} auth={auth} setView={setView} />;
        }
        switch (kioskFlow) {
            case 'home': return <KioskHome setKioskFlow={setKioskFlow} />;
            case 'checkin': return <CheckInFlow onExit={resetToKioskHome} cameraDeviceId={cameraDeviceId} />;
            case 'message': return <LeaveMessageFlow onExit={resetToKioskHome} cameraDeviceId={cameraDeviceId} />;
            case 'waiver': return <DamageWaiverFlow db={db} onExit={resetToKioskHome} cameraDeviceId={cameraDeviceId} />;
            default: return <KioskHome setKioskFlow={setKioskFlow} />;
        }
    };

    return (
        <div className="w-screen h-screen bg-gray-800 text-white flex flex-col font-sans">
             <style>{`
                @keyframes scan { 0% { top: 0; } 100% { top: calc(100% - 4px); } } 
                .animate-scan { animation: scan 2.5s linear infinite alternate; }
                .no-select {
                    -webkit-user-select: none; /* Safari */
                    -ms-user-select: none; /* IE 10 and IE 11 */
                    user-select: none; /* Standard syntax */
                }
                #scanner-container video {
                    width: 100% !important;
                    height: 100% !important;
                    object-fit: cover !important;
                    transform: scaleX(-1); /* Flips the video horizontally for a mirror effect */
                }
             `}</style>
            <Header user={user} userInfo={userInfo} onSignIn={handleGoogleSignIn} onSignOut={handleSignOut} setView={setView} onLogoClick={resetToKioskHome} />
            <main className="flex-grow overflow-y-auto">{renderView()}</main>
        </div>
    );
}

// --- CORE APP COMPONENTS ---

const Header = ({ user, userInfo, onSignIn, onSignOut, setView, onLogoClick }) => (
    <header className="bg-gray-900/80 backdrop-blur-sm shadow-lg p-4 flex justify-between items-center z-50">
        <div className="flex items-center gap-4 cursor-pointer" onClick={onLogoClick}>
            <NTechLogo />
            <div>
                <h1 className="text-2xl font-bold text-white">Tech Support Kiosk</h1>
                <p className="text-md text-cyan-300">Norman Public Schools</p>
            </div>
        </div>
        <div className="flex items-center gap-4">
            {user && userInfo && userInfo.role !== 'guest' ? (
                <>
                    {userInfo.role === 'technician' && (
                        <button onClick={() => setView('admin')} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-md font-semibold">Tech Dashboard</button>
                    )}
                    {userInfo.role === 'leadership' && (
                        <button onClick={() => setView('leadership')} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-md font-semibold">Leadership</button>
                    )}
                    <div className="text-right">
                        <p className="font-semibold">{user.displayName}</p>
                        <p className="text-sm text-gray-400 capitalize">{userInfo.role}</p>
                    </div>
                    <button onClick={onSignOut} className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-500 rounded-md font-semibold">
                        <LogoutIcon /> Sign Out
                    </button>
                </>
            ) : (
                <button onClick={onSignIn} className="flex items-center gap-2 px-4 py-2 bg-white text-gray-800 rounded-md font-semibold hover:bg-gray-200 transition-colors">
                    <GoogleIcon /> Admin Sign In
                </button>
            )}
        </div>
    </header>
);

const KioskHome = ({ setKioskFlow }) => (
    <div className="h-full flex flex-col justify-center items-center p-8 text-center">
        <div className="mb-12">
            <h2 className="text-5xl font-bold mb-4 text-white">How can we help you today?</h2>
            <p className="text-2xl text-gray-300">Select an option below to get started</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl">
            <KioskButton 
                title="Check In For Tech Help" 
                description="Report a problem with your device and get in the queue." 
                onClick={() => setKioskFlow('checkin')}
                icon="📋"
            />
            <KioskButton 
                title="Leave a Message" 
                description="Leave a video message for your site tech if they are unavailable." 
                onClick={() => setKioskFlow('message')}
                icon="💬"
            />
            <KioskButton 
                title="Fill Out Damage Waiver" 
                description="Complete the form to request a waiver for an accidental damage copay." 
                onClick={() => setKioskFlow('waiver')}
                icon="📄"
            />
        </div>
    </div>
);

const KioskButton = ({ title, description, onClick, icon }) => (
    <button onClick={onClick} className="bg-gray-700/50 hover:bg-cyan-600/50 border-2 border-gray-600 hover:border-cyan-400 rounded-2xl p-8 flex flex-col justify-center items-center text-center transition-all duration-300 transform hover:scale-105 no-select">
        <div className="text-6xl mb-4">{icon}</div>
        <h3 className="text-3xl font-bold text-cyan-300 mb-3">{title}</h3>
        <p className="text-gray-300">{description}</p>
    </button>
);

const DamageWaiverFlow = ({ db, onExit, cameraDeviceId }) => {
    const [status, setStatus] = useState('verifying_user');
    const [iiqUser, setIiqUser] = useState(null);
    const [userAssets, setUserAssets] = useState([]);
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [formData, setFormData] = useState({
        assetTag: '',
        waiverReason: '',
        isFirstRequest: 'Yes',
        ackFuture: false,
        ackCare: false,
    });
    const [resetSessionTimeoutRef, setResetSessionTimeoutRef] = useState(null);
    const [isListening, setIsListening] = useState(false);
    const [interimTranscript, setInterimTranscript] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    const recognitionRef = useRef(null);
    const finalTranscriptRef = useRef('');
    const silenceTimeoutRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const recordedChunksRef = useRef([]);

    const callProxy = async (url, body) => {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!response.ok) { throw new Error(`API Error: ${response.status}`); }
        const text = await response.text();
        return text ? JSON.parse(text) : {};
    };

    const blobToBase64 = (blob) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.onerror = (error) => reject(error);
        });
    };

    const uploadToGoogleDrive = async (audioBlob) => {
        if (!audioBlob || audioBlob.size === 0 || !iiqUser) return null;
        const date = new Date().toISOString().split('T')[0];
        const location = iiqUser.Location?.Name.replace(/ /g, '-') || 'Unknown-Location';
        const schoolId = iiqUser.SchoolIdNumber || 'Unknown-ID';
        const fileName = `${date}_Waiver_${location}_${schoolId}_AUDIO.webm`;
        const metadata = { userName: iiqUser.Name, userId: iiqUser.UserId, schoolId: iiqUser.SchoolIdNumber, userLocation: iiqUser.Location?.Name, type: 'waiver' };

        try {
            const base64Data = await blobToBase64(audioBlob);
            const response = await fetch(VIDEO_UPLOAD_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileName, fileData: base64Data, metadata }),
            });
            if (!response.ok) throw new Error(`Upload failed with status ${response.status}`);
            const result = await response.json();
            return result.link;
        } catch (error) {
            console.error("Failed to upload audio to Google Drive:", error);
            return `Upload failed: ${error.message}`;
        }
    };

    const stopRecording = () => {
        return new Promise((resolve) => {
            if (mediaRecorderRef.current && (mediaRecorderRef.current.state === 'recording' || mediaRecorderRef.current.state === 'paused')) {
                mediaRecorderRef.current.onstop = async () => {
                    const audioBlob = new Blob(recordedChunksRef.current, { type: 'audio/mp4' });
                    const audioLink = await uploadToGoogleDrive(audioBlob);
                    recordedChunksRef.current = [];
                    resolve(audioLink);
                };
                mediaRecorderRef.current.stop();
            } else {
                resolve(null);
            }
        });
    };

    const getUserAssets = async (UserId) => {
        try {
            console.log("DamageWaiverFlow: Fetching assets for UserId:", UserId);
            const data = await callProxy(INCIDENTIQ_PROXY_URL, { path: '/api/v1.0/assets', method: 'POST', body: { "Filters": [{ "Facet": "User", "Id": UserId }] } });
            console.log("DamageWaiverFlow: Received assets data:", data.Items);
            return data.Items || [];
        } catch (error) {
            console.error("DamageWaiverFlow: Error fetching user assets:", error);
            return null;
        }
    };

    const handleUserVerified = async (user) => {
        setIiqUser(user);
        setStatus('processing');
        const assets = await getUserAssets(user.UserId);
        if (assets && assets.length > 0) {
            setUserAssets(assets);
            setStatus('selecting_asset');
        } else {
            setStatus('filling_form');
        }
    };

    const handleAssetSelection = (asset) => {
        setSelectedAsset(asset);
        setFormData(prev => ({ ...prev, assetTag: asset?.AssetTag || '' }));
        setStatus('filling_form');
    };

    const handleInputChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!iiqUser || !db) return;

        setStatus('submitting');
        try {
            const audioLink = await stopRecording();

            const waiverData = {
                ...formData,
                assetDescription: selectedAsset?.Name || 'N/A',
                timestamp: new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' }),
                userName: iiqUser.Name,
                userEmail: iiqUser.Email,
                schoolId: iiqUser.SchoolIdNumber,
                userLocation: iiqUser.Location?.Name,
                audioLink: audioLink || null,
            };
            await addDoc(collection(db, "waivers"), waiverData);
            setStatus('submitted');
            const timeout = setTimeout(onExit, 10000);
            setResetSessionTimeoutRef(timeout);
        } catch (error) {
            console.error("Error submitting waiver:", error);
            setErrorMessage(error.message);
            setStatus('error');
        }
    };

    const summarizeWaiverReason = async (transcript) => {
        setStatus('processing');
        const prompt = `Concisely summarize the following reason for a fee waiver request into one paragraph: "${transcript}"`;
        const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }]};
        try {
            const result = await callProxy(GEMINI_PROXY_URL, { body: payload });
            const summary = result.candidates[0].content.parts[0].text;
            setFormData(prev => ({ ...prev, waiverReason: summary }));
        } catch (e) {
            setFormData(prev => ({ ...prev, waiverReason: transcript }));
        } finally {
            setStatus('filling_form');
        }
    };
    
    const handleListenStart = (event) => {
        event.preventDefault(); 
        finalTranscriptRef.current = '';
        if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);

        if (mediaRecorderRef.current?.state === 'paused') {
            mediaRecorderRef.current.resume();
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Speech recognition not supported on this browser.");
            return;
        }
        
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = (event) => console.error("Speech error:", event.error);
        
        recognition.onresult = (event) => {
            let final = '';
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) { final += event.results[i][0].transcript; } 
                else { interim += event.results[i][0].transcript; }
            }
            setInterimTranscript(interim);
            if (final) { finalTranscriptRef.current += final + ' '; }
        };
        
        recognition.start();
        recognitionRef.current = recognition; 
    };

    const handleListenStop = (event) => {
        event.preventDefault(); 

        if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.pause();
        }

        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        silenceTimeoutRef.current = setTimeout(() => {
            if (finalTranscriptRef.current) {
                summarizeWaiverReason(finalTranscriptRef.current.trim());
                finalTranscriptRef.current = '';
            }
        }, 2500);
    };

    useEffect(() => {
        const initializeMedia = async () => {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ 
                    video: false, 
                    audio: { 
                        noiseSuppression: true, 
                        echoCancellation: true,
                        autoGainControl: true  // iPad benefit: automatic gain control
                    } 
                });
                mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
                mediaRecorderRef.current.ondataavailable = (event) => {
                    if (event.data.size > 0) recordedChunksRef.current.push(event.data);
                };
                mediaRecorderRef.current.start();
                mediaRecorderRef.current.pause();
            } catch (err) {
                console.error("Media initialization failed in DamageWaiverFlow:", err);
                
                let friendlyError = "Microphone initialization failed.";
                if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
                    friendlyError = "Microphone access denied. Please enable microphone permissions in Settings > Safari > Tech Support Kiosk > Microphone.";
                } else if (err.name === "NotFoundError") {
                    friendlyError = "No microphone found on this device.";
                } else if (err.name === "NotReadableError") {
                    friendlyError = "Microphone is in use by another application.";
                }
                
                setErrorMessage(friendlyError);
            }
        };
        initializeMedia();

        return () => {
            if (resetSessionTimeoutRef) clearTimeout(resetSessionTimeoutRef);
            if (recognitionRef.current) {
                recognitionRef.current.stop();
                recognitionRef.current = null;
            }
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
            }
        };
    }, [resetSessionTimeoutRef]);

    if (status === 'verifying_user') {
        return <UserVerification onUserVerified={handleUserVerified} onExit={onExit} cameraDeviceId={cameraDeviceId} />;
    }
    
    if (status === 'processing' || status === 'submitting') {
        return <div className="h-full flex items-center justify-center"><LoadingSpinner /></div>;
    }

    if (status === 'selecting_asset') {
        return (
            <div className="h-full flex flex-col items-center justify-center p-4">
                <div className="bg-black/60 backdrop-blur-md p-6 rounded-2xl max-w-3xl w-full shadow-2xl border border-gray-500 flex flex-col items-center text-center">
                    <h2 className="text-3xl font-semibold text-cyan-400 mb-4">Which device is this waiver for?</h2>
                    <div className="max-h-64 overflow-y-auto grid grid-cols-2 md:grid-cols-3 gap-3 mt-4 p-2">
                        {userAssets.map(asset => (
                            <button key={asset.AssetId} onClick={() => handleAssetSelection(asset)} className="bg-cyan-600/50 hover:bg-cyan-500/80 text-white font-bold py-3 px-4 rounded-lg text-left no-select">
                                <p className="text-base">{asset.Name}</p>
                                <p className="text-xs text-cyan-200">Tag: {asset.AssetTag || 'N/A'}</p>
                            </button>
                        ))}
                         <button onClick={() => handleAssetSelection(null)} className="bg-gray-600/50 hover:bg-gray-500/80 text-white font-bold py-3 px-4 rounded-lg no-select">It's something else</button>
                    </div>
                </div>
            </div>
        );
    }

    if (status === 'submitted') {
        return (
            <div className="h-full flex items-center justify-center p-8">
                <div className="bg-teal-900/80 backdrop-blur-md p-8 rounded-2xl max-w-3xl w-full shadow-2xl border-2 border-cyan-500 text-center">
                    <CheckCircleIcon className="w-20 h-20 mx-auto text-cyan-400" />
                    <h2 className="text-4xl font-bold mt-4">Waiver Submitted!</h2>
                    <p className="text-xl mt-4">Thank you. Please see your site technician to get your device repaired or to be issued a replacement.</p>
                    <p className="text-md mt-2 text-gray-300">This screen will reset automatically.</p>
                </div>
            </div>
        );
    }
    
    if (status === 'error') {
         return (
            <div className="h-full flex items-center justify-center p-8 text-center">
                 <h2 className="text-4xl font-bold text-yellow-400">{errorMessage || "There was an error submitting your form."}</h2>
                 <p className="text-xl mt-4">Please try again or see a technician for help.</p>
                 <button onClick={onExit} className="mt-8 px-6 py-3 bg-cyan-600 rounded-lg font-bold">Return Home</button>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-4xl bg-gray-900/80 backdrop-blur-md p-8 rounded-2xl">
                <h2 className="text-3xl font-bold text-cyan-300 mb-2">Device Damage Waiver Form</h2>
                <p className="text-lg mb-6">For: <span className="font-bold">{iiqUser.Name}</span> ({iiqUser.Location?.Name})</p>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-lg text-gray-300 mb-2">Asset Tag #</label>
                        <div className="flex items-center gap-4">
                           <input type="text" name="assetTag" value={formData.assetTag} className="w-1/3 bg-gray-800 p-3 rounded-md focus:outline-none cursor-not-allowed" readOnly />
                           <p className="text-gray-400 flex-1">{selectedAsset?.Name || 'No device selected'}</p>
                        </div>
                    </div>
                    <div>
                        <label className="block text-lg text-gray-300 mb-2">Reason for copayment waiver request</label>
                        <textarea name="waiverReason" value={formData.waiverReason} onChange={handleInputChange} placeholder="You can type here, or use the button below to speak." className="w-full bg-gray-700 p-3 rounded-md h-24 focus:outline-none focus:ring-2 focus:ring-cyan-400" required />
                        <HoldToSpeakButton isListening={isListening} onListenStart={handleListenStart} onListenStop={handleListenStop} interimTranscript={interimTranscript} />
                    </div>
                    
                    <div>
                        <label className="text-lg text-gray-300">This is my first device repair copayment waiver request.</label>
                        <div className="flex gap-4 mt-2">
                            <label className="flex items-center gap-2"><input type="radio" name="isFirstRequest" value="Yes" checked={formData.isFirstRequest === 'Yes'} onChange={handleInputChange} className="form-radio bg-gray-700 border-gray-600 text-cyan-500 h-5 w-5" /> Yes</label>
                            <label className="flex items-center gap-2"><input type="radio" name="isFirstRequest" value="No" checked={formData.isFirstRequest === 'No'} onChange={handleInputChange} className="form-radio bg-gray-700 border-gray-600 text-cyan-500 h-5 w-5" /> No</label>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <label className="flex items-start gap-3 text-gray-300">
                            <input type="checkbox" name="ackFuture" checked={formData.ackFuture} onChange={handleInputChange} className="form-checkbox bg-gray-700 border-gray-600 text-cyan-500 h-5 w-5 mt-1" required />
                            <span>I understand that future copayment requests may not be approved and will require the review and approval of school administration and Technology Services.</span>
                        </label>
                         <label className="flex items-start gap-3 text-gray-300">
                            <input type="checkbox" name="ackCare" checked={formData.ackCare} onChange={handleInputChange} className="form-checkbox bg-gray-700 border-gray-600 text-cyan-500 h-5 w-5 mt-1" required />
                            <span>I understand the importance of taking care of district issued devices and the costs incurred when repairs are needed. I agree to do my best to ensure my device stays in good shape and will safeguard it appropriately.</span>
                        </label>
                    </div>

                    <div className="flex justify-end gap-4 pt-4">
                        <button type="button" onClick={onExit} className="px-6 py-3 bg-gray-600 hover:bg-gray-500 rounded-md">Cancel</button>
                        <button type="submit" className="px-6 py-3 bg-green-600 hover:bg-green-500 rounded-md font-semibold">Submit Waiver</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- REUSABLE KIOSK UI COMPONENTS ---
const HoldToSpeakButton = ({ isListening, onListenStart, onListenStop, interimTranscript }) => (
    <div className="mt-4 flex flex-col items-center">
        <button
            onMouseDown={onListenStart}
            onMouseUp={onListenStop}
            onTouchStart={onListenStart}
            onTouchEnd={onListenStop}
            className={`px-8 py-4 rounded-full transition-all duration-200 flex items-center gap-3 no-select ${isListening ? 'bg-red-600 animate-pulse' : 'bg-cyan-600 hover:bg-cyan-500'}`}
        >
            <MicIcon className="w-8 h-8 text-white" />
            <span className="text-white font-bold text-2xl">{isListening ? 'Listening...' : 'Hold to Speak'}</span>
        </button>
        <p className="text-2xl italic text-gray-300 mt-4 min-h-[32px]">"{interimTranscript}"</p>
    </div>
);

const LiveStatusDisplay = ({ status, interimTranscript, visitorName, iiqUser, problemDescription, identifiedAsset, isListening, errorMessage, potentialUser, potentialUsers, clarificationQuestion, onSelectUser, onTryAgain, userAssets, onAssetSelect, onCreateTicket, onRedoProblem, onConfirmUser, onListenStart, onListenStop, ticketDetails, scannerContainerRef, onRetryScanning, onRetrySpeaking, ticketSummary, troubleshootingTips, showTroubleshootingOption, onShowTroubleshooting }) => {
    let message = "";
    if (status === 'initializing') message = "Initializing systems...";
    if (status === 'awaiting_scan') message = "Please align your ID badge inside the box.";
    if (status === 'listening_for_id') message = "Please speak your ID number clearly.";
    if (status === 'awaiting_name') message = "I couldn't locate you. Please hold the button and say your name.";
    if (status === 'awaiting_name_fallback') message = "Couldn't find that ID. Please hold the button and say your name instead.";
    if (status === 'name_lookup_failed') message = "I couldn't find that person. Let's try again—please scan your badge or say your name.";
    if (status === 'awaiting_selection') message = "I found a few people. Please tap your name to continue.";
    if (status === 'awaiting_asset_selection') message = `Hi, ${visitorName}. Which device are you having an issue with?`;
    if (status === 'awaiting_id_confirmation') message = `Thanks, ${potentialUser.Name}. Is that correct?`;
    if (status === 'awaiting_barcode_confirmation') message = `I see you're ${potentialUser.Name}. Is that correct?`;
    if (status === 'processing' || status === 'verifying') message = "One moment...";
    if (status === 'awaiting_problem') message = `Thanks, ${visitorName}. Please hold the button and describe your issue.`;
    if (status === 'awaiting_clarification') message = clarificationQuestion || "Let me ask a quick follow-up...";
    if (status === 'awaiting_confirmation') message = `Please review the details, ${visitorName}. Is this correct?`;
    if (status === 'ticket_preview') message = `📋 Ticket Summary`;  // NEW
    if (status === 'troubleshooting_view') message = `🔧 Try These First`;  // NEW
    if (status === 'error') message = errorMessage || "There was a problem.";

    const showListenButton = ['awaiting_scan', 'awaiting_name', 'awaiting_name_fallback', 'listening_for_id', 'awaiting_problem', 'awaiting_clarification'].includes(status);
    const showScannerBox = status === 'awaiting_scan';
    const showTicketDetails = status === 'awaiting_confirmation';
    const showUserConfirmationButtons = status === 'awaiting_id_confirmation' || status === 'awaiting_barcode_confirmation';
    const showRetryButtons = status === 'name_lookup_failed';

    return (
        <div className="bg-black/60 backdrop-blur-md p-4 sm:p-6 rounded-2xl max-w-xl w-full shadow-2xl border border-gray-500 flex flex-col items-center text-center">
            <h2 className="text-3xl font-semibold text-cyan-400 mb-4">{message}</h2>
            {(status === 'processing' || status === 'verifying') && <div className="my-4"><LoadingSpinner /></div>}
            
            {showScannerBox && (
                <div className="relative w-80 h-48 sm:w-96 sm:h-56 my-4">
                    <div id="scanner-container" ref={scannerContainerRef} className="w-full h-full rounded-lg overflow-hidden bg-gray-900/50"></div>
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute top-0 left-0 w-full h-1 bg-cyan-400 shadow-[0_0_15px_2px_theme(colors.cyan.400)] animate-scan"></div>
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-cyan-400 rounded-tl-lg"></div>
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-cyan-400 rounded-tr-lg"></div>
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-cyan-400 rounded-bl-lg"></div>
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-cyan-400 rounded-br-lg"></div>
                    </div>
                </div>
            )}

            {showListenButton && (
                <>
                    {(status === 'awaiting_scan' || status === 'awaiting_name') && <p className="text-lg mt-2 text-gray-300">Or, if you can't scan:</p>}
                    <HoldToSpeakButton isListening={isListening} onListenStart={onListenStart} onListenStop={onListenStop} interimTranscript={interimTranscript} />
                </>
            )}
            {errorMessage && status !== 'error' && <p className="text-yellow-300 text-center my-4">{errorMessage}</p>}
            
            {status === 'awaiting_selection' && (
                <>
                    <div className="max-h-64 overflow-y-auto grid grid-cols-2 md:grid-cols-3 gap-3 mt-4 p-2">
                        {potentialUsers.map(user => (
                            <button key={user.UserId} onClick={() => onSelectUser(user)} className="bg-cyan-600/50 hover:bg-cyan-500/80 text-white font-bold py-2 px-3 rounded-lg no-select">
                                <p className="text-base">{user.Name}</p>
                                <p className="text-xs text-cyan-200">ID: {user.SchoolIdNumber || 'N/A'}</p>
                            </button>
                        ))}
                    </div>
                    <div className="mt-4"><button onClick={onTryAgain} className="bg-red-600/80 hover:bg-red-500/80 text-white font-bold py-2 px-4 rounded-lg no-select">I'm not here</button></div>
                </>
            )}

            {status === 'awaiting_asset_selection' && (
                <>
                    <div className="max-h-64 overflow-y-auto grid grid-cols-2 md:grid-cols-3 gap-3 mt-4 p-2">
                        {userAssets.map(asset => (
                            <button key={asset.AssetId} onClick={() => onAssetSelect(asset)} className="bg-cyan-600/50 hover:bg-cyan-500/80 text-white font-bold py-3 px-4 rounded-lg text-left no-select">
                                <p className="text-base">{asset.Name}</p>
                                <p className="text-xs text-cyan-200">Tag: {asset.AssetTag || 'N/A'}</p>
                            </button>
                        ))}
                        <button onClick={() => onAssetSelect(null)} className="bg-gray-600/50 hover:bg-gray-500/80 text-white font-bold py-3 px-4 rounded-lg no-select">It's something else</button>
                    </div>
                </>
            )}

            {showUserConfirmationButtons && (
                 <div className="flex justify-center gap-4 pt-4">
                    <button onClick={() => onConfirmUser(true)} className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-lg no-select">Yes, that's me</button>
                    <button onClick={() => onConfirmUser(false)} className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-6 rounded-lg no-select">No, that's not me</button>
                </div>
            )}

            {showRetryButtons && (
                <div className="flex flex-col gap-4 pt-6 w-full">
                    <p className="text-gray-300 text-center mb-2">Would you like to try again?</p>
                    <button 
                        onClick={onRetryScanning}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-lg no-select flex items-center justify-center gap-2"
                    >
                        <span>🔲</span> Try Scanning Badge Again
                    </button>
                    <button 
                        onClick={onRetrySpeaking}
                        className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-6 rounded-lg no-select flex items-center justify-center gap-2"
                    >
                        <span>🎙️</span> Try Saying Name Again
                    </button>
                </div>
            )}

            {status === 'ticket_preview' && ticketSummary && (
                <div className="text-left space-y-3 w-full">
                    <div className="bg-gray-700 p-3 rounded mb-3">
                        <p className="text-lg font-semibold text-cyan-300">{ticketSummary.summary}</p>
                        <p className="text-gray-200 mt-2 text-sm">{ticketSummary.details}</p>
                    </div>
                    
                    {ticketSummary.relevantHistory && (
                        <div className="bg-gray-700 p-2 rounded text-sm">
                            <p className="text-gray-400 text-xs">📌 Related History:</p>
                            <p className="text-gray-300">{ticketSummary.relevantHistory}</p>
                        </div>
                    )}
                    
                    {ticketSummary.techNotes && (
                        <div className="bg-gray-700 p-2 rounded text-sm">
                            <p className="text-gray-400 text-xs">🔧 Tech Should Check:</p>
                            <p className="text-gray-300">{ticketSummary.techNotes}</p>
                        </div>
                    )}
                    
                    <div className="flex gap-3 pt-2">
                        <div className="flex-1 bg-gray-700 p-2 rounded text-center text-sm">
                            <p className="text-gray-400 text-xs">Category</p>
                            <p className="text-cyan-300 font-semibold text-xs">{ticketSummary.suggestedCategory}</p>
                        </div>
                        <div className="flex-1 bg-gray-700 p-2 rounded text-center text-sm">
                            <p className="text-gray-400 text-xs">Urgency</p>
                            <p className={`font-semibold text-xs ${
                                ticketSummary.suggestedUrgency === 'High' ? 'text-red-400' :
                                ticketSummary.suggestedUrgency === 'Medium' ? 'text-yellow-400' :
                                'text-green-400'
                            }`}>{ticketSummary.suggestedUrgency}</p>
                        </div>
                    </div>
                    
                    <div className="space-y-2 pt-3">
                        <button onClick={onCreateTicket} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-lg no-select text-sm">✅ Looks Good - Create Ticket</button>
                        
                        {showTroubleshootingOption && troubleshootingTips.length > 0 && (
                            <button onClick={onShowTroubleshooting} className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-lg no-select text-sm">🔧 Show Me Troubleshooting Tips</button>
                        )}
                        
                        <button onClick={onRedoProblem} className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-lg no-select text-sm">❌ Start Over</button>
                    </div>
                </div>
            )}

            {status === 'troubleshooting_view' && troubleshootingTips.length > 0 && (
                <div className="text-left space-y-3 w-full">
                    <p className="text-gray-300 text-sm mb-3">Here are some things you can try while you wait:</p>
                    
                    <div className="space-y-2">
                        {troubleshootingTips.map((tip, idx) => (
                            <div key={idx} className="bg-gray-700 p-3 rounded">
                                <p className="font-semibold text-yellow-300 mb-1 text-sm">Step {idx + 1}:</p>
                                <p className="text-gray-300 text-sm">{tip}</p>
                            </div>
                        ))}
                    </div>
                    
                    <div className="space-y-2 pt-3">
                        <button onClick={onCreateTicket} className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-lg no-select text-sm">✅ Back to Ticket - Create It</button>
                        <button onClick={onRedoProblem} className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-lg no-select text-sm">❌ Start Over</button>
                    </div>
                </div>
            )}

            {showTicketDetails && ticketDetails && iiqUser && (
                <div className="text-left space-y-3 text-xl mt-4">
                    <p><strong className="text-cyan-400">Name:</strong> {iiqUser.Name}</p>
                    <p><strong className="text-cyan-400">Problem:</strong> <span className="text-white">{problemDescription}</span></p>
                    {identifiedAsset && <p><strong className="text-cyan-400">Device:</strong> <span className="text-purple-300">{identifiedAsset.Name}</span></p>}
                    <div className="flex justify-center gap-4 pt-4">
                        <button onClick={onCreateTicket} className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-lg no-select">Yes, Create Ticket</button>
                        <button onClick={onRedoProblem} className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-6 rounded-lg no-select">No, Let's Try Again</button>
                    </div>
                </div>
            )}

            {status === 'error' && (
                <div className="flex flex-col gap-4 pt-6 w-full">
                    <p className="text-gray-300 text-center mb-2">Would you like to try a different method?</p>
                    <button 
                        onClick={onRetryScanning}
                        className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-6 rounded-lg no-select flex items-center justify-center gap-2"
                    >
                        <span>🔲</span> Try Scanning Badge Again
                    </button>
                    <button 
                        onClick={onRetrySpeaking}
                        className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3 px-6 rounded-lg no-select flex items-center justify-center gap-2"
                    >
                        <span>🎙️</span> Try Saying Name
                    </button>
                </div>
            )}
        </div>
    );
};

const ConfirmationDisplay = ({ ticket }) => (
    <div className="bg-teal-900/80 backdrop-blur-md p-8 rounded-2xl max-w-3xl w-full shadow-2xl border-2 border-cyan-500 text-center">
        <CheckCircleIcon className="w-20 h-20 mx-auto text-cyan-400" />
        <h2 className="text-4xl font-bold mt-4">Ticket Created!</h2>
        <p className="text-lg mt-2">A technician will be with you shortly. This screen will reset automatically.</p>
        <div className="mt-6 bg-black/40 p-4 rounded-lg text-left text-xl space-y-2">
            <p><strong>Ticket #:</strong> <span className="font-mono">{ticket.ticketNumber}</span></p>
            <p><strong>For:</strong> {ticket.visitorName}</p>
        </div>
    </div>
);


// --- KIOSK FLOW COMPONENTS ---

const UserVerification = ({ onUserVerified, onExit, cameraDeviceId }) => {
    const [status, setStatus] = useState('awaiting_init'); // <-- MODIFIED: Start in a new initial state
    const [isListening, setIsListening] = useState(false);
    const [interimTranscript, setInterimTranscript] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [potentialUser, setPotentialUser] = useState(null);
    const [potentialUsers, setPotentialUsers] = useState([]);

    const html5QrCodeRef = useRef(null);
    const scannerContainerRef = useRef(null);
    const scannerInitializingRef = useRef(false);  // Prevent concurrent scanner initialization
    const scannerActiveRef = useRef(false);  // Track if scanner is actively running
    const pendingErrorRef = useRef(null);  // Store error to be set in effect
    
    const recognitionRef = useRef(null);
    const finalTranscriptRef = useRef('');
    const silenceTimeoutRef = useRef(null);
    const statusRef = useRef(status);
    useEffect(() => { statusRef.current = status; }, [status]);

    const stopScanner = async () => {
        if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
            try {
                await html5QrCodeRef.current.stop();
                scannerActiveRef.current = false;  // Mark scanner as inactive
                html5QrCodeRef.current = null; // Clear the instance to prevent lingering callbacks
            } catch (err) {
                console.error("Error stopping scanner:", err);
                scannerActiveRef.current = false;  // Mark as inactive even on error
                html5QrCodeRef.current = null; // Clear even on error to prevent issues
            }
        }
    };

    const findUserInIncidentIQ = React.useCallback(async (searchTerm) => {
        try {
            const response = await fetch(`${FIREBASE_FUNCTIONS_URL}/api/findUser`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ searchTerm })
            });
            if (!response.ok) {
                const errorText = await response.text();
                console.error(`Direct call to /api/findUser failed:`, errorText);
                throw new Error(`API Error: ${response.status}`);
            }
            const users = await response.json();
            return users || [];
        } catch (searchError) {
            console.error("Error calling /findUser endpoint:", searchError);
            return [];
        }
    }, []);

    const verifyUserByBarcode = React.useCallback(async (searchTerm) => {
        if (html5QrCodeRef.current?.isScanning) {
             html5QrCodeRef.current.pause();
        }
        setStatus('verifying');
        const users = await findUserInIncidentIQ(searchTerm);
        if (users && users.length > 0) {
            setErrorMessage('');
            if (users.length === 1) {
                setPotentialUser(users[0]);
                setStatus('awaiting_barcode_confirmation');
            } else {
                setPotentialUsers(users);
                setStatus('awaiting_selection');
            }
        } else {
            setPotentialUser(null);
            // Enhanced error message with clear fallback instruction
            setErrorMessage("I couldn't find that ID. No worries! Please say your name instead and I'll look you up.");
            setStatus('awaiting_name_fallback');  // New state to show fallback UI
            if(html5QrCodeRef.current) html5QrCodeRef.current.resume();
        }
    }, [findUserInIncidentIQ]);

    const startScanner = React.useCallback(async (retryCount = 0) => {
        // Prevent concurrent scanner initialization
        if (scannerInitializingRef.current) {
            console.debug("Scanner initialization already in progress, skipping...");
            return;
        }
        
        scannerInitializingRef.current = true;
        console.log("startScanner called, retryCount:", retryCount);
        
        const scannerElement = document.getElementById("scanner-container");
        if (!scannerElement) {
            // Only retry up to 5 times (500ms total) to avoid console spam
            if (retryCount < 5) {
                console.debug("Scanner container not found. Retrying...", { attempt: retryCount + 1 });
                scannerInitializingRef.current = false;
                setTimeout(() => startScanner(retryCount + 1), 100);
            } else {
                console.error("Scanner container element not found after 5 attempts. Check DOM structure.");
                scannerInitializingRef.current = false;
            }
            return;
        }
        console.log("Scanner container found");
        
        try {
            await stopScanner();
            console.log("Previous scanner stopped");

            if (!html5QrCodeRef.current) {
                console.log("Creating new Html5Qrcode instance");
                html5QrCodeRef.current = new Html5Qrcode("scanner-container", { verbose: false });
            }

            const config = {
                fps: 30,
                qrbox: { width: 384, height: 224 },
                aspectRatio: 1.7777778,
                formatsToSupport: [Html5QrcodeSupportedFormats.CODE_128],
                disableFlip: false,
                rememberLastUsedCamera: true,
            };
            console.log("Scanner config:", config);

            // iPad optimization: Use front-facing camera (wall-mounted iPad scenario)
            // First, try with advanced constraints for better focus
            let cameraConstraints = {
                facingMode: "user",  // Front-facing camera (wall mount)
                advanced: [
                    { focusMode: "continuous" },
                    { focusDistance: 0.3 }  // Optimize for closer scanning
                ]
            };
            console.log("Attempting advanced camera constraints:", cameraConstraints);

            try {
                console.log("Calling html5QrCode.start() with advanced constraints");
                await html5QrCodeRef.current.start(
                    cameraConstraints,
                    config,
                    (decodedText) => { 
                        if (html5QrCodeRef.current && scannerActiveRef.current) {
                            console.log("Barcode detected:", decodedText);
                            // Defer verification to next microtask to avoid state transition errors
                            Promise.resolve().then(() => verifyUserByBarcode(decodedText));
                        }
                    },
                    (errorMessage) => { 
                        if (!html5QrCodeRef.current || !scannerActiveRef.current) return; // Prevent callbacks after scanner is stopped
                        // Suppress non-critical scanning errors to avoid spam
                        if (!errorMessage.includes("No QR code found") && !errorMessage.includes("NotFoundException") && !errorMessage.includes("No barcode or QR code detected")) {
                            console.warn("QR scanning error:", errorMessage);
                        }
                    }
                );
                console.log("Scanner started successfully with advanced constraints");
                scannerActiveRef.current = true;  // Mark scanner as active
            } catch (advancedErr) {
                console.warn("Advanced camera constraints failed, trying simpler constraints:", advancedErr?.message || advancedErr);
                
                // Create a fresh instance for fallback attempt to avoid state transition issues
                console.log("Creating fresh Html5Qrcode instance for fallback");
                html5QrCodeRef.current = new Html5Qrcode("scanner-container", { verbose: false });
                
                // Fallback: Try with simpler constraints (no advanced focus settings)
                cameraConstraints = {
                    facingMode: "user"  // Just front-facing camera, no advanced settings
                };
                console.log("Attempting fallback camera constraints:", cameraConstraints);
                
                console.log("Calling html5QrCode.start() with fallback constraints");
                await html5QrCodeRef.current.start(
                    cameraConstraints,
                    config,
                    (decodedText) => { 
                        if (html5QrCodeRef.current && scannerActiveRef.current) {
                            console.log("Barcode detected:", decodedText);
                            // Defer verification to next microtask to avoid state transition errors
                            Promise.resolve().then(() => verifyUserByBarcode(decodedText));
                        }
                    },
                    (errorMessage) => { 
                        if (!html5QrCodeRef.current || !scannerActiveRef.current) return; // Prevent callbacks after scanner is stopped
                        // Suppress non-critical scanning errors to avoid spam
                        if (!errorMessage.includes("No QR code found") && !errorMessage.includes("NotFoundException") && !errorMessage.includes("No barcode or QR code detected")) {
                            console.warn("QR scanning error:", errorMessage);
                        }
                    }
                );
                console.log("Scanner started successfully with fallback constraints");
                scannerActiveRef.current = true;  // Mark scanner as active
            }
            
            // Only reset flag if we successfully started
            scannerInitializingRef.current = false;
        } catch (err) {
            // Throw the error to be handled by the effect
            console.error("Scanner initialization failed:", err);
            scannerInitializingRef.current = false;
            throw err;
        }
    }, []);

    const verifyUserByName = React.useCallback(async (name) => {
        setStatus('verifying');
        const users = await findUserInIncidentIQ(name);
        if (users && users.length > 0) {
            setErrorMessage('');
            if (users.length > 1) {
                setPotentialUsers(users);
                setStatus('awaiting_selection');
            } else {
                setPotentialUser(users[0]);
                setStatus('awaiting_id_confirmation');
            }
        } else {
            // If name lookup fails, give user options
            setErrorMessage(`Sorry, I couldn't find anyone named "${name}". Please check the spelling or try scanning your badge again.`);
            setStatus('name_lookup_failed');  // New state for failed name lookup
        }
    }, [findUserInIncidentIQ]);

    // eslint-disable-next-line react-hooks/exhaustive-deps
    const processTranscript = React.useCallback(async (transcript) => {
        if (!transcript) return;
        const cancelWords = ['cancel', 'start over', 'never mind', 'delete'];
        if (cancelWords.some(word => transcript.toLowerCase().includes(word))) {
            return onExit();
        }
        if (statusRef.current === 'listening_for_id') {
            await verifyUserByBarcode(transcript);
        } else {
            await verifyUserByName(transcript);
        }
    }, [onExit, verifyUserByBarcode, verifyUserByName]);
    
    const handleListenStart = async (event) => {
        event.preventDefault();
        await stopScanner();
        finalTranscriptRef.current = '';
        if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Speech recognition not supported on this browser.");
            setIsListening(false);
            if (statusRef.current === 'awaiting_scan') {
                startScanner();
            }
            return;
        }
        
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            // Set listening state when recognition actually starts
            if(!isListening) setIsListening(true);
        };
        recognition.onend = () => setIsListening(false);
        recognition.onerror = (event) => {
            console.error("Speech error:", event.error);
            setIsListening(false); // Make sure to turn off listening state on error
            if (statusRef.current === 'awaiting_scan') {
                startScanner();
            }
        };
        
        recognition.onresult = (event) => {
            let final = '';
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) { final += event.results[i][0].transcript; } 
                else { interim += event.results[i][0].transcript; }
            }
            setInterimTranscript(interim);
            if (final) { finalTranscriptRef.current += final + ' '; }
        };
        
        recognition.start();
        recognitionRef.current = recognition;
    };

    const handleListenStop = React.useCallback((event) => {
        event.preventDefault();
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        // onend will fire and set isListening to false
        silenceTimeoutRef.current = setTimeout(() => {
            if (finalTranscriptRef.current) {
                processTranscript(finalTranscriptRef.current.trim());
                finalTranscriptRef.current = '';
            }
        }, 2500);
        // ONLY restart scanner if we were in scanning mode, NOT in name voice mode
        if (statusRef.current === 'awaiting_scan') {
            startScanner();
        }
    }, [processTranscript, startScanner]);
    
    const handleConfirmation = React.useCallback((isConfirmed) => {
        if (isConfirmed) {
            onUserVerified(potentialUser);
        } else {
            setPotentialUser(null);
            setErrorMessage("My mistake. Let's try again.");
            setStatus('awaiting_name');
            if(html5QrCodeRef.current) html5QrCodeRef.current.resume();
        }
    }, [onUserVerified, potentialUser]);
    
    // Comprehensive cleanup on component unmount to prevent memory leaks
    useEffect(() => {
        return () => {
            // Stop and cleanup scanner
            stopScanner();
            
            // Stop speech recognition
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.abort();
                } catch (e) {
                    console.debug("Error aborting recognition:", e);
                }
                recognitionRef.current = null;
            }
            
            // Clear all timeouts
            if (silenceTimeoutRef.current) {
                clearTimeout(silenceTimeoutRef.current);
                silenceTimeoutRef.current = null;
            }
            
            // Clear all refs to allow garbage collection
            html5QrCodeRef.current = null;
            scannerContainerRef.current = null;
            finalTranscriptRef.current = '';
            
            console.log("UserVerification component cleanup complete");
        };
    }, []);

    // Effect to handle pending errors (set in event handlers to avoid state transition issues)
    useEffect(() => {
        if (pendingErrorRef.current) {
            const { message, status } = pendingErrorRef.current;
            setErrorMessage(message);
            setStatus(status);
            pendingErrorRef.current = null;
        }
    }, []);

    // NEW: Handler to start scanner
    const handleScanID = async () => {
        console.log("handleScanID called - starting scanner initialization");
        setStatus('awaiting_scan');
        setErrorMessage('');
        setPotentialUser(null);
        
        // Start scanner on next tick to ensure DOM is ready
        setTimeout(async () => {
            console.log("handleScanID setTimeout fired - calling startScanner");
            try {
                await startScanner();
                console.log("startScanner completed successfully");
            } catch (err) {
                console.error("Scanner initialization failed:", err);
                
                let friendlyErrorMessage = "Could not access camera. Please ensure it is not in use by another application.";
                
                if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
                    friendlyErrorMessage = 
                        "Camera access denied. Please enable camera permissions in Settings > Safari > Tech Support Kiosk > Camera.";
                } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
                    friendlyErrorMessage = "No camera found on this device.";
                } else if (err.name === "NotReadableError") {
                    friendlyErrorMessage = "Camera is in use by another app. Please close other applications and try again.";
                } else if (err.message && err.message.includes("stream")) {
                    friendlyErrorMessage = "Could not access camera stream. Please check camera permissions and try again.";
                }
                
                // Defer error state setting to effect to avoid state transition issues
                console.log("Setting pending error:", friendlyErrorMessage);
                pendingErrorRef.current = { message: friendlyErrorMessage, status: 'error' };
            }
        }, 0);
    };

    // NEW: Handler to start voice input for ID number
    const handleSayIDNumber = (event) => {
        event.preventDefault();
        setStatus('listening_for_id');
        handleListenStart(event);
    };

    // NEW: Retry handlers for failed lookups
    const handleRetryScanning = async () => {
        setErrorMessage('');
        setPotentialUser(null);
        setStatus('awaiting_scan');
        
        // Start scanner on next tick to ensure DOM is ready
        setTimeout(async () => {
            try {
                await startScanner();
            } catch (err) {
                console.error("Scanner initialization failed:", err);
                
                let friendlyErrorMessage = "Could not access camera. Please ensure it is not in use by another application.";
                
                if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
                    friendlyErrorMessage = 
                        "Camera access denied. Please enable camera permissions in Settings > Safari > Tech Support Kiosk > Camera.";
                } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
                    friendlyErrorMessage = "No camera found on this device.";
                } else if (err.name === "NotReadableError") {
                    friendlyErrorMessage = "Camera is in use by another app. Please close other applications and try again.";
                } else if (err.message && err.message.includes("stream")) {
                    friendlyErrorMessage = "Could not access camera stream. Please check camera permissions and try again.";
                }
                
                // Defer error state setting to effect to avoid state transition issues
                pendingErrorRef.current = { message: friendlyErrorMessage, status: 'error' };
            }
        }, 0);
    };

    const handleRetrySpeaking = (event) => {
        setErrorMessage('');
        setPotentialUser(null);
        setStatus('awaiting_name');
        if (event) event.preventDefault();
        handleListenStart(event || { preventDefault: () => {} });
    };

    if (status === 'awaiting_init') {
        return (
            <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
                <div className="bg-black/60 backdrop-blur-md p-8 rounded-2xl max-w-2xl w-full shadow-2xl border border-gray-500 flex flex-col items-center text-center">
                    <h2 className="text-4xl font-semibold text-cyan-400 mb-6">Welcome to Tech Support</h2>
                    <p className="text-xl text-gray-300 mb-12">How would you like to identify yourself?</p>
                    
                    <div className="flex flex-col md:flex-row gap-6 w-full">
                        {/* Scan ID Button */}
                        <button 
                            onClick={handleScanID}
                            className="flex-1 flex flex-col items-center justify-center gap-4 px-8 py-8 rounded-2xl bg-blue-600/80 hover:bg-blue-500/90 text-white font-bold text-2xl transition-all duration-300 transform hover:scale-105 no-select"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span>Scan ID Badge</span>
                            <p className="text-sm text-blue-100">Hold badge up to camera</p>
                        </button>

                        {/* Say ID Number Button */}
                        <button 
                            onMouseDown={handleSayIDNumber}
                            onTouchStart={handleSayIDNumber}
                            className="flex-1 flex flex-col items-center justify-center gap-4 px-8 py-8 rounded-2xl bg-purple-600/80 hover:bg-purple-500/90 text-white font-bold text-2xl transition-all duration-300 transform hover:scale-105 no-select"
                        >
                            <MicIcon className="w-16 h-16 text-white" />
                            <span>Say ID Number</span>
                            <p className="text-sm text-purple-100">Hold to speak</p>
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
             <div className="absolute inset-0 bg-gray-800/50"></div>
             <button onClick={onExit} className="absolute top-6 right-6 z-20 text-gray-300 hover:text-white"><CloseIcon/></button>
             <LiveStatusDisplay 
                status={status}
                interimTranscript={interimTranscript}
                isListening={isListening}
                errorMessage={errorMessage}
                potentialUser={potentialUser}
                potentialUsers={potentialUsers}
                onSelectUser={onUserVerified}
                onTryAgain={() => { 
                    setPotentialUsers([]); 
                    setStatus('awaiting_name');
                    if(html5QrCodeRef.current) html5QrCodeRef.current.resume();
                }}
                onConfirmUser={handleConfirmation}
                onListenStart={handleListenStart}
                onListenStop={handleListenStop}
                onRetryScanning={handleRetryScanning}
                onRetrySpeaking={handleRetrySpeaking}
                scannerContainerRef={scannerContainerRef}
            />
        </div>
    );
};

const CheckInFlow = ({ onExit, cameraDeviceId }) => {
    const [status, setStatus] = useState('verifying_user');
    const [visitorName, setVisitorName] = useState('');
    const [problemDescription, setProblemDescription] = useState('');
    const [issuePath, setIssuePath] = useState('');
    const [iiqUser, setIiqUser] = useState(null);
    const [ticketDetails, setTicketDetails] = useState(null);
    const [finalTicket, setFinalTicket] = useState(null);
    const [userAssets, setUserAssets] = useState([]);
    const [identifiedAsset, setIdentifiedAsset] = useState(null);
    const [conversationHistory, setConversationHistory] = useState([]);
    // eslint-disable-next-line no-unused-vars
    const [clarificationCount, setClarificationCount] = useState(0);  // Kept for reference, now managed by generateTicketSummary
    const [clarificationQuestion, setClarificationQuestion] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [interimTranscript, setInterimTranscript] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    
    // NEW: Fast-path optimization states
    const [assetHistory, setAssetHistory] = useState(null);
    const [userHistory, setUserHistory] = useState(null);
    const [showTroubleshootingOption, setShowTroubleshootingOption] = useState(false);
    const [troubleshootingTips, setTroubleshootingTips] = useState([]);
    const [ticketSummary, setTicketSummary] = useState(null);
    
    const mediaRecorderRef = useRef(null);
    const recordedChunksRef = useRef([]);
    const recognitionRef = useRef(null);
    const finalTranscriptRef = useRef('');
    const silenceTimeoutRef = useRef(null);
    const resetSessionTimeoutRef = useRef(null);
    const statusRef = useRef(status);
    useEffect(() => { statusRef.current = status; }, [status]);

    const toProperCase = (str) => {
        if (!str) return '';
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    };

    const callProxy = async (url, body) => {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Proxy call to ${url} failed:`, errorText);
            throw new Error(`API Error: ${response.status}`);
        }
        const text = await response.text();
        return text ? JSON.parse(text) : {};
    };

    const blobToBase64 = (blob) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.onerror = (error) => reject(error);
        });
    };

    const uploadToGoogleDrive = async (audioBlob, ticketNumber) => {
        if (!audioBlob || audioBlob.size === 0 || !iiqUser) return null;
        const date = new Date().toISOString().split('T')[0];
        const location = iiqUser.Location?.Name.replace(/ /g, '-') || 'Unknown-Location';
        const schoolId = iiqUser.SchoolIdNumber || 'Unknown-ID';
        const fileName = `${date}_${location}_${schoolId}_AUDIO.webm`;
        const metadata = { userName: iiqUser.Name, userId: iiqUser.UserId, schoolId: iiqUser.SchoolIdNumber, userLocation: iiqUser.Location?.Name, ticketNumber };
        
        try {
            const base64Data = await blobToBase64(audioBlob);
            const response = await fetch(VIDEO_UPLOAD_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileName, fileData: base64Data, metadata }),
            });
            if (!response.ok) throw new Error(`Upload failed with status ${response.status}`);
            const result = await response.json();
            return result.link;
        } catch (error) {
            console.error("Failed to upload audio to Google Drive:", error);
            return `Upload failed: ${error.message}`;
        }
    };
    
    const resetSession = () => {
        if (resetSessionTimeoutRef.current) clearTimeout(resetSessionTimeoutRef.current);
        onExit();
    };

    // NEW: Helper function to format dates for display
    const formatDate = (dateString) => {
        if (!dateString) return 'Unknown';
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now - date;
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            
            if (diffDays === 0) return 'Today';
            if (diffDays === 1) return 'Yesterday';
            if (diffDays < 7) return `${diffDays} days ago`;
            if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
            if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
            return `${Math.floor(diffDays / 365)} years ago`;
        } catch (error) {
            return 'Unknown';
        }
    };

    // NEW: Load user and device history asynchronously (doesn't block UI)
    const getUserHistoryContext = async (userId, assetId) => {
        try {
            const db = getFirestore();
            
            // Query prior 5 user tickets
            const userTicketsSnap = await getDocs(query(
                collection(db, "tickets"),
                where("userId", "==", userId),
                orderBy("createdAt", "desc"),
                limit(5)
            ));
            
            // Query prior 10 asset tickets
            const assetTicketsSnap = await getDocs(query(
                collection(db, "tickets"),
                where("assetTag", "==", assetId),
                orderBy("createdAt", "desc"),
                limit(10)
            ));
            
            const userTickets = userTicketsSnap.docs.map(d => d.data());
            const assetTickets = assetTicketsSnap.docs.map(d => d.data());
            
            // Extract common patterns from both histories
            const allTickets = [...userTickets, ...assetTickets];
            const patterns = {};
            allTickets.forEach(ticket => {
                const problem = (ticket.problemDescription || '').toLowerCase();
                if (problem.includes('screen')) patterns.screen = (patterns.screen || 0) + 1;
                if (problem.includes('battery')) patterns.battery = (patterns.battery || 0) + 1;
                if (problem.includes('charge')) patterns.charge = (patterns.charge || 0) + 1;
                if (problem.includes('keyboard')) patterns.keyboard = (patterns.keyboard || 0) + 1;
                if (problem.includes('wifi') || problem.includes('wifi')) patterns.connectivity = (patterns.connectivity || 0) + 1;
                if (problem.includes('freeze') || problem.includes('slow')) patterns.performance = (patterns.performance || 0) + 1;
                if (problem.includes('crack') || problem.includes('damage')) patterns.physical = (patterns.physical || 0) + 1;
            });
            
            const sortedPatterns = Object.entries(patterns)
                .sort(([,a], [,b]) => b - a)
                .slice(0, 3)
                .map(([k]) => k);
            
            return {
                userTicketHistory: userTickets,
                assetTicketHistory: assetTickets,
                commonPatterns: sortedPatterns,
            };
        } catch (error) {
            console.error("History fetch failed:", error);
            return null;  // Don't block flow if history unavailable
        }
    };

    // NEW: Decide if we need to ask a clarification question
    const shouldAskClarificationQuestion = (problemText, assetHistory) => {
        // If this is a repeated pattern and history shows it, skip question
        if (assetHistory?.commonPatterns?.length > 0) {
            const patterns = assetHistory.commonPatterns.join('|');
            const patternRegex = new RegExp(patterns, 'i');
            if (patternRegex.test(problemText)) {
                // This is a known pattern - we likely have enough context
                return false;
            }
        }
        
        // If problem statement is specific and clear, skip question
        const specificKeywords = ['cracked', 'broken', 'won\'t', 'can\'t', 'not', 'won t', 'cant'];
        const hasSpecificKeyword = specificKeywords.some(kw => problemText.toLowerCase().includes(kw));
        const isLongEnough = problemText.length > 30;
        
        if (hasSpecificKeyword && isLongEnough) {
            return false;  // Specific enough, skip question
        }
        
        // Otherwise, ask ONE clarifying question
        return true;
    };

    // NEW: Get ONE smart clarification question with context
    const getSmartClarificationQuestion = async (history, asset, assetHistory, userName) => {
        // eslint-disable-next-line no-unused-vars
        const deviceType = asset?.Name?.split(' ')?.[0] || 'device';
        
        // Build brief history context string
        const historyContext = assetHistory?.assetTicketHistory?.length > 0 
            ? `
    RELEVANT DEVICE HISTORY:
    ${assetHistory.assetTicketHistory.slice(0, 2).map(t => 
        `- ${t.problemDescription || 'Issue'} (${formatDate(t.createdAt)})`
    ).join('\n')}
    
    COMMON ISSUES FOR THIS DEVICE: ${assetHistory.commonPatterns.join(', ')}
  `
            : '';
        
        const prompt = `You are an IT support technician. Ask ONE brief, smart clarification question.
    
STUDENT: ${userName}
DEVICE: ${asset?.Name} (${asset?.Model?.Name})
PROBLEM: "${history[0].parts[0].text}"
${historyContext}

TASK: Ask ONE quick question to get critical missing details. Keep it to 10-15 seconds to answer.
- Reference history if relevant: "I see you had ${assetHistory?.commonPatterns?.[0]} issues before..."
- Be device-specific (e.g., iPad: "Is the screen responding?" vs MacBook: "Can you hear the fan?")
- Do NOT ask what they already said

RESPONSE MUST BE VALID JSON:
{"status": "asking", "content": "Your ONE question here."}`;
        
        const payload = {
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
        };
        
        try {
            const result = await callProxy(GEMINI_PROXY_URL, { body: payload });
            const jsonText = result.candidates[0].content.parts[0].text;
            return JSON.parse(jsonText);
        } catch (error) {
            console.error("Clarification question generation failed:", error);
            return { status: 'asking', content: 'Can you tell me a bit more about what\'s happening?' };
        }
    };

    // NEW: Generate comprehensive ticket summary with all context
    const generateTicketSummary = async (problemText, followUpAnswer, assetHistoryData, userHistoryData) => {
        setStatus('processing');
        
        const conversationText = followUpAnswer 
            ? `Initial: ${problemText}\nFollow-up Response: ${followUpAnswer}`
            : problemText;
        
        const deviceHistory = assetHistoryData?.assetTicketHistory?.slice(0, 3).map(t => 
            `- ${t.problemDescription || 'Issue'} (${formatDate(t.createdAt)})`
        ).join('\n') || 'No prior issues';
        
        const userIssueHistory = userHistoryData?.userTicketHistory?.slice(0, 2).map(t => 
            `- ${t.problemDescription || 'Issue'} on ${t.device} (${formatDate(t.createdAt)})`
        ).join('\n') || 'First reported issue';
        
        const prompt = `You are an expert IT support technician creating a ticket summary for the tech staff.

DEVICE: ${identifiedAsset?.Name} (${identifiedAsset?.Model?.Name})
STUDENT: ${visitorName}
PROBLEM DESCRIBED: ${conversationText}

DEVICE HISTORY:
${deviceHistory}

STUDENT'S HISTORY:
${userIssueHistory}

CREATE A TICKET SUMMARY with these EXACT JSON fields:

{
  "summary": "One clear sentence describing the issue",
  "details": "2-3 sentences with specific details and any relevant context",
  "suggestedCategory": "e.g., 'Hardware > Screen', 'Software > Performance', 'Connectivity > WiFi'",
  "suggestedUrgency": "High|Medium|Low",
  "relevantHistory": "Any related prior tickets or patterns (or null)",
  "techNotes": "Specific things tech should check first",
  "troubleshootingTips": ["Tip 1", "Tip 2"] (only include if applicable, otherwise empty array)
}

RESPONSE MUST BE VALID JSON ONLY.`;
        
        const payload = {
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json" }
        };
        
        try {
            const result = await callProxy(GEMINI_PROXY_URL, { body: payload });
            const jsonText = result.candidates[0].content.parts[0].text;
            const summary = JSON.parse(jsonText);
            
            setTicketSummary(summary);
            setTroubleshootingTips(summary.troubleshootingTips || []);
            setShowTroubleshootingOption((summary.troubleshootingTips || []).length > 0);
            
            // Move to preview state (not directly to confirmation)
            setStatus('ticket_preview');
        } catch (error) {
            console.error("Summary generation failed:", error);
            setErrorMessage("Failed to generate ticket summary. Please try again.");
            setStatus('error');
            setTimeout(resetSession, 10000);
        }
    };

    const handleUserVerified = async (user) => {
        setIiqUser(user);
        const firstName = toProperCase(user.Name.split(' ')[0]);
        setVisitorName(firstName);
        
        setStatus('processing');
        const assets = await getUserAssets(user.UserId);
        if (assets && assets.length > 0) {
            setUserAssets(assets);
            setStatus('awaiting_asset_selection');
        } else {
            setStatus('awaiting_problem');
        }
    };

    const processTranscript = async (transcript) => {
        if (!transcript) return;
        const cancelWords = ['cancel', 'start over', 'never mind', 'delete'];
        if (cancelWords.some(word => transcript.toLowerCase().includes(word))) {
            return resetSession();
        }
        
        const currentStatus = statusRef.current;
        if (currentStatus === 'awaiting_problem') {
            await startClarificationProcess(transcript);
        } else if (currentStatus === 'awaiting_clarification') {
            // User answered the clarification question
            const updatedHistory = [...conversationHistory, { role: 'user', parts: [{ text: transcript }] }];
            setConversationHistory(updatedHistory);
            
            // Extract the initial problem from history
            const initialProblem = conversationHistory[0]?.parts?.[0]?.text || '';
            
            // NEW: Skip directly to summary with user's answer (don't ask more questions in fast-path)
            await generateTicketSummary(initialProblem, transcript, assetHistory, userHistory);
        }
    };
    
    const handleListenStart = (event) => {
        event.preventDefault();
        finalTranscriptRef.current = '';
        if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);

        if (mediaRecorderRef.current?.state === 'paused') {
            mediaRecorderRef.current.resume();
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Speech recognition not supported on this browser.");
            return;
        }
        
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = (event) => console.error("Speech error:", event.error);
        
        recognition.onresult = (event) => {
            let final = '';
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) { final += event.results[i][0].transcript; } 
                else { interim += event.results[i][0].transcript; }
            }
            setInterimTranscript(interim);
            if (final) { finalTranscriptRef.current += final + ' '; }
        };
        
        recognition.start();
        recognitionRef.current = recognition;
    };

    const handleListenStop = (event) => {
        event.preventDefault();
        if (mediaRecorderRef.current?.state === 'recording') {
            mediaRecorderRef.current.pause();
        }
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        silenceTimeoutRef.current = setTimeout(() => {
            if (finalTranscriptRef.current) {
                processTranscript(finalTranscriptRef.current.trim());
                finalTranscriptRef.current = '';
            }
        }, 2500);
    };
    
    const getUserAssets = async (UserId) => {
        try {
            const data = await callProxy(INCIDENTIQ_PROXY_URL, { path: '/api/v1.0/assets', method: 'POST', body: { "Filters": [{ "Facet": "User", "Id": UserId }] } });
            return data.Items || [];
        } catch (error) {
            console.error("CheckInFlow: Error fetching user assets:", error);
            return null;
        }
    };

    const handleAssetSelection = (asset) => {
        setIdentifiedAsset(asset);
        
        // NEW: Start loading history in background (doesn't block UI)
        if (iiqUser && asset?.AssetTag) {
            getUserHistoryContext(iiqUser.UserId, asset.AssetTag)
                .then(history => {
                    setAssetHistory(history);
                    setUserHistory({ userTicketHistory: [] }); // Placeholder
                })
                .catch(err => console.error("History load failed:", err));
        }
        
        setStatus('awaiting_problem');
    };
    const handleRedoProblem = () => { 
        setProblemDescription(''); 
        setTicketDetails(null); 
        setConversationHistory([]); 
        setClarificationCount(0); 
        setTicketSummary(null);  // NEW: Clear ticket summary
        setTroubleshootingTips([]);  // NEW: Clear tips
        setStatus('awaiting_problem'); 
    };

    async function createIncidentIQTicket(ticketData) {
        try {
            const responseData = await callProxy(INCIDENTIQ_PROXY_URL, {
                path: '/api/v1.0/tickets/new',
                method: 'POST',
                body: ticketData
            });
            // The ticket ID is at the top level of the response, while the details are in `Item`.
            if (responseData?.Id == null) {
                 throw new Error("Ticket creation failed to return a valid ID.");
            }
            return {
                success: true,
                ticketId: responseData.Id, // Use top-level Id
                ticketNumber: responseData.Item?.TicketNumber,
                title: responseData.Item?.Subject,
                visitorName: responseData.Item?.For?.Name,
            };
        } catch (error) {
            console.error("Error in createIncidentIQTicket:", error);
            return { success: false, errorMessage: error.message };
        }
    }

    

    async function logTicketToFirestore(ticket) {
        const db = getFirestore();
        if (!db || !iiqUser) return;
        try {
            const { Subject, IssueDescription, ForId, LocationId, TicketId, ticketNumber, videoLink } = ticket;
            await addDoc(collection(db, "tickets"), {
                createdAt: new Date().toISOString(),
                status: "Open",
                requestorName: iiqUser.Name,
                schoolId: iiqUser.SchoolIdNumber,
                userLocation: iiqUser.Location?.Name,
                userId: ForId,
                locationId: LocationId,
                device: identifiedAsset ? identifiedAsset.Name : 'N/A',
                assetTag: identifiedAsset ? identifiedAsset.AssetTag : 'N/A',
                problemDescription: IssueDescription,
                videoLink: videoLink || '#',
                incidentIqTicketId: TicketId,
                incidentIqTicketNumber: ticketNumber,
                subject: Subject,
            });
        } catch (e) { console.error("Firestore log error: ", e); }
    }

    const startClarificationProcess = async (initialProblem) => {
        setStatus('processing');
        const initialHistory = [{ role: 'user', parts: [{ text: initialProblem }] }];
        setConversationHistory(initialHistory);
        setClarificationCount(0);
        
        // NEW: Fast-path logic - check if we even need a question
        if (!shouldAskClarificationQuestion(initialProblem, assetHistory)) {
            // Problem statement is specific enough - skip question and go straight to summary
            await generateTicketSummary(initialProblem, null, assetHistory, userHistory);
            return;
        }
        
        // Otherwise, ask ONE smart contextual question
        const result = await getSmartClarificationQuestion(initialHistory, identifiedAsset, assetHistory, visitorName);
        
        if (result.status === 'asking') {
            setClarificationQuestion(result.content);
            setConversationHistory([...initialHistory, { role: 'model', parts: [{ text: result.content }] }]);
            setStatus('awaiting_clarification');
        }
    };

    // OLD: Kept for reference but no longer used in fast-path flow
    // eslint-disable-next-line no-unused-vars
    const getProblemSolvingResponse = async (history, asset, count, userName) => {
        const assetInfo = asset ? `The user is having a problem with their ${asset.Name} (Model: ${asset.Model?.Name || 'N/A'}).` : "The user has not specified a device.";
        const prompt = `You are an expert IT support technician helping a user named ${userName}. Your goal is to gather information to create a useful support ticket. **CONTEXT:** - User: ${userName} - Device: ${assetInfo} - Conversation History:   ${history.map(h => `${h.role === 'user' ? userName : 'Assistant'}: ${h.parts[0].text}`).join('\n')} - Questions Asked So Far: ${count} **YOUR TASK (Follow these steps in order):** 1.  **Analyze Completeness:** Review the entire conversation history. Do you have a specific, actionable problem description? "It's broken" is not enough. "The screen is cracked" is enough. 2.  **Decision:** - **IF** the information is complete **OR** if you have already asked 2 questions (the "Questions Asked so far" is 2), you MUST proceed to Step 4 (Summarize).     - **ELSE** (the information is vague and you have asked fewer than 2 questions), proceed to Step 3 (Ask). 3.  **Ask:** Formulate ONE clarifying question. Do not repeat previous questions. The goal is to get a more specific detail. 4.  **Summarize:** Write a concise, one-paragraph summary of the issue based on ALL information gathered. **RESPONSE FORMAT:** You MUST respond with a valid JSON object. - If you decided to ask a question in Step 3, use this format:   {"status": "needs_clarification", "content": "Your question here."}  - If you decided to summarize in Step 4, use this format:   {"status": "complete", "content": "Your summary paragraph here.", "issuePath": "[Categorized Issue Path, e.g., Hardware > Screen Damage]"}`;
        const payload = {
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
            }
        };
        try {
            const result = await callProxy(GEMINI_PROXY_URL, { body: payload });
            const jsonText = result.candidates[0].content.parts[0].text;
            return JSON.parse(jsonText);
        } catch (error) {
            console.error("Clarification/Summarization AI error:", error);
            return { status: 'needs_clarification', content: "Can you tell me more about what's happening with your device?" };
        }
    }

    // OLD: Kept for reference but no longer used in fast-path flow
    // eslint-disable-next-line no-unused-vars
    const handleClarificationResponse = (result, history) => {
        if (result.status === 'needs_clarification') {
            setClarificationQuestion(result.content);
            setConversationHistory([...history, { role: 'model', parts: [{ text: result.content }] }]);
            setStatus('awaiting_clarification');
        } else { // status is 'complete'
            setProblemDescription(result.content);
            if (result.issuePath) {
                setIssuePath(result.issuePath);
            }
        }
    };
    
    // OLD: Kept for reference but no longer used in fast-path flow
    // eslint-disable-next-line no-unused-vars
    const prepareTicket = React.useCallback(() => {
        if (!iiqUser || !problemDescription) return;
        setStatus('processing');
        
        const locationName = iiqUser.Location?.Name || 'Unknown Location';
        let subject = '';
        if (identifiedAsset && issuePath) {
            subject = `${identifiedAsset.Name} > ${issuePath}`;
        } else if (issuePath) {
            subject = issuePath;
        } else {
            subject = identifiedAsset 
                ? `${identifiedAsset.Name} - ${locationName}`
                : `Walk Up Support - ${locationName}`;
        }

        const details = {
            Subject: subject,
            IssueDescription: problemDescription,
            ForId: iiqUser.UserId,
            LocationId: iiqUser.LocationId,
            Assets: identifiedAsset ? [{ AssetId: identifiedAsset.AssetId }] : [],
            Tags: [{ Name: "Walk Up" }],
        };
        setTicketDetails(details);
        setStatus('awaiting_confirmation');
    }, [iiqUser, problemDescription, identifiedAsset, issuePath]);

    // OLD: useEffect - no longer used in fast-path flow
    // useEffect(() => {
    //     if (problemDescription && iiqUser && !ticketDetails) {
    //         prepareTicket();
    //     }
    // }, [problemDescription, iiqUser, ticketDetails, prepareTicket]);

    const createTicket = async () => {
        if (!ticketSummary || !iiqUser) return;
        setStatus('processing');
        try {
            const videoLink = await stopRecording();

            const locationName = iiqUser.Location?.Name || 'Unknown Location';
            
            // Use summary data to create ticket
            let subject = '';
            if (identifiedAsset) {
                subject = `${identifiedAsset.Name} > ${ticketSummary.suggestedCategory || 'General'}`;
            } else {
                subject = `${ticketSummary.suggestedCategory || 'Support'} - ${locationName}`;
            }

            const ticketDetailsWithVideo = {
                Subject: subject,
                IssueDescription: `${ticketSummary.summary}\n\n${ticketSummary.details}\n\n${ticketSummary.techNotes ? `Tech Notes: ${ticketSummary.techNotes}` : ''}\n\nAudio Submission: ${videoLink || 'Not available.'}`,
                ForId: iiqUser.UserId,
                LocationId: iiqUser.LocationId,
                Assets: identifiedAsset ? [{ AssetId: identifiedAsset.AssetId }] : [],
                Tags: [{ Name: "Walk Up" }],
            };

            const newTicket = await createIncidentIQTicket(ticketDetailsWithVideo);
            if (!newTicket.success) {
                setErrorMessage(newTicket.errorMessage || "Failed to create ticket in Incident IQ.");
                setStatus('error');
                setTimeout(resetSession, 10000);
                return;
            }

            await logTicketToFirestore({ ...ticketDetailsWithVideo, TicketId: newTicket.ticketId, ticketNumber: newTicket.ticketNumber, videoLink: videoLink || '#' });
            setFinalTicket(newTicket);
            setStatus('confirming');
            if (resetSessionTimeoutRef.current) clearTimeout(resetSessionTimeoutRef.current);
            resetSessionTimeoutRef.current = setTimeout(resetSession, 10000);

        } catch (error) {
            console.error("A critical error occurred during the ticket process.", error)
            setErrorMessage("A critical error occurred. Please try again.");
            setStatus('error');
            setTimeout(resetSession, 10000);
        }
    };

    const startRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'inactive') {
            recordedChunksRef.current = [];
            mediaRecorderRef.current.start();
            mediaRecorderRef.current.pause();
        }
    };

    const stopRecording = (ticketNumber) => {
        return new Promise((resolve) => {
            if (mediaRecorderRef.current && (mediaRecorderRef.current.state === 'recording' || mediaRecorderRef.current.state === 'paused')) {
                mediaRecorderRef.current.onstop = async () => {
                    const audioBlob = new Blob(recordedChunksRef.current, { type: 'audio/mp4' });
                    const audioLink = await uploadToGoogleDrive(audioBlob, ticketNumber);
                    recordedChunksRef.current = [];
                    resolve(audioLink);
                };
                mediaRecorderRef.current.stop();
            } else {
                resolve(null);
            }
        });
    };
    
    useEffect(() => {
        const initializeMedia = async () => {
            try {
                const constraints = { 
                    video: false, 
                    audio: { 
                        noiseSuppression: true, 
                        echoCancellation: true,
                        autoGainControl: true  // iPad benefit: automatic gain control
                    } 
                };
                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                
                mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
                mediaRecorderRef.current.ondataavailable = (event) => {
                    if (event.data.size > 0) recordedChunksRef.current.push(event.data);
                };
                startRecording();
            } catch (err) {
                console.error("Media initialization failed in CheckInFlow:", err);
                
                let friendlyError = "Microphone initialization failed.";
                if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
                    friendlyError = "Microphone access denied. Please enable microphone permissions in Settings > Safari > Tech Support Kiosk > Microphone.";
                } else if (err.name === "NotFoundError") {
                    friendlyError = "No microphone found on this device.";
                } else if (err.name === "NotReadableError") {
                    friendlyError = "Microphone is in use by another application.";
                }
                
                setErrorMessage(friendlyError);
                setStatus('error');
            }
        };
        initializeMedia();
        
        // Comprehensive cleanup for CheckInFlow to prevent memory leaks
        return () => {
            // Stop and cleanup speech recognition
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.abort();
                } catch (e) {
                    console.debug("Error aborting recognition:", e);
                }
                recognitionRef.current = null;
            }
            
            // Stop media recording and cleanup stream
            if (mediaRecorderRef.current) {
                try {
                    if (mediaRecorderRef.current.state !== 'inactive') {
                        mediaRecorderRef.current.stop();
                    }
                    // Stop all tracks in the stream
                    mediaRecorderRef.current.stream.getTracks().forEach(track => {
                        try {
                            track.stop();
                        } catch (e) {
                            console.debug("Error stopping track:", e);
                        }
                    });
                } catch (e) {
                    console.debug("Error cleaning up media recorder:", e);
                }
                mediaRecorderRef.current = null;
            }
            
            // Clear all timeouts
            if (silenceTimeoutRef.current) {
                clearTimeout(silenceTimeoutRef.current);
                silenceTimeoutRef.current = null;
            }
            if (resetSessionTimeoutRef.current) {
                clearTimeout(resetSessionTimeoutRef.current);
                resetSessionTimeoutRef.current = null;
            }
            
            // Clear all refs to allow garbage collection
            finalTranscriptRef.current = '';
            recordedChunksRef.current = [];
            
            console.log("CheckInFlow component cleanup complete");
        };
    }, []);

    if (status === 'verifying_user') {
        return <UserVerification onUserVerified={handleUserVerified} onExit={onExit} cameraDeviceId={cameraDeviceId} />;
    }

    if (status === 'confirming' && finalTicket) {
        return (
            <div className="relative w-full h-full flex items-center justify-center p-4">
                <ConfirmationDisplay ticket={finalTicket} />
            </div>
        );
    }

    return (
        <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
            <button onClick={resetSession} className="absolute top-6 right-6 z-20 text-gray-300 hover:text-white"><CloseIcon/></button>
            <LiveStatusDisplay 
                status={status}
                interimTranscript={interimTranscript}
                visitorName={visitorName}
                iiqUser={iiqUser}
                problemDescription={problemDescription}
                identifiedAsset={identifiedAsset}
                isListening={isListening}
                errorMessage={errorMessage}
                userAssets={userAssets}
                onAssetSelect={handleAssetSelection}
                onCreateTicket={createTicket}
                onRedoProblem={handleRedoProblem}
                onListenStart={handleListenStart}
                onListenStop={handleListenStop}
                ticketDetails={ticketDetails}
                clarificationQuestion={clarificationQuestion}
                ticketSummary={ticketSummary}
                troubleshootingTips={troubleshootingTips}
                showTroubleshootingOption={showTroubleshootingOption}
                onShowTroubleshooting={() => setStatus('troubleshooting_view')}
            />
        </div>
    );
};


const LeaveMessageFlow = ({ onExit, cameraDeviceId }) => {
    const [status, setStatus] = useState('verifying_user');
    const [isListening, setIsListening] = useState(false);
    const [interimTranscript, setInterimTranscript] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [iiqUser, setIiqUser] = useState(null);
    const [messageSummary, setMessageSummary] = useState('');
    
    const recognitionRef = useRef(null);
    const finalTranscriptRef = useRef('');
    const silenceTimeoutRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const recordedChunksRef = useRef([]);

    const resetSession = () => onExit();
    
    const callProxy = async (url, body) => {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        if (!response.ok) { throw new Error(`API Error: ${response.status}`); }
        const text = await response.text();
        return text ? JSON.parse(text) : {};
    };
    
    const blobToBase64 = (blob) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.onerror = (error) => reject(error);
        });
    };

    const uploadToGoogleDrive = async (audioBlob) => {
        if (!audioBlob || audioBlob.size === 0 || !iiqUser) return null;
        const date = new Date().toISOString().split('T')[0];
        const location = iiqUser.Location?.Name.replace(/ /g, '-') || 'Unknown-Location';
        const schoolId = iiqUser.SchoolIdNumber || 'Unknown-ID';
        const fileName = `${date}_Message_${location}_${schoolId}_AUDIO.webm`;
        const metadata = { userName: iiqUser.Name, userId: iiqUser.UserId, schoolId: iiqUser.SchoolIdNumber, userLocation: iiqUser.Location?.Name, type: 'message' };
        
        try {
            const base64Data = await blobToBase64(audioBlob);
            const response = await fetch(VIDEO_UPLOAD_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileName, fileData: base64Data, metadata }),
            });
            if (!response.ok) throw new Error(`Upload failed with status ${response.status}`);
            const result = await response.json();
            return result.link;
        } catch (error) {
            console.error("Failed to upload audio to Google Drive:", error);
            return `Upload failed: ${error.message}`;
        }
    };
    
    const handleListenStart = (event, processFunc) => {
        event.preventDefault();
        finalTranscriptRef.current = '';
        if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);

        // Stop any existing recognition to prevent conflicts
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            alert("Speech recognition not supported on this browser.");
            return;
        }
        
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);
        recognition.onerror = (event) => console.error("Speech error:", event.error);
        
        recognition.onresult = (event) => {
            let final = '';
            let interim = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) { final += event.results[i][0].transcript; } 
                else { interim += event.results[i][0].transcript; }
            }
            setInterimTranscript(interim);
            if (final) { finalTranscriptRef.current += final + ' '; }
        };
        
        recognition.start();
        recognitionRef.current = recognition;
    };

    const handleListenStop = (event, processFunc) => {
        event.preventDefault();
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        silenceTimeoutRef.current = setTimeout(() => {
            if (finalTranscriptRef.current) {
                processFunc(finalTranscriptRef.current.trim());
                finalTranscriptRef.current = '';
            }
        }, 2500);
    };

    useEffect(() => {
        const initialize = async () => {
             try {
                const constraints = { 
                    video: false, 
                    audio: {
                        noiseSuppression: true,
                        echoCancellation: true,
                        autoGainControl: true  // iPad benefit: automatic gain control
                    }
                };
                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
                mediaRecorderRef.current.ondataavailable = (event) => {
                    if (event.data.size > 0) recordedChunksRef.current.push(event.data);
                };
            } catch (err) {
                console.error("Media initialization failed in LeaveMessageFlow:", err);
                
                let friendlyError = "Microphone initialization failed.";
                if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
                    friendlyError = "Microphone access denied. Please enable microphone permissions in Settings > Safari > Tech Support Kiosk > Microphone.";
                } else if (err.name === "NotFoundError") {
                    friendlyError = "No microphone found on this device.";
                } else if (err.name === "NotReadableError") {
                    friendlyError = "Microphone is in use by another application.";
                }
                
                setErrorMessage(friendlyError);
                setStatus('error');
            }
        };
        initialize();
        
        // Comprehensive cleanup for LeaveMessageFlow to prevent memory leaks
        return () => {
            // Stop and cleanup speech recognition
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.abort();
                } catch (e) {
                    console.debug("Error aborting recognition:", e);
                }
                recognitionRef.current = null;
            }
            
            // Stop media recording and cleanup stream
            if (mediaRecorderRef.current) {
                try {
                    if (mediaRecorderRef.current.state !== 'inactive') {
                        mediaRecorderRef.current.stop();
                    }
                    // Stop all tracks in the stream
                    mediaRecorderRef.current.stream.getTracks().forEach(track => {
                        try {
                            track.stop();
                        } catch (e) {
                            console.debug("Error stopping track:", e);
                        }
                    });
                } catch (e) {
                    console.debug("Error cleaning up media recorder:", e);
                }
                mediaRecorderRef.current = null;
            }
            
            // Clear all timeouts
            if (silenceTimeoutRef.current) {
                clearTimeout(silenceTimeoutRef.current);
                silenceTimeoutRef.current = null;
            }
            
            // Clear all refs to allow garbage collection
            finalTranscriptRef.current = '';
            recordedChunksRef.current = [];
            
            console.log("LeaveMessageFlow component cleanup complete");
        };
    }, []);
    
    const handleSaveMessage = async () => {
        setStatus('saving');
        const audioBlob = new Blob(recordedChunksRef.current, { type: 'audio/mp4' });
        const audioLink = await uploadToGoogleDrive(audioBlob);
        
        const db = getFirestore();
        await addDoc(collection(db, "messages"), {
            createdAt: new Date().toISOString(),
            userName: iiqUser.Name,
            userLocation: iiqUser.Location?.Name,
            schoolId: iiqUser.SchoolIdNumber,
            summary: messageSummary,
            videoLink: audioLink || "#"
        });
        setStatus('done');
        setTimeout(resetSession, 8000);
    };

    const generateSummary = async (transcript) => {
        setStatus('processing_summary');
        const prompt = `Summarize this user's message into one paragraph: "${transcript}"`;
        const payload = { contents: [{ role: "user", parts: [{ text: prompt }] }]};
        try {
            const result = await callProxy(GEMINI_PROXY_URL, { body: payload });
            const summary = result.candidates[0].content.parts[0].text;
            setMessageSummary(summary);
            setStatus('awaiting_summary_confirmation');
        } catch (e) {
            setMessageSummary(transcript); // Fallback to raw transcript
            setStatus('awaiting_summary_confirmation');
        }
    };

    if (status === 'verifying_user') {
        return <UserVerification onUserVerified={(user) => { setIiqUser(user); setStatus('awaiting_message'); }} onExit={onExit} cameraDeviceId={cameraDeviceId} />;
    }

    return (
         <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent"></div>
            <button onClick={resetSession} className="absolute top-6 right-6 z-20 text-gray-300 hover:text-white"><CloseIcon/></button>
            <div className="relative z-10 bg-black/60 backdrop-blur-md p-6 rounded-2xl max-w-3xl w-full shadow-2xl border border-gray-500 flex flex-col items-center text-center">
                 {status === 'awaiting_message' && (
                    <>
                        <h2 className="text-3xl font-semibold text-cyan-400 mb-4">Ready to record, {iiqUser?.Name.split(' ')[0]}.</h2>
                        <HoldToSpeakButton 
                            isListening={isListening} 
                            onListenStart={(e) => {
                                recordedChunksRef.current = [];
                                mediaRecorderRef.current.start();
                                handleListenStart(e);
                            }} 
                            onListenStop={(e) => {
                                if(mediaRecorderRef.current.state === 'recording') {
                                    mediaRecorderRef.current.stop();
                                }
                                handleListenStop(e, generateSummary);
                            }} 
                            interimTranscript={interimTranscript} 
                        />
                    </>
                 )}
                {status === 'processing_summary' && <> <h2 className="text-3xl font-semibold text-cyan-400 mb-4">Generating summary...</h2> <LoadingSpinner/> </>
                }
                {status === 'awaiting_summary_confirmation' && (
                    <>
                        <h2 className="text-3xl font-semibold text-cyan-400 mb-4">Is this summary correct?</h2>
                        <p className="text-xl bg-gray-900/50 p-4 rounded-lg my-4">{messageSummary}</p>
                        <div className="flex justify-center gap-4 pt-4">
                            <button onClick={handleSaveMessage} className="bg-green-600 hover:bg-green-500 text-white font-bold py-3 px-6 rounded-lg no-select">Yes, Send</button>
                            <button onClick={() => setStatus('awaiting_message')} className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 px-6 rounded-lg no-select">No, Record Again</button>
                        </div>
                    </>
                )}
                {status === 'saving' && <> <h2 className="text-3xl font-semibold text-cyan-400 mb-4">Sending your message...</h2> <LoadingSpinner/> </>
                }
                {status === 'done' && (
                     <div className="w-full">
                        <CheckCircleIcon className="w-20 h-20 mx-auto text-cyan-400" />
                        <h2 className="text-4xl font-bold mt-4">Message Sent!</h2>
                        <p className="text-lg mt-2">Your site tech has been notified. This screen will reset.</p>
                    </div>
                )}
                {status === 'error' && <p className="text-2xl text-yellow-300">{errorMessage || "Could not access camera/microphone."}</p>}
            </div>
        </div>
    );
};

// --- ADMIN & LEADERSHIP DASHBOARD COMPONENTS ---

const AdminDashboard = ({ db, setView, userInfo }) => {
    const [tickets, setTickets] = useState([]);
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTickets, setSelectedTickets] = useState(new Set());
    const [filter, setFilter] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'descending' });
    const [isCloseModalOpen, setCloseModalOpen] = useState(false);
    const [isHistoryModalOpen, setHistoryModalOpen] = useState(false);
    const [currentUserForHistory, setCurrentUserForHistory] = useState(null);
    const [ticketToClose, setTicketToClose] = useState(null);
    const [resolutionNotes, setResolutionNotes] = useState('');
    const [adminView, setAdminView] = useState('tickets');

    useEffect(() => {
        if (!db) return;
        const ticketsQuery = query(collection(db, "tickets"), where("status", "==", "Open"));
        const unsubTickets = onSnapshot(ticketsQuery, (querySnapshot) => {
            const ticketsData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTickets(ticketsData);
            setLoading(false);
        });

        const messagesQuery = query(collection(db, "messages"));
        const unsubMessages = onSnapshot(messagesQuery, (querySnapshot) => {
            const messagesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMessages(messagesData);
        });

        return () => {
            unsubTickets();
            unsubMessages();
        };
    }, [db]);

    const filteredAndSortedData = useMemo(() => {
        const data = adminView === 'tickets' ? tickets : messages;
        return data.filter(item =>
            Object.values(item).some(val => String(val).toLowerCase().includes(filter.toLowerCase()))
        ).sort((a, b) => {
            if (!sortConfig.key) return 0;
            const valA = a[sortConfig.key] || '';
            const valB = b[sortConfig.key] || '';
            if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });
    }, [adminView, tickets, messages, filter, sortConfig]);


    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedTickets(new Set(filteredAndSortedData.map(t => t.id)));
        } else {
            setSelectedTickets(new Set());
        }
    };
    const handleSelectTicket = (id) => {
        const newSelection = new Set(selectedTickets);
        newSelection.has(id) ? newSelection.delete(id) : newSelection.add(id);
        setSelectedTickets(newSelection);
    };
    const handleSort = (key) => {
        const direction = (sortConfig.key === key && sortConfig.direction === 'ascending') ? 'descending' : 'ascending';
        setSortConfig({ key, direction });
    };
    const openCloseModal = (ticket) => {
        setTicketToClose(ticket);
        setCloseModalOpen(true);
    };
    const openHistoryModal = (schoolId) => {
        setCurrentUserForHistory(schoolId);
        setHistoryModalOpen(true);
    };
    const handleSingleClose = async () => {
        if (!ticketToClose) return;
        const ticketRef = doc(db, "tickets", ticketToClose.id);
        await updateDoc(ticketRef, {
            status: "Closed",
            closedAt: new Date().toISOString(),
            resolutionNotes: resolutionNotes
        });
        setCloseModalOpen(false);
        setResolutionNotes('');
        setTicketToClose(null);
    };
    const handleBulkClose = async () => {
        if (selectedTickets.size === 0 || !window.confirm(`Are you sure you want to close ${selectedTickets.size} tickets?`)) return;
        const batch = writeBatch(db);
        selectedTickets.forEach(ticketId => {
            const ticketRef = doc(db, "tickets", ticketId);
            batch.update(ticketRef, { status: "Closed", closedAt: new Date().toISOString(), resolutionNotes: "Bulk Closed." });
        });
        await batch.commit();
        setSelectedTickets(new Set());
    };
    const SortableHeader = ({ field, label }) => (
        <th className="p-3 cursor-pointer" onClick={() => handleSort(field)}>
            <div className="flex items-center gap-1">
                {label}
                {sortConfig.key === field && (sortConfig.direction === 'ascending' ? <ChevronUpIcon /> : <ChevronDownIcon />)}
            </div>
        </th>
    );
    return (
        <div className="p-8">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-3xl font-bold">Technician Dashboard</h2>
                {userInfo?.role === 'leadership' && (
                    <button onClick={() => setView('leadership')} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-md font-semibold">
                        Back to Leadership View
                    </button>
                )}
            </div>
            <div className="flex gap-2 mb-4">
                <button onClick={() => setAdminView('tickets')} className={`px-4 py-2 rounded-md font-semibold ${adminView === 'tickets' ? 'bg-cyan-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
                    Open Tickets ({tickets.length})
                </button>
                <button onClick={() => setAdminView('messages')} className={`px-4 py-2 rounded-md font-semibold ${adminView === 'messages' ? 'bg-cyan-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
                    Messages ({messages.length})
                </button>
            </div>
            <div className="flex justify-between items-center mb-4">
                <input type="text" placeholder={`Filter ${adminView}...`} className="bg-gray-700 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-400" value={filter} onChange={(e) => setFilter(e.target.value)} />
                {selectedTickets.size > 0 && adminView === 'tickets' && (
                    <button onClick={handleBulkClose} className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-md font-semibold">
                        Close {selectedTickets.size} Selected Tickets
                    </button>
                )}
            </div>
            <div className="bg-gray-900/50 rounded-lg overflow-x-auto">
                {adminView === 'tickets' ? (
                    <table className="w-full text-left">
                        <thead className="bg-gray-700/50">
                            <tr>
                                <th className="p-3"><input type="checkbox" onChange={handleSelectAll} checked={selectedTickets.size > 0 && selectedTickets.size === filteredAndSortedData.length} /></th>
                                <SortableHeader field="createdAt" label="Time" />
                                <SortableHeader field="requestorName" label="Requestor" />
                                <SortableHeader field="schoolId" label="School ID" />
                                <th className="p-3">Device</th>
                                <th className="p-3">Problem</th>
                                <th className="p-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="7" className="text-center p-4">Loading tickets...</td></tr>
                            ) : filteredAndSortedData.map(ticket => (
                                <tr key={ticket.id} className="border-b border-gray-700 hover:bg-gray-800/50">
                                    <td className="p-3"><input type="checkbox" checked={selectedTickets.has(ticket.id)} onChange={() => handleSelectTicket(ticket.id)} /></td>
                                    <td className="p-3">{new Date(ticket.createdAt).toLocaleTimeString()}</td>
                                    <td className="p-3">{ticket.requestorName || 'N/A'}</td>
                                    <td className="p-3">
                                        <div className="flex items-center gap-2">
                                            {ticket.schoolId || 'N/A'}
                                            <button onClick={() => openHistoryModal(ticket.schoolId)} title="View User History"><UserHistoryIcon /></button>
                                        </div>
                                    </td>
                                    <td className="p-3">{ticket.device || 'N/A'}</td>
                                    <td className="p-3 truncate max-w-xs">{ticket.problemDescription || 'N/A'}</td>
                                    <td className="p-3">
                                        <div className="flex gap-4">
                                            <a href={ticket.videoLink || '#'} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">Recording</a>
                                            <button onClick={() => openCloseModal(ticket)} className="text-green-400 hover:underline">Close</button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {filteredAndSortedData.length === 0 && !loading && (
                                <tr><td colSpan="7" className="text-center p-4">No open tickets found.</td></tr>
                            )}
                        </tbody>
                    </table>
                 ) : (
                    <table className="w-full text-left">
                        <thead className="bg-gray-700/50">
                            <tr>
                                <SortableHeader field="createdAt" label="Time" />
                                <SortableHeader field="userName" label="From" />
                                <SortableHeader field="userLocation" label="Location" />
                                <th className="p-3">Summary</th>
                                <th className="p-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                             {loading ? (
                                <tr><td colSpan="5" className="text-center p-4"><LoadingSpinner /></td></tr>
                            ) : filteredAndSortedData.map(msg => (
                                <tr key={msg.id} className="border-b border-gray-700 hover:bg-gray-800/50">
                                    <td className="p-3">{new Date(msg.createdAt).toLocaleString()}</td>
                                    <td className="p-3">{msg.userName}</td>
                                    <td className="p-3">{msg.userLocation}</td>
                                    <td className="p-3 truncate max-w-md">{msg.summary}</td>
                                    <td className="p-3">
                                        <a href={msg.videoLink || '#'} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">Watch Recording</a>
                                    </td>
                                </tr>
                            ))}
                            {filteredAndSortedData.length === 0 && !loading && (
                                <tr><td colSpan="5" className="text-center p-4">No messages found.</td></tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
            {isCloseModalOpen && <CloseTicketModal ticket={ticketToClose} notes={resolutionNotes} setNotes={setResolutionNotes} onConfirm={handleSingleClose} onCancel={() => setCloseModalOpen(false)} />}
            {isHistoryModalOpen && <UserHistoryModal db={db} schoolId={currentUserForHistory} onCancel={() => setHistoryModalOpen(false)} />}
        </div>
    );
};

const CloseTicketModal = ({ ticket, notes, setNotes, onConfirm, onCancel }) => (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50">
        <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-2xl font-bold mb-4">Close Ticket for {ticket.requestorName}</h3>
            <p className="mb-2"><strong className="text-gray-400">Problem:</strong> {ticket.problemDescription}</p>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add optional resolution notes..." className="w-full bg-gray-700 p-2 rounded-md h-32 mb-4 focus:outline-none focus:ring-2 focus:ring-cyan-400" />
            <div className="flex justify-end gap-4">
                <button onClick={onCancel} className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded-md">Cancel</button>
                <button onClick={onConfirm} className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-md font-semibold">Confirm Close</button>
            </div>
        </div>
    </div>
);

const UserHistoryModal = ({ db, schoolId, onCancel }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        if (!db || !schoolId) return;
        async function fetchHistory() {
            setLoading(true);
            const q = query(collection(db, "tickets"), where("schoolId", "==", schoolId));
            const querySnapshot = await getDocs(q);
            const tickets = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setHistory(tickets.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
            setLoading(false);
        }
        fetchHistory();
    }, [db, schoolId]);
    return (
        <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50">
            <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-bold">Ticket History for ID: {schoolId}</h3>
                    <button onClick={onCancel}><CloseIcon /></button>
                </div>
                <div className="overflow-y-auto">
                    {loading ? <LoadingSpinner /> : (
                        <div className="space-y-4">
                            {history.length > 0 ? history.map(ticket => (
                                <div key={ticket.id} className="bg-gray-900/50 p-3 rounded-md">
                                    <p><strong>Date:</strong> {new Date(ticket.createdAt).toLocaleDateString()}</p>
                                    <p><strong>Status:</strong> <span className={ticket.status === 'Open' ? 'text-yellow-400' : 'text-green-400'}>{ticket.status}</span></p>
                                    <p><strong>Problem:</strong> {ticket.problemDescription}</p>
                                    {ticket.status === 'Closed' && <p className="text-sm text-gray-400 mt-1"><strong>Notes:</strong> {ticket.resolutionNotes || 'N/A'}</p>}
                                </div>
                            )) : <p>No ticket history found for this user.</p>}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const LeadershipDashboard = ({ db, auth, setView }) => {
    const [activeTab, setActiveTab] = useState('activity');
    return (
        <div className="p-8">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold mb-6">Leadership Dashboard</h2>
                <div className="flex gap-2">
                    <button onClick={() => setView('admin')} className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 font-semibold">
                        Switch to Technician View
                    </button>
                    <button onClick={() => setActiveTab('activity')} className={`px-4 py-2 rounded-md ${activeTab === 'activity' ? 'bg-purple-600' : 'bg-gray-700'}`}>All Activity</button>
                    <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded-md ${activeTab === 'users' ? 'bg-purple-600' : 'bg-gray-700'}`}>Manage Users</button>
                    <button onClick={() => setActiveTab('locations')} className={`px-4 py-2 rounded-md ${activeTab === 'locations' ? 'bg-purple-600' : 'bg-gray-700'}`}>Tech Assignments</button>
                </div>
            </div>
            <div className="mt-6">
                {activeTab === 'activity' && <AllActivityView db={db} />}
                {activeTab === 'users' && <UserManagementPanel db={db} auth={auth} />}
                {activeTab === 'locations' && <LocationManagementPanel db={db} />}
            </div>
        </div>
    );
};

const AllActivityView = ({ db }) => {
    const [allTickets, setAllTickets] = useState([]);
    const [allMessages, setAllMessages] = useState([]);
    const [locations, setLocations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('');
    const [locationFilter, setLocationFilter] = useState('');
    const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'descending' });

    useEffect(() => {
        if (!db) return;
        setLoading(true);
        const unsubTickets = onSnapshot(collection(db, "tickets"), (snapshot) => {
            setAllTickets(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, type: 'Ticket' })));
        });
        const unsubMessages = onSnapshot(collection(db, "messages"), (snapshot) => {
            setAllMessages(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, type: 'Message' })));
        });
        const unsubLocations = onSnapshot(collection(db, "locations"), (snapshot) => {
            setLocations(snapshot.docs.map(doc => doc.data().name).sort());
        });

        Promise.all([unsubTickets, unsubMessages, unsubLocations]).finally(() => setLoading(false));

        return () => {
            unsubTickets();
            unsubMessages();
            unsubLocations();
        };
    }, [db]);

    const combinedData = useMemo(() => {
        const data = [...allTickets, ...allMessages];
        return data.filter(item => {
            const matchesLocation = !locationFilter || (item.userLocation || item.Location?.Name) === locationFilter;
            const matchesText = !filter || Object.values(item).some(val => String(val).toLowerCase().includes(filter.toLowerCase()));
            return matchesLocation && matchesText;
        }).sort((a, b) => {
            if (!sortConfig.key) return 0;
            const valA = a[sortConfig.key] || '';
            const valB = b[sortConfig.key] || '';
            if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        });
    }, [allTickets, allMessages, filter, locationFilter, sortConfig]);

    const handleSort = (key) => {
        const direction = (sortConfig.key === key && sortConfig.direction === 'ascending') ? 'descending' : 'ascending';
        setSortConfig({ key, direction });
    };

    const SortableHeader = ({ field, label }) => (
        <th className="p-3 cursor-pointer" onClick={() => handleSort(field)}>
            <div className="flex items-center gap-1">{label} {sortConfig.key === field && (sortConfig.direction === 'ascending' ? <ChevronUpIcon /> : <ChevronDownIcon />)}</div>
        </th>
    );

    return (
        <div>
            <h3 className="text-2xl font-semibold mb-4">All District Activity</h3>
            <div className="flex gap-4 mb-4">
                <input type="text" placeholder="Filter all activity..." value={filter} onChange={e => setFilter(e.target.value)} className="w-full bg-gray-700 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-400" />
                <select value={locationFilter} onChange={e => setLocationFilter(e.target.value)} className="bg-gray-700 p-2 rounded-md">
                    <option value="">All Locations</option>
                    {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                </select>
            </div>
            <div className="bg-gray-900/50 rounded-lg overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-gray-700/50">
                        <tr>
                            <SortableHeader field="createdAt" label="Date" />
                            <SortableHeader field="type" label="Type" />
                            <SortableHeader field="userName" label="User" />
                            <SortableHeader field="userLocation" label="Location" />
                            <th className="p-3">Details</th>
                            <SortableHeader field="status" label="Status" />
                            <th className="p-3">Recording</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="7" className="text-center p-4"><LoadingSpinner /></td></tr>
                        ) : combinedData.map(item => (
                            <tr key={item.id} className="border-b border-gray-700 hover:bg-gray-800/50">
                                <td className="p-3">{new Date(item.createdAt).toLocaleString()}</td>
                                <td className="p-3">
                                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${item.type === 'Ticket' ? 'bg-blue-800 text-blue-200' : 'bg-green-800 text-green-200'}`}>
                                        {item.type}
                                    </span>
                                </td>
                                <td className="p-3">{item.userName || item.requestorName}</td>
                                <td className="p-3">{item.userLocation || item.Location?.Name}</td>
                                <td className="p-3 truncate max-w-md">{item.summary || item.problemDescription}</td>
                                <td className="p-3">
                                    {item.type === 'Ticket' && (
                                        <span className={`font-semibold ${item.status === 'Open' ? 'text-yellow-400' : 'text-green-400'}`}>
                                            {item.status}
                                        </span>
                                    )}
                                </td>
                                <td className="p-3">
                                    <a href={item.videoLink || '#'} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">Link</a>
                                </td>
                            </tr>
                        ))}
                         {combinedData.length === 0 && !loading && (
                            <tr><td colSpan="7" className="text-center p-4">No activity found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};


const UserManagementPanel = ({ db, auth }) => {
    const [users, setUsers] = useState([]);
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserName, setNewUserName] = useState('');
    const [newUserRole, setNewUserRole] = useState('technician');
    const [statusMessage, setStatusMessage] = useState('');

    useEffect(() => {
        if (!db) return;
        const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
            setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, [db]);

    const handleAddUser = async (e) => {
        e.preventDefault();
        if (!newUserEmail || !newUserName) {
            setStatusMessage("Please provide both an email and a name.");
            return;
        }
        setStatusMessage("Authorizing user...");

        try {
            const idToken = await auth.currentUser.getIdToken();
            const response = await fetch(`${FIREBASE_FUNCTIONS_URL}/api/preauthorizeUser`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({
                    email: newUserEmail,
                    name: newUserName,
                    role: newUserRole
                })
            });

            const result = await response.json();

            if (response.ok) {
                setStatusMessage(`Success! User ${newUserName} has been authorized.`);
                setNewUserEmail('');
                setNewUserName('');
            } else {
                throw new Error(result.error || "An unknown error occurred.");
            }
        } catch (error) {
            setStatusMessage(`Error: ${error.message}`);
            console.error("Error pre-authorizing user:", error);
        }
    };

    const handleDeleteUser = async (userId) => {
        if (window.confirm("Are you sure? This will remove the user's role, and they will lose access.")) {
            await updateDoc(doc(db, "users", userId), { role: 'guest' });
        }
    };
    return (
        <div className="bg-gray-900/50 p-6 rounded-lg max-w-3xl mx-auto">
            <h4 className="text-xl font-bold mb-4">Manage Users</h4>
            <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <input type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} placeholder="User's @normanps.org Email" className="bg-gray-700 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-400" />
                <input type="text" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} placeholder="User's Full Name" className="bg-gray-700 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-400" />
                <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)} className="bg-gray-700 p-2 rounded-md">
                    <option value="technician">Technician</option>
                    <option value="leadership">Leadership</option>
                </select>
                <button type="submit" className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-md font-semibold">Pre-Authorize User</button>
            </form>
            {statusMessage && <p className="text-center mb-4 text-yellow-300">{statusMessage}</p>}
            <div className="space-y-2 max-h-96 overflow-y-auto">
                {users.filter(u => u.role !== 'guest').map(user => (
                    <div key={user.id} className="flex justify-between items-center bg-gray-800/50 p-2 rounded-md">
                        <div>
                            <p className="font-semibold">{user.name || user.email}</p>
                            <p className="text-sm text-cyan-300 capitalize">{user.role}</p>
                        </div>
                        <button onClick={() => handleDeleteUser(user.id)}><TrashIcon /></button>
                    </div>
                ))}
            </div>
        </div>
    );
};

const LocationManagementPanel = ({ db }) => {
    const [locations, setLocations] = useState([]);
    const [techs, setTechs] = useState([]);
    useEffect(() => {
        if (!db) return;
        const unsubLocations = onSnapshot(collection(db, "locations"), (snapshot) => {
            const locs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            locs.sort((a, b) => a.name.localeCompare(b.name));
            setLocations(locs);
        });
        const unsubTechs = onSnapshot(query(collection(db, "users"), where("role", "==", "technician")), (snapshot) => {
            setTechs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => {
            unsubLocations();
            unsubTechs();
        };
    }, [db]);

    const handleAssignmentChange = async (locationId, techEmail, isChecked) => {
        const locationRef = doc(db, "locations", locationId);
        try {
            if (isChecked) {
                await updateDoc(locationRef, {
                    assignedTechEmails: arrayUnion(techEmail)
                });
            } else {
                await updateDoc(locationRef, {
                    assignedTechEmails: arrayRemove(techEmail)
                });
            }
        } catch (error) {
            console.error("Error updating location assignments: ", error);
        }
    };

    return (
        <div className="bg-gray-900/50 p-6 rounded-lg max-w-3xl mx-auto">
            <h4 className="text-xl font-bold mb-4">Manage Tech Assignments</h4>
            <div className="space-y-4">
                {locations.map(loc => (
                    <div key={loc.id} className="bg-gray-800/50 p-4 rounded-md">
                        <p className="font-semibold mb-3 text-lg text-cyan-300">{loc.name}</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {techs.map(tech => (
                                <label key={tech.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-700/50 transition-colors">
                                    <input
                                        type="checkbox"
                                        className="form-checkbox bg-gray-700 border-gray-600 text-cyan-500 h-5 w-5 rounded focus:ring-cyan-500 focus:ring-offset-gray-800"
                                        checked={loc.assignedTechEmails?.includes(tech.email) || false}
                                        onChange={(e) => handleAssignmentChange(loc.id, tech.email, e.target.checked)}
                                    />
                                    <span>{tech.name || tech.email}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- End of App.js Code Base --