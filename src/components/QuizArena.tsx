import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  Bot,
  CheckCircle2,
  Bookmark,
  RefreshCw,
} from 'lucide-react';
import type { Question, QuestionOption, QuizSessionState, SubmissionStatus } from '../types';
import { LifelineToolbar } from './LifelineToolbar';
import { AskAiModal } from './AskAiModal';
import { SwapModal } from './SwapModal';
import { SubmitConfirmModal } from './SubmitConfirmModal';
import {
  formatTimeMMSS,
  calculateFiftyFiftyHiddenOptions,
  getSwapReplacement,
  saveSessionToStorage,
  extendSessionTime,
} from '../lib/quizEngine';
import { registerActiveParticipant, subscribeToTimeGrants } from '../lib/firebase';
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
  const [direction, setDirection] = useState<number>(1);
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());
  const [timeGrantNotification, setTimeGrantNotification] = useState<{
    minutes: number;
    timestamp: number;
  } | null>(null);
  const lastProcessedGrantRef = useRef<string | null>(null);

  const currentQuestion: Question | undefined = session.activeQuestions[session.currentIndex];
  const difficulty = currentQuestion?.difficulty || 'medium';

  // Toggle flag for review on current question
  const toggleFlagCurrentQuestion = () => {
    if (!currentQuestion) return;
    sounds.playSelect();
    setFlaggedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(currentQuestion.id)) {
        next.delete(currentQuestion.id);
      } else {
        next.add(currentQuestion.id);
      }
      return next;
    });
  };

  const isCurrentFlagged = currentQuestion ? flaggedQuestions.has(currentQuestion.id) : false;

  // Has 50-50 been used on this current question?
  const isFiftyFiftyActiveOnCurrent = Boolean(
    currentQuestion && session.hiddenOptions[currentQuestion.id]?.length
  );

  // Is Ask AI active on this current question?
  const isAskAiActiveOnCurrent = Boolean(
    currentQuestion && session.askAiQuestionId === currentQuestion.id
  );

  // Hidden options for current question
  const currentHiddenOptions = new Set(
    currentQuestion ? session.hiddenOptions[currentQuestion.id] || [] : []
  );

  // Register active participant & subscribe to real-time Admin Extra Time Grants
  useEffect(() => {
    if (!session.participantId || session.isSubmitted) return;

    // Register active participant in Firestore so Admin can view and grant time
    registerActiveParticipant(
      session.participantName,
      session.participantId,
      session.remainingSeconds
    ).catch((err) => {
      console.warn('Error registering active participant:', err);
    });

    // Real-time listener for Admin Time Grants on this participant's document
    const unsubscribe = subscribeToTimeGrants(
      session.participantId,
      (addedSeconds, grantId, addedMinutes) => {
        if (!addedSeconds || addedSeconds <= 0) return;

        // Prevent applying the same grant multiple times
        if (lastProcessedGrantRef.current === grantId) return;
        lastProcessedGrantRef.current = grantId;

        sounds.playSuccess();

        // Extend countdown timer dynamically in real-time
        onUpdateSession((prev) => {
          const updated = extendSessionTime(prev, addedSeconds, false);
          saveSessionToStorage(updated);
          return updated;
        });

        setTimeGrantNotification({
          minutes: addedMinutes || Math.round(addedSeconds / 60),
          timestamp: Date.now(),
        });
      }
    );

    return () => {
      unsubscribe();
    };
  }, [session.participantId, session.participantName, session.isSubmitted, onUpdateSession]);

  // Auto-dismiss time grant notification banner after 8 seconds
  useEffect(() => {
    if (!timeGrantNotification) return;
    const timer = setTimeout(() => {
      setTimeGrantNotification(null);
    }, 8000);
    return () => clearTimeout(timer);
  }, [timeGrantNotification]);

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

  // Handle Option Selection by Option ID
  const handleSelectOption = (optionId: string) => {
    if (!currentQuestion || session.isSubmitted) return;
    if (currentHiddenOptions.has(optionId)) return; // Option was eliminated by 50-50

    sounds.playSelect();
    onUpdateSession((prev) => {
      const updatedAnswers = {
        ...prev.selectedAnswers,
        [currentQuestion.id]: optionId,
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
    if (!currentQuestion) return;

    // If already used on THIS question, allow re-opening modal without penalty!
    if (session.usedLifelines.askAi && session.askAiQuestionId === currentQuestion.id) {
      sounds.playSelect();
      setIsAiModalOpen(true);
      return;
    }

    // If already used on ANOTHER question, do not allow
    if (session.usedLifelines.askAi) return;

    sounds.playLifeline();
    onUpdateSession((prev) => {
      const updated = {
        ...prev,
        usedLifelines: { ...prev.usedLifelines, askAi: true },
        askAiQuestionId: currentQuestion.id,
      };
      saveSessionToStorage(updated);
      return updated;
    });

    setIsAiModalOpen(true);
  };

  // Navigation between questions with transition direction
  const goToQuestion = (index: number) => {
    if (index >= 0 && index < session.activeQuestions.length) {
      sounds.playSelect();
      setDirection(index > session.currentIndex ? 1 : -1);
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
        if (!currentHiddenOptions.has(opt.id) && !currentHiddenOptions.has(opt.text)) {
          handleSelectOption(opt.id);
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
    easy: 'text-[#FFE853] bg-[#221E12] border-[#423A20]',
    medium: 'text-[#FFD000] bg-[#221E12] border-[#FFD000]',
    hard: 'text-[#E59500] bg-[#221E12] border-[#E59500]',
  }[difficulty];

  const optionLetters = ['A', 'B', 'C', 'D'];

  return (
    <div className="w-full h-full max-w-6xl mx-auto px-2 sm:px-4 md:px-6 py-2 flex flex-col justify-between overflow-hidden font-mono select-none">
      {/* Top Bar: Compact Meta (h-14) */}
      <div className="w-full bg-[#18160E] border-2 border-[#423A20] shadow-[3px_3px_0px_#000000] shrink-0">
        <div className="h-14 px-3 sm:px-5 flex items-center justify-between gap-2 sm:gap-4">
          {/* Left: Question Counter & Difficulty & Sentinel */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-baseline gap-1 font-mono">
              <span className="text-[10px] sm:text-xs text-[#A89F81] uppercase font-bold tracking-wider">Q:</span>
              <span className="text-base sm:text-lg font-extrabold text-[#FFE853] tabular-nums">
                {String(session.currentIndex + 1).padStart(2, '0')}
              </span>
              <span className="text-xs text-[#A89F81] font-bold">/ {String(totalQuestions).padStart(2, '0')}</span>
            </div>

            <span className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 border ${difficultyColor}`}>
              {difficulty}
            </span>

            {/* Sentinel Security Badge */}
            <div className="hidden lg:flex items-center gap-1.5 px-2 py-0.5 bg-[#221E12] border border-[#E59500] text-[#E59500] text-[10px] font-bold uppercase tracking-wider">
              <ShieldAlert className="w-3 h-3 text-[#E59500] animate-pulse" />
              <span>Sentinel Active</span>
            </div>
          </div>

          {/* Center: Tactical Lifelines */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* 50-50 Lifeline */}
            <button
              id="lifeline-fifty-fifty-btn"
              onClick={handleUseFiftyFifty}
              disabled={session.isSubmitted || isSubmitting || session.usedLifelines.fiftyFifty}
              title={
                session.usedLifelines.fiftyFifty
                  ? '50-50 already used in this session'
                  : 'Eliminate two incorrect answers'
              }
              className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 text-xs font-mono font-bold border transition-all ${
                session.usedLifelines.fiftyFifty
                  ? 'bg-[#0D0C07] border-[#423A20] text-[#A89F81]/40 cursor-not-allowed'
                  : isFiftyFiftyActiveOnCurrent
                  ? 'bg-[#FFD000] border-[#FFD000] text-[#0D0C07] shadow-[2px_2px_0px_#000000]'
                  : 'bg-[#221E12] border-[#423A20] hover:border-[#FFD000] text-[#FFF6D1] hover:text-[#FFD000] shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer'
              }`}
            >
              <span className="text-[10px] sm:text-xs">50%</span>
              <span className="hidden sm:inline text-[10px]">50-50</span>
              {session.usedLifelines.fiftyFifty && <span className="text-[9px] text-[#A89F81]">[USED]</span>}
            </button>

            {/* Swap Challenge Lifeline */}
            <button
              id="lifeline-swap-challenge-btn"
              onClick={() => setIsSwapModalOpen(true)}
              disabled={session.isSubmitted || isSubmitting || session.usedLifelines.swapChallenge}
              title={
                session.usedLifelines.swapChallenge
                  ? 'Swap challenge already used in this session'
                  : 'Replace current question with a fresh one'
              }
              className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 text-xs font-mono font-bold border transition-all ${
                session.usedLifelines.swapChallenge
                  ? 'bg-[#0D0C07] border-[#423A20] text-[#A89F81]/40 cursor-not-allowed'
                  : 'bg-[#221E12] border-[#423A20] hover:border-[#FFD000] text-[#FFF6D1] hover:text-[#FFD000] shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer'
              }`}
            >
              <RefreshCw className="w-3 h-3 text-[#E59500]" />
              <span className="hidden sm:inline text-[10px]">Swap</span>
              {session.usedLifelines.swapChallenge && <span className="text-[9px] text-[#A89F81]">[USED]</span>}
            </button>

            {/* Ask AI Lifeline */}
            {(() => {
              const isGloballyUsed = session.usedLifelines.askAi;
              const canViewHintOnCurrent = isGloballyUsed && isAskAiActiveOnCurrent;
              const isButtonDisabled =
                session.isSubmitted || isSubmitting || (isGloballyUsed && !isAskAiActiveOnCurrent);

              return (
                <button
                  id="lifeline-ask-ai-btn"
                  onClick={handleUseAskAi}
                  disabled={isButtonDisabled}
                  title={
                    canViewHintOnCurrent
                      ? 'Re-open and view AI Hint for this question'
                      : isGloballyUsed
                      ? 'Ask AI already used on another question'
                      : 'Consult AI neural co-pilot for a hint'
                  }
                  className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1 text-xs font-mono font-bold border transition-all ${
                    isButtonDisabled
                      ? 'bg-[#0D0C07] border-[#423A20] text-[#A89F81]/40 cursor-not-allowed'
                      : canViewHintOnCurrent
                      ? 'bg-[#FFD000] border-[#FFD000] text-[#0D0C07] shadow-[2px_2px_0px_#000000] cursor-pointer'
                      : 'bg-[#221E12] border-[#423A20] hover:border-[#FFD000] text-[#FFF6D1] hover:text-[#FFD000] shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer'
                  }`}
                >
                  <Bot className="w-3 h-3 text-[#FFE853]" />
                  <span className="hidden sm:inline text-[10px]">
                    {canViewHintOnCurrent ? 'Hint' : 'Ask AI'}
                  </span>
                  {isGloballyUsed && !canViewHintOnCurrent && (
                    <span className="text-[9px] text-[#A89F81]">[USED]</span>
                  )}
                </button>
              );
            })()}
          </div>

          {/* Right: Countdown Timer */}
          <div
            id="countdown-timer-display"
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 border-2 font-mono tabular-nums transition-all shrink-0 ${
              isTimeCritical
                ? 'bg-[#221E12] border-[#E59500] text-[#E59500] shadow-[2px_2px_0px_#000000] animate-pulse'
                : 'bg-[#0D0C07] border-[#FFD000] text-[#FFD000] shadow-[2px_2px_0px_#000000]'
            }`}
          >
            <Clock className={`w-3.5 h-3.5 ${isTimeCritical ? 'text-[#E59500] animate-spin' : 'text-[#FFD000]'}`} />
            <span className="text-sm sm:text-base font-extrabold tracking-wider text-[#FFE853] tabular-nums">
              {formatTimeMMSS(session.remainingSeconds)}
            </span>
          </div>
        </div>

        {/* Thin Linear Progress Bar */}
        <div className="w-full bg-[#0D0C07] h-1 border-t border-[#423A20] relative overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#E59500] to-[#FFD000] transition-all duration-300 ease-out"
            style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
          />
        </div>
      </div>

      {/* Real-time Admin Time Grant Alert Banner (Overlay/Toast strip) */}
      {timeGrantNotification && (
        <div
          id="admin-time-grant-banner"
          className="my-1.5 p-2 bg-[#18160E] border-2 border-[#FFD000] text-[#FFF6D1] flex items-center justify-between gap-2 shadow-[2px_2px_0px_#000000] animate-in slide-in-from-top-2 duration-200 shrink-0"
        >
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#FFD000] shrink-0" />
            <div className="text-xs font-mono">
              <span className="font-bold text-[#FFD000]">EXTRA TIME GRANTED: </span>
              <span className="text-[#FFE853] font-bold">+{timeGrantNotification.minutes} MIN</span>
            </div>
          </div>
          <button
            id="dismiss-time-grant-btn"
            onClick={() => setTimeGrantNotification(null)}
            className="text-[10px] font-mono px-2 py-0.5 bg-[#221E12] hover:bg-[#FFD000] text-[#FFD000] hover:text-[#0D0C07] border border-[#FFD000] cursor-pointer transition-all uppercase font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Center Stage: Question & Options Canvas (flex-1 flex flex-col justify-center min-h-0) */}
      {currentQuestion && (
        <div className="flex-1 min-h-0 flex flex-col justify-center py-1 sm:py-2 overflow-y-auto">
          <div className="w-full max-w-4xl mx-auto flex flex-col justify-center">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentQuestion.id}
                custom={direction}
                initial={{ x: direction > 0 ? 15 : -15, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: direction > 0 ? -15 : 15, opacity: 0 }}
                transition={{ duration: 0.12, ease: 'easeOut' }}
                className="w-full flex flex-col"
              >
                {/* Question Box */}
                <div className="bg-[#18160E] border-2 border-[#423A20] p-3.5 sm:p-5 shadow-[3px_3px_0px_#000000] mb-2 sm:mb-3">
                  <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-[#423A20] text-xs font-mono text-[#A89F81]">
                    <span className="uppercase text-[#FFD000] font-bold tracking-wider text-[11px]">
                      QUESTION {String(session.currentIndex + 1).padStart(2, '0')} OF {String(totalQuestions).padStart(2, '0')}
                    </span>
                    <span className="text-[11px] tabular-nums">{answeredCount} answered</span>
                  </div>
                  <h2 className="text-base sm:text-lg md:text-xl font-medium text-[#FFF6D1] leading-snug sm:leading-relaxed font-mono">
                    {currentQuestion.question}
                  </h2>
                </div>

                {/* AI Hint active banner (if unlocked for this question) */}
                {session.askAiQuestionId === currentQuestion.id && (
                  <div
                    id="active-ai-hint-banner"
                    className="mb-2 px-3 py-1.5 bg-[#221E12] border border-[#FFD000] flex items-center justify-between gap-2 shadow-[2px_2px_0px_#000000]"
                  >
                    <div className="flex items-center gap-2 text-xs font-mono text-[#FFD000]">
                      <Bot className="w-3.5 h-3.5 text-[#FFE853]" />
                      <span className="font-bold uppercase tracking-wider text-[10px] sm:text-xs">
                        AI Neural Hint Active
                      </span>
                    </div>
                    <button
                      id="reopen-ai-hint-card-btn"
                      onClick={() => {
                        sounds.playSelect();
                        setIsAiModalOpen(true);
                      }}
                      className="px-2 py-0.5 bg-[#FFD000] hover:bg-[#FFE853] text-[#0D0C07] font-mono text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer border border-[#FFD000]"
                    >
                      View Hint
                    </button>
                  </div>
                )}

                {/* Options Grid: Balanced 2x2 grid with compact internal padding */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
                  {currentQuestion.options.map((option, idx) => {
                    const letter = optionLetters[idx];
                    const isSelected =
                      session.selectedAnswers[currentQuestion.id] === option.id ||
                      session.selectedAnswers[currentQuestion.id] === option.text;
                    const isEliminated =
                      currentHiddenOptions.has(option.id) ||
                      currentHiddenOptions.has(option.text);

                    return (
                      <button
                        key={option.id}
                        id={`option-btn-${letter.toLowerCase()}`}
                        onClick={() => handleSelectOption(option.id)}
                        disabled={isEliminated || session.isSubmitted || isSubmitting}
                        className={`group relative flex items-center gap-2.5 sm:gap-3 py-2.5 sm:py-3 px-3 sm:px-4 rounded-none text-left transition-all duration-150 focus-visible:ring-2 focus-visible:ring-[#FFD000] focus:outline-none ${
                          isEliminated
                            ? 'bg-[#0D0C07] border-2 border-[#423A20] text-[#A89F81]/30 cursor-not-allowed opacity-40 shadow-none'
                            : isSelected
                            ? 'bg-[#FFD000] border-2 border-[#FFD000] text-[#0D0C07] shadow-[3px_3px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px]'
                            : 'bg-[#221E12] border-2 border-[#423A20] text-[#FFF6D1] hover:border-[#FFD000] hover:text-[#FFF6D1] shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer'
                        }`}
                      >
                        {/* Option Letter Badge */}
                        <span
                          className={`w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center text-xs font-mono font-bold shrink-0 border tabular-nums ${
                            isEliminated
                              ? 'bg-[#0D0C07] text-[#A89F81]/30 border-[#423A20] line-through'
                              : isSelected
                              ? 'bg-[#0D0C07] text-[#FFD000] border-[#0D0C07]'
                              : 'bg-[#0D0C07] text-[#FFF6D1] border-[#423A20] group-hover:text-[#FFD000] group-hover:border-[#FFD000]'
                          }`}
                        >
                          {letter}
                        </span>

                        {/* Option Text */}
                        <div className="flex-1 font-mono min-w-0">
                          <span
                            className={`text-xs sm:text-sm font-medium leading-snug block break-words ${
                              isEliminated ? 'line-through text-[#A89F81]/30' : ''
                            }`}
                          >
                            {option.text}
                          </span>
                          {isEliminated && (
                            <span className="text-[9px] font-mono text-[#A89F81]/60 block uppercase">
                              [Eliminated by 50-50]
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Bottom Bar: Action Controls (Pinned Footer) */}
      <div className="w-full bg-[#18160E] border-2 border-[#423A20] p-2 sm:p-2.5 shadow-[3px_3px_0px_#000000] shrink-0 font-mono">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          {/* Navigation & Review Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto justify-between sm:justify-start">
            {/* Previous Question Button */}
            <button
              id="prev-question-btn"
              onClick={() => goToQuestion(session.currentIndex - 1)}
              disabled={session.currentIndex === 0}
              className="px-3 sm:px-4 py-1.5 rounded-none bg-[#221E12] hover:bg-[#FFD000] hover:text-[#0D0C07] disabled:opacity-30 disabled:cursor-not-allowed text-xs font-mono font-bold text-[#FFF6D1] transition-all flex items-center justify-center gap-1 border-2 border-[#423A20] hover:border-[#FFD000] shadow-[2px_2px_0px_#000000] cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>Prev</span>
            </button>

            {/* Flag for Review Button */}
            <button
              id="flag-review-btn"
              onClick={toggleFlagCurrentQuestion}
              title="Flag this question to review later"
              className={`px-2.5 sm:px-3 py-1.5 rounded-none text-xs font-mono font-bold transition-all flex items-center gap-1.5 border-2 cursor-pointer ${
                isCurrentFlagged
                  ? 'bg-[#221E12] border-[#E59500] text-[#FFE853] shadow-[2px_2px_0px_#000000]'
                  : 'bg-[#221E12] border-[#423A20] hover:border-[#E59500] text-[#A89F81] hover:text-[#FFE853] shadow-[2px_2px_0px_#000000]'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${isCurrentFlagged ? 'fill-[#E59500] text-[#E59500]' : 'text-[#A89F81]'}`} />
              <span>{isCurrentFlagged ? 'Flagged' : 'Flag'}</span>
            </button>

            {/* Next Question Button */}
            <button
              id="next-question-btn"
              onClick={() => goToQuestion(session.currentIndex + 1)}
              disabled={session.currentIndex === totalQuestions - 1}
              className="px-3 sm:px-4 py-1.5 rounded-none bg-[#221E12] hover:bg-[#FFD000] hover:text-[#0D0C07] disabled:opacity-30 disabled:cursor-not-allowed text-xs font-mono font-bold text-[#FFF6D1] transition-all flex items-center justify-center gap-1 border-2 border-[#423A20] hover:border-[#FFD000] shadow-[2px_2px_0px_#000000] cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Center: Mission Progress Matrix (Question Jump Buttons 1-15) */}
          <div className="flex items-center gap-1 overflow-x-auto max-w-full py-0.5 px-1">
            {session.activeQuestions.map((q, idx) => {
              const isAnswered = Boolean(session.selectedAnswers[q.id]);
              const isCurrent = session.currentIndex === idx;
              const isFlagged = flaggedQuestions.has(q.id);

              return (
                <button
                  key={q.id}
                  id={`jump-question-btn-${idx + 1}`}
                  onClick={() => goToQuestion(idx)}
                  title={`Question ${idx + 1} (${q.difficulty}) - ${isAnswered ? 'Answered' : 'Unanswered'}${isFlagged ? ' [Flagged]' : ''}`}
                  className={`relative w-6 h-6 sm:w-7 sm:h-7 rounded-none font-mono text-[10px] sm:text-xs font-bold transition-all flex items-center justify-center cursor-pointer border ${
                    isCurrent
                      ? 'bg-[#FFD000] border-[#FFD000] text-[#0D0C07] shadow-[2px_2px_0px_#000000]'
                      : isAnswered
                      ? 'bg-[#221E12] border-[#FFD000] text-[#FFD000]'
                      : 'bg-[#0D0C07] border-[#423A20] text-[#A89F81] hover:border-[#FFD000] hover:text-[#FFF6D1]'
                  }`}
                >
                  {idx + 1}
                  {isFlagged && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#E59500] rounded-full ring-1 ring-[#0D0C07]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Final Submit & Lock Score Button */}
          <button
            id="finalize-submit-btn"
            onClick={() => {
              sounds.playSelect();
              setIsSubmitModalOpen(true);
            }}
            disabled={isSubmitting}
            className="w-full sm:w-auto px-4 sm:px-5 py-1.5 rounded-none bg-[#FFD000] hover:bg-[#FFE853] text-[#0D0C07] font-mono text-xs font-extrabold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border-2 border-[#FFD000] shadow-[3px_3px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer shrink-0"
          >
            <Send className="w-3 h-3" />
            <span>Submit Run</span>
          </button>
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
