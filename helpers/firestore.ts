import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/firestore';

export type Collection = firebase.firestore.CollectionReference<firebase.firestore.DocumentData>;
export type FireStore = firebase.firestore.Firestore;

const setup = async ():Promise<[FireStore, Collection]> => {
  const app = firebase.initializeApp({
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: 'awgit-38dbb.firebaseapp.com',
    projectId: 'awgit-38dbb',
    storageBucket: 'awgit-38dbb.appspot.com',
    messagingSenderId: '377518986163',
    appId: '1:377518986163:web:0bacd2d962b09fbab6b1c6',
    measurementId: 'G-6LVJX85VVB',
  });

  await app
    .auth()
    .signInWithEmailAndPassword(process.env.FIREBASE_EMAIL, process.env.FIREBASE_PASSWORD);
  const db = app.firestore();
  return [db, db.collection('days')];
}


export default { setup }