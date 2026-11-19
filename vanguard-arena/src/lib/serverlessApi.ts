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

export const LOCAL_STATE_KEY = 'vanguard_serverless_db_v4';
export const ACTIVE_USER_KEY = 'vanguard_active_user_v4';

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
    auditLogs: [
      {
        id: 'log_1',
        action: 'SYSTEM_READY',
        actor: 'yanlinnaung',
        detail: 'Vanguard Arena Serverless Core Active',
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
      botFallbackSec: 15,
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
  user: any,
  opts: {
    gameType?: string;
    mode?: string;
    difficulty?: string;
    bestOf?: 3 | 5;
    turnTimeLimit?: number;
  }
) {
  const store = readServerlessStore();
  const gameType = opts.gameType || 'tictactoe';
  const difficulty = opts.difficulty || 'medium';
  const bestOf = opts.bestOf || 3;
  const turnTimeLimit = opts.turnTimeLimit || 20;

  const botPlayer = {
    id: 'aegis_bot',
    username: 'aegis_bot',
    displayName: `Aegis Bot (${difficulty.toUpperCase()})`,
    gameId: 'BOT-001',
    xp: user?.xp || 1000,
    rank: 'Gold',
    frameId: 'gold',
    avatarUrl: createAvatarSvg('AI', '#4f46e5', '#ffffff'),
    isBot: true,
  };

  const tttBoard = Array(9).fill(null);
  const c4Board = Array.from({ length: 6 }, () => Array(7).fill(null));
  const riddles = store.riddles?.length ? store.riddles : DEFAULT_SAKAR_RIDDLES;
  const deadline = new Date(Date.now() + turnTimeLimit * 1000).toISOString();

  return {
    id: `match_${Date.now()}`,
    gameType,
    mode: opts.mode || 'bot',
    difficulty,
    bestOf,
    turnTimeLimit,
    turnDeadline: deadline,
    status: 'active',
    players: [user, botPlayer],
    turnUserId: user.id,
    scores: { [user.id]: 0, aegis_bot: 0 },
    round: 1,
    tttBoard,
    c4Board,
    rpsLastRound: null as { playerChoice: string; botChoice: string; winner: 'player' | 'bot' | 'draw' } | null,
    riddles,
    riddleIndex: 0,
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

// Global broken-image auto-repair so no broken image icons ever appear on GitHub Pages
if (typeof window !== 'undefined' && !(window as any).__vanguardImgGuard) {
  (window as any).__vanguardImgGuard = true;
  window.addEventListener(
    'error',
    (ev: Event) => {
      const target = ev.target as HTMLImageElement | null;
      if (target && target.tagName === 'IMG' && !target.dataset.repaired) {
        target.dataset.repaired = '1';
        const alt = (target.alt || '').toLowerCase();
        if (alt.includes('connect') || alt.includes('4')) target.src = GAME_ARTWORKS.connect4;
        else if (alt.includes('tic')) target.src = GAME_ARTWORKS.tictactoe;
        else if (alt.includes('rock') || alt.includes('rps')) target.src = GAME_ARTWORKS.rps;
        else if (alt.includes('sakar') || alt.includes('riddle')) target.src = GAME_ARTWORKS.sakarhtar;
        else if (alt.includes('stage') || alt.includes('banner')) target.src = GAME_ARTWORKS.heroBanner;
        else target.src = createAvatarSvg(target.alt || 'P');
      }
    },
    true
  );
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

    // Strictly resolve user by token — NEVER fallback a regular user to admin_yanlinnaung
    let currentUser: any = null;
    if (token === 'admin-token') {
      currentUser = store.users.admin_yanlinnaung;
    } else if (token) {
      const uid = token.replace(/^token_/, '').replace(/^local_/, '');
      currentUser =
        store.users[uid] ||
        (activeSaved && activeSaved.id === uid ? activeSaved : null) ||
        Object.values(store.users).find((u: any) => u.id !== 'admin_yanlinnaung' && token.includes(u.id)) ||
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
      return jsonResponse({ match: buildPlayableMatch(currentUser || activeSaved, body) });
    }

    if (path === '/api/sakar/solo' && method === 'POST') {
      return jsonResponse({
        match: buildPlayableMatch(currentUser || activeSaved, { gameType: 'sakarhtar', mode: 'solo', difficulty: 'medium' }),
      });
    }

    if (path === '/api/sakar/rooms' && method === 'POST') {
      const host = currentUser || activeSaved;
      const code = 'MR-' + Math.floor(1000 + Math.random() * 9000);
      const room = {
        id: `room_${Date.now()}`,
        code,
        title: body.title || `${host.displayName}'s Room`,
        hostId: host.id,
        maxPlayers: Math.min(8, Math.max(2, Number(body.maxPlayers) || 8)),
        players: [host],
        status: 'waiting',
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
      const codeOrId = String(body.roomId || '').trim().toUpperCase();
      let room = store.rooms.find(
        (r: any) => r.id.toUpperCase() === codeOrId || r.code.toUpperCase() === codeOrId
      );
      if (!room && isFirebaseConfigured && db) {
        const snap = await getDocs(collection(db, 'rooms')).catch(() => null);
        snap?.forEach((d) => {
          const data = d.data();
          if (data.id?.toUpperCase() === codeOrId || data.code?.toUpperCase() === codeOrId) {
            room = data as any;
          }
        });
      }
      if (!room) return jsonResponse({ error: 'Room not found.' }, 404);
      if (!room.players.some((p: any) => p.id === player.id)) {
        room.players.push(player);
        writeServerlessStore(store);
      }
      return jsonResponse({ room });
    }

    if (path.match(/^\/api\/sakar\/rooms\/[^/]+\/leave$/) && method === 'POST') {
      const roomId = path.split('/')[4];
      store.rooms = store.rooms.filter((r: any) => r.id !== roomId);
      writeServerlessStore(store);
      return jsonResponse({ ok: true });
    }

    if (path.match(/^\/api\/sakar\/rooms\/[^/]+\/start$/) && method === 'POST') {
      return jsonResponse({
        match: buildPlayableMatch(currentUser || activeSaved, { gameType: 'sakarhtar', mode: 'custom' }),
      });
    }

    if (path.match(/^\/api\/tournaments\/[^/]+\/join$/) && method === 'POST') {
      return jsonResponse({ ok: true });
    }

    if (path.match(/^\/api\/tournaments\/[^/]+\/leave$/) && method === 'POST') {
      return jsonResponse({ ok: true });
    }

    if (path === '/api/social/request' && method === 'POST') {
      return jsonResponse({ ok: true });
    }

    if (path.startsWith('/api/social')) {
      return jsonResponse({
        friends: [],
        incomingRequests: [],
        outgoingRequests: [],
        blocked: currentUser?.blocked || [],
        conversations: [],
      });
    }

    if (path.startsWith('/api/users/')) {
      const uid = path.split('/')[3];
      return jsonResponse({ user: store.users[uid] || currentUser });
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
      return jsonResponse({ ok: true });
    }

    if (path.startsWith('/api/admin')) {
      let allUsers = Object.values(store.users);
      if (isFirebaseConfigured && db) {
        const snap = await getDocs(collection(db, 'users')).catch(() => null);
        if (snap && !snap.empty) {
          const fbUsers: any[] = [];
          snap.forEach((d) => fbUsers.push(d.data()));
          allUsers = fbUsers;
        }
      }

      if ((path.includes('lock') || path.includes('config')) && ['PUT', 'POST', 'PATCH'].includes(method)) {
        store.featureLocks = { ...store.featureLocks, ...(body.featureLocks || body) };
        writeServerlessStore(store);
        return jsonResponse({ ok: true, featureLocks: store.featureLocks });
      }

      if (path.includes('matchmaking') && ['PUT', 'POST', 'PATCH'].includes(method)) {
        store.matchmakingSettings = { ...store.matchmakingSettings, ...body };
        writeServerlessStore(store);
        return jsonResponse({ ok: true, matchmakingSettings: store.matchmakingSettings });
      }

      if (path.includes('landing') && ['PUT', 'POST', 'PATCH'].includes(method)) {
        store.landingContent = getPatchedLandingContent(body);
        writeServerlessStore(store);
        if (isFirebaseConfigured && db) {
          await setDoc(doc(db, 'system', 'landing'), store.landingContent, { merge: true }).catch(() => {});
        }
        return jsonResponse({ ok: true, landingContent: store.landingContent });
      }

      if ((path.includes('announce') || path.includes('broadcast')) && method === 'POST') {
        const ann = { id: `ann_${Date.now()}`, ...body, createdAt: new Date().toISOString() };
        store.announcements.unshift(ann);
        writeServerlessStore(store);
        return jsonResponse({ ok: true, announcement: ann });
      }

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
          updates.status = 'warned';
          updates.warnMessage = body.reason || 'Official Warning';
        } else if (typeof body.xp === 'number') {
          updates.xp = body.xp;
        }
        if (store.users[targetId]) {
          Object.assign(store.users[targetId], updates);
          writeServerlessStore(store);
        }
        return jsonResponse({ ok: true });
      }

      if (path.includes('tournament') && method === 'POST') {
        const newTourney = {
          id: `tourney_${Date.now()}`,
          title: body.title || 'Vanguard Knockout Cup',
          gameType: body.gameType || 'rps',
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
        kpi: fullCounters,
        kpis: fullCounters,
        moderation: fullCounters,
        reportStats: fullCounters,
        health: fullCounters,
        serverHealth: fullCounters,
        dashboard: fullCounters,
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
          { id: 'diamond', name: 'Diamond Sovereign', minXp: 1800 },
          { id: 'legend', name: 'Legend Mythic', minXp: 2500 },
        ],
        featureLocks: store.featureLocks,
        matchmakingSettings: store.matchmakingSettings,
        landingContent: store.landingContent,
      });
    }

    return jsonResponse({ ok: true });
  };
}
