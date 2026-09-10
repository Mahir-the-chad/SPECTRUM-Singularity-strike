import React, { useState, useEffect, useCallback, useRef } from 'react';
import type { QuizSessionState, SubmissionStatus, Submission } from './types';
import {
  createNewSession,
  loadPersistedSession,
  saveSessionToStorage,
  clearStoredSession,
  computeQuizScore,
  formatTimeMMSS,
} from './lib/quizEngine';
import { saveSubmission } from './lib/firebase';
import { sounds } from './lib/audio';
import { Navbar } from './components/Navbar';
import { ParticipantEntry } from './components/ParticipantEntry';
import { QuizArena } from './components/QuizArena';
import { ResultScreen } from './components/ResultScreen';
import { AdminPanel } from './components/AdminPanel';
import { RulesModal } from './components/RulesModal';

export default function App() {
  const [currentView, setCurrentView] = useState<'entry' | 'quiz' | 'result' | 'admin'>('entry');
  const [session, setSession] = useState<QuizSessionState | null>(null);
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

  const navigateTo = useCallback((view: 'entry' | 'quiz' | 'result' | 'admin') => {
    setCurrentView(view);
    if (view === 'admin') {
      window.history.pushState(null, '', '/admin');
    } else {
      if (window.location.pathname === '/admin') {
        window.history.pushState(null, '', '/');
      }
    }
  }, []);

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

  // Start new quiz session
  const handleStartQuiz = (participantName: string) => {
    const newSession = createNewSession(participantName);
    setSession(newSession);
    navigateTo('quiz');
  };

  // Resume active quiz session
  const handleResumeQuiz = () => {
    if (session && session.isStarted && !session.isSubmitted) {
      navigateTo('quiz');
    }
  };

  // Reset quiz for a fresh run
  const handleResetQuiz = () => {
    clearStoredSession();
    setSession(null);
    navigateTo('entry');
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
      // Calculate final score
      const submissionData = computeQuizScore(
        active.activeQuestions,
        active.selectedAnswers,
        active.remainingSeconds,
        active.totalDurationSeconds,
        active.participantName,
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

      sounds.playLifeline();
      navigateTo('result');
    } catch (err) {
      console.error('Submission finalization error:', err);
      // Fallback update
      const fallbackResult: Submission = {
        name: active.participantName,
        correctAnswers: 0,
        totalAttempted: 0,
        timeTakenSeconds: active.totalDurationSeconds - active.remainingSeconds,
        submittedAt: new Date(),
        submissionStatus: status,
      };
      setSession({
        ...active,
        isSubmitted: true,
        submissionStatus: status,
        submissionResult: fallbackResult,
      });
      navigateTo('result');
    } finally {
      setIsSubmitting(false);
      isSubmittingRef.current = false;
    }
  };

  // Toggle procedural sound FX
  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sounds.enabled = next;
    if (next) sounds.playSelect();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Dynamic Navigation Header */}
      <Navbar
        currentView={currentView}
        onNavigate={navigateTo}
        participantName={session?.participantName}
        remainingTimeFormatted={session ? formatTimeMMSS(session.remainingSeconds) : '15:00'}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        onOpenRules={() => setIsRulesModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col justify-start">
        {currentView === 'entry' && (
          <ParticipantEntry
            onStartQuiz={handleStartQuiz}
            onResumeQuiz={handleResumeQuiz}
            hasActiveSession={Boolean(session && session.isStarted && !session.isSubmitted)}
            savedName={session?.participantName}
            savedRemainingSeconds={session?.remainingSeconds}
          />
        )}

        {currentView === 'quiz' && session && (
          <QuizArena
            session={session}
            onUpdateSession={(updater) => setSession((prev) => (prev ? updater(prev) : prev))}
            onSubmitQuiz={(status) => handleFinalizeSubmit(status)}
            isSubmitting={isSubmitting}
          />
        )}

        {currentView === 'result' && session && (
          <ResultScreen
            session={session}
            onResetQuiz={handleResetQuiz}
            onViewLeaderboard={() => navigateTo('admin')}
          />
        )}

        {currentView === 'admin' && (
          <AdminPanel onBackToQuiz={() => navigateTo(session?.isSubmitted ? 'result' : 'entry')} />
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
            SINGULARITY STRIKE &bull; DEFENSE TECH COMPETITION PROTOCOL
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
