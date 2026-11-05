// 💡 Firebase 연결 설정 (PC ↔ 휴대폰 복권 연동용)
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { initializeFirestore, Firestore } from 'firebase/firestore';

const firebaseConfig = { 
  apiKey : "AIzaSyCgcPl2IRuoIIWAW4lOnErN6jgnzSIc4z0" , 
  authDomain : "lotto-app-9a459.firebaseapp.com" , 
  projectId : "lotto-app-9a459" , 
  storageBucket : "lotto-app-9a459.firebasestorage.app" , 
  messagingSenderId : "552816585320" , 
  appId : "1:552816585320:웹:733c58e24139d0c5f429dd" 
};

// 설정값을 넣었는지 (안 넣었으면 연동 기능을 숨김)
export const firebaseReady = !!firebaseConfig.apiKey;

let app: FirebaseApp | null = null;
let db: Firestore | null = null;
export const getFirebase = (): { auth: Auth; db: Firestore } => {
  if (!app) app = getApps()[0] ?? initializeApp(firebaseConfig);
  if (!db) db = initializeFirestore(app, { ignoreUndefinedProperties: true }); // 빈 값이 있어도 오류 없이 저장
  return { auth: getAuth(app), db };
};