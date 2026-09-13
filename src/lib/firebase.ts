import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  serverTimestamp,
  onSnapshot,
  query,
  where,
  getDocs,
  doc,
  updateDoc,
  setDoc,
} from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';
import type { Submission, SubmissionStatus } from '../types';

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
    const isDisq =
      submission.submissionStatus === 'tab_switched' ||
      submission.submissionStatus === 'disqualified' ||
      submission.isDisqualified === true;

    const submissionsRef = collection(db, 'submissions');
    const docRef = await addDoc(submissionsRef, {
      name: submission.name,
      participantId: submission.participantId || 'N/A',
      correctAnswers: submission.correctAnswers,
      totalAttempted: submission.totalAttempted,
      timeTakenSeconds: submission.timeTakenSeconds,
      remainingSeconds: submission.remainingSeconds ?? 0,
      submittedAt: serverTimestamp(),
      submissionStatus: submission.submissionStatus,
      isDisqualified: isDisq,
    });

    // Also cache locally in case of offline/backup
    saveSubmissionToLocal({
      ...submission,
      id: docRef.id,
      isDisqualified: isDisq,
      submittedAt: new Date().toISOString(),
    });

    return { success: true, id: docRef.id };
  } catch (err: any) {
    console.error('Firestore addDoc error, saving to local fallback:', err);
    // Fallback save to localStorage
    const localId = 'loc_' + Date.now();
    const isDisq =
      submission.submissionStatus === 'tab_switched' ||
      submission.submissionStatus === 'disqualified' ||
      submission.isDisqualified === true;

    saveSubmissionToLocal({
      ...submission,
      id: localId,
      isDisqualified: isDisq,
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
            participantId: data.participantId || 'N/A',
            correctAnswers: Number(data.correctAnswers || 0),
            totalAttempted: Number(data.totalAttempted || 0),
            timeTakenSeconds: Number(data.timeTakenSeconds || 0),
            remainingSeconds: Number(data.remainingSeconds || 0),
            submittedAt: submittedAt || new Date(),
            submissionStatus: data.submissionStatus || 'completed',
            isDisqualified:
              data.isDisqualified === true ||
              data.submissionStatus === 'tab_switched' ||
              data.submissionStatus === 'disqualified',
            reinstatedAt: data.reinstatedAt,
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

/**
 * Check if a participant is disqualified in Firestore submissions collection
 * Checks for submissionStatus of "disqualified" or "tab_switched" or isDisqualified: true
 */
export async function checkParticipantDisqualification(
  participantId: string
): Promise<{ isDisqualified: boolean; reason?: string; submissionId?: string; participantName?: string }> {
  const cleanId = (participantId || '').trim();
  if (!cleanId) {
    return { isDisqualified: false };
  }

  try {
    const submissionsRef = collection(db, 'submissions');
    const q = query(submissionsRef, where('participantId', '==', cleanId));
    const snapshot = await getDocs(q);

    let isDisq = false;
    let disqReason = '';
    let foundSubId = '';
    let foundName = '';

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const status = data.submissionStatus;
      const explicitDisq = data.isDisqualified === true;

      // Disqualified if status is tab_switched/disqualified or explicit isDisqualified flag is true,
      // and has not been reinstated
      if (
        (status === 'disqualified' || status === 'tab_switched' || explicitDisq) &&
        status !== 'reinstated'
      ) {
        isDisq = true;
        disqReason = status || 'disqualified';
        foundSubId = docSnap.id;
        foundName = data.name || '';
      }
    });

    // Also check local fallback
    if (!isDisq) {
      const localSubs = getLocalFallbackSubmissions();
      const localMatch = localSubs.find(
        (s) =>
          s.participantId?.trim().toLowerCase() === cleanId.toLowerCase() &&
          (s.submissionStatus === 'disqualified' ||
            s.submissionStatus === 'tab_switched' ||
            (s as any).isDisqualified === true) &&
          s.submissionStatus !== 'reinstated'
      );
      if (localMatch) {
        isDisq = true;
        disqReason = localMatch.submissionStatus;
        foundSubId = localMatch.id || '';
        foundName = localMatch.name;
      }
    }

    if (isDisq) {
      return {
        isDisqualified: true,
        reason: disqReason,
        submissionId: foundSubId,
        participantName: foundName,
      };
    }

    return { isDisqualified: false };
  } catch (err) {
    console.warn('Firestore check error, checking local store:', err);
    const localSubs = getLocalFallbackSubmissions();
    const localMatch = localSubs.find(
      (s) =>
        s.participantId?.trim().toLowerCase() === cleanId.toLowerCase() &&
        (s.submissionStatus === 'disqualified' ||
          s.submissionStatus === 'tab_switched' ||
          (s as any).isDisqualified === true) &&
        s.submissionStatus !== 'reinstated'
    );
    if (localMatch) {
      return {
        isDisqualified: true,
        reason: localMatch.submissionStatus,
        submissionId: localMatch.id || '',
        participantName: localMatch.name,
      };
    }
    return { isDisqualified: false };
  }
}

/**
 * Revoke disqualification for a submission in Firestore.
 * Resets submissionStatus to 'reinstated' and isDisqualified to false.
 */
export async function revokeDisqualification(
  submissionId?: string,
  participantName: string = '',
  participantId: string = ''
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Update the submission document in Firestore to status 'reinstated' and isDisqualified: false
    if (submissionId && !submissionId.startsWith('loc_')) {
      const docRef = doc(db, 'submissions', submissionId);
      await updateDoc(docRef, {
        submissionStatus: 'reinstated',
        isDisqualified: false,
        reinstatedAt: serverTimestamp(),
      });
    }

    // 2. Also search all submissions with this participantId that are disqualified and update them
    if (participantId) {
      try {
        const qId = query(collection(db, 'submissions'), where('participantId', '==', participantId.trim()));
        const idSnaps = await getDocs(qId);
        idSnaps.forEach(async (d) => {
          const data = d.data();
          if (data.submissionStatus === 'tab_switched' || data.submissionStatus === 'disqualified' || data.isDisqualified) {
            await updateDoc(doc(db, 'submissions', d.id), {
              submissionStatus: 'reinstated',
              isDisqualified: false,
              reinstatedAt: serverTimestamp(),
            });
          }
        });
      } catch (e) {
        console.warn('Bulk reinstatement notice:', e);
      }
    }

    // 3. Register in 'reinstatements' collection with participant name and ID as key
    // so active participant devices can listen and automatically unlock in real-time
    const keysToUpdate: string[] = [];
    if (participantName) {
      keysToUpdate.push(participantName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_'));
    }
    if (participantId) {
      keysToUpdate.push(participantId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_'));
    }

    for (const key of keysToUpdate) {
      if (key) {
        const reinstateRef = doc(db, 'reinstatements', key);
        await setDoc(reinstateRef, {
          participantName: participantName.trim(),
          participantId: participantId.trim(),
          reinstatedAt: serverTimestamp(),
          active: true,
          isDisqualified: false,
        });
      }
    }

    // 4. Update local fallback list if present
    const localSubs = getLocalFallbackSubmissions();
    const updated = localSubs.map((s) =>
      (submissionId && s.id === submissionId) ||
      (participantId && s.participantId?.toLowerCase() === participantId.toLowerCase()) ||
      (participantName && s.name.toLowerCase() === participantName.toLowerCase())
        ? { ...s, submissionStatus: 'reinstated' as SubmissionStatus, isDisqualified: false }
        : s
    );
    localStorage.setItem(LOCAL_STORAGE_SUBMISSIONS_KEY, JSON.stringify(updated));

    // 5. Update active local session in localStorage if matching so operative can resume immediately
    const activeRaw = localStorage.getItem('singularity_strike_session_v1');
    if (activeRaw) {
      try {
        const parsed = JSON.parse(activeRaw);
        if (
          parsed &&
          ((participantId && parsed.participantId?.toLowerCase() === participantId.toLowerCase()) ||
            (participantName && parsed.participantName?.toLowerCase() === participantName.toLowerCase()))
        ) {
          parsed.isSubmitted = false;
          parsed.submissionStatus = null;
          parsed.targetEndTime = Date.now() + (parsed.remainingSeconds || 15 * 60) * 1000;
          localStorage.setItem('singularity_strike_session_v1', JSON.stringify(parsed));
        }
      } catch {}
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error revoking disqualification in Firestore:', err);
    // Local fallback update
    const localSubs = getLocalFallbackSubmissions();
    const updated = localSubs.map((s) =>
      (submissionId && s.id === submissionId) ||
      (participantId && s.participantId?.toLowerCase() === participantId.toLowerCase()) ||
      (participantName && s.name.toLowerCase() === participantName.toLowerCase())
        ? { ...s, submissionStatus: 'reinstated' as SubmissionStatus, isDisqualified: false }
        : s
    );
    localStorage.setItem(LOCAL_STORAGE_SUBMISSIONS_KEY, JSON.stringify(updated));
    return { success: true, error: err?.message };
  }
}

/**
 * Subscribe to reinstatement notifications for a specific participant (by name or ID)
 */
export function subscribeToReinstatement(
  identifier: string,
  onReinstated: () => void
): () => void {
  const sanitized = identifier.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  if (!sanitized) return () => {};

  try {
    const reinstateRef = doc(db, 'reinstatements', sanitized);
    const unsubscribe = onSnapshot(
      reinstateRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data && data.active) {
            onReinstated();
          }
        }
      },
      (err) => {
        console.warn('Reinstatement listener notice:', err);
      }
    );
    return unsubscribe;
  } catch {
    return () => {};
  }
}
