import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  limit,
  arrayUnion,
  arrayRemove,
  serverTimestamp,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';

export type GameId = 'connect4' | 'tictactoe' | 'rps' | 'sakarhtar';
export type BotDifficulty = 'easy' | 'medium' | 'hard';
export type RankTier = 'Bronze' | 'Silver' | 'Gold' | 'Diamond' | 'Legend';

export interface PlayerProfile {
  uid: string;
  username: string;
  displayName: string;
  gameCode: string;
  avatar: string;
  frameId: string;
  xp: number;
  rank: RankTier;
  wins: number;
  losses: number;
  draws: number;
  isAdmin: boolean;
  status: 'active' | 'warned' | 'suspended' | 'banned';
  warnMessage?: string;
  friends: string[];
  blocked: string[];
}

export interface ServerConfig {
  maintenance: boolean;
  announcement: string;
  matchmakingTimeoutSec: number;
  lockedGames: Record<GameId, boolean>;
  landingTitle: string;
  landingSubtitle: string;
}

export interface RiddleItem {
  id: string;
  question: string;
  options: string[];
  answerIndex: number;
  hint?: string;
}

export interface GameRoom {
  id: string;
  code: string;
  gameType: GameId;
  mode: 'bot' | 'matchmaking' | 'custom' | 'tournament';
  botDifficulty?: BotDifficulty;
  maxPlayers: number; // 2 for 1v1, up to 8 for Sakar-Htar / Custom
  players: Array<{
    uid: string;
    displayName: string;
    avatar: string;
    frameId: string;
    xp: number;
    score: number;
    isBot?: boolean;
  }>;
  status: 'waiting' | 'playing' | 'finished';
  turnUid: string;
  boardState: any;
  chat: Array<{ sender: string; text: string; time: number }>;
  winnerUid?: string | null;
  createdAt: number;
}

export interface TournamentEvent {
  id: string;
  title: string;
  gameType: GameId;
  bracketSize: 8 | 16 | 32;
  prizeXp: number;
  participants: string[];
  rounds: Array<Array<{ p1: string; p2: string; winner?: string }>>;
  status: 'open' | 'ongoing' | 'completed';
  champion?: string;
}

export interface PlayerReport {
  id: string;
  reporterUid: string;
  targetUid: string;
  reason: string;
  status: 'pending' | 'resolved';
  createdAt: number;
}

// 1. XP & Rank Calculation (+75 Win, -20 Loss, +25 Draw)
export function calculateRankTier(xp: number): RankTier {
  if (xp >= 2500) return 'Legend';
  if (xp >= 1800) return 'Diamond';
  if (xp >= 1300) return 'Gold';
  if (xp >= 1000) return 'Silver';
  return 'Bronze';
}

export function computeXpDelta(outcome: 'win' | 'loss' | 'draw'): number {
  if (outcome === 'win') return 75;
  if (outcome === 'draw') return 25;
  return -20;
}

// 2. Authentication is backend-only; no client-side administrator shortcut.
export async function authenticateUser(
  _rawUsername: string,
  _rawPassword: string
): Promise<PlayerProfile> {
  throw new Error('Please sign in through the secure MyanRena application backend.');
}
// 3. Aegis Bot AI Engine (Easy, Medium, Hard)
export const AegisBotEngine = {
  pickTTT(board: string[], difficulty: BotDifficulty): number {
    const empty = board.map((v, i) => (v === '' ? i : -1)).filter((i) => i !== -1);
    if (empty.length === 0) return -1;
    if (difficulty === 'easy') {
      return empty[Math.floor(Math.random() * empty.length)];
    }
    const lines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6],
    ];
    // Win or Block check for Medium & Hard
    for (const mark of ['O', 'X']) {
      for (const [a, b, c] of lines) {
        const vals = [board[a], board[b], board[c]];
        if (vals.filter((v) => v === mark).length === 2 && vals.includes('')) {
          if (board[a] === '') return a;
          if (board[b] === '') return b;
          if (board[c] === '') return c;
        }
      }
    }
    if (difficulty === 'hard' && board[4] === '') return 4;
    return empty[Math.floor(Math.random() * empty.length)];
  },

  pickConnect4(board: string[], difficulty: BotDifficulty): number {
    const validCols = [0, 1, 2, 3, 4, 5, 6].filter((c) => board[c] === '');
    if (validCols.length === 0) return -1;
    if (difficulty === 'hard' && validCols.includes(3)) return 3;
    return validCols[Math.floor(Math.random() * validCols.length)];
  },

  pickRPS(): 'rock' | 'paper' | 'scissors' {
    const moves: Array<'rock' | 'paper' | 'scissors'> = ['rock', 'paper', 'scissors'];
    return moves[Math.floor(Math.random() * 3)];
  },
};

// 4. Matchmaking & Custom Rooms (Up to 8 Players)
export async function findOrCreateMatch(
  player: PlayerProfile,
  gameType: GameId,
  mode: 'matchmaking' | 'custom',
  customCode?: string
): Promise<GameRoom> {
  const maxPlayers = gameType === 'sakarhtar' || mode === 'custom' ? 8 : 2;
  const roomCode = (customCode || 'MR-' + Math.floor(1000 + Math.random() * 9000)).toUpperCase();

  if (isFirebaseConfigured && db) {
    const roomsRef = collection(db, 'rooms');
    const snap = await getDocs(roomsRef);
    let matchedRoom: GameRoom | null = null;

    snap.forEach((docSnap) => {
      const r = docSnap.data() as GameRoom;
      if (r.status === 'waiting' && r.players.length < r.maxPlayers) {
        if (mode === 'custom' && r.code === roomCode) {
          matchedRoom = r;
        } else if (
          mode === 'matchmaking' &&
          r.mode === 'matchmaking' &&
          r.gameType === gameType &&
          Math.abs((r.players[0]?.xp || 1000) - player.xp) <= 500
        ) {
          matchedRoom = r;
        }
      }
    });

    if (matchedRoom) {
      const room = matchedRoom as GameRoom;
      if (!room.players.some((p) => p.uid === player.uid)) {
        room.players.push({
          uid: player.uid,
          displayName: player.displayName,
          avatar: player.avatar,
          frameId: player.frameId,
          xp: player.xp,
          score: 0,
        });
        if (room.players.length >= 2 && gameType !== 'sakarhtar') {
          room.status = 'playing';
        }
        await setDoc(doc(db, 'rooms', room.id), room);
      }
      return room;
    }

    const newRoomId = `room_${Date.now()}_${Math.floor(Math.random() * 999)}`;
    const newRoom: GameRoom = {
      id: newRoomId,
      code: roomCode,
      gameType,
      mode,
      maxPlayers,
      players: [
        {
          uid: player.uid,
          displayName: player.displayName,
          avatar: player.avatar,
          frameId: player.frameId,
          xp: player.xp,
          score: 0,
        },
      ],
      status: 'waiting',
      turnUid: player.uid,
      boardState:
        gameType === 'tictactoe'
          ? Array(9).fill('')
          : gameType === 'connect4'
          ? Array(42).fill('')
          : { round: 1, moves: {}, scores: {} },
      chat: [],
      createdAt: Date.now(),
    };
    await setDoc(doc(db, 'rooms', newRoomId), newRoom);
    return newRoom;
  }

  throw new Error('Online Matchmaking အတွက် Firebase Config ထည့်သွင်းရန် လိုအပ်ပါသည်။');
}

// 5. Record Match Result & Update XP
export async function recordMatchOutcome(
  uid: string,
  outcome: 'win' | 'loss' | 'draw'
): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);
  if (!snap.exists()) return;

  const user = snap.data() as PlayerProfile;
  const delta = computeXpDelta(outcome);
  const nextXp = Math.max(0, (user.xp || 1000) + delta);
  const nextRank = calculateRankTier(nextXp);

  await updateDoc(userRef, {
    xp: nextXp,
    rank: nextRank,
    wins: (user.wins || 0) + (outcome === 'win' ? 1 : 0),
    losses: (user.losses || 0) + (outcome === 'loss' ? 1 : 0),
    draws: (user.draws || 0) + (outcome === 'draw' ? 1 : 0),
  });
}

// 6. Admin Moderation (Warn, Kick, Suspend, Ban) & Server Controls
export async function adminModerateUser(
  targetUid: string,
  action: 'warn' | 'kick' | 'suspend' | 'ban' | 'restore',
  reason?: string
): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  const userRef = doc(db, 'users', targetUid);
  if (action === 'warn') {
    await updateDoc(userRef, {
      status: 'warned',
      warnMessage: reason || 'Admin မှ သတိပေးချက် ပေးပို့ထားပါသည်။',
    });
  } else if (action === 'suspend') {
    await updateDoc(userRef, { status: 'suspended' });
  } else if (action === 'ban') {
    await updateDoc(userRef, { status: 'banned' });
  } else if (action === 'restore') {
    await updateDoc(userRef, { status: 'active', warnMessage: '' });
  }
}

export async function updateServerConfig(config: Partial<ServerConfig>): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  await setDoc(doc(db, 'system', 'config'), config, { merge: true });
}

export async function submitPlayerReport(
  reporterUid: string,
  targetUid: string,
  reason: string
): Promise<void> {
  if (!isFirebaseConfigured || !db) return;
  const id = `rep_${Date.now()}`;
  await setDoc(doc(db, 'reports', id), {
    id,
    reporterUid,
    targetUid,
    reason,
    status: 'pending',
    createdAt: Date.now(),
  });
}
