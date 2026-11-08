import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import * as config from './firebase-applet-config.json';

const app = initializeApp(config);
try {
  const db = getFirestore(app, config.firestoreDatabaseId);
  console.log("Success with databaseId");
} catch(e) {
  console.log(e);
}
