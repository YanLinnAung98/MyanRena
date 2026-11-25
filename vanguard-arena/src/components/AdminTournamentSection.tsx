import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRightCircle,
  CheckCircle2,
  Gift,
  Plus,
  Radio,
  Shuffle,
  Sparkles,
  Swords,
  Trash2,
  Trophy,
  UserMinus,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { deleteDoc, doc, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured, stripUndefined } from '../lib/firebase.ts';
import {
  broadcastLocalSync,
  buildPlayableMatch,
  normalizeGameId,
  readServerlessStore,
  writeServerlessStore,
} from '../lib/serverlessApi.ts';
import type {
  PlayerGift,
  Tournament,
  TournamentMatchup,
  TournamentWinnerRecord,
  UserProfile,
} from '../types.ts';
import { GIFT_CATALOG } from '../utils/gameArtworks.ts';
import { AvatarWithFrame } from './AvatarWithFrame.tsx';
import { GameBadgeIcon, GiftTrophyIcon } from './PremiumIcons.tsx';

interface AdminTournamentSectionProps {
  tournaments: Tournament[];
  rooms: any[];
  users: UserProfile[];
  onCloseRoom: (roomId: string) => void;
  onLogAction: (action: string, detail: string) => Promise<void>;
  onNotify: (level: string, message: string) => void;
}

function computeRankFromXp(xp: number): string {
  if (xp >= 2500) return 'Legend';
  if (xp >= 1900) return 'Diamond';
  if (xp >= 1300) return 'Gold';
  if (xp >= 1000) return 'Silver';
  return 'Bronze';
}

export const AdminTournamentSection: React.FC<AdminTournamentSectionProps> = ({
  tournaments,
  rooms,
  users,
  onCloseRoom,
  onLogAction,
  onNotify,
}) => {
  const [title, setTitle] = React.useState('');
  const [gameType, setGameType] = React.useState('connect4');
  const [bracketSize, setBracketSize] = React.useState<8 | 16 | 32>(8);
  const [prizeXp, setPrizeXp] = React.useState(500);
  const [prizeLabel, setPrizeLabel] = React.useState('Champion Trophy + Exclusive Banner');
  const [minXpRequired, setMinXpRequired] = React.useState(0);
  const [scheduledAt, setScheduledAt] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [featuredOnBillboard, setFeaturedOnBillboard] = React.useState(true);

  const [managingTournamentId, setManagingTournamentId] = React.useState<string | null>(null);
  const [manualAddUserId, setManualAddUserId] = React.useState('');

  // Winner Gift Modal State
  const [giftModalTournament, setGiftModalTournament] = React.useState<Tournament | null>(null);
  const [winnerUserId, setWinnerUserId] = React.useState('');
  const [placement, setPlacement] = React.useState<'1st' | '2nd' | '3rd' | 'mvp'>('1st');
  const [selectedGiftId, setSelectedGiftId] = React.useState(GIFT_CATALOG[0].giftId);
  const [customBonusXp, setCustomBonusXp] = React.useState(GIFT_CATALOG[0].defaultXp);
  const [giftNote, setGiftNote] = React.useState('');
  const [broadcastWinner, setBroadcastWinner] = React.useState(true);
  const [awarding, setAwarding] = React.useState(false);

  const managingTournament = tournaments.find((t) => t.id === managingTournamentId) || null;

  const updateTournamentFields = async (tid: string, patch: Partial<Tournament>, toast?: string): Promise<boolean> => {
    if (!isFirebaseConfigured || !db) {
      onNotify('error', 'Firebase ချိတ်ဆက်မှု မရရှိသေးပါ။ ပြောင်းလဲမှုကို မသိမ်းနိုင်ပါ။');
      return false;
    }
    try {
      await setDoc(doc(db, 'tournaments', tid), stripUndefined(patch), { merge: true });
      if (toast) onNotify('success', toast);
      return true;
    } catch (error) {
      console.error('Tournament update failed:', error);
      onNotify('error', 'ပြိုင်ပွဲအချက်အလက် သိမ်းဆည်းမှု မအောင်မြင်ပါ။ Firestore Rules ကို စစ်ဆေးပါ။');
      return false;
    }
  };

  /**
   * Creates real playable Firestore `matches/{matchId}` docs for every paired bracket matchup
   */
  const createMatchupsAndFirestoreMatches = async (
    tr: Tournament,
    playerIds: string[],
    roundNumber: number
  ): Promise<TournamentMatchup[]> => {
    const normGame = normalizeGameId(tr.gameType);
    const matchups: TournamentMatchup[] = [];

    for (let i = 0; i < playerIds.length; i += 2) {
      const p1Id = playerIds[i];
      const p2Id = playerIds[i + 1];
      const mId = `m_r${roundNumber}_${i}_${Date.now()}`;
      const matchId = `tmatch_${tr.id}_r${roundNumber}_${i}`;

      if (!p2Id) {
        // Odd participant gets automatic BYE advance
        matchups.push({
          id: mId,
          round: roundNumber,
          player1Id: p1Id,
          winnerId: p1Id,
          status: 'finished',
        });
        continue;
      }

      const p1 = users.find((u) => u.id === p1Id) || {
        id: p1Id,
        displayName: 'Player 1',
        username: p1Id,
        gameId: p1Id,
        xp: 1000,
      };
      const p2 = users.find((u) => u.id === p2Id) || {
        id: p2Id,
        displayName: 'Player 2',
        username: p2Id,
        gameId: p2Id,
        xp: 1000,
      };

      const playable = buildPlayableMatch([p1 as any, p2 as any], {
        gameType: normGame,
        mode: 'tournament',
        bestOf: 3,
        turnTimeLimit: 20,
        isRealtimePvp: true,
      });

      const matchDoc = stripUndefined({
        ...playable,
        id: matchId,
        tournamentId: tr.id,
        tournamentTitle: tr.title,
        matchupId: mId,
        round: roundNumber,
        isRealtimePvp: true,
        updatedAtMs: Date.now(),
      });

      if (isFirebaseConfigured && db) {
        await setDoc(doc(db, 'matches', matchId), matchDoc);
      }

      matchups.push({
        id: mId,
        round: roundNumber,
        player1Id: p1Id,
        player2Id: p2Id,
        matchId,
        status: 'live',
      });
    }

    return matchups;
  };

  const handleCreateTournament = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const id = `tourney_${Date.now()}`;
    const item: Tournament = stripUndefined({
      id,
      title: title.trim(),
      description: description.trim(),
      gameType,
      bracketSize,
      prizeXp: Number(prizeXp) || 500,
      prizeLabel: prizeLabel.trim(),
      minXpRequired: Number(minXpRequired) || 0,
      scheduledAt: scheduledAt.trim(),
      featuredOnBillboard,
      status: 'open',
      participants: [],
      matchups: [],
      winners: [],
      createdAtMs: Date.now(),
      createdAt: new Date().toISOString(),
    });

    if (!isFirebaseConfigured || !db) {
      onNotify('error', 'Firebase ချိတ်ဆက်မှု မရရှိသေးပါ။ ပြိုင်ပွဲဖန်တီး၍ မရပါ။');
      return;
    }
    try {
      await setDoc(doc(db, 'tournaments', id), item);
    } catch (error) {
      console.error('Tournament creation failed:', error);
      onNotify('error', 'ပြိုင်ပွဲဖန်တီးမှု မအောင်မြင်ပါ။ Firestore Rules ကို စစ်ဆေးပါ။');
      return;
    }
    setTitle('');
    setDescription('');
    setScheduledAt('');
    await onLogAction('CREATE_TOURNAMENT', `${item.title} (${bracketSize}P, +${item.prizeXp} XP)`);
    onNotify('success', 'Professional ပြိုင်ပွဲအသစ် ဖန်တီးပြီးပါပြီ!');
  };

  const handleGenerateMatchupsAndStart = async (tr: Tournament) => {
    const ids = [...(tr.participants || [])];
    if (ids.length < 2) {
      onNotify('error', 'ပြိုင်ပွဲစတင်ရန် ကစားသမား အနည်းဆုံး ၂ ဦး လိုအပ်ပါသည်။');
      return;
    }

    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }

    if (!isFirebaseConfigured || !db) {
      onNotify('error', 'Firebase ချိတ်ဆက်မှု မရှိသေးပါ။ ပွဲစဉ်များ ဖန်တီး၍ မရပါ။');
      return;
    }

    let matchups: TournamentMatchup[];
    try {
      matchups = await createMatchupsAndFirestoreMatches(tr, ids, 1);
    } catch (error) {
      console.error('Tournament match creation failed:', error);
      onNotify('error', 'ပြိုင်ပွဲပွဲစဉ် ဖန်တီးမှု မအောင်မြင်ပါ။ Firestore Rules ကို စစ်ဆေးပါ။');
      return;
    }

    const saved = await updateTournamentFields(
      tr.id,
      { status: 'ongoing', matchups, featuredOnBillboard: true },
      `🚀 ${tr.title} စတင်ပြီး ပွဲစဉ် ${matchups.length} ခု ဖန်တီးလိုက်ပါပြီ! ကစားသမားများ ချက်ချင်းဝင်ဆော့နိုင်ပါပြီ။`
    );
    if (!saved) return;

    if (isFirebaseConfigured && db) {
      const notiId = `noti_${Date.now()}`;
      await setDoc(
        doc(db, 'notifications', notiId),
        stripUndefined({
          id: notiId,
          targetUserId: 'ALL',
          title: `🏆 LIVE: ${tr.title}`,
          message: `ပြိုင်ပွဲ စတင်နေပါပြီ! စာရင်းသွင်းထားသော ကစားသမားများ Tournaments ထဲဝင်၍ "ပွဲစဉ် ဝင်ဆော့မည်" ခလုတ်ကို နှိပ်ကာ ချက်ချင်းယှဉ်ပြိုင်နိုင်ပါပြီ။`,
          type: 'broadcast',
          senderName: 'Vanguard Arena Official',
          createdAtMs: Date.now(),
          read: false,
        })
      ).catch(() => {});
    }
    await onLogAction('START_TOURNAMENT', `Started ${tr.title} with ${ids.length} players`);
  };

  const handleGenerateNextRound = async (tr: Tournament) => {
    const existing = Array.isArray(tr.matchups) ? tr.matchups : [];
    const maxRound = existing.reduce((acc, m) => Math.max(acc, m.round || 1), 1);
    const currentRoundMatches = existing.filter((m) => (m.round || 1) === maxRound);
    const winners = currentRoundMatches.map((m) => m.winnerId).filter(Boolean) as string[];

    if (winners.length < 2) {
      onNotify('error', 'နောက်တစ်ဆင့် ဖန်တီးရန် လက်ရှိအဆင့်မှ အနိုင်ရသူ အနည်းဆုံး ၂ ဦး ရှိရပါမည်။');
      return;
    }

    const nextMatches = await createMatchupsAndFirestoreMatches(tr, winners, maxRound + 1);
    await updateTournamentFields(
      tr.id,
      { matchups: [...existing, ...nextMatches] },
      `Round ${maxRound + 1} ပွဲစဉ်များ ဖန်တီးပြီးပါပြီ!`
    );
  };

  const handleAdminMarkWinner = async (tr: Tournament, matchupId: string, winnerId: string) => {
    const updated = (tr.matchups || []).map((m) =>
      m.id === matchupId ? { ...m, winnerId, status: 'finished' as const } : m
    );
    await updateTournamentFields(tr.id, { matchups: updated }, 'အနိုင်ရသူ မှတ်တမ်းတင်ပြီးပါပြီ။');
  };

  const handleStatusChange = async (tr: Tournament, st: 'open' | 'ongoing' | 'completed') => {
    if (st === 'ongoing' && (!tr.matchups || tr.matchups.length === 0) && (tr.participants || []).length >= 2) {
      await handleGenerateMatchupsAndStart(tr);
      return;
    }
    await updateTournamentFields(tr.id, { status: st }, `အခြေအနေ ${st.toUpperCase()} ပြောင်းပြီးပါပြီ`);
  };

  const handleManualAddPlayer = async (tr: Tournament) => {
    if (!manualAddUserId) return;
    const current = Array.isArray(tr.participants) ? tr.participants : [];
    if (current.includes(manualAddUserId)) return;
    const bracketCapacity = tr.bracketSize || tr.maxPlayers || 8;
    if (current.length >= bracketCapacity) {
      onNotify('error', 'Bracket လူပြည့်သွားပါပြီ။');
      return;
    }
    await updateTournamentFields(
      tr.id,
      { participants: [...current, manualAddUserId] },
      'ကစားသမားကို ပြိုင်ပွဲစာရင်းသို့ ထည့်သွင်းပြီးပါပြီ။'
    );
    setManualAddUserId('');
  };

  const handleRemoveParticipant = async (tr: Tournament, uid: string) => {
    const next = (tr.participants || []).filter((id) => id !== uid);
    await updateTournamentFields(tr.id, { participants: next }, 'ကစားသမားကို ဖယ်ရှားပြီးပါပြီ။');
  };

  const handleDeleteTournament = async (tid: string) => {
    if (!window.confirm('ဤပြိုင်ပွဲကို ဖျက်သိမ်းမည်မှာ သေချာပါသလား?')) return;
    if (isFirebaseConfigured && db) {
      await deleteDoc(doc(db, 'tournaments', tid)).catch(() => {});
    }
    onNotify('info', 'ပြိုင်ပွဲ ဖျက်ပြီးပါပြီ။');
  };

  // Winner Gift Awarding
  const openGiftModal = (tr: Tournament) => {
    setGiftModalTournament(tr);
    const firstId = tr.participants?.[0] || users.find((u) => u.role !== 'admin')?.id || '';
    setWinnerUserId(firstId);
    setPlacement('1st');
    setSelectedGiftId(GIFT_CATALOG[0].giftId);
    setCustomBonusXp(tr.prizeXp || GIFT_CATALOG[0].defaultXp);
    setGiftNote('');
    setBroadcastWinner(true);
  };

  const handleAwardGiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!giftModalTournament || !winnerUserId) return;
    const targetUser = users.find((u) => u.id === winnerUserId);
    const giftTpl = GIFT_CATALOG.find((g) => g.giftId === selectedGiftId) || GIFT_CATALOG[0];
    if (!targetUser) return;

    setAwarding(true);
    try {
      const bonus = Math.max(0, Number(customBonusXp) || 0);
      const nextXp = (targetUser.xp || 0) + bonus;
      const newGift: PlayerGift = stripUndefined({
        id: `gift_${Date.now()}_${Math.floor(Math.random() * 999)}`,
        giftId: giftTpl.giftId,
        name: giftTpl.name,
        nameMy: giftTpl.nameMy,
        iconId: giftTpl.iconId,
        rarity: giftTpl.rarity,
        tournamentId: giftModalTournament.id,
        tournamentTitle: giftModalTournament.title,
        placement,
        bonusXp: bonus,
        note: giftNote.trim() || `${giftModalTournament.title} - ${placement.toUpperCase()} Winner`,
        awardedBy: 'Admin',
        awardedAtMs: Date.now(),
      });

      const nextGifts = [newGift, ...(Array.isArray(targetUser.gifts) ? targetUser.gifts : [])];
      const nextUnlockedFrames = Array.from(
        new Set([
          ...(Array.isArray(targetUser.unlockedFrames) ? targetUser.unlockedFrames : []),
          ...(giftTpl.unlockFrameId ? [giftTpl.unlockFrameId] : []),
        ])
      );
      const nextUnlockedBanners = Array.from(
        new Set([
          ...(Array.isArray(targetUser.unlockedBanners) ? targetUser.unlockedBanners : []),
          ...(giftTpl.unlockBannerId ? [giftTpl.unlockBannerId] : []),
        ])
      );

      const userPatch = stripUndefined({
        xp: nextXp,
        rank: computeRankFromXp(nextXp),
        gifts: nextGifts,
        unlockedFrames: nextUnlockedFrames,
        unlockedBanners: nextUnlockedBanners,
        updatedAtMs: Date.now(),
      });

      const store = readServerlessStore();
      if (store.users[targetUser.id]) {
        store.users[targetUser.id] = { ...store.users[targetUser.id], ...userPatch };
        writeServerlessStore(store);
      }
      if (isFirebaseConfigured && db) {
        await setDoc(
          doc(db, 'users', targetUser.id),
          {
            xp: userPatch.xp,
            rank: userPatch.rank,
            gifts: userPatch.gifts,
            unlockedFrames: userPatch.unlockedFrames,
            unlockedBanners: userPatch.unlockedBanners,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      }

      const winnerRec: TournamentWinnerRecord = stripUndefined({
        userId: targetUser.id,
        displayName: targetUser.displayName,
        gameId: targetUser.gameId,
        placement,
        giftName: giftTpl.nameMy,
        giftIconId: giftTpl.iconId,
        bonusXp: bonus,
        awardedAtMs: Date.now(),
      });
      const nextWinners = [
        ...(Array.isArray(giftModalTournament.winners) ? giftModalTournament.winners : []),
        winnerRec,
      ];
      await updateTournamentFields(giftModalTournament.id, { winners: nextWinners });

      if (isFirebaseConfigured && db) {
        const personalNotiId = `noti_gift_${Date.now()}`;
        await setDoc(
          doc(db, 'notifications', personalNotiId),
          stripUndefined({
            id: personalNotiId,
            targetUserId: targetUser.id,
            title: `🎁 ဂုဏ်ယူပါတယ်! ${giftTpl.nameMy} ရရှိပါပြီ`,
            message: `${giftModalTournament.title} (${placement.toUpperCase()}) ဆုအဖြစ် +${bonus} XP နှင့် အထူးလက်ဆောင်ကို သင့် Profile တွင် ထည့်သွင်းပေးပြီးပါပြီ။ ${giftNote}`,
            type: 'message',
            senderName: 'Vanguard Admin Awards',
            createdAtMs: Date.now(),
            read: false,
          })
        ).catch(() => {});

        if (broadcastWinner) {
          const bId = `noti_win_${Date.now() + 1}`;
          await setDoc(
            doc(db, 'notifications', bId),
            stripUndefined({
              id: bId,
              targetUserId: 'ALL',
              title: `🏆 ပြိုင်ပွဲဆုရှင် ဂုဏ်ပြုမှတ်တမ်း`,
              message: `${giftModalTournament.title} တွင် ${placement.toUpperCase()} ဆုရရှိသော ${targetUser.displayName} (${targetUser.gameId}) အား ${giftTpl.nameMy} နှင့် +${bonus} XP ချီးမြှင့်လိုက်ပါသည်!`,
              type: 'broadcast',
              senderName: 'Vanguard Arena Official',
              createdAtMs: Date.now(),
              read: false,
            })
          ).catch(() => {});
        }
      }

      broadcastLocalSync('GIFT_AWARDED');
      await onLogAction('AWARD_GIFT', `Awarded ${giftTpl.name} to ${targetUser.displayName}`);
      onNotify('success', `${targetUser.displayName} ထံ ဆုလက်ဆောင် ပေးအပ်ပြီးပါပြီ!`);
      setGiftModalTournament(null);
    } finally {
      setAwarding(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid lg:grid-cols-12 gap-4">
        <div className="lg:col-span-8 cyber-panel rounded-2xl p-4 space-y-4 border border-amber-500/25">
          <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
            <Trophy className="w-4 h-4" />
            <span>Professional Tournament Command & Prize Center</span>
          </h3>

          {/* Create Form */}
          <form onSubmit={handleCreateTournament} className="p-3.5 rounded-xl bg-[#070b14] border border-white/10 space-y-2.5">
            <div className="grid sm:grid-cols-12 gap-2">
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ပြိုင်ပွဲအမည် (ဥပမာ - MyanRena Grand Cup S1)"
                className="sm:col-span-6 h-10 px-3 rounded-xl bg-[#101728] border border-white/15 text-xs text-white"
              />
              <select
                value={gameType}
                onChange={(e) => setGameType(e.target.value)}
                className="sm:col-span-3 h-10 px-2 rounded-xl bg-[#101728] border border-white/15 text-xs text-white"
              >
                <option value="connect4">Connect 4</option>
                <option value="tictactoe">Tic-Tac-Toe</option>
                <option value="rps">Rock Paper Scissors</option>
                <option value="sakarhtar">ဉာဏ်စမ်းပဟေဠိ</option>
              </select>
              <select
                value={bracketSize}
                onChange={(e) => setBracketSize(Number(e.target.value) as 8 | 16 | 32)}
                className="sm:col-span-3 h-10 px-2 rounded-xl bg-[#101728] border border-white/15 text-xs text-white"
              >
                <option value={8}>8 Players</option>
                <option value={16}>16 Players</option>
                <option value={32}>32 Players</option>
              </select>
            </div>

            <div className="grid sm:grid-cols-12 gap-2">
              <input
                type="number"
                value={prizeXp}
                onChange={(e) => setPrizeXp(Number(e.target.value))}
                placeholder="Prize XP"
                className="sm:col-span-3 h-9 px-3 rounded-xl bg-[#101728] border border-white/15 text-xs font-mono text-amber-300"
              />
              <input
                type="text"
                value={prizeLabel}
                onChange={(e) => setPrizeLabel(e.target.value)}
                placeholder="ဆုလက်ဆောင် ဖော်ပြချက်..."
                className="sm:col-span-5 h-9 px-3 rounded-xl bg-[#101728] border border-white/15 text-xs text-white"
              />
              <input
                type="number"
                min={0}
                value={minXpRequired}
                onChange={(e) => setMinXpRequired(Number(e.target.value))}
                placeholder="Min XP"
                className="sm:col-span-2 h-9 px-2.5 rounded-xl bg-[#101728] border border-white/15 text-xs font-mono text-sky-300"
              />
              <input
                type="text"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                placeholder="8:00 PM"
                className="sm:col-span-2 h-9 px-2.5 rounded-xl bg-[#101728] border border-white/15 text-xs text-white"
              />
            </div>

            <div className="grid sm:grid-cols-12 gap-2 items-center">
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="ပြိုင်ပွဲ စည်းကမ်းချက် အကျဉ်းချုပ်..."
                className="sm:col-span-7 h-9 px-3 rounded-xl bg-[#101728] border border-white/15 text-xs text-white"
              />
              <label className="sm:col-span-5 flex items-center gap-2 text-xs text-amber-200 cursor-pointer px-1">
                <input
                  type="checkbox"
                  checked={featuredOnBillboard}
                  onChange={(e) => setFeaturedOnBillboard(e.target.checked)}
                  className="accent-amber-500"
                />
                <span>Billboard ပေါ်တွင် ပြသမည်</span>
              </label>
            </div>

            <button
              type="submit"
              className="w-full h-10 rounded-xl cyber-cta-gold text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Professional ပြိုင်ပွဲအသစ် ဖန်တီးမည်
            </button>
          </form>

          {/* Tournament List */}
          <div className="space-y-2.5 max-h-[54vh] overflow-y-auto pr-1">
            {tournaments.length === 0 ? (
              <div className="text-xs text-slate-500 text-center py-6">ပြိုင်ပွဲ မရှိသေးပါ။</div>
            ) : (
              tournaments.map((tr) => {
                const count = (tr.participants || []).length;
                const matchups = Array.isArray(tr.matchups) ? tr.matchups : [];
                return (
                  <div key={tr.id} className="p-3.5 rounded-xl bg-[#070b14] border border-white/10 space-y-2.5">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <GameBadgeIcon gameType={tr.gameType} className="w-8 h-8 shrink-0" />
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-white truncate flex items-center gap-1.5">
                            <span>{tr.title}</span>
                            {tr.featuredOnBillboard && (
                              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold">
                                BILLBOARD
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {count}/{tr.bracketSize} Players · Matchups: {matchups.length} · +{tr.prizeXp} XP
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setManagingTournamentId(managingTournamentId === tr.id ? null : tr.id)}
                          className="px-2.5 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/35 text-[11px] font-bold text-sky-200 flex items-center gap-1 cursor-pointer"
                        >
                          <Users className="w-3.5 h-3.5" /> Bracket & Roster ({count})
                        </button>

                        {tr.status === 'open' && (
                          <button
                            type="button"
                            onClick={() => handleGenerateMatchupsAndStart(tr)}
                            className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-[11px] font-bold text-emerald-200 flex items-center gap-1 cursor-pointer"
                          >
                            <Radio className="w-3.5 h-3.5" /> Start & Create Matches
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => openGiftModal(tr)}
                          className="px-2.5 py-1.5 rounded-lg cyber-gold-active text-[11px] font-extrabold text-amber-200 flex items-center gap-1 cursor-pointer"
                        >
                          <Gift className="w-3.5 h-3.5 text-amber-400" /> ဆုလက်ဆောင်ပေးမည်
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeleteTournament(tr.id)}
                          className="p-1.5 rounded-lg bg-rose-500/20 text-rose-300 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Status Switcher */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1.5 border-t border-white/5 text-[10px]">
                      <div className="flex items-center gap-1">
                        {(['open', 'ongoing', 'completed'] as const).map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => handleStatusChange(tr, st)}
                            className={`px-2 py-0.5 rounded font-bold uppercase cursor-pointer ${
                              tr.status === st ? 'bg-amber-500 text-slate-950' : 'bg-white/5 text-slate-400'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          updateTournamentFields(
                            tr.id,
                            { featuredOnBillboard: !tr.featuredOnBillboard },
                            !tr.featuredOnBillboard ? 'Billboard တွင် ပြသလိုက်ပါပြီ' : 'Billboard မှ ဖြုတ်လိုက်ပါပြီ'
                          )
                        }
                        className="text-amber-300 hover:underline font-semibold cursor-pointer"
                      >
                        {tr.featuredOnBillboard ? '✓ Showing on Billboard' : '+ Pin to Billboard'}
                      </button>
                    </div>

                    {/* Expandable Bracket + Roster Management */}
                    {managingTournament?.id === tr.id && (
                      <div className="p-3 rounded-xl bg-[#0d1425] border border-sky-400/25 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-bold text-white">
                            ပြိုင်ပွဲဝင်များနှင့် ပွဲစဉ်ဇယား ({count}/{tr.bracketSize})
                          </span>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleGenerateMatchupsAndStart(tr)}
                              className="px-2.5 py-1 rounded-lg bg-indigo-500/25 text-indigo-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Shuffle className="w-3 h-3" /> Seed Round 1
                            </button>
                            {matchups.length > 0 && (
                              <button
                                type="button"
                                onClick={() => handleGenerateNextRound(tr)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500/25 text-emerald-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                              >
                                <ArrowRightCircle className="w-3 h-3" /> Next Round
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Live Matchups Admin Control */}
                        {matchups.length > 0 && (
                          <div className="space-y-1.5">
                            <div className="text-[10px] uppercase font-bold text-amber-300">
                              Bracket Matchups (Admin Winner Override)
                            </div>
                            {matchups.map((m) => {
                              const p1 = users.find((u) => u.id === m.player1Id);
                              const p2 = m.player2Id ? users.find((u) => u.id === m.player2Id) : null;
                              return (
                                <div
                                  key={m.id}
                                  className="p-2 rounded-lg bg-[#070b14] border border-white/10 flex flex-wrap items-center justify-between gap-2 text-[11px]"
                                >
                                  <span className="font-mono text-slate-400">R{m.round || 1}</span>
                                  <div className="flex items-center gap-1.5 flex-1">
                                    <button
                                      type="button"
                                      onClick={() => handleAdminMarkWinner(tr, m.id, m.player1Id)}
                                      className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                                        m.winnerId === m.player1Id
                                          ? 'bg-emerald-500 text-slate-950'
                                          : 'bg-white/5 text-white hover:bg-emerald-500/20'
                                      }`}
                                    >
                                      {p1?.displayName || m.player1Id}
                                    </button>
                                    <span className="text-amber-400 font-mono text-[10px]">VS</span>
                                    {p2 ? (
                                      <button
                                        type="button"
                                        onClick={() => handleAdminMarkWinner(tr, m.id, p2.id)}
                                        className={`px-2 py-0.5 rounded font-bold cursor-pointer ${
                                          m.winnerId === p2.id
                                            ? 'bg-emerald-500 text-slate-950'
                                            : 'bg-white/5 text-white hover:bg-emerald-500/20'
                                        }`}
                                      >
                                        {p2.displayName}
                                      </button>
                                    ) : (
                                      <span className="text-slate-500">BYE</span>
                                    )}
                                  </div>
                                  <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                                    {m.winnerId ? (
                                      <>
                                        <CheckCircle2 className="w-3 h-3" /> Done
                                      </>
                                    ) : (
                                      '● LIVE'
                                    )}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Manual Add Player */}
                        <div className="flex gap-2">
                          <select
                            value={manualAddUserId}
                            onChange={(e) => setManualAddUserId(e.target.value)}
                            className="flex-1 h-9 px-2.5 rounded-lg bg-[#070b14] border border-white/15 text-xs text-white"
                          >
                            <option value="">-- ကစားသမား ရွေး၍ ထည့်သွင်းရန် --</option>
                            {users
                              .filter((u) => !(tr.participants || []).includes(u.id))
                              .map((u) => (
                                <option key={u.id} value={u.id}>
                                  {u.displayName} ({u.gameId}) - {u.xp} XP
                                </option>
                              ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => handleManualAddPlayer(tr)}
                            className="px-3 h-9 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer"
                          >
                            <UserPlus className="w-3.5 h-3.5" /> Add
                          </button>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-1.5 max-h-36 overflow-y-auto">
                          {(tr.participants || []).map((pid, idx) => {
                            const p = users.find((u) => u.id === pid);
                            return (
                              <div
                                key={pid}
                                className="px-2.5 py-1.5 rounded-lg bg-[#070b14] border border-white/10 flex items-center justify-between gap-2 text-xs"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="font-mono text-[10px] text-amber-400">#{idx + 1}</span>
                                  <AvatarWithFrame
                                    avatarUrl={p?.avatarUrl}
                                    frameId={p?.frameId}
                                    displayName={p?.displayName || 'Player'}
                                    size="xs"
                                  />
                                  <span className="text-white font-semibold truncate">{p?.displayName || pid}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveParticipant(tr, pid)}
                                  className="text-rose-400 hover:text-rose-300 cursor-pointer"
                                >
                                  <UserMinus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Live Rooms Monitor */}
        <div className="lg:col-span-4 cyber-panel rounded-2xl p-4 space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Swords className="w-4 h-4 text-sky-400" />
            Live Active Rooms ({rooms.length})
          </h3>
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
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
                      Players: {(rm.players || []).length}/{rm.maxPlayers || 8} · {rm.status}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onCloseRoom(rm.id)}
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

      {/* Winner Gift Modal */}
      <AnimatePresence>
        {giftModalTournament && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.form
              initial={{ scale: 0.94, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              onSubmit={handleAwardGiftSubmit}
              className="w-full max-w-lg rounded-2xl cyber-panel border border-amber-400/60 p-5 space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div>
                  <h3 className="text-base font-display font-bold text-amber-300 flex items-center gap-2">
                    <Gift className="w-5 h-5" />
                    <span>ပြိုင်ပွဲဆုရှင်အား လက်ဆောင်ပေးအပ်ရန်</span>
                  </h3>
                  <div className="text-xs text-slate-400">{giftModalTournament.title}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setGiftModalTournament(null)}
                  className="w-8 h-8 rounded-lg bg-white/10 text-slate-300 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid sm:grid-cols-12 gap-2.5">
                <div className="sm:col-span-8">
                  <label className="block text-[11px] text-slate-400 mb-1">ဆုရရှိသော ကစားသမား</label>
                  <select
                    required
                    value={winnerUserId}
                    onChange={(e) => setWinnerUserId(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl bg-[#070b14] border border-white/15 text-xs text-white"
                  >
                    <option value="">-- ကစားသမား ရွေးချယ်ပါ --</option>
                    {users.map((u) => {
                      const inTourney = (giftModalTournament.participants || []).includes(u.id);
                      return (
                        <option key={u.id} value={u.id}>
                          {inTourney ? '★ ' : ''}{u.displayName} ({u.gameId}) - {u.xp} XP
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="sm:col-span-4">
                  <label className="block text-[11px] text-slate-400 mb-1">အဆင့်</label>
                  <select
                    value={placement}
                    onChange={(e) => setPlacement(e.target.value as any)}
                    className="w-full h-10 px-2.5 rounded-xl bg-[#070b14] border border-white/15 text-xs text-amber-300 font-bold"
                  >
                    <option value="1st">1st Champion</option>
                    <option value="2nd">2nd Runner-Up</option>
                    <option value="3rd">3rd Place</option>
                    <option value="mvp">Special MVP</option>
                  </select>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-2">
                {GIFT_CATALOG.map((g) => {
                  const active = selectedGiftId === g.giftId;
                  return (
                    <button
                      key={g.giftId}
                      type="button"
                      onClick={() => {
                        setSelectedGiftId(g.giftId);
                        setCustomBonusXp(g.defaultXp);
                      }}
                      className={`p-2.5 rounded-xl border flex items-center gap-2.5 text-left cursor-pointer ${
                        active ? 'cyber-gold-active' : 'bg-[#070b14] border-white/10'
                      }`}
                    >
                      <GiftTrophyIcon iconId={g.iconId} className="w-8 h-8 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white truncate">{g.nameMy}</div>
                        <div className="text-[10px] font-mono text-amber-300 uppercase">
                          {g.rarity} · +{g.defaultXp} XP
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="grid sm:grid-cols-12 gap-2.5">
                <div className="sm:col-span-4">
                  <label className="block text-[11px] text-slate-400 mb-1">Bonus XP</label>
                  <input
                    type="number"
                    min={0}
                    value={customBonusXp}
                    onChange={(e) => setCustomBonusXp(Number(e.target.value))}
                    className="w-full h-10 px-3 rounded-xl bg-[#070b14] border border-white/15 text-xs font-mono text-emerald-300"
                  />
                </div>
                <div className="sm:col-span-8">
                  <label className="block text-[11px] text-slate-400 mb-1">ဂုဏ်ပြုမှတ်ချက်</label>
                  <input
                    type="text"
                    value={giftNote}
                    onChange={(e) => setGiftNote(e.target.value)}
                    placeholder="ဥပမာ - ချန်ပီယံဆု 50,000 MMK"
                    className="w-full h-10 px-3 rounded-xl bg-[#070b14] border border-white/15 text-xs text-white"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-amber-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={broadcastWinner}
                  onChange={(e) => setBroadcastWinner(e.target.checked)}
                  className="accent-amber-500"
                />
                <span>ကစားသမားအားလုံးထံ Global Broadcast ကြေညာမည်</span>
              </label>

              <button
                type="submit"
                disabled={awarding || !winnerUserId}
                className="w-full h-11 rounded-xl cyber-cta-gold disabled:opacity-50 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>{awarding ? 'ပေးအပ်နေသည်...' : 'ဆုလက်ဆောင်နှင့် XP ချက်ချင်းပေးအပ်မည်'}</span>
              </button>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
