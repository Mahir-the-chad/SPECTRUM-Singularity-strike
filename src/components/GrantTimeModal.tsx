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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0D0C07]/90 font-mono animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-[#18160E] border-2 border-[#FFD000] shadow-[6px_6px_0px_#000000] overflow-hidden font-mono">
        {/* Terminal Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#221E12] border-b-2 border-[#423A20]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#FFD000] text-[#0D0C07] flex items-center justify-center font-bold">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-[#FFF6D1] flex items-center gap-2">
                <span>ADMIN TIME OVERRIDE</span>
                <span className="text-[10px] px-2 py-0.5 bg-[#0D0C07] text-[#FFE853] border border-[#FFD000] font-bold">
                  REAL-TIME
                </span>
              </h3>
              <p className="text-[11px] text-[#A89F81]">Dynamic countdown extension engine</p>
            </div>
          </div>
          <button
            id="close-grant-time-modal-btn"
            onClick={() => {
              sounds.playSelect();
              onClose();
            }}
            disabled={isGranting}
            className="p-1 text-[#A89F81] hover:text-[#0D0C07] hover:bg-[#FFD000] border border-transparent hover:border-[#FFD000] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
          {/* Target Participant Meta Card */}
          <div className="p-4 bg-[#0D0C07] border-2 border-[#423A20] flex flex-col gap-2 shadow-inner">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#A89F81] uppercase font-bold">Target Participant</span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 bg-[#221E12] border border-[#FFD000] text-[#FFD000]">
                {participant.submissionStatus.replace('_', ' ')}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="font-mono text-base font-bold text-[#FFF6D1]">
                {participant.name}
              </div>
              <div className="text-xs font-mono font-bold text-[#FFD000] px-2 py-1 bg-[#221E12] border border-[#423A20]">
                {participant.participantId}
              </div>
            </div>
            {currentRemaining > 0 && (
              <div className="text-[11px] text-[#A89F81] flex items-center justify-between pt-1 border-t border-[#423A20] mt-1">
                <span>Current Banked Time:</span>
                <span className="font-bold text-[#FFE853]">{formatTimeMMSS(currentRemaining)}</span>
              </div>
            )}
          </div>

          {/* Quick Selection Buttons */}
          <div className="flex flex-col gap-2">
            <label className="text-xs text-[#FFF6D1] font-bold uppercase tracking-wider flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#FFD000]" />
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
                    className={`py-2.5 px-2 rounded-none text-xs font-bold font-mono transition-all cursor-pointer border-2 ${
                      isSelected
                        ? 'bg-[#FFD000] text-[#0D0C07] border-[#FFD000] shadow-[2px_2px_0px_#000000]'
                        : 'bg-[#221E12] text-[#FFF6D1] hover:border-[#FFD000] hover:text-[#FFD000] border-[#423A20]'
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
            <label htmlFor="custom-minutes-input" className="text-xs text-[#FFF6D1] font-bold uppercase tracking-wider">
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
                className="w-full bg-[#0D0C07] border-2 border-[#423A20] focus:border-[#FFD000] rounded-none px-4 py-2.5 text-sm text-[#FFF6D1] font-mono outline-none transition-all shadow-inner"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[#A89F81] font-mono pointer-events-none">
                minutes
              </span>
            </div>
          </div>

          {/* Telemetry Impact Preview */}
          <div className="p-3.5 bg-[#221E12] border-2 border-[#423A20] text-xs text-[#FFF6D1] flex flex-col gap-1.5 shadow-inner">
            <div className="flex items-center gap-1.5 font-bold text-[#FFD000]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Real-Time Timer Impact:</span>
            </div>
            <div className="text-[11px] text-[#A89F81] leading-relaxed font-mono">
              Adds <strong className="text-[#FFD000] font-mono">+{selectedMinutes} minutes (+{selectedMinutes * 60} seconds)</strong> to the participant&apos;s live countdown. If they are in an active session, their ticker extends instantaneously without page refresh.
            </div>
            {currentRemaining > 0 && (
              <div className="text-[10px] text-[#FFE853] font-mono pt-1">
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
              className="px-4 py-2.5 rounded-none bg-[#221E12] hover:border-[#FFD000] text-[#FFF6D1] border-2 border-[#423A20] text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="confirm-grant-time-btn"
              disabled={isGranting || selectedMinutes <= 0}
              className="px-5 py-2.5 rounded-none bg-[#FFD000] hover:bg-[#FFE853] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-50 text-[#0D0C07] text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-2 border-[#FFD000] shadow-[3px_3px_0px_#000000] transition-all cursor-pointer"
            >
              {isGranting ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#0D0C07] border-t-transparent rounded-full animate-spin" />
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
