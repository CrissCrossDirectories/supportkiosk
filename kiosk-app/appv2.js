import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, onSnapshot, addDoc, setDoc, deleteDoc, query, where, getDocs, updateDoc, writeBatch } from 'firebase/firestore';

// --- Configuration ---
// IMPORTANT: Replace with your actual Firebase project configuration
const firebaseConfig = {
    apiKey: "AIzaSyBapH9Dg67yNbs09ZdRiQAkuH7HTu9cbok",
    authDomain: "supportkiosk-b43dd.firebaseapp.com",
    projectId: "supportkiosk-b43dd",
    storageBucket: "supportkiosk-b43dd.firebasestorage.app",
    messagingSenderId: "315490541997",
    appId: "1:315490541997:web:21c3aff2b67ea72ab94124"
};

// --- Helper Icons (as SVG/React components) ---
const NTechLogo = () => ( <img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAReSURBVHhe7ZtNaxNRGMd5s/mD2Gw1qW3TJE00qY2Nthb8A4IWKngQXHqQXAnuRbwIHgS9iODBIy8eBE9eBUEPguBZEHrxIgh6sVhbk7Zp0jZp0jZN22yWvJJMk2wy+8xmQ/flwM7Mzu/87jPzzswuY2xsbGxs/M+g0tJSdDodQohDkVIqlWJbW5sJgGEYAOD7/pBLpdg0TV97BEiSBABgWRZpmr52CRBFEQBgz/P+aQEAwzB+7fE/gGkaAOD7/qDL5fKaR4A8zwMA2LZtqKoqj8sE8DyPwzIBLMvCNE3fegRIkoQsywIAmqbpW48A8jwnnE4nAEBKuVxuEIBt25imaTzOEyBNUzhPA8iyjHEcR57n5HI5LpcLruvCNE3EcZzP+wRIf9u2+b1eD3meE8dxYFlWqVSCIAj4vq+qKvM8J5fL+b1PABAEgao/BwB4ngcAVVX5vr/f+wQIAgCAIAhIkoRpmgBAmqYsy8L3fQDg+/6gy/UuIEmSNE2D53kAwDAMBEHAcZzP+wTEcZwvFosAQJIkBEHAcZzP+wTEcZwvFosAQJIkBEHAcZzP+wTEcZwvFosAQJIkBEHAcZzP+wTEcZwvFosAQJIkBEHAcZzP+wTEcZwvFosAQJIkBEHAcZzP+wTEcZwvFosAQJIkBEHAcZzP+wTEcZwvFosAQJIkBEHAcZzP+wTEcZwvFosAQJIkBEHAcZzP+wTEcZwvFosAQJIkBEHAcZzP+wTEcZwvFosAQJIkBEHAcZzP+wTEcZwvFosAQJIkBEHAcZzP+wTEcZwvFosAQJIkBEHAcZzP+wTEcZwvFosAQJIkBEHAcZzP+wTEcZwvFosAQJIkBEHAcZzP+wTEcZwvFosAQJIkBEHAcZzP+wTEcZwvFosAQJIkBEHAcZzP+wTEcZwvFosAQJIkBEHAcZzP+wTEcZwvFosAQJIkBEHAcZzP+wTEcZwvFosAQJIkBEHAcZzP+wTEcZwvFosAQJIkBEHAcZzP+wTEcZwvFosAQJIkBEHAcZzP+wTEcZwvFosAQJIkBEHAcZzP+wTEcZwvFosAQJIkBEHAcZzP+wTEcZwvFosAQJIkBEHAcZzP+wTEcZwvFosAQJIkBEHAcZzP+wTEcZwvFosAQJIkBEHAcZzP+wTEcZwvFosAQJIkBEHAcZzP+wTEcZwvFosAQJIkBEHAcZzP+wTEcZwvFosAQJIkBEHAcZzP+wTEcZwvFosAQJIkBEHAcZzP+wTEcZwvFosAQJIkBEHAcZzP+wTEcZwvFosAQJIkBEHAcZzP+wTEcZwvFosAQJIkBEHAcZzP+wTEcZwvFosAQJIkBEHAcZzP+wTEcZwvFosAQJIkBEHAcZzP+wTEcZwvFosAQJIkBEHAcZzP+wTEcZwvFosAQJIkxRj7+w9LPCxsbGxs/L/4D19rB8M6l/iLAAAAAElFTkSuQmCC" alt="N-Tech Logo" className="h-16 w-auto" /> );
const GoogleIcon = () => (<svg className="w-6 h-6" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"></path><path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"></path><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"></path><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C44.599 36.337 48 30.836 48 24c0-1.341-.138-2.65-.389-3.917z"></path></svg>);
const LogoutIcon = () => (<svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>);
const LoadingSpinner = () => (<svg className="animate-spin h-10 w-10 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>);
const CheckCircleIcon = () => (<svg className="w-16 h-16 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>);
const TrashIcon = () => (<svg className="w-5 h-5 text-gray-400 hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>);
const EditIcon = () => (<svg className="w-5 h-5 text-gray-400 hover:text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z"></path></svg>);

// --- Main App Component ---
export default function App() {
    // --- State Management ---
    const [view, setView] = useState('kiosk'); // 'kiosk', 'admin', 'leadership'
    const [user, setUser] = useState(null); // Firebase auth user object
    const [userInfo, setUserInfo] = useState(null); // User info from our Firestore 'users' collection
    const [loading, setLoading] = useState(true);
    const [authAttempted, setAuthAttempted] = useState(false);

    // --- Firebase State ---
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);

    // --- Firebase Initialization ---
    useEffect(() => {
        try {
            const app = initializeApp(firebaseConfig);
            const firestoreDb = getFirestore(app);
            const firebaseAuth = getAuth(app);
            setDb(firestoreDb);
            setAuth(firebaseAuth);

            // Listen for authentication state changes
            onAuthStateChanged(firebaseAuth, async (authUser) => {
                if (authUser) {
                    setUser(authUser);
                    // Fetch user role from Firestore
                    const userDocRef = doc(firestoreDb, 'users', authUser.uid);
                    const unsubscribe = onSnapshot(userDocRef, (doc) => {
                        if (doc.exists()) {
                            setUserInfo({ id: doc.id, ...doc.data() });
                        } else {
                            // User is authenticated but not in our users collection
                            setUserInfo({ role: 'guest' }); 
                        }
                        setLoading(false);
                    });
                    return () => unsubscribe();
                } else {
                    setUser(null);
                    setUserInfo(null);
                    setLoading(false);
                }
                setAuthAttempted(true);
            });
        } catch (e) {
            console.error("Firebase init error:", e);
        }
    }, []);

    const handleGoogleSignIn = async () => {
        if (!auth) return;
        const provider = new GoogleAuthProvider();
        try {
            const result = await signInWithPopup(auth, provider);
            const authUser = result.user;
            // Check if user exists in Firestore, if not, create them as a guest
            const userDocRef = doc(db, 'users', authUser.uid);
            const userDocs = await getDocs(query(collection(db, 'users'), where('email', '==', authUser.email)));
            
            if (userDocs.empty) {
                // This is a new user to our system
                await setDoc(userDocRef, {
                    email: authUser.email,
                    name: authUser.displayName,
                    role: 'guest', // Default role
                    createdAt: new Date().toISOString()
                });
            }

        } catch (error) {
            console.error("Authentication error:", error);
        }
    };

    const handleSignOut = () => {
        if (auth) {
            signOut(auth);
            setView('kiosk'); // Return to kiosk view on sign out
        }
    };
    
    // --- Render Logic ---
    if (loading || !authAttempted) {
        return (
            <div className="w-screen h-screen bg-gray-900 flex justify-center items-center">
                <LoadingSpinner />
            </div>
        );
    }
    
    const renderView = () => {
        if (view === 'admin' && userInfo?.role === 'technician') {
            return <AdminDashboard db={db} user={user} userInfo={userInfo} />;
        }
        if (view === 'leadership' && userInfo?.role === 'leadership') {
            return <LeadershipDashboard db={db} user={user} userInfo={userInfo} />;
        }
        // Default to kiosk view for guests or if roles don't match
        return <KioskHome />;
    };

    return (
        <div className="w-screen h-screen bg-gray-800 text-white flex flex-col font-sans">
            <Header 
                user={user} 
                userInfo={userInfo} 
                onSignIn={handleGoogleSignIn} 
                onSignOut={handleSignOut}
                setView={setView}
            />
            <main className="flex-grow overflow-y-auto">
                {renderView()}
            </main>
        </div>
    );
}

// --- Components ---

const Header = ({ user, userInfo, onSignIn, onSignOut, setView }) => {
    return (
        <header className="bg-gray-900/80 backdrop-blur-sm shadow-lg p-4 flex justify-between items-center z-50">
            <div className="flex items-center gap-4 cursor-pointer" onClick={() => setView('kiosk')}>
                <NTechLogo />
                <div>
                    <h1 className="text-2xl font-bold text-white">Tech Support Kiosk</h1>
                    <p className="text-md text-cyan-300">Norman Public Schools</p>
                </div>
            </div>
            <div className="flex items-center gap-4">
                {user && userInfo ? (
                    <>
                        {userInfo.role === 'technician' && (
                            <button onClick={() => setView('admin')} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-md font-semibold">Tech Dashboard</button>
                        )}
                        {userInfo.role === 'leadership' && (
                            <button onClick={() => setView('leadership')} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-md font-semibold">Leadership</button>
                        )}
                        <div className="text-right">
                            <p className="font-semibold">{user.displayName}</p>
                            <p className="text-sm text-gray-400">{userInfo.role}</p>
                        </div>
                        <button onClick={onSignOut} className="flex items-center px-4 py-2 bg-red-600 hover:bg-red-500 rounded-md font-semibold">
                            <LogoutIcon />
                            Sign Out
                        </button>
                    </>
                ) : (
                    <button onClick={onSignIn} className="flex items-center gap-2 px-4 py-2 bg-white text-gray-800 rounded-md font-semibold hover:bg-gray-200 transition-colors">
                        <GoogleIcon />
                        Admin Sign In
                    </button>
                )}
            </div>
        </header>
    );
};

const KioskHome = () => {
    const handleCheckIn = () => alert("Starting the 'Check In For Tech Help' flow...");
    const handleLeaveMessage = () => alert("Starting the 'Leave a Message' flow...");
    const handleDamageWaiver = () => alert("Opening the 'Damage Waiver Form'...");

    return (
        <div className="h-full flex flex-col justify-center items-center p-8 text-center">
            <h2 className="text-5xl font-bold mb-4">How can we help you today?</h2>
            <p className="text-xl text-gray-300 mb-12 max-w-2xl">Please select an option below to get started. If you need help, a technician will be with you shortly.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-6xl">
                <KioskButton title="Check In For Tech Help" description="Report a problem with your device and get in the queue for assistance." onClick={handleCheckIn} />
                <KioskButton title="Leave a Message" description="Leave a video message for your site tech if they are unavailable." onClick={handleLeaveMessage} />
                <KioskButton title="Fill Out Damage Waiver" description="Complete the form to request a waiver for an accidental damage copay." onClick={handleDamageWaiver} />
            </div>
        </div>
    );
};

const KioskButton = ({ title, description, onClick }) => (
    <button onClick={onClick} className="bg-gray-700/50 hover:bg-cyan-600/50 border-2 border-gray-600 hover:border-cyan-400 rounded-2xl p-8 flex flex-col justify-center items-center text-center transition-all duration-300 transform hover:scale-105">
        <h3 className="text-3xl font-bold text-cyan-300 mb-3">{title}</h3>
        <p className="text-gray-300">{description}</p>
    </button>
);

const AdminDashboard = ({ db }) => {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTickets, setSelectedTickets] = useState(new Set());

    useEffect(() => {
        const q = query(collection(db, "tickets"), where("status", "==", "Open"));
        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const ticketsData = [];
            querySnapshot.forEach((doc) => {
                ticketsData.push({ id: doc.id, ...doc.data() });
            });
            setTickets(ticketsData);
            setLoading(false);
        });
        return () => unsubscribe();
    }, [db]);

    const handleSelectTicket = (id) => {
        const newSelection = new Set(selectedTickets);
        if (newSelection.has(id)) {
            newSelection.delete(id);
        } else {
            newSelection.add(id);
        }
        setSelectedTickets(newSelection);
    };

    const handleBulkClose = async () => {
        if (selectedTickets.size === 0) return;
        if (!window.confirm(`Are you sure you want to close ${selectedTickets.size} tickets?`)) return;

        const batch = writeBatch(db);
        selectedTickets.forEach(ticketId => {
            const ticketRef = doc(db, "tickets", ticketId);
            batch.update(ticketRef, { status: "Closed", closedAt: new Date().toISOString() });
        });

        await batch.commit();
        setSelectedTickets(new Set());
    };

    return (
        <div className="p-8">
            <h2 className="text-3xl font-bold mb-4">Technician Dashboard</h2>
            {selectedTickets.size > 0 && (
                <div className="mb-4">
                    <button onClick={handleBulkClose} className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-md font-semibold">
                        Close {selectedTickets.size} Selected Tickets
                    </button>
                </div>
            )}
            <div className="bg-gray-900/50 rounded-lg overflow-hidden">
                {/* A proper data grid would go here. This is a simplified table. */}
                <table className="w-full text-left">
                    <thead className="bg-gray-700/50">
                        <tr>
                            <th className="p-3"><input type="checkbox" disabled /></th>
                            <th className="p-3">Requestor</th>
                            <th className="p-3">School ID</th>
                            <th className="p-3">Device</th>
                            <th className="p-3">Problem</th>
                            <th className="p-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="6" className="text-center p-4">Loading tickets...</td></tr>
                        ) : tickets.map(ticket => (
                            <tr key={ticket.id} className="border-b border-gray-700 hover:bg-gray-800/50">
                                <td className="p-3"><input type="checkbox" checked={selectedTickets.has(ticket.id)} onChange={() => handleSelectTicket(ticket.id)} /></td>
                                <td className="p-3">{ticket.requestorName || 'N/A'}</td>
                                <td className="p-3">{ticket.schoolId || 'N/A'}</td>
                                <td className="p-3">{ticket.device || 'N/A'}</td>
                                <td className="p-3 truncate max-w-xs">{ticket.problemDescription || 'N/A'}</td>
                                <td className="p-3">
                                    <button className="text-cyan-400 hover:underline">Details</button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const LeadershipDashboard = ({ db, userInfo }) => {
    // This component will hold both analytics and user management
    return (
        <div className="p-8">
            <h2 className="text-3xl font-bold mb-6">Leadership Dashboard</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    <h3 className="text-2xl font-semibold mb-4">District Analytics</h3>
                    <div className="bg-gray-900/50 p-6 rounded-lg h-96 flex items-center justify-center">
                        <p className="text-gray-400">Charts and metrics will be displayed here.</p>
                    </div>
                </div>
                <div>
                    <h3 className="text-2xl font-semibold mb-4">System Management</h3>
                    <UserManagementPanel db={db} />
                    <LocationManagementPanel db={db} />
                </div>
            </div>
        </div>
    );
};

const UserManagementPanel = ({ db }) => {
    const [users, setUsers] = useState([]);
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserRole, setNewUserRole] = useState('technician');

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "users"), (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUsers(usersData);
        });
        return () => unsubscribe();
    }, [db]);

    const handleAddUser = async (e) => {
        e.preventDefault();
        if (!newUserEmail) return;
        // A real app would use a Cloud Function to create the user record
        // to prevent clients from creating users with elevated roles.
        // For this demo, we do it client-side.
        
        // Find user by email to get their UID
        const q = query(collection(db, 'users'), where('email', '==', newUserEmail));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            alert("Error: User must sign in to the app at least once before a role can be assigned.");
            return;
        }
        
        const userDoc = querySnapshot.docs[0];
        await updateDoc(doc(db, 'users', userDoc.id), { role: newUserRole });

        setNewUserEmail('');
        setNewUserRole('technician');
    };

    const handleDeleteUser = async (userId) => {
        if (window.confirm("Are you sure you want to remove this user's role? They will become a guest.")) {
            await updateDoc(doc(db, "users", userId), { role: 'guest' });
        }
    };

    return (
        <div className="bg-gray-900/50 p-6 rounded-lg">
            <h4 className="text-xl font-bold mb-4">Manage Users</h4>
            <form onSubmit={handleAddUser} className="flex gap-2 mb-4">
                <input 
                    type="email" 
                    value={newUserEmail} 
                    onChange={(e) => setNewUserEmail(e.target.value)} 
                    placeholder="User's Google Email" 
                    className="flex-grow bg-gray-700 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-400"
                />
                <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value)} className="bg-gray-700 p-2 rounded-md">
                    <option value="technician">Technician</option>
                    <option value="leadership">Leadership</option>
                </select>
                <button type="submit" className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-md font-semibold">Add</button>
            </form>
            <div className="space-y-2 max-h-60 overflow-y-auto">
                {users.filter(u => u.role !== 'guest').map(user => (
                    <div key={user.id} className="flex justify-between items-center bg-gray-800/50 p-2 rounded-md">
                        <div>
                            <p className="font-semibold">{user.name || user.email}</p>
                            <p className="text-sm text-cyan-300">{user.role}</p>
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
        const unsubLocations = onSnapshot(collection(db, "locations"), (snapshot) => {
            const locs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setLocations(locs);
        });
        const unsubTechs = onSnapshot(query(collection(db, "users"), where("role", "==", "technician")), (snapshot) => {
            const techData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTechs(techData);
        });
        return () => {
            unsubLocations();
            unsubTechs();
        };
    }, [db]);

    const handleAssignmentChange = async (locationId, techEmail) => {
        await updateDoc(doc(db, "locations", locationId), { assignedTechEmail: techEmail });
    };

    return (
        <div className="bg-gray-900/50 p-6 rounded-lg mt-8">
            <h4 className="text-xl font-bold mb-4">Manage Tech Assignments</h4>
            <div className="space-y-3">
                {locations.map(loc => (
                    <div key={loc.id} className="flex justify-between items-center">
                        <p className="font-semibold">{loc.name}</p>
                        <select 
                            value={loc.assignedTechEmail || ''} 
                            onChange={(e) => handleAssignmentChange(loc.id, e.target.value)}
                            className="bg-gray-700 p-2 rounded-md"
                        >
                            <option value="">Unassigned</option>
                            {techs.map(tech => (
                                <option key={tech.id} value={tech.email}>{tech.name || tech.email}</option>
                            ))}
                        </select>
                    </div>
                ))}
            </div>
        </div>
    );
};

