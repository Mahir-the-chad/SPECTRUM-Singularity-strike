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
  deleteDoc,
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
    let docRefId = '';

    // Check if an existing document for this participant exists (e.g. from active session registration)
    if (submission.participantId && submission.participantId !== 'N/A') {
      try {
        const q = query(submissionsRef, where('participantId', '==', submission.participantId.trim()));
        const existingDocs = await getDocs(q);
        if (!existingDocs.empty) {
          const firstDoc = existingDocs.docs[0];
          docRefId = firstDoc.id;
          await updateDoc(doc(db, 'submissions', docRefId), {
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
        }
      } catch (checkErr) {
        console.warn('Notice checking existing participant document:', checkErr);
      }
    }

    if (!docRefId) {
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
      docRefId = docRef.id;
    }

    // Also cache locally in case of offline/backup
    saveSubmissionToLocal({
      ...submission,
      id: docRefId,
      isDisqualified: isDisq,
      submittedAt: new Date().toISOString(),
    });

    return { success: true, id: docRefId };
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
 * Permanently delete a submission / participant user from Firestore and local storage
 */
export async function deleteSubmission(
  submissionId?: string,
  participantName?: string,
  participantId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Delete document by ID if provided and not purely a local fallback ID
    if (submissionId && !submissionId.startsWith('loc_')) {
      try {
        const subDocRef = doc(db, 'submissions', submissionId);
        await deleteDoc(subDocRef);
      } catch (e) {
        console.warn('Direct deleteDoc notice:', e);
      }
    }

    // 2. Query and delete all matching submissions in Firestore by participantId or name
    if (participantId || participantName) {
      try {
        const submissionsRef = collection(db, 'submissions');
        if (participantId && participantId !== 'N/A') {
          const qId = query(submissionsRef, where('participantId', '==', participantId.trim()));
          const snapsId = await getDocs(qId);
          for (const docSnap of snapsId.docs) {
            await deleteDoc(docSnap.ref);
          }
        }
        if (participantName) {
          const qName = query(submissionsRef, where('name', '==', participantName.trim()));
          const snapsName = await getDocs(qName);
          for (const docSnap of snapsName.docs) {
            await deleteDoc(docSnap.ref);
          }
        }
      } catch (e) {
        console.warn('Batch deletion query notice:', e);
      }
    }

    // 3. Clean up any related records in 'reinstatements' and 'time_grants'
    const keysToClean: string[] = [];
    if (participantName) {
      keysToClean.push(participantName.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_'));
    }
    if (participantId && participantId !== 'N/A') {
      keysToClean.push(participantId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_'));
    }

    for (const key of keysToClean) {
      if (key) {
        try {
          await deleteDoc(doc(db, 'reinstatements', key));
        } catch {}
        try {
          await deleteDoc(doc(db, 'time_grants', key));
        } catch {}
      }
    }

    // 4. Remove from local storage submissions cache
    const localSubs = getLocalFallbackSubmissions();
    const filtered = localSubs.filter((s) => {
      if (submissionId && s.id === submissionId) return false;
      if (participantId && participantId !== 'N/A' && s.participantId?.toLowerCase() === participantId.toLowerCase()) return false;
      if (participantName && s.name.toLowerCase() === participantName.toLowerCase()) return false;
      return true;
    });
    localStorage.setItem(LOCAL_STORAGE_SUBMISSIONS_KEY, JSON.stringify(filtered));

    // 5. If this matches the current local user's active session, clear it from localStorage
    const activeRaw = localStorage.getItem('singularity_strike_session_v1');
    if (activeRaw) {
      try {
        const parsed = JSON.parse(activeRaw);
        if (
          parsed &&
          ((participantId && participantId !== 'N/A' && parsed.participantId?.toLowerCase() === participantId.toLowerCase()) ||
            (participantName && parsed.participantName?.toLowerCase() === participantName.toLowerCase()))
        ) {
          localStorage.removeItem('singularity_strike_session_v1');
        }
      } catch {}
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error deleting submission from Firestore:', err);
    // Local fallback deletion
    const localSubs = getLocalFallbackSubmissions();
    const filtered = localSubs.filter((s) => {
      if (submissionId && s.id === submissionId) return false;
      if (participantId && participantId !== 'N/A' && s.participantId?.toLowerCase() === participantId.toLowerCase()) return false;
      if (participantName && s.name.toLowerCase() === participantName.toLowerCase()) return false;
      return true;
    });
    localStorage.setItem(LOCAL_STORAGE_SUBMISSIONS_KEY, JSON.stringify(filtered));
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

/**
 * Register active participant in Firestore as 'active' status
 * so the admin can monitor them in the leaderboard and grant extra time in real-time
 */
export async function registerActiveParticipant(
  name: string,
  participantId: string,
  remainingSeconds: number
): Promise<{ success: boolean; id?: string }> {
  try {
    const submissionsRef = collection(db, 'submissions');
    const cleanId = participantId.trim();
    const q = query(submissionsRef, where('participantId', '==', cleanId));
    const snaps = await getDocs(q);

    let docId = '';
    if (!snaps.empty) {
      docId = snaps.docs[0].id;
      await updateDoc(doc(db, 'submissions', docId), {
        name: name.trim(),
        participantId: cleanId,
        submissionStatus: 'active',
        remainingSeconds,
        isDisqualified: false,
        startedAt: serverTimestamp(),
      });
    } else {
      const newDoc = await addDoc(submissionsRef, {
        name: name.trim(),
        participantId: cleanId,
        correctAnswers: 0,
        totalAttempted: 0,
        timeTakenSeconds: 0,
        remainingSeconds,
        submittedAt: serverTimestamp(),
        submissionStatus: 'active',
        isDisqualified: false,
      });
      docId = newDoc.id;
    }

    // Also register in local storage fallback
    saveSubmissionToLocal({
      id: docId,
      name: name.trim(),
      participantId: cleanId,
      correctAnswers: 0,
      totalAttempted: 0,
      timeTakenSeconds: 0,
      remainingSeconds,
      submittedAt: new Date().toISOString(),
      submissionStatus: 'active',
      isDisqualified: false,
    });

    return { success: true, id: docId };
  } catch (err) {
    console.warn('Could not register active participant in Firestore:', err);
    return { success: false };
  }
}

/**
 * Grant extra time in minutes to a participant.
 * Dynamically updates Firestore time_grants collection and updates the submission document.
 */
export async function grantExtraTime(
  participantId: string,
  participantName: string,
  additionalMinutes: number
): Promise<{ success: boolean; addedSeconds: number; error?: string }> {
  const addedSeconds = Math.round(additionalMinutes * 60);
  if (addedSeconds <= 0) return { success: false, addedSeconds: 0, error: 'Invalid time amount' };

  try {
    const sanitizedId = (participantId || participantName).trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
    const grantId = `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    // 1. Write to time_grants collection for real-time notification
    const grantRef = doc(db, 'time_grants', sanitizedId);
    await setDoc(grantRef, {
      participantId: participantId.trim(),
      participantName: participantName.trim(),
      addedMinutes: additionalMinutes,
      addedSeconds,
      grantId,
      grantedAt: serverTimestamp(),
      active: true,
    });

    // 2. Also update in submissions collection for this participant
    try {
      const q = query(collection(db, 'submissions'), where('participantId', '==', participantId.trim()));
      const snaps = await getDocs(q);
      for (const d of snaps.docs) {
        const currentData = d.data();
        const currentRemaining = Number(currentData.remainingSeconds || 0);
        const newRemaining = currentRemaining + addedSeconds;
        await updateDoc(doc(db, 'submissions', d.id), {
          remainingSeconds: newRemaining,
          lastTimeGrantMinutes: additionalMinutes,
          lastTimeGrantAt: serverTimestamp(),
          // If status was time_expired, update to reinstated or active
          ...(currentData.submissionStatus === 'time_expired' ? { submissionStatus: 'reinstated' } : {}),
        });
      }
    } catch (e) {
      console.warn('Error updating submission remainingSeconds:', e);
    }

    // 3. Update localStorage session if running on this device / browser tab
    const activeRaw = localStorage.getItem('singularity_strike_session_v1');
    if (activeRaw) {
      try {
        const parsed = JSON.parse(activeRaw);
        if (
          parsed &&
          ((participantId && parsed.participantId?.toLowerCase() === participantId.toLowerCase()) ||
            (participantName && parsed.participantName?.toLowerCase() === participantName.toLowerCase()))
        ) {
          parsed.remainingSeconds = (parsed.remainingSeconds || 0) + addedSeconds;
          parsed.totalDurationSeconds = (parsed.totalDurationSeconds || 900) + addedSeconds;
          parsed.targetEndTime = Date.now() + parsed.remainingSeconds * 1000;
          if (parsed.submissionStatus === 'time_expired') {
            parsed.isSubmitted = false;
            parsed.submissionStatus = null;
          }
          localStorage.setItem('singularity_strike_session_v1', JSON.stringify(parsed));
        }
      } catch {}
    }

    return { success: true, addedSeconds };
  } catch (err: any) {
    console.error('Error granting extra time in Firestore:', err);
    return { success: false, addedSeconds, error: err?.message };
  }
}

/**
 * Subscribe to time grant notifications for a specific participant
 */
export function subscribeToTimeGrants(
  identifier: string,
  onTimeGranted: (addedSeconds: number, grantId: string, addedMinutes: number) => void
): () => void {
  const sanitized = identifier.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  if (!sanitized) return () => {};

  try {
    const grantRef = doc(db, 'time_grants', sanitized);
    let initialSnapshotSkipped = false;
    let initialDocGrantId: string | null = null;

    const unsubscribe = onSnapshot(
      grantRef,
      (docSnap) => {
        if (!docSnap.exists()) return;
        const data = docSnap.data();
        if (!data || !data.active || !data.grantId) return;

        // Skip any existing grant on initial snapshot so we only fire on newly issued grants
        if (!initialSnapshotSkipped) {
          initialSnapshotSkipped = true;
          initialDocGrantId = data.grantId;
          return;
        }

        if (data.grantId !== initialDocGrantId) {
          initialDocGrantId = data.grantId;
          onTimeGranted(data.addedSeconds || 0, data.grantId, data.addedMinutes || 0);
        }
      },
      (err) => {
        console.warn('Time grant listener notice:', err);
      }
    );
    return unsubscribe;
  } catch {
    return () => {};
  }
}
