import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Activity,
  Ban,
  Bell,
  BookOpen,
  CheckCircle2,
  Clock,
  Database,
  Download,
  Edit3,
  Gamepad2,
  KeyRound,
  Layers,
  Lock,
  LogOut,
  Megaphone,
  Monitor,
  Palette,
  Plus,
  Power,
  Save,
  Search,
  Send,
  ShieldAlert,
  Sliders,
  Smartphone,
  Swords,
  Tablet,
  Trash2,
  Trophy,
  Unlock,
  UserCog,
  Users,
  Wifi,
  WifiOff,
  Wrench,
  X,
} from 'lucide-react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
} from 'firebase/firestore';
import { QUIZ_BANK_100 } from '../data/quizBank100.ts';
import {
  db,
  firebaseInitError,
  firebaseProjectId,
  isFirebaseConfigured,
  stripUndefined,
} from '../lib/firebase.ts';
import {
  broadcastLocalSync,
  getPatchedLandingContent,
  readServerlessStore,
  SYNC_CHANNEL_NAME,
  writeServerlessStore,
} from '../lib/serverlessApi.ts';
import { SVG_FRAME_TEMPLATES } from '../utils/gameArtworks.ts';
import type { LandingContent, Language, UserProfile } from '../types.ts';
import { AvatarWithFrame } from './AvatarWithFrame.tsx';
import { LanguageSwitcher } from './LanguageSwitcher.tsx';

interface AdminPanelProps {
  token: string;
  adminUser: UserProfile;
  livePingMs: number;
  lang: Language;
  onChangeLang: (lang: Language) => void;
  onSwitchToLobby: () => void;
  landingContent: LandingContent;
  onLandingUpdated: (content: LandingContent) => void;
  onLogout: () => void;
  onNotify: (level: string, message: string) => void;
}

type AdminSection =
  | 'overview'
  | 'users'
  | 'engine'
  | 'tournaments'
  | 'quiz'
  | 'noti'
  | 'cms';

interface EngineConfigState {
  maintenanceMode: boolean;
  maintenanceMessage: string;
  featureLocks: Record<string, boolean>;
  xpRules: {
    winXp: number;
    drawXp: number;
    lossXp: number;
    quizCountPerMatch: number;
  };
  matchmakingSettings: {
    maxWaitSec: number;
    botFallbackSec: number;
    xpRange: number;
    defaultTurnTime: number;
  };
}

const DEFAULT_ENGINE_CONFIG: EngineConfigState = {
  maintenanceMode: false,
  maintenanceMessage:
    'Vanguard Arena ကို အဆင့်မြှင့်တင် ပြုပြင်နေပါသည်။ ခေတ္တစောင့်ဆိုင်းပေးပါ။',
  featureLocks: {
    connect4: false,
    tictactoe: false,
    rps: false,
    sakarhtar: false,
    matchmaking: false,
    customRooms: false,
    tournaments: false,
    chat: false,
  },
  xpRules: {
    winXp: 75,
    drawXp: 25,
    lossXp: -20,
    quizCountPerMatch: 10,
  },
  matchmakingSettings: {
    maxWaitSec: 30,
    botFallbackSec: 8,
    xpRange: 400,
    defaultTurnTime: 20,
  },
};

function computeRankFromXp(xp: number): string {
  if (xp >= 2500) return 'Legend';
  if (xp >= 1900) return 'Diamond';
  if (xp >= 1300) return 'Gold';
  if (xp >= 1000) return 'Silver';
  return 'Bronze';
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  adminUser,
  livePingMs,
  lang,
  onChangeLang,
  onSwitchToLobby,
  landingContent,
  onLandingUpdated,
  onLogout,
  onNotify,
}) => {
  const [section, setSection] = React.useState<AdminSection>('overview');
  const [users, setUsers] = React.useState<any[]>([]);
  const [notiHistory, setNotiHistory] = React.useState<any[]>([]);
  const [tournaments, setTournaments] = React.useState<any[]>([]);
  const [rooms, setRooms] = React.useState<any[]>([]);
  const [customRiddles, setCustomRiddles] = React.useState<any[]>([]);
  const [auditLogs, setAuditLogs] = React.useState<any[]>([]);
  const [engineConfig, setEngineConfig] = React.useState<EngineConfigState>(DEFAULT_ENGINE_CONFIG);

  const [cloudStatus, setCloudStatus] = React.useState<'connected' | 'error' | 'offline'>(
    isFirebaseConfigured ? 'connected' : 'offline'
  );
  const [cloudErrText, setCloudErrText] = React.useState<string>(firebaseInitError || '');
  const [nowMs, setNowMs] = React.useState(() => Date.now());

  // User Filter & Editor Modal
  const [userSearch, setUserSearch] = React.useState('');
  const [userFilter, setUserFilter] = React.useState<'all' | 'live' | 'restricted'>('all');
  const [editingUser, setEditingUser] = React.useState<any | null>(null);
  const [editDraft, setEditDraft] = React.useState<any>({});

  // Notification Composer
  const [notiTarget, setNotiTarget] = React.useState<string>('ALL');
  const [notiType, setNotiType] = React.useState<'broadcast' | 'message' | 'warning'>('broadcast');
  const [notiTitle, setNotiTitle] = React.useState<string>('Admin ကြေညာချက်');
  const [notiMessage, setNotiMessage] = React.useState<string>('');
  const [sendingNoti, setSendingNoti] = React.useState(false);

  // Tournament Creator
  const [tTitle, setTTitle] = React.useState('');
  const [tGame, setTGame] = React.useState('connect4');
  const [tBracket, setTBracket] = React.useState<8 | 16 | 32>(8);
  const [tPrizeXp, setTPrizeXp] = React.useState(500);

  // Quiz Manager
  const [quizSearch, setQuizSearch] = React.useState('');
  const [quizCatFilter, setQuizCatFilter] = React.useState<'all' | 'riddle' | 'myanmar' | 'science' | 'general'>('all');
  const [newQ, setNewQ] = React.useState('');
  const [newQCat, setNewQCat] = React.useState<'riddle' | 'myanmar' | 'science' | 'general'>('general');
  const [newOpt0, setNewOpt0] = React.useState('');
  const [newOpt1, setNewOpt1] = React.useState('');
  const [newOpt2, setNewOpt2] = React.useState('');
  const [newOpt3, setNewOpt3] = React.useState('');
  const [newAnsIdx, setNewAnsIdx] = React.useState(0);

  // CMS Branding Editor
  const [cmsDraft, setCmsDraft] = React.useState<LandingContent>(() =>
    getPatchedLandingContent(landingContent)
  );
  const [savingConfig, setSavingConfig] = React.useState(false);

  React.useEffect(() => {
    const t = window.setInterval(() => setNowMs(Date.now()), 5000);
    return () => window.clearInterval(t);
  }, []);

  // Audit Logger Helper
  const logAdminAction = React.useCallback(
    async (action: string, detail: string) => {
      const entry = {
        id: `log_${Date.now()}_${Math.floor(Math.random() * 999)}`,
        action,
        actor: adminUser.username || 'yanlinnaung',
        detail,
        createdAtMs: Date.now(),
      };
      setAuditLogs((prev) => [entry, ...prev].slice(0, 40));
      if (isFirebaseConfigured && db) {
        await setDoc(doc(db, 'auditLogs', entry.id), entry).catch(() => {});
      }
    },
    [adminUser.username]
  );

  // Real-Time Firestore Subscriptions Across Entire Platform
  React.useEffect(() => {
    const syncLocal = () => {
      const store = readServerlessStore();
      setUsers(
        Object.values(store.users).sort((a: any, b: any) => (b.lastSeenMs || 0) - (a.lastSeenMs || 0))
      );
      setNotiHistory(
        (store.notifications || []).sort((a: any, b: any) => (b.createdAtMs || 0) - (a.createdAtMs || 0))
      );
      setTournaments(store.tournaments || []);
      setRooms(store.rooms || []);
    };

    syncLocal();
    let ch: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        ch = new BroadcastChannel(SYNC_CHANNEL_NAME);
        ch.onmessage = () => syncLocal();
      }
    } catch {}
    window.addEventListener('storage', syncLocal);

    if (!isFirebaseConfigured || !db) {
      setCloudStatus('offline');
      return () => {
        window.removeEventListener('storage', syncLocal);
        ch?.close();
      };
    }

    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        setCloudStatus('connected');
        setCloudErrText('');
        const list: any[] = [];
        const store = readServerlessStore();
        snap.forEach((d) => {
          const u = d.data();
          if (u?.id) {
            list.push(u);
            store.users[u.id] = u;
          }
        });
        list.sort((a, b) => (b.lastSeenMs || 0) - (a.lastSeenMs || 0));
        writeServerlessStore(store);
        setUsers(list);
      },
      (err) => {
        setCloudStatus('error');
        setCloudErrText(err.message);
      }
    );

    const unsubNotis = onSnapshot(collection(db, 'notifications'), (snap) => {
      const list: any[] = [];
      snap.forEach((d) => list.push({ ...d.data(), id: d.id }));
      list.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
      setNotiHistory(list);
    });

    const unsubTourneys = onSnapshot(collection(db, 'tournaments'), (snap) => {
      const list: any[] = [];
      snap.forEach((d) => list.push({ ...d.data(), id: d.id }));
      list.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
      setTournaments(list);
    });

    const unsubRooms = onSnapshot(collection(db, 'rooms'), (snap) => {
      const list: any[] = [];
      snap.forEach((d) => list.push({ ...d.data(), id: d.id }));
      list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      setRooms(list);
    });

    const unsubRiddles = onSnapshot(collection(db, 'riddles'), (snap) => {
      const list: any[] = [];
      snap.forEach((d) => list.push({ ...d.data(), id: d.id }));
      setCustomRiddles(list);
    });

    const unsubLogs = onSnapshot(collection(db, 'auditLogs'), (snap) => {
      const list: any[] = [];
      snap.forEach((d) => list.push({ ...d.data(), id: d.id }));
      list.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
      setAuditLogs(list.slice(0, 40));
    });

    const unsubConfig = onSnapshot(doc(db, 'system', 'config'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as any;
        setEngineConfig((prev) => ({
          maintenanceMode: Boolean(data.maintenanceMode),
          maintenanceMessage: data.maintenanceMessage || prev.maintenanceMessage,
          featureLocks: { ...prev.featureLocks, ...(data.featureLocks || {}) },
          xpRules: { ...prev.xpRules, ...(data.xpRules || {}) },
          matchmakingSettings: { ...prev.matchmakingSettings, ...(data.matchmakingSettings || {}) },
        }));
      }
    });

    const unsubLanding = onSnapshot(doc(db, 'system', 'landing'), (snap) => {
      if (snap.exists()) {
        const patched = getPatchedLandingContent(snap.data() as LandingContent);
        setCmsDraft(patched);
        onLandingUpdated(patched);
      }
    });

    return () => {
      window.removeEventListener('storage', syncLocal);
      ch?.close();
      unsubUsers();
      unsubNotis();
      unsubTourneys();
      unsubRooms();
      unsubRiddles();
      unsubLogs();
      unsubConfig();
      unsubLanding();
    };
  }, [onLandingUpdated]);

  const isUserLiveNow = (u: any) => Boolean(u.online && u.lastSeenMs && nowMs - Number(u.lastSeenMs) < 45000);
  const liveCount = users.filter(isUserLiveNow).length;
  const bannedCount = users.filter((u) => u.status === 'banned' || u.status === 'suspended').length;
  const allQuizzes = React.useMemo(() => [...customRiddles, ...QUIZ_BANK_100], [customRiddles]);

  // Save Engine Config to Firestore
  const persistEngineConfig = async (nextCfg: EngineConfigState, toastLabel: string) => {
    setSavingConfig(true);
    try {
      setEngineConfig(nextCfg);
      const store = readServerlessStore();
      store.featureLocks = nextCfg.featureLocks;
      store.matchmakingSettings = nextCfg.matchmakingSettings;
      writeServerlessStore(store);

      if (isFirebaseConfigured && db) {
        await setDoc(doc(db, 'system', 'config'), stripUndefined(nextCfg), { merge: true });
      }
      broadcastLocalSync('CONFIG_UPDATED');
      await logAdminAction('CONFIG_UPDATE', toastLabel);
      onNotify('success', toastLabel);
    } catch (err: any) {
      onNotify('error', err?.message || 'Config save failed');
    } finally {
      setSavingConfig(false);
    }
  };

  // Player Edit Modal Handlers
  const openPlayerEditor = (u: any) => {
    setEditingUser(u);
    setEditDraft({
      displayName: u.displayName || '',
      xp: Number(u.xp || 1000),
      frameId: u.frameId || 'bronze',
      wins: Number(u.wins || 0),
      losses: Number(u.losses || 0),
      draws: Number(u.draws || 0),
      status: u.status || 'active',
      newPassword: '',
    });
  };

  const handleSavePlayerEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    const nextXp = Math.max(0, Number(editDraft.xp) || 0);
    const updates: Record<string, any> = {
      displayName: editDraft.displayName.trim() || editingUser.displayName,
      xp: nextXp,
      rank: computeRankFromXp(nextXp),
      frameId: editDraft.frameId,
      wins: Math.max(0, Number(editDraft.wins) || 0),
      losses: Math.max(0, Number(editDraft.losses) || 0),
      draws: Math.max(0, Number(editDraft.draws) || 0),
      status: editDraft.status,
    };
    if (editDraft.status === 'active') updates.suspendedUntil = null;
    if (editDraft.newPassword.trim().length >= 4) {
      updates.password = editDraft.newPassword.trim();
    }

    try {
      const clean = stripUndefined(updates);
      const store = readServerlessStore();
      if (store.users[editingUser.id]) {
        store.users[editingUser.id] = { ...store.users[editingUser.id], ...clean };
        writeServerlessStore(store);
      }
      if (isFirebaseConfigured && db) {
        await setDoc(doc(db, 'users', editingUser.id), clean, { merge: true });
      }
      broadcastLocalSync('USER_UPDATED');
      await logAdminAction('EDIT_PLAYER', `${editingUser.displayName} (${editingUser.gameId}) updated`);
      onNotify('success', `${editingUser.displayName} အချက်အလက် သိမ်းဆည်းပြီးပါပြီ။`);
      setEditingUser(null);
    } catch (err: any) {
      onNotify('error', err?.message || 'Update failed');
    }
  };

  const handleTimedSuspend = async (u: any, minutes: number) => {
    const untilIso = new Date(Date.now() + minutes * 60000).toISOString();
    const updates = { status: 'suspended', suspendedUntil: untilIso };
    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, 'users', u.id), updates, { merge: true }).catch(() => {});
    }
    await logAdminAction('SUSPEND_PLAYER', `${u.displayName} suspended for ${minutes}m`);
    onNotify('info', `${u.displayName} ကို ${minutes} မိနစ် ယာယီပိတ်လိုက်ပါပြီ။`);
    setEditingUser(null);
  };

  const handleForceKick = async (u: any) => {
    const updates = { forceLogoutAt: Date.now(), online: false };
    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, 'users', u.id), updates, { merge: true }).catch(() => {});
    }
    await logAdminAction('KICK_PLAYER', `Force-disconnected ${u.displayName}`);
    onNotify('info', `${u.displayName} ကို ချက်ချင်း ထုတ်ပယ်လိုက်ပါပြီ။`);
  };

  const handleDeleteUser = async (u: any) => {
    if (u.role === 'admin') return;
    if (!window.confirm(`${u.displayName} (${u.gameId}) အကောင့်ကို အပြီးတိုင် ဖျက်မည်မှာ သေချာပါသလား?`)) return;
    const store = readServerlessStore();
    delete store.users[u.id];
    writeServerlessStore(store);
    if (isFirebaseConfigured && db) {
      await deleteDoc(doc(db, 'users', u.id)).catch(() => {});
    }
    broadcastLocalSync('USER_DELETED');
    await logAdminAction('DELETE_PLAYER', `Deleted account ${u.username}`);
    onNotify('success', 'အကောင့် ဖျက်သိမ်းပြီးပါပြီ။');
    setEditingUser(null);
  };

  // Send Notification / Broadcast
  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notiMessage.trim()) return;
    setSendingNoti(true);
    try {
      const id = `noti_${Date.now()}_${Math.floor(Math.random() * 999)}`;
      const payload = stripUndefined({
        id,
        targetUserId: notiTarget,
        title: notiTitle.trim() || 'Admin ကြေညာချက်',
        message: notiMessage.trim(),
        type: notiTarget === 'ALL' ? 'broadcast' : notiType,
        senderName: 'Yan Linn Aung (Admin)',
        createdAtMs: Date.now(),
        read: false,
      });

      const store = readServerlessStore();
      store.notifications = [payload, ...(store.notifications || [])];
      writeServerlessStore(store);
      broadcastLocalSync('NOTI_SENT');

      if (isFirebaseConfigured && db) {
        await setDoc(doc(db, 'notifications', id), payload);
      }

      setNotiMessage('');
      await logAdminAction('SEND_NOTI', `Sent to ${notiTarget}: ${payload.title}`);
      onNotify('success', 'Real-Time Notification ပေးပို့ပြီးပါပြီ!');
    } catch (err: any) {
      onNotify('error', err?.message || 'Failed to send notification');
    } finally {
      setSendingNoti(false);
    }
  };

  const handleDeleteNotification = async (id: string) => {
    if (isFirebaseConfigured && db) {
      await deleteDoc(doc(db, 'notifications', id)).catch(() => {});
    }
    setNotiHistory((prev) => prev.filter((n) => n.id !== id));
    onNotify('info', 'Notification ဖျက်ပြီးပါပြီ။');
  };

  // Tournament & Room Management
  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tTitle.trim()) return;
    const id = `tourney_${Date.now()}`;
    const item = stripUndefined({
      id,
      title: tTitle.trim(),
      gameType: tGame,
      bracketSize: tBracket,
      prizeXp: Number(tPrizeXp) || 300,
      status: 'open',
      participants: [],
      rounds: [],
      createdAtMs: Date.now(),
      createdAt: new Date().toISOString(),
    });
    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, 'tournaments', id), item).catch(() => {});
    }
    setTTitle('');
    await logAdminAction('CREATE_TOURNAMENT', `${item.title} (${tBracket}P)`);
    onNotify('success', 'ပြိုင်ပွဲအသစ် ဖန်တီးပြီးပါပြီ!');
  };

  const handleTournamentStatus = async (tid: string, status: 'open' | 'ongoing' | 'completed') => {
    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, 'tournaments', tid), { status }, { merge: true }).catch(() => {});
    }
    await logAdminAction('TOURNAMENT_STATUS', `${tid} -> ${status}`);
    onNotify('success', `ပြိုင်ပွဲအခြေအနေ ${status.toUpperCase()} သို့ ပြောင်းပြီးပါပြီ။`);
  };

  const handleDeleteTournament = async (tid: string) => {
    if (isFirebaseConfigured && db) {
      await deleteDoc(doc(db, 'tournaments', tid)).catch(() => {});
    }
    onNotify('info', 'ပြိုင်ပွဲ ဖျက်ပြီးပါပြီ။');
  };

  const handleCloseRoom = async (roomId: string) => {
    if (isFirebaseConfigured && db) {
      await deleteDoc(doc(db, 'rooms', roomId)).catch(() => {});
    }
    const store = readServerlessStore();
    store.rooms = (store.rooms || []).filter((r: any) => r.id !== roomId);
    writeServerlessStore(store);
    await logAdminAction('CLOSE_ROOM', `Closed room ${roomId}`);
    onNotify('info', 'အခန်းကို ပိတ်သိမ်းပြီးပါပြီ။');
  };

  // Quiz Management
  const handleAddQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    const opts = [newOpt0, newOpt1, newOpt2, newOpt3].map((s) => s.trim()).filter(Boolean);
    if (!newQ.trim() || opts.length < 2) {
      onNotify('error', 'မေးခွန်းနှင့် အဖြေရွေးချယ်စရာ အနည်းဆုံး ၂ ခု ထည့်သွင်းပါ။');
      return;
    }
    const id = `custom_quiz_${Date.now()}`;
    const item = stripUndefined({
      id,
      category: newQCat,
      question: newQ.trim(),
      questionMy: newQ.trim(),
      questionEn: newQ.trim(),
      options: opts,
      optionsMy: opts,
      optionsEn: opts,
      answerIndex: Math.min(newAnsIdx, opts.length - 1),
    });
    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, 'riddles', id), item).catch(() => {});
    }
    setNewQ('');
    setNewOpt0('');
    setNewOpt1('');
    setNewOpt2('');
    setNewOpt3('');
    await logAdminAction('ADD_QUIZ', newQ.trim().slice(0, 40));
    onNotify('success', 'ဉာဏ်စမ်းပဟေဠိ မေးခွန်းအသစ် ထည့်သွင်းပြီးပါပြီ!');
  };

  const handleDeleteQuiz = async (id: string) => {
    if (!id.startsWith('custom_')) return;
    if (isFirebaseConfigured && db) {
      await deleteDoc(doc(db, 'riddles', id)).catch(() => {});
    }
    onNotify('info', 'စိတ်ကြိုက်မေးခွန်း ဖျက်ပြီးပါပြီ။');
  };

  // Save Branding CMS
  const handleSaveCms = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCms = stripUndefined(cmsDraft);
    onLandingUpdated(cleanCms);
    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, 'system', 'landing'), cleanCms, { merge: true }).catch(() => {});
    }
    await logAdminAction('UPDATE_CMS', 'Updated Landing & Game Branding');
    onNotify('success', 'Branding နှင့် Website စာသားများ သိမ်းဆည်းပြီးပါပြီ!');
  };

  // Export JSON Backup
  const handleExportBackup = () => {
    const dump = {
      exportedAt: new Date().toISOString(),
      project: firebaseProjectId,
      engineConfig,
      usersCount: users.length,
      users,
      tournaments,
      customRiddles,
      notifications: notiHistory,
      auditLogs,
    };
    const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vanguard-arena-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onNotify('success', 'Database Backup JSON ဖိုင် Download ဆွဲပြီးပါပြီ!');
  };

  const filteredUsers = React.useMemo(() => {
    const q = userSearch.trim().toLowerCase();
    return users.filter((u) => {
      if (userFilter === 'live' && !isUserLiveNow(u)) return false;
      if (userFilter === 'restricted' && u.status !== 'banned' && u.status !== 'suspended') return false;
      if (!q) return true;
      return (
        String(u.displayName || '').toLowerCase().includes(q) ||
        String(u.username || '').toLowerCase().includes(q) ||
        String(u.gameId || '').toLowerCase().includes(q) ||
        String(u.device || '').toLowerCase().includes(q)
      );
    });
  }, [users, userSearch, userFilter, nowMs]);

  const filteredQuizzes = React.useMemo(() => {
    const q = quizSearch.trim().toLowerCase();
    return allQuizzes.filter((r) => {
      if (quizCatFilter !== 'all' && r.category !== quizCatFilter) return false;
      if (!q) return true;
      return String(r.question || '').toLowerCase().includes(q);
    });
  }, [allQuizzes, quizSearch, quizCatFilter]);

  const navMenu: Array<{ id: AdminSection; label: string; icon: React.ReactNode; badge?: string | number }> = [
    { id: 'overview', label: 'Overview', icon: <Activity className="w-4 h-4" /> },
    { id: 'users', label: 'Users & Devices', icon: <Users className="w-4 h-4" />, badge: users.length },
    { id: 'engine', label: 'Game Engine', icon: <Sliders className="w-4 h-4" /> },
    { id: 'tournaments', label: 'Tournaments & Rooms', icon: <Trophy className="w-4 h-4" />, badge: rooms.length || undefined },
    { id: 'quiz', label: 'ဉာဏ်စမ်းပဟေဠိ', icon: <BookOpen className="w-4 h-4" />, badge: allQuizzes.length },
    { id: 'noti', label: 'Noti & Broadcast', icon: <Bell className="w-4 h-4" />, badge: notiHistory.length || undefined },
    { id: 'cms', label: 'Branding CMS', icon: <Palette className="w-4 h-4" /> },
  ];

  const renderDeviceIcon = (type?: string) => {
    if (type === 'Mobile') return <Smartphone className="w-3.5 h-3.5 text-sky-400" />;
    if (type === 'Tablet') return <Tablet className="w-3.5 h-3.5 text-purple-400" />;
    return <Monitor className="w-3.5 h-3.5 text-amber-400" />;
  };

  return (
    <div className="min-h-dvh-safe cyber-bg text-slate-100 flex flex-col">
      {/* Top Executive Header */}
      <header className="sticky top-0 z-30 border-b border-amber-500/25 bg-[#080c15]/95 backdrop-blur-md">
        <div className="max-w-[1440px] mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className="vanguard-brand-box px-2.5 py-1 rounded-lg text-xs sm:text-sm font-extrabold text-amber-300 flex items-center gap-1.5 shrink-0">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>VANGUARD MASTER ADMIN</span>
            </div>

            <div
              className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                cloudStatus === 'connected'
                  ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-300'
                  : 'bg-rose-500/15 border-rose-500/40 text-rose-300'
              }`}
            >
              {cloudStatus === 'connected' ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              <span>
                {cloudStatus === 'connected' ? `Cloud Live (${livePingMs}ms)` : 'Cloud Disconnected'}
              </span>
            </div>

            {engineConfig.maintenanceMode && (
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-400 text-[11px] font-bold text-amber-200 animate-pulse">
                <Wrench className="w-3 h-3" /> MAINTENANCE ON
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <LanguageSwitcher lang={lang} onChange={onChangeLang} />
            <button
              type="button"
              onClick={onSwitchToLobby}
              className="h-9 px-3 rounded-xl cyber-cta-gold text-slate-950 font-extrabold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Game Lobby</span>
              <span className="sm:hidden">Play</span>
            </button>
            <button
              type="button"
              onClick={onLogout}
              title="Sign Out"
              className="w-9 h-9 rounded-xl bg-[#0d1322] border border-white/10 hover:bg-rose-500/20 text-rose-300 flex items-center justify-center cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Scrollable Horizontal Nav Bar */}
      <div className="lg:hidden sticky top-14 z-20 bg-[#090d16]/95 border-b border-white/10 px-3 py-2 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5 min-w-max">
          {navMenu.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                section === item.id
                  ? 'cyber-gold-active text-amber-200'
                  : 'bg-[#101728] text-slate-400 border border-white/5'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.badge !== undefined && (
                <span className="px-1.5 py-0.2 rounded-full bg-white/10 text-[10px] font-mono">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split Shell (Desktop Left Sidebar + Right Content Workspace) */}
      <div className="flex-1 max-w-[1440px] w-full mx-auto px-3 sm:px-6 py-4 grid lg:grid-cols-12 gap-5 items-start">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex lg:col-span-3 xl:col-span-2 flex-col gap-2 sticky top-[4.5rem]">
          <div className="cyber-panel rounded-2xl p-2.5 space-y-1">
            {navMenu.map((item) => {
              const active = section === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setSection(item.id)}
                  className={`w-full px-3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between gap-2 transition-all cursor-pointer ${
                    active
                      ? 'cyber-gold-active text-amber-200'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <span className="flex items-center gap-2.5 truncate">
                    {item.icon}
                    <span className="truncate">{item.label}</span>
                  </span>
                  {item.badge !== undefined && (
                    <span className="px-1.5 py-0.5 rounded-md bg-black/40 text-[10px] font-mono text-amber-300">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Admin Profile & Quick Backup Card */}
          <div className="cyber-panel rounded-2xl p-3.5 space-y-3 border border-white/10">
            <div className="flex items-center gap-2.5">
              <AvatarWithFrame
                avatarUrl={adminUser.avatarUrl}
                frameId="legend"
                displayName={adminUser.displayName}
                size="sm"
                status="online"
              />
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">{adminUser.displayName}</div>
                <div className="text-[10px] font-mono text-amber-400">ID: {adminUser.gameId}</div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleExportBackup}
              className="w-full py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-semibold text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Export JSON Backup</span>
            </button>
          </div>
        </aside>

        {/* Right Workspace Content */}
        <section className="lg:col-span-9 xl:col-span-10 space-y-4 min-w-0">
          {/* Cloud Error Alert if any */}
          {cloudStatus !== 'connected' && (
            <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-xs text-rose-200 flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-rose-400 shrink-0" />
              <span>
                Firebase Cloud ချိတ်ဆက်မှု စစ်ဆေးပါ — {cloudErrText || 'firebase-applet-config.json နှင့် Firestore Rules စစ်ဆေးပါ'}
              </span>
            </div>
          )}

          {/* ==========================================================
              SECTION 1: EXECUTIVE OVERVIEW & TELEMETRY
          ========================================================== */}
          {section === 'overview' && (
            <div className="space-y-4">
              {/* KPI Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
                {[
                  { label: 'Total Players', val: users.length, accent: 'border-t-sky-400', sub: 'Registered' },
                  { label: 'Live Devices', val: liveCount, accent: 'border-t-emerald-400', sub: 'Online Now' },
                  { label: 'Active Rooms', val: rooms.length, accent: 'border-t-amber-400', sub: 'Custom & PvP' },
                  { label: 'Tournaments', val: tournaments.length, accent: 'border-t-indigo-400', sub: 'Brackets' },
                  { label: 'Quiz Bank', val: allQuizzes.length, accent: 'border-t-yellow-400', sub: 'ဉာဏ်စမ်းပဟေဠိ' },
                  { label: 'Restricted', val: bannedCount, accent: 'border-t-rose-400', sub: 'Ban / Suspend' },
                ].map((kpi) => (
                  <div
                    key={kpi.label}
                    className={`cyber-panel rounded-2xl p-3.5 border-t-2 ${kpi.accent} space-y-1`}
                  >
                    <div className="text-[11px] font-semibold text-slate-400">{kpi.label}</div>
                    <div className="text-2xl font-display font-extrabold text-white tabular-nums">{kpi.val}</div>
                    <div className="text-[10px] text-slate-500">{kpi.sub}</div>
                  </div>
                ))}
              </div>

              {/* Quick Master Controls + Live Audit Log */}
              <div className="grid md:grid-cols-12 gap-4">
                <div className="md:col-span-5 cyber-panel rounded-2xl p-4 space-y-3">
                  <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                    <Power className="w-4 h-4" />
                    <span>Quick Master Controls</span>
                  </h3>

                  <div className="p-3 rounded-xl bg-[#070b14] border border-white/10 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-xs font-bold text-white">Global Maintenance Mode</div>
                      <div className="text-[11px] text-slate-400">
                        {engineConfig.maintenanceMode ? 'Player များ ယာယီပိတ်ထားသည်' : 'ဂိမ်း ပုံမှန်ဖွင့်ထားသည်'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        persistEngineConfig(
                          { ...engineConfig, maintenanceMode: !engineConfig.maintenanceMode },
                          !engineConfig.maintenanceMode
                            ? 'Maintenance Mode ဖွင့်လိုက်ပါပြီ!'
                            : 'Maintenance Mode ပိတ်ပြီး ဂိမ်းပြန်ဖွင့်လိုက်ပါပြီ!'
                        )
                      }
                      className={`px-3.5 py-2 rounded-xl text-xs font-extrabold cursor-pointer ${
                        engineConfig.maintenanceMode
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-300'
                      }`}
                    >
                      {engineConfig.maintenanceMode ? 'ON (Click to Open)' : 'LIVE (Click to Lock)'}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setSection('noti')}
                      className="p-3 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-400/30 text-xs font-bold text-amber-200 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Megaphone className="w-4 h-4" /> Broadcast Noti
                    </button>
                    <button
                      type="button"
                      onClick={handleExportBackup}
                      className="p-3 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-400/30 text-xs font-bold text-sky-200 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Database className="w-4 h-4" /> Backup JSON
                    </button>
                  </div>

                  <div className="p-3 rounded-xl bg-[#070b14] border border-white/10 text-[11px] space-y-1 text-slate-400">
                    <div className="flex justify-between">
                      <span>Firebase Project:</span>
                      <span className="font-mono text-emerald-300">{firebaseProjectId || 'Local Mode'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Win / Draw / Loss XP:</span>
                      <span className="font-mono text-amber-300">
                        +{engineConfig.xpRules.winXp} / +{engineConfig.xpRules.drawXp} / {engineConfig.xpRules.lossXp}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Quiz per Match:</span>
                      <span className="font-mono text-sky-300">{engineConfig.xpRules.quizCountPerMatch} Questions</span>
                    </div>
                  </div>
                </div>

                {/* Audit Logs Feed */}
                <div className="md:col-span-7 cyber-panel rounded-2xl p-4 space-y-3">
                  <h3 className="text-sm font-bold text-white flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-400" />
                      Recent Admin Audit Logs
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">Latest {auditLogs.length}</span>
                  </h3>
                  <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                    {auditLogs.length === 0 ? (
                      <div className="text-xs text-slate-500 text-center py-8">No admin actions logged yet.</div>
                    ) : (
                      auditLogs.map((log) => (
                        <div
                          key={log.id}
                          className="px-3 py-2 rounded-xl bg-[#070b14] border border-white/5 flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0 truncate">
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 font-mono text-[10px] mr-2">
                              {log.action}
                            </span>
                            <span className="text-slate-200">{log.detail}</span>
                          </div>
                          <span className="text-[10px] font-mono text-slate-500 shrink-0">
                            {new Date(log.createdAtMs || Date.now()).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==========================================================
              SECTION 2: USERS & LIVE DEVICES MANAGEMENT
          ========================================================== */}
          {section === 'users' && (
            <div className="cyber-panel rounded-2xl p-4 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {(['all', 'live', 'restricted'] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setUserFilter(f)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize cursor-pointer ${
                        userFilter === f ? 'cyber-gold-active text-amber-200' : 'bg-[#070b14] text-slate-400 border border-white/10'
                      }`}
                    >
                      {f === 'all' ? `All (${users.length})` : f === 'live' ? `🟢 Live (${liveCount})` : `🚫 Restricted (${bannedCount})`}
                    </button>
                  ))}
                </div>

                <div className="relative w-full sm:w-64">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="အမည် / ID / Device ရှာရန်..."
                    className="w-full h-9 pl-9 pr-3 rounded-xl bg-[#070b14] border border-white/15 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="space-y-2.5 max-h-[68vh] overflow-y-auto pr-1">
                {filteredUsers.map((u) => {
                  const live = isUserLiveNow(u);
                  return (
                    <div
                      key={u.id}
                      className={`p-3 rounded-2xl bg-[#080d17] border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                        live ? 'border-emerald-500/35' : 'border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <AvatarWithFrame
                          avatarUrl={u.avatarUrl}
                          frameId={u.frameId}
                          displayName={u.displayName}
                          size="md"
                          status={live ? 'online' : 'offline'}
                        />
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="font-bold text-sm text-white">{u.displayName}</span>
                            <span className="text-xs font-mono text-amber-400">({u.gameId})</span>
                            {live ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-300">
                                ● LIVE
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-400">
                                Offline
                              </span>
                            )}
                            {u.status && u.status !== 'active' && (
                              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-[10px] font-bold text-rose-300 uppercase">
                                {u.status}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 border border-white/10">
                              {renderDeviceIcon(u.deviceType)}
                              <span>{u.device || 'Web Client'}</span>
                            </span>
                            {u.screen && <span className="font-mono text-slate-400">{u.screen}</span>}
                            {u.currentActivity && live && (
                              <span className="text-sky-300 font-semibold">• {u.currentActivity}</span>
                            )}
                          </div>

                          <div className="text-[11px] font-mono text-slate-400">
                            XP: <b className="text-amber-300">{u.xp || 0}</b> ({u.rank || 'Silver'}) · {u.wins || 0}W / {u.losses || 0}L / {u.draws || 0}D
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => openPlayerEditor(u)}
                          className="px-3 py-1.5 rounded-lg cyber-gold-active text-[11px] font-bold text-amber-200 flex items-center gap-1 cursor-pointer"
                        >
                          <UserCog className="w-3.5 h-3.5" /> Manage
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNotiTarget(u.id);
                            setNotiType('message');
                            setNotiTitle('Admin မှ တိုက်ရိုက်စာ');
                            setSection('noti');
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/30 text-[11px] font-bold text-sky-200 flex items-center gap-1 cursor-pointer"
                        >
                          <Bell className="w-3 h-3" /> Message
                        </button>
                        {u.role !== 'admin' && live && (
                          <button
                            type="button"
                            onClick={() => handleForceKick(u)}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-400/30 text-[11px] font-bold text-rose-300 cursor-pointer"
                          >
                            Kick
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ==========================================================
              SECTION 3: GAME ENGINE, ECONOMY & MAINTENANCE CONTROLS
          ========================================================== */}
          {section === 'engine' && (
            <div className="space-y-4">
              {/* Maintenance Mode Card */}
              <div className="cyber-panel rounded-2xl p-4 space-y-3 border border-amber-500/25">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-amber-400" />
                      Global Maintenance Mode (ဂိမ်းတစ်ခုလုံး ယာယီပိတ်/ဖွင့်)
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      ဖွင့်ထားချိန်တွင် သာမန် Player များ ဂိမ်းဝင်မရတော့ဘဲ အောက်ပါ ကြေညာစာသားကိုသာ မြင်ရပါမည်။
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setEngineConfig((prev) => ({ ...prev, maintenanceMode: !prev.maintenanceMode }))
                    }
                    className={`px-4 py-2 rounded-xl text-xs font-extrabold cursor-pointer shrink-0 ${
                      engineConfig.maintenanceMode
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-white/10 text-slate-300'
                    }`}
                  >
                    {engineConfig.maintenanceMode ? 'ENABLED' : 'DISABLED'}
                  </button>
                </div>
                <input
                  type="text"
                  value={engineConfig.maintenanceMessage}
                  onChange={(e) =>
                    setEngineConfig((prev) => ({ ...prev, maintenanceMessage: e.target.value }))
                  }
                  className="w-full h-10 px-3.5 rounded-xl bg-[#070b14] border border-white/15 text-xs text-white"
                  placeholder="Maintenance Message..."
                />
              </div>

              {/* Feature & Game Locks */}
              <div className="cyber-panel rounded-2xl p-4 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-400" />
                  ဂိမ်းနှင့် စနစ်တစ်ခုချင်းစီ လော့ခ်ချ/ဖွင့် (Real-Time Feature Locks)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                  {[
                    { id: 'connect4', label: '၄ လုံးတန်း (Connect 4)' },
                    { id: 'tictactoe', label: 'Tic-Tac-Toe' },
                    { id: 'rps', label: 'ကျောက်တုံး စက္ကူ ကတ်ကြေး' },
                    { id: 'sakarhtar', label: 'ဉာဏ်စမ်းပဟေဠိ' },
                    { id: 'matchmaking', label: 'Ranked Matchmaking' },
                    { id: 'customRooms', label: 'Custom Rooms (1-8P)' },
                    { id: 'tournaments', label: 'Tournaments' },
                    { id: 'chat', label: 'In-Game Chat' },
                  ].map((item) => {
                    const locked = Boolean(engineConfig.featureLocks[item.id]);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() =>
                          setEngineConfig((prev) => ({
                            ...prev,
                            featureLocks: { ...prev.featureLocks, [item.id]: !locked },
                          }))
                        }
                        className={`p-3 rounded-xl border flex items-center justify-between gap-2 text-xs font-bold cursor-pointer transition-all ${
                          locked
                            ? 'bg-rose-500/15 border-rose-500/40 text-rose-200'
                            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                        }`}
                      >
                        <span className="truncate">{item.label}</span>
                        {locked ? <Lock className="w-4 h-4 shrink-0" /> : <Unlock className="w-4 h-4 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* XP Economy & Matchmaking Tuning */}
              <div className="cyber-panel rounded-2xl p-4 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  XP Economy နှင့် Matchmaking ချိန်ညှိမှု
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">အနိုင် XP (Win)</label>
                    <input
                      type="number"
                      value={engineConfig.xpRules.winXp}
                      onChange={(e) =>
                        setEngineConfig((p) => ({
                          ...p,
                          xpRules: { ...p.xpRules, winXp: Number(e.target.value) },
                        }))
                      }
                      className="w-full h-10 px-3 rounded-xl bg-[#070b14] border border-white/15 text-xs font-mono text-emerald-300"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">သရေ XP (Draw)</label>
                    <input
                      type="number"
                      value={engineConfig.xpRules.drawXp}
                      onChange={(e) =>
                        setEngineConfig((p) => ({
                          ...p,
                          xpRules: { ...p.xpRules, drawXp: Number(e.target.value) },
                        }))
                      }
                      className="w-full h-10 px-3 rounded-xl bg-[#070b14] border border-white/15 text-xs font-mono text-sky-300"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">အရှုံး XP (Loss)</label>
                    <input
                      type="number"
                      value={engineConfig.xpRules.lossXp}
                      onChange={(e) =>
                        setEngineConfig((p) => ({
                          ...p,
                          xpRules: { ...p.xpRules, lossXp: Number(e.target.value) },
                        }))
                      }
                      className="w-full h-10 px-3 rounded-xl bg-[#070b14] border border-white/15 text-xs font-mono text-rose-300"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">ဉာဏ်စမ်း တစ်ပွဲမေးခွန်း</label>
                    <select
                      value={engineConfig.xpRules.quizCountPerMatch}
                      onChange={(e) =>
                        setEngineConfig((p) => ({
                          ...p,
                          xpRules: { ...p.xpRules, quizCountPerMatch: Number(e.target.value) },
                        }))
                      }
                      className="w-full h-10 px-3 rounded-xl bg-[#070b14] border border-white/15 text-xs text-white"
                    >
                      <option value={5}>5 Questions</option>
                      <option value={10}>10 Questions</option>
                      <option value={15}>15 Questions</option>
                      <option value={20}>20 Questions</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Bot Fallback (Sec)</label>
                    <input
                      type="number"
                      min={3}
                      max={60}
                      value={engineConfig.matchmakingSettings.botFallbackSec}
                      onChange={(e) =>
                        setEngineConfig((p) => ({
                          ...p,
                          matchmakingSettings: {
                            ...p.matchmakingSettings,
                            botFallbackSec: Number(e.target.value),
                          },
                        }))
                      }
                      className="w-full h-10 px-3 rounded-xl bg-[#070b14] border border-white/15 text-xs font-mono text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Turn Timer (Sec)</label>
                    <input
                      type="number"
                      min={10}
                      max={60}
                      value={engineConfig.matchmakingSettings.defaultTurnTime}
                      onChange={(e) =>
                        setEngineConfig((p) => ({
                          ...p,
                          matchmakingSettings: {
                            ...p.matchmakingSettings,
                            defaultTurnTime: Number(e.target.value),
                          },
                        }))
                      }
                      className="w-full h-10 px-3 rounded-xl bg-[#070b14] border border-white/15 text-xs font-mono text-white"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  disabled={savingConfig}
                  onClick={() =>
                    persistEngineConfig(engineConfig, 'Game Engine နှင့် Economy စည်းမျဉ်းများ အသက်သွင်းပြီးပါပြီ!')
                  }
                  className="w-full sm:w-auto px-6 h-11 rounded-xl cyber-cta-gold text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{savingConfig ? 'Saving...' : 'Save & Apply Live to All Players'}</span>
                </button>
              </div>
            </div>
          )}

          {/* ==========================================================
              SECTION 4: TOURNAMENTS & LIVE ROOMS MONITOR
          ========================================================== */}
          {section === 'tournaments' && (
            <div className="grid md:grid-cols-12 gap-4">
              {/* Tournament Manager */}
              <div className="md:col-span-7 cyber-panel rounded-2xl p-4 space-y-4">
                <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                  <Trophy className="w-4 h-4" /> Knockout Tournament Creator & Manager
                </h3>

                <form onSubmit={handleCreateTournament} className="grid sm:grid-cols-12 gap-2">
                  <input
                    type="text"
                    required
                    value={tTitle}
                    onChange={(e) => setTTitle(e.target.value)}
                    placeholder="ပြိုင်ပွဲအမည် (ဥပမာ - MyanRena Grand Cup)"
                    className="sm:col-span-5 h-10 px-3 rounded-xl bg-[#070b14] border border-white/15 text-xs text-white"
                  />
                  <select
                    value={tGame}
                    onChange={(e) => setTGame(e.target.value)}
                    className="sm:col-span-3 h-10 px-2 rounded-xl bg-[#070b14] border border-white/15 text-xs text-white"
                  >
                    <option value="connect4">Connect 4</option>
                    <option value="tictactoe">Tic-Tac-Toe</option>
                    <option value="rps">RPS</option>
                    <option value="sakarhtar">ဉာဏ်စမ်းပဟေဠိ</option>
                  </select>
                  <select
                    value={tBracket}
                    onChange={(e) => setTBracket(Number(e.target.value) as 8 | 16 | 32)}
                    className="sm:col-span-2 h-10 px-2 rounded-xl bg-[#070b14] border border-white/15 text-xs text-white"
                  >
                    <option value={8}>8P</option>
                    <option value={16}>16P</option>
                    <option value={32}>32P</option>
                  </select>
                  <input
                    type="number"
                    value={tPrizeXp}
                    onChange={(e) => setTPrizeXp(Number(e.target.value))}
                    className="sm:col-span-2 h-10 px-2 rounded-xl bg-[#070b14] border border-white/15 text-xs font-mono text-amber-300"
                    title="Prize XP"
                  />
                  <button
                    type="submit"
                    className="sm:col-span-12 h-10 rounded-xl cyber-cta-gold text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> ပြိုင်ပွဲအသစ် ဖန်တီးမည်
                  </button>
                </form>

                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {tournaments.length === 0 ? (
                    <div className="text-xs text-slate-500 text-center py-6">ပြိုင်ပွဲ ဖန်တီးထားခြင်း မရှိသေးပါ။</div>
                  ) : (
                    tournaments.map((tr) => (
                      <div
                        key={tr.id}
                        className="p-3 rounded-xl bg-[#070b14] border border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs"
                      >
                        <div>
                          <div className="font-bold text-white">{tr.title}</div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {tr.gameType} · {(tr.participants || []).length}/{tr.bracketSize} Players · Prize +{tr.prizeXp} XP
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {(['open', 'ongoing', 'completed'] as const).map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() => handleTournamentStatus(tr.id, st)}
                              className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase cursor-pointer ${
                                tr.status === st ? 'bg-amber-500 text-slate-950' : 'bg-white/5 text-slate-400'
                              }`}
                            >
                              {st}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() => handleDeleteTournament(tr.id)}
                            className="p-1.5 rounded-lg bg-rose-500/20 text-rose-300 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Live Active Rooms Monitor */}
              <div className="md:col-span-5 cyber-panel rounded-2xl p-4 space-y-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Swords className="w-4 h-4 text-sky-400" />
                  Live Active Rooms ({rooms.length})
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {rooms.length === 0 ? (
                    <div className="text-xs text-slate-500 text-center py-8">လက်ရှိ ဖွင့်ထားသော Room မရှိပါ။</div>
                  ) : (
                    rooms.map((rm) => (
                      <div
                        key={rm.id}
                        className="p-3 rounded-xl bg-[#070b14] border border-white/10 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-mono font-bold text-amber-300">
                            {rm.code} <span className="text-white font-sans">({rm.gameType})</span>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Players: {(rm.players || []).length}/{rm.maxPlayers || 8} · Status: {rm.status}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCloseRoom(rm.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-[11px] font-bold text-rose-300 cursor-pointer shrink-0"
                        >
                          Close
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ==========================================================
              SECTION 5: ဉာဏ်စမ်းပဟေဠိ (100+ QUIZ BANK CMS)
          ========================================================== */}
          {section === 'quiz' && (
            <div className="cyber-panel rounded-2xl p-4 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  ဉာဏ်စမ်းပဟေဠိ မေးခွန်းဘဏ် (စုစုပေါင်း {allQuizzes.length} ပုဒ်)
                </h3>
                <div className="flex gap-2">
                  <select
                    value={quizCatFilter}
                    onChange={(e) => setQuizCatFilter(e.target.value as any)}
                    className="h-9 px-2.5 rounded-xl bg-[#070b14] border border-white/15 text-xs text-white"
                  >
                    <option value="all">All Categories</option>
                    <option value="riddle">စကားထာ</option>
                    <option value="myanmar">မြန်မာ့ဗဟုသုတ</option>
                    <option value="science">သိပ္ပံ</option>
                    <option value="general">အထွေထွေ</option>
                  </select>
                  <input
                    type="text"
                    value={quizSearch}
                    onChange={(e) => setQuizSearch(e.target.value)}
                    placeholder="မေးခွန်း ရှာရန်..."
                    className="h-9 px-3 rounded-xl bg-[#070b14] border border-white/15 text-xs text-white w-44"
                  />
                </div>
              </div>

              <form onSubmit={handleAddQuiz} className="p-3.5 rounded-xl bg-[#070b14] border border-white/10 space-y-2.5">
                <div className="grid sm:grid-cols-12 gap-2">
                  <input
                    type="text"
                    value={newQ}
                    onChange={(e) => setNewQ(e.target.value)}
                    placeholder="မေးခွန်းအသစ် ရေးထည့်ပါ..."
                    className="sm:col-span-9 h-10 px-3 rounded-xl bg-[#101728] border border-white/15 text-xs text-white"
                  />
                  <select
                    value={newQCat}
                    onChange={(e) => setNewQCat(e.target.value as any)}
                    className="sm:col-span-3 h-10 px-2.5 rounded-xl bg-[#101728] border border-white/15 text-xs text-white"
                  >
                    <option value="riddle">စကားထာ</option>
                    <option value="myanmar">မြန်မာ့ဗဟုသုတ</option>
                    <option value="science">သိပ္ပံ</option>
                    <option value="general">အထွေထွေ</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <input value={newOpt0} onChange={(e) => setNewOpt0(e.target.value)} placeholder="အဖြေ (1)" className="h-9 px-3 rounded-lg bg-[#101728] border border-white/10 text-xs text-white" />
                  <input value={newOpt1} onChange={(e) => setNewOpt1(e.target.value)} placeholder="အဖြေ (2)" className="h-9 px-3 rounded-lg bg-[#101728] border border-white/10 text-xs text-white" />
                  <input value={newOpt2} onChange={(e) => setNewOpt2(e.target.value)} placeholder="အဖြေ (3)" className="h-9 px-3 rounded-lg bg-[#101728] border border-white/10 text-xs text-white" />
                  <input value={newOpt3} onChange={(e) => setNewOpt3(e.target.value)} placeholder="အဖြေ (4)" className="h-9 px-3 rounded-lg bg-[#101728] border border-white/10 text-xs text-white" />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-slate-300">
                    <span>အဖြေမှန် နံပါတ်:</span>
                    {[0, 1, 2, 3].map((idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setNewAnsIdx(idx)}
                        className={`w-8 h-8 rounded-lg font-bold cursor-pointer ${
                          newAnsIdx === idx ? 'bg-emerald-500 text-slate-950' : 'bg-white/10 text-slate-300'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>
                  <button
                    type="submit"
                    className="h-9 px-5 rounded-xl cyber-cta-gold text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> မေးခွန်းအသစ် ထည့်မည်
                  </button>
                </div>
              </form>

              <div className="max-h-80 overflow-y-auto space-y-1.5 pr-1">
                {filteredQuizzes.map((r, i) => (
                  <div
                    key={r.id || i}
                    className="p-2.5 rounded-xl bg-[#070b14] border border-white/5 flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0 truncate">
                      <span className="text-amber-400 font-mono mr-2">#{i + 1}</span>
                      <span className="text-white">{r.question}</span>
                      <span className="text-emerald-400 ml-2 font-semibold">
                        ✓ {r.options?.[r.answerIndex]}
                      </span>
                    </div>
                    {String(r.id).startsWith('custom_') && (
                      <button
                        type="button"
                        onClick={() => handleDeleteQuiz(r.id)}
                        className="text-rose-400 hover:text-rose-300 cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ==========================================================
              SECTION 6: REAL-TIME NOTIFICATION & BROADCAST CENTER
          ========================================================== */}
          {section === 'noti' && (
            <div className="grid md:grid-cols-2 gap-4">
              <form onSubmit={handleSendNotification} className="cyber-panel rounded-2xl p-4 space-y-3">
                <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                  <Megaphone className="w-4 h-4" /> Real-Time Notification & Broadcast
                </h3>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">လက်ခံမည့်သူ</label>
                  <select
                    value={notiTarget}
                    onChange={(e) => setNotiTarget(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[#070b14] border border-white/15 text-xs text-white"
                  >
                    <option value="ALL">📢 User အားလုံးထံ (Broadcast to ALL)</option>
                    {users
                      .filter((u) => u.role !== 'admin')
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          👤 {u.displayName} ({u.gameId}) {isUserLiveNow(u) ? '🟢 LIVE' : ''}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">အမျိုးအစား</label>
                    <select
                      value={notiType}
                      onChange={(e) => setNotiType(e.target.value as any)}
                      className="w-full h-10 px-3 rounded-xl bg-[#070b14] border border-white/15 text-xs text-white"
                    >
                      <option value="broadcast">📢 ကြေညာချက်</option>
                      <option value="message">💬 တိုက်ရိုက်စာ</option>
                      <option value="warning">⚠️ သတိပေးချက်</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">ခေါင်းစဉ်</label>
                    <input
                      type="text"
                      value={notiTitle}
                      onChange={(e) => setNotiTitle(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl bg-[#070b14] border border-white/15 text-xs text-white"
                    />
                  </div>
                </div>

                <textarea
                  rows={4}
                  required
                  value={notiMessage}
                  onChange={(e) => setNotiMessage(e.target.value)}
                  placeholder="User များထံ ချက်ချင်းပြသမည့် စာသား ရေးပါ..."
                  className="w-full p-3 rounded-xl bg-[#070b14] border border-white/15 text-xs text-white focus:outline-none focus:border-amber-400"
                />

                <button
                  type="submit"
                  disabled={sendingNoti}
                  className="w-full h-11 rounded-xl cyber-cta-gold text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>{sendingNoti ? 'ပေးပို့နေသည်...' : 'Real-Time ချက်ချင်းပို့မည်'}</span>
                </button>
              </form>

              <div className="cyber-panel rounded-2xl p-4 space-y-3">
                <h3 className="text-sm font-bold text-white">
                  Sent Notification History ({notiHistory.length})
                </h3>
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {notiHistory.map((n) => (
                    <div
                      key={n.id}
                      className="p-3 rounded-xl bg-[#070b14] border border-white/10 text-xs flex items-start justify-between gap-2"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-amber-300">{n.title}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
                            {n.targetUserId === 'ALL' ? 'ALL' : n.targetUserId}
                          </span>
                        </div>
                        <p className="text-slate-200">{n.message}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteNotification(n.id)}
                        className="text-rose-400 hover:text-rose-300 cursor-pointer shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ==========================================================
              SECTION 7: BRANDING & LANDING CMS
          ========================================================== */}
          {section === 'cms' && (
            <form onSubmit={handleSaveCms} className="cyber-panel rounded-2xl p-4 space-y-4">
              <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                <Palette className="w-4 h-4" /> Website Branding & Bilingual Text CMS
              </h3>

              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Hero Title (မြန်မာ)</label>
                  <input
                    type="text"
                    value={cmsDraft.heroTitleMy || ''}
                    onChange={(e) => setCmsDraft({ ...cmsDraft, heroTitleMy: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-[#070b14] border border-white/15 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Hero Title (English)</label>
                  <input
                    type="text"
                    value={cmsDraft.heroTitleEn || ''}
                    onChange={(e) => setCmsDraft({ ...cmsDraft, heroTitleEn: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl bg-[#070b14] border border-white/15 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Hero Subtitle (မြန်မာ)</label>
                  <textarea
                    rows={2}
                    value={cmsDraft.heroSubtitleMy || ''}
                    onChange={(e) => setCmsDraft({ ...cmsDraft, heroSubtitleMy: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-[#070b14] border border-white/15 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Hero Subtitle (English)</label>
                  <textarea
                    rows={2}
                    value={cmsDraft.heroSubtitleEn || ''}
                    onChange={(e) => setCmsDraft({ ...cmsDraft, heroSubtitleEn: e.target.value })}
                    className="w-full p-2.5 rounded-xl bg-[#070b14] border border-white/15 text-xs text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="px-6 h-11 rounded-xl cyber-cta-gold text-slate-950 font-extrabold text-xs flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" /> Save Branding Live
              </button>
            </form>
          )}
        </section>
      </div>

      {/* ==========================================================
          FULL PLAYER EDITOR & MODERATION MODAL
      ========================================================== */}
      <AnimatePresence>
        {editingUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-lg rounded-2xl cyber-panel border border-amber-400/50 p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2.5">
                  <AvatarWithFrame
                    avatarUrl={editingUser.avatarUrl}
                    frameId={editDraft.frameId}
                    displayName={editDraft.displayName}
                    size="sm"
                  />
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                      {editingUser.displayName}
                    </h3>
                    <div className="text-[11px] font-mono text-amber-400">
                      {editingUser.gameId} · @{editingUser.username}
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

              {editingUser.recoveryPin && (
                <div className="p-2.5 rounded-xl bg-[#070b14] border border-amber-400/25 flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" /> Backup Recovery PIN:
                  </span>
                  <span className="font-mono font-bold text-amber-300 tracking-widest">
                    {editingUser.recoveryPin}
                  </span>
                </div>
              )}

              <form onSubmit={handleSavePlayerEdit} className="space-y-3">
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Display Name</label>
                    <input
                      type="text"
                      value={editDraft.displayName}
                      onChange={(e) => setEditDraft({ ...editDraft, displayName: e.target.value })}
                      className="w-full h-9 px-3 rounded-xl bg-[#070b14] border border-white/15 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">XP (Auto Rank)</label>
                    <input
                      type="number"
                      value={editDraft.xp}
                      onChange={(e) => setEditDraft({ ...editDraft, xp: Number(e.target.value) })}
                      className="w-full h-9 px-3 rounded-xl bg-[#070b14] border border-white/15 text-xs font-mono text-amber-300"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Wins</label>
                    <input
                      type="number"
                      value={editDraft.wins}
                      onChange={(e) => setEditDraft({ ...editDraft, wins: Number(e.target.value) })}
                      className="w-full h-9 px-3 rounded-xl bg-[#070b14] border border-white/15 text-xs font-mono text-emerald-300"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Losses</label>
                    <input
                      type="number"
                      value={editDraft.losses}
                      onChange={(e) => setEditDraft({ ...editDraft, losses: Number(e.target.value) })}
                      className="w-full h-9 px-3 rounded-xl bg-[#070b14] border border-white/15 text-xs font-mono text-rose-300"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Draws</label>
                    <input
                      type="number"
                      value={editDraft.draws}
                      onChange={(e) => setEditDraft({ ...editDraft, draws: Number(e.target.value) })}
                      className="w-full h-9 px-3 rounded-xl bg-[#070b14] border border-white/15 text-xs font-mono text-sky-300"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Profile Frame</label>
                    <select
                      value={editDraft.frameId}
                      onChange={(e) => setEditDraft({ ...editDraft, frameId: e.target.value })}
                      className="w-full h-9 px-2.5 rounded-xl bg-[#070b14] border border-white/15 text-xs text-white"
                    >
                      {SVG_FRAME_TEMPLATES.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.badgeIcon} {f.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Account Status</label>
                    <select
                      value={editDraft.status}
                      onChange={(e) => setEditDraft({ ...editDraft, status: e.target.value })}
                      className="w-full h-9 px-2.5 rounded-xl bg-[#070b14] border border-white/15 text-xs text-white"
                    >
                      <option value="active">🟢 Active</option>
                      <option value="warned">⚠️ Warned</option>
                      <option value="suspended">⏳ Suspended</option>
                      <option value="banned">🚫 Banned</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Reset Password (Optional — leave blank to keep current)
                  </label>
                  <input
                    type="text"
                    value={editDraft.newPassword}
                    onChange={(e) => setEditDraft({ ...editDraft, newPassword: e.target.value })}
                    placeholder="စကားဝှက်အသစ် (အနည်းဆုံး ၄ လုံး)"
                    className="w-full h-9 px-3 rounded-xl bg-[#070b14] border border-white/15 text-xs text-white"
                  />
                </div>

                {/* Timed Suspend Buttons */}
                {editingUser.role !== 'admin' && (
                  <div className="space-y-1.5 pt-1">
                    <div className="text-[11px] text-slate-400">Timed Quick Suspend:</div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { label: '15m', m: 15 },
                        { label: '1h', m: 60 },
                        { label: '24h', m: 1440 },
                        { label: '7d', m: 10080 },
                      ].map((opt) => (
                        <button
                          key={opt.label}
                          type="button"
                          onClick={() => handleTimedSuspend(editingUser, opt.m)}
                          className="py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/30 text-[11px] font-bold text-amber-200 cursor-pointer"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
                  {editingUser.role !== 'admin' ? (
                    <button
                      type="button"
                      onClick={() => handleDeleteUser(editingUser)}
                      className="px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/30 text-xs font-bold text-rose-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete Account
                    </button>
                  ) : (
                    <span />
                  )}

                  <button
                    type="submit"
                    className="px-5 h-10 rounded-xl cyber-cta-gold text-slate-950 font-extrabold text-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="w-4 h-4" /> Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
