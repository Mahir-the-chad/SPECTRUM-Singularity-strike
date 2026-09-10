import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';
import type { Submission } from '../types';

export const firebaseConfig = {
  apiKey: "AIzaSyD4_WcMBPG6MnbwVYUiQ7kP5r69a3nUaHM",
  authDomain: "singularitystrike.firebaseapp.com",
  projectId: "singularitystrike",
  storageBucket: "singularitystrike.firebasestorage.app",
  messagingSenderId: "917307738316",
  appId: "1:917307738316:web:04c592076ab8ffb8971a69",
  measurementId: "G-K2X2KMW2EB"
};

// Initialize or reuse Firebase app
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Initialize analytics safely in browser environment
export let analytics: ReturnType<typeof getAnalytics> | null = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      try {
        analytics = getAnalytics(app);
      } catch (err) {
        console.warn('Firebase analytics initialization warning:', err);
      }
    }
  });
}

const LOCAL_STORAGE_SUBMISSIONS_KEY = 'singularity_submissions_fallback';

/**
 * Save quiz submission to Firestore 'submissions' collection
 */
export async function saveSubmission(
  submission: Omit<Submission, 'id' | 'submittedAt'>
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const submissionsRef = collection(db, 'submissions');
    const docRef = await addDoc(submissionsRef, {
      name: submission.name,
      correctAnswers: submission.correctAnswers,
      totalAttempted: submission.totalAttempted,
      timeTakenSeconds: submission.timeTakenSeconds,
      submittedAt: serverTimestamp(),
      submissionStatus: submission.submissionStatus,
    });

    // Also cache locally in case of offline/backup
    saveSubmissionToLocal({
      ...submission,
      id: docRef.id,
      submittedAt: new Date().toISOString(),
    });

    return { success: true, id: docRef.id };
  } catch (err: any) {
    console.error('Firestore addDoc error, saving to local fallback:', err);
    // Fallback save to localStorage
    const localId = 'loc_' + Date.now();
    saveSubmissionToLocal({
      ...submission,
      id: localId,
      submittedAt: new Date().toISOString(),
    });
    return { success: true, id: localId, error: err?.message };
  }
}

function saveSubmissionToLocal(sub: Submission) {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_SUBMISSIONS_KEY);
    const list: Submission[] = raw ? JSON.parse(raw) : [];
    // Avoid duplicate IDs
    const filtered = list.filter((item) => item.id !== sub.id);
    filtered.push(sub);
    localStorage.setItem(LOCAL_STORAGE_SUBMISSIONS_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('Failed to save to local backup', e);
  }
}

export function getLocalFallbackSubmissions(): Submission[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_SUBMISSIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Real-time listener for submissions with Firestore
 */
export function subscribeToSubmissions(
  callback: (submissions: Submission[], isLive: boolean, error?: string) => void
): () => void {
  try {
    const submissionsRef = collection(db, 'submissions');
    // Note: To avoid requiring compound indexes on the user's project,
    // we can order by submittedAt or fetch and sort client-side using the tie-breaking rules.
    const q = query(submissionsRef);

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const results: Submission[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          let submittedAt = data.submittedAt;
          if (submittedAt && typeof submittedAt.toDate === 'function') {
            submittedAt = submittedAt.toDate();
          } else if (submittedAt && submittedAt.seconds) {
            submittedAt = new Date(submittedAt.seconds * 1000);
          }

          results.push({
            id: doc.id,
            name: data.name || 'Anonymous Operative',
            correctAnswers: Number(data.correctAnswers || 0),
            totalAttempted: Number(data.totalAttempted || 0),
            timeTakenSeconds: Number(data.timeTakenSeconds || 0),
            submittedAt: submittedAt || new Date(),
            submissionStatus: data.submissionStatus || 'completed',
          });
        });

        // Merge with any local offline submissions not in firestore
        const localSubs = getLocalFallbackSubmissions();
        const existingIds = new Set(results.map((r) => r.id));
        for (const local of localSubs) {
          if (local.id && !existingIds.has(local.id)) {
            results.push(local);
          }
        }

        callback(results, true);
      },
      (error) => {
        console.warn('Firestore subscription permission or network notice, using local cache:', error);
        callback(getLocalFallbackSubmissions(), false, error.message);
      }
    );

    return unsubscribe;
  } catch (err: any) {
    console.error('Error establishing Firestore subscription:', err);
    callback(getLocalFallbackSubmissions(), false, err?.message);
    return () => {};
  }
}
