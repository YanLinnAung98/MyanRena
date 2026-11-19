import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { DEFAULT_LANDING_CONTENT } from '../i18n/landingDefaults.ts';
import { createAvatarSvg, GAME_ARTWORKS } from '../utils/gameArtworks.ts';
import { db, isFirebaseConfigured } from './firebase.ts';

export const LOCAL_STATE_KEY = 'vanguard_serverless_db_v6';
export const ACTIVE_USER_KEY = 'vanguard_active_user_v6';

export function normalizeGameId(raw?: string): 'connect4' | 'tictactoe' | 'rps' | 'sakarhtar' {
  const s = String(raw || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (s.includes('connect') || s === 'c4') return 'connect4';
  if (s.includes('tic') || s === 'ttt') return 'tictactoe';
  if (s.includes('rps') || s.includes('rock')) return 'rps';
  return 'sakarhtar';
}

export const DEFAULT_SAKAR_RIDDLES = [
  {
    id: 'rid_1',
    question: 'ခြေလေးချောင်းရှိသော်လည်း လမ်းမလျှောက်နိုင်သော အရာမှာ အဘယ်နည်း။',
    questionMy: 'ခြေလေးချောင်းရှိသော်လည်း လမ်းမလျှောက်နိုင်သော အရာမှာ အဘယ်နည်း။',
    questionEn: 'What has four legs but cannot walk?',
    options: ['စားပွဲခုံ', 'ဆင်', 'လိပ်', 'မြင်း'],
    optionsMy: ['စားပွဲခုံ', 'ဆင်', 'လိပ်', 'မြင်း'],
    optionsEn: ['Table', 'Elephant', 'Turtle', 'Horse'],
    answerIndex: 0,
  },
  {
    id: 'rid_2',
    question: 'အပေါ်ကလည်း မိုး၊ အောက်ကလည်း မိုး၊ အလယ်က အဘိုးအို ခါးကုန်းကုန်း ဆိုသည်မှာ အဘယ်နည်း။',
    questionMy: 'အပေါ်ကလည်း မိုး၊ အောက်ကလည်း မိုး၊ အလယ်က အဘိုးအို ခါးကုန်းကုန်း ဆိုသည်မှာ အဘယ်နည်း။',
    questionEn: 'Roof above, roof below, a hunchbacked old man in the middle. What is it?',
    options: ['လိပ်', 'ဖား', 'ပုစွန်', 'ခရု'],
    optionsMy: ['လိပ်', 'ဖား', 'ပုစွန်', 'ခရု'],
    optionsEn: ['Turtle', 'Frog', 'Shrimp', 'Snail'],
    answerIndex: 0,
  },
  {
    id: 'rid_3',
    question: 'သွားလည်း သွားသည်၊ ရပ်လည်း ရပ်သည်၊ ခြေထောက်မရှိသော အရာမှာ အဘယ်နည်း။',
    questionMy: 'သွားလည်း သွားသည်၊ ရပ်လည်း ရပ်သည်၊ ခြေထောက်မရှိသော အရာမှာ အဘယ်နည်း။',
    questionEn: 'It moves and it stops, yet it has no legs. What is it?',
    options: ['နာရီ', 'လှည်း', 'စက်ဘီး', 'လေယာဉ်'],
    optionsMy: ['နာရီ', 'လှည်း', 'စက်ဘီး', 'လေယာဉ်'],
    optionsEn: ['Clock', 'Cart', 'Bicycle', 'Airplane'],
    answerIndex: 0,
  },
  {
    id: 'rid_4',
    question: 'အမေက ဖြူဖြူ၊ သားက မည်းမည်း၊ သားက အမေ့ကို ပြန်ကိုက်သည် ဆိုသည်မှာ အဘယ်နည်း။',
    questionMy: 'အမေက ဖြူဖြူ၊ သားက မည်းမည်း၊ သားက အမေ့ကို ပြန်ကိုက်သည် ဆိုသည်မှာ အဘယ်နည်း။',
    questionEn: 'White mother, black son, the son bites the mother back. What is it?',
    options: ['မီးခြစ်ဆံ', 'ကျီးကန်း', 'မီးသွေး', 'ဖယောင်းတိုင်'],
    optionsMy: ['မီးခြစ်ဆံ', 'ကျီးကန်း', 'မီးသွေး', 'ဖယောင်းတိုင်'],
    optionsEn: ['Matchstick', 'Crow', 'Charcoal', 'Candle'],
    answerIndex: 0,
  },
  {
    id: 'rid_5',
    question: 'အမြီးတိုတို နှာခေါင်းရှည်၊ ရေထဲမှာ နေသည် ဆိုသည်မှာ အဘယ်နည်း။',
    questionMy: 'အမြီးတိုတို နှာခေါင်းရှည်၊ ရေထဲမှာ နေသည် ဆိုသည်မှာ အဘယ်နည်း။',
    questionEn: 'Short tail, long nose, lives in the water. What is it?',
    options: ['ကရားအိုး', 'ဆင်', 'ငါးရှဉ့်', 'မိကျောင်း'],
    optionsMy: ['ကရားအိုး', 'ဆင်', 'ငါးရှဉ့်', 'မိကျောင်း'],
    optionsEn: ['Kettle', 'Elephant', 'Eel', 'Crocodile'],
    answerIndex: 0,
  },
];

export function getPatchedLandingContent(base = DEFAULT_LANDING_CONTENT) {
  const games = { ...(base.games || {}) } as any;
  (['connect4', 'tictactoe', 'rps', 'sakarhtar'] as const).forEach((gid) => {
    games[gid] = {
      ...(games[gid] || {}),
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
    localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(user));
    const store = readServerlessStore();
    if (user?.id) {
      store.users[user.id] = user;
      writeServerlessStore(store);
    }
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
        avatarUrl: createAvatarSvg('YL', '#f59e0b', '#090d16'),
        friends: [],
        blocked: [],
        createdAt: new Date().toISOString(),
      },
    } as Record<string, any>,
    tournaments: [] as any[],
    rooms: [] as any[],
    riddles: [...DEFAULT_SAKAR_RIDDLES],
    reports: [] as any[],
    warnings: [] as any[],
    announcements: [] as any[],
    activeBroadcast: null as { id: string; title: string; message: string; createdAt: string } | null,
    auditLogs: [
      {
        id: 'log_1',
        action: 'SYSTEM_READY',
        actor: 'yanlinnaung',
        detail: 'Vanguard Arena Real-Time Core Active',
        createdAt: new Date().toISOString(),
      },
    ],
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
        riddles: parsed.riddles?.length ? parsed.riddles : defaultStore.riddles,
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
  const riddles = store.riddles?.length ? store.riddles : DEFAULT_SAKAR_RIDDLES;
  const deadline = new Date(Date.now() + turnTimeLimit * 1000).toISOString();

  return {
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
  };
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
          const uData = { ...snap.data(), role: 'player', isAdmin: false };
          saveActiveSessionUser(uData);
          return jsonResponse({ user: uData });
        }
      }
      if (currentUser) return jsonResponse({ user: currentUser });
      return jsonResponse({ error: 'Session expired' }, 401);
    }

    if (path === '/api/auth/logout') {
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
      const room = {
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
      };
      store.rooms.push(room);
      writeServerlessStore(store);
      if (isFirebaseConfigured && db) {
        await setDoc(doc(db, 'rooms', room.id), room).catch(() => {});
      }
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
        room.players.push(player);
      }
      store.rooms = [...store.rooms.filter((r: any) => r.id !== room.id), room];
      writeServerlessStore(store);
      if (isFirebaseConfigured && db) {
        await setDoc(doc(db, 'rooms', room.id), room, { merge: true }).catch(() => {});
      }
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
          if (isFirebaseConfigured && db) await setDoc(doc(db, 'rooms', roomId), target, { merge: true }).catch(() => {});
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
        await setDoc(doc(db, 'matches', match.id), match).catch(() => {});
        if (target) {
          target.status = 'playing';
          target.activeMatchId = match.id;
          await setDoc(doc(db, 'rooms', roomId), target, { merge: true }).catch(() => {});
        }
      }
      return jsonResponse({ match });
    }

    if (path.startsWith('/api/profile') && ['PATCH', 'POST', 'PUT'].includes(method)) {
      if (currentUser) {
        Object.assign(currentUser, body);
        saveActiveSessionUser(currentUser);
        if (isFirebaseConfigured && db) {
          await setDoc(doc(db, 'users', currentUser.id), currentUser, { merge: true }).catch(() => {});
        }
      }
      return jsonResponse({ user: currentUser });
    }

    if (path.match(/^\/api\/warnings\/[^/]+\/ack$/) && method === 'POST') {
      const wid = decodeURIComponent(path.split('/')[3] || '');
      store.warnings = store.warnings.filter((w: any) => w.id !== wid);
      writeServerlessStore(store);
      if (isFirebaseConfigured && db && wid) {
        await updateDoc(doc(db, 'warnings', wid), { acknowledged: true }).catch(() => {});
      }
      return jsonResponse({ ok: true });
    }

    // Admin Dashboard APIs — Merges Live Firestore Users & Delivers Live Notifications
    if (path.startsWith('/api/admin')) {
      const mergedMap: Record<string, any> = { ...store.users };
      if (isFirebaseConfigured && db) {
        const snap = await getDocs(collection(db, 'users')).catch(() => null);
        if (snap && !snap.empty) {
          snap.forEach((d) => {
            const u = d.data();
            if (u?.id) mergedMap[u.id] = u;
          });
          store.users = mergedMap;
          writeServerlessStore(store);
        }
      }
      const allUsers = Object.values(mergedMap);

      // Broadcast Announcement to ALL Users in Real-Time
      if ((path.includes('announce') || path.includes('broadcast')) && method === 'POST') {
        const ann = {
          id: `ann_${Date.now()}`,
          title: body.title || 'Admin Announcement',
          message: body.message || body.content || '',
          createdAt: new Date().toISOString(),
        };
        store.announcements.unshift(ann);
        store.activeBroadcast = ann;
        writeServerlessStore(store);
        if (isFirebaseConfigured && db) {
          await setDoc(doc(db, 'system', 'announcement'), ann).catch(() => {});
        }
        return jsonResponse({ ok: true, announcement: ann });
      }

      // User Moderation (Warn -> Sends Live Warning Popup to Target User)
      if (path.includes('/users/') && ['POST', 'PATCH', 'PUT'].includes(method)) {
        const parts = path.split('/');
        const targetId = parts[4];
        const action = parts[5] || body.action || '';
        const updates: any = {};

        if (action.includes('ban') && !action.includes('unban')) updates.status = 'banned';
        else if (action.includes('unban') || action.includes('restore')) {
          updates.status = 'active';
          updates.suspendedUntil = null;
        } else if (action.includes('suspend')) {
          updates.status = 'suspended';
          updates.suspendedUntil = new Date(Date.now() + 3600000).toISOString();
        } else if (action.includes('warn')) {
          const warnObj = {
            id: `warn_${Date.now()}`,
            userId: targetId,
            reason: body.reason || body.message || 'Official Warning from Administrator.',
            acknowledged: false,
            createdAt: new Date().toISOString(),
          };
          store.warnings.push(warnObj);
          updates.status = 'warned';
          updates.warnMessage = warnObj.reason;
          if (isFirebaseConfigured && db) {
            await setDoc(doc(db, 'warnings', warnObj.id), warnObj).catch(() => {});
          }
        } else if (typeof body.xp === 'number') {
          updates.xp = body.xp;
        }

        if (store.users[targetId]) {
          Object.assign(store.users[targetId], updates);
          writeServerlessStore(store);
        }
        if (isFirebaseConfigured && db && targetId) {
          await setDoc(doc(db, 'users', targetId), updates, { merge: true }).catch(() => {});
        }
        return jsonResponse({ ok: true });
      }

      if (path.includes('tournament') && method === 'POST') {
        const newTourney = {
          id: `tourney_${Date.now()}`,
          title: body.title || 'Vanguard Knockout Cup',
          gameType: normalizeGameId(body.gameType || 'rps'),
          bracketSize: body.bracketSize || 8,
          prizeXp: body.prizeXp || 300,
          status: 'open',
          participants: [],
          rounds: [],
          createdAt: new Date().toISOString(),
        };
        store.tournaments.push(newTourney);
        writeServerlessStore(store);
        if (isFirebaseConfigured && db) {
          await setDoc(doc(db, 'tournaments', newTourney.id), newTourney).catch(() => {});
        }
        return jsonResponse({ ok: true, tournament: newTourney });
      }

      if (path.includes('riddle')) {
        if (method === 'POST') {
          const riddle = { id: `rid_${Date.now()}`, ...body };
          store.riddles.push(riddle);
          writeServerlessStore(store);
          if (isFirebaseConfigured && db) {
            await setDoc(doc(db, 'riddles', riddle.id), riddle).catch(() => {});
          }
          return jsonResponse({ ok: true, riddle });
        }
        if (method === 'DELETE') {
          const rid = path.split('/').pop() || '';
          store.riddles = store.riddles.filter((r: any) => r.id !== rid);
          writeServerlessStore(store);
          if (isFirebaseConfigured && db) {
            await deleteDoc(doc(db, 'riddles', rid)).catch(() => {});
          }
          return jsonResponse({ ok: true });
        }
      }

      const fullCounters = {
        totalUsers: allUsers.length,
        onlineUsers: allUsers.length,
        activeUsers: allUsers.length,
        bannedUsers: allUsers.filter((u: any) => u.status === 'banned').length,
        suspendedUsers: allUsers.filter((u: any) => u.status === 'suspended').length,
        activeMatches: 0,
        totalMatches: 48,
        pendingReports: store.reports.length,
        resolvedReports: 0,
        totalReports: store.reports.length,
        openTournaments: store.tournaments.length,
        activeTournaments: store.tournaments.length,
        totalRiddles: store.riddles.length,
        openRooms: store.rooms.length,
        uptimeSec: Math.floor(performance.now() / 1000),
      };

      return jsonResponse({
        ok: true,
        ...fullCounters,
        stats: fullCounters,
        overview: fullCounters,
        summary: fullCounters,
        counts: fullCounters,
        metrics: fullCounters,
        telemetry: fullCounters,
        users: allUsers,
        reports: store.reports,
        warnings: store.warnings,
        announcements: store.announcements,
        tournaments: store.tournaments,
        riddles: store.riddles,
        activeMatches: [],
        matches: [],
        auditLogs: store.auditLogs,
        logs: store.auditLogs,
        frames: [
          { id: 'bronze', name: 'Bronze Vanguard', minXp: 0 },
          { id: 'silver', name: 'Silver Striker', minXp: 1000 },
          { id: 'gold', name: 'Gold Champion', minXp: 1300 },
          { id: 'platinum', name: 'Emerald Jade', minXp: 1600 },
          { id: 'diamond', name: 'Diamond Sovereign', minXp: 1900 },
          { id: 'master', name: 'Amethyst Master', minXp: 2200 },
          { id: 'legend', name: 'Legend Mythic Crown', minXp: 2500 },
        ],
        featureLocks: store.featureLocks,
        matchmakingSettings: store.matchmakingSettings,
        landingContent: store.landingContent,
      });
    }

    return jsonResponse({ ok: true });
  };
}
