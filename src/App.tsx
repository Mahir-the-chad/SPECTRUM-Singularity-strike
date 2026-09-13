import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
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
import { LeaderboardModal } from './components/LeaderboardModal';

export default function App() {
  const location = useLocation();
  const navigate = useNavigate();

  const [session, setSession] = useState<QuizSessionState | null>(() => loadPersistedSession());
  const [pendingName, setPendingName] = useState<string>(() => {
    const saved = loadPersistedSession();
    return saved?.participantName || '';
  });
  const [pendingParticipantId, setPendingParticipantId] = useState<string>(() => {
    const saved = loadPersistedSession();
    return saved?.participantId || '';
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [isLeaderboardModalOpen, setIsLeaderboardModalOpen] = useState(false);

  // Compute active high-level view based on current route
  const getCurrentView = (): 'landing' | 'register' | 'rules' | 'quiz' | 'result' | 'admin' => {
    const path = location.pathname.toLowerCase().replace(/\/$/, '') || '/';
    if (path === '/admin' || location.hash === '#admin') return 'admin';
    if (path === '/register') return 'register';
    if (path === '/rules') return 'rules';
    if (path === '/quiz') return 'quiz';
    if (path === '/result') return 'result';
    return 'landing';
  };
  const currentView = getCurrentView();

  // Backward compatibility for #admin hash URLs
  useEffect(() => {
    if (window.location.hash === '#admin' && location.pathname !== '/admin') {
      navigate('/admin', { replace: true });
    }
  }, [location.pathname, navigate]);

  const navigateTo = useCallback(
    (view: 'landing' | 'register' | 'rules' | 'quiz' | 'result' | 'admin') => {
      const viewToPath: Record<string, string> = {
        landing: '/',
        register: '/register',
        rules: '/rules',
        quiz: '/quiz',
        result: '/result',
        admin: '/admin',
      };
      navigate(viewToPath[view] || '/');
    },
    [navigate]
  );

  // Check persisted session on mount: handle time expiry if quiz was running
  useEffect(() => {
    const saved = loadPersistedSession();
    if (saved) {
      setSession(saved);

      if (saved.isStarted && !saved.isSubmitted && saved.remainingSeconds <= 0) {
        handleFinalizeSubmit('time_expired', saved);
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

  // Resume active quiz session (only allowed if session is active and not submitted/disqualified)
  const handleResumeQuiz = () => {
    if (session && session.isStarted && !session.isSubmitted) {
      navigateTo('quiz');
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

      {/* Main Content Area with React Router */}
      <main className="flex-1 flex flex-col justify-start">
        <Routes>
          {/* Step 1: Landing Page */}
          <Route
            path="/"
            element={
              <LandingPage
                onGoToRegister={handleGoToRegister}
                onResumeQuiz={handleResumeQuiz}
                hasActiveSession={Boolean(session && session.isStarted && !session.isSubmitted)}
                savedName={session?.participantName}
                savedParticipantId={session?.participantId}
                savedRemainingSeconds={session?.remainingSeconds}
              />
            }
          />

          {/* Step 2: Registration Page */}
          <Route
            path="/register"
            element={
              <RegistrationPage
                onCompleteRegistration={handleCompleteRegistration}
                onBackToLanding={() => navigateTo('landing')}
                initialName={pendingName || ''}
                initialParticipantId={pendingParticipantId || ''}
              />
            }
          />

          {/* Step 3: Rules Page */}
          <Route
            path="/rules"
            element={
              <RulesPage
                participantName={pendingName || session?.participantName || 'Operative'}
                participantId={pendingParticipantId || session?.participantId || 'N/A'}
                onInitializeStrikeRun={handleInitializeStrikeRun}
                onBackToRegistration={() => navigateTo('register')}
              />
            }
          />

          {/* Step 4: Live Quiz Arena */}
          <Route
            path="/quiz"
            element={
              session && session.isStarted && !session.isSubmitted ? (
                <QuizArena
                  session={session}
                  onUpdateSession={(updater) => setSession((prev) => (prev ? updater(prev) : prev))}
                  onSubmitQuiz={(status) => handleFinalizeSubmit(status)}
                  isSubmitting={isSubmitting}
                />
              ) : session?.isSubmitted ? (
                <Navigate to="/result" replace />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          {/* Step 5: Result & Debrief Screen */}
          <Route
            path="/result"
            element={
              session ? (
                <ResultScreen
                  session={session}
                  onViewLeaderboard={() => setIsLeaderboardModalOpen(true)}
                />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />

          {/* Step 6: Admin Panel & Leaderboard with Participant ID */}
          <Route
            path="/admin"
            element={
              <AdminPanel
                onBackToQuiz={() =>
                  navigateTo(
                    session?.isSubmitted ? 'result' : session?.isStarted ? 'quiz' : 'landing'
                  )
                }
                onRevokeDisqualification={handleRevokeDisqualification}
              />
            }
          />

          {/* Fallback for trailing slash /admin/* */}
          <Route
            path="/admin/*"
            element={
              <AdminPanel
                onBackToQuiz={() =>
                  navigateTo(
                    session?.isSubmitted ? 'result' : session?.isStarted ? 'quiz' : 'landing'
                  )
                }
                onRevokeDisqualification={handleRevokeDisqualification}
              />
            }
          />

          {/* Wildcard catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {/* Rules & Competition Briefing Modal */}
      <RulesModal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
      />

      {/* Public Read-Only Leaderboard Modal */}
      <LeaderboardModal
        isOpen={isLeaderboardModalOpen}
        onClose={() => setIsLeaderboardModalOpen(false)}
        currentParticipantId={session?.participantId}
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
              id="footer-directives-btn"
              onClick={() => setIsRulesModalOpen(true)}
              className="hover:text-cyan-400 transition-colors cursor-pointer"
            >
              Directives
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
