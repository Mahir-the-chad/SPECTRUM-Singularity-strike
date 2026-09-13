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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#0D0C07]/90 font-mono animate-in fade-in duration-150"
    >
      <div
        id="leaderboard-modal-container"
        className="relative w-full max-w-3xl max-h-[90vh] flex flex-col bg-[#18160E] border-2 border-[#FFD000] shadow-[6px_6px_0px_#000000] overflow-hidden font-mono"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b-2 border-[#423A20] flex items-center justify-between bg-[#221E12]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#FFD000] text-[#0D0C07] font-bold">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-mono text-base sm:text-lg font-bold uppercase tracking-wider text-[#FFF6D1]">
                  Global Live Leaderboard
                </h3>
                {isLive && (
                  <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 bg-[#0D0C07] text-[#FFE853] border border-[#FFD000] font-bold">
                    <span className="w-1.5 h-1.5 bg-[#FFD000] animate-pulse" />
                    LIVE
                  </span>
                )}
              </div>
              <p className="text-xs text-[#A89F81] font-mono mt-0.5">
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
            className="p-2 text-[#A89F81] hover:text-[#0D0C07] hover:bg-[#FFD000] border border-transparent hover:border-[#FFD000] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tie-breaker rule explanation */}
        <div className="px-5 py-2.5 bg-[#0D0C07] border-b-2 border-[#423A20] text-[11px] font-mono text-[#A89F81] flex items-center gap-2">
          <Award className="w-3.5 h-3.5 text-[#FFD000] shrink-0" />
          <span>
            Ranked by <strong className="text-[#FFD000]">Highest Score</strong>. Ties broken by <strong className="text-[#FFE853]">Least Time Taken</strong>.
          </span>
        </div>

        {/* Leaderboard Table / Scrollable */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5">
          {sorted.length === 0 ? (
            <div className="py-16 text-center text-[#A89F81] font-mono text-xs flex flex-col items-center gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-[#FFD000]" />
              <span>Awaiting verified competition submissions...</span>
            </div>
          ) : (
            <div className="overflow-x-auto border-2 border-[#423A20]">
              <table className="w-full text-left text-xs font-mono">
                <thead className="bg-[#221E12] text-[#A89F81] uppercase text-[11px] tracking-wider border-b-2 border-[#423A20]">
                  <tr>
                    <th className="py-3 px-3 sm:px-4 text-center w-12">Rank</th>
                    <th className="py-3 px-3 sm:px-4">Participant</th>
                    <th className="py-3 px-3 sm:px-4">ID</th>
                    <th className="py-3 px-3 sm:px-4 text-right">Score</th>
                    <th className="py-3 px-3 sm:px-4 text-right">Time</th>
                    <th className="py-3 px-3 sm:px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#423A20] bg-[#18160E]">
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
                            ? 'bg-[#221E12] border-l-4 border-[#FFD000]'
                            : 'hover:bg-[#221E12]/60'
                        }`}
                      >
                        {/* Rank */}
                        <td className="py-3 px-3 sm:px-4 text-center">
                          {rank === 1 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 bg-[#FFD000] text-[#0D0C07] font-bold border border-[#FFD000]">
                              1
                            </span>
                          ) : rank === 2 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 bg-[#FFE853] text-[#0D0C07] font-bold border border-[#FFE853]">
                              2
                            </span>
                          ) : rank === 3 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 bg-[#E59500] text-[#0D0C07] font-bold border border-[#E59500]">
                              3
                            </span>
                          ) : (
                            <span className="text-[#A89F81] font-mono font-bold">#{rank}</span>
                          )}
                        </td>

                        {/* Name */}
                        <td className="py-3 px-3 sm:px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#FFF6D1]">
                              {item.name}
                            </span>
                            {isSelf && (
                              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-[#FFD000] text-[#0D0C07] font-bold">
                                You
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Participant ID */}
                        <td className="py-3 px-3 sm:px-4 text-[#A89F81] font-mono">
                          {item.participantId || 'N/A'}
                        </td>

                        {/* Score */}
                        <td className="py-3 px-3 sm:px-4 text-right">
                          <span className="text-[#FFD000] font-bold font-mono">
                            {item.correctAnswers}
                          </span>
                          <span className="text-[#A89F81] text-[10px]"> / 20</span>
                        </td>

                        {/* Time Taken */}
                        <td className="py-3 px-3 sm:px-4 text-right text-[#FFF6D1] font-mono">
                          {formatTimeMMSS(item.timeTakenSeconds)}
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3 sm:px-4 text-center">
                          {isDisqualified ? (
                            <span className="px-2 py-0.5 text-[10px] font-mono uppercase bg-[#221E12] text-[#E59500] border border-[#E59500] font-bold">
                              DQ
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[10px] font-mono uppercase bg-[#0D0C07] text-[#FFD000] border border-[#FFD000] font-bold">
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
        <div className="p-3 sm:p-4 border-t-2 border-[#423A20] flex items-center justify-between bg-[#221E12]">
          <span className="text-[11px] font-mono text-[#A89F81]">
            Total verified entries: <strong className="text-[#FFD000]">{sorted.length}</strong>
          </span>
          <button
            id="close-leaderboard-btn"
            onClick={() => {
              sounds.playSelect();
              onClose();
            }}
            className="px-5 py-2 rounded-none bg-[#FFD000] hover:bg-[#FFE853] text-[#0D0C07] font-mono text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer border-2 border-[#FFD000] shadow-[3px_3px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
          >
            Close Leaderboard
          </button>
        </div>
      </div>
    </div>
  );
};
