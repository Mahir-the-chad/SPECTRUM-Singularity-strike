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
  Plus,
  Trash2,
} from 'lucide-react';
import type { Submission, SubmissionStatus } from '../types';
import {
  subscribeToSubmissions,
  saveSubmission,
  revokeDisqualification,
  grantExtraTime,
  deleteSubmission,
} from '../lib/firebase';
import { formatTimeMMSS } from '../lib/quizEngine';
import { sounds } from '../lib/audio';
import { GrantTimeModal } from './GrantTimeModal';
import { DeleteUserModal } from './DeleteUserModal';

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
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'reinstated' | 'completed' | 'disqualified' | 'time_expired'>('all');
  const [isSeeding, setIsSeeding] = useState(false);
  const [revokingName, setRevokingName] = useState<string | null>(null);
  const [revokeToast, setRevokeToast] = useState<{ name: string; message: string } | null>(null);

  // Extra time granting states
  const [timeGrantTarget, setTimeGrantTarget] = useState<Submission | null>(null);
  const [isGrantingTime, setIsGrantingTime] = useState(false);
  const [grantTimeToast, setGrantTimeToast] = useState<{ name: string; message: string } | null>(null);

  // Delete user states
  const [userToDelete, setUserToDelete] = useState<Submission | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [deleteToast, setDeleteToast] = useState<{ name: string; message: string } | null>(null);

  // Authenticate Admin
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() === 'Admin' && password === 'SpectrumSS@1234') {
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
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        sub.name.toLowerCase().includes(q) ||
        (sub.participantId && sub.participantId.toLowerCase().includes(q));

      const isSubDisqualified =
        (sub.submissionStatus === 'disqualified' ||
          sub.submissionStatus === 'tab_switched' ||
          sub.isDisqualified === true) &&
        sub.submissionStatus !== 'reinstated';

      let matchesStatus = false;
      if (statusFilter === 'all') {
        matchesStatus = true;
      } else if (statusFilter === 'disqualified') {
        matchesStatus = isSubDisqualified;
      } else {
        matchesStatus = sub.submissionStatus === statusFilter;
      }

      return matchesSearch && matchesStatus;
    });
  }, [sortedSubmissions, searchQuery, statusFilter]);

  // Quick stats
  const stats = useMemo(() => {
    const total = sortedSubmissions.length;
    if (total === 0) return { total: 0, avgCorrect: 0, avgTime: 0, tabSwitchedCount: 0 };

    const sumCorrect = sortedSubmissions.reduce((acc, curr) => acc + curr.correctAnswers, 0);
    const sumTime = sortedSubmissions.reduce((acc, curr) => acc + curr.timeTakenSeconds, 0);
    const tabSwitchedCount = sortedSubmissions.filter(
      (s) =>
        (s.submissionStatus === 'disqualified' ||
          s.submissionStatus === 'tab_switched' ||
          s.isDisqualified === true) &&
        s.submissionStatus !== 'reinstated'
    ).length;

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
    const headers = ['Rank,Participant Name,Participant ID,Correct Answers,Total Attempted,Time Taken (MM:SS),Time Taken (Seconds),Submission Status,Submitted At'];
    const rows = sortedSubmissions.map((sub, index) => {
      const dateStr = sub.submittedAt instanceof Date ? sub.submittedAt.toISOString() : String(sub.submittedAt);
      return [
        index + 1,
        `"${sub.name.replace(/"/g, '""')}"`,
        `"${(sub.participantId || '').replace(/"/g, '""')}"`,
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
        name: 'Elena Rostova',
        participantId: 'SPEC-501',
        correctAnswers: 19,
        totalAttempted: 20,
        timeTakenSeconds: 512,
        submissionStatus: 'completed',
      },
      {
        name: 'Kaelen Vance',
        participantId: 'SPEC-502',
        correctAnswers: 18,
        totalAttempted: 20,
        timeTakenSeconds: 488,
        submissionStatus: 'completed',
      },
      {
        name: 'Alex Chen',
        participantId: 'SPEC-503',
        correctAnswers: 17,
        totalAttempted: 20,
        timeTakenSeconds: 620,
        submissionStatus: 'completed',
      },
      {
        name: 'Marcus Brody',
        participantId: 'SPEC-504',
        correctAnswers: 14,
        totalAttempted: 20,
        timeTakenSeconds: 900,
        submissionStatus: 'time_expired',
      },
      {
        name: 'Devin Thorne',
        participantId: 'SPEC-505',
        correctAnswers: 10,
        totalAttempted: 12,
        timeTakenSeconds: 310,
        submissionStatus: 'tab_switched',
      },
      {
        name: 'Siddharth Rao',
        participantId: 'SPEC-506',
        correctAnswers: 7,
        totalAttempted: 9,
        timeTakenSeconds: 240,
        remainingSeconds: 660,
        submissionStatus: 'active',
      },
    ];

    for (const record of demoRecords) {
      await saveSubmission(record);
    }
    setIsSeeding(false);
  };

  // Revoke tab-switch or policy disqualification & allow participant to re-enter or resume
  const handleRevokeDisqualification = async (sub: Submission) => {
    sounds.playSelect();
    const identifier = sub.participantId || sub.name;
    setRevokingName(identifier);

    try {
      await revokeDisqualification(sub.id, sub.name, sub.participantId);
      if (onRevokeDisqualification) {
        onRevokeDisqualification(sub.name);
      }

      // Update current displayed list immediately
      setSubmissions((prev) =>
        prev.map((s) =>
          (sub.id && s.id === sub.id) ||
          (sub.participantId && s.participantId === sub.participantId) ||
          s.name.toLowerCase() === sub.name.toLowerCase()
            ? { ...s, submissionStatus: 'reinstated' as SubmissionStatus, isDisqualified: false }
            : s
        )
      );

      sounds.playLifeline();
      setRevokeToast({
        name: sub.name,
        message: `Disqualification revoked for "${sub.name}" (${sub.participantId || 'N/A'}). Status reset in Firestore: participant can now re-enter or resume.`,
      });
      setTimeout(() => setRevokeToast(null), 6000);
    } catch (err: any) {
      console.error('Failed to revoke disqualification:', err);
    } finally {
      setRevokingName(null);
    }
  };

  // Grant extra time to active or reinstated participant
  const handleConfirmGrantTime = async (minutes: number) => {
    if (!timeGrantTarget) return;

    setIsGrantingTime(true);
    sounds.playSelect();

    try {
      const target = timeGrantTarget;
      const result = await grantExtraTime(
        target.participantId,
        target.name,
        minutes
      );

      sounds.playLifeline();
      const addedSec = minutes * 60;

      // Update current displayed list immediately
      setSubmissions((prev) =>
        prev.map((s) => {
          const match =
            (target.id && s.id === target.id) ||
            (target.participantId && s.participantId === target.participantId) ||
            s.name.toLowerCase() === target.name.toLowerCase();

          if (match) {
            return {
              ...s,
              remainingSeconds: (s.remainingSeconds || 0) + addedSec,
              submissionStatus: s.submissionStatus === 'time_expired' ? 'reinstated' : s.submissionStatus,
              lastTimeGrantMinutes: minutes,
            };
          }
          return s;
        })
      );

      setGrantTimeToast({
        name: target.name,
        message: `Successfully added +${minutes} min (+${addedSec}s) to ${target.name} (${target.participantId || 'N/A'}). Countdown dynamically extended in Firestore!`,
      });
      setTimeout(() => setGrantTimeToast(null), 7000);
      setTimeGrantTarget(null);
    } catch (err: any) {
      console.error('Failed to grant extra time:', err);
      alert('Failed to grant extra time: ' + err?.message);
    } finally {
      setIsGrantingTime(false);
    }
  };

  // Permanently delete participant user from Firestore & Leaderboard
  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;

    setIsDeletingUser(true);
    sounds.playSelect();

    const target = userToDelete;
    try {
      await deleteSubmission(target.id, target.name, target.participantId);

      // Immediately remove from local state
      setSubmissions((prev) =>
        prev.filter((s) => {
          if (target.id && s.id === target.id) return false;
          if (target.participantId && target.participantId !== 'N/A' && s.participantId?.toLowerCase() === target.participantId.toLowerCase()) return false;
          if (target.name && s.name.toLowerCase() === target.name.toLowerCase()) return false;
          return true;
        })
      );

      sounds.playWarning();
      setDeleteToast({
        name: target.name,
        message: `Participant "${target.name}" (${target.participantId || 'N/A'}) was permanently deleted from Firestore and leaderboard.`,
      });
      setTimeout(() => setDeleteToast(null), 6000);
      setUserToDelete(null);
    } catch (err: any) {
      console.error('Failed to delete participant:', err);
      alert('Failed to delete participant: ' + err?.message);
    } finally {
      setIsDeletingUser(false);
    }
  };

  // Login View
  if (!isAuthenticated) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-16">
        <div className="bg-[#18160E] border-2 border-[#423A20] p-6 sm:p-8 shadow-[6px_6px_0px_#000000] relative overflow-hidden font-mono">
          <div className="flex items-center justify-center w-12 h-12 bg-[#221E12] border-2 border-[#FFD000] text-[#FFD000] mx-auto mb-4 shadow-[3px_3px_0px_#000000]">
            <Lock className="w-6 h-6" />
          </div>

          <h2 className="text-xl font-bold font-mono text-center text-[#FFF6D1] uppercase tracking-wider">
            Command Center Login
          </h2>
          <p className="text-xs text-[#A89F81] text-center mt-1 mb-6 font-mono">
            Restricted Admin Authorization (/admin)
          </p>

          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="block text-xs font-mono font-bold text-[#A89F81] uppercase tracking-wider">
                Admin Username
              </label>
              <input
                id="admin-username-input"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-[#0D0C07] border-2 border-[#423A20] text-[#FFF6D1] text-sm font-mono focus:outline-none focus:border-[#FFD000] transition-colors rounded-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="block text-xs font-mono font-bold text-[#A89F81] uppercase tracking-wider">
                Security Passkey
              </label>
              <input
                id="admin-password-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-[#0D0C07] border-2 border-[#423A20] text-[#FFF6D1] text-sm font-mono focus:outline-none focus:border-[#FFD000] transition-colors rounded-none"
              />
            </div>

            {authError && (
              <div className="p-3 bg-[#221E12] border-2 border-[#E59500] text-[#E59500] text-xs font-mono shadow-[2px_2px_0px_#000000]">
                {authError}
              </div>
            )}

            <button
              id="admin-login-btn"
              type="submit"
              className="w-full py-3.5 px-4 bg-[#FFD000] hover:bg-[#FFE853] text-[#0D0C07] font-mono font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 border-2 border-[#FFD000] shadow-[4px_4px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none cursor-pointer rounded-none"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Verify & Access Leaderboard</span>
            </button>

            <button
              type="button"
              onClick={onBackToQuiz}
              className="w-full text-center text-xs font-mono text-[#A89F81] hover:text-[#FFD000] transition-colors pt-2 block cursor-pointer"
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-[#18160E] border-2 border-[#423A20] shadow-[4px_4px_0px_#000000]">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#FFD000]">
              STRIKE OPERATIONS PANEL
            </span>
            <span className="flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 bg-[#221E12] text-[#FFE853] border border-[#FFD000]">
              <span className="w-1.5 h-1.5 bg-[#FFD000] animate-ping" />
              FIRESTORE LIVE
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#FFF6D1] font-mono mt-1 uppercase tracking-wide">
            Global Live Leaderboard
          </h1>
          <p className="text-xs text-[#A89F81] font-mono mt-0.5">
            Tie-Breaker Rule: Correct Answers (DESC) &rarr; Least Time Taken (ASC)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            id="admin-export-csv-btn"
            onClick={handleExportCSV}
            title="Download CSV Report"
            className="px-3.5 py-2 bg-[#221E12] hover:bg-[#2A2416] text-[#FFF6D1] font-mono text-xs font-bold uppercase flex items-center gap-1.5 border-2 border-[#423A20] hover:border-[#FFD000] transition-all cursor-pointer shadow-[3px_3px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
          >
            <Download className="w-3.5 h-3.5 text-[#FFD000]" />
            <span>Export CSV</span>
          </button>

          <button
            id="admin-seed-data-btn"
            onClick={handleSeedDemoData}
            disabled={isSeeding}
            title="Seed sample competition records"
            className="px-3.5 py-2 bg-[#221E12] hover:bg-[#2A2416] text-[#FFD000] font-mono text-xs font-bold uppercase flex items-center gap-1.5 border-2 border-[#FFD000] transition-all cursor-pointer shadow-[3px_3px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none disabled:opacity-50"
          >
            <PlusCircle className="w-3.5 h-3.5 text-[#FFE853]" />
            <span>{isSeeding ? 'Seeding...' : 'Seed Sample Runs'}</span>
          </button>

          <button
            id="admin-logout-btn"
            onClick={() => {
              sounds.playSelect();
              setIsAuthenticated(false);
            }}
            className="px-3.5 py-2 bg-[#0D0C07] hover:bg-[#221E12] text-[#A89F81] hover:text-[#FFF6D1] font-mono text-xs font-bold uppercase flex items-center gap-1.5 border-2 border-[#423A20] hover:border-[#E59500] transition-all cursor-pointer shadow-[3px_3px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
          >
            <LogOut className="w-3.5 h-3.5 text-[#E59500]" />
            <span>Lock</span>
          </button>
        </div>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="p-4 bg-[#18160E] border-2 border-[#423A20] shadow-[3px_3px_0px_#000000]">
          <div className="text-[11px] font-mono text-[#A89F81] uppercase font-bold">Submissions</div>
          <div className="text-2xl font-extrabold font-mono text-[#FFF6D1] mt-1">
            {stats.total}
          </div>
          <div className="text-[10px] text-[#FFD000] font-mono">Logged to Firestore</div>
        </div>

        <div className="p-4 bg-[#18160E] border-2 border-[#423A20] shadow-[3px_3px_0px_#000000]">
          <div className="text-[11px] font-mono text-[#A89F81] uppercase font-bold">Avg Score</div>
          <div className="text-2xl font-extrabold font-mono text-[#FFD000] mt-1">
            {stats.avgCorrect} <span className="text-xs text-[#A89F81]">/ 15</span>
          </div>
          <div className="text-[10px] text-[#FFE853] font-mono">Benchmark Accuracy</div>
        </div>

        <div className="p-4 bg-[#18160E] border-2 border-[#423A20] shadow-[3px_3px_0px_#000000]">
          <div className="text-[11px] font-mono text-[#A89F81] uppercase font-bold">Avg Elapsed</div>
          <div className="text-2xl font-extrabold font-mono text-[#FFF6D1] mt-1">
            {formatTimeMMSS(stats.avgTime)}
          </div>
          <div className="text-[10px] text-[#A89F81] font-mono">Average Completion</div>
        </div>

        <div className="p-4 bg-[#18160E] border-2 border-[#423A20] shadow-[3px_3px_0px_#000000]">
          <div className="text-[11px] font-mono text-[#A89F81] uppercase font-bold">Integrity Flags</div>
          <div className="text-2xl font-extrabold font-mono text-[#E59500] mt-1">
            {stats.tabSwitchedCount}
          </div>
          <div className="text-[10px] text-[#E59500]/80 font-mono">Tab-Switch Penalties</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-3.5 bg-[#18160E] border-2 border-[#423A20] shadow-[3px_3px_0px_#000000]">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#A89F81] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="admin-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#0D0C07] border-2 border-[#423A20] text-[#FFF6D1] text-xs font-mono focus:outline-none focus:border-[#FFD000] rounded-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="text-xs font-mono text-[#A89F81] mr-1 flex items-center gap-1 font-bold">
            <Filter className="w-3 h-3 text-[#FFD000]" /> Status:
          </span>
          {(['all', 'active', 'reinstated', 'completed', 'disqualified', 'time_expired'] as const).map((st) => (
            <button
              key={st}
              id={`filter-btn-${st}`}
              onClick={() => {
                sounds.playSelect();
                setStatusFilter(st);
              }}
              className={`px-3 py-1.5 text-xs font-mono uppercase transition-colors whitespace-nowrap cursor-pointer rounded-none ${
                statusFilter === st
                  ? 'bg-[#FFD000] text-[#0D0C07] border-2 border-[#FFD000] font-black shadow-[2px_2px_0px_#000000]'
                  : 'bg-[#0D0C07] text-[#A89F81] border-2 border-[#423A20] hover:text-[#FFF6D1] hover:border-[#FFD000] font-bold'
              }`}
            >
              {st === 'all' ? 'All' : st === 'disqualified' ? 'Disqualified' : st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Revocation Alert Toast */}
      {revokeToast && (
        <div className="p-4 bg-[#18160E] border-2 border-[#FFD000] text-[#FFF6D1] text-xs font-mono flex items-center justify-between gap-3 shadow-[4px_4px_0px_#000000] animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-[#FFD000] shrink-0" />
            <span className="font-semibold">{revokeToast.message}</span>
          </div>
          <button
            onClick={() => setRevokeToast(null)}
            className="text-[#0D0C07] bg-[#FFD000] hover:bg-[#FFE853] cursor-pointer font-bold px-2.5 py-1 text-xs uppercase border border-[#FFD000]"
          >
            DISMISS
          </button>
        </div>
      )}

      {/* Grant Time Alert Toast */}
      {grantTimeToast && (
        <div className="p-4 bg-[#18160E] border-2 border-[#FFD000] text-[#FFF6D1] text-xs font-mono flex items-center justify-between gap-3 shadow-[4px_4px_0px_#000000] animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <Clock className="w-5 h-5 text-[#FFD000] shrink-0" />
            <span className="font-semibold">{grantTimeToast.message}</span>
          </div>
          <button
            onClick={() => setGrantTimeToast(null)}
            className="text-[#0D0C07] bg-[#FFD000] hover:bg-[#FFE853] cursor-pointer font-bold px-2.5 py-1 text-xs uppercase border border-[#FFD000]"
          >
            DISMISS
          </button>
        </div>
      )}

      {/* Delete User Alert Toast */}
      {deleteToast && (
        <div className="p-4 bg-[#18160E] border-2 border-[#E59500] text-[#FFF6D1] text-xs font-mono flex items-center justify-between gap-3 shadow-[4px_4px_0px_#000000] animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <Trash2 className="w-5 h-5 text-[#E59500] shrink-0" />
            <span className="font-semibold">{deleteToast.message}</span>
          </div>
          <button
            onClick={() => setDeleteToast(null)}
            className="text-[#0D0C07] bg-[#E59500] hover:bg-[#FFD000] cursor-pointer font-bold px-2.5 py-1 text-xs uppercase border border-[#E59500]"
          >
            DISMISS
          </button>
        </div>
      )}

      {/* Leaderboard Table */}
      <div className="bg-[#18160E] border-2 border-[#423A20] shadow-[4px_4px_0px_#000000] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b-2 border-[#423A20] bg-[#221E12] text-[#A89F81] font-bold uppercase tracking-wider">
                <th className="py-4 px-4 sm:px-6 w-16">Rank</th>
                <th className="py-4 px-4">Participant Name</th>
                <th className="py-4 px-4">Participant ID</th>
                <th className="py-4 px-4 text-center">Correct Answers</th>
                <th className="py-4 px-4 text-center">Total Attempted</th>
                <th className="py-4 px-4 text-center">Time Taken (MM:SS)</th>
                <th className="py-4 px-4 text-center">Submission Status</th>
                <th className="py-4 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-[#423A20]">
              {filteredSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#A89F81] font-mono">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Trophy className="w-8 h-8 text-[#423A20]" />
                      <span>No submissions recorded yet matching filter criteria.</span>
                      <button
                        onClick={handleSeedDemoData}
                        className="mt-2 text-xs text-[#FFD000] hover:underline cursor-pointer font-bold uppercase"
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

                  const isDisqualified =
                    (sub.submissionStatus === 'disqualified' ||
                      sub.submissionStatus === 'tab_switched' ||
                      sub.isDisqualified === true) &&
                    sub.submissionStatus !== 'reinstated';

                  const statusBadges = {
                    active: 'bg-[#221E12] text-[#FFE853] border-[#FFD000] animate-pulse',
                    completed: 'bg-[#221E12] text-[#FFD000] border-[#FFD000]',
                    time_expired: 'bg-[#221E12] text-[#E59500] border-[#E59500]',
                    tab_switched: 'bg-[#221E12] text-[#E59500] border-[#E59500]',
                    disqualified: 'bg-[#221E12] text-[#E59500] border-[#E59500]',
                    reinstated: 'bg-[#221E12] text-[#FFE853] border-[#FFE853]',
                  }[sub.submissionStatus] ||
                    (isDisqualified
                      ? 'bg-[#221E12] text-[#E59500] border-[#E59500]'
                      : 'bg-[#221E12] text-[#A89F81] border-[#423A20]');

                  return (
                    <tr
                      key={sub.id || index}
                      className={`hover:bg-[#221E12]/60 transition-colors ${
                        isGold ? 'bg-[#FFD000]/[0.05]' : ''
                      }`}
                    >
                      {/* Rank */}
                      <td className="py-4 px-4 sm:px-6 font-bold">
                        {isGold ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FFD000] text-[#0D0C07] font-bold border border-[#FFD000] text-xs shadow-[2px_2px_0px_#000000]">
                            <Trophy className="w-3 h-3 text-[#0D0C07]" /> #1
                          </span>
                        ) : isSilver ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#221E12] text-[#FFF6D1] border border-[#FFD000] text-xs shadow-[2px_2px_0px_#000000]">
                            #2
                          </span>
                        ) : isBronze ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#221E12] text-[#E59500] border border-[#E59500] text-xs shadow-[2px_2px_0px_#000000]">
                            #3
                          </span>
                        ) : (
                          <span className="text-[#A89F81] px-2 font-mono">#{rank}</span>
                        )}
                      </td>

                      {/* Participant Name */}
                      <td className="py-4 px-4 font-bold text-[#FFF6D1]">
                        <div className="flex items-center gap-2 font-mono text-sm">
                          <div className="w-6 h-6 bg-[#221E12] border border-[#423A20] flex items-center justify-center text-xs font-mono text-[#FFD000]">
                            {sub.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-bold text-[#FFF6D1]">{sub.name}</span>
                        </div>
                      </td>

                      {/* Participant ID */}
                      <td className="py-4 px-4 font-mono text-xs">
                        <span className="px-2.5 py-1 bg-[#0D0C07] border border-[#423A20] text-[#FFD000] font-bold">
                          {sub.participantId || 'N/A'}
                        </span>
                      </td>

                      {/* Correct Answers */}
                      <td className="py-4 px-4 text-center">
                        <span className="inline-block px-3 py-1 bg-[#0D0C07] font-bold text-[#FFF6D1] text-sm border border-[#423A20]">
                          <span className="text-[#FFD000]">{sub.correctAnswers}</span>
                          <span className="text-[#A89F81] text-xs"> / 20</span>
                        </span>
                      </td>

                      {/* Total Attempted */}
                      <td className="py-4 px-4 text-center text-[#A89F81] font-bold">
                        {sub.totalAttempted} / 20
                      </td>

                      {/* Time Taken (MM:SS) */}
                      <td className="py-4 px-4 text-center font-bold text-[#FFF6D1]">
                        <span className="px-2.5 py-1 bg-[#0D0C07] border border-[#423A20]">
                          {formatTimeMMSS(sub.timeTakenSeconds)}
                        </span>
                      </td>

                      {/* Submission Status */}
                      <td className="py-4 px-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-bold uppercase border ${statusBadges}`}
                        >
                          {sub.submissionStatus === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                          {sub.submissionStatus === 'time_expired' && <Clock className="w-3 h-3" />}
                          {isDisqualified && <ShieldAlert className="w-3 h-3" />}
                          {sub.submissionStatus === 'reinstated' && <CheckCircle2 className="w-3 h-3" />}
                          <span>
                            {sub.submissionStatus === 'tab_switched'
                              ? 'Tab Switched'
                              : isDisqualified
                              ? 'Disqualified'
                              : sub.submissionStatus.replace('_', ' ')}
                          </span>
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {isDisqualified ? (
                            <button
                              id={`revoke-btn-${sub.id || index}`}
                              onClick={() => handleRevokeDisqualification(sub)}
                              disabled={revokingName === (sub.participantId || sub.name)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FFD000] hover:bg-[#FFE853] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none text-[#0D0C07] font-mono font-bold text-[11px] uppercase tracking-wider transition-all border-2 border-[#FFD000] shadow-[2px_2px_0px_#000000] cursor-pointer disabled:opacity-50 whitespace-nowrap"
                              title="Revoke disqualification & reset status in Firestore"
                            >
                              <RotateCcw className={`w-3.5 h-3.5 ${revokingName === (sub.participantId || sub.name) ? 'animate-spin' : ''}`} />
                              <span>Revoke</span>
                            </button>
                          ) : sub.submissionStatus === 'reinstated' ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-[#FFD000] font-mono font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Reinstated
                            </span>
                          ) : null}

                          {/* Add Time action button for active, reinstated, or expired participants */}
                          {(sub.submissionStatus === 'active' ||
                            sub.submissionStatus === 'reinstated' ||
                            sub.submissionStatus === 'time_expired') && (
                            <button
                              id={`add-time-btn-${sub.id || index}`}
                              onClick={() => {
                                sounds.playSelect();
                                setTimeGrantTarget(sub);
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[#221E12] hover:bg-[#2A2416] text-[#FFD000] border-2 border-[#FFD000] hover:border-[#FFE853] font-mono font-bold text-[11px] uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                              title={`Grant extra countdown time to ${sub.name}`}
                            >
                              <Clock className="w-3.5 h-3.5 text-[#FFD000]" />
                              <span>+ Add Time</span>
                            </button>
                          )}

                          {/* Delete User action button */}
                          <button
                            id={`delete-user-btn-${sub.id || index}`}
                            onClick={() => {
                              sounds.playSelect();
                              setUserToDelete(sub);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#221E12] hover:bg-[#2A2416] text-[#E59500] hover:text-[#FFF6D1] border-2 border-[#423A20] hover:border-[#E59500] font-mono font-bold text-[11px] uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap shadow-[2px_2px_0px_#000000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
                            title={`Permanently delete ${sub.name} from database`}
                          >
                            <Trash2 className="w-3.5 h-3.5 text-[#E59500]" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grant Extra Time Modal */}
      <GrantTimeModal
        isOpen={!!timeGrantTarget}
        onClose={() => setTimeGrantTarget(null)}
        participant={timeGrantTarget}
        onConfirmGrant={handleConfirmGrantTime}
        isGranting={isGrantingTime}
      />

      {/* Delete User Confirmation Modal */}
      <DeleteUserModal
        isOpen={!!userToDelete}
        onClose={() => setUserToDelete(null)}
        participant={userToDelete}
        onConfirmDelete={handleConfirmDeleteUser}
        isDeleting={isDeletingUser}
      />
    </div>
  );
};
