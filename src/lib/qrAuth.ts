import {
  doc,
  setDoc,
  onSnapshot,
  deleteDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase";

export interface QRSession {
  status: "waiting" | "approved" | "expired";
  uid?: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
  createdAt?: any;
}

export interface QRUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  isQRLogin: true;
}

const QR_SESSION_TTL_MS = 5 * 60 * 1000;
const QR_STORAGE_KEY = "qr_user_session";

export function generateSessionId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function createQRSession(sessionId: string): Promise<void> {
  const ref = doc(db, "qrSessions", sessionId);
  await setDoc(ref, {
    status: "waiting",
    createdAt: serverTimestamp(),
  });
}

export function watchQRSession(
  sessionId: string,
  onApproved: (user: QRUser) => void,
  onExpired: () => void
): () => void {
  const ref = doc(db, "qrSessions", sessionId);
  const timer = setTimeout(onExpired, QR_SESSION_TTL_MS);

  const unsub = onSnapshot(ref, (snap) => {
    if (!snap.exists()) return;
    const data = snap.data() as QRSession;
    if (data.status === "approved" && data.uid) {
      clearTimeout(timer);
      onApproved({
        uid: data.uid,
        displayName: data.displayName || null,
        email: data.email || null,
        photoURL: data.photoURL || null,
        isQRLogin: true,
      });
    }
  });

  return () => {
    clearTimeout(timer);
    unsub();
  };
}

export async function approveQRSession(
  sessionId: string,
  user: { uid: string; displayName: string | null; email: string | null; photoURL: string | null }
): Promise<void> {
  const ref = doc(db, "qrSessions", sessionId);
  await setDoc(ref, {
    status: "approved",
    uid: user.uid,
    displayName: user.displayName || "",
    email: user.email || "",
    photoURL: user.photoURL || "",
  });
}

export async function deleteQRSession(sessionId: string): Promise<void> {
  const ref = doc(db, "qrSessions", sessionId);
  await deleteDoc(ref).catch(() => {});
}

export function saveQRUserToStorage(user: QRUser): void {
  localStorage.setItem(QR_STORAGE_KEY, JSON.stringify(user));
}

export function loadQRUserFromStorage(): QRUser | null {
  try {
    const raw = localStorage.getItem(QR_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as QRUser;
  } catch {
    return null;
  }
}

export function clearQRUserFromStorage(): void {
  localStorage.removeItem(QR_STORAGE_KEY);
}
