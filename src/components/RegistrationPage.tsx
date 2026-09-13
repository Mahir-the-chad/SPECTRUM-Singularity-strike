import React, { useState, useEffect } from 'react';
import { ShieldCheck, ShieldAlert, User, Hash, ArrowRight, ArrowLeft, RefreshCw, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { sounds } from '../lib/audio';
import { checkParticipantDisqualification, subscribeToReinstatement } from '../lib/firebase';

interface RegistrationPageProps {
  onCompleteRegistration: (participantName: string, participantId: string) => void;
  onBackToLanding: () => void;
  initialName?: string;
  initialParticipantId?: string;
}

export const RegistrationPage: React.FC<RegistrationPageProps> = ({
  onCompleteRegistration,
  onBackToLanding,
  initialName = '',
  initialParticipantId = '',
}) => {
  const [name, setName] = useState(initialName || '');
  const [participantId, setParticipantId] = useState(initialParticipantId || '');
  const [error, setError] = useState('');
  const [disqualificationWarning, setDisqualificationWarning] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [reinstatementNotice, setReinstatementNotice] = useState(false);

  // Subscribe to real-time reinstatement if a participant ID has an active warning
  useEffect(() => {
    if (!participantId.trim() || !disqualificationWarning) return;

    const unsub = subscribeToReinstatement(participantId.trim(), () => {
      setDisqualificationWarning('');
      setReinstatementNotice(true);
      sounds.playLifeline();
    });

    return () => unsub();
  }, [participantId, disqualificationWarning]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter your Participant Name.');
      setDisqualificationWarning('');
      sounds.playWarning();
      return;
    }
    if (!participantId.trim()) {
      setError('Please enter your Participant ID.');
      setDisqualificationWarning('');
      sounds.playWarning();
      return;
    }

    setError('');
    setDisqualificationWarning('');
    setReinstatementNotice(false);
    setIsChecking(true);

    try {
      // Strictly enforce disqualification locking by querying Firestore submissions collection
      const disqResult = await checkParticipantDisqualification(participantId.trim());

      if (disqResult.isDisqualified) {
        sounds.playWarning();
        setDisqualificationWarning(
          'Your account has been disqualified due to a tab-switch or policy violation. Please contact an admin to revoke your disqualification.'
        );
        setIsChecking(false);
        return;
      }

      setIsChecking(false);
      sounds.playSelect();
      onCompleteRegistration(name.trim(), participantId.trim());
    } catch (err) {
      console.warn('Disqualification check error, proceeding:', err);
      setIsChecking(false);
      sounds.playSelect();
      onCompleteRegistration(name.trim(), participantId.trim());
    }
  };

  const handleRecheckDisqualification = async () => {
    if (!participantId.trim()) return;
    setIsChecking(true);
    setError('');
    const disqResult = await checkParticipantDisqualification(participantId.trim());
    setIsChecking(false);

    if (disqResult.isDisqualified) {
      sounds.playWarning();
      setDisqualificationWarning(
        'Your account has been disqualified due to a tab-switch or policy violation. Please contact an admin to revoke your disqualification.'
      );
    } else {
      sounds.playLifeline();
      setDisqualificationWarning('');
      setReinstatementNotice(true);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto px-4 py-8 sm:py-12 flex flex-col gap-6 h-auto overflow-visible">
      {/* Back Button */}
      <button
        id="reg-back-btn"
        type="button"
        onClick={() => {
          sounds.playSelect();
          onBackToLanding();
        }}
        className="self-start flex items-center gap-2 text-xs font-mono text-slate-400 hover:text-cyan-300 transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Main Terminal</span>
      </button>

      {/* Header */}
      <div className="text-center flex flex-col items-center gap-2">
        <h2 className="text-2xl sm:text-3xl font-bold font-mono text-slate-100 uppercase tracking-wide">
          Participant Registration
        </h2>
        <p className="text-xs sm:text-sm text-slate-400">
          Enter your official credentials for Singularity Strike - Round 1
        </p>
      </div>

      {/* Registration Card */}
      <div className="p-6 sm:p-8 rounded-2xl border border-cyan-500/30 bg-slate-900/60 backdrop-blur-md shadow-2xl flex flex-col gap-6">
        {/* On-Screen Disqualification Warning Banner */}
        {disqualificationWarning && (
          <div
            id="disqualification-warning-alert"
            className="p-4 rounded-xl bg-rose-950/80 border-2 border-rose-500/80 text-rose-200 flex flex-col gap-3 shadow-lg shadow-rose-950/50"
          >
            <div className="flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5 animate-pulse" />
              <div className="flex flex-col gap-1">
                <span className="font-bold uppercase tracking-wider text-rose-300 text-xs font-mono">
                  SECURITY CLEARANCE REVOKED
                </span>
                <p className="text-slate-100 text-xs sm:text-sm leading-relaxed font-sans">
                  {disqualificationWarning}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-t border-rose-500/30 pt-2.5 mt-1 gap-2 text-[11px] font-mono text-rose-300/80">
              <span>
                Locked Participant ID: <strong className="text-white uppercase font-mono">{participantId}</strong>
              </span>
              <button
                type="button"
                onClick={handleRecheckDisqualification}
                disabled={isChecking}
                className="inline-flex items-center justify-center gap-1 px-3 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 text-xs font-mono font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin' : ''}`} />
                <span>Re-check Clearance</span>
              </button>
            </div>
          </div>
        )}

        {/* Real-time Reinstatement Success Banner */}
        {reinstatementNotice && !disqualificationWarning && (
          <div
            id="reinstatement-success-alert"
            className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/60 text-emerald-200 flex items-start gap-3 text-xs sm:text-sm font-mono shadow-lg shadow-emerald-950/30"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex flex-col gap-0.5">
              <span className="font-bold text-emerald-300 uppercase tracking-wider text-xs">
                CLEARANCE RESTORED
              </span>
              <p className="text-slate-200 text-xs font-sans">
                Your disqualification has been revoked by an admin. You may now start or resume your quiz.
              </p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Field 1: Participant Name */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="reg-name-input"
              className="flex items-center gap-2 text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider"
            >
              <User className="w-3.5 h-3.5 text-cyan-400" />
              <span>Participant Name</span>
            </label>
            <input
              id="reg-name-input"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              placeholder="Enter your full name"
              className="w-full px-4 py-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm font-mono focus:outline-none focus:border-cyan-400 transition-all"
            />
          </div>

          {/* Field 2: Participant ID */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor="reg-id-input"
              className="flex items-center gap-2 text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider"
            >
              <Hash className="w-3.5 h-3.5 text-cyan-400" />
              <span>Participant ID</span>
            </label>
            <input
              id="reg-id-input"
              type="text"
              value={participantId}
              onChange={(e) => {
                setParticipantId(e.target.value);
                if (error) setError('');
                if (disqualificationWarning) setDisqualificationWarning('');
              }}
              placeholder="e.g., SPEC101"
              className="w-full px-4 py-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm font-mono focus:outline-none focus:border-cyan-400 transition-all uppercase"
            />
            <span className="text-[11px] text-slate-500 font-mono">
              Official assigned competition ID or registration number
            </span>
          </div>

          {/* Validation Error Message */}
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Start Button redirecting to Rules Page */}
          <button
            id="reg-submit-btn"
            type="submit"
            disabled={isChecking}
            className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-400 hover:from-cyan-400 hover:to-sky-300 text-slate-950 font-mono font-extrabold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 cursor-pointer mt-2 active:scale-95 disabled:opacity-50"
          >
            {isChecking ? (
              <>
                <RefreshCw className="w-5 h-5 text-slate-950 animate-spin" />
                <span>Verifying Credentials & Clearance...</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-5 h-5 text-slate-950" />
                <span>Start</span>
                <ArrowRight className="w-4 h-4 text-slate-950" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
