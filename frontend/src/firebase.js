import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, updateDoc, Timestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC4irpOmj6Lz2FwSFDhYeg7_drVC97cLBc",
  authDomain: "financial-app-pdam-seruyan.firebaseapp.com",
  projectId: "financial-app-pdam-seruyan",
  storageBucket: "financial-app-pdam-seruyan.firebasestorage.app",
  messagingSenderId: "398576902162",
  appId: "1:398576902162:web:d3dd9d822ccfcd2d36b8cb",
  measurementId: "G-398L71P5YV"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export {
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
