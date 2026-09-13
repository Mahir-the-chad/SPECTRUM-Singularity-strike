import React, { useState } from 'react';
import { Clock, Plus, X, Zap, Sparkles, CheckCircle2, ShieldAlert } from 'lucide-react';
import type { Submission } from '../types';
import { sounds } from '../lib/audio';
import { formatTimeMMSS } from '../lib/quizEngine';

interface GrantTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  participant: Submission | null;
  onConfirmGrant: (minutes: number) => Promise<void>;
  isGranting: boolean;
}

export const GrantTimeModal: React.FC<GrantTimeModalProps> = ({
  isOpen,
  onClose,
  participant,
  onConfirmGrant,
  isGranting,
}) => {
  const [selectedMinutes, setSelectedMinutes] = useState<number>(2);
  const [customInput, setCustomInput] = useState<string>('2');

  if (!isOpen || !participant) return null;

  const quickOptions = [1, 2, 3, 5, 10, 15];

  const handleSelectQuick = (minutes: number) => {
    sounds.playSelect();
    setSelectedMinutes(minutes);
    setCustomInput(String(minutes));
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomInput(val);
    const parsed = parseInt(val, 10);
    if (!isNaN(parsed) && parsed > 0 && parsed <= 60) {
      setSelectedMinutes(parsed);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMinutes <= 0 || selectedMinutes > 60 || isGranting) return;
    await onConfirmGrant(selectedMinutes);
  };

  const currentRemaining = participant.remainingSeconds ?? 0;
  const newEstimatedRemaining = currentRemaining + selectedMinutes * 60;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-cyan-500/40 rounded-3xl shadow-2xl shadow-cyan-500/10 overflow-hidden font-mono">
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-950/90 border-b border-cyan-500/30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2">
                <span>ADMIN TIME OVERRIDE</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                  REAL-TIME
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">Dynamic countdown extension engine</p>
            </div>
          </div>
          <button
            id="close-grant-time-modal-btn"
            onClick={() => {
              sounds.playSelect();
              onClose();
            }}
            disabled={isGranting}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          {/* Target Participant Meta Card */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 uppercase">Target Participant</span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded border bg-cyan-500/10 border-cyan-500/30 text-cyan-300">
                {participant.submissionStatus.replace('_', ' ')}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="font-sans text-base font-bold text-slate-100">
                {participant.name}
              </div>
              <div className="text-xs font-mono font-bold text-cyan-400 px-2 py-1 rounded bg-slate-900 border border-slate-800">
                {participant.participantId}
              </div>
            </div>
            {currentRemaining > 0 && (
              <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-800/60 mt-1">
                <span>Current Banked Time:</span>
                <span className="font-bold text-slate-200">{formatTimeMMSS(currentRemaining)}</span>
              </div>
            )}
          </div>

          {/* Quick Selection Buttons */}
          <div className="flex flex-col gap-2">
            <label className="text-xs text-slate-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>Select Extension Duration</span>
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {quickOptions.map((mins) => {
                const isSelected = selectedMinutes === mins;
                return (
                  <button
                    key={mins}
                    type="button"
                    id={`quick-time-${mins}-btn`}
                    onClick={() => handleSelectQuick(mins)}
                    disabled={isGranting}
                    className={`py-2.5 px-2 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30 scale-105 border-2 border-cyan-300'
                        : 'bg-slate-800/90 text-slate-300 hover:bg-slate-750 hover:text-white border border-slate-700'
                    }`}
                  >
                    +{mins}m
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Duration Input */}
          <div className="flex flex-col gap-2">
            <label htmlFor="custom-minutes-input" className="text-xs text-slate-300 font-bold uppercase tracking-wider">
              Or Specify Custom Minutes (1 - 60):
            </label>
            <div className="relative">
              <input
                id="custom-minutes-input"
                type="number"
                min="1"
                max="60"
                value={customInput}
                onChange={handleCustomChange}
                disabled={isGranting}
                placeholder="e.g. 5"
                className="w-full bg-slate-950/90 border border-slate-700 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 rounded-xl px-4 py-2.5 text-sm text-slate-100 font-mono outline-none transition-all"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-mono pointer-events-none">
                minutes
              </span>
            </div>
          </div>

          {/* Telemetry Impact Preview */}
          <div className="p-3.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-xs text-cyan-200 flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 font-bold text-cyan-300">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Real-Time Timer Impact:</span>
            </div>
            <div className="text-[11px] text-slate-300 leading-relaxed font-sans">
              Adds <strong className="text-cyan-300 font-mono">+{selectedMinutes} minutes (+{selectedMinutes * 60} seconds)</strong> to the participant&apos;s live countdown. If they are in an active session, their ticker extends instantaneously without page refresh.
            </div>
            {currentRemaining > 0 && (
              <div className="text-[10px] text-cyan-400 font-mono pt-1">
                Estimated New Bank: {formatTimeMMSS(currentRemaining)} &rarr; {formatTimeMMSS(newEstimatedRemaining)}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              id="cancel-grant-time-btn"
              onClick={() => {
                sounds.playSelect();
                onClose();
              }}
              disabled={isGranting}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="confirm-grant-time-btn"
              disabled={isGranting || selectedMinutes <= 0}
              className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 active:scale-95 disabled:opacity-50 text-slate-950 text-xs font-bold uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-cyan-500/25 transition-all cursor-pointer"
            >
              {isGranting ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Synchronizing...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>Confirm &amp; Add +{selectedMinutes} Min</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
