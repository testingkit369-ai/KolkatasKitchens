import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

async function test() {
  try {
    const snapshot = await getDocs(collection(db, 'outlets'));
    console.log('Success! Outlets count:', snapshot.size);
  } catch (e) {
    console.error('Error:', e);
  }
}

test();
