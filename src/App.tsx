import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { QuizSessionState, SubmissionStatus, Submission } from './types';
import {
  createNewSession,
  loadPersistedSession,
  saveSessionToStorage,
  clearStoredSession,
  computeQuizScore,
  formatTimeMMSS,
  reinstateDisqualifiedSession,
} from './lib/quizEngine';
import { saveSubmission, subscribeToReinstatement } from './lib/firebase';
import { sounds } from './lib/audio';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { RegistrationPage } from './components/RegistrationPage';
import { RulesPage } from './components/RulesPage';
import { QuizArena } from './components/QuizArena';
import { ResultScreen } from './components/ResultScreen';
import { AdminPanel } from './components/AdminPanel';
import { RulesModal } from './components/RulesModal';

export default function App() {
  const [currentView, setCurrentView] = useState<
    'landing' | 'register' | 'rules' | 'quiz' | 'result' | 'admin'
  >('landing');
  const [session, setSession] = useState<QuizSessionState | null>(null);
  const [pendingName, setPendingName] = useState<string>('');
  const [pendingParticipantId, setPendingParticipantId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);

  // Synchronize URL route with view (/admin)
  useEffect(() => {
    const handleUrlRoute = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      if (path === '/admin' || hash === '#admin') {
        setCurrentView('admin');
      }
    };

    handleUrlRoute();
    window.addEventListener('popstate', handleUrlRoute);
    return () => window.removeEventListener('popstate', handleUrlRoute);
  }, []);

  const navigateTo = useCallback(
    (view: 'landing' | 'register' | 'rules' | 'quiz' | 'result' | 'admin') => {
      setCurrentView(view);
      if (view === 'admin') {
        window.history.pushState(null, '', '/admin');
      } else {
        if (window.location.pathname === '/admin') {
          window.history.pushState(null, '', '/');
        }
      }
    },
    []
  );

  // Check and restore persisted session on mount
  useEffect(() => {
    const saved = loadPersistedSession();
    if (saved) {
      setSession(saved);

      if (saved.isSubmitted) {
        if (window.location.pathname !== '/admin') {
          setCurrentView('result');
        }
      } else if (saved.isStarted) {
        if (saved.remainingSeconds <= 0) {
          // Time had expired while away
          handleFinalizeSubmit('time_expired', saved);
        } else {
          if (window.location.pathname !== '/admin') {
            setCurrentView('quiz');
          }
        }
      }
    }
  }, []);

  // Flow Step 1: User clicks 'Register' on Landing Page -> go to Registration
  const handleGoToRegister = () => {
    setPendingName('');
    setPendingParticipantId('');
    navigateTo('register');
  };

  // Flow Step 2: User submits Registration form -> go to Rules Page
  const handleCompleteRegistration = (name: string, participantId: string) => {
    setPendingName(name);
    setPendingParticipantId(participantId);

    // If an existing unsubmitted session belongs to this same participant, allow immediate resume
    if (
      session &&
      session.isStarted &&
      !session.isSubmitted &&
      (session.participantId.toLowerCase() === participantId.toLowerCase() ||
        session.participantName.toLowerCase() === name.toLowerCase())
    ) {
      navigateTo('rules');
      return;
    }

    navigateTo('rules');
  };

  // Flow Step 3: User checks required agreement box and clicks 'Initialize Strike Run'
  // Strict 15-minute countdown clock starts ONLY here!
  const handleInitializeStrikeRun = () => {
    const activeName = pendingName.trim() || 'Operative';
    const activeId = pendingParticipantId.trim() || 'OP-' + Math.floor(1000 + Math.random() * 9000);
    const newSession = createNewSession(activeName, activeId);
    setSession(newSession);
    navigateTo('quiz');
  };

  // Resume active quiz session
  const handleResumeQuiz = () => {
    if (session && session.isStarted) {
      if (session.isSubmitted && session.submissionStatus === 'tab_switched') {
        const reinstated = reinstateDisqualifiedSession(session);
        setSession(reinstated);
        isSubmittingRef.current = false;
        setIsSubmitting(false);
        navigateTo('quiz');
      } else if (!session.isSubmitted) {
        navigateTo('quiz');
      }
    }
  };

  // Revoke disqualification handler (updates active session and restarts timer from banked time)
  const handleRevokeDisqualification = useCallback((participantName: string) => {
    setSession((prev) => {
      if (!prev) return prev;
      if (prev.participantName.toLowerCase() === participantName.toLowerCase()) {
        const reinstated = reinstateDisqualifiedSession(prev);
        isSubmittingRef.current = false;
        setIsSubmitting(false);
        return reinstated;
      }
      return prev;
    });
  }, []);

  // Real-time synchronization: listen for admin revoking disqualification for this participant
  useEffect(() => {
    if (!session) return;
    if (!session.isSubmitted || session.submissionStatus !== 'tab_switched') return;

    const identifier = session.participantId || session.participantName;
    if (!identifier) return;

    const unsubscribe = subscribeToReinstatement(identifier, () => {
      sounds.playLifeline();
      setSession((prev) => {
        if (!prev) return prev;
        const reinstated = reinstateDisqualifiedSession(prev);
        isSubmittingRef.current = false;
        setIsSubmitting(false);
        return reinstated;
      });
      navigateTo('quiz');
    });

    return () => unsubscribe();
  }, [session?.participantId, session?.participantName, session?.isSubmitted, session?.submissionStatus, navigateTo]);

  // Multi-tab storage listener to resume strike if revoked in another window
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'singularity_strike_session_v1' && e.newValue) {
        try {
          const updated = JSON.parse(e.newValue);
          if (updated && !updated.isSubmitted && updated.isStarted) {
            setSession(updated);
            isSubmittingRef.current = false;
            setIsSubmitting(false);
            if (currentView === 'result') {
              navigateTo('quiz');
            }
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [currentView, navigateTo]);

  // Reset quiz for a fresh run
  const handleResetQuiz = () => {
    clearStoredSession();
    setSession(null);
    setPendingName('');
    setPendingParticipantId('');
    navigateTo('landing');
  };

  // Finalize & Submit Quiz (Idempotent)
  const isSubmittingRef = useRef(false);
  const handleFinalizeSubmit = async (
    status: SubmissionStatus,
    targetSession?: QuizSessionState
  ) => {
    const active = targetSession || session;
    if (!active || active.isSubmitted || isSubmittingRef.current) return;

    isSubmittingRef.current = true;
    setIsSubmitting(true);

    try {
      // Calculate final score with participantId included
      const submissionData = computeQuizScore(
        active.activeQuestions,
        active.selectedAnswers,
        active.remainingSeconds,
        active.totalDurationSeconds,
        active.participantName,
        active.participantId,
        status
      );

      // Commit to Firestore 'submissions' collection
      const firestoreResult = await saveSubmission(submissionData);

      const submittedResult: Submission = {
        ...submissionData,
        id: firestoreResult.id,
        submittedAt: new Date(),
      };

      const updatedSession: QuizSessionState = {
        ...active,
        isSubmitted: true,
        submissionStatus: status,
        submissionResult: submittedResult,
      };

      setSession(updatedSession);
      saveSessionToStorage(updatedSession);

      // Play appropriate sound
      if (status === 'completed') {
        sounds.playSuccess();
      } else if (status === 'tab_switched') {
        sounds.playWarning();
      } else {
        sounds.playTimerTick();
      }

      navigateTo('result');
    } catch (err) {
      console.error('Finalize quiz submission error:', err);
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  // Sound toggle
  const handleToggleSound = () => {
    const next = sounds.toggleSound();
    setSoundEnabled(next);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Universal Tactical Navbar */}
      <Navbar
        currentView={currentView}
        onNavigate={navigateTo}
        participantName={session?.participantName || pendingName}
        remainingTimeFormatted={session ? formatTimeMMSS(session.remainingSeconds) : '15:00'}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        onOpenRules={() => setIsRulesModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col justify-start">
        {/* Step 1: Landing Page */}
        {currentView === 'landing' && (
          <LandingPage
            onGoToRegister={handleGoToRegister}
            onResumeQuiz={handleResumeQuiz}
            hasActiveSession={Boolean(session && session.isStarted && !session.isSubmitted)}
            savedName={session?.participantName}
            savedParticipantId={session?.participantId}
            savedRemainingSeconds={session?.remainingSeconds}
          />
        )}

        {/* Step 2: Registration Page */}
        {currentView === 'register' && (
          <RegistrationPage
            onCompleteRegistration={handleCompleteRegistration}
            onBackToLanding={() => navigateTo('landing')}
            initialName={pendingName || ''}
            initialParticipantId={pendingParticipantId || ''}
          />
        )}

        {/* Step 3: Rules Page with Timer Trigger & Required Agreement Checkbox */}
        {currentView === 'rules' && (
          <RulesPage
            participantName={pendingName || session?.participantName || 'Operative'}
            participantId={pendingParticipantId || session?.participantId || 'N/A'}
            onInitializeStrikeRun={handleInitializeStrikeRun}
            onBackToRegistration={() => navigateTo('register')}
          />
        )}

        {/* Step 4: Live Quiz Arena (15-Minute Countdown) */}
        {currentView === 'quiz' && session && (
          <QuizArena
            session={session}
            onUpdateSession={(updater) => setSession((prev) => (prev ? updater(prev) : prev))}
            onSubmitQuiz={(status) => handleFinalizeSubmit(status)}
            isSubmitting={isSubmitting}
          />
        )}

        {/* Step 5: Result & Debrief Screen */}
        {currentView === 'result' && session && (
          <ResultScreen
            session={session}
            onResetQuiz={handleResetQuiz}
            onViewLeaderboard={() => navigateTo('admin')}
            onResumeQuiz={handleResumeQuiz}
          />
        )}

        {/* Step 6: Admin Panel & Leaderboard with Participant ID */}
        {currentView === 'admin' && (
          <AdminPanel
            onBackToQuiz={() =>
              navigateTo(
                session?.isSubmitted ? 'result' : session?.isStarted ? 'quiz' : 'landing'
              )
            }
            onRevokeDisqualification={handleRevokeDisqualification}
          />
        )}
      </main>

      {/* Rules & Competition Briefing Modal */}
      <RulesModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
      />

      {/* Footer */}
      <footer className="w-full border-t border-slate-900 py-4 px-4 text-center text-xs font-mono text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            SINGULARITY STRIKE &bull; SPECTRUM 5.0 TECHNICAL ARENA
          </div>
          <div className="flex items-center gap-3 text-slate-600">
            <span>FIRESTORE BACKED</span>
            <span>&bull;</span>
            <button
              onClick={() => setIsRulesModalOpen(true)}
              className="hover:text-cyan-400 transition-colors cursor-pointer"
            >
              Directives
            </button>
            <span>&bull;</span>
            <button
              onClick={() => navigateTo('admin')}
              className="hover:text-cyan-400 transition-colors cursor-pointer"
            >
              /admin
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
