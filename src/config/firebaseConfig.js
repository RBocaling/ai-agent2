// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "@firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDvqKrdWM295tJ5kCh7oi7omBQkDRJlkgc",
  authDomain: "alphadeveloper-11b75.firebaseapp.com",
  projectId: "alphadeveloper-11b75",
  storageBucket: "alphadeveloper-11b75.firebasestorage.app",
  messagingSenderId: "192281185647",
  appId: "1:192281185647:web:63f213133203532eca2c9a",
  measurementId: "G-3Y49P50336",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
