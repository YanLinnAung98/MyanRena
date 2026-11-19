import React from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  Ban,
  Check,
  Clock,
  Copy,
  Crown,
  Flag,
  Gift,
  MessageSquare,
  Send,
  ShieldCheck,
  Sparkles,
  Swords,
  UserCheck,
  UserMinus,
  UserPlus,
  X,
} from 'lucide-react';
import {
  arrayRemove,
  arrayUnion,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
} from 'firebase/firestore';
import { db, isFirebaseConfigured, stripUndefined } from '../lib/firebase.ts';
import { readServerlessStore, saveActiveSessionUser } from '../lib/serverlessApi.ts';
import type { GameType, Language, UserProfile } from '../types.ts';
import { soundEngine } from '../utils/sound.ts';
import { AvatarWithFrame } from './AvatarWithFrame.tsx';
import {
  getBannerTheme,
  getGiftMeta,
  getPlayerTitle,
  PremiumGiftSvg,
} from './PremiumIcons.tsx';

export const REPORT_CATEGORIES = [
  { id: 'cheating', labelMy: 'ခိုးကစားခြင်း / Cheat & Hack', labelEn: 'Cheating / Hacking' },
  { id: 'harassment', labelMy: 'ဆဲဆိုရိုင်းစိုင်းခြင်း / Harassment', labelEn: 'Abusive Language / Harassment' },
  { id: 'spam', labelMy: 'Spam သို့မဟုတ် လိမ်လည်မှု (Scam)', labelEn: 'Spam or Scam' },
  { id: 'griefing', labelMy: 'ပွဲဖျက်ခြင်း / AFK & Throwing', labelEn: 'AFK / Match Throwing' },
  { id: 'inappropriate', labelMy: 'မသင့်လျော်သော Profile / အမည်', labelEn: 'Inappropriate Profile / Name' },
] as const;

interface PlayerProfileModalProps {
  lang: Language;
  token: string;
  userId: string;
  currentUser: UserProfile;
  allUsers?: UserProfile[];
  frames: any[];
  onClose: () => void;
  onUserUpdated?: (user: UserProfile) => void;
  onOpenChatWith?: (targetUserId: string) => void;
  onChallenge: (targetUserId: string, gameType: GameType) => void;
  onNotify?: (level: string, message: string) => void;
}

export const PlayerProfileModal: React.FC<PlayerProfileModalProps> = ({
  lang,
  userId,
  currentUser,
  allUsers = [],
  frames,
  onClose,
  onUserUpdated,
  onOpenChatWith,
  onChallenge,
  onNotify,
}) => {
  const [targetUser, setTargetUser] = React.useState<any>(() => {
    const found = allUsers.find((u) => u.id === userId);
    if (found) return found;
    const store = readServerlessStore();
    return store.users[userId] || null;
  });

  const [requestStatus, setRequestStatus] = React.useState<'none' | 'outgoing' | 'incoming'>('none');
  const [busyAction, setBusyAction] = React.useState(false);
  const [copiedId, setCopiedId] = React.useState(false);
  const [dmText, setDmText] = React.useState('');
  const [sendingDm, setSendingDm] = React.useState(false);

  const [reportOpen, setReportOpen] = React.useState(false);
  const [reportCategory, setReportCategory] = React.useState<string>('harassment');
  const [reportDetail, setReportDetail] = React.useState('');
  const [submittingReport, setSubmittingReport] = React.useState(false);

  React.useEffect(() => {
    if (!isFirebaseConfigured || !db) return;

    const unsubUser = onSnapshot(doc(db, 'users', userId), (snap) => {
      if (snap.exists()) setTargetUser(snap.data());
    });

    const outId = `${currentUser.id}__${userId}`;
    const inId = `${userId}__${currentUser.id}`;

    const unsubOut = onSnapshot(doc(db, 'friendRequests', outId), (snap) => {
      if (snap.exists() && snap.data()?.status === 'pending') {
        setRequestStatus('outgoing');
      } else {
        setRequestStatus((prev) => (prev === 'outgoing' ? 'none' : prev));
      }
    });

    const unsubIn = onSnapshot(doc(db, 'friendRequests', inId), (snap) => {
      if (snap.exists() && snap.data()?.status === 'pending') {
        setRequestStatus('incoming');
      } else {
        setRequestStatus((prev) => (prev === 'incoming' ? 'none' : prev));
      }
    });

    return () => {
      unsubUser();
      unsubOut();
      unsubIn();
    };
  }, [userId, currentUser.id]);

  if (!targetUser) {
    return (
      <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="cyber-panel rounded-2xl p-6 text-center space-y-3 max-w-xs w-full">
          <div className="text-xs text-slate-300">Loading player profile...</div>
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-white/10 text-xs text-white cursor-pointer">
            Close
          </button>
        </div>
      </div>
    );
  }

  const isSelf = targetUser.id === currentUser.id;
  const friends: string[] = Array.isArray(currentUser.friends) ? currentUser.friends : [];
  const blocked: string[] = Array.isArray(currentUser.blocked) ? currentUser.blocked : [];
  const isFriend = friends.includes(targetUser.id);
  const isBlocked = blocked.includes(targetUser.id);
  const isOnline = Boolean(targetUser.online && Date.now() - Number(targetUser.lastSeenMs || 0) < 60000);

  const bannerObj = getBannerTheme(targetUser.bannerTheme);
  const titleObj = getPlayerTitle(targetUser.titleId);
  const xp = Number(targetUser.xp || 1000);
  const level = Math.max(1, Math.floor(xp / 150) + 1);
  const winCount = Number(targetUser.wins || 0);
  const lossCount = Number(targetUser.losses || 0);
  const drawCount = Number(targetUser.draws || 0);
  const totalGames = winCount + lossCount + drawCount;
  const winRate = totalGames > 0 ? Math.round((winCount / totalGames) * 100) : 0;
  const userGifts: any[] = Array.isArray(targetUser.gifts) ? targetUser.gifts : [];

  const handleSendFriendRequest = async () => {
    if (busyAction || isBlocked) return;
    setBusyAction(true);
    try {
      const reqId = `${currentUser.id}__${targetUser.id}`;
      const payload = stripUndefined({
        id: reqId,
        fromUserId: currentUser.id,
        fromName: currentUser.displayName,
        fromGameId: currentUser.gameId,
        fromAvatarUrl: currentUser.avatarUrl || '',
        fromFrameId: currentUser.frameId || 'bronze',
        toUserId: targetUser.id,
        toName: targetUser.displayName,
        toGameId: targetUser.gameId,
        status: 'pending',
        createdAtMs: Date.now(),
      });

      if (isFirebaseConfigured && db) {
        await setDoc(doc(db, 'friendRequests', reqId), payload);
        const notiId = `freq_${Date.now()}_${Math.floor(Math.random() * 999)}`;
        await setDoc(
          doc(db, 'notifications', notiId),
          stripUndefined({
            id: notiId,
            targetUserId: targetUser.id,
            title: 'မိတ်ဆွေတောင်းဆိုမှု အသစ် (Friend Request)',
            message: `${currentUser.displayName} (${currentUser.gameId}) မှ သင့်အား မိတ်ဆွေအဖြစ် တောင်းဆိုထားပါသည်။`,
            type: 'message',
            senderName: currentUser.displayName,
            createdAtMs: Date.now(),
            read: false,
          })
        ).catch(() => {});
      }

      setRequestStatus('outgoing');
      soundEngine.playClick();
      onNotify?.(
        'success',
        lang === 'my'
          ? `${targetUser.displayName} ထံ Friend Request ပေးပို့ပြီးပါပြီ`
          : `Friend request sent to ${targetUser.displayName}.`
      );
    } finally {
      setBusyAction(false);
    }
  };

  const handleCancelRequest = async () => {
    if (busyAction) return;
    setBusyAction(true);
    try {
      if (isFirebaseConfigured && db) {
        await deleteDoc(doc(db, 'friendRequests', `${currentUser.id}__${targetUser.id}`)).catch(() => {});
      }
      setRequestStatus('none');
      onNotify?.('info', lang === 'my' ? 'Friend Request ပြန်ရုပ်သိမ်းပြီးပါပြီ။' : 'Request cancelled.');
    } finally {
      setBusyAction(false);
    }
  };

  const handleAcceptRequest = async () => {
    if (busyAction) return;
    setBusyAction(true);
    try {
      const nextFriends = Array.from(new Set([...friends, targetUser.id]));
      const updatedMe = { ...currentUser, friends: nextFriends };
      saveActiveSessionUser(updatedMe);
      onUserUpdated?.(updatedMe);

      if (isFirebaseConfigured && db) {
        await deleteDoc(doc(db, 'friendRequests', `${targetUser.id}__${currentUser.id}`)).catch(() => {});
        await setDoc(doc(db, 'users', currentUser.id), { friends: arrayUnion(targetUser.id) }, { merge: true });
        await setDoc(doc(db, 'users', targetUser.id), { friends: arrayUnion(currentUser.id) }, { merge: true });
      }
      setRequestStatus('none');
      soundEngine.playNotify();
      onNotify?.('success', lang === 'my' ? `${targetUser.displayName} နှင့် မိတ်ဆွေဖြစ်သွားပါပြီ!` : `Now friends!`);
    } finally {
      setBusyAction(false);
    }
  };

  const handleUnfriend = async () => {
    if (busyAction) return;
    setBusyAction(true);
    try {
      const nextFriends = friends.filter((id) => id !== targetUser.id);
      const updatedMe = { ...currentUser, friends: nextFriends };
      saveActiveSessionUser(updatedMe);
      onUserUpdated?.(updatedMe);
      if (isFirebaseConfigured && db) {
        await setDoc(doc(db, 'users', currentUser.id), { friends: arrayRemove(targetUser.id) }, { merge: true });
        await setDoc(doc(db, 'users', targetUser.id), { friends: arrayRemove(currentUser.id) }, { merge: true });
      }
      onNotify?.('info', lang === 'my' ? 'မိတ်ဆွေစာရင်းမှ ဖယ်ရှားပြီးပါပြီ။' : 'Removed from friends.');
    } finally {
      setBusyAction(false);
    }
  };

  const handleToggleBlock = async () => {
    if (busyAction) return;
    setBusyAction(true);
    try {
      if (isBlocked) {
        const nextBlocked = blocked.filter((id) => id !== targetUser.id);
        const updatedMe = { ...currentUser, blocked: nextBlocked };
        saveActiveSessionUser(updatedMe);
        onUserUpdated?.(updatedMe);
        if (isFirebaseConfigured && db) {
          await setDoc(doc(db, 'users', currentUser.id), { blocked: nextBlocked }, { merge: true });
        }
        onNotify?.('success', lang === 'my' ? 'Block ဖြုတ်ပြီးပါပြီ။' : 'User unblocked.');
      } else {
        const nextFriends = friends.filter((id) => id !== targetUser.id);
        const nextBlocked = Array.from(new Set([...blocked, targetUser.id]));
        const updatedMe = { ...currentUser, friends: nextFriends, blocked: nextBlocked };
        saveActiveSessionUser(updatedMe);
        onUserUpdated?.(updatedMe);
        if (isFirebaseConfigured && db) {
          await setDoc(doc(db, 'users', currentUser.id), { friends: nextFriends, blocked: nextBlocked }, { merge: true });
          await setDoc(doc(db, 'users', targetUser.id), { friends: arrayRemove(currentUser.id) }, { merge: true }).catch(() => {});
          await deleteDoc(doc(db, 'friendRequests', `${currentUser.id}__${targetUser.id}`)).catch(() => {});
          await deleteDoc(doc(db, 'friendRequests', `${targetUser.id}__${currentUser.id}`)).catch(() => {});
        }
        setRequestStatus('none');
        onNotify?.('info', lang === 'my' ? `${targetUser.displayName} ကို Block လုပ်ပြီးပါပြီ။` : `Blocked ${targetUser.displayName}.`);
      }
    } finally {
      setBusyAction(false);
    }
  };

  const handleCopyGameId = () => {
    navigator.clipboard?.writeText(targetUser.gameId || targetUser.id);
    soundEngine.playClick();
    setCopiedId(true);
    onNotify?.('success', `Copied ID: ${targetUser.gameId}`);
    setTimeout(() => setCopiedId(false), 1800);
  };

  const handleQuickDm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dmText.trim() || isBlocked) return;
    setSendingDm(true);
    try {
      const dmId = `dm_${Date.now()}_${Math.floor(Math.random() * 999)}`;
      const msg = stripUndefined({
        id: dmId,
        fromUserId: currentUser.id,
        fromName: currentUser.displayName,
        toUserId: targetUser.id,
        toName: targetUser.displayName,
        text: dmText.trim(),
        createdAtMs: Date.now(),
      });
      if (isFirebaseConfigured && db) {
        await setDoc(doc(db, 'messages', dmId), msg);
      }
      setDmText('');
      soundEngine.playNotify();
      onNotify?.('success', lang === 'my' ? 'စာတို ပေးပို့ပြီးပါပြီ!' : 'Message sent!');
    } finally {
      setSendingDm(false);
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportDetail.trim()) return;
    setSubmittingReport(true);
    try {
      if (isFirebaseConfigured && db) {
        const existingSnap = await getDocs(collection(db, 'reports')).catch(() => null);
        let hasPendingDuplicate = false;
        existingSnap?.forEach((d) => {
          const r = d.data();
          if (r.reporterId === currentUser.id && r.targetUserId === targetUser.id && r.status === 'pending') {
            hasPendingDuplicate = true;
          }
        });
        if (hasPendingDuplicate) {
          onNotify?.('error', lang === 'my' ? 'ဤကစားသမားအား တိုင်ကြားထားသော Report ကို Admin စစ်ဆေးနေဆဲဖြစ်ပါသည်။' : 'Pending report already exists.');
          setReportOpen(false);
          return;
        }
      }

      const catObj = REPORT_CATEGORIES.find((c) => c.id === reportCategory) || REPORT_CATEGORIES[0];
      const rid = `rep_${Date.now()}_${Math.floor(Math.random() * 999)}`;
      const payload = stripUndefined({
        id: rid,
        reporterId: currentUser.id,
        reporterName: currentUser.displayName,
        reporterGameId: currentUser.gameId,
        targetUserId: targetUser.id,
        targetName: targetUser.displayName,
        targetGameId: targetUser.gameId,
        category: catObj.id,
        categoryLabel: catObj.labelMy,
        detail: reportDetail.trim(),
        reason: `[${catObj.labelMy}] ${reportDetail.trim()}`,
        status: 'pending',
        createdAtMs: Date.now(),
      });
      if (isFirebaseConfigured && db) {
        await setDoc(doc(db, 'reports', rid), payload);
      }
      setReportDetail('');
      setReportOpen(false);
      soundEngine.playNotify();
      onNotify?.('success', lang === 'my' ? 'Report တိုင်ကြားမှု အောင်မြင်စွာ ပေးပို့ပြီးပါပြီ။' : 'Report submitted.');
    } finally {
      setSubmittingReport(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 14 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 360, damping: 26 }}
        className="w-full max-w-md rounded-3xl cyber-panel border border-amber-400/40 overflow-hidden shadow-2xl max-h-[90dvh] flex flex-col"
      >
        {/* PREMIUM CUSTOM COVER BANNER */}
        <div className={`h-24 bg-gradient-to-r ${bannerObj.bg} relative shrink-0`}>
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fbbf24_1px,transparent_1px)] [background-size:16px_16px]" />
          <div className="absolute top-3 left-3 flex items-center gap-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-black/60 backdrop-blur-md border border-amber-400/40 text-[10px] font-mono font-bold text-amber-300 flex items-center gap-1">
              <Crown className="w-3 h-3" /> LV.{level} · {targetUser.rank || 'Silver'}
            </span>
            {isFriend && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/25 border border-emerald-400/40 text-[10px] font-bold text-emerald-200">
                Friend
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/55 hover:bg-black/80 text-white flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* SCROLLABLE BODY */}
        <div className="px-5 pb-5 -mt-10 relative z-10 overflow-y-auto space-y-4">
          {/* Overlapping Avatar + Title + Copy ID */}
          <div className="flex items-end gap-3.5">
            <AvatarWithFrame
              avatarUrl={targetUser.avatarUrl}
              frameId={targetUser.frameId}
              frames={frames}
              displayName={targetUser.displayName}
              size="lg"
              status={isOnline ? 'online' : 'offline'}
            />
            <div className="pb-0.5 min-w-0 space-y-0.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-400/30 text-[10px] font-bold text-amber-300">
                <Sparkles className="w-2.5 h-2.5" />
                {lang === 'my' ? titleObj.labelMy : titleObj.labelEn}
              </span>
              <h3 className="text-lg font-display font-extrabold text-white truncate">{targetUser.displayName}</h3>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyGameId}
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/5 hover:bg-amber-500/20 border border-white/15 text-[11px] font-mono font-bold text-amber-300 cursor-pointer"
                >
                  <span>{targetUser.gameId}</span>
                  {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
                <span className="text-[11px] text-slate-400">
                  {isOnline ? '🟢 Online' : '⚪ Offline'} · WR {winRate}%
                </span>
              </div>
            </div>
          </div>

          {/* PLAYER BIO / MOTTO */}
          <div className="p-3 rounded-xl bg-[#070b13]/90 border border-white/10 text-xs text-slate-300 italic leading-relaxed">
            {targetUser.bio?.trim()
              ? `“${targetUser.bio.trim()}”`
              : lang === 'my'
              ? '“Vanguard Arena တွင် ယှဉ်ပြိုင်ကစားနေသူ”'
              : '“Competing in Vanguard Arena.”'}
          </div>

          {/* STATS GRID */}
          <div className="grid grid-cols-4 gap-2 text-center bg-[#070b13] p-2.5 rounded-xl border border-white/10 text-xs">
            <div>
              <div className="text-[10px] text-slate-400 uppercase">XP</div>
              <div className="font-mono font-bold text-amber-400 mt-0.5">{xp}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase">Win</div>
              <div className="font-mono font-bold text-emerald-400 mt-0.5">{winCount}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase">Loss</div>
              <div className="font-mono font-bold text-rose-400 mt-0.5">{lossCount}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase">Draw</div>
              <div className="font-mono font-bold text-sky-400 mt-0.5">{drawCount}</div>
            </div>
          </div>

          {/* TOURNAMENT TROPHIES & ADMIN GIFTS SHOWCASE */}
          {userGifts.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                <Gift className="w-3.5 h-3.5" />
                <span>
                  {lang === 'my'
                    ? `ရရှိထားသော ပြိုင်ပွဲဆုနှင့် လက်ဆောင်များ (${userGifts.length})`
                    : `Awards & Gifts (${userGifts.length})`}
                </span>
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                {userGifts.map((g, i) => {
                  const meta = getGiftMeta(g.giftId);
                  return (
                    <div
                      key={g.id || i}
                      className={`p-2 rounded-xl bg-gradient-to-br border flex items-center gap-2 shrink-0 ${meta.accent}`}
                    >
                      <PremiumGiftSvg giftId={g.giftId} className="w-7 h-7 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-white truncate max-w-[130px]">
                          {g.title || (lang === 'my' ? meta.nameMy : meta.nameEn)}
                        </div>
                        <div className="text-[9px] font-mono opacity-80 truncate max-w-[130px]">
                          {g.tournamentTitle || meta.rarity}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SOCIAL ACTIONS */}
          {!isSelf && (
            <div className="space-y-2.5 pt-1">
              <div className="grid grid-cols-2 gap-2">
                {isFriend ? (
                  <button
                    type="button"
                    disabled={busyAction}
                    onClick={handleUnfriend}
                    className="h-10 rounded-xl bg-white/10 hover:bg-rose-500/20 border border-white/15 text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <UserMinus className="w-4 h-4" />
                    <span>{lang === 'my' ? 'မိတ်ဆွေဖြုတ်' : 'Unfriend'}</span>
                  </button>
                ) : requestStatus === 'outgoing' ? (
                  <button
                    type="button"
                    disabled={busyAction}
                    onClick={handleCancelRequest}
                    className="h-10 rounded-xl bg-amber-500/15 hover:bg-rose-500/20 border border-amber-400/40 text-xs font-bold text-amber-200 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Clock className="w-4 h-4" />
                    <span>{lang === 'my' ? 'တောင်းဆိုပြီး (Cancel)' : 'Cancel Req'}</span>
                  </button>
                ) : requestStatus === 'incoming' ? (
                  <button
                    type="button"
                    disabled={busyAction}
                    onClick={handleAcceptRequest}
                    className="h-10 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>{lang === 'my' ? 'လက်ခံမည်' : 'Accept'}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busyAction || isBlocked}
                    onClick={handleSendFriendRequest}
                    className="h-10 rounded-xl cyber-cta-gold disabled:opacity-40 text-slate-950 text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>{lang === 'my' ? 'Add Friend' : 'Add Friend'}</span>
                  </button>
                )}

                <button
                  type="button"
                  disabled={isBlocked}
                  onClick={() => {
                    onClose();
                    onOpenChatWith?.(targetUser.id);
                  }}
                  className="h-10 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 disabled:opacity-40 border border-sky-400/35 text-xs font-bold text-sky-200 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>{lang === 'my' ? 'Chat ဖွင့်မည်' : 'Open Chat'}</span>
                </button>
              </div>

              {!isBlocked && (
                <form onSubmit={handleQuickDm} className="flex gap-2">
                  <input
                    type="text"
                    value={dmText}
                    onChange={(e) => setDmText(e.target.value)}
                    placeholder={lang === 'my' ? `${targetUser.displayName} ထံ စာတိုပို့မည်...` : 'Quick message...'}
                    className="flex-1 h-9 px-3 rounded-xl bg-[#070b13] border border-white/15 text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="submit"
                    disabled={sendingDm || !dmText.trim()}
                    className="px-3.5 h-9 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-xs cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              )}

              <div className="grid grid-cols-3 gap-2 pt-1.5 border-t border-white/10">
                <button
                  type="button"
                  disabled={isBlocked}
                  onClick={() => {
                    onClose();
                    onChallenge(targetUser.id, 'connect4');
                  }}
                  className="h-9 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 disabled:opacity-40 border border-indigo-400/30 text-[11px] font-bold text-indigo-200 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Swords className="w-3.5 h-3.5" />
                  <span>{lang === 'my' ? 'စိန်ခေါ်' : 'Duel'}</span>
                </button>

                <button
                  type="button"
                  disabled={busyAction}
                  onClick={handleToggleBlock}
                  className={`h-9 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer ${
                    isBlocked
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/35'
                      : 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {isBlocked ? <ShieldCheck className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                  <span>{isBlocked ? 'Unblock' : 'Block'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReportOpen((v) => !v)}
                  className={`h-9 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1 cursor-pointer border ${
                    reportOpen
                      ? 'bg-rose-500/25 border-rose-400 text-rose-200'
                      : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300'
                  }`}
                >
                  <Flag className="w-3.5 h-3.5 text-amber-400" />
                  <span>Report</span>
                </button>
              </div>

              {reportOpen && (
                <form
                  onSubmit={handleSubmitReport}
                  className="p-3 rounded-xl bg-[#070b13] border border-rose-500/40 space-y-2"
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-300">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{lang === 'my' ? 'Admin ထံ တိုင်ကြားရန်' : 'Report Player'}</span>
                  </div>
                  <select
                    value={reportCategory}
                    onChange={(e) => setReportCategory(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-lg bg-[#101728] border border-white/15 text-xs text-white"
                  >
                    {REPORT_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {lang === 'my' ? c.labelMy : c.labelEn}
                      </option>
                    ))}
                  </select>
                  <textarea
                    rows={2}
                    required
                    value={reportDetail}
                    onChange={(e) => setReportDetail(e.target.value)}
                    placeholder={lang === 'my' ? 'အသေးစိတ် ရေးသားပါ...' : 'Describe issue...'}
                    className="w-full p-2 rounded-lg bg-[#101728] border border-white/15 text-xs text-white"
                  />
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setReportOpen(false)} className="px-3 h-8 rounded-lg bg-white/10 text-xs text-slate-300 cursor-pointer">
                      Cancel
                    </button>
                    <button type="submit" disabled={submittingReport} className="px-4 h-8 rounded-lg bg-rose-500 text-white font-bold text-xs cursor-pointer">
                      {submittingReport ? '...' : 'Submit'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
