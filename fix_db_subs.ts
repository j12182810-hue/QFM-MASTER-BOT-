import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import * as config from './firebase-applet-config.json';

const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function clean() {
  const snap = await getDocs(collection(db, 'subscriptions'));
  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    if (data.endpoint === 'test') {
      await deleteDoc(doc(db, 'subscriptions', docSnap.id));
      console.log('Deleted fake sub');
    }
  }
}
clean().then(() => process.exit(0));
