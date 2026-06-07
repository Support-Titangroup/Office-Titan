import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getDatabase } from 'firebase/database'

const firebaseConfig = {
  apiKey: "AIzaSyBJz-4NRzDSb1RoZWBVRZXycQk5KgyzwK8",
  authDomain: "my-office-titan.firebaseapp.com",
  databaseURL: "https://my-office-titan-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "my-office-titan",
  storageBucket: "my-office-titan.firebasestorage.app",
  messagingSenderId: "96823932855",
  appId: "1:96823932855:web:66457278a69a98f636da32"
}

const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const provider = new GoogleAuthProvider()
export const db = getDatabase(app)