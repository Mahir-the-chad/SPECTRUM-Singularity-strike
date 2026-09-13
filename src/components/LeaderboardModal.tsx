import React, { useState, useEffect, useMemo } from 'react';
import { Trophy, X, Clock, Award, User, RefreshCw, Hash } from 'lucide-react';
import type { Submission } from '../types';
import { subscribeToSubmissions, getLocalFallbackSubmissions } from '../lib/firebase';
import { formatTimeMMSS } from '../lib/quizEngine';
import { sounds } from '../lib/audio';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentParticipantId?: string;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({
  isOpen,
  onClose,
  currentParticipantId,
}) => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const initial = getLocalFallbackSubmissions();
    if (initial.length > 0) {
      setSubmissions(initial);
    }

    const unsubscribe = subscribeToSubmissions((items, live) => {
      setSubmissions(items);
      setIsLive(live);
    });

    return () => unsubscribe();
  }, [isOpen]);

  // Tie-breaking sorting rule:
  // Primary: Highest Correct Answers (descending)
  // Secondary (Tie-breaker): Least Time Taken (ascending)
  const sorted = useMemo(() => {
    return [...submissions].sort((a, b) => {
      if (b.correctAnswers !== a.correctAnswers) {
        return b.correctAnswers - a.correctAnswers;
      }
      return a.timeTakenSeconds - b.timeTakenSeconds;
    });
  }, [submissions]);

  if (!isOpen) return null;

  return (
    <div
      id="leaderboard-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div
        id="leaderboard-modal-container"
        className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-slate-900 border border-cyan-500/40 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-mono text-base sm:text-lg font-bold uppercase tracking-wider text-slate-100">
                  Global Live Leaderboard
                </h3>
                {isLive && (
                  <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Singularity Strike &bull; Spectrum 5.0 Arena
              </p>
            </div>
          </div>

          <button
            id="close-leaderboard-top-btn"
            onClick={() => {
              sounds.playSelect();
              onClose();
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tie-breaker rule explanation */}
        <div className="px-5 py-2.5 bg-slate-950/40 border-b border-slate-800/80 text-[11px] font-mono text-slate-400 flex items-center gap-2">
          <Award className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span>
            Ranked by <strong className="text-slate-200">Highest Score</strong>. Ties broken by <strong className="text-slate-200">Least Time Taken</strong>.
          </span>
        </div>

        {/* Leaderboard Table / Scrollable */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5">
          {sorted.length === 0 ? (
            <div className="py-16 text-center text-slate-500 font-mono text-xs flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-slate-600" />
              <span>Awaiting verified competition submissions...</span>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-slate-950 text-slate-400 uppercase text-[11px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-3 sm:px-4 text-center w-12">Rank</th>
                    <th className="py-3 px-3 sm:px-4">Participant</th>
                    <th className="py-3 px-3 sm:px-4">ID</th>
                    <th className="py-3 px-3 sm:px-4 text-right">Score</th>
                    <th className="py-3 px-3 sm:px-4 text-right">Time</th>
                    <th className="py-3 px-3 sm:px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                  {sorted.map((item, index) => {
                    const rank = index + 1;
                    const isSelf = currentParticipantId && item.participantId?.toUpperCase() === currentParticipantId.toUpperCase();
                    const isDisqualified =
                      (item.submissionStatus === 'disqualified' ||
                        item.submissionStatus === 'tab_switched' ||
                        item.isDisqualified === true) &&
                      item.submissionStatus !== 'reinstated';

                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors ${
                          isSelf
                            ? 'bg-cyan-500/15 border-l-2 border-cyan-400'
                            : 'hover:bg-slate-800/40'
                        }`}
                      >
                        {/* Rank */}
                        <td className="py-3 px-3 sm:px-4 text-center">
                          {rank === 1 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40">
                              1
                            </span>
                          ) : rank === 2 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-300/20 text-slate-200 font-bold border border-slate-400/40">
                              2
                            </span>
                          ) : rank === 3 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700/20 text-amber-500 font-bold border border-amber-700/40">
                              3
                            </span>
                          ) : (
                            <span className="text-slate-400 font-mono">{rank}</span>
                          )}
                        </td>

                        {/* Name */}
                        <td className="py-3 px-3 sm:px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-100">
                              {item.name}
                            </span>
                            {isSelf && (
                              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                                You
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Participant ID */}
                        <td className="py-3 px-3 sm:px-4 text-slate-400 font-mono">
                          {item.participantId || 'N/A'}
                        </td>

                        {/* Score */}
                        <td className="py-3 px-3 sm:px-4 text-right">
                          <span className="text-cyan-400 font-bold font-mono">
                            {item.correctAnswers}
                          </span>
                          <span className="text-slate-500 text-[10px]"> / 20</span>
                        </td>

                        {/* Time Taken */}
                        <td className="py-3 px-3 sm:px-4 text-right text-slate-300 font-mono">
                          {formatTimeMMSS(item.timeTakenSeconds)}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3 sm:px-4 text-center">
                          {isDisqualified ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-rose-500/20 text-rose-300 border border-rose-500/40">
                              DQ
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                              Ranked
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-800 flex items-center justify-between bg-slate-950/70">
          <span className="text-[11px] font-mono text-slate-400">
            Total verified entries: <strong className="text-slate-200">{sorted.length}</strong>
          </span>
          <button
            id="close-leaderboard-btn"
            onClick={() => {
              sounds.playSelect();
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer border border-slate-700"
          >
            Close Leaderboard
          </button>
        </div>
      </div>
    </div>
  );
};
