import React from 'react';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  Ban,
  Bell,
  BookOpen,
  CheckCircle2,
  Gamepad2,
  Lock,
  LogOut,
  Megaphone,
  Monitor,
  Plus,
  Send,
  ShieldAlert,
  Smartphone,
  Tablet,
  Trash2,
  Trophy,
  Unlock,
  Users,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { QUIZ_BANK_100 } from '../data/quizBank100.ts';
import { db, firebaseInitError, firebaseProjectId, isFirebaseConfigured, stripUndefined } from '../lib/firebase.ts';
import { broadcastLocalSync, readServerlessStore, SYNC_CHANNEL_NAME, writeServerlessStore } from '../lib/serverlessApi.ts';
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

type AdminTab = 'users' | 'noti' | 'quiz' | 'controls';

export const AdminPanel: React.FC<AdminPanelProps> = ({
  livePingMs,
  lang,
  onChangeLang,
  onSwitchToLobby,
  onLogout,
  onNotify,
}) => {
  const [tab, setTab] = React.useState<AdminTab>('users');
  const [users, setUsers] = React.useState<any[]>([]);
  const [notiHistory, setNotiHistory] = React.useState<any[]>([]);
  const [riddles, setRiddles] = React.useState<any[]>(QUIZ_BANK_100);
  const [featureLocks, setFeatureLocks] = React.useState<Record<string, boolean>>({});
  const [cloudStatus, setCloudStatus] = React.useState<'connected' | 'error' | 'offline'>(
    isFirebaseConfigured ? 'connected' : 'offline'
  );
  const [cloudErrText, setCloudErrText] = React.useState<string>(firebaseInitError || '');
  const [nowMs, setNowMs] = React.useState(() => Date.now());

  // Notification Form
  const [notiTarget, setNotiTarget] = React.useState<string>('ALL');
  const [notiType, setNotiType] = React.useState<'broadcast' | 'message' | 'warning'>('broadcast');
  const [notiTitle, setNotiTitle] = React.useState<string>('Admin ကြေညာချက်');
  const [notiMessage, setNotiMessage] = React.useState<string>('');
  const [sendingNoti, setSendingNoti] = React.useState<boolean>(false);

  // Add Quiz Form
  const [newQ, setNewQ] = React.useState('');
  const [newOpts, setNewOpts] = React.useState('');
  const [newAnsIdx, setNewAnsIdx] = React.useState(0);

  // Update "Live Now" indicator every 5 seconds
  React.useEffect(() => {
    const t = window.setInterval(() => setNowMs(Date.now()), 5000);
    return () => window.clearInterval(t);
  }, []);

  // Direct Real-Time Firestore Subscription (No REST Polling Delay!)
  React.useEffect(() => {
    const syncLocal = () => {
      const store = readServerlessStore();
      setUsers(Object.values(store.users).sort((a: any, b: any) => (b.lastSeenMs || 0) - (a.lastSeenMs || 0)));
      setNotiHistory(
        (store.notifications || []).sort((a: any, b: any) => (b.createdAtMs || 0) - (a.createdAtMs || 0))
      );
      setFeatureLocks(store.featureLocks || {});
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

    const unsubRiddles = onSnapshot(collection(db, 'riddles'), (snap) => {
      const custom: any[] = [];
      snap.forEach((d) => custom.push({ ...d.data(), id: d.id }));
      setRiddles([...custom, ...QUIZ_BANK_100]);
    });

    const unsubConfig = onSnapshot(doc(db, 'system', 'config'), (snap) => {
      if (snap.exists()) {
        const cfg = snap.data() as any;
        if (cfg.featureLocks) setFeatureLocks(cfg.featureLocks);
      }
    });

    return () => {
      window.removeEventListener('storage', syncLocal);
      ch?.close();
      unsubUsers();
      unsubNotis();
      unsubRiddles();
      unsubConfig();
    };
  }, []);

  const isUserLiveNow = (u: any) => {
    if (!u.online) return false;
    if (!u.lastSeenMs) return false;
    return nowMs - Number(u.lastSeenMs) < 45000;
  };

  const liveOnlineCount = users.filter(isUserLiveNow).length;

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notiMessage.trim()) return;
    setSendingNoti(true);
    try {
      const id = `noti_${Date.now()}_${Math.floor(Math.random() * 999)}`;
      const payload = stripUndefined({
        id,
        targetUserId: notiTarget,
        title: notiTitle.trim() || 'Admin Notification',
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
      onNotify(
        'success',
        notiTarget === 'ALL'
          ? 'User အားလုံးထံ Real-Time Noti ပေးပို့ပြီးပါပြီ!'
          : 'ရွေးချယ်ထားသော User ထံ Real-Time Noti ပေးပို့ပြီးပါပြီ!'
      );
    } catch (err: any) {
      onNotify('error', `Noti ပို့ရာတွင် Error တက်ပါသည်: ${err?.message || 'Unknown'}`);
    } finally {
      setSendingNoti(false);
    }
  };

  const handleModerate = async (
    targetUser: any,
    updates: Record<string, any>,
    toastMsg: string
  ) => {
    try {
      const clean = stripUndefined(updates);
      const store = readServerlessStore();
      if (store.users[targetUser.id]) {
        store.users[targetUser.id] = { ...store.users[targetUser.id], ...clean };
        writeServerlessStore(store);
      }
      if (isFirebaseConfigured && db) {
        await setDoc(doc(db, 'users', targetUser.id), clean, { merge: true });
      }
      broadcastLocalSync('USER_MODERATED');
      onNotify('success', toastMsg);
    } catch (err: any) {
      onNotify('error', err?.message || 'Moderation failed');
    }
  };

  const handleToggleLock = async (gameId: string) => {
    const nextLocks = { ...featureLocks, [gameId]: !featureLocks[gameId] };
    setFeatureLocks(nextLocks);
    const store = readServerlessStore();
    store.featureLocks = nextLocks;
    writeServerlessStore(store);
    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, 'system', 'config'), { featureLocks: nextLocks }, { merge: true }).catch(() => {});
    }
    onNotify('info', `${gameId.toUpperCase()} lock updated.`);
  };

  const handleAddQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    const opts = newOpts.split(',').map((s) => s.trim()).filter(Boolean);
    if (!newQ.trim() || opts.length < 2) {
      onNotify('error', 'မေးခွန်းနှင့် ရွေးချယ်စရာ အနည်းဆုံး ၂ ခု (ကော်မာခံ၍) ထည့်ပါ။');
      return;
    }
    const id = `custom_quiz_${Date.now()}`;
    const item = stripUndefined({
      id,
      category: 'general',
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
    setNewOpts('');
    onNotify('success', 'ဉာဏ်စမ်းပဟေဠိ မေးခွန်းအသစ် ထည့်သွင်းပြီးပါပြီ!');
  };

  const handleDeleteCustomQuiz = async (id: string) => {
    if (!id.startsWith('custom_')) return;
    if (isFirebaseConfigured && db) {
      await deleteDoc(doc(db, 'riddles', id)).catch(() => {});
    }
    onNotify('info', 'မေးခွန်း ဖျက်ပြီးပါပြီ။');
  };

  const renderDeviceIcon = (type?: string) => {
    if (type === 'Mobile') return <Smartphone className="w-3.5 h-3.5 text-sky-400" />;
    if (type === 'Tablet') return <Tablet className="w-3.5 h-3.5 text-purple-400" />;
    return <Monitor className="w-3.5 h-3.5 text-amber-400" />;
  };

  return (
    <div className="min-h-dvh-safe cyber-bg text-slate-100 flex flex-col">
      {/* Top Admin Header */}
      <header className="sticky top-0 z-30 border-b border-amber-500/25 bg-[#080c15]/95 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="vanguard-brand-box px-2.5 py-1 rounded-lg text-xs sm:text-sm font-extrabold text-amber-300 flex items-center gap-1.5 shrink-0">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <span>ADMIN CORE</span>
            </div>
            <span className="hidden md:inline text-xs font-mono text-emerald-400">
              ● {liveOnlineCount} Live Devices / {users.length} Total Users
            </span>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <LanguageSwitcher lang={lang} onChange={onChangeLang} />
            <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono px-2.5 py-1.5 rounded-lg bg-[#0d1322] border border-emerald-500/25 text-emerald-300">
              <Wifi className="w-3 h-3" /> {livePingMs}ms
            </div>
            <button
              type="button"
              onClick={onSwitchToLobby}
              className="h-9 px-3 rounded-xl cyber-cta-gold text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              <span>Game Lobby</span>
            </button>
            <button
              type="button"
              onClick={onLogout}
              className="w-9 h-9 rounded-xl bg-[#0d1322] border border-white/10 hover:bg-rose-500/20 text-rose-300 flex items-center justify-center cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 space-y-4">
        {/* Cloud Firestore Live Diagnostic Banner */}
        <div
          className={`p-3 rounded-2xl border flex flex-wrap items-center justify-between gap-2 text-xs ${
            cloudStatus === 'connected'
              ? 'bg-emerald-500/10 border-emerald-500/35 text-emerald-200'
              : 'bg-rose-500/15 border-rose-500/40 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {cloudStatus === 'connected' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <WifiOff className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>
              {cloudStatus === 'connected'
                ? `Cloud Real-Time Sync Active — Firebase Project: ${firebaseProjectId}`
                : `Cloud Sync ချိတ်ဆက်မှု မအောင်မြင်သေးပါ: ${cloudErrText || 'firebase-applet-config.json နှင့် Firestore Rules ကို စစ်ဆေးပါ'}`}
            </span>
          </div>
          <span className="font-mono text-[11px] opacity-80">
            Users: {users.length} | Live: {liveOnlineCount}
          </span>
        </div>

        {/* Admin Navigation Tabs */}
        <div className="grid grid-cols-4 gap-2 p-1.5 rounded-2xl cyber-panel">
          {[
            { id: 'users', label: `👥 Users & Devices (${users.length})` },
            { id: 'noti', label: '📢 Noti / စာပို့ရန်' },
            { id: 'quiz', label: `🦉 ဉာဏ်စမ်း (${riddles.length})` },
            { id: 'controls', label: '⚙️ Server Controls' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id as AdminTab)}
              className={`py-2.5 px-2 rounded-xl text-[11px] sm:text-xs font-bold transition-all cursor-pointer truncate ${
                tab === item.id ? 'cyber-gold-active text-amber-200' : 'text-slate-400 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* TAB 1: REAL-TIME USERS & LIVE DEVICE MONITOR */}
        {tab === 'users' && (
          <div className="cyber-panel rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                <span>Real-Time Login ဝင်ထားသော User များနှင့် Device စာရင်း</span>
              </h2>
              <span className="text-xs text-emerald-400 font-semibold">Auto-Syncing</span>
            </div>

            <div className="space-y-2.5">
              {users.map((u) => {
                const live = isUserLiveNow(u);
                const lastSeenLabel = u.lastSeenMs
                  ? new Date(u.lastSeenMs).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                  : 'N/A';

                return (
                  <div
                    key={u.id}
                    className={`p-3 rounded-2xl bg-[#090d16] border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
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
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-white">{u.displayName}</span>
                          <span className="text-xs font-mono text-amber-400">({u.gameId})</span>
                          {live ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-[10px] font-bold text-emerald-300">
                              ● LIVE NOW
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-400">
                              Offline ({lastSeenLabel})
                            </span>
                          )}
                          {u.status && u.status !== 'active' && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-[10px] font-bold text-rose-300 uppercase">
                              {u.status}
                            </span>
                          )}
                        </div>

                        {/* Live Device Details */}
                        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 border border-white/10">
                            {renderDeviceIcon(u.deviceType)}
                            <span>{u.device || `${u.deviceType || 'Device'} (${u.os || 'OS'} • ${u.browser || 'Browser'})`}</span>
                          </span>
                          {u.screen && (
                            <span className="text-slate-400 font-mono">Screen: {u.screen}</span>
                          )}
                          {u.currentActivity && live && (
                            <span className="text-sky-300 font-semibold">• {u.currentActivity}</span>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-400 font-mono">
                          XP: <b className="text-amber-300">{u.xp || 0}</b> ({u.rank || 'Silver'}) • {u.wins || 0}W / {u.losses || 0}L
                        </div>
                      </div>
                    </div>

                    {/* Direct Moderation & Instant Noti Actions */}
                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setNotiTarget(u.id);
                          setNotiType('message');
                          setNotiTitle('Admin မှ တိုက်ရိုက်စာ');
                          setTab('noti');
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/35 text-[11px] font-bold text-sky-200 flex items-center gap-1 cursor-pointer"
                      >
                        <Bell className="w-3 h-3" /> Noti ပို့
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleModerate(u, { xp: (u.xp || 1000) + 100 }, `${u.displayName} ကို +100 XP ပေးပြီးပါပြီ`)
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-[11px] font-bold text-emerald-300 cursor-pointer"
                      >
                        +100 XP
                      </button>

                      {u.role !== 'admin' && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              handleModerate(
                                u,
                                { status: u.status === 'banned' ? 'active' : 'banned' },
                                u.status === 'banned' ? 'Unban ပြီးပါပြီ' : 'Ban ပြီးပါပြီ'
                              )
                            }
                            className="px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-[11px] font-bold text-rose-300 flex items-center gap-1 cursor-pointer"
                          >
                            <Ban className="w-3 h-3" />
                            {u.status === 'banned' ? 'Unban' : 'Ban'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: REAL-TIME NOTIFICATION & BROADCAST CENTER */}
        {tab === 'noti' && (
          <div className="grid md:grid-cols-2 gap-4">
            <form onSubmit={handleSendNotification} className="cyber-panel rounded-2xl p-4 space-y-3">
              <h2 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                <Megaphone className="w-4 h-4" />
                <span>User များထံ Real-Time Notification / စာပို့ရန်</span>
              </h2>

              <div>
                <label className="block text-xs text-slate-400 mb-1">လက်ခံမည့်သူ ရွေးချယ်ရန်</label>
                <select
                  value={notiTarget}
                  onChange={(e) => setNotiTarget(e.target.value)}
                  className="w-full h-10 px-3 rounded-xl bg-[#070b14] border border-white/15 text-xs text-white"
                >
                  <option value="ALL">📢 User အားလုံးထံ (Broadcast to All Players)</option>
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
                    <option value="warning">⚠️ သတိပေးချက် (Warning)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">ခေါင်းစဉ် (Title)</label>
                  <input
                    type="text"
                    value={notiTitle}
                    onChange={(e) => setNotiTitle(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[#070b14] border border-white/15 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">ပေးပို့မည့် စာသား</label>
                <textarea
                  rows={3}
                  required
                  value={notiMessage}
                  onChange={(e) => setNotiMessage(e.target.value)}
                  placeholder="User များထံ ချက်ချင်းပြသမည့် Notification စာသား ရေးပါ..."
                  className="w-full p-3 rounded-xl bg-[#070b14] border border-white/15 text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <button
                type="submit"
                disabled={sendingNoti}
                className="w-full h-11 rounded-xl cyber-cta-gold text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>{sendingNoti ? 'ပေးပို့နေသည်...' : 'Real-Time Notification ချက်ချင်းပို့မည်'}</span>
              </button>
            </form>

            {/* Live Sent Notifications Log */}
            <div className="cyber-panel rounded-2xl p-4 space-y-3">
              <h3 className="text-sm font-bold text-white">ပေးပို့ပြီးသော Notification မှတ်တမ်း ({notiHistory.length})</h3>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {notiHistory.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-8">Notification ပေးပို့ထားခြင်း မရှိသေးပါ။</p>
                ) : (
                  notiHistory.map((n) => (
                    <div key={n.id} className="p-3 rounded-xl bg-[#090d16] border border-white/10 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-300">{n.title}</span>
                        <span className="text-[10px] text-slate-400">
                          {n.targetUserId === 'ALL' ? 'All Users' : n.targetUserId}
                        </span>
                      </div>
                      <p className="text-slate-200">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: 100+ QUIZ MANAGER */}
        {tab === 'quiz' && (
          <div className="cyber-panel rounded-2xl p-4 space-y-4">
            <h2 className="text-sm font-bold text-amber-300 flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              <span>ဉာဏ်စမ်းပဟေဠိ မေးခွန်းများ စီမံရန် (စုစုပေါင်း {riddles.length} ပုဒ်)</span>
            </h2>

            <form onSubmit={handleAddQuiz} className="grid sm:grid-cols-12 gap-2">
              <input
                type="text"
                value={newQ}
                onChange={(e) => setNewQ(e.target.value)}
                placeholder="မေးခွန်းအသစ် ရေးပါ..."
                className="sm:col-span-5 h-10 px-3 rounded-xl bg-[#070b14] border border-white/15 text-xs text-white"
              />
              <input
                type="text"
                value={newOpts}
                onChange={(e) => setNewOpts(e.target.value)}
                placeholder="ရွေးချယ်စရာ ၄ ခု (ကော်မာခံပါ)"
                className="sm:col-span-4 h-10 px-3 rounded-xl bg-[#070b14] border border-white/15 text-xs text-white"
              />
              <input
                type="number"
                min={0}
                max={3}
                value={newAnsIdx}
                onChange={(e) => setNewAnsIdx(Number(e.target.value))}
                className="sm:col-span-1 h-10 px-2 rounded-xl bg-[#070b14] border border-white/15 text-xs text-white text-center"
                title="အဖြေမှန် Index (0-3)"
              />
              <button
                type="submit"
                className="sm:col-span-2 h-10 rounded-xl cyber-cta-gold text-slate-950 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> ထည့်မည်
              </button>
            </form>

            <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1">
              {riddles.map((r, i) => (
                <div
                  key={r.id || i}
                  className="p-2.5 rounded-xl bg-[#090d16] border border-white/10 flex items-center justify-between gap-2 text-xs"
                >
                  <div className="truncate">
                    <span className="text-amber-400 font-mono mr-2">#{i + 1}</span>
                    <span className="text-white">{r.question}</span>
                    <span className="text-emerald-400 ml-2">({r.options?.[r.answerIndex]})</span>
                  </div>
                  {String(r.id).startsWith('custom_') && (
                    <button
                      type="button"
                      onClick={() => handleDeleteCustomQuiz(r.id)}
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

        {/* TAB 4: SERVER FEATURE LOCKS */}
        {tab === 'controls' && (
          <div className="cyber-panel rounded-2xl p-4 space-y-3">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>ဂိမ်းများ လော့ခ်ချ/ဖွင့် ထိန်းချုပ်မှု (Real-Time Feature Locks)</span>
            </h2>
            <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { id: 'connect4', label: '၄ လုံးတန်း (Connect 4)' },
                { id: 'tictactoe', label: 'Tic-Tac-Toe' },
                { id: 'rps', label: 'ကျောက်တုံး စက္ကူ ကတ်ကြေး' },
                { id: 'sakarhtar', label: 'ဉာဏ်စမ်းပဟေဠိ' },
              ].map((g) => {
                const locked = Boolean(featureLocks[g.id]);
                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => handleToggleLock(g.id)}
                    className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-bold cursor-pointer ${
                      locked
                        ? 'bg-rose-500/15 border-rose-500/40 text-rose-200'
                        : 'bg-emerald-500/10 border-emerald-500/35 text-emerald-200'
                    }`}
                  >
                    <span>{g.label}</span>
                    {locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
