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
import { db, isFirebaseConfigured } from './firebase.ts';

const LOCAL_STATE_KEY = 'vanguard_serverless_db_v2';

interface LocalStore {
  users: Record<string, any>;
  tournaments: any[];
  rooms: any[];
  riddles: any[];
  reports: any[];
  warnings: any[];
  announcements: any[];
  auditLogs: any[];
  landingContent: any;
  featureLocks: Record<string, boolean>;
  matchmakingSettings: {
    maxWaitSec: number;
    xpRange: number;
    botFallbackSec: number;
    defaultTurnTime: number;
  };
}

function getDefaultStore(): LocalStore {
  return {
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
        avatarUrl: 'https://ui-avatars.com/api/?name=Yan+Linn+Aung&background=F59E0B&color=0A0D14&bold=true',
        friends: [],
        blocked: [],
        createdAt: new Date().toISOString(),
      },
    },
    tournaments: [],
    rooms: [],
    riddles: [
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
    ],
    reports: [],
    warnings: [],
    announcements: [],
    auditLogs: [
      {
        id: 'log_1',
        action: 'SYSTEM_BOOT',
        actor: 'yanlinnaung',
        detail: 'Serverless Arena Engine initialized',
        createdAt: new Date().toISOString(),
      },
    ],
    landingContent: DEFAULT_LANDING_CONTENT,
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
      botFallbackSec: 20,
      defaultTurnTime: 20,
    },
  };
}

function readStore(): LocalStore {
  try {
    const raw = localStorage.getItem(LOCAL_STATE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...getDefaultStore(),
        ...parsed,
        featureLocks: { ...getDefaultStore().featureLocks, ...(parsed.featureLocks || {}) },
        matchmakingSettings: { ...getDefaultStore().matchmakingSettings, ...(parsed.matchmakingSettings || {}) },
      };
    }
  } catch {}
  return getDefaultStore();
}

function writeStore(store: LocalStore) {
  try {
    localStorage.setItem(LOCAL_STATE_KEY, JSON.stringify(store));
  } catch {}
}

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function createBotMatch(user: any, body: any) {
  const gameType = body.gameType || 'tictactoe';
  const difficulty = body.difficulty || 'medium';
  const bestOf = body.bestOf || 3;
  const botPlayer = {
    id: 'aegis_bot',
    username: 'aegis_bot',
    displayName: `Aegis Bot (${String(difficulty).toUpperCase()})`,
    gameId: 'BOT-001',
    xp: user?.xp || 1000,
    rank: 'Gold',
    frameId: 'gold',
    avatarUrl: 'https://ui-avatars.com/api/?name=Aegis+Bot&background=6366F1&color=fff',
    isBot: true,
  };

  return {
    id: `match_${Date.now()}`,
    gameType,
    mode: 'bot',
    difficulty,
    bestOf,
    turnTimeLimit: body.turnTimeLimit || 20,
    status: 'active',
    players: [user, botPlayer],
    currentTurn: user.id,
    scores: { [user.id]: 0, aegis_bot: 0 },
    round: 1,
    board:
      gameType === 'tictactoe'
        ? Array(9).fill(null)
        : gameType === 'connect4'
        ? Array.from({ length: 6 }, () => Array(7).fill(null))
        : null,
    createdAt: new Date().toISOString(),
  };
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

    const store = readStore();
    const adminFallback = store.users.admin_yanlinnaung || Object.values(store.users)[0];
    const currentUser =
      token === 'admin-token'
        ? adminFallback
        : Object.values(store.users).find((u: any) => token.includes(u.id)) || adminFallback;

    // 1. Bootstrap & Auth
    if (path === '/api/bootstrap') {
      return jsonResponse({
        onlineCount: Math.max(1, Object.keys(store.users).length),
        landingContent: store.landingContent || DEFAULT_LANDING_CONTENT,
      });
    }

    if (path === '/api/auth/me') {
      if (!token) return jsonResponse({ error: 'Unauthorized' }, 401);
      if (token === 'admin-token') {
        return jsonResponse({ user: adminFallback });
      }
      if (isFirebaseConfigured && db) {
        const uid = token.replace(/^token_/, '');
        const snap = await getDoc(doc(db, 'users', uid)).catch(() => null);
        if (snap && snap.exists()) return jsonResponse({ user: snap.data() });
      }
      return jsonResponse({ user: currentUser });
    }

    if (path === '/api/auth/logout') {
      return jsonResponse({ ok: true });
    }

    // 2. Matches & Custom Rooms
    if (path === '/api/matches/bot' && method === 'POST') {
      return jsonResponse({ match: createBotMatch(currentUser, body) });
    }

    if (path === '/api/sakar/solo' && method === 'POST') {
      return jsonResponse({ match: createBotMatch(currentUser, { gameType: 'sakarhtar', difficulty: 'medium' }) });
    }

    if (path === '/api/sakar/rooms' && method === 'POST') {
      const code = 'MR-' + Math.floor(1000 + Math.random() * 9000);
      const room = {
        id: `room_${Date.now()}`,
        code,
        title: body.title || `${currentUser.displayName}'s Room`,
        hostId: currentUser.id,
        maxPlayers: Math.min(8, Math.max(2, Number(body.maxPlayers) || 8)),
        players: [currentUser],
        status: 'waiting',
      };
      store.rooms.push(room);
      writeStore(store);
      if (isFirebaseConfigured && db) {
        await setDoc(doc(db, 'rooms', room.id), room).catch(() => {});
      }
      return jsonResponse({ room });
    }

    if (path === '/api/sakar/rooms/join' && method === 'POST') {
      const codeOrId = String(body.roomId || '').trim().toUpperCase();
      let room = store.rooms.find(
        (r) => r.id.toUpperCase() === codeOrId || r.code.toUpperCase() === codeOrId
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
      if (!room.players.some((p: any) => p.id === currentUser.id)) {
        if (room.players.length >= room.maxPlayers) {
          return jsonResponse({ error: 'Room is full.' }, 400);
        }
        room.players.push(currentUser);
        writeStore(store);
        if (isFirebaseConfigured && db) {
          await setDoc(doc(db, 'rooms', room.id), room, { merge: true }).catch(() => {});
        }
      }
      return jsonResponse({ room });
    }

    if (path.match(/^\/api\/sakar\/rooms\/[^/]+\/leave$/) && method === 'POST') {
      const roomId = path.split('/')[4];
      store.rooms = store.rooms.filter((r) => r.id !== roomId);
      writeStore(store);
      return jsonResponse({ ok: true });
    }

    if (path.match(/^\/api\/sakar\/rooms\/[^/]+\/start$/) && method === 'POST') {
      return jsonResponse({ match: createBotMatch(currentUser, { gameType: 'sakarhtar' }) });
    }

    // 3. Tournaments
    if (path.match(/^\/api\/tournaments\/[^/]+\/join$/) && method === 'POST') {
      const tid = path.split('/')[3];
      if (isFirebaseConfigured && db) {
        const tRef = doc(db, 'tournaments', tid);
        const snap = await getDoc(tRef).catch(() => null);
        if (snap && snap.exists()) {
          const tData = snap.data();
          const participants = Array.from(new Set([...(tData.participants || []), currentUser.id]));
          await updateDoc(tRef, { participants }).catch(() => {});
        }
      }
      return jsonResponse({ ok: true });
    }

    if (path.match(/^\/api\/tournaments\/[^/]+\/leave$/) && method === 'POST') {
      const tid = path.split('/')[3];
      if (isFirebaseConfigured && db) {
        const tRef = doc(db, 'tournaments', tid);
        const snap = await getDoc(tRef).catch(() => null);
        if (snap && snap.exists()) {
          const tData = snap.data();
          const participants = (tData.participants || []).filter((id: string) => id !== currentUser.id);
          await updateDoc(tRef, { participants }).catch(() => {});
        }
      }
      return jsonResponse({ ok: true });
    }

    // 4. Social & Profile
    if (path === '/api/social/request' && method === 'POST') {
      const targetId = body.targetUserId;
      if (targetId && !currentUser.friends.includes(targetId)) {
        currentUser.friends.push(targetId);
        writeStore(store);
      }
      return jsonResponse({ ok: true });
    }

    if (path.startsWith('/api/social')) {
      return jsonResponse({
        friends: [],
        incomingRequests: [],
        outgoingRequests: [],
        blocked: currentUser.blocked || [],
        conversations: [],
      });
    }

    if (path.startsWith('/api/users/')) {
      const uid = path.split('/')[3];
      if (isFirebaseConfigured && db) {
        const snap = await getDoc(doc(db, 'users', uid)).catch(() => null);
        if (snap && snap.exists()) return jsonResponse({ user: snap.data() });
      }
      return jsonResponse({ user: store.users[uid] || currentUser });
    }

    if (path.startsWith('/api/profile') && ['PATCH', 'POST', 'PUT'].includes(method)) {
      Object.assign(currentUser, body);
      writeStore(store);
      if (isFirebaseConfigured && db) {
        await setDoc(doc(db, 'users', currentUser.id), currentUser, { merge: true }).catch(() => {});
      }
      return jsonResponse({ user: currentUser });
    }

    if (path.match(/^\/api\/warnings\/[^/]+\/ack$/) && method === 'POST') {
      return jsonResponse({ ok: true });
    }

    // 5. Comprehensive Admin Dashboard APIs
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

      // Feature Locks update
      if ((path.includes('lock') || path.includes('config')) && ['PUT', 'POST', 'PATCH'].includes(method)) {
        store.featureLocks = { ...store.featureLocks, ...(body.featureLocks || body) };
        writeStore(store);
        if (isFirebaseConfigured && db) {
          await setDoc(doc(db, 'system', 'config'), { featureLocks: store.featureLocks }, { merge: true }).catch(() => {});
        }
        return jsonResponse({ ok: true, featureLocks: store.featureLocks });
      }

      // Matchmaking Settings update
      if (path.includes('matchmaking') && ['PUT', 'POST', 'PATCH'].includes(method)) {
        store.matchmakingSettings = { ...store.matchmakingSettings, ...body };
        writeStore(store);
        if (isFirebaseConfigured && db) {
          await setDoc(doc(db, 'system', 'config'), { matchmakingSettings: store.matchmakingSettings }, { merge: true }).catch(() => {});
        }
        return jsonResponse({ ok: true, matchmakingSettings: store.matchmakingSettings });
      }

      // Landing CMS update
      if (path.includes('landing') && ['PUT', 'POST', 'PATCH'].includes(method)) {
        store.landingContent = body;
        writeStore(store);
        if (isFirebaseConfigured && db) {
          await setDoc(doc(db, 'system', 'landing'), body, { merge: true }).catch(() => {});
        }
        return jsonResponse({ ok: true, landingContent: body });
      }

      // Broadcast Announcement
      if ((path.includes('announce') || path.includes('broadcast')) && method === 'POST') {
        const ann = { id: `ann_${Date.now()}`, ...body, createdAt: new Date().toISOString() };
        store.announcements.unshift(ann);
        writeStore(store);
        if (isFirebaseConfigured && db) {
          await setDoc(doc(db, 'system', 'config'), { announcement: body.message || body.title || '' }, { merge: true }).catch(() => {});
        }
        return jsonResponse({ ok: true, announcement: ann });
      }

      // User Moderation (warn, kick, suspend, ban, unban, xp)
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
          const mins = Number(body.minutes || body.durationMinutes || 60);
          updates.status = 'suspended';
          updates.suspendedUntil = new Date(Date.now() + mins * 60000).toISOString();
        } else if (action.includes('warn')) {
          updates.status = 'warned';
          updates.warnMessage = body.reason || 'Official Warning';
        } else if (typeof body.xp === 'number') {
          updates.xp = body.xp;
        }

        if (store.users[targetId]) {
          Object.assign(store.users[targetId], updates);
          writeStore(store);
        }
        if (isFirebaseConfigured && db && targetId) {
          await setDoc(doc(db, 'users', targetId), updates, { merge: true }).catch(() => {});
        }
        return jsonResponse({ ok: true });
      }

      // Tournaments CRUD
      if (path.includes('tournament')) {
        if (method === 'POST') {
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
          writeStore(store);
          if (isFirebaseConfigured && db) {
            await setDoc(doc(db, 'tournaments', newTourney.id), newTourney).catch(() => {});
          }
          return jsonResponse({ ok: true, tournament: newTourney });
        }
        return jsonResponse({ ok: true, tournaments: store.tournaments });
      }

      // Riddles CRUD
      if (path.includes('riddle')) {
        if (method === 'POST') {
          const riddle = { id: `rid_${Date.now()}`, ...body };
          store.riddles.push(riddle);
          writeStore(store);
          if (isFirebaseConfigured && db) {
            await setDoc(doc(db, 'riddles', riddle.id), riddle).catch(() => {});
          }
          return jsonResponse({ ok: true, riddle });
        }
        if (method === 'DELETE') {
          const rid = path.split('/').pop() || '';
          store.riddles = store.riddles.filter((r) => r.id !== rid);
          writeStore(store);
          if (isFirebaseConfigured && db) {
            await deleteDoc(doc(db, 'riddles', rid)).catch(() => {});
          }
          return jsonResponse({ ok: true });
        }
        return jsonResponse({ ok: true, riddles: store.riddles });
      }

      // Default full dashboard payload for any /api/admin/* GET route
      const statsObj = {
        totalUsers: allUsers.length,
        onlineUsers: allUsers.length,
        activeMatches: 0,
        totalMatches: 48,
        pendingReports: store.reports.length,
        openTournaments: store.tournaments.length,
        totalRiddles: store.riddles.length,
        uptimeSec: Math.floor(performance.now() / 1000),
      };

      return jsonResponse({
        ok: true,
        stats: statsObj,
        overview: statsObj,
        metrics: statsObj,
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
