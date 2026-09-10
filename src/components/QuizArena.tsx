import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Clock,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Send,
  AlertTriangle,
  HelpCircle,
  Sparkles,
  Award,
} from 'lucide-react';
import type { Question, QuizSessionState, SubmissionStatus } from '../types';
import { LifelineToolbar } from './LifelineToolbar';
import { AskAiModal } from './AskAiModal';
import { SwapModal } from './SwapModal';
import { SubmitConfirmModal } from './SubmitConfirmModal';
import {
  formatTimeMMSS,
  calculateFiftyFiftyHiddenOptions,
  getSwapReplacement,
  saveSessionToStorage,
} from '../lib/quizEngine';
import { sounds } from '../lib/audio';

interface QuizArenaProps {
  session: QuizSessionState;
  onUpdateSession: (updater: (prev: QuizSessionState) => QuizSessionState) => void;
  onSubmitQuiz: (status: SubmissionStatus) => void;
  isSubmitting: boolean;
}

export const QuizArena: React.FC<QuizArenaProps> = ({
  session,
  onUpdateSession,
  onSubmitQuiz,
  isSubmitting,
}) => {
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [tabSwitchWarning, setTabSwitchWarning] = useState(false);

  const currentQuestion: Question | undefined = session.activeQuestions[session.currentIndex];
  const difficulty = currentQuestion?.difficulty || 'medium';

  // Has 50-50 been used on this current question?
  const isFiftyFiftyActiveOnCurrent = Boolean(
    currentQuestion && session.hiddenOptions[currentQuestion.id]?.length
  );

  // Hidden options for current question
  const currentHiddenOptions = new Set(
    currentQuestion ? session.hiddenOptions[currentQuestion.id] || [] : []
  );

  // Remaining seconds calculation & 1-second interval ticker
  const targetEndTime = session.targetEndTime;

  useEffect(() => {
    if (session.isSubmitted) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.floor((targetEndTime - now) / 1000));

      onUpdateSession((prev) => {
        if (prev.remainingSeconds === remaining) return prev;
        const updated = { ...prev, remainingSeconds: remaining };
        saveSessionToStorage(updated);
        return updated;
      });

      // Beep in final 10 seconds
      if (remaining <= 10 && remaining > 0) {
        sounds.playWarning();
      }

      // Auto-submit on timer expiry
      if (remaining <= 0) {
        clearInterval(interval);
        sounds.playWarning();
        onSubmitQuiz('time_expired');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [targetEndTime, session.isSubmitted, onUpdateSession, onSubmitQuiz]);

  // Tab-switch Sentinel Security via visibilitychange API
  useEffect(() => {
    if (session.isSubmitted) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        console.warn('Tab-switch or window minimize detected via visibilitychange API!');
        sounds.playWarning();
        // Immediately trigger auto-submission with status 'tab_switched'
        onSubmitQuiz('tab_switched');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [session.isSubmitted, onSubmitQuiz]);

  // Handle Option Selection
  const handleSelectOption = (option: string) => {
    if (!currentQuestion || session.isSubmitted) return;
    if (currentHiddenOptions.has(option)) return; // Option was eliminated by 50-50

    sounds.playSelect();
    onUpdateSession((prev) => {
      const updatedAnswers = {
        ...prev.selectedAnswers,
        [currentQuestion.id]: option,
      };
      const updated = { ...prev, selectedAnswers: updatedAnswers };
      saveSessionToStorage(updated);
      return updated;
    });
  };

  // Lifeline: 50-50
  const handleUseFiftyFifty = () => {
    if (!currentQuestion || session.usedLifelines.fiftyFifty) return;

    const hidden = calculateFiftyFiftyHiddenOptions(currentQuestion);
    sounds.playLifeline();

    onUpdateSession((prev) => {
      const updatedHidden = {
        ...prev.hiddenOptions,
        [currentQuestion.id]: hidden,
      };
      const updatedLifelines = {
        ...prev.usedLifelines,
        fiftyFifty: true,
      };

      // If participant previously selected one of the eliminated options, clear it
      const currentSelected = prev.selectedAnswers[currentQuestion.id];
      const updatedAnswers = { ...prev.selectedAnswers };
      if (currentSelected && hidden.includes(currentSelected)) {
        delete updatedAnswers[currentQuestion.id];
      }

      const updated = {
        ...prev,
        hiddenOptions: updatedHidden,
        usedLifelines: updatedLifelines,
        selectedAnswers: updatedAnswers,
      };
      saveSessionToStorage(updated);
      return updated;
    });
  };

  // Lifeline: Swap Challenge
  const handleExecuteSwap = () => {
    if (!currentQuestion || session.usedLifelines.swapChallenge) return;

    const replacement = getSwapReplacement(
      currentQuestion,
      session.activeQuestions,
      session.swappedQuestionIds
    );

    if (!replacement) {
      alert('No replacement available for this category tier.');
      setIsSwapModalOpen(false);
      return;
    }

    onUpdateSession((prev) => {
      const newQuestions = [...prev.activeQuestions];
      newQuestions[prev.currentIndex] = replacement;

      // Clear any answer/hidden options for old question on this slot
      const updatedAnswers = { ...prev.selectedAnswers };
      delete updatedAnswers[currentQuestion.id];

      const updatedHidden = { ...prev.hiddenOptions };
      delete updatedHidden[currentQuestion.id];

      const updated = {
        ...prev,
        activeQuestions: newQuestions,
        swappedQuestionIds: [...prev.swappedQuestionIds, currentQuestion.id],
        usedLifelines: { ...prev.usedLifelines, swapChallenge: true },
        selectedAnswers: updatedAnswers,
        hiddenOptions: updatedHidden,
      };

      saveSessionToStorage(updated);
      return updated;
    });

    setIsSwapModalOpen(false);
  };

  // Lifeline: Ask AI
  const handleUseAskAi = () => {
    if (!currentQuestion || session.usedLifelines.askAi) return;

    sounds.playLifeline();
    onUpdateSession((prev) => {
      const updated = {
        ...prev,
        usedLifelines: { ...prev.usedLifelines, askAi: true },
      };
      saveSessionToStorage(updated);
      return updated;
    });

    setIsAiModalOpen(true);
  };

  // Navigation between questions
  const goToQuestion = (index: number) => {
    if (index >= 0 && index < session.activeQuestions.length) {
      sounds.playSelect();
      onUpdateSession((prev) => {
        const updated = { ...prev, currentIndex: index };
        saveSessionToStorage(updated);
        return updated;
      });
    }
  };

  // Keyboard shortcut listener for options (A-D, 1-4) and arrows
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (session.isSubmitted || isAiModalOpen || isSwapModalOpen || isSubmitModalOpen) return;
      if (!currentQuestion) return;

      const key = e.key.toUpperCase();
      let selectedOptIndex = -1;

      if (key === 'A' || key === '1') selectedOptIndex = 0;
      if (key === 'B' || key === '2') selectedOptIndex = 1;
      if (key === 'C' || key === '3') selectedOptIndex = 2;
      if (key === 'D' || key === '4') selectedOptIndex = 3;

      if (selectedOptIndex >= 0 && selectedOptIndex < currentQuestion.options.length) {
        const opt = currentQuestion.options[selectedOptIndex];
        if (!currentHiddenOptions.has(opt)) {
          handleSelectOption(opt);
        }
      }

      if (e.key === 'ArrowLeft') {
        goToQuestion(session.currentIndex - 1);
      }
      if (e.key === 'ArrowRight') {
        goToQuestion(session.currentIndex + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    session.currentIndex,
    session.activeQuestions,
    session.isSubmitted,
    isAiModalOpen,
    isSwapModalOpen,
    isSubmitModalOpen,
    currentQuestion,
    currentHiddenOptions,
  ]);

  const answeredCount = Object.keys(session.selectedAnswers).length;
  const totalQuestions = session.activeQuestions.length;
  const isTimeCritical = session.remainingSeconds < 120; // less than 2 minutes

  const difficultyColor = {
    easy: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    medium: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    hard: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
  }[difficulty];

  const optionLetters = ['A', 'B', 'C', 'D'];

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-5">
      {/* Top Banner: Anti-Cheat Sentinel & Timer telemetry */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
        {/* Anti-cheat banner */}
        <div className="flex items-center gap-2.5 text-xs font-mono">
          <div className="relative flex items-center justify-center w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/40 shrink-0">
            <ShieldAlert className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <div className="font-bold text-rose-300 uppercase tracking-wider flex items-center gap-2">
              <span>ACTIVE SENTINEL DEFENSE</span>
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
            </div>
            <p className="text-[11px] text-slate-400">
              Switching tabs or minimizing window triggers immediate auto-submission.
            </p>
          </div>
        </div>

        {/* 15-Minute Continuous Countdown Timer */}
        <div
          id="countdown-timer-display"
          className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl border font-mono transition-all ${
            isTimeCritical
              ? 'bg-rose-950/60 border-rose-500 text-rose-300 shadow-lg shadow-rose-500/20 animate-pulse'
              : 'bg-slate-950 border-cyan-500/40 text-cyan-300 shadow-inner'
          }`}
        >
          <Clock className={`w-4 h-4 ${isTimeCritical ? 'text-rose-400 animate-spin' : 'text-cyan-400'}`} />
          <div className="text-xs uppercase text-slate-400 font-semibold mr-1">REMAINING:</div>
          <span className="text-lg sm:text-xl font-extrabold tracking-wider">
            {formatTimeMMSS(session.remainingSeconds)}
          </span>
        </div>
      </div>

      {/* Lifeline Toolbar */}
      <LifelineToolbar
        lifelines={session.usedLifelines}
        onUseFiftyFifty={handleUseFiftyFifty}
        onUseSwapChallenge={() => setIsSwapModalOpen(true)}
        onUseAskAi={handleUseAskAi}
        isFiftyFiftyActiveOnCurrent={isFiftyFiftyActiveOnCurrent}
        disabled={session.isSubmitted || isSubmitting}
      />

      {/* Main Question Arena Card */}
      {currentQuestion && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-8 shadow-2xl backdrop-blur-md relative overflow-hidden">
          {/* Subtle Ambient Accent Glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl -z-10" />

          {/* Question Header & Meta */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-5 border-b border-slate-800/80">
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-cyan-400">
                QUESTION {String(session.currentIndex + 1).padStart(2, '0')} / {String(totalQuestions).padStart(2, '0')}
              </span>
              <span
                className={`text-[11px] font-mono font-bold uppercase px-2.5 py-0.5 rounded-full border ${difficultyColor}`}
              >
                {difficulty}
              </span>
            </div>

            <div className="text-xs font-mono text-slate-400">
              Score progress:{' '}
              <span className="text-slate-100 font-bold">{answeredCount} answered</span>
            </div>
          </div>

          {/* Question Content */}
          <div className="py-6 sm:py-8">
            <h2 className="text-lg sm:text-2xl font-bold text-slate-100 leading-relaxed font-sans">
              {currentQuestion.question}
            </h2>
          </div>

          {/* Options Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-8">
            {currentQuestion.options.map((option, idx) => {
              const letter = optionLetters[idx];
              const isSelected = session.selectedAnswers[currentQuestion.id] === option;
              const isEliminated = currentHiddenOptions.has(option);

              return (
                <button
                  key={idx}
                  id={`option-btn-${letter.toLowerCase()}`}
                  onClick={() => handleSelectOption(option)}
                  disabled={isEliminated || session.isSubmitted || isSubmitting}
                  className={`group relative flex items-start gap-3.5 p-4 sm:p-5 rounded-2xl text-left transition-all duration-150 ${
                    isEliminated
                      ? 'bg-slate-950/40 border border-slate-900 text-slate-700 cursor-not-allowed opacity-40'
                      : isSelected
                      ? 'bg-cyan-500/15 border-2 border-cyan-400 text-slate-50 shadow-lg shadow-cyan-500/20'
                      : 'bg-slate-950/70 border border-slate-800/90 text-slate-300 hover:border-cyan-500/50 hover:bg-slate-950/90 hover:text-slate-100 cursor-pointer'
                  }`}
                >
                  {/* Option Letter Badge */}
                  <span
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-mono font-bold shrink-0 transition-colors ${
                      isEliminated
                        ? 'bg-slate-900 text-slate-700 line-through'
                        : isSelected
                        ? 'bg-cyan-400 text-slate-950'
                        : 'bg-slate-800/90 text-slate-400 group-hover:text-cyan-300 group-hover:bg-slate-800'
                    }`}
                  >
                    {letter}
                  </span>

                  {/* Option Text */}
                  <div className="flex-1 pt-0.5">
                    <span
                      className={`text-sm sm:text-base leading-snug block ${
                        isEliminated ? 'line-through text-slate-700' : ''
                      }`}
                    >
                      {option}
                    </span>
                    {isEliminated && (
                      <span className="text-[10px] font-mono text-slate-600 block mt-1 uppercase">
                        [Eliminated by 50-50]
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Navigation Controls & Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800/80">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                id="prev-question-btn"
                onClick={() => goToQuestion(session.currentIndex - 1)}
                disabled={session.currentIndex === 0}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-mono font-semibold text-slate-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Prev</span>
              </button>

              <button
                id="next-question-btn"
                onClick={() => goToQuestion(session.currentIndex + 1)}
                disabled={session.currentIndex === totalQuestions - 1}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-mono font-semibold text-slate-200 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Final Submit Button */}
            <button
              id="finalize-submit-btn"
              onClick={() => {
                sounds.playSelect();
                setIsSubmitModalOpen(true);
              }}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-slate-950 font-mono text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Submit & Lock Score</span>
            </button>
          </div>
        </div>
      )}

      {/* Question Progress Map / Jump Grid */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80">
        <div className="flex items-center justify-between mb-3 text-xs font-mono text-slate-400">
          <span>MISSION PROGRESS MATRIX:</span>
          <span>{answeredCount} / {totalQuestions} Completed</span>
        </div>

        <div className="grid grid-cols-5 sm:grid-cols-15 gap-2">
          {session.activeQuestions.map((q, idx) => {
            const isAnswered = Boolean(session.selectedAnswers[q.id]);
            const isCurrent = session.currentIndex === idx;

            return (
              <button
                key={q.id}
                id={`jump-question-btn-${idx + 1}`}
                onClick={() => goToQuestion(idx)}
                title={`Question ${idx + 1} (${q.difficulty}) - ${isAnswered ? 'Answered' : 'Unanswered'}`}
                className={`h-9 rounded-lg font-mono text-xs font-bold transition-all flex items-center justify-center cursor-pointer ${
                  isCurrent
                    ? 'ring-2 ring-cyan-400 bg-cyan-500/30 text-cyan-200 shadow-md shadow-cyan-500/30'
                    : isAnswered
                    ? 'bg-cyan-950/60 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-900/60'
                    : 'bg-slate-950 border border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-300'
                }`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Ask AI Modal */}
      {currentQuestion && (
        <AskAiModal
          isOpen={isAiModalOpen}
          onClose={() => setIsAiModalOpen(false)}
          aiHint={currentQuestion.aiHint}
          questionIndex={session.currentIndex}
          difficulty={currentQuestion.difficulty}
        />
      )}

      {/* Swap Challenge Modal */}
      {currentQuestion && (
        <SwapModal
          isOpen={isSwapModalOpen}
          onClose={() => setIsSwapModalOpen(false)}
          onConfirm={handleExecuteSwap}
          difficulty={currentQuestion.difficulty || 'medium'}
          questionNumber={session.currentIndex + 1}
        />
      )}

      {/* Submit Confirmation Modal */}
      <SubmitConfirmModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onConfirm={() => {
          setIsSubmitModalOpen(false);
          onSubmitQuiz('completed');
        }}
        totalQuestions={totalQuestions}
        answeredCount={answeredCount}
        remainingSeconds={session.remainingSeconds}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};
