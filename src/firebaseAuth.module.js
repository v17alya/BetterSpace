// firebase_auth_module.js
// Import the functions you need from the SDKs you need
// https://firebase.google.com/docs/web/setup#available-libraries
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  inMemoryPersistence,
  signInAnonymously,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth.js";

//  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-app.js";
//  import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-analytics.js";
//  import { getFirestore  } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore.js";
//  import { getStorage  } from "https://www.gstatic.com/firebasejs/10.14.1/firebase-storage.js";

export function firebaseInit() {
  console.log("firebaseInit");

  /* Your web app's Firebase configuration */
  /* For Firebase JS SDK v7.20.0 and later, measurementId is optional */
  const firebaseConfig = {
    apiKey: "AIzaSyDITR8RlYZrzzew78V69hTQntk9oKXT4wg",
    authDomain: "dev-blocks-ee2af.firebaseapp.com",
    databaseURL: "https://dev-blocks-ee2af-default-rtdb.firebaseio.com",
    projectId: "dev-blocks-ee2af",
    storageBucket: "dev-blocks-ee2af.appspot.com",
    messagingSenderId: "132218426245",
    appId: "1:132218426245:web:d1d9adb090e15506242aec",
  };

  /* // Initialize Firebase */
  const firebaseApp = initializeApp(firebaseConfig);
  const auth = getAuth(firebaseApp);
  const AuthAPI = {
    auth,
    signInAnonymously,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    FacebookAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    signOut,
    setPersistence,
    onAuthStateChanged,
    browserLocalPersistence,
    browserSessionPersistence,
    inMemoryPersistence,
    getPersistenceType
  };

  window.FirebaseAuthAPI = AuthAPI;
}

function getPersistenceType(persistenceType) {
  switch (persistenceType) {
    case 0:
      return window.FirebaseAuthAPI.browserLocalPersistence; // LOCAL persistence
    case 1:
      return window.FirebaseAuthAPI.browserSessionPersistence; // SESSION persistence
    case 2:
      return window.FirebaseAuthAPI.inMemoryPersistence; // NONE (in-memory) persistence
    default:
      return window.FirebaseAuthAPI.browserLocalPersistence; // Default to LOCAL persistence
  }
}
