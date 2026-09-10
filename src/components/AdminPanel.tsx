import React, { useState, useEffect, useMemo } from 'react';
import {
  Trophy,
  ShieldCheck,
  Lock,
  Search,
  Filter,
  Download,
  Clock,
  User,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ArrowUpDown,
  RefreshCw,
  LogOut,
  Zap,
  PlusCircle,
  BarChart3,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';
import type { Submission, SubmissionStatus } from '../types';
import { subscribeToSubmissions, saveSubmission, revokeDisqualification } from '../lib/firebase';
import { formatTimeMMSS } from '../lib/quizEngine';
import { sounds } from '../lib/audio';

interface AdminPanelProps {
  onBackToQuiz: () => void;
  onRevokeDisqualification?: (participantName: string) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onBackToQuiz, onRevokeDisqualification }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLive, setIsLive] = useState(false);
  const [streamNotice, setStreamNotice] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | SubmissionStatus>('all');
  const [isSeeding, setIsSeeding] = useState(false);
  const [revokingName, setRevokingName] = useState<string | null>(null);
  const [revokeToast, setRevokeToast] = useState<{ name: string; message: string } | null>(null);

  // Authenticate Admin
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() === 'admin' && password === 'pass@123') {
      sounds.playSelect();
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      sounds.playWarning();
      setAuthError('Invalid credentials. Access denied.');
    }
  };


  // Real-time Firestore Subscription
  useEffect(() => {
    if (!isAuthenticated) return;

    const unsubscribe = subscribeToSubmissions((data, liveStatus, notice) => {
      setSubmissions(data);
      setIsLive(liveStatus);
      if (notice) setStreamNotice(notice);
    });

    return () => unsubscribe();
  }, [isAuthenticated]);

  // Tie-Breaking Leaderboard Sorting Rule:
  // Primary sort: Highest number of correct answers (correctAnswers descending).
  // Secondary sort (Tie-breaker): Least time taken (timeTakenSeconds ascending).
  const sortedSubmissions = useMemo(() => {
    return [...submissions].sort((a, b) => {
      if (b.correctAnswers !== a.correctAnswers) {
        return b.correctAnswers - a.correctAnswers; // Descending
      }
      return a.timeTakenSeconds - b.timeTakenSeconds; // Ascending (less time is better)
    });
  }, [submissions]);

  // Filtered submissions
  const filteredSubmissions = useMemo(() => {
    return sortedSubmissions.filter((sub) => {
      const matchesSearch = sub.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || sub.submissionStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [sortedSubmissions, searchQuery, statusFilter]);

  // Quick stats
  const stats = useMemo(() => {
    const total = sortedSubmissions.length;
    if (total === 0) return { total: 0, avgCorrect: 0, avgTime: 0, tabSwitchedCount: 0 };

    const sumCorrect = sortedSubmissions.reduce((acc, curr) => acc + curr.correctAnswers, 0);
    const sumTime = sortedSubmissions.reduce((acc, curr) => acc + curr.timeTakenSeconds, 0);
    const tabSwitchedCount = sortedSubmissions.filter((s) => s.submissionStatus === 'tab_switched').length;

    return {
      total,
      avgCorrect: (sumCorrect / total).toFixed(1),
      avgTime: Math.round(sumTime / total),
      tabSwitchedCount,
    };
  }, [sortedSubmissions]);

  // Export CSV
  const handleExportCSV = () => {
    sounds.playSelect();
    const headers = ['Rank,Participant Name,Correct Answers,Total Attempted,Time Taken (MM:SS),Time Taken (Seconds),Submission Status,Submitted At'];
    const rows = sortedSubmissions.map((sub, index) => {
      const dateStr = sub.submittedAt instanceof Date ? sub.submittedAt.toISOString() : String(sub.submittedAt);
      return [
        index + 1,
        `"${sub.name.replace(/"/g, '""')}"`,
        sub.correctAnswers,
        sub.totalAttempted,
        formatTimeMMSS(sub.timeTakenSeconds),
        sub.timeTakenSeconds,
        sub.submissionStatus,
        `"${dateStr}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `singularity_strike_leaderboard_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Seed sample tournament records to Firestore
  const handleSeedDemoData = async () => {
    setIsSeeding(true);
    sounds.playSelect();
    const demoRecords: Array<Omit<Submission, 'id' | 'submittedAt'>> = [
      {
        name: 'Elena Rostova (CyberSec Lab)',
        correctAnswers: 15,
        totalAttempted: 15,
        timeTakenSeconds: 412,
        submissionStatus: 'completed',
      },
      {
        name: 'Kaelen Vance (ZeroDay Ops)',
        correctAnswers: 14,
        totalAttempted: 15,
        timeTakenSeconds: 388,
        submissionStatus: 'completed',
      },
      {
        name: 'Alex Chen (Systems Eng)',
        correctAnswers: 14,
        totalAttempted: 14,
        timeTakenSeconds: 520,
        submissionStatus: 'completed',
      },
      {
        name: 'Marcus Brody (HackerSpace)',
        correctAnswers: 11,
        totalAttempted: 15,
        timeTakenSeconds: 900,
        submissionStatus: 'time_expired',
      },
      {
        name: 'Devin Thorne (Suspicious Op)',
        correctAnswers: 8,
        totalAttempted: 10,
        timeTakenSeconds: 245,
        submissionStatus: 'tab_switched',
      },
    ];

    for (const record of demoRecords) {
      await saveSubmission(record);
    }
    setIsSeeding(false);
  };

  // Revoke tab-switch disqualification & allow participant timer to resume
  const handleRevokeDisqualification = async (sub: Submission) => {
    sounds.playSelect();
    const identifier = sub.name;
    setRevokingName(identifier);

    try {
      await revokeDisqualification(sub.id, sub.name);
      if (onRevokeDisqualification) {
        onRevokeDisqualification(sub.name);
      }

      // Update current displayed list immediately
      setSubmissions((prev) =>
        prev.map((s) =>
          (sub.id && s.id === sub.id) || s.name.toLowerCase() === sub.name.toLowerCase()
            ? { ...s, submissionStatus: 'reinstated' as SubmissionStatus }
            : s
        )
      );

      sounds.playLifeline();
      const bankedSeconds = sub.remainingSeconds ?? Math.max(0, 15 * 60 - sub.timeTakenSeconds);
      setRevokeToast({
        name: sub.name,
        message: `Disqualification revoked for "${sub.name}". Timer restored to resume with ${formatTimeMMSS(bankedSeconds)} remaining.`,
      });
      setTimeout(() => setRevokeToast(null), 6000);
    } catch (err: any) {
      console.error('Failed to revoke disqualification:', err);
    } finally {
      setRevokingName(null);
    }
  };

  // Login View
  if (!isAuthenticated) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-16">
        <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/5 rounded-full blur-2xl -z-10" />

          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 mx-auto mb-4">
            <Lock className="w-6 h-6" />
          </div>

          <h2 className="text-xl font-bold font-mono text-center text-slate-100 uppercase tracking-wider">
            Command Center Login
          </h2>
          <p className="text-xs text-slate-400 text-center mt-1 mb-6 font-mono">
            Restricted Admin Authorization (/admin)
          </p>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="block text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider">
                Admin Username
              </label>
              <input
                id="admin-username-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm font-mono focus:outline-none focus:border-cyan-400 transition-all"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="block text-xs font-mono font-semibold text-slate-300 uppercase tracking-wider">
                Security Passkey
              </label>
              <input
                id="admin-password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm font-mono focus:outline-none focus:border-cyan-400 transition-all"
              />
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-mono">
                {authError}
              </div>
            )}

            <button
              id="admin-login-btn"
              type="submit"
              className="w-full py-3.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono font-extrabold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Verify & Access Leaderboard</span>
            </button>


            <button
              type="button"
              onClick={onBackToQuiz}
              className="w-full text-center text-xs font-mono text-slate-500 hover:text-slate-300 transition-colors pt-2 block"
            >
              &larr; Return to Quiz Arena
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Authenticated Admin Dashboard
  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 flex flex-col gap-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-slate-900 border border-slate-800 shadow-xl">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-cyan-400">
              STRIKE OPERATIONS PANEL
            </span>
            <span className="flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              FIRESTORE LIVE
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 font-mono mt-1">
            Global Live Leaderboard
          </h1>
          <p className="text-xs text-slate-400 font-mono mt-0.5">
            Tie-Breaker Rule: Correct Answers (DESC) &rarr; Least Time Taken (ASC)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            id="admin-export-csv-btn"
            onClick={handleExportCSV}
            title="Download CSV Report"
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs font-semibold flex items-center gap-1.5 border border-slate-700 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            id="admin-seed-data-btn"
            onClick={handleSeedDemoData}
            disabled={isSeeding}
            title="Seed sample competition records"
            className="px-3.5 py-2 rounded-xl bg-cyan-950/70 hover:bg-cyan-900/70 text-cyan-300 font-mono text-xs font-semibold flex items-center gap-1.5 border border-cyan-500/30 transition-all cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>{isSeeding ? 'Seeding...' : 'Seed Sample Runs'}</span>
          </button>

          <button
            id="admin-logout-btn"
            onClick={() => {
              sounds.playSelect();
              setIsAuthenticated(false);
            }}
            className="px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-rose-950/40 text-slate-400 hover:text-rose-300 font-mono text-xs font-semibold flex items-center gap-1.5 border border-slate-800 hover:border-rose-500/30 transition-all cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Lock</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="text-[11px] font-mono text-slate-400 uppercase">Submissions</div>
          <div className="text-2xl font-extrabold font-mono text-slate-100 mt-1">
            {stats.total}
          </div>
          <div className="text-[10px] text-cyan-400 font-mono">Logged to Firestore</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="text-[11px] font-mono text-slate-400 uppercase">Avg Score</div>
          <div className="text-2xl font-extrabold font-mono text-slate-100 mt-1">
            {stats.avgCorrect} <span className="text-xs text-slate-500">/ 15</span>
          </div>
          <div className="text-[10px] text-emerald-400 font-mono">Benchmark Accuracy</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="text-[11px] font-mono text-slate-400 uppercase">Avg Elapsed</div>
          <div className="text-2xl font-extrabold font-mono text-slate-100 mt-1">
            {formatTimeMMSS(stats.avgTime)}
          </div>
          <div className="text-[10px] text-amber-400 font-mono">Average Completion</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
          <div className="text-[11px] font-mono text-slate-400 uppercase">Integrity Flags</div>
          <div className="text-2xl font-extrabold font-mono text-rose-400 mt-1">
            {stats.tabSwitchedCount}
          </div>
          <div className="text-[10px] text-rose-400/80 font-mono">Tab-Switch Penalties</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="admin-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs font-mono focus:outline-none focus:border-cyan-400"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="text-xs font-mono text-slate-500 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Status:
          </span>
          {(['all', 'completed', 'time_expired', 'tab_switched', 'reinstated'] as const).map((st) => (
            <button
              key={st}
              id={`filter-btn-${st}`}
              onClick={() => {
                sounds.playSelect();
                setStatusFilter(st);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono uppercase transition-colors whitespace-nowrap cursor-pointer ${
                statusFilter === st
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'bg-slate-950 text-slate-400 border border-slate-800 hover:text-slate-200'
              }`}
            >
              {st === 'all' ? 'All' : st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Revocation Alert Toast */}
      {revokeToast && (
        <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-mono flex items-center justify-between gap-3 shadow-lg shadow-emerald-500/5 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span className="font-semibold">{revokeToast.message}</span>
          </div>
          <button
            onClick={() => setRevokeToast(null)}
            className="text-emerald-400 hover:text-emerald-200 cursor-pointer font-bold px-2 py-1 rounded bg-emerald-500/20 text-xs"
          >
            DISMISS
          </button>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-bold uppercase tracking-wider">
                <th className="py-4 px-4 sm:px-6 w-20">Rank</th>
                <th className="py-4 px-4">Participant Name</th>
                <th className="py-4 px-4 text-center">Correct Answers</th>
                <th className="py-4 px-4 text-center">Total Attempted</th>
                <th className="py-4 px-4 text-center">Time Taken (MM:SS)</th>
                <th className="py-4 px-4 text-center">Submission Status</th>
                <th className="py-4 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 font-mono">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Trophy className="w-8 h-8 text-slate-600" />
                      <span>No submissions recorded yet matching filter criteria.</span>
                      <button
                        onClick={handleSeedDemoData}
                        className="mt-2 text-xs text-cyan-400 hover:underline cursor-pointer"
                      >
                        + Click to seed sample submissions
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredSubmissions.map((sub, index) => {
                  const rank = index + 1;
                  const isGold = rank === 1;
                  const isSilver = rank === 2;
                  const isBronze = rank === 3;

                  const statusBadges = {
                    completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
                    time_expired: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
                    tab_switched: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
                    reinstated: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/40',
                  }[sub.submissionStatus] || 'bg-slate-800 text-slate-400 border-slate-700';

                  return (
                    <tr
                      key={sub.id || index}
                      className={`hover:bg-slate-850/50 transition-colors ${
                        isGold ? 'bg-amber-500/[0.03]' : ''
                      }`}
                    >
                      {/* Rank */}
                      <td className="py-4 px-4 sm:px-6 font-bold">
                        {isGold ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs">
                            <Trophy className="w-3 h-3 text-amber-400" /> #1
                          </span>
                        ) : isSilver ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-300/20 text-slate-200 border border-slate-300/40 text-xs">
                            #2
                          </span>
                        ) : isBronze ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-700/20 text-amber-500 border border-amber-700/40 text-xs">
                            #3
                          </span>
                        ) : (
                          <span className="text-slate-400 px-2">#{rank}</span>
                        )}
                      </td>

                      {/* Participant Name */}
                      <td className="py-4 px-4 font-semibold text-slate-100">
                        <div className="flex items-center gap-2 font-sans text-sm">
                          <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs font-mono text-cyan-400 border border-slate-700">
                            {sub.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-slate-100">{sub.name}</span>
                        </div>
                      </td>

                      {/* Correct Answers */}
                      <td className="py-4 px-4 text-center">
                        <span className="inline-block px-3 py-1 rounded-lg bg-slate-950 font-bold text-slate-100 text-sm border border-slate-800">
                          <span className="text-cyan-400">{sub.correctAnswers}</span>
                          <span className="text-slate-500 text-xs"> / 15</span>
                        </span>
                      </td>

                      {/* Total Attempted */}
                      <td className="py-4 px-4 text-center text-slate-300">
                        {sub.totalAttempted} / 15
                      </td>

                      {/* Time Taken (MM:SS) */}
                      <td className="py-4 px-4 text-center font-bold text-slate-200">
                        <span className="px-2.5 py-1 rounded-md bg-slate-950 border border-slate-800">
                          {formatTimeMMSS(sub.timeTakenSeconds)}
                        </span>
                      </td>

                      {/* Submission Status */}
                      <td className="py-4 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${statusBadges}`}
                        >
                          {sub.submissionStatus === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                          {sub.submissionStatus === 'time_expired' && <Clock className="w-3 h-3" />}
                          {sub.submissionStatus === 'tab_switched' && <ShieldAlert className="w-3 h-3" />}
                          {sub.submissionStatus === 'reinstated' && <CheckCircle2 className="w-3 h-3" />}
                          <span>{sub.submissionStatus.replace('_', ' ')}</span>
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-4 px-4 text-center">
                        {sub.submissionStatus === 'tab_switched' ? (
                          <button
                            id={`revoke-btn-${sub.id || index}`}
                            onClick={() => handleRevokeDisqualification(sub)}
                            disabled={revokingName === sub.name}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 active:scale-95 text-slate-950 font-mono font-bold text-[11px] uppercase tracking-wider transition-all shadow-md shadow-emerald-500/25 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                            title="Revoke disqualification & resume operative timer from where they left off"
                          >
                            <RotateCcw className={`w-3.5 h-3.5 ${revokingName === sub.name ? 'animate-spin' : ''}`} />
                            <span>Revoke Disqualification</span>
                          </button>
                        ) : sub.submissionStatus === 'reinstated' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-mono font-semibold">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Reinstated
                          </span>
                        ) : (
                          <span className="text-slate-600 text-xs font-mono">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
