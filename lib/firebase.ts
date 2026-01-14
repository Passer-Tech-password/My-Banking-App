// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCay2Xo4Nbgg6C5QOXllncJ3go8z5KKtT4",
  authDomain: "banking-system-f235b.firebaseapp.com",
  projectId: "banking-system-f235b",
  storageBucket: "banking-system-f235b.firebasestorage.app",
  messagingSenderId: "241840323648",
  appId: "1:241840323648:web:e898d93457f13507f833a5",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
