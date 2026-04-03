import { initializeApp } from 'firebase/app'
import { getDatabase } from 'firebase/database'

// Firebase config (from your HTML).
// For production, move these values to environment variables.
const firebaseConfig = {
  apiKey: 'AIzaSyCqpfJDi7rLviYr4FZAno6WcMXBay_ndjc',
  authDomain: 'cashbackshop-a3732.firebaseapp.com',
  databaseURL: 'https://cashbackshop-a3732-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: 'cashbackshop-a3732',
  storageBucket: 'cashbackshop-a3732.firebasestorage.app',
  messagingSenderId: '223900685546',
  appId: '1:223900685546:web:b65440b7071d8511aff393',
}

const app = initializeApp(firebaseConfig)

export const rtdb = getDatabase(app)

