import React from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  Ban,
  Check,
  Clock,
  Copy,
  Flag,
  MessageSquare,
  Send,
  ShieldCheck,
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
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
} from 'firebase/firestore';
import { db, isFirebaseConfigured, stripUndefined } from '../lib/firebase.ts';
import { readServerlessStore, saveActiveSessionUser } from '../lib/serverlessApi.ts';
import type { GameType, Language, UserProfile } from '../types.ts';
import { soundEngine } from '../utils/sound.ts';
import { AvatarWithFrame } from './AvatarWithFrame.tsx';

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

  // Mutual Friend Request Relationship State
  const [requestStatus, setRequestStatus] = React.useState<'none' | 'outgoing' | 'incoming'>('none');
  const [busyAction, setBusyAction] = React.useState(false);
  const [copiedId, setCopiedId] = React.useState(false);

  // Quick DM
  const [dmText, setDmText] = React.useState('');
  const [sendingDm, setSendingDm] = React.useState(false);

  // Structured Report Drawer
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

  // 1. Send Friend Request (Pending until Target Accepts)
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
            message: `${currentUser.displayName} (${currentUser.gameId}) မှ သင့်အား မိတ်ဆွေအဖြစ် တောင်းဆိုထားပါသည်။ Social Hub > Requests တွင် လက်ခံနိုင်ပါသည်။`,
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
          ? `${targetUser.displayName} ထံ Friend Request ပေးပို့ပြီးပါပြီ (တစ်ဖက်က လက်ခံမှ မိတ်ဆွေဖြစ်ပါမည်)`
          : `Friend request sent to ${targetUser.displayName}.`
      );
    } finally {
      setBusyAction(false);
    }
  };

  // 2. Cancel Outgoing Friend Request
  const handleCancelRequest = async () => {
    if (busyAction) return;
    setBusyAction(true);
    try {
      const reqId = `${currentUser.id}__${targetUser.id}`;
      if (isFirebaseConfigured && db) {
        await deleteDoc(doc(db, 'friendRequests', reqId)).catch(() => {});
      }
      setRequestStatus('none');
      onNotify?.('info', lang === 'my' ? 'Friend Request ပြန်ရုပ်သိမ်းပြီးပါပြီ။' : 'Friend request cancelled.');
    } finally {
      setBusyAction(false);
    }
  };

  // 3. Accept Incoming Friend Request -> Mutual Friendship!
  const handleAcceptRequest = async () => {
    if (busyAction) return;
    setBusyAction(true);
    try {
      const reqId = `${targetUser.id}__${currentUser.id}`;
      const nextFriends = Array.from(new Set([...friends, targetUser.id]));
      const updatedMe = { ...currentUser, friends: nextFriends };
      saveActiveSessionUser(updatedMe);
      onUserUpdated?.(updatedMe);

      if (isFirebaseConfigured && db) {
        await deleteDoc(doc(db, 'friendRequests', reqId)).catch(() => {});
        await setDoc(doc(db, 'users', currentUser.id), { friends: arrayUnion(targetUser.id) }, { merge: true });
        await setDoc(doc(db, 'users', targetUser.id), { friends: arrayUnion(currentUser.id) }, { merge: true });

        const notiId = `facc_${Date.now()}`;
        await setDoc(
          doc(db, 'notifications', notiId),
          stripUndefined({
            id: notiId,
            targetUserId: targetUser.id,
            title: 'မိတ်ဆွေ ဖြစ်သွားပါပြီ!',
            message: `${currentUser.displayName} မှ သင့် Friend Request ကို လက်ခံလိုက်ပါပြီ။`,
            type: 'message',
            senderName: currentUser.displayName,
            createdAtMs: Date.now(),
            read: false,
          })
        ).catch(() => {});
      }

      setRequestStatus('none');
      soundEngine.playNotify();
      onNotify?.('success', lang === 'my' ? `${targetUser.displayName} နှင့် မိတ်ဆွေဖြစ်သွားပါပြီ!` : `You are now friends with ${targetUser.displayName}!`);
    } finally {
      setBusyAction(false);
    }
  };

  // 4. Mutual Unfriend
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

  // 5. Block / Unblock (Also clears any pending requests & mutual friendship)
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

  // 6. Structured User Report with Duplicate Cooldown Prevention
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportDetail.trim()) {
      onNotify?.('error', lang === 'my' ? 'ဖြစ်စဉ်အသေးစိတ်ကို ရေးသားပေးပါ။' : 'Please describe the issue.');
      return;
    }
    setSubmittingReport(true);
    try {
      if (isFirebaseConfigured && db) {
        const existingSnap = await getDocs(collection(db, 'reports')).catch(() => null);
        let hasPendingDuplicate = false;
        existingSnap?.forEach((d) => {
          const r = d.data();
          if (
            r.reporterId === currentUser.id &&
            r.targetUserId === targetUser.id &&
            r.status === 'pending'
          ) {
            hasPendingDuplicate = true;
          }
        });
        if (hasPendingDuplicate) {
          onNotify?.(
            'error',
            lang === 'my'
              ? 'ဤကစားသမားအား သင်တိုင်ကြားထားသော Report ကို Admin စစ်ဆေးနေဆဲဖြစ်ပါသည်။'
              : 'You already have a pending report against this player.'
          );
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
      onNotify?.(
        'success',
        lang === 'my'
          ? 'Report တိုင်ကြားမှု အောင်မြင်စွာ ပေးပို့ပြီးပါပြီ။ Admin မှ စစ်ဆေးအရေးယူပေးပါမည်။'
          : 'Report submitted successfully. Admin will review it shortly.'
      );
    } finally {
      setSubmittingReport(false);
    }
  };

  const winCount = Number(targetUser.wins || 0);
  const lossCount = Number(targetUser.losses || 0);
  const drawCount = Number(targetUser.draws || 0);
  const totalGames = winCount + lossCount + drawCount;
  const winRate = totalGames > 0 ? Math.round((winCount / totalGames) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 360, damping: 26 }}
        className="w-full max-w-md rounded-2xl cyber-panel border border-amber-400/40 p-5 space-y-4 shadow-2xl max-h-[90dvh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3.5 min-w-0">
            <AvatarWithFrame
              avatarUrl={targetUser.avatarUrl}
              frameId={targetUser.frameId}
              frames={frames}
              displayName={targetUser.displayName}
              size="lg"
              status={isOnline ? 'online' : 'offline'}
            />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-display font-bold text-white truncate">{targetUser.displayName}</h3>
                {isFriend && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/35 text-[10px] font-bold text-emerald-300 shrink-0">
                    Friend
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={handleCopyGameId}
                className="mt-1 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/35 text-xs font-mono font-bold text-amber-300 cursor-pointer transition-colors"
              >
                <span>{targetUser.gameId}</span>
                {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
              <div className="text-[11px] text-slate-400 mt-1">
                {isOnline ? '🟢 Online' : '⚪ Offline'} · {targetUser.rank || 'Silver'} · Win Rate {winRate}%
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 flex items-center justify-center cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Crisp Stats Grid */}
        <div className="grid grid-cols-4 gap-2 text-center bg-[#070b13] p-3 rounded-xl border border-white/10 text-xs">
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">XP</div>
            <div className="font-mono font-bold text-amber-400 mt-0.5">{targetUser.xp || 0}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Win</div>
            <div className="font-mono font-bold text-emerald-400 mt-0.5">{winCount}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Loss</div>
            <div className="font-mono font-bold text-rose-400 mt-0.5">{lossCount}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">Draw</div>
            <div className="font-mono font-bold text-sky-400 mt-0.5">{drawCount}</div>
          </div>
        </div>

        {/* Social Actions */}
        {!isSelf && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {isFriend ? (
                <button
                  type="button"
                  disabled={busyAction}
                  onClick={handleUnfriend}
                  className="h-10 rounded-xl bg-white/10 hover:bg-rose-500/20 border border-white/15 hover:border-rose-400/40 text-xs font-bold text-slate-200 hover:text-rose-200 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <UserMinus className="w-4 h-4" />
                  <span>{lang === 'my' ? 'မိတ်ဆွေဖြုတ်မည်' : 'Unfriend'}</span>
                </button>
              ) : requestStatus === 'outgoing' ? (
                <button
                  type="button"
                  disabled={busyAction}
                  onClick={handleCancelRequest}
                  className="h-10 rounded-xl bg-amber-500/15 hover:bg-rose-500/20 border border-amber-400/40 text-xs font-bold text-amber-200 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Clock className="w-4 h-4" />
                  <span>{lang === 'my' ? 'တောင်းဆိုထားပြီး (Cancel)' : 'Requested (Cancel)'}</span>
                </button>
              ) : requestStatus === 'incoming' ? (
                <button
                  type="button"
                  disabled={busyAction}
                  onClick={handleAcceptRequest}
                  className="h-10 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>{lang === 'my' ? 'လက်ခံမည် (Accept)' : 'Accept Request'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busyAction || isBlocked}
                  onClick={handleSendFriendRequest}
                  className="h-10 rounded-xl cyber-cta-gold disabled:opacity-40 text-slate-950 text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>{lang === 'my' ? 'မိတ်ဆွေတောင်းဆိုမည်' : 'Send Request'}</span>
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
                  placeholder={lang === 'my' ? `${targetUser.displayName} ထံ စာတိုပို့မည်...` : 'Send quick message...'}
                  className="flex-1 h-10 px-3 rounded-xl bg-[#070b13] border border-white/15 text-xs text-white focus:outline-none focus:border-amber-400"
                />
                <button
                  type="submit"
                  disabled={sendingDm || !dmText.trim()}
                  className="px-3.5 h-10 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-xs flex items-center justify-center cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            )}

            {/* Duel / Block / Report */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10">
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

            {/* Structured User Report Form */}
            {reportOpen && (
              <form
                onSubmit={handleSubmitReport}
                className="p-3.5 rounded-xl bg-[#070b13] border border-rose-500/40 space-y-2.5"
              >
                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-300">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{lang === 'my' ? 'ကစားသမားအား Admin ထံ တိုင်ကြားရန်' : 'Report Player to Admin'}</span>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    {lang === 'my' ? 'တိုင်ကြားသည့် အမျိုးအစား' : 'Violation Category'}
                  </label>
                  <select
                    value={reportCategory}
                    onChange={(e) => setReportCategory(e.target.value)}
                    className="w-full h-9 px-2.5 rounded-lg bg-[#101728] border border-white/15 text-xs text-white focus:outline-none focus:border-rose-400"
                  >
                    {REPORT_CATEGORIES.map((c) => (
                      <option key={c.id} value={c.id}>
                        {lang === 'my' ? c.labelMy : c.labelEn}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    {lang === 'my' ? 'အသေးစိတ် ဖော်ပြချက်' : 'Details'}
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={reportDetail}
                    onChange={(e) => setReportDetail(e.target.value)}
                    placeholder={
                      lang === 'my'
                        ? 'မည်သည့်အချိန်၊ မည်သို့ စည်းကမ်းချိုးဖောက်ကြောင်း အကျဉ်းချုပ် ရေးပါ...'
                        : 'Describe what happened...'
                    }
                    className="w-full p-2.5 rounded-lg bg-[#101728] border border-white/15 text-xs text-white focus:outline-none focus:border-rose-400"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setReportOpen(false)}
                    className="px-3 h-8 rounded-lg bg-white/10 text-xs text-slate-300 cursor-pointer"
                  >
                    {lang === 'my' ? 'မလုပ်တော့ပါ' : 'Cancel'}
                  </button>
                  <button
                    type="submit"
                    disabled={submittingReport}
                    className="px-4 h-8 rounded-lg bg-rose-500 hover:bg-rose-400 disabled:opacity-50 text-white font-bold text-xs cursor-pointer"
                  >
                    {submittingReport ? '...' : lang === 'my' ? 'Report ပို့မည်' : 'Submit Report'}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};
