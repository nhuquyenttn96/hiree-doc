import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDVOFcPfc4Bc4gAEdwZQ-i9VV0KIR1Sudc",
  authDomain: "web-cham-cong-2dfd8.firebaseapp.com",
  databaseURL: "https://web-cham-cong-2dfd8-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "web-cham-cong-2dfd8",
  storageBucket: "web-cham-cong-2dfd8.firebasestorage.app",
  messagingSenderId: "100405631566",
  appId: "1:100405631566:web:83d669f7c6e5729c69c11f"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
