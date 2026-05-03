import { initializeApp, getApps, getApp } from "firebase/app";
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
  getFirestore,
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
  apiKey: String(import.meta.env.VITE_FIREBASE_API_KEY || ""),
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    (typeof window !== "undefined" ? window.location.host : "5381fe69-513c-4292-8793-e5e50b6af9a5-00-u8900ybbdbnl.pike.replit.dev"),
  projectId: String(import.meta.env.VITE_FIREBASE_PROJECT_ID || ""),
  storageBucket: import.meta.env.VITE_FIREBASE_PROJECT_ID
    ? `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`
    : undefined,
  messagingSenderId: "365678601546",
  appId: String(import.meta.env.VITE_FIREBASE_APP_ID || ""),
  measurementId: "G-66ZD4J6QX3",
};

const isNewApp = getApps().length === 0;
const app = isNewApp ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);

export const db = getFirestore(app);

const provider = new GoogleAuthProvider();
provider.addScope("profile");
provider.addScope("email");
provider.setCustomParameters({ prompt: "select_account" });

export const signInWithGoogle = async (): Promise<void> => {
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    const code = (error as { code?: string })?.code;
    console.error("Popup auth failed", code, error);
    if (code === "auth/popup-blocked" || code === "auth/popup-closed-by-user") {
      await signInWithRedirect(auth, provider);
      return;
    }
    throw error;
  }
};

export const settleRedirectAuth = () => getRedirectResult(auth);

export const signOutUser = () => signOut(auth);
export const clearAuthState = async () => {
  await signOut(auth).catch(() => {});
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
