import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import * as config from './firebase-applet-config.json';
import webpush from "web-push";

const vapidKeys = {
  publicKey: "BNrw3q2Gxd1gCgywzEOpDPkMfswhJ3zN5LAH4PF5bDcCgrbbfJwb08I7JdGAprx1fTk_pdabOU5ckjUFl-zrmWM",
  privateKey: "fp813cHgeAgFpC-1-w-52gZ3DFDJwcF0DWWe5ofzsPY"
};
webpush.setVapidDetails(
  'mailto:support@qfm-bot.com',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function test() {
  const snap = await getDocs(collection(db, 'subscriptions'));
  for (const docSnap of snap.docs) {
    const sub = docSnap.data();
    try {
        await webpush.sendNotification(sub as any, JSON.stringify({title: 'test', body: 'test'}));
        console.log('Success for', docSnap.id);
    } catch(e: any) {
        console.log('Failed for', docSnap.id, e.statusCode, e.body);
    }
  }
}
test().then(() => process.exit(0));
