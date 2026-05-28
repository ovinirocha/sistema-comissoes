import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: "sistema-comissoes-provincia.firebasestorage.app",
    messagingSenderId: "24736474832",
    appId: "1:24736474832:web:c96f643733083c493ea0d5"
  };

// Inicializando o Firebase e exportando o Banco de Dados e Autenticação
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);