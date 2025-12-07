import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAQFsFnz69VfZqD3NP1umgTg45hYLRMS1w",
  authDomain: "laci-222f3.firebaseapp.com",
  projectId: "laci-222f3",
  storageBucket: "laci-222f3.firebasestorage.app",
  messagingSenderId: "827067069702",
  appId: "1:827067069702:web:373ba246bed75360af1a87",
  measurementId: "G-59WCDPCC76"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const analytics = getAnalytics(app);
