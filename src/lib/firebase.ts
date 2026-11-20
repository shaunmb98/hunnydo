"use client";
import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Firebase web config is public by design; access is enforced by security rules.
const firebaseConfig = {
  apiKey: "AIzaSyD5s6Tuy2qi6UC25PDseIi3KAA0lrUuhDY",
  authDomain: "hunnydo-app.firebaseapp.com",
  projectId: "hunnydo-app",
  storageBucket: "hunnydo-app.firebasestorage.app",
  messagingSenderId: "336070400804",
  appId: "1:336070400804:web:2d4ddf12d3b7a2baaa71b1",
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
