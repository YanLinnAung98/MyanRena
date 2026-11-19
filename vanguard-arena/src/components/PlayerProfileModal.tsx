import React from 'react';
import { motion } from 'motion/react';
import {
  Ban,
  Check,
  Copy,
  Flag,
  MessageSquare,
  Send,
  ShieldCheck,
  Swords,
  UserMinus,
  UserPlus,
  X,
} from 'lucide-react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured, stripUndefined } from '../lib/firebase.ts';
import { readServerlessStore, saveActiveSessionUser } from '../lib/serverlessApi.ts';
import type { GameType, Language, UserProfile } from '../types.ts';
import { soundEngine } from '../utils/sound.ts';
import { AvatarWithFrame } from './AvatarWithFrame.tsx';

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
  const [copiedId, setCopiedId] = React.useState(false);
  const [dmText, setDmText] = React.useState('');
  const [sendingDm, setSendingDm] = React.useState(false);
  const [reportOpen, setReportOpen] = React.useState(false);
  const [reportReason, setReportReason] = React.useState('');

  React.useEffect(() => {
    let active = true;
    const loadLatest = async () => {
      if (isFirebaseConfigured && db) {
        const snap = await getDoc(doc(db, 'users', userId)).catch(() => null);
        if (snap && snap.exists() && active) {
          setTargetUser(snap.data());
        }
      }
    };
    loadLatest();
    return () => {
      active = false;
    };
  }, [userId]);

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

  const persistMyRelations = async (nextFriends: string[], nextBlocked: string[], toastMsg: string) => {
    const updated = { ...currentUser, friends: nextFriends, blocked: nextBlocked };
    saveActiveSessionUser(updated);
    onUserUpdated?.(updated);
    if (isFirebaseConfigured && db) {
      await setDoc(
        doc(db, 'users', currentUser.id),
        stripUndefined({ friends: nextFriends, blocked: nextBlocked }),
        { merge: true }
      ).catch(() => {});
    }
    soundEngine.playClick();
    onNotify?.('success', toastMsg);
  };

  const handleToggleFriend = () => {
    if (isFriend) {
      persistMyRelations(
        friends.filter((id) => id !== targetUser.id),
        blocked,
        lang === 'my' ? 'မိတ်ဆွေစာရင်းမှ ဖယ်ရှားပြီးပါပြီ။' : 'Removed from friends.'
      );
    } else {
      persistMyRelations(
        Array.from(new Set([...friends, targetUser.id])),
        blocked.filter((id) => id !== targetUser.id),
        lang === 'my' ? `${targetUser.displayName} ကို မိတ်ဆွေအဖြစ် ထည့်သွင်းပြီးပါပြီ!` : `Added ${targetUser.displayName} as friend!`
      );
    }
  };

  const handleToggleBlock = () => {
    if (isBlocked) {
      persistMyRelations(
        friends,
        blocked.filter((id) => id !== targetUser.id),
        lang === 'my' ? 'Block ဖြုတ်ပြီးပါပြီ။' : 'User unblocked.'
      );
    } else {
      persistMyRelations(
        friends.filter((id) => id !== targetUser.id),
        Array.from(new Set([...blocked, targetUser.id])),
        lang === 'my' ? `${targetUser.displayName} ကို Block လုပ်ပြီးပါပြီ။` : `Blocked ${targetUser.displayName}.`
      );
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
    if (!reportReason.trim()) return;
    const rid = `rep_${Date.now()}`;
    const payload = stripUndefined({
      id: rid,
      reporterId: currentUser.id,
      reporterName: currentUser.displayName,
      targetUserId: targetUser.id,
      targetName: targetUser.displayName,
      reason: reportReason.trim(),
      status: 'pending',
      createdAtMs: Date.now(),
    });
    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, 'reports', rid), payload).catch(() => {});
    }
    setReportReason('');
    setReportOpen(false);
    onNotify?.('info', lang === 'my' ? 'Admin ထံ Report ပေးပို့ပြီးပါပြီ။' : 'Report sent to Administrator.');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <motion.div
        initial={{ scale: 0.93, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md rounded-2xl cyber-panel border border-amber-400/50 p-5 space-y-4 shadow-2xl max-h-[90dvh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <AvatarWithFrame
              avatarUrl={targetUser.avatarUrl}
              frameId={targetUser.frameId}
              frames={frames}
              displayName={targetUser.displayName}
              size="lg"
              status={isOnline ? 'online' : 'offline'}
            />
            <div className="min-w-0">
              <h3 className="text-base font-display font-bold text-white truncate">{targetUser.displayName}</h3>
              <button
                type="button"
                onClick={handleCopyGameId}
                className="mt-0.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-400/35 text-xs font-mono font-bold text-amber-300 cursor-pointer"
              >
                <span>{targetUser.gameId}</span>
                {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              </button>
              <div className="text-[11px] text-slate-400 mt-1">
                {isOnline ? '🟢 Online Now' : '⚪ Offline'} · {targetUser.rank || 'Silver'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 text-slate-300 flex items-center justify-center cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-4 gap-2 text-center bg-[#070b14] p-3 rounded-xl border border-white/10 text-xs">
          <div>
            <div className="text-[10px] text-slate-400">XP</div>
            <div className="font-mono font-bold text-amber-400">{targetUser.xp || 0}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400">Win</div>
            <div className="font-mono font-bold text-emerald-400">{targetUser.wins || 0}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400">Loss</div>
            <div className="font-mono font-bold text-rose-400">{targetUser.losses || 0}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400">Draw</div>
            <div className="font-mono font-bold text-sky-400">{targetUser.draws || 0}</div>
          </div>
        </div>

        {/* Action Buttons for Other Players */}
        {!isSelf && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleToggleFriend}
                className={`h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                  isFriend
                    ? 'bg-white/10 text-slate-200 border border-white/15'
                    : 'cyber-cta-gold text-slate-950'
                }`}
              >
                {isFriend ? <UserMinus className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                <span>
                  {isFriend
                    ? lang === 'my' ? 'မိတ်ဆွေဖြုတ်မည်' : 'Unfriend'
                    : lang === 'my' ? 'မိတ်ဆွေထည့်မည်' : 'Add Friend'}
                </span>
              </button>

              <button
                type="button"
                disabled={isBlocked}
                onClick={() => {
                  onClose();
                  if (onOpenChatWith) onOpenChatWith(targetUser.id);
                }}
                className="h-10 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 disabled:opacity-40 border border-sky-400/40 text-xs font-bold text-sky-200 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <MessageSquare className="w-4 h-4" />
                <span>{lang === 'my' ? 'Chat ဖွင့်မည်' : 'Open Chat'}</span>
              </button>
            </div>

            {/* Quick Inline Direct Message */}
            {!isBlocked && (
              <form onSubmit={handleQuickDm} className="flex gap-2">
                <input
                  type="text"
                  value={dmText}
                  onChange={(e) => setDmText(e.target.value)}
                  placeholder={lang === 'my' ? `${targetUser.displayName} ထံ စာတိုပို့မည်...` : 'Send quick message...'}
                  className="flex-1 h-10 px-3 rounded-xl bg-[#070b14] border border-white/15 text-xs text-white focus:outline-none focus:border-amber-400"
                />
                <button
                  type="submit"
                  disabled={sendingDm || !dmText.trim()}
                  className="px-3.5 h-10 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            )}

            {/* Challenge / Block / Report Row */}
            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/10">
              <button
                type="button"
                disabled={isBlocked}
                onClick={() => {
                  onClose();
                  onChallenge(targetUser.id, 'connect4');
                }}
                className="h-9 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 disabled:opacity-40 text-[11px] font-bold text-indigo-200 flex items-center justify-center gap-1 cursor-pointer"
              >
                <Swords className="w-3.5 h-3.5" />
                <span>{lang === 'my' ? 'စိန်ခေါ်' : 'Duel'}</span>
              </button>

              <button
                type="button"
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
                className="h-9 rounded-xl bg-white/5 hover:bg-white/10 text-[11px] font-semibold text-slate-300 flex items-center justify-center gap-1 cursor-pointer"
              >
                <Flag className="w-3.5 h-3.5 text-amber-400" />
                <span>Report</span>
              </button>
            </div>

            {reportOpen && (
              <form onSubmit={handleSubmitReport} className="p-3 rounded-xl bg-[#070b14] border border-rose-500/30 space-y-2">
                <input
                  type="text"
                  required
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder={lang === 'my' ? 'တိုင်ကြားလိုသည့် အကြောင်းရင်း...' : 'Reason for reporting...'}
                  className="w-full h-9 px-3 rounded-lg bg-[#101728] border border-white/10 text-xs text-white"
                />
                <button
                  type="submit"
                  className="w-full h-8 rounded-lg bg-rose-500 text-white font-bold text-xs cursor-pointer"
                >
                  {lang === 'my' ? 'Admin ထံ Report ပို့မည်' : 'Submit Report'}
                </button>
              </form>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
};
