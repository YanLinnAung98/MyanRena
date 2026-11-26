import React from 'react';
import { motion } from 'motion/react';
import {
  Award,
  Ban,
  Check,
  Copy,
  Flag,
  MessageSquare,
  Send,
  Share2,
  ShieldCheck,
  Swords,
  UserMinus,
  UserPlus,
  X,
} from 'lucide-react';
import { collection, deleteDoc, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db, isFirebaseConfigured, stripUndefined } from '../lib/firebase.ts';
import { readServerlessStore, saveActiveSessionUser } from '../lib/serverlessApi.ts';
import type { GameType, Language, PlayerGift, UserProfile } from '../types.ts';
import { resolveBannerImage } from '../utils/gameArtworks.ts';
import { soundEngine } from '../utils/sound.ts';
import { AvatarWithFrame } from './AvatarWithFrame.tsx';
import { GameBadgeIcon, GiftTrophyIcon, RankTierIcon } from './PremiumIcons.tsx';
import { ShareProfileModal } from './ShareProfileModal.tsx';
import { getMyanmarTownshipLabel } from '../data/myanmarTownships.ts';

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
    const found = allUsers.find((u) => u.id === userId || u.gameId === userId);
    if (found) return found;
    const store = readServerlessStore();
    return store.users[userId] || Object.values(store.users || {}).find((u: any) => u.gameId === userId) || null;
  });
  const [profileLoading, setProfileLoading] = React.useState(false);
  const [profileLoadError, setProfileLoadError] = React.useState('');
  const [retryLoad, setRetryLoad] = React.useState(0);
  const [copiedId, setCopiedId] = React.useState(false);
  const [dmText, setDmText] = React.useState('');
  const [sendingDm, setSendingDm] = React.useState(false);
  const [duelPickerOpen, setDuelPickerOpen] = React.useState(false);
  const [reportOpen, setReportOpen] = React.useState(false);
  const [reportReason, setReportReason] = React.useState('');
  const [shareOpen, setShareOpen] = React.useState(false);

  // Keep the public profile fresh and always resolve loading/error states.
  React.useEffect(() => {
    let active = true;
    const localMatch =
      allUsers.find((u) => u.id === userId || u.gameId === userId) ||
      Object.values(readServerlessStore().users || {}).find((u: any) => u.id === userId || u.gameId === userId) ||
      null;

    setTargetUser(localMatch);
    setProfileLoadError('');
    setProfileLoading(true);

    const loadLatest = async () => {
      try {
        if (!isFirebaseConfigured || !db) {
          if (!localMatch) {
            setProfileLoadError(lang === 'my' ? 'ဒီကစားသမား၏ Profile ကို မတွေ့ပါ။' : 'This player profile could not be found.');
          }
          return;
        }

        let found: any = null;
        const directSnap = await getDoc(doc(db, 'users', userId));
        if (directSnap.exists()) {
          found = { id: directSnap.id, ...directSnap.data() };
        } else {
          const byGameId = await getDocs(query(collection(db, 'users'), where('gameId', '==', userId)));
          if (!byGameId.empty) {
            const playerDoc = byGameId.docs[0];
            found = { id: playerDoc.id, ...playerDoc.data() };
          }
        }

        if (active && found) {
          setTargetUser(found);
        } else if (active && !localMatch) {
          setProfileLoadError(lang === 'my' ? 'ဒီကစားသမား၏ Profile ကို မတွေ့ပါ။' : 'This player profile could not be found.');
        }
      } catch (error) {
        console.error('Unable to load player profile:', error);
        if (active && !localMatch) {
          setProfileLoadError(lang === 'my' ? 'Profile ကို ဖွင့်မရပါ။ Internet ချိတ်ဆက်မှုကို စစ်ပြီး ပြန်စမ်းပါ။' : 'Could not load this profile. Check your connection and try again.');
        }
      } finally {
        if (active) setProfileLoading(false);
      }
    };

    void loadLatest();
    return () => {
      active = false;
    };
  }, [userId, allUsers, lang, retryLoad]);

  if (!targetUser) {
    return (
      <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="w-full max-w-sm cyber-panel rounded-2xl border border-white/10 p-6 text-center space-y-3" role="dialog" aria-modal="true" aria-labelledby="profile-load-title">
          <div className="mx-auto w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-400/20 flex items-center justify-center">
            {profileLoading ? <span className="w-5 h-5 rounded-full border-2 border-amber-300/30 border-t-amber-300 animate-spin" /> : <Flag className="w-5 h-5 text-amber-300" />}
          </div>
          <h3 id="profile-load-title" className="text-sm font-bold text-white">
            {profileLoading ? (lang === 'my' ? 'Profile ဖွင့်နေပါသည်' : 'Loading profile') : (lang === 'my' ? 'Profile မရရှိပါ' : 'Profile unavailable')}
          </h3>
          <p className="text-xs leading-relaxed text-slate-400">
            {profileLoading ? (lang === 'my' ? 'ကစားသမား အချက်အလက်များကို ရယူနေပါသည်။' : 'Fetching player information.') : (profileLoadError || (lang === 'my' ? 'ထပ်မံစမ်းကြည့်ပါ။' : 'Please try again.'))}
          </p>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button type="button" onClick={onClose} className="h-10 rounded-xl bg-white/10 text-xs font-bold text-white cursor-pointer">
              {lang === 'my' ? 'ပိတ်မည်' : 'Close'}
            </button>
            <button type="button" disabled={profileLoading} onClick={() => setRetryLoad((value) => value + 1)} className="h-10 rounded-xl cyber-cta-gold text-xs font-extrabold text-slate-950 disabled:opacity-50 cursor-pointer">
              {lang === 'my' ? 'ပြန်စမ်းမည်' : 'Try again'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isSelf = targetUser.id === currentUser.id;
  const friends: string[] = Array.isArray(currentUser.friends) ? currentUser.friends : [];
  const blocked: string[] = Array.isArray(currentUser.blocked) ? currentUser.blocked : [];
  const isFriend = friends.includes(targetUser.id);
  const isBlocked = blocked.includes(targetUser.id);
  const isOnline = Boolean(targetUser.online && Date.now() - Number(targetUser.lastSeenMs || 0) < 90000);
  const targetDisplayName = String(targetUser.displayName || targetUser.username || (lang === 'my' ? 'ကစားသမား' : 'Player'));
  const targetBio = typeof targetUser.bio === 'string' ? targetUser.bio.trim() : '';
  const bannerSrc = resolveBannerImage(targetUser.bannerUrl, targetUser.bannerId);
  const gifts: PlayerGift[] = Array.isArray(targetUser.gifts) ? targetUser.gifts.filter(Boolean) : [];

  const totalMatches = (Number(targetUser.wins) || 0) + (Number(targetUser.losses) || 0) + (Number(targetUser.draws) || 0);
  const winRate = totalMatches > 0 ? Math.round(((targetUser.wins || 0) / totalMatches) * 100) : 0;

  const handleToggleFriend = async () => {
    if (!isFirebaseConfigured || !db) {
      onNotify?.('error', lang === 'my' ? 'Friend စနစ်အတွက် Cloud ချိတ်ဆက်မှု မရရှိသေးပါ။' : 'Friend features require a cloud connection.');
      return;
    }
    const outgoingId = `${currentUser.id}__${targetUser.id}`;
    const incomingId = `${targetUser.id}__${currentUser.id}`;
    try {
      if (isFriend) {
        await Promise.all([
          deleteDoc(doc(db, 'friendRequests', outgoingId)),
          deleteDoc(doc(db, 'friendRequests', incomingId)),
        ]);
        const updated = { ...currentUser, friends: friends.filter((id) => id !== targetUser.id) };
        saveActiveSessionUser(updated);
        onUserUpdated?.(updated);
        onNotify?.('success', lang === 'my' ? 'မိတ်ဆွေစာရင်းမှ ဖယ်ရှားပြီးပါပြီ။' : 'Friend removed.');
        return;
      }
      const existing = await getDoc(doc(db, 'friendRequests', outgoingId));
      if (existing.exists()) {
        const status = existing.data().status;
        onNotify?.('info', status === 'pending'
          ? (lang === 'my' ? 'Friend Request ပို့ထားပြီးပါပြီ။' : 'Friend request is already pending.')
          : (lang === 'my' ? 'Friend Request အခြေအနေကို Social စာမျက်နှာတွင် စစ်ဆေးပါ။' : 'Check the request status in Social.'));
        return;
      }
      await setDoc(doc(db, 'friendRequests', outgoingId), stripUndefined({
        id: outgoingId,
        fromUserId: currentUser.id,
        fromName: currentUser.displayName || currentUser.username,
        fromGameId: currentUser.gameId,
        fromAvatarUrl: currentUser.avatarUrl,
        fromFrameId: currentUser.frameId,
        toUserId: targetUser.id,
        toName: targetDisplayName,
        toGameId: targetUser.gameId,
        status: 'pending',
        createdAtMs: Date.now(),
      }));
      onNotify?.('success', lang === 'my' ? 'Friend Request ပေးပို့ပြီးပါပြီ။ လက်ခံမှ မိတ်ဆွေဖြစ်ပါမည်။' : 'Friend request sent. You will become friends when accepted.');
    } catch (error) {
      console.error('Friend action failed:', error);
      onNotify?.('error', lang === 'my' ? 'Friend လုပ်ဆောင်ချက် မအောင်မြင်ပါ။ Connection ကို စစ်ဆေးပါ။' : 'Friend action failed. Check your connection.');
    }
  };

  const handleToggleBlock = async () => {
    if (!isFirebaseConfigured || !db) {
      onNotify?.('error', lang === 'my' ? 'Block စနစ်အတွက် Cloud ချိတ်ဆက်မှု မရရှိသေးပါ။' : 'Blocking requires a cloud connection.');
      return;
    }
    const blockId = `${currentUser.id}__${targetUser.id}`;
    try {
      if (isBlocked) {
        await deleteDoc(doc(db, 'userBlocks', blockId));
        const updated = { ...currentUser, blocked: blocked.filter((id) => id !== targetUser.id) };
        saveActiveSessionUser(updated);
        onUserUpdated?.(updated);
        onNotify?.('success', lang === 'my' ? 'Block ဖြုတ်ပြီးပါပြီ။' : 'Player unblocked.');
      } else {
        await setDoc(doc(db, 'userBlocks', blockId), {
          blockerId: currentUser.id,
          blockedId: targetUser.id,
          createdAtMs: Date.now(),
        });
        await Promise.all([
          deleteDoc(doc(db, 'friendRequests', blockId)).catch(() => {}),
          deleteDoc(doc(db, 'friendRequests', `${targetUser.id}__${currentUser.id}`)).catch(() => {}),
        ]);
        const updated = {
          ...currentUser,
          friends: friends.filter((id) => id !== targetUser.id),
          blocked: Array.from(new Set([...blocked, targetUser.id])),
        };
        saveActiveSessionUser(updated);
        onUserUpdated?.(updated);
        onNotify?.('success', lang === 'my' ? `${targetDisplayName} ကို Block လုပ်ပြီးပါပြီ။` : `${targetDisplayName} blocked.`);
      }
    } catch (error) {
      console.error('Block action failed:', error);
      onNotify?.('error', lang === 'my' ? 'Block လုပ်ဆောင်ချက် မအောင်မြင်ပါ။ Connection ကို စစ်ဆေးပါ။' : 'Block action failed. Check your connection.');
    }
  };

  const handleCopyGameId = async () => {
    const value = String(targetUser.gameId || targetUser.id || '');
    try {
      if (!navigator.clipboard?.writeText) throw new Error('CLIPBOARD_UNAVAILABLE');
      await navigator.clipboard.writeText(value);
      soundEngine.playClick?.();
      setCopiedId(true);
      onNotify?.('success', `Copied ID: ${value}`);
      window.setTimeout(() => setCopiedId(false), 1800);
    } catch (error) {
      console.error('Unable to copy player ID:', error);
      onNotify?.('error', lang === 'my' ? 'Game ID ကို Copy မလုပ်နိုင်ပါ။ Browser Permission ကို စစ်ပါ။' : 'Could not copy the Game ID. Check browser permissions.');
    }
  };

  const handleQuickDm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dmText.trim() || isBlocked) return;
    setSendingDm(true);
    try {
      if (!isFirebaseConfigured || !db) {
        onNotify?.('error', lang === 'my' ? 'စာတိုပို့ရန် Cloud Server ချိတ်ဆက်မှု မရရှိသေးပါ။' : 'Messaging is unavailable because the cloud service is not connected.');
        return;
      }
      const dmId = `dm_${Date.now()}_${Math.floor(Math.random() * 999)}`;
      const msg = stripUndefined({
        id: dmId,
        fromUserId: currentUser.id,
        fromName: currentUser.displayName,
        toUserId: targetUser.id,
        toName: targetDisplayName,
        text: dmText.trim(),
        createdAtMs: Date.now(),
      });
      if (isFirebaseConfigured && db) {
        await setDoc(doc(db, 'messages', dmId), msg);
      }
      setDmText('');
      soundEngine.playNotify?.();
      onNotify?.('success', lang === 'my' ? 'စာတို ပေးပို့ပြီးပါပြီ!' : 'Message sent!');
    } catch (error) {
      console.error('Quick message failed:', error);
      onNotify?.('error', lang === 'my' ? 'စာတိုပို့မရပါ။ Connection ကို စစ်ပြီး ပြန်စမ်းပါ။' : 'Message could not be sent. Check the connection and try again.');
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
      targetName: targetDisplayName,
      reason: reportReason.trim(),
      status: 'pending',
      createdAtMs: Date.now(),
    });
    if (!isFirebaseConfigured || !db) {
      onNotify?.('error', lang === 'my' ? 'Report ပေးပို့ရန် Cloud Server ချိတ်ဆက်မှု မရရှိသေးပါ။' : 'The cloud service is unavailable, so the report could not be sent.');
      return;
    }
    try {
      await setDoc(doc(db, 'reports', rid), payload);
      setReportReason('');
      setReportOpen(false);
      onNotify?.('success', lang === 'my' ? 'Admin ထံ Report ပေးပို့ပြီးပါပြီ။' : 'Report sent to Administrator.');
    } catch (error) {
      console.error('Player report failed:', error);
      onNotify?.('error', lang === 'my' ? 'Report ပေးပို့မရပါ။ နောက်တစ်ကြိမ် ပြန်စမ်းပါ။' : 'Could not send the report. Please try again.');
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label={lang === 'my' ? `${targetDisplayName} ၏ Profile` : `${targetDisplayName}'s profile`}
          initial={{ scale: 0.97, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-full max-w-2xl rounded-2xl cyber-panel border border-amber-400/35 overflow-hidden shadow-2xl max-h-[92dvh] flex flex-col"
        >
          {/* Banner Header */}
          <div className="relative h-36 sm:h-44 w-full shrink-0 bg-[#070b14]">
            <img src={bannerSrc} alt="Player Banner" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0b101d] via-[#0b101d]/30 to-black/30" />

            <div className="absolute top-2.5 left-3 flex items-center gap-1.5">
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold backdrop-blur-md border ${
                  isOnline
                    ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                    : 'bg-black/60 border-white/15 text-slate-300'
                }`}
              >
                {isOnline ? '● LIVE ONLINE' : '○ OFFLINE'}
              </span>
              {targetUser.favoriteGame && (
                <span className="p-1 rounded-lg bg-black/60 border border-white/15" title="Favorite Game">
                  <GameBadgeIcon gameType={targetUser.favoriteGame} className="w-4 h-4" />
                </span>
              )}
            </div>

            <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShareOpen(true)}
                className="px-2.5 h-8 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                title="Share Profile"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share</span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-black/65 hover:bg-black/85 border border-white/15 text-slate-200 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="px-5 pb-5 -mt-10 relative z-10 space-y-3.5 overflow-y-auto">
            <div className="flex items-end gap-3.5">
              <AvatarWithFrame
                avatarUrl={targetUser.avatarUrl}
                frameId={targetUser.frameId}
                frames={frames}
                displayName={targetDisplayName}
                size="lg"
                status={isOnline ? 'online' : 'offline'}
              />
              <div className="min-w-0 pb-0.5 flex-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-base font-display font-bold text-white truncate">
                    {targetDisplayName}
                  </h3>
                  <RankTierIcon tier={targetUser.rank || 'silver'} className="w-5 h-5 shrink-0" />
                </div>
                <div className="flex flex-wrap items-center gap-1.5 mt-1">
                  <button
                    type="button"
                    onClick={handleCopyGameId}
                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-400/35 text-[11px] font-mono font-bold text-amber-300 cursor-pointer"
                  >
                    <span>{targetUser.gameId}</span>
                    {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                  <span className="text-[11px] font-semibold text-slate-300">{targetUser.rank || 'Silver'}</span>
                </div>
              </div>
            </div>

            {/* Bio */}
            <div className="p-3 rounded-xl bg-[#070b14]/90 border border-white/10">
              <div className="text-[10px] uppercase tracking-wider font-bold text-amber-400/80 mb-1">
                {lang === 'my' ? 'ကိုယ်ရေးအကျဉ်း (Bio)' : 'Player Bio'}
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">
                {targetBio
                  ? targetBio
                  : lang === 'my'
                  ? 'Vanguard Arena တွင် ယှဉ်ပြိုင်နေသော ကစားသမားတစ်ဦးဖြစ်ပါသည်။'
                  : 'Competing live in Vanguard Arena.'}
              </p>
            </div>

            {(targetUser.showGender && targetUser.gender && targetUser.gender !== "prefer-not-to-say") || (targetUser.showAgeRange && targetUser.ageRange) || (targetUser.showCity && targetUser.city) || (targetUser.showCountry && targetUser.country) ? (
              <div className="flex flex-wrap gap-2">
                {targetUser.showGender && targetUser.gender && targetUser.gender !== "prefer-not-to-say" && <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] text-slate-300">{targetUser.gender === "woman" ? "Woman" : targetUser.gender === "man" ? "Man" : targetUser.gender === "non-binary" ? "Non-binary" : "Self-described"}</span>}
                {targetUser.showAgeRange && targetUser.ageRange && <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] text-slate-300">{targetUser.ageRange === "under-16" ? "Under 16" : targetUser.ageRange === "35-plus" ? "35+" : targetUser.ageRange}</span>}
                {targetUser.showCity && targetUser.city && <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] text-slate-300">{getMyanmarTownshipLabel(targetUser.city, lang)}</span>}
                {!targetUser.showCity && targetUser.showCountry && targetUser.country && <span className="px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-[10px] text-slate-300">{targetUser.country}</span>}
              </div>
            ) : null}
            {/* Stats */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 text-center bg-[#070b14] p-2.5 rounded-xl border border-white/10 text-xs">
              <div>
                <div className="text-[10px] text-slate-400">XP</div>
                <div className="font-mono font-bold text-amber-400">{targetUser.xp || 0}</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400">Matches</div>
                <div className="font-mono font-bold text-white">{totalMatches}</div>
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
              <div>
                <div className="text-[10px] text-slate-400">WR%</div>
                <div className="font-mono font-bold text-white">{winRate}%</div>
              </div>
            </div>

            {/* Trophies */}
            {gifts.length > 0 && (
              <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/10 via-[#0b101d] to-amber-500/10 border border-amber-400/30 space-y-2">
                <div className="text-[11px] font-bold text-amber-300 flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5" />
                  <span>
                    {lang === 'my' ? `ဆုတံဆိပ်နှင့် လက်ဆောင်များ (${gifts.length})` : `Trophies & Gifts (${gifts.length})`}
                  </span>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {gifts.map((g) => (
                    <div
                      key={g.id}
                      className="px-2.5 py-1.5 rounded-xl bg-[#070b14] border border-amber-400/30 flex items-center gap-2 shrink-0"
                    >
                      <GiftTrophyIcon iconId={g.iconId} className="w-6 h-6" />
                      <div>
                        <div className="text-[10px] font-bold text-white leading-tight">
                          {lang === 'my' ? g.nameMy : g.name}
                        </div>
                        {g.placement && (
                          <div className="text-[9px] font-mono text-amber-400 uppercase">{g.placement} Place</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!isSelf && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleToggleFriend}
                    className={`h-10 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer ${
                      isFriend ? 'bg-white/10 text-slate-200 border border-white/15' : 'cyber-cta-gold text-slate-950'
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

                {!isBlocked && (
                  <form onSubmit={handleQuickDm} className="flex gap-2">
                    <input
                      type="text"
                      value={dmText}
                      onChange={(e) => setDmText(e.target.value)}
                      placeholder={lang === 'my' ? `${targetDisplayName} ထံ စာတိုပို့မည်...` : 'Send quick message...'}
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

                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/10">
                  <button
                    type="button"
                    disabled={isBlocked}
                    onClick={() => setDuelPickerOpen((v) => !v)}
                    className="h-9 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 disabled:opacity-40 text-[11px] font-bold text-indigo-200 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Swords className="w-3.5 h-3.5" />
                    <span>{lang === 'my' ? 'စိန်ခေါ်မည်' : 'Duel'}</span>
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

                {duelPickerOpen && !isBlocked && (
                  <div className="p-2.5 rounded-xl bg-[#070b14] border border-indigo-400/35 space-y-2">
                    <div className="text-[10px] font-bold text-indigo-300">
                      {lang === 'my' ? 'စိန်ခေါ်လိုသော ဂိမ်းရွေးချယ်ပါ:' : 'Choose Game to Duel:'}
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(
                        [
                          { id: 'connect4', label: 'Connect 4' },
                          { id: 'tictactoe', label: 'Tic-Tac-Toe' },
                          { id: 'rps', label: 'RPS' },
                          { id: 'sakarhtar', label: lang === 'my' ? 'ဉာဏ်စမ်းပဟေဠိ' : 'Wise Owl Quiz' },
                        ] as Array<{ id: GameType; label: string }>
                      ).map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => {
                            onClose();
                            onChallenge(targetUser.id, g.id);
                          }}
                          className="p-2 rounded-lg bg-[#10182b] hover:bg-indigo-500/25 border border-white/10 text-[11px] font-bold text-white flex items-center gap-2 cursor-pointer"
                        >
                          <GameBadgeIcon gameType={g.id} className="w-5 h-5" />
                          <span className="truncate">{g.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

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
          </div>
        </motion.div>
      </div>

      {shareOpen && (
        <ShareProfileModal
          lang={lang}
          player={targetUser}
          frames={frames}
          onClose={() => setShareOpen(false)}
          onNotify={onNotify}
        />
      )}
    </>
  );
};
