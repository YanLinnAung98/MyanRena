import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
} from 'firebase/firestore';
import { DEFAULT_LANDING_CONTENT } from '../i18n/landingDefaults.ts';
import { db, isFirebaseConfigured } from './firebase.ts';

const LOCAL_STATE_KEY = 'vanguard_serverless_db_v1';

interface LocalStore {
  users: Record<string, any>;
  tournaments: any[];
  rooms: any[];
  riddles: any[];
  reports: any[];
  warnings: any[];
  landingContent: any;
  featureLocks: Record<string, boolean>;
  matchmakingSettings: { maxWaitSec: number; xpRange: number };
}

function getDefaultStore(): LocalStore {
  return {
    users: {
      admin: {
        id: 'admin',
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
        avatarUrl: 'https://ui-avatars.com/api/?name=Yan+Linn+Aung&background=F59E0B&color=0A0D14&bold=true',
        friends: [],
        blocked: [],
      },
    },
    tournaments: [],
    rooms: [],
    riddles: [],
    reports: [],
    warnings: [],
    landingContent: DEFAULT_LANDING_CONTENT,
    featureLocks: {},
    matchmakingSettings: { maxWaitSec: 30, xpRange: 400 },
  };
}

function readStore(): LocalStore {
  try {
    const raw = localStorage.getItem(LOCAL_STATE_KEY);
    if (raw) return { ...getDefaultStore(), ...JSON.parse(raw) };
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
    displayName: `Aegis Bot (${difficulty.toUpperCase()})`,
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

// Intercept /api/* requests so GitHub Pages runs 100% serverless without 404 errors
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
    const currentUser =
      token === 'admin-token'
        ? store.users.admin
        : Object.values(store.users).find((u: any) => token.includes(u.id)) || store.users.admin;

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
        return jsonResponse({ user: store.users.admin });
      }
      if (isFirebaseConfigured && db) {
        const uid = token.replace(/^token_/, '');
        const snap = await getDoc(doc(db, 'users', uid));
        if (snap.exists()) return jsonResponse({ user: snap.data() });
      }
      return jsonResponse({ user: currentUser });
    }

    if (path === '/api/auth/logout') {
      return jsonResponse({ ok: true });
    }

    // 2. Bot & Sakar-Htar Matches
    if (path === '/api/matches/bot' && method === 'POST') {
      const match = createBotMatch(currentUser, body);
      return jsonResponse({ match });
    }

    if (path === '/api/sakar/solo' && method === 'POST') {
      const match = createBotMatch(currentUser, { gameType: 'sakarhtar', difficulty: 'medium' });
      return jsonResponse({ match });
    }

    // 3. Custom Rooms (1 to 8 Players)
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
        await setDoc(doc(db, 'rooms', room.id), room);
      }
      return jsonResponse({ room });
    }

    if (path === '/api/sakar/rooms/join' && method === 'POST') {
      const codeOrId = String(body.roomId || '').trim().toUpperCase();
      let room = store.rooms.find(
        (r) => r.id.toUpperCase() === codeOrId || r.code.toUpperCase() === codeOrId
      );
      if (!room && isFirebaseConfigured && db) {
        const snap = await getDocs(collection(db, 'rooms'));
        snap.forEach((d) => {
          const data = d.data();
          if (data.id?.toUpperCase() === codeOrId || data.code?.toUpperCase() === codeOrId) {
            room = data as any;
          }
        });
      }
      if (!room) return jsonResponse({ error: 'Room not found.' }, 404);
      if (!room.players.some((p: any) => p.id === currentUser.id)) {
        if (room.players.length >= room.maxPlayers) {
          return jsonResponse({ error: 'Room is full (Max 8 players).' }, 400);
        }
        room.players.push(currentUser);
        writeStore(store);
        if (isFirebaseConfigured && db) {
          await setDoc(doc(db, 'rooms', room.id), room, { merge: true });
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
      const match = createBotMatch(currentUser, { gameType: 'sakarhtar' });
      return jsonResponse({ match });
    }

    // 4. Tournaments (8 / 16 / 32 Brackets)
    if (path.match(/^\/api\/tournaments\/[^/]+\/join$/) && method === 'POST') {
      const tid = path.split('/')[3];
      if (isFirebaseConfigured && db) {
        const tRef = doc(db, 'tournaments', tid);
        const snap = await getDoc(tRef);
        if (snap.exists()) {
          const tData = snap.data();
          const participants = Array.from(new Set([...(tData.participants || []), currentUser.id]));
          await updateDoc(tRef, { participants });
        }
      }
      return jsonResponse({ ok: true });
    }

    if (path.match(/^\/api\/tournaments\/[^/]+\/leave$/) && method === 'POST') {
      const tid = path.split('/')[3];
      if (isFirebaseConfigured && db) {
        const tRef = doc(db, 'tournaments', tid);
        const snap = await getDoc(tRef);
        if (snap.exists()) {
          const tData = snap.data();
          const participants = (tData.participants || []).filter((id: string) => id !== currentUser.id);
          await updateDoc(tRef, { participants });
        }
      }
      return jsonResponse({ ok: true });
    }

    // 5. Social, Profile & Warnings
    if (path === '/api/social/request' && method === 'POST') {
      const targetId = body.targetUserId;
      if (targetId && !currentUser.friends.includes(targetId)) {
        currentUser.friends.push(targetId);
        writeStore(store);
        if (isFirebaseConfigured && db) {
          await setDoc(doc(db, 'users', currentUser.id), { friends: currentUser.friends }, { merge: true });
        }
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
        const snap = await getDoc(doc(db, 'users', uid));
        if (snap.exists()) return jsonResponse({ user: snap.data() });
      }
      return jsonResponse({ user: store.users[uid] || currentUser });
    }

    if (path.startsWith('/api/profile') && (method === 'PATCH' || method === 'POST' || method === 'PUT')) {
      Object.assign(currentUser, body);
      writeStore(store);
      if (isFirebaseConfigured && db) {
        await setDoc(doc(db, 'users', currentUser.id), currentUser, { merge: true });
      }
      return jsonResponse({ user: currentUser });
    }

    if (path.match(/^\/api\/warnings\/[^/]+\/ack$/) && method === 'POST') {
      return jsonResponse({ ok: true });
    }

    // 6. Admin Controls (Moderation, Feature Locks, CMS, Tournaments, Riddles)
    if (path.startsWith('/api/admin')) {
      if (path.includes('/landing') && (method === 'PUT' || method === 'POST')) {
        store.landingContent = body;
        writeStore(store);
        if (isFirebaseConfigured && db) {
          await setDoc(doc(db, 'system', 'landing'), body, { merge: true });
        }
        return jsonResponse({ landingContent: body });
      }

      if (path.includes('/tournaments') && method === 'POST') {
        const newTourney = {
          id: `tourney_${Date.now()}`,
          title: body.title || 'Vanguard Knockout Cup',
          gameType: body.gameType || 'rps',
          bracketSize: body.bracketSize || 8,
          prizeXp: body.prizeXp || 300,
          status: 'open',
          participants: [],
          rounds: [],
          createdAt: Date.now(),
        };
        store.tournaments.push(newTourney);
        writeStore(store);
        if (isFirebaseConfigured && db) {
          await setDoc(doc(db, 'tournaments', newTourney.id), newTourney);
        }
        return jsonResponse({ tournament: newTourney });
      }

      if (path.includes('/riddles')) {
        if (method === 'POST') {
          const riddle = { id: `rid_${Date.now()}`, ...body };
          store.riddles.push(riddle);
          writeStore(store);
          if (isFirebaseConfigured && db) {
            await setDoc(doc(db, 'riddles', riddle.id), riddle);
          }
          return jsonResponse({ riddle });
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
        return jsonResponse({ riddles: store.riddles });
      }

      if (path.includes('/users')) {
        if (isFirebaseConfigured && db) {
          const snap = await getDocs(collection(db, 'users'));
          const users: any[] = [];
          snap.forEach((d) => users.push(d.data()));
          return jsonResponse({ users });
        }
        return jsonResponse({ users: Object.values(store.users) });
      }

      return jsonResponse({
        ok: true,
        users: Object.values(store.users),
        reports: store.reports,
        tournaments: store.tournaments,
        riddles: store.riddles,
        featureLocks: store.featureLocks,
        matchmakingSettings: store.matchmakingSettings,
      });
    }

    return jsonResponse({ ok: true });
  };
}
