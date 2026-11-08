import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import * as config from './firebase-applet-config.json';

const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function getSubs() {
  const snap = await getDocs(collection(db, 'subscriptions'));
  console.log("Subscriptions count:", snap.docs.length);
  for (const doc of snap.docs) {
    console.log(doc.id, doc.data());
  }
}
getSubs().then(() => process.exit(0));
