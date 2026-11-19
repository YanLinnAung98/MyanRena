import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { getShuffledQuizSet, QUIZ_BANK_100 } from '../data/quizBank100.ts';
import { DEFAULT_LANDING_CONTENT } from '../i18n/landingDefaults.ts';
import { detectClientDevice } from '../utils/deviceDetector.ts';
import { createAvatarSvg, GAME_ARTWORKS } from '../utils/gameArtworks.ts';
import { db, isFirebaseConfigured, stripUndefined } from './firebase.ts';

export const LOCAL_STATE_KEY = 'vanguard_serverless_db_v8';
export const ACTIVE_USER_KEY = 'vanguard_active_user_v8';
export const SYNC_CHANNEL_NAME = 'vanguard_realtime_sync_v8';
export const DEFAULT_SAKAR_RIDDLES = QUIZ_BANK_100;

export function broadcastLocalSync(type = 'STATE_UPDATED') {
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      const ch = new BroadcastChannel(SYNC_CHANNEL_NAME);
      ch.postMessage({ type, ts: Date.now() });
      ch.close();
    }
  } catch {}
}

export function normalizeGameId(raw?: string): 'connect4' | 'tictactoe' | 'rps' | 'sakarhtar' {
  const s = String(raw || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (s.includes('connect') || s === 'c4') return 'connect4';
  if (s.includes('tic') || s === 'ttt') return 'tictactoe';
  if (s.includes('rps') || s.includes('rock')) return 'rps';
  return 'sakarhtar';
}

export function getPatchedLandingContent(base = DEFAULT_LANDING_CONTENT) {
  const games = { ...(base.games || {}) } as any;
  (['connect4', 'tictactoe', 'rps', 'sakarhtar'] as const).forEach((gid) => {
    games[gid] = {
      ...(games[gid] || {}),
      nameMy: gid === 'sakarhtar' ? 'ဉာဏ်စမ်းပဟေဠိ' : games[gid]?.nameMy,
      bannerUrl: GAME_ARTWORKS[gid],
    };
  });
  return {
    ...base,
    heroBannerUrl: GAME_ARTWORKS.heroBanner,
    games,
  };
}

export function saveActiveSessionUser(user: any) {
  try {
    const dev = detectClientDevice();
    const enriched = stripUndefined({
      ...user,
      ...dev,
      online: true,
      lastSeenMs: Date.now(),
    });
    localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(enriched));
    const store = readServerlessStore();
    if (enriched?.id) {
      store.users[enriched.id] = enriched;
      writeServerlessStore(store);
    }
    broadcastLocalSync('USER_UPDATED');
  } catch {}
}

export function readActiveSessionUser(): any | null {
  try {
    const raw = localStorage.getItem(ACTIVE_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function readServerlessStore() {
  const adminDev = detectClientDevice();
  const defaultStore = {
    users: {
      admin_yanlinnaung: {
        id: 'admin_yanlinnaung',
        username: 'yanlinnaung',
        displayName: 'Yan Linn Aung',
        gameId: '163104',
        role: 'admin',
        isAdmin: true,
        xp: 3000,
        rank: 'Legend',
        wins: 45,
        losses: 2,
        draws: 1,
        frameId: 'legend',
        status: 'active',
        online: true,
        lastSeenMs: Date.now(),
        ...adminDev,
        avatarUrl: createAvatarSvg('YL', '#f59e0b', '#090d16'),
        friends: [],
        blocked: [],
        createdAt: new Date().toISOString(),
      },
    } as Record<string, any>,
    tournaments: [] as any[],
    rooms: [] as any[],
    riddles: [...QUIZ_BANK_100],
    reports: [] as any[],
    notifications: [] as any[],
    activeBroadcast: null as { id: string; title: string; message: string; createdAtMs: number } | null,
    landingContent: getPatchedLandingContent(DEFAULT_LANDING_CONTENT),
    featureLocks: {
      connect4: false,
      tictactoe: false,
      rps: false,
      sakarhtar: false,
      matchmaking: false,
      customRooms: false,
      tournaments: false,
      chat: false,
      dms: false,
    },
    matchmakingSettings: {
      maxWaitSec: 30,
      xpRange: 400,
      botFallbackSec: 8,
      defaultTurnTime: 20,
    },
  };

  try {
    const raw = localStorage.getItem(LOCAL_STATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...defaultStore,
        ...parsed,
        riddles: parsed.riddles?.length >= 10 ? parsed.riddles : defaultStore.riddles,
        landingContent: getPatchedLandingContent(parsed.landingContent || DEFAULT_LANDING_CONTENT),
        featureLocks: { ...defaultStore.featureLocks, ...(parsed.featureLocks || {}) },
        matchmakingSettings: { ...defaultStore.matchmakingSettings, ...(parsed.matchmakingSettings || {}) },
      };
    }
  } catch {}
  return defaultStore;
}

export function writeServerlessStore(store: any) {
  try {
    localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(store));
  } catch {}
}

export function buildPlayableMatch(
  playersList: any[],
  opts: {
    matchId?: string;
    gameType?: string;
    mode?: string;
    difficulty?: string;
    bestOf?: 3 | 5;
    turnTimeLimit?: number;
    isRealtimePvp?: boolean;
  }
) {
  const store = readServerlessStore();
  const gameType = normalizeGameId(opts.gameType);
  const difficulty = opts.difficulty || 'medium';
  const bestOf = opts.bestOf || 3;
  const turnTimeLimit = opts.turnTimeLimit || 20;

  const p1 = playersList[0];
  const botPlayer = {
    id: 'aegis_bot',
    username: 'aegis_bot',
    displayName: gameType === 'sakarhtar' ? 'ပညာရှိ ဇီးကွက်' : `Aegis Bot (${difficulty.toUpperCase()})`,
    gameId: 'BOT-001',
    xp: p1?.xp || 1000,
    rank: 'Gold',
    frameId: 'gold',
    avatarUrl: createAvatarSvg('🦉', '#451a03', '#fbbf24'),
    isBot: true,
  };

  const finalPlayers = playersList.length >= 2 ? playersList : [p1, botPlayer];
  const isRealtimePvp = Boolean(opts.isRealtimePvp && playersList.length >= 2);
  const scores: Record<string, number> = {};
  finalPlayers.forEach((p) => {
    if (p?.id) scores[p.id] = 0;
  });

  const tttBoard = Array(9).fill(null);
  const c4Board = Array.from({ length: 6 }, () => Array(7).fill(null));
  const riddles = getShuffledQuizSet(10, store.riddles);
  const deadline = new Date(Date.now() + turnTimeLimit * 1000).toISOString();

  return stripUndefined({
    id: opts.matchId || `match_${Date.now()}_${Math.floor(Math.random() * 999)}`,
    gameType,
    mode: opts.mode || 'bot',
    isRealtimePvp,
    difficulty,
    bestOf,
    turnTimeLimit,
    turnDeadline: deadline,
    status: 'active',
    players: finalPlayers,
    turnUserId: p1.id,
    scores,
    round: 1,
    tttBoard,
    c4Board,
    rpsPicks: {} as Record<string, string>,
    rpsLastRound: null as { p1Choice: string; p2Choice: string; winnerId: string | null } | null,
    riddles,
    riddleIndex: 0,
    roundAnswers: {} as Record<string, number>,
    chat: [] as Array<{ id: number; sender: string; text: string; time: number }>,
    winnerId: null as string | null,
    isDraw: false,
    createdAt: new Date().toISOString(),
  });
}

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

if (typeof window !== 'undefined' && !(window as any).__vanguardApiPatched) {
  (window as any).__vanguardApiPatched = true;
  const nativeFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const urlObj = new URL(urlStr, window.location.origin);

    if (!urlObj.pathname.startsWith('/api/')) {
      return nativeFetch(input, init);
    }

    const path = urlObj.pathname;
    const method = (init?.method || 'GET').toUpperCase();
    const authHeader = (init?.headers as Record<string, string>)?.Authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    let body: any = {};
    if (init?.body && typeof init.body === 'string') {
      try {
        body = JSON.parse(init.body);
      } catch {}
    }

    const store = readServerlessStore();
    const activeSaved = readActiveSessionUser();

    let currentUser: any = null;
    if (token === 'admin-token') {
      currentUser = store.users.admin_yanlinnaung;
    } else if (token) {
      const uid = token.replace(/^token_/, '').replace(/^local_/, '');
      currentUser =
        store.users[uid] ||
        (activeSaved && activeSaved.id === uid ? activeSaved : null) ||
        activeSaved;
      if (currentUser && currentUser.id !== 'admin_yanlinnaung') {
        currentUser.role = 'player';
        currentUser.isAdmin = false;
      }
    }

    if (path === '/api/bootstrap') {
      return jsonResponse({
        onlineCount: Math.max(1, Object.keys(store.users).length),
        landingContent: getPatchedLandingContent(store.landingContent),
      });
    }

    if (path === '/api/auth/me') {
      if (!token) return jsonResponse({ error: 'Unauthorized' }, 401);
      if (token === 'admin-token') return jsonResponse({ user: store.users.admin_yanlinnaung });
      if (isFirebaseConfigured && db) {
        const uid = token.replace(/^token_/, '');
        const snap = await getDoc(doc(db, 'users', uid)).catch(() => null);
        if (snap && snap.exists()) {
          const dev = detectClientDevice();
          const uData = stripUndefined({
            ...snap.data(),
            ...dev,
            online: true,
            lastSeenMs: Date.now(),
            role: 'player',
            isAdmin: false,
          });
          saveActiveSessionUser(uData);
          await setDoc(doc(db, 'users', uid), uData, { merge: true }).catch((e) => console.error(e));
          return jsonResponse({ user: uData });
        }
      }
      if (currentUser) return jsonResponse({ user: currentUser });
      return jsonResponse({ error: 'Session expired' }, 401);
    }

    if (path === '/api/auth/logout') {
      if (currentUser?.id && isFirebaseConfigured && db) {
        await setDoc(
          doc(db, 'users', currentUser.id),
          { online: false, lastSeenMs: Date.now() },
          { merge: true }
        ).catch(() => {});
      }
      localStorage.removeItem(ACTIVE_USER_KEY);
      return jsonResponse({ ok: true });
    }

    if (path === '/api/matches/bot' && method === 'POST') {
      const p = currentUser || activeSaved;
      return jsonResponse({ match: buildPlayableMatch([p], body) });
    }

    if (path === '/api/sakar/solo' && method === 'POST') {
      const p = currentUser || activeSaved;
      return jsonResponse({
        match: buildPlayableMatch([p], { gameType: 'sakarhtar', mode: 'solo', difficulty: 'medium' }),
      });
    }

    if (path === '/api/sakar/rooms' && method === 'POST') {
      const host = currentUser || activeSaved;
      const code = 'MR-' + Math.floor(1000 + Math.random() * 9000);
      const gameType = normalizeGameId(body.gameType || 'sakarhtar');
      const maxPlayers = gameType === 'sakarhtar' ? Math.min(8, Math.max(2, Number(body.maxPlayers) || 8)) : 2;
      const room = stripUndefined({
        id: `room_${Date.now()}_${Math.floor(Math.random() * 999)}`,
        code,
        gameType,
        title: body.title || `${host.displayName}'s Room`,
        hostId: host.id,
        maxPlayers,
        players: [host],
        chat: [],
        status: 'waiting',
        activeMatchId: null,
        createdAt: Date.now(),
      });
      store.rooms.push(room);
      writeServerlessStore(store);
      if (isFirebaseConfigured && db) {
        await setDoc(doc(db, 'rooms', room.id), room).catch((e) => console.error(e));
      }
      broadcastLocalSync('ROOM_CREATED');
      return jsonResponse({ room });
    }

    if (path === '/api/sakar/rooms/join' && method === 'POST') {
      const player = currentUser || activeSaved;
      const rawCode = String(body.roomId || '').trim().toUpperCase();
      const normalized = rawCode.startsWith('MR-') ? rawCode : `MR-${rawCode}`;
      let room: any = store.rooms.find(
        (r: any) =>
          r.id?.toUpperCase() === rawCode ||
          r.code?.toUpperCase() === rawCode ||
          r.code?.toUpperCase() === normalized
      );

      if (!room && isFirebaseConfigured && db) {
        const snap = await getDocs(collection(db, 'rooms')).catch(() => null);
        snap?.forEach((d) => {
          const data = d.data();
          if (
            data.id?.toUpperCase() === rawCode ||
            data.code?.toUpperCase() === rawCode ||
            data.code?.toUpperCase() === normalized
          ) {
            room = data;
          }
        });
      }

      if (!room) return jsonResponse({ error: 'Room code မတွေ့ပါ။' }, 404);
      if (room.status !== 'waiting') return jsonResponse({ error: 'ပွဲစတင်နေပြီ ဖြစ်ပါသည်။' }, 400);
      if (!room.players.some((p: any) => p.id === player.id)) {
        if (room.players.length >= room.maxPlayers) return jsonResponse({ error: 'အခန်း လူပြည့်သွားပါပြီ။' }, 400);
        room.players.push(stripUndefined(player));
      }
      store.rooms = [...store.rooms.filter((r: any) => r.id !== room.id), room];
      writeServerlessStore(store);
      if (isFirebaseConfigured && db) {
        await setDoc(doc(db, 'rooms', room.id), stripUndefined(room), { merge: true }).catch((e) => console.error(e));
      }
      broadcastLocalSync('ROOM_JOINED');
      return jsonResponse({ room });
    }

    if (path.match(/^\/api\/sakar\/rooms\/[^/]+\/leave$/) && method === 'POST') {
      const roomId = path.split('/')[4];
      const player = currentUser || activeSaved;
      let target = store.rooms.find((r: any) => r.id === roomId);
      if (target) {
        target.players = target.players.filter((p: any) => p.id !== player?.id);
        if (target.players.length === 0) {
          store.rooms = store.rooms.filter((r: any) => r.id !== roomId);
          if (isFirebaseConfigured && db) await deleteDoc(doc(db, 'rooms', roomId)).catch(() => {});
        } else {
          if (target.hostId === player?.id) target.hostId = target.players[0].id;
          if (isFirebaseConfigured && db) {
            await setDoc(doc(db, 'rooms', roomId), stripUndefined(target), { merge: true }).catch(() => {});
          }
        }
        writeServerlessStore(store);
      }
      return jsonResponse({ ok: true });
    }

    if (path.match(/^\/api\/sakar\/rooms\/[^/]+\/start$/) && method === 'POST') {
      const roomId = path.split('/')[4];
      const host = currentUser || activeSaved;
      let target = store.rooms.find((r: any) => r.id === roomId);
      if (!target && isFirebaseConfigured && db) {
        const snap = await getDoc(doc(db, 'rooms', roomId)).catch(() => null);
        if (snap && snap.exists()) target = snap.data();
      }
      const roomPlayers = target?.players?.length ? target.players : [host];
      const gameType = normalizeGameId(target?.gameType || 'sakarhtar');
      const match = buildPlayableMatch(roomPlayers, {
        gameType,
        mode: 'custom',
        difficulty: 'medium',
        isRealtimePvp: roomPlayers.length >= 2,
      });

      if (isFirebaseConfigured && db) {
        await setDoc(doc(db, 'matches', match.id), stripUndefined(match)).catch((e) => console.error(e));
        if (target) {
          target.status = 'playing';
          target.activeMatchId = match.id;
          await setDoc(doc(db, 'rooms', roomId), stripUndefined(target), { merge: true }).catch((e) => console.error(e));
        }
      }
      return jsonResponse({ match });
    }

    if (path.startsWith('/api/profile') && ['PATCH', 'POST', 'PUT'].includes(method)) {
      if (currentUser) {
        Object.assign(currentUser, body);
        saveActiveSessionUser(currentUser);
        if (isFirebaseConfigured && db) {
          await setDoc(doc(db, 'users', currentUser.id), stripUndefined(currentUser), { merge: true }).catch((e) =>
            console.error(e)
          );
        }
      }
      return jsonResponse({ user: currentUser });
    }

    if (path.startsWith('/api/users/')) {
      const uid = path.split('/')[3];
      if (isFirebaseConfigured && db) {
        const snap = await getDoc(doc(db, 'users', uid)).catch(() => null);
        if (snap && snap.exists()) return jsonResponse({ user: snap.data() });
      }
      return jsonResponse({ user: store.users[uid] || currentUser });
    }

    if (path.match(/^\/api\/warnings\/[^/]+\/ack$/) && method === 'POST') {
      const wid = decodeURIComponent(path.split('/')[3] || '');
      if (isFirebaseConfigured && db && wid) {
        await updateDoc(doc(db, 'notifications', wid), { read: true }).catch(() => {});
      }
      return jsonResponse({ ok: true });
    }

    return jsonResponse({ ok: true });
  };
}
