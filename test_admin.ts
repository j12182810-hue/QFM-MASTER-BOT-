import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as config from './firebase-applet-config.json';

const app = initializeApp({ projectId: config.projectId });
const db = getFirestore(app, config.firestoreDatabaseId);

db.collection('test').add({ test: true })
  .then(() => console.log('Success'))
  .catch(e => console.error(e));
