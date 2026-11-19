import React from 'react';
import {
  Activity,
  AlertTriangle,
  Ban,
  Bell,
  CheckCircle2,
  FileText,
  Lock,
  Radio,
  RefreshCw,
  Search,
  Send,
  Shield,
  Sliders,
  Trophy,
  Unlock,
  Users,
  Wrench,
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
  readServerlessStore,
  writeServerlessStore,
} from '../lib/serverlessApi.ts';
import type { Language, Tournament, UserProfile } from '../types.ts';
import { AdminTournamentSection } from './AdminTournamentSection.tsx';
import { AvatarWithFrame } from './AvatarWithFrame.tsx';
import { RankTierIcon } from './PremiumIcons.tsx';

interface AdminPanelProps {
  lang?: Language;
  token?: string;
  currentUser: UserProfile;
  users?: UserProfile[];
  tournaments?: Tournament[];
  rooms?: any[];
  featureLocks?: Record<string, boolean>;
  onSwitchToLobby?: () => void;
  onNotify: (level: string, message: string) => void;
}

type AdminSection =
  | 'overview'
  | 'users'
  | 'tournaments'
  | 'reports'
  | 'engine'
  | 'broadcast'
  | 'logs';

export const AdminPanel: React.FC<AdminPanelProps> = ({
  currentUser,
  users: propUsers = [],
  tournaments: propTournaments = [],
  rooms: propRooms = [],
  featureLocks: propLocks = {},
  onSwitchToLobby,
  onNotify,
}) => {
  const [section, setSection] = React.useState<AdminSection>('overview');
  const [users, setUsers] = React.useState<UserProfile[]>(propUsers);
  const [tournaments, setTournaments] = React.useState<Tournament[]>(propTournaments);
  const [rooms, setRooms] = React.useState<any[]>(propRooms);
  const [reports, setReports] = React.useState<any[]>([]);
  const [auditLogs, setAuditLogs] = React.useState<any[]>([]);
  const [syncError, setSyncError] = React.useState<string>('');

  // Engine / Config state
  const [maintenance, setMaintenance] = React.useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = React.useState(
    'စနစ်အဆင့်မြှင့်တင်နေပါသဖြင့် ခေတ္တစောင့်ဆိုင်းပေးပါ။'
  );
  const [locks, setLocks] = React.useState<Record<string, boolean>>(propLocks || {});

  // User Management state
  const [userSearch, setUserSearch] = React.useState('');
  const [selectedUserId, setSelectedUserId] = React.useState<string | null>(null);
  const [directMsgText, setDirectMsgText] = React.useState('');
  const [warnReason, setWarnReason] = React.useState('');
  const [xpDelta, setXpDelta] = React.useState(100);

  // Broadcast state
  const [broadcastTitle, setBroadcastTitle] = React.useState('Vanguard Official Notice');
  const [broadcastMessage, setBroadcastMessage] = React.useState('');

  // Real-time Firestore Subscriptions
  React.useEffect(() => {
    if (!isFirebaseConfigured || !db) {
      const store = readServerlessStore();
      setUsers(Object.values(store.users || {}) as UserProfile[]);
      return;
    }

    const unsubUsers = onSnapshot(
      collection(db, 'users'),
      (snap) => {
        const list: UserProfile[] = [];
        snap.forEach((d) => list.push(d.data() as UserProfile));
        list.sort((a, b) => (b.xp || 0) - (a.xp || 0));
        setUsers(list);
        setSyncError('');
      },
      (err) => setSyncError(err.message)
    );

    const unsubTourneys = onSnapshot(collection(db, 'tournaments'), (snap) => {
      const list: Tournament[] = [];
      snap.forEach((d) => list.push(d.data() as Tournament));
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

    const unsubConfig = onSnapshot(doc(db, 'system', 'config'), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as any;
        setMaintenance(Boolean(data.maintenance));
        if (data.maintenanceMessage) setMaintenanceMessage(data.maintenanceMessage);
        if (data.featureLocks) setLocks(data.featureLocks);
      }
    });

    const unsubLogs = onSnapshot(collection(db, 'auditLogs'), (snap) => {
      const list: any[] = [];
      snap.forEach((d) => list.push(d.data()));
      list.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
      setAuditLogs(list.slice(0, 50));
    });

    return () => {
      unsubUsers();
      unsubTourneys();
      unsubRooms();
      unsubReports();
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

  const handleCloseRoom = async (roomId: string) => {
    if (isFirebaseConfigured && db) {
      await deleteDoc(doc(db, 'rooms', roomId)).catch(() => {});
    }
    await logAdminAction('CLOSE_ROOM', `Closed room ${roomId}`);
    onNotify('info', 'Room ပိတ်သိမ်းပြီးပါပြီ။');
  };

  const handleSaveSystemConfig = async (
    nextMaintenance: boolean,
    nextLocks: Record<string, boolean>,
    nextMsg = maintenanceMessage
  ) => {
    setMaintenance(nextMaintenance);
    setLocks(nextLocks);
    if (isFirebaseConfigured && db) {
      await setDoc(
        doc(db, 'system', 'config'),
        stripUndefined({
          maintenance: nextMaintenance,
          maintenanceMessage: nextMsg,
          featureLocks: nextLocks,
          updatedAtMs: Date.now(),
        }),
        { merge: true }
      ).catch(() => {});
    }
    await logAdminAction(
      'UPDATE_ENGINE',
      `Maintenance=${nextMaintenance}, Locks=${JSON.stringify(nextLocks)}`
    );
    onNotify('success', 'Server Engine Settings သိမ်းဆည်းပြီးပါပြီ!');
  };

  const handleUserStatus = async (
    target: UserProfile,
    status: 'active' | 'warned' | 'suspended' | 'banned'
  ) => {
    if (target.role === 'admin') return;
    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, 'users', target.id), { status }, { merge: true }).catch(() => {});
    }
    const store = readServerlessStore();
    if (store.users[target.id]) {
      store.users[target.id].status = status;
      writeServerlessStore(store);
    }
    await logAdminAction('USER_STATUS', `${target.displayName} -> ${status}`);
    onNotify('success', `${target.displayName} အား ${status.toUpperCase()} ပြောင်းပြီးပါပြီ။`);
  };

  const handleAdjustXp = async (target: UserProfile, delta: number) => {
    const nextXp = Math.max(0, (target.xp || 0) + delta);
    const nextRank =
      nextXp >= 2500
        ? 'Legend'
        : nextXp >= 1900
        ? 'Diamond'
        : nextXp >= 1300
        ? 'Gold'
        : nextXp >= 1000
        ? 'Silver'
        : 'Bronze';

    if (isFirebaseConfigured && db) {
      await setDoc(
        doc(db, 'users', target.id),
        { xp: nextXp, rank: nextRank },
        { merge: true }
      ).catch(() => {});
    }
    await logAdminAction('ADJUST_XP', `${target.displayName} ${delta >= 0 ? '+' : ''}${delta} XP`);
    onNotify('success', `${target.displayName} XP ကို ${nextXp} သို့ ပြောင်းပြီးပါပြီ။`);
  };

  const handleSendWarning = async (target: UserProfile, reasonText: string) => {
    if (!reasonText.trim()) return;
    const wid = `warn_${Date.now()}`;
    const payload = stripUndefined({
      id: wid,
      userId: target.id,
      reason: reasonText.trim(),
      acknowledged: false,
      createdAtMs: Date.now(),
    });
    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, 'warnings', wid), payload).catch(() => {});
      await setDoc(doc(db, 'users', target.id), { status: 'warned' }, { merge: true }).catch(() => {});
    }
    setWarnReason('');
    await logAdminAction('WARN_USER', `${target.displayName}: ${reasonText}`);
    onNotify('success', `${target.displayName} ထံ သတိပေးချက် ပေးပို့ပြီးပါပြီ!`);
  };

  const handleSendDirectNoti = async (target: UserProfile, text: string) => {
    if (!text.trim()) return;
    const nid = `noti_${Date.now()}`;
    const payload = stripUndefined({
      id: nid,
      targetUserId: target.id,
      title: 'Admin မှ အသိပေးစာ',
      message: text.trim(),
      type: 'message',
      senderName: 'Master Admin',
      createdAtMs: Date.now(),
      read: false,
    });
    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, 'notifications', nid), payload).catch(() => {});
    }
    setDirectMsgText('');
    await logAdminAction('DIRECT_NOTI', `To ${target.displayName}: ${text}`);
    onNotify('success', `${target.displayName} ထံ Notification ပေးပို့ပြီးပါပြီ!`);
  };

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
    const store = readServerlessStore();
    store.activeBroadcast = payload;
    writeServerlessStore(store);
    broadcastLocalSync('BROADCAST');
    await logAdminAction('BROADCAST', `${payload.title}: ${payload.message}`);
    setBroadcastMessage('');
    onNotify('success', 'ကစားသမားအားလုံးထံ Broadcast ကြေညာချက် ပေးပို့ပြီးပါပြီ!');
  };

  const handleReportDecision = async (
    rep: any,
    decision: 'resolved' | 'dismissed' | 'warn' | 'ban'
  ) => {
    const target = users.find((u) => u.id === rep.targetUserId);
    if (decision === 'warn' && target) {
      await handleSendWarning(target, `Report Action: ${rep.reason}`);
    } else if (decision === 'ban' && target) {
      await handleUserStatus(target, 'banned');
    }

    const finalStatus = decision === 'dismissed' ? 'dismissed' : 'resolved';
    if (isFirebaseConfigured && db) {
      await setDoc(
        doc(db, 'reports', rep.id),
        { status: finalStatus, resolvedAtMs: Date.now() },
        { merge: true }
      ).catch(() => {});

      if (rep.reporterId) {
        const nid = `noti_rep_${Date.now()}`;
        await setDoc(
          doc(db, 'notifications', nid),
          stripUndefined({
            id: nid,
            targetUserId: rep.reporterId,
            title: 'Report စစ်ဆေးပြီးစီးကြောင်း အသိပေးချက်',
            message: `${rep.targetName || 'Player'} အပေါ် တိုင်ကြားထားသော Report ကို Admin မှ စစ်ဆေးဆောင်ရွက်ပြီးပါပြီ (${decision.toUpperCase()})။`,
            type: 'message',
            senderName: 'Vanguard Moderation',
            createdAtMs: Date.now(),
            read: false,
          })
        ).catch(() => {});
      }
    }
    await logAdminAction('REPORT_ACTION', `${rep.id} -> ${decision}`);
    onNotify('success', `Report အား ${decision.toUpperCase()} ဆောင်ရွက်ပြီးပါပြီ။`);
  };

  const onlineCount = users.filter(
    (u) => u.online && Date.now() - Number(u.lastSeenMs || 0) < 90000
  ).length;
  const pendingReportsCount = reports.filter((r) => r.status === 'pending').length;
  const filteredUsers = users.filter((u) => {
    const q = userSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      (u.displayName || '').toLowerCase().includes(q) ||
      (u.username || '').toLowerCase().includes(q) ||
      (u.gameId || '').toLowerCase().includes(q)
    );
  });
  const selectedUser = users.find((u) => u.id === selectedUserId) || null;

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 space-y-4">
      {/* Top Diagnostic & Navigation Bar */}
      <div className="cyber-panel rounded-2xl p-4 border border-amber-500/35 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center">
            <Shield className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-display font-bold text-white flex items-center gap-2">
              <span>Master Admin Command Center</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-[10px] font-mono text-amber-300">
                {currentUser.username}
              </span>
            </h2>
            <div className="text-xs flex items-center gap-2 mt-0.5">
              {isFirebaseConfigured && !syncError ? (
                <span className="text-emerald-400 font-semibold flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5" /> Cloud Real-Time Sync Active
                </span>
              ) : (
                <span className="text-rose-400 font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> {syncError || 'Local Storage Mode'}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onSwitchToLobby && (
            <button
              type="button"
              onClick={onSwitchToLobby}
              className="px-3.5 h-9 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-xs font-bold text-white cursor-pointer"
            >
              Game Arena သို့ သွားမည်
            </button>
          )}
        </div>
      </div>

      {/* Section Navigation Pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {(
          [
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'users', label: `Users (${users.length})`, icon: Users },
            { id: 'tournaments', label: `Tournaments & Gifts (${tournaments.length})`, icon: Trophy },
            { id: 'reports', label: 'Reports', icon: AlertTriangle, badge: pendingReportsCount },
            { id: 'engine', label: 'Game Engine', icon: Sliders },
            { id: 'broadcast', label: 'Noti & Broadcast', icon: Bell },
            { id: 'logs', label: 'Audit Logs', icon: FileText },
          ] as Array<{ id: AdminSection; label: string; icon: any; badge?: number }>
        ).map((tab) => {
          const Icon = tab.icon;
          const active = section === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSection(tab.id)}
              className={`px-3.5 h-9 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 transition-all cursor-pointer border ${
                active
                  ? 'cyber-gold-active text-amber-200'
                  : 'bg-[#0b101d] border-white/10 text-slate-300 hover:border-amber-400/35'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
              {tab.badge && tab.badge > 0 ? (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px] font-mono">
                  {tab.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* SECTION: OVERVIEW */}
      {section === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="cyber-panel rounded-2xl p-4 border border-white/10">
              <div className="text-xs text-slate-400">Total Players</div>
              <div className="text-2xl font-mono font-extrabold text-white mt-1">{users.length}</div>
              <div className="text-[11px] text-emerald-400 mt-1">● {onlineCount} Live Online</div>
            </div>
            <div className="cyber-panel rounded-2xl p-4 border border-white/10">
              <div className="text-xs text-slate-400">Active Tournaments</div>
              <div className="text-2xl font-mono font-extrabold text-amber-400 mt-1">
                {tournaments.filter((t) => t.status !== 'completed').length}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Total: {tournaments.length}</div>
            </div>
            <div className="cyber-panel rounded-2xl p-4 border border-white/10">
              <div className="text-xs text-slate-400">Active Rooms</div>
              <div className="text-2xl font-mono font-extrabold text-sky-400 mt-1">{rooms.length}</div>
              <div className="text-[11px] text-slate-400 mt-1">Real-time Firestore</div>
            </div>
            <div className="cyber-panel rounded-2xl p-4 border border-white/10">
              <div className="text-xs text-slate-400">Pending Reports</div>
              <div className="text-2xl font-mono font-extrabold text-rose-400 mt-1">
                {pendingReportsCount}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Total: {reports.length}</div>
            </div>
          </div>

          <div className="cyber-panel rounded-2xl p-4 border border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Wrench className="w-4 h-4 text-amber-400" /> Global Maintenance Mode
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                ဖွင့်ထားပါက Admin မှလွဲ၍ ကစားသမားအားလုံး Maintenance Screen ကို မြင်ရပါမည်။
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleSaveSystemConfig(!maintenance, locks)}
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

      {/* SECTION: USERS & DEVICES */}
      {section === 'users' && (
        <div className="grid lg:grid-cols-12 gap-4">
          <div className="lg:col-span-7 cyber-panel rounded-2xl p-4 space-y-3 border border-white/10">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="ကစားသမားအမည် သို့မဟုတ် Game ID ရှာရန်..."
                className="w-full h-10 pl-9 pr-3 rounded-xl bg-[#070b14] border border-white/15 text-xs text-white"
              />
            </div>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {filteredUsers.map((u: any) => {
                const isLive = u.online && Date.now() - Number(u.lastSeenMs || 0) < 90000;
                const active = selectedUserId === u.id;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => setSelectedUserId(u.id)}
                    className={`w-full p-3 rounded-xl border text-left flex items-center justify-between gap-3 cursor-pointer transition-all ${
                      active
                        ? 'cyber-gold-active'
                        : 'bg-[#070b14] border-white/10 hover:border-amber-400/35'
                    }`}
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
                            <span className="px-1.5 py-0.2 rounded bg-rose-500/25 text-rose-300 text-[9px] uppercase font-bold">
                              {u.status}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] font-mono text-amber-300">
                          {u.gameId} · {u.xp || 0} XP · {u.device || 'Web/Mobile'}
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 shrink-0">Manage →</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-5 cyber-panel rounded-2xl p-4 space-y-3 border border-white/10">
            {!selectedUser ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-500 py-12">
                ဘယ်ဘက်စာရင်းမှ ကစားသမားတစ်ဦးကို ရွေးချယ်ပါ။
              </div>
            ) : (
              <div className="space-y-3.5">
                <div className="flex items-center gap-3 pb-3 border-b border-white/10">
                  <AvatarWithFrame
                    avatarUrl={selectedUser.avatarUrl}
                    frameId={selectedUser.frameId}
                    displayName={selectedUser.displayName}
                    size="md"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-white truncate">
                      {selectedUser.displayName}
                    </div>
                    <div className="text-xs font-mono text-amber-400">
                      {selectedUser.gameId} · {selectedUser.xp} XP ({selectedUser.rank || 'Silver'})
                    </div>
                  </div>
                </div>

                {/* XP Adjuster */}
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={xpDelta}
                    onChange={(e) => setXpDelta(Number(e.target.value))}
                    className="w-24 h-9 px-2.5 rounded-lg bg-[#070b14] border border-white/15 text-xs font-mono text-white"
                  />
                  <button
                    type="button"
                    onClick={() => handleAdjustXp(selectedUser, Math.abs(xpDelta))}
                    className="flex-1 h-9 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-xs font-bold text-emerald-300 cursor-pointer"
                  >
                    +{Math.abs(xpDelta)} XP
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustXp(selectedUser, -Math.abs(xpDelta))}
                    className="flex-1 h-9 rounded-lg bg-rose-500/20 border border-rose-400/40 text-xs font-bold text-rose-300 cursor-pointer"
                  >
                    -{Math.abs(xpDelta)} XP
                  </button>
                </div>

                {/* Direct Noti */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={directMsgText}
                    onChange={(e) => setDirectMsgText(e.target.value)}
                    placeholder="Direct Notification စာသား..."
                    className="flex-1 h-9 px-3 rounded-lg bg-[#070b14] border border-white/15 text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={() => handleSendDirectNoti(selectedUser, directMsgText)}
                    className="px-3 h-9 rounded-lg bg-sky-500 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" /> Noti
                  </button>
                </div>

                {/* Warning Sender */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={warnReason}
                    onChange={(e) => setWarnReason(e.target.value)}
                    placeholder="သတိပေးချက် အကြောင်းရင်း..."
                    className="flex-1 h-9 px-3 rounded-lg bg-[#070b14] border border-white/15 text-xs text-white"
                  />
                  <button
                    type="button"
                    onClick={() => handleSendWarning(selectedUser, warnReason)}
                    className="px-3 h-9 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs cursor-pointer"
                  >
                    Warn
                  </button>
                </div>

                {/* Moderation Buttons */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => handleUserStatus(selectedUser, 'active')}
                    className="h-9 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-bold cursor-pointer"
                  >
                    Active
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUserStatus(selectedUser, 'suspended')}
                    className="h-9 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-bold cursor-pointer"
                  >
                    Suspend
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUserStatus(selectedUser, 'banned')}
                    className="h-9 rounded-lg bg-rose-500/25 text-rose-300 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Ban className="w-3.5 h-3.5" /> Ban
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECTION: PROFESSIONAL TOURNAMENTS & WINNER GIFTS */}
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

      {/* SECTION: USER REPORTS CENTER */}
      {section === 'reports' && (
        <div className="cyber-panel rounded-2xl p-4 space-y-3 border border-white/10">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            Player Reports Moderation ({reports.length})
          </h3>
          {reports.length === 0 ? (
            <div className="text-xs text-slate-500 text-center py-8">တိုင်ကြားစာ Report မရှိသေးပါ။</div>
          ) : (
            <div className="space-y-2">
              {reports.map((rep) => (
                <div
                  key={rep.id}
                  className="p-3.5 rounded-xl bg-[#070b14] border border-white/10 flex flex-wrap items-center justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-white">
                      Target: <span className="text-rose-300">{rep.targetName || rep.targetUserId}</span>{' '}
                      <span className="text-slate-400 font-normal">
                        (by {rep.reporterName || rep.reporterId})
                      </span>
                    </div>
                    <div className="text-xs text-slate-300">{rep.reason}</div>
                    <div className="text-[10px] font-mono uppercase text-amber-400">
                      Status: {rep.status || 'pending'}
                    </div>
                  </div>

                  {rep.status === 'pending' && (
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleReportDecision(rep, 'warn')}
                        className="px-2.5 h-8 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-bold cursor-pointer"
                      >
                        Warn
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReportDecision(rep, 'ban')}
                        className="px-2.5 h-8 rounded-lg bg-rose-500/25 text-rose-300 text-xs font-bold cursor-pointer"
                      >
                        Ban
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReportDecision(rep, 'resolved')}
                        className="px-2.5 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> Resolve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReportDecision(rep, 'dismissed')}
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

      {/* SECTION: GAME ENGINE & FEATURE LOCKS */}
      {section === 'engine' && (
        <div className="cyber-panel rounded-2xl p-4 space-y-4 border border-white/10">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-400" /> Feature & Game Locks
          </h3>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {[
              { key: 'connect4', label: '4 in a Row (Connect 4)' },
              { key: 'tictactoe', label: 'Tic-Tac-Toe' },
              { key: 'rps', label: 'Rock Paper Scissors' },
              { key: 'sakarhtar', label: 'Wise Owl Quiz' },
              { key: 'tournaments', label: 'Tournament Join Lock' },
              { key: 'chat', label: 'Global Social Chat Lock' },
            ].map((item) => {
              const isLocked = Boolean(locks[item.key]);
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() =>
                    handleSaveSystemConfig(maintenance, { ...locks, [item.key]: !isLocked })
                  }
                  className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-bold cursor-pointer ${
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
        </div>
      )}

      {/* SECTION: GLOBAL BROADCAST */}
      {section === 'broadcast' && (
        <form
          onSubmit={handleSendBroadcast}
          className="cyber-panel rounded-2xl p-4 space-y-3 border border-amber-500/25 max-w-xl"
        >
          <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
            <Radio className="w-4 h-4" /> Send Global Real-Time Broadcast
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
            placeholder="ကစားသမားအားလုံးထံ အသိပေးလိုသော ကြေညာချက်..."
            className="w-full p-3 rounded-xl bg-[#070b14] border border-white/15 text-xs text-white"
          />
          <button
            type="submit"
            className="w-full h-10 rounded-xl cyber-cta-gold text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <Send className="w-4 h-4" /> ကြေညာချက် ပေးပို့မည်
          </button>
        </form>
      )}

      {/* SECTION: AUDIT LOGS */}
      {section === 'logs' && (
        <div className="cyber-panel rounded-2xl p-4 space-y-2 border border-white/10">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-sky-400" /> Admin Action Audit Logs
          </h3>
          <div className="space-y-1.5 max-h-[55vh] overflow-y-auto">
            {auditLogs.length === 0 ? (
              <div className="text-xs text-slate-500 text-center py-6">မှတ်တမ်း မရှိသေးပါ။</div>
            ) : (
              auditLogs.map((log, i) => (
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
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
