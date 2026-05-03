import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  browserLocalPersistence,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  onAuthStateChanged,
  setPersistence,
  User,
} from "firebase/auth";
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  deleteDoc,
  writeBatch,
  onSnapshot,
} from "firebase/firestore";
import { Plan, AppSettings } from "../types";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
  authDomain: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
  storageBucket: `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
  messagingSenderId: "365678601546",
  appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
  measurementId: "G-66ZD4J6QX3",
};

const isFirstInit = getApps().length === 0;
const app = isFirstInit ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch(() => {});

export const db = isFirstInit
  ? initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    })
  : getFirestore(app);

const provider = new GoogleAuthProvider();
provider.addScope("profile");
provider.addScope("email");
provider.setCustomParameters({
  prompt: "select_account",
});

export const signInWithGoogle = async (): Promise<void> => {
  try {
    await signInWithPopup(auth, provider);
  } catch (error: any) {
    if (error?.code === "auth/popup-blocked" || error?.code === "auth/popup-closed-by-user") {
      await signInWithRedirect(auth, provider);
      return;
    }
    throw error;
  }
};

export const signOutUser = () => signOut(auth);
export const clearAuthState = async () => {
  await signOut(auth).catch(() => {});
  await setPersistence(auth, browserLocalPersistence).catch(() => {});
};
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

export const subscribePlans = (
  uid: string,
  callback: (plans: Plan[]) => void,
  onError?: (e: Error) => void
): (() => void) => {
  const plansCol = collection(db, "users", uid, "plans");
  return onSnapshot(
    plansCol,
    (snapshot) => {
      const plans = snapshot.docs.map((d) => d.data() as Plan);
      callback(plans);
    },
    (error) => {
      console.error("Plans subscription error", error);
      onError?.(error);
    }
  );
};
