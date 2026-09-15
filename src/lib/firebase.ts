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
  getDoc,
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
 * Generate deterministic document ID per participant to enforce single-document lifecycle
 */
export function getSubmissionDocId(participantId: string): string {
  const sanitized = (participantId || '').trim().toLowerCase().replace(/[^a-z0-9_-]/g, '_');
  return sanitized || `sub_${Date.now()}`;
}

/**
 * Save quiz submission to Firestore 'submissions' collection
 * Strictly enforces a single-document lifecycle using deterministic docId and setDoc with merge: true.
 * Mutates the existing active session in-place instead of creating a second document.
 */
export async function saveSubmission(
  submission: Omit<Submission, 'id' | 'submittedAt'>
): Promise<{ success: boolean; id?: string; error?: string }> {
  try {
    const isDisq =
      submission.submissionStatus === 'tab_switched' ||
      submission.submissionStatus === 'disqualified' ||
      submission.isDisqualified === true;

    const cleanId = (submission.participantId || '').trim();
    const docId = getSubmissionDocId(cleanId || submission.name);
    const userDocRef = doc(db, 'submissions', docId);

    // Single-entry write: Upsert/mutate in-place with deterministic docId
    // Preserves startedAt timestamp while recording final submittedAt and performance stats.
    await setDoc(
      userDocRef,
      {
        name: submission.name.trim(),
        participantId: cleanId || 'N/A',
        correctAnswers: submission.correctAnswers,
        totalAttempted: submission.totalAttempted,
        timeTakenSeconds: submission.timeTakenSeconds,
        remainingSeconds: submission.remainingSeconds ?? 0,
        submittedAt: serverTimestamp(),
        submissionStatus: submission.submissionStatus,
        isDisqualified: isDisq,
      },
      { merge: true }
    );

    // Clean up any legacy duplicate documents created with random IDs for this participant
    if (cleanId && cleanId !== 'N/A') {
      try {
        const legacyQuery = query(collection(db, 'submissions'), where('participantId', '==', cleanId));
        const legacySnaps = await getDocs(legacyQuery);
        for (const snap of legacySnaps.docs) {
          if (snap.id !== docId) {
            await deleteDoc(snap.ref).catch(() => {});
          }
        }
      } catch (cleanErr) {
        console.warn('Legacy duplicate cleanup notice:', cleanErr);
      }
    }

    // Also cache locally in case of offline/backup
    saveSubmissionToLocal({
      ...submission,
      id: docId,
      isDisqualified: isDisq,
      submittedAt: new Date().toISOString(),
    });

    return { success: true, id: docId };
  } catch (err: any) {
    console.error('Firestore saveSubmission error, saving to local fallback:', err);
    const cleanId = (submission.participantId || '').trim();
    const localId = getSubmissionDocId(cleanId || submission.name);
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
    const pId = sub.participantId?.trim().toLowerCase();
    // Avoid duplicate IDs or duplicate participant IDs
    const filtered = list.filter((item) => {
      if (item.id === sub.id) return false;
      if (pId && pId !== 'n/a' && item.participantId?.trim().toLowerCase() === pId) return false;
      return true;
    });
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
        const participantMap = new Map<string, Submission>();
        const unassignedSubs: Submission[] = [];

        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          let submittedAt = data.submittedAt || data.startedAt;
          if (submittedAt && typeof submittedAt.toDate === 'function') {
            submittedAt = submittedAt.toDate();
          } else if (submittedAt && submittedAt.seconds) {
            submittedAt = new Date(submittedAt.seconds * 1000);
          }

          let startedAt = data.startedAt;
          if (startedAt && typeof startedAt.toDate === 'function') {
            startedAt = startedAt.toDate();
          } else if (startedAt && startedAt.seconds) {
            startedAt = new Date(startedAt.seconds * 1000);
          }

          const sub: Submission = {
            id: docSnap.id,
            name: data.name || 'Anonymous Operative',
            participantId: data.participantId || 'N/A',
            correctAnswers: Number(data.correctAnswers || 0),
            totalAttempted: Number(data.totalAttempted || 0),
            timeTakenSeconds: Number(data.timeTakenSeconds || 0),
            remainingSeconds: Number(data.remainingSeconds || 0),
            startedAt: startedAt || null,
            submittedAt: submittedAt || new Date(),
            submissionStatus: data.submissionStatus || 'completed',
            isDisqualified:
              data.isDisqualified === true ||
              data.submissionStatus === 'tab_switched' ||
              data.submissionStatus === 'disqualified',
            reinstatedAt: data.reinstatedAt,
            lastTimeGrantMinutes: data.lastTimeGrantMinutes,
            lastTimeGrantAt: data.lastTimeGrantAt,
          };

          const pKey = (sub.participantId || '').trim().toLowerCase();
          if (pKey && pKey !== 'n/a') {
            const existing = participantMap.get(pKey);
            if (!existing) {
              participantMap.set(pKey, sub);
            } else {
              // Status priority: any finalized status beats 'active'.
              // Among two finalized or two active docs, keep the most recently updated one.
              const finalizedStatuses = new Set([
                'completed', 'time_expired', 'tab_switched', 'disqualified', 'reinstated',
              ]);
              const existingIsFinalized = finalizedStatuses.has(existing.submissionStatus);
              const subIsFinalized = finalizedStatuses.has(sub.submissionStatus);

              if (!existingIsFinalized && subIsFinalized) {
                // Replace active with any finalized status
                participantMap.set(pKey, sub);
              } else if (existingIsFinalized && !subIsFinalized) {
                // Keep existing finalized; discard new active doc
              } else {
                // Both same tier (both active or both finalized) → most recently updated wins
                const existingTime = existing.submittedAt
                  ? new Date(existing.submittedAt).getTime()
                  : 0;
                const subTime = sub.submittedAt ? new Date(sub.submittedAt).getTime() : 0;
                if (subTime > existingTime) {
                  participantMap.set(pKey, sub);
                }
              }
            }
          } else {
            unassignedSubs.push(sub);
          }
        });

        const results: Submission[] = [...Array.from(participantMap.values()), ...unassignedSubs];

        // Merge with any local offline submissions not in firestore
        const localSubs = getLocalFallbackSubmissions();
        const existingIds = new Set(results.map((r) => r.id));
        const existingPids = new Set(results.map((r) => r.participantId?.trim().toLowerCase()).filter(Boolean));
        for (const local of localSubs) {
          const lPid = (local.participantId || '').trim().toLowerCase();
          if (local.id && !existingIds.has(local.id) && (!lPid || !existingPids.has(lPid))) {
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
          try {
            await deleteDoc(doc(db, 'submissions', getSubmissionDocId(participantId)));
          } catch {}
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
 * Register active participant in Firestore as 'active' status.
 * Guards against overwriting a finalized submission (completed / time_expired /
 * tab_switched / disqualified / reinstated) back to active+zeros — which was
 * the root cause of the live leaderboard not updating.
 */
export async function registerActiveParticipant(
  name: string,
  participantId: string,
  remainingSeconds: number
): Promise<{ success: boolean; id?: string }> {
  try {
    const cleanId = (participantId || '').trim();
    if (!cleanId) return { success: false };

    const docId = getSubmissionDocId(cleanId);
    const userDocRef = doc(db, 'submissions', docId);

    // Read the existing document first so we never overwrite a finalized submission
    // back to active+zeros (which was causing the leaderboard to stop updating).
    const existingSnap = await getDoc(userDocRef);
    const finalizedStatuses = new Set([
      'completed', 'time_expired', 'tab_switched', 'disqualified', 'reinstated',
    ]);
    if (existingSnap.exists()) {
      const currentStatus = existingSnap.data()?.submissionStatus;
      if (finalizedStatuses.has(currentStatus)) {
        // Document already finalized — do not overwrite with active+zeros.
        console.log(`[registerActiveParticipant] Skipping overwrite: doc ${docId} already finalized as '${currentStatus}'`);
        return { success: true, id: docId };
      }
    }

    // Document doesn't exist yet or is still active — safe to write/update.
    await setDoc(
      userDocRef,
      {
        name: name.trim(),
        participantId: cleanId,
        correctAnswers: 0,
        totalAttempted: 0,
        timeTakenSeconds: 0,
        remainingSeconds,
        startedAt: serverTimestamp(),
        submissionStatus: 'active',
        isDisqualified: false,
      },
      { merge: true }
    );

    // Also register in local storage fallback
    saveSubmissionToLocal({
      id: docId,
      name: name.trim(),
      participantId: cleanId,
      correctAnswers: 0,
      totalAttempted: 0,
      timeTakenSeconds: 0,
      remainingSeconds,
      startedAt: new Date().toISOString(),
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
