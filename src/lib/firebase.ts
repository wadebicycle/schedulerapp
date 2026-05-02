import { initializeApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  User,
} from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  deleteDoc,
  writeBatch,
} from "firebase/firestore";
import { Plan, AppSettings } from "../types";

const firebaseConfig = {
  apiKey: "AIzaSyAI2wBxUR9V5OHr1fVNHJbNv0ReUqxjOww"
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: "wadebicycle",
  storageBucket: "wadebicycle.firebasestorage.app",
  messagingSenderId: "365678601546",
  appId: "1:365678601546:web:40c042ab0961b693ec0db3",
  measurementId: "G-66ZD4J6QX3"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

const provider = new GoogleAuthProvider();
provider.addScope("profile");
provider.addScope("email");

export const signInWithGoogle = async (): Promise<void> => {
  try {
    await signInWithPopup(auth, provider);
  } catch (err: any) {
    if (
      err.code === "auth/popup-blocked" ||
      err.code === "auth/popup-cancelled-by-user" ||
      err.code === "auth/cancelled-popup-request"
    ) {
      await signInWithRedirect(auth, provider);
    } else {
      throw err;
    }
  }
};

export const checkRedirectResult = () => getRedirectResult(auth);

export const signOutUser = () => signOut(auth);
export const onAuthChanged = (callback: (user: User | null) => void) =>
  onAuthStateChanged(auth, callback);

export const cloudStorage = {
  getPlans: async (uid: string): Promise<Plan[]> => {
    try {
      const plansCol = collection(db, "users", uid, "plans");
      const snapshot = await getDocs(plansCol);
      return snapshot.docs.map((d) => d.data() as Plan);
    } catch (e) {
      console.error("Failed to load plans from cloud", e);
      return [];
    }
  },

  savePlan: async (uid: string, plan: Plan): Promise<void> => {
    const planRef = doc(db, "users", uid, "plans", plan.id);
    await setDoc(planRef, plan);
  },

  savePlans: async (uid: string, plans: Plan[]): Promise<void> => {
    const batch = writeBatch(db);
    plans.forEach((plan) => {
      const planRef = doc(db, "users", uid, "plans", plan.id);
      batch.set(planRef, plan);
    });
    await batch.commit();
  },

  deletePlan: async (uid: string, planId: string): Promise<void> => {
    const planRef = doc(db, "users", uid, "plans", planId);
    await deleteDoc(planRef);
  },

  deleteAllPlans: async (uid: string): Promise<void> => {
    const plansCol = collection(db, "users", uid, "plans");
    const snapshot = await getDocs(plansCol);
    const batch = writeBatch(db);
    snapshot.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  },

  getWeekMetas: async (uid: string): Promise<Record<string, any>> => {
    try {
      const ref = doc(db, "users", uid, "meta", "weekMetas");
      const snap = await getDoc(ref);
      return snap.exists() ? snap.data() : {};
    } catch (e) {
      return {};
    }
  },

  saveWeekMeta: async (uid: string, weekStart: string, meta: any): Promise<void> => {
    const ref = doc(db, "users", uid, "meta", "weekMetas");
    const existing = await cloudStorage.getWeekMetas(uid);
    await setDoc(ref, { ...existing, [weekStart]: { ...existing[weekStart], ...meta } });
  },

  getSettings: async (uid: string): Promise<Partial<AppSettings>> => {
    try {
      const ref = doc(db, "users", uid, "meta", "settings");
      const snap = await getDoc(ref);
      return snap.exists() ? (snap.data() as Partial<AppSettings>) : {};
    } catch (e) {
      return {};
    }
  },

  saveSettings: async (uid: string, settings: Partial<AppSettings>): Promise<void> => {
    const ref = doc(db, "users", uid, "meta", "settings");
    const existing = await cloudStorage.getSettings(uid);
    await setDoc(ref, { ...existing, ...settings });
  },
};
