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
const QR_LOCAL_PREFIX = "qr_session_";

export function generateSessionId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function isQRSessionUrl(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).has("qrSession");
}

export async function createQRSession(sessionId: string): Promise<void> {
  const ref = doc(db, "qrSessions", sessionId);
  await setDoc(ref, {
    status: "waiting",
    createdAt: serverTimestamp(),
  });
}

export function createLocalQRSession(sessionId: string): void {
  localStorage.setItem(
    `${QR_LOCAL_PREFIX}${sessionId}`,
    JSON.stringify({
      status: "waiting",
      createdAt: Date.now(),
    })
  );
}

export function watchQRSession(
  sessionId: string,
  onApproved: (user: QRUser) => void,
  onExpired: () => void
): () => void {
  const ref = doc(db, "qrSessions", sessionId);
  let approved = false;
  const timer = setTimeout(() => {
    if (!approved) onExpired();
  }, QR_SESSION_TTL_MS);
  const localTimer = setInterval(() => {
    try {
      const raw = localStorage.getItem(`${QR_LOCAL_PREFIX}${sessionId}`);
      if (!raw) return;
      const data = JSON.parse(raw) as QRSession;
      if (data.status === "approved" && data.uid) {
        approved = true;
        clearTimeout(timer);
        clearInterval(localTimer);
        onApproved({
          uid: data.uid,
          displayName: data.displayName || null,
          email: data.email || null,
          photoURL: data.photoURL || null,
          isQRLogin: true,
        });
      }
    } catch {}
  }, 700);

  const unsub = onSnapshot(ref, (snap) => {
    if (!snap.exists()) return;
    const data = snap.data() as QRSession;
    if (data.status === "approved" && data.uid) {
      approved = true;
      clearTimeout(timer);
      clearInterval(localTimer);
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
    approved = true;
    clearTimeout(timer);
    clearInterval(localTimer);
    unsub();
  };
}

export async function approveQRSession(
  sessionId: string,
  user: { uid: string; displayName: string | null; email: string | null; photoURL: string | null }
): Promise<void> {
  const ref = doc(db, "qrSessions", sessionId);
  const payload = {
    status: "approved",
    uid: user.uid,
    displayName: user.displayName || "",
    email: user.email || "",
    photoURL: user.photoURL || "",
  };
  await setDoc(ref, payload).catch(() => {
    localStorage.setItem(`${QR_LOCAL_PREFIX}${sessionId}`, JSON.stringify(payload));
  });
}

export async function deleteQRSession(sessionId: string): Promise<void> {
  const ref = doc(db, "qrSessions", sessionId);
  await deleteDoc(ref).catch(() => {});
  localStorage.removeItem(`${QR_LOCAL_PREFIX}${sessionId}`);
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
