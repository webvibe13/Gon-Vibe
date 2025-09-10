GV

// firebaseConfig.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import {
  getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import {
  getFirestore, collection, addDoc, query, where, getDocs,
  serverTimestamp, orderBy, onSnapshot, setDoc, doc, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import {
  getStorage, ref, uploadBytes, getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-storage.js";

export const firebase = {
  initialize(){
    // 🔁 REPLACE with your config
    const firebaseConfig = {
    apiKey: "AIzaSyC-01T5vAnW9BfmNVgG9zxXlawASOymUYM",
    authDomain: "gon--vibe.firebaseapp.com",
    projectId: "gon--vibe",
    storageBucket: "gon--vibe.firebasestorage.app",
    messagingSenderId: "379757077264",
    appId: "1:379757077264:web:0f47789c7561a7a2f97b95",
    };
    const app = initializeApp(firebaseConfig);
    return {
      auth: getAuth(app),
      db: getFirestore(app),
      storage: getStorage(app)
    }
  },
  libs: {
    onAuthStateChanged, signInWithEmailAndPassword, signOut,
    collection, addDoc, query, where, getDocs, serverTimestamp, orderBy, onSnapshot, setDoc, doc, getDoc,
    ref, uploadBytes, getDownloadURL
  }
};

