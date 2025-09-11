import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  "projectId": "studio-6501387260-9a7b5",
  "appId": "1:321988259638:web:7884e43ff5aae19c7acd97",
  "storageBucket": "studio-6501387260-9a7b5.firebasestorage.app",
  "apiKey": "AIzaSyAbuPdtHLXkDeN7nC9gg22wElvob5xJWqE",
  "authDomain": "studio-6501387260-9a7b5.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "321988259638"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
