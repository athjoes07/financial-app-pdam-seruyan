import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, updateDoc, Timestamp } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC4irpOmj6Lz2FwSFDhYeg7_drVC97cLBc",
  authDomain: "financial-app-pdam-seruyan.firebaseapp.com",
  projectId: "financial-app-pdam-seruyan",
  storageBucket: "financial-app-pdam-seruyan.firebasestorage.app",
  messagingSenderId: "398576902162",
  appId: "1:398576902162:web:d3dd9d822ccfcd2d36b8cb",
  measurementId: "G-398L71P5YV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics (with browser support check)
let analytics = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

// Initialize Firestore
const db = getFirestore(app);

export {
  app,
  analytics,
  db,
  collection,
  addDoc,
  getDocs,
  query,
  orderBy,
  deleteDoc,
  doc,
  updateDoc,
  Timestamp
};
