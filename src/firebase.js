import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Firebase config (from your HTML).
// For production, move these values to environment variables.
const firebaseConfig = {
  apiKey: 'AIzaSyBsme-wxsJWvydLkgbjL6PAds06NsoAZcY',
  authDomain: 'cashbackstore-f2aff.firebaseapp.com',
  projectId: 'cashbackstore-f2aff',
  storageBucket: 'cashbackstore-f2aff.firebasestorage.app',
  messagingSenderId: '970021459044',
  appId: '1:970021459044:web:447b74bd9a3ad4a1cefb71',
  databaseURL:
    'https://cashbackstore-f2aff-default-rtdb.asia-southeast1.firebasedatabase.app', // ✅ add this
};

const app = initializeApp(firebaseConfig);

export const rtdb = getDatabase(app);
