import React from 'react';
import {
  Activity,
  AlertTriangle,
  Ban,
  Bell,
  BookOpen,
  CheckCircle2,
  Download,
  Edit3,
  FileText,
  Gamepad2,
  KeyRound,
  Lock,
  LogOut,
  Palette,
  Plus,
  Radio,
  Save,
  Search,
  Send,
  Shield,
  Sliders,
  Trash2,
  Trophy,
  Unlock,
  Users,
  Wrench,
  X,
  XCircle,
} from 'lucide-react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
} from 'firebase/firestore';
import { db, isFirebaseConfigured, stripUndefined } from '../lib/firebase.ts';
import {
  broadcastLocalSync,
  DEFAULT_SAKAR_RIDDLES,
  readServerlessStore,
  writeServerlessStore,
} from '../lib/serverlessApi.ts';
import type { LandingContent, Language, Tournament, UserProfile } from '../types.ts';
import { PREMIUM_BANNER_TEMPLATES, SVG_FRAME_TEMPLATES } from '../utils/gameArtworks.ts';
import { AdminTournamentSection } from './AdminTournamentSection.tsx';
import { AvatarWithFrame } from './AvatarWithFrame.tsx';
import { RankTierIcon } from './PremiumIcons.tsx';

interface AdminPanelProps {
  token?: string;
  currentUser: UserProfile;
  livePingMs?: number;
  lang?: Language;
  onChangeLang?: (next: Language) => void;
  onSwitchToLobby?: () => void;
  landingContent?: LandingContent;
  onLandingUpdated?: (next: LandingContent) => void;
  onLogout?: () => void;
  onNotify: (level: string, message: string) => void;
}

type AdminSection =
  | 'overview'
  | 'users'
  | 'tournaments'
  | 'engine'
  | 'quiz'
  | 'branding'
  | 'reports'
  | 'broadcast'
  | 'logs';

export const AdminPanel: React.FC<AdminPanelProps> = ({
  currentUser,
  livePingMs = 20,
  onSwitchToLobby,
  landingContent,
  onLandingUpdated,
  onLogout,
  onNotify,
}) => {
  const [section, setSection] = React.useState<AdminSection>('overview');
  const [users, setUsers] = React.useState<any[]>([]);
  const [tournaments, setTournaments] = React.useState<Tournament[]>([]);
  const [rooms, setRooms] = React.useState<any[]>([]);
  const [reports, setReports] = React.useState<any[]>([]);
  const [auditLogs, setAuditLogs] = React.useState<any[]>([]);
  const [customRiddles, setCustomRiddles] = React.useState<any[]>([]);
  const [syncError, setSyncError] = React.useState<string>('');

  // Engine / Economy / Maintenance State
  const [maintenance, setMaintenance] = React.useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = React.useState(
    'စနစ်အဆင့်မြှင့်တင်နေပါသဖြင့် ခေတ္တစောင့်ဆိုင်းပေးပါ။'
  );
  const [locks, setLocks] = React.useState<Record<string, boolean>>({});
  const [economy, setEconomy] = React.useState({
    winXp: 75,
    drawXp: 25,
    lossXp: 20,
    quizQuestionsPerMatch: 10,
    botFallbackSec: 8,
  });

  // User Manager + Full Player Editor Modal State
  const [userSearch, setUserSearch] = React.useState('');
  const [editingUser, setEditingUser] = React.useState<any | null>(null);
  const [editPassword, setEditPassword] = React.useState('');
  const [directMsgText, setDirectMsgText] = React.useState('');
  const [warnReason, setWarnReason] = React.useState('');

  // Quiz CMS State
  const [quizSearch, setQuizSearch] = React.useState('');
  const [newQuestion, setNewQuestion] = React.useState('');
  const [newOpts, setNewOpts] = React.useState(['', '', '', '']);
  const [newAnswerIdx, setNewAnswerIdx] = React.useState(0);
  const [newCategory, setNewCategory] = React.useState('စကားထာ');

  // Branding & Landing CMS State
  const [brandForm, setBrandForm] = React.useState<LandingContent>(() => ({
    heroTitleMy: landingContent?.heroTitleMy || 'Vanguard Arena — မြန်မာ့အဆင့်မြင့် ဂိမ်းကစားကွင်း',
    heroTitleEn: landingContent?.heroTitleEn || 'Vanguard Arena — Premier Competitive Hub',
    heroSubtitleMy:
      landingContent?.heroSubtitleMy ||
      'အွန်လိုင်း ဗျူဟာဂိမ်းများ၊ တရားဝင် ပြိုင်ပွဲကြီးများနှင့် Real-Time Ranking စနစ်။',
    heroSubtitleEn:
      landingContent?.heroSubtitleEn ||
      'Real-time strategy battles, official tournaments, and global leaderboards.',
    ...(landingContent || {}),
  }));

  // Broadcast State
  const [broadcastTitle, setBroadcastTitle] = React.useState('Vanguard Official Announcement');
  const [broadcastMessage, setBroadcastMessage] = React.useState('');

  // Real-Time Firestore Subscriptions
  React.useEffect(() => {
    if (!isFirebaseConfigured || !db) {
      const store = readServerlessStore();
      setUsers(Object.values(store.users || {}));
      return;
    }

    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        const list: any[] = [];
        snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
        list.sort((a, b) => (b.xp || 0) - (a.xp || 0));
        setUsers(list);
        setSyncError('');
      },
      (err) => setSyncError(err.message)
    );

    const unsubTourneys = onSnapshot(collection(db, 'tournaments'), (snap) => {
      const list: Tournament[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...(d.data() as any) }));
      list.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
      setTournaments(list);
    });

    const unsubRooms = onSnapshot(collection(db, 'rooms'), (snap) => {
      const list: any[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setRooms(list);
    });

    const unsubReports = onSnapshot(collection(db, 'reports'), (snap) => {
      const list: any[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
      setReports(list);
    });

    const unsubRiddles = onSnapshot(collection(db, 'riddles'), (snap) => {
      const list: any[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data(), isCustom: true }));
      list.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
      setCustomRiddles(list);
    });

    const unsubConfig = onSnapshot(doc(db, 'system', 'config'), (snap) => {
      if (snap.exists()) {
        const d = snap.data() as any;
        setMaintenance(Boolean(d.maintenance));
        if (d.maintenanceMessage) setMaintenanceMessage(d.maintenanceMessage);
        if (d.featureLocks) setLocks(d.featureLocks);
        if (d.economy) setEconomy((prev) => ({ ...prev, ...d.economy }));
      }
    });

    const unsubLogs = onSnapshot(collection(db, 'auditLogs'), (snap) => {
      const list: any[] = [];
      snap.forEach((d) => list.push(d.data()));
      list.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
      setAuditLogs(list.slice(0, 80));
    });

    return () => {
      unsubUsers();
      unsubTourneys();
      unsubRooms();
      unsubReports();
      unsubRiddles();
      unsubConfig();
      unsubLogs();
    };
  }, []);

  const logAdminAction = React.useCallback(
    async (action: string, detail: string) => {
      const id = `log_${Date.now()}_${Math.floor(Math.random() * 999)}`;
      const entry = stripUndefined({
        id,
        admin: currentUser.username || 'yanlinnaung',
        action,
        detail,
        createdAtMs: Date.now(),
      });
      if (isFirebaseConfigured && db) {
        await setDoc(doc(db, 'auditLogs', id), entry).catch(() => {});
      }
    },
    [currentUser.username]
  );

  // Full JSON Database Backup Export
  const handleExportBackup = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      usersCount: users.length,
      users,
      tournaments,
      rooms,
      reports,
      customRiddles,
      systemConfig: { maintenance, maintenanceMessage, locks, economy },
      branding: brandForm,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vanguard-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    logAdminAction('EXPORT_BACKUP', `Exported ${users.length} users & ${tournaments.length} tournaments`);
    onNotify('success', 'Database JSON Backup ဒေါင်းလုဒ်ဆွဲပြီးပါပြီ!');
  };

  const handleSaveEngineConfig = async (
    nextMaint = maintenance,
    nextLocks = locks,
    nextEcon = economy,
    nextMsg = maintenanceMessage
  ) => {
    setMaintenance(nextMaint);
    setLocks(nextLocks);
    setEconomy(nextEcon);
    if (isFirebaseConfigured && db) {
      await setDoc(
        doc(db, 'system', 'config'),
        stripUndefined({
          maintenance: nextMaint,
          maintenanceMessage: nextMsg,
          featureLocks: nextLocks,
          economy: nextEcon,
          updatedAtMs: Date.now(),
        }),
        { merge: true }
      ).catch(() => {});
    }
    await logAdminAction('ENGINE_UPDATE', `Maint=${nextMaint}, WinXP=${nextEcon.winXp}`);
    onNotify('success', 'Game Engine & Economy Settings သိမ်းဆည်းပြီးပါပြီ!');
  };

  // Player Editor Save
  const handleSaveEditedPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    const xpVal = Math.max(0, Number(editingUser.xp) || 0);
    const computedRank =
      xpVal >= 2500 ? 'Legend' : xpVal >= 1900 ? 'Diamond' : xpVal >= 1300 ? 'Gold' : xpVal >= 1000 ? 'Silver' : 'Bronze';

    const patch: any = stripUndefined({
      displayName: String(editingUser.displayName || '').trim() || editingUser.username,
      bio: String(editingUser.bio || '').trim(),
      xp: xpVal,
      rank: computedRank,
      frameId: editingUser.frameId || 'bronze',
      bannerId: editingUser.bannerId || 'cyber_gold',
      wins: Math.max(0, Number(editingUser.wins) || 0),
      losses: Math.max(0, Number(editingUser.losses) || 0),
      draws: Math.max(0, Number(editingUser.draws) || 0),
      status: editingUser.status || 'active',
      ...(editPassword.trim() ? { password: editPassword.trim() } : {}),
      updatedAtMs: Date.now(),
    });

    const store = readServerlessStore();
    if (store.users[editingUser.id]) {
      store.users[editingUser.id] = { ...store.users[editingUser.id], ...patch };
      writeServerlessStore(store);
    }
    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, 'users', editingUser.id), patch, { merge: true });
    }
    broadcastLocalSync('ADMIN_EDIT_USER');
    await logAdminAction('EDIT_PLAYER', `Edited ${patch.displayName} (${editingUser.gameId})`);
    setEditPassword('');
    setEditingUser(null);
    onNotify('success', `${patch.displayName} ၏ အချက်အလက်များကို Real-Time ပြင်ဆင်ပြီးပါပြီ!`);
  };

  const handleTimedSuspend = async (target: any, minutes: number) => {
    if (target.role === 'admin') return;
    const until = new Date(Date.now() + minutes * 60 * 1000).toISOString();
    if (isFirebaseConfigured && db) {
      await setDoc(
        doc(db, 'users', target.id),
        { status: 'suspended', suspendedUntil: until },
        { merge: true }
      ).catch(() => {});
    }
    await logAdminAction('SUSPEND_PLAYER', `${target.displayName} for ${minutes}m`);
    onNotify('info', `${target.displayName} အား ${minutes} မိနစ် Suspend လုပ်ပြီးပါပြီ။`);
  };

  const handleUserStatus = async (target: any, status: 'active' | 'banned') => {
    if (target.role === 'admin') return;
    if (isFirebaseConfigured && db) {
      await setDoc(
        doc(db, 'users', target.id),
        { status, suspendedUntil: status === 'active' ? '' : target.suspendedUntil || '' },
        { merge: true }
      ).catch(() => {});
    }
    await logAdminAction('USER_STATUS', `${target.displayName} -> ${status}`);
    onNotify('success', `${target.displayName} -> ${status.toUpperCase()}`);
  };

  const handleDeleteUser = async (target: any) => {
    if (target.role === 'admin') return;
    if (!window.confirm(`${target.displayName} (${target.gameId}) အကောင့်ကို အပြီးဖျက်မည်လား?`)) return;
    if (isFirebaseConfigured && db) {
      await deleteDoc(doc(db, 'users', target.id)).catch(() => {});
    }
    await logAdminAction('DELETE_USER', `Deleted ${target.displayName}`);
    setEditingUser(null);
    onNotify('info', 'အကောင့် ဖျက်ပြီးပါပြီ။');
  };

  const handleSendDirectNoti = async (target: any) => {
    if (!directMsgText.trim()) return;
    const nid = `noti_${Date.now()}`;
    if (isFirebaseConfigured && db) {
      await setDoc(
        doc(db, 'notifications', nid),
        stripUndefined({
          id: nid,
          targetUserId: target.id,
          title: 'Master Admin မှ အသိပေးစာ',
          message: directMsgText.trim(),
          type: 'message',
          senderName: 'Master Admin',
          createdAtMs: Date.now(),
          read: false,
        })
      ).catch(() => {});
    }
    setDirectMsgText('');
    onNotify('success', `${target.displayName} ထံ Notification ပို့ပြီးပါပြီ!`);
  };

  const handleSendWarning = async (target: any, reasonText = warnReason) => {
    if (!reasonText.trim()) return;
    const wid = `warn_${Date.now()}`;
    if (isFirebaseConfigured && db) {
      await setDoc(
        doc(db, 'warnings', wid),
        stripUndefined({
          id: wid,
          userId: target.id,
          title: 'Admin သတိပေးချက်',
          reason: reasonText.trim(),
          acknowledged: false,
          createdAtMs: Date.now(),
        })
      ).catch(() => {});
    }
    setWarnReason('');
    onNotify('success', `${target.displayName} ထံ Warning ပို့ပြီးပါပြီ!`);
  };

  // Quiz CMS Handlers
  const handleAddRiddle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim() || newOpts.some((o) => !o.trim())) {
      onNotify('error', 'မေးခွန်းနှင့် အဖြေ ၄ ခုလုံး ပြည့်စုံစွာ ဖြည့်ပါ။');
      return;
    }
    const id = `rid_${Date.now()}`;
    const item = stripUndefined({
      id,
      category: newCategory,
      question: newQuestion.trim(),
      options: newOpts.map((o) => o.trim()),
      answerIndex: newAnswerIdx,
      createdAtMs: Date.now(),
    });
    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, 'riddles', id), item).catch(() => {});
    }
    setNewQuestion('');
    setNewOpts(['', '', '', '']);
    setNewAnswerIdx(0);
    await logAdminAction('ADD_QUIZ', item.question.slice(0, 40));
    onNotify('success', 'ဉာဏ်စမ်းမေးခွန်းအသစ် ထည့်သွင်းပြီးပါပြီ!');
  };

  const handleDeleteRiddle = async (id: string) => {
    if (isFirebaseConfigured && db) {
      await deleteDoc(doc(db, 'riddles', id)).catch(() => {});
    }
    onNotify('info', 'မေးခွန်း ဖျက်ပြီးပါပြီ။');
  };

  // Branding Save
  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = stripUndefined({ ...brandForm, updatedAtMs: Date.now() });
    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, 'system', 'landing'), clean, { merge: true }).catch(() => {});
    }
    onLandingUpdated?.(clean);
    await logAdminAction('UPDATE_BRANDING', String(clean.heroTitleEn || 'Updated landing'));
    onNotify('success', 'Website Branding နှင့် ခေါင်းစဉ်များ Real-Time ပြောင်းလဲပြီးပါပြီ!');
  };

  // Broadcast Handlers
  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastMessage.trim()) return;
    const bid = `bc_${Date.now()}`;
    const payload = stripUndefined({
      id: bid,
      title: broadcastTitle.trim() || 'Admin Announcement',
      message: broadcastMessage.trim(),
      createdAtMs: Date.now(),
    });
    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, 'system', 'announcement'), payload).catch(() => {});
      await setDoc(
        doc(db, 'notifications', bid),
        stripUndefined({
          id: bid,
          targetUserId: 'ALL',
          title: payload.title,
          message: payload.message,
          type: 'broadcast',
          senderName: 'Master Admin',
          createdAtMs: Date.now(),
          read: false,
        })
      ).catch(() => {});
    }
    await logAdminAction('BROADCAST', payload.message.slice(0, 60));
    setBroadcastMessage('');
    onNotify('success', 'ကစားသမားအားလုံးထံ Broadcast ကြေညာချက် ပေးပို့ပြီးပါပြီ!');
  };

  const handleClearBroadcast = async () => {
    if (isFirebaseConfigured && db) {
      await deleteDoc(doc(db, 'system', 'announcement')).catch(() => {});
    }
    onNotify('info', 'Broadcast Banner ဖြုတ်လိုက်ပါပြီ။');
  };

  const handleCloseRoom = async (roomId: string) => {
    if (isFirebaseConfigured && db) {
      await deleteDoc(doc(db, 'rooms', roomId)).catch(() => {});
    }
    await logAdminAction('CLOSE_ROOM', roomId);
    onNotify('info', 'Room ပိတ်သိမ်းပြီးပါပြီ။');
  };

  const handleReportAction = async (rep: any, action: 'warn' | 'ban' | 'resolved' | 'dismissed') => {
    const target = users.find((u) => u.id === rep.targetUserId);
    if (action === 'warn' && target) await handleSendWarning(target, `Report: ${rep.reason}`);
    if (action === 'ban' && target) await handleUserStatus(target, 'banned');
    const st = action === 'dismissed' ? 'dismissed' : 'resolved';
    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, 'reports', rep.id), { status: st, resolvedAtMs: Date.now() }, { merge: true }).catch(() => {});
    }
    await logAdminAction('REPORT_DECISION', `${rep.id} -> ${action}`);
    onNotify('success', `Report အား ${action.toUpperCase()} ဆောင်ရွက်ပြီးပါပြီ။`);
  };

  const onlineCount = users.filter((u) => u.online && Date.now() - Number(u.lastSeenMs || 0) < 90000).length;
  const pendingReports = reports.filter((r) => r.status === 'pending').length;
  const allRiddles = [...customRiddles, ...(Array.isArray(DEFAULT_SAKAR_RIDDLES) ? DEFAULT_SAKAR_RIDDLES : [])];
  const filteredRiddles = allRiddles.filter((r) =>
    !quizSearch.trim() ? true : String(r.question || '').toLowerCase().includes(quizSearch.trim().toLowerCase())
  );
  const filteredUsers = users.filter((u) => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      String(u.displayName || '').toLowerCase().includes(q) ||
      String(u.username || '').toLowerCase().includes(q) ||
      String(u.gameId || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-dvh cyber-bg text-slate-100">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 space-y-4">
        {/* Master Admin Header */}
        <div className="cyber-panel rounded-2xl p-4 border border-amber-500/40 flex flex-wrap items-center justify-between gap-3 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500/30 to-rose-500/20 border border-amber-400/50 flex items-center justify-center">
              <Shield className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-display font-extrabold text-white flex items-center gap-2">
                <span>Master Admin Command Center</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-[10px] font-mono text-amber-300">
                  PRO v3.0
                </span>
              </h2>
              <div className="text-xs flex items-center gap-2.5 mt-0.5">
                {isFirebaseConfigured && !syncError ? (
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5" /> Cloud Sync Live ({livePingMs}ms)
                  </span>
                ) : (
                  <span className="text-rose-400 font-semibold">{syncError || 'Local Mode'}</span>
                )}
                <span className="text-slate-400">· {onlineCount} Online</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportBackup}
              className="px-3 h-9 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-bold text-amber-200 flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" /> Backup JSON
            </button>
            {onSwitchToLobby && (
              <button
                type="button"
                onClick={onSwitchToLobby}
                className="px-3.5 h-9 rounded-xl cyber-cta-gold text-slate-950 font-extrabold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Gamepad2 className="w-4 h-4" /> Game Arena
              </button>
            )}
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="w-9 h-9 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/35 text-rose-300 flex items-center justify-center cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {(
            [
              { id: 'overview', label: 'Overview', icon: Activity },
              { id: 'users', label: `Players (${users.length})`, icon: Users },
              { id: 'tournaments', label: `Tournaments & Gifts (${tournaments.length})`, icon: Trophy },
              { id: 'engine', label: 'Game Engine & Economy', icon: Sliders },
              { id: 'quiz', label: `Quiz CMS (${allRiddles.length})`, icon: BookOpen },
              { id: 'branding', label: 'Branding CMS', icon: Palette },
              { id: 'reports', label: 'Reports', icon: AlertTriangle, badge: pendingReports },
              { id: 'broadcast', label: 'Broadcast', icon: Bell },
              { id: 'logs', label: 'Audit Logs', icon: FileText },
            ] as Array<{ id: AdminSection; label: string; icon: any; badge?: number }>
          ).map((t) => {
            const Icon = t.icon;
            const active = section === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSection(t.id)}
                className={`px-3.5 h-9 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer border transition-all ${
                  active
                    ? 'cyber-gold-active text-amber-200'
                    : 'bg-[#0b101d] border-white/10 text-slate-300 hover:border-amber-400/35'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
                {t.badge && t.badge > 0 ? (
                  <span className="px-1.5 rounded-full bg-rose-500 text-white text-[10px] font-mono">{t.badge}</span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* 1. OVERVIEW */}
        {section === 'overview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="cyber-panel rounded-2xl p-4 border border-white/10">
                <div className="text-[11px] text-slate-400">Total Players</div>
                <div className="text-2xl font-mono font-extrabold text-white mt-1">{users.length}</div>
                <div className="text-[11px] text-emerald-400 mt-1">● {onlineCount} Live</div>
              </div>
              <div className="cyber-panel rounded-2xl p-4 border border-white/10">
                <div className="text-[11px] text-slate-400">Tournaments</div>
                <div className="text-2xl font-mono font-extrabold text-amber-400 mt-1">{tournaments.length}</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {tournaments.filter((t) => t.status === 'ongoing').length} Live Now
                </div>
              </div>
              <div className="cyber-panel rounded-2xl p-4 border border-white/10">
                <div className="text-[11px] text-slate-400">Active Rooms</div>
                <div className="text-2xl font-mono font-extrabold text-sky-400 mt-1">{rooms.length}</div>
                <div className="text-[11px] text-slate-400 mt-1">Real-Time</div>
              </div>
              <div className="cyber-panel rounded-2xl p-4 border border-white/10">
                <div className="text-[11px] text-slate-400">Quiz Bank</div>
                <div className="text-2xl font-mono font-extrabold text-indigo-300 mt-1">{allRiddles.length}</div>
                <div className="text-[11px] text-slate-400 mt-1">{customRiddles.length} Custom</div>
              </div>
              <div className="cyber-panel rounded-2xl p-4 border border-white/10">
                <div className="text-[11px] text-slate-400">Pending Reports</div>
                <div className="text-2xl font-mono font-extrabold text-rose-400 mt-1">{pendingReports}</div>
                <div className="text-[11px] text-slate-400 mt-1">Total {reports.length}</div>
              </div>
            </div>

            {/* Maintenance Quick Switch */}
            <div className="cyber-panel rounded-2xl p-4 border border-amber-500/25 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-amber-400" /> Global Maintenance Mode
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  ဖွင့်ထားပါက သာမန်ကစားသမားအားလုံး Maintenance Screen ကို မြင်ရပြီး Admin တစ်ဦးတည်း စစ်ဆေးနိုင်ပါမည်။
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleSaveEngineConfig(!maintenance, locks, economy, maintenanceMessage)}
                className={`px-4 h-10 rounded-xl font-bold text-xs cursor-pointer ${
                  maintenance
                    ? 'bg-rose-500 text-white'
                    : 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-300'
                }`}
              >
                {maintenance ? 'Maintenance: ON (ပိတ်မည်)' : 'Maintenance: OFF (ဖွင့်မည်)'}
              </button>
            </div>
          </div>
        )}

        {/* 2. PLAYERS & FULL EDITOR */}
        {section === 'users' && (
          <div className="cyber-panel rounded-2xl p-4 space-y-3 border border-white/10">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="အမည်၊ Username သို့မဟုတ် Game ID ရှာရန်..."
                  className="w-full h-10 pl-9 pr-3 rounded-xl bg-[#070b14] border border-white/15 text-xs text-white"
                />
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Showing {filteredUsers.length} / {users.length}
              </span>
            </div>

            <div className="grid md:grid-cols-2 gap-2.5 max-h-[62vh] overflow-y-auto pr-1">
              {filteredUsers.map((u) => {
                const isLive = Boolean(u.online && Date.now() - Number(u.lastSeenMs || 0) < 90000);
                return (
                  <div
                    key={u.id}
                    className="p-3 rounded-xl bg-[#070b14] border border-white/10 hover:border-amber-400/40 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <AvatarWithFrame
                        avatarUrl={u.avatarUrl}
                        frameId={u.frameId}
                        displayName={u.displayName}
                        size="sm"
                        status={isLive ? 'online' : 'offline'}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white truncate">{u.displayName}</span>
                          <RankTierIcon tier={u.rank || 'silver'} className="w-4 h-4 shrink-0" />
                          {u.status && u.status !== 'active' && (
                            <span className="px-1.5 rounded bg-rose-500/25 text-rose-300 text-[9px] uppercase font-bold">
                              {u.status}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-mono text-amber-300 truncate">
                          {u.gameId} · {u.xp || 0} XP · {u.wins || 0}W/{u.losses || 0}L
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {isLive ? '🟢 Live' : '⚪ Offline'} · {u.device || 'Web/Mobile'}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setEditingUser({ ...u });
                        setEditPassword('');
                      }}
                      className="px-3 h-8 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 text-xs font-bold flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <Edit3 className="w-3.5 h-3.5" /> Edit
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. TOURNAMENTS, LIVE ROOMS & WINNER GIFTS */}
        {section === 'tournaments' && (
          <AdminTournamentSection
            tournaments={tournaments}
            rooms={rooms}
            users={users}
            onCloseRoom={handleCloseRoom}
            onLogAction={logAdminAction}
            onNotify={onNotify}
          />
        )}

        {/* 4. GAME ENGINE, ECONOMY & FEATURE LOCKS */}
        {section === 'engine' && (
          <div className="grid lg:grid-cols-12 gap-4">
            <div className="lg:col-span-6 cyber-panel rounded-2xl p-4 space-y-3 border border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400" /> Game & Feature Locks
              </h3>
              <div className="grid sm:grid-cols-2 gap-2">
                {[
                  { key: 'connect4', label: '4 in a Row (Connect 4)' },
                  { key: 'tictactoe', label: 'Tic-Tac-Toe' },
                  { key: 'rps', label: 'Rock Paper Scissors' },
                  { key: 'sakarhtar', label: 'Wise Owl Quiz' },
                  { key: 'tournaments', label: 'Tournament Join' },
                  { key: 'customRooms', label: 'Custom Friend Rooms' },
                  { key: 'chat', label: 'Social Direct Chat' },
                ].map((item) => {
                  const isLocked = Boolean(locks[item.key]);
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() =>
                        handleSaveEngineConfig(maintenance, { ...locks, [item.key]: !isLocked }, economy)
                      }
                      className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold cursor-pointer ${
                        isLocked
                          ? 'bg-rose-500/15 border-rose-500/40 text-rose-200'
                          : 'bg-[#070b14] border-white/10 text-emerald-300'
                      }`}
                    >
                      <span>{item.label}</span>
                      {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-white/10 space-y-2">
                <label className="block text-xs text-slate-400">Maintenance Message</label>
                <input
                  type="text"
                  value={maintenanceMessage}
                  onChange={(e) => setMaintenanceMessage(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-[#070b14] border border-white/15 text-xs text-white"
                />
              </div>
            </div>

            <div className="lg:col-span-6 cyber-panel rounded-2xl p-4 space-y-3 border border-amber-500/25">
              <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                <Sliders className="w-4 h-4" /> Economy & Matchmaking Rules
              </h3>
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Win XP (+)</label>
                  <input
                    type="number"
                    value={economy.winXp}
                    onChange={(e) => setEconomy({ ...economy, winXp: Number(e.target.value) })}
                    className="w-full h-10 px-3 rounded-xl bg-[#070b14] border border-white/15 text-xs font-mono text-emerald-300"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Draw XP (+)</label>
                  <input
                    type="number"
                    value={economy.drawXp}
                    onChange={(e) => setEconomy({ ...economy, drawXp: Number(e.target.value) })}
                    className="w-full h-10 px-3 rounded-xl bg-[#070b14] border border-white/15 text-xs font-mono text-sky-300"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Loss XP (-)</label>
                  <input
                    type="number"
                    value={economy.lossXp}
                    onChange={(e) => setEconomy({ ...economy, lossXp: Number(e.target.value) })}
                    className="w-full h-10 px-3 rounded-xl bg-[#070b14] border border-white/15 text-xs font-mono text-rose-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Quiz Questions / Match</label>
                  <select
                    value={economy.quizQuestionsPerMatch}
                    onChange={(e) => setEconomy({ ...economy, quizQuestionsPerMatch: Number(e.target.value) })}
                    className="w-full h-10 px-3 rounded-xl bg-[#070b14] border border-white/15 text-xs text-white"
                  >
                    {[5, 10, 15, 20].map((n) => (
                      <option key={n} value={n}>
                        {n} Questions
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Bot Fallback Wait (sec)</label>
                  <input
                    type="number"
                    min={3}
                    max={60}
                    value={economy.botFallbackSec}
                    onChange={(e) => setEconomy({ ...economy, botFallbackSec: Number(e.target.value) })}
                    className="w-full h-10 px-3 rounded-xl bg-[#070b14] border border-white/15 text-xs font-mono text-amber-300"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleSaveEngineConfig(maintenance, locks, economy, maintenanceMessage)}
                className="w-full h-10 rounded-xl cyber-cta-gold text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Save className="w-4 h-4" /> Engine & Economy Settings သိမ်းဆည်းမည်
              </button>
            </div>
          </div>
        )}

        {/* 5. WISE OWL QUIZ CMS */}
        {section === 'quiz' && (
          <div className="grid lg:grid-cols-12 gap-4">
            <form
              onSubmit={handleAddRiddle}
              className="lg:col-span-5 cyber-panel rounded-2xl p-4 space-y-2.5 border border-amber-500/25"
            >
              <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                <Plus className="w-4 h-4" /> ဉာဏ်စမ်းမေးခွန်းအသစ် ထည့်သွင်းရန်
              </h3>
              <input
                type="text"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="အမျိုးအစား (ဥပမာ - စကားထာ / ဗဟုသုတ)"
                className="w-full h-9 px-3 rounded-xl bg-[#070b14] border border-white/15 text-xs text-white"
              />
              <textarea
                rows={2}
                required
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="မေးခွန်း စာသားရေးပါ..."
                className="w-full p-2.5 rounded-xl bg-[#070b14] border border-white/15 text-xs text-white"
              />
              <div className="space-y-1.5">
                {newOpts.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correctOpt"
                      checked={newAnswerIdx === idx}
                      onChange={() => setNewAnswerIdx(idx)}
                      className="accent-amber-500 cursor-pointer"
                    />
                    <input
                      type="text"
                      required
                      value={opt}
                      onChange={(e) => {
                        const copy = [...newOpts];
                        copy[idx] = e.target.value;
                        setNewOpts(copy);
                      }}
                      placeholder={`အဖြေ ${idx + 1} ${newAnswerIdx === idx ? '(အဖြေမှန်)' : ''}`}
                      className="flex-1 h-9 px-3 rounded-lg bg-[#070b14] border border-white/15 text-xs text-white"
                    />
                  </div>
                ))}
              </div>
              <button
                type="submit"
                className="w-full h-10 rounded-xl cyber-cta-gold text-slate-950 font-extrabold text-xs cursor-pointer"
              >
                မေးခွန်း ထည့်သွင်းမည်
              </button>
            </form>

            <div className="lg:col-span-7 cyber-panel rounded-2xl p-4 space-y-3 border border-white/10">
              <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={quizSearch}
                  onChange={(e) => setQuizSearch(e.target.value)}
                  placeholder="မေးခွန်း ရှာဖွေရန်..."
                  className="flex-1 h-9 px-3 rounded-xl bg-[#070b14] border border-white/15 text-xs text-white"
                />
              </div>
              <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
                {filteredRiddles.slice(0, 50).map((r, i) => (
                  <div
                    key={r.id || i}
                    className="p-3 rounded-xl bg-[#070b14] border border-white/10 flex items-start justify-between gap-2 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="font-bold text-white">{r.question}</div>
                      <div className="text-[11px] text-emerald-300">
                        အဖြေမှန်: {r.options?.[r.answerIndex] || '-'}
                      </div>
                    </div>
                    {r.isCustom && (
                      <button
                        type="button"
                        onClick={() => handleDeleteRiddle(r.id)}
                        className="p-1.5 rounded-lg bg-rose-500/20 text-rose-300 cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 6. BRANDING & LANDING CMS */}
        {section === 'branding' && (
          <form
            onSubmit={handleSaveBranding}
            className="cyber-panel rounded-2xl p-5 space-y-3 border border-amber-500/25 max-w-2xl"
          >
            <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
              <Palette className="w-4 h-4" /> Website Branding & Landing Content CMS
            </h3>
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Hero Title (Myanmar)</label>
                <input
                  type="text"
                  value={brandForm.heroTitleMy || ''}
                  onChange={(e) => setBrandForm({ ...brandForm, heroTitleMy: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-[#070b14] border border-white/15 text-xs text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Hero Title (English)</label>
                <input
                  type="text"
                  value={brandForm.heroTitleEn || ''}
                  onChange={(e) => setBrandForm({ ...brandForm, heroTitleEn: e.target.value })}
                  className="w-full h-10 px-3 rounded-xl bg-[#070b14] border border-white/15 text-xs text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Hero Subtitle (Myanmar)</label>
              <textarea
                rows={2}
                value={brandForm.heroSubtitleMy || ''}
                onChange={(e) => setBrandForm({ ...brandForm, heroSubtitleMy: e.target.value })}
                className="w-full p-3 rounded-xl bg-[#070b14] border border-white/15 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Hero Subtitle (English)</label>
              <textarea
                rows={2}
                value={brandForm.heroSubtitleEn || ''}
                onChange={(e) => setBrandForm({ ...brandForm, heroSubtitleEn: e.target.value })}
                className="w-full p-3 rounded-xl bg-[#070b14] border border-white/15 text-xs text-white"
              />
            </div>
            <button
              type="submit"
              className="h-10 px-6 rounded-xl cyber-cta-gold text-slate-950 font-extrabold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" /> Branding သိမ်းဆည်းမည်
            </button>
          </form>
        )}

        {/* 7. REPORTS */}
        {section === 'reports' && (
          <div className="cyber-panel rounded-2xl p-4 space-y-3 border border-white/10">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" /> Player Reports Moderation ({reports.length})
            </h3>
            {reports.length === 0 ? (
              <div className="text-xs text-slate-500 text-center py-8">Report မရှိသေးပါ။</div>
            ) : (
              <div className="space-y-2">
                {reports.map((rep) => (
                  <div
                    key={rep.id}
                    className="p-3.5 rounded-xl bg-[#070b14] border border-white/10 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5">
                      <div className="text-xs font-bold text-white">
                        Target: <span className="text-rose-300">{rep.targetName}</span> (by {rep.reporterName})
                      </div>
                      <div className="text-xs text-slate-300">{rep.reason}</div>
                      <div className="text-[10px] font-mono uppercase text-amber-400">Status: {rep.status}</div>
                    </div>
                    {rep.status === 'pending' && (
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleReportAction(rep, 'warn')}
                          className="px-2.5 h-8 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-bold cursor-pointer"
                        >
                          Warn
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReportAction(rep, 'ban')}
                          className="px-2.5 h-8 rounded-lg bg-rose-500/25 text-rose-300 text-xs font-bold cursor-pointer"
                        >
                          Ban
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReportAction(rep, 'resolved')}
                          className="px-2.5 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Resolve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReportAction(rep, 'dismissed')}
                          className="px-2.5 h-8 rounded-lg bg-white/10 text-slate-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 8. BROADCAST */}
        {section === 'broadcast' && (
          <form
            onSubmit={handleSendBroadcast}
            className="cyber-panel rounded-2xl p-5 space-y-3 border border-amber-500/25 max-w-xl"
          >
            <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
              <Radio className="w-4 h-4" /> Global Real-Time Broadcast Center
            </h3>
            <input
              type="text"
              value={broadcastTitle}
              onChange={(e) => setBroadcastTitle(e.target.value)}
              placeholder="ခေါင်းစဉ်..."
              className="w-full h-10 px-3 rounded-xl bg-[#070b14] border border-white/15 text-xs text-white"
            />
            <textarea
              rows={3}
              required
              value={broadcastMessage}
              onChange={(e) => setBroadcastMessage(e.target.value)}
              placeholder="ကစားသမားအားလုံးထံ ကြေညာလိုသော စာသား..."
              className="w-full p-3 rounded-xl bg-[#070b14] border border-white/15 text-xs text-white"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 h-10 rounded-xl cyber-cta-gold text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Send className="w-4 h-4" /> Broadcast ပေးပို့မည်
              </button>
              <button
                type="button"
                onClick={handleClearBroadcast}
                className="px-4 h-10 rounded-xl bg-white/10 hover:bg-rose-500/20 text-xs font-bold text-slate-200 cursor-pointer"
              >
                Clear Banner
              </button>
            </div>
          </form>
        )}

        {/* 9. AUDIT LOGS */}
        {section === 'logs' && (
          <div className="cyber-panel rounded-2xl p-4 space-y-2 border border-white/10">
            <h3 className="text-sm font-bold text-white">Admin Action Audit Logs</h3>
            <div className="space-y-1.5 max-h-[60vh] overflow-y-auto">
              {auditLogs.map((log, i) => (
                <div
                  key={log.id || i}
                  className="p-2.5 rounded-lg bg-[#070b14] border border-white/5 text-xs flex items-center justify-between gap-2"
                >
                  <div className="truncate">
                    <span className="font-mono font-bold text-amber-400">[{log.action}]</span>{' '}
                    <span className="text-slate-200">{log.detail}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 shrink-0">
                    {log.createdAtMs ? new Date(log.createdAtMs).toLocaleTimeString() : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* FULL PLAYER EDITOR MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3">
          <div className="w-full max-w-lg rounded-2xl cyber-panel border border-amber-400/50 p-5 space-y-4 max-h-[92dvh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <AvatarWithFrame
                  avatarUrl={editingUser.avatarUrl}
                  frameId={editingUser.frameId}
                  displayName={editingUser.displayName}
                  size="sm"
                />
                <div>
                  <h3 className="text-sm font-bold text-white">Edit Player: {editingUser.displayName}</h3>
                  <div className="text-[11px] font-mono text-amber-300">
                    {editingUser.gameId} · @{editingUser.username} {editingUser.pin ? `· PIN: ${editingUser.pin}` : ''}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="w-8 h-8 rounded-lg bg-white/10 text-slate-300 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedPlayer} className="space-y-3 text-xs">
              <div className="grid sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Display Name</label>
                  <input
                    type="text"
                    value={editingUser.displayName || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, displayName: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg bg-[#070b14] border border-white/15 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">XP Points</label>
                  <input
                    type="number"
                    value={editingUser.xp || 0}
                    onChange={(e) => setEditingUser({ ...editingUser, xp: Number(e.target.value) })}
                    className="w-full h-9 px-3 rounded-lg bg-[#070b14] border border-white/15 font-mono text-amber-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Wins</label>
                  <input
                    type="number"
                    value={editingUser.wins || 0}
                    onChange={(e) => setEditingUser({ ...editingUser, wins: Number(e.target.value) })}
                    className="w-full h-9 px-2.5 rounded-lg bg-[#070b14] border border-white/15 font-mono text-emerald-300"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Losses</label>
                  <input
                    type="number"
                    value={editingUser.losses || 0}
                    onChange={(e) => setEditingUser({ ...editingUser, losses: Number(e.target.value) })}
                    className="w-full h-9 px-2.5 rounded-lg bg-[#070b14] border border-white/15 font-mono text-rose-300"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Draws</label>
                  <input
                    type="number"
                    value={editingUser.draws || 0}
                    onChange={(e) => setEditingUser({ ...editingUser, draws: Number(e.target.value) })}
                    className="w-full h-9 px-2.5 rounded-lg bg-[#070b14] border border-white/15 font-mono text-sky-300"
                  />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Profile Frame</label>
                  <select
                    value={editingUser.frameId || 'bronze'}
                    onChange={(e) => setEditingUser({ ...editingUser, frameId: e.target.value })}
                    className="w-full h-9 px-2.5 rounded-lg bg-[#070b14] border border-white/15 text-white"
                  >
                    {SVG_FRAME_TEMPLATES.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Profile Banner</label>
                  <select
                    value={editingUser.bannerId || 'cyber_gold'}
                    onChange={(e) => setEditingUser({ ...editingUser, bannerId: e.target.value })}
                    className="w-full h-9 px-2.5 rounded-lg bg-[#070b14] border border-white/15 text-white"
                  >
                    {PREMIUM_BANNER_TEMPLATES.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1 flex items-center gap-1">
                  <KeyRound className="w-3 h-3 text-amber-400" /> Reset Password (optional)
                </label>
                <input
                  type="text"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="စကားဝှက်အသစ် ပြောင်းလိုမှသာ ရေးပါ..."
                  className="w-full h-9 px-3 rounded-lg bg-[#070b14] border border-white/15 text-white"
                />
              </div>

              <button
                type="submit"
                className="w-full h-10 rounded-xl cyber-cta-gold text-slate-950 font-extrabold cursor-pointer"
              >
                Save Player Changes (Real-Time)
              </button>
            </form>

            {/* Quick Direct Noti & Moderation Controls */}
            <div className="pt-3 border-t border-white/10 space-y-2.5">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={directMsgText}
                  onChange={(e) => setDirectMsgText(e.target.value)}
                  placeholder="Direct Notification ပို့ရန်..."
                  className="flex-1 h-9 px-3 rounded-lg bg-[#070b14] border border-white/15 text-xs text-white"
                />
                <button
                  type="button"
                  onClick={() => handleSendDirectNoti(editingUser)}
                  className="px-3 h-9 rounded-lg bg-sky-500 text-slate-950 font-bold text-xs cursor-pointer"
                >
                  Send Noti
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={warnReason}
                  onChange={(e) => setWarnReason(e.target.value)}
                  placeholder="သတိပေးချက် (Warning)..."
                  className="flex-1 h-9 px-3 rounded-lg bg-[#070b14] border border-white/15 text-xs text-white"
                />
                <button
                  type="button"
                  onClick={() => handleSendWarning(editingUser)}
                  className="px-3 h-9 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs cursor-pointer"
                >
                  Warn
                </button>
              </div>

              {editingUser.role !== 'admin' && (
                <div className="space-y-2 pt-1">
                  <div className="grid grid-cols-4 gap-1.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => handleTimedSuspend(editingUser, 15)}
                      className="h-8 rounded-lg bg-amber-500/20 text-amber-200 font-bold cursor-pointer"
                    >
                      Susp 15m
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTimedSuspend(editingUser, 60)}
                      className="h-8 rounded-lg bg-amber-500/20 text-amber-200 font-bold cursor-pointer"
                    >
                      Susp 1h
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTimedSuspend(editingUser, 1440)}
                      className="h-8 rounded-lg bg-amber-500/20 text-amber-200 font-bold cursor-pointer"
                    >
                      Susp 24h
                    </button>
                    <button
                      type="button"
                      onClick={() => handleUserStatus(editingUser, 'active')}
                      className="h-8 rounded-lg bg-emerald-500/20 text-emerald-300 font-bold cursor-pointer"
                    >
                      Unban
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleUserStatus(editingUser, 'banned')}
                      className="h-9 rounded-lg bg-rose-500/25 text-rose-200 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Ban className="w-3.5 h-3.5" /> Ban Account
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteUser(editingUser)}
                      className="h-9 rounded-lg bg-rose-600/30 border border-rose-500/40 text-rose-100 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete Account
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
