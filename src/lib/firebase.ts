import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Config pública do Firebase (chaves web são públicas por design,
// protegidas por Firestore Rules + domínios autorizados)
export const firebaseConfig = {
  apiKey: "AIzaSyDC6Fdxj5JGVUx4q266c65ujWPEZM2XkGI",
  authDomain: "catalogo-69b3a.firebaseapp.com",
  projectId: "catalogo-69b3a",
  storageBucket: "catalogo-69b3a.firebasestorage.app",
  messagingSenderId: "914185303194",
  appId: "1:914185303194:web:6fcc08a3e49f29ffeedb23",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
