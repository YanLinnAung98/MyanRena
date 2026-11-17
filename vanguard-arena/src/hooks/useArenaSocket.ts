import React from 'react';
import type {
  ActiveMatch,
  Announcement,
  ChallengeInvite,
  ChatMessage,
  CustomRoom,
  CustomRoomChatMessage,
  DirectMessage,
  FeatureLocks,
  GameType,
  LandingContent,
  Language,
  MatchmakingSettings,
  OfficialWarning,
  OnlinePlayer,
  ProfileFrame,
  QueueStatus,
  Tournament,
  TurnTimeLimit,
  UserProfile,
} from '../types.ts';
import { DEFAULT_LANDING_CONTENT } from '../i18n/landingDefaults.ts';
import { TRANSLATIONS } from '../i18n/translations.ts';
import { soundEngine } from '../utils/sound.ts';

export interface ToastNotice {
  id: string;
  level: 'info' | 'error' | 'success';
  message: string;
}

interface UseArenaSocketOptions {
  token: string | null;
  lang: Language;
  onUserUpdate: (user: UserProfile) => void;
  onKicked: (reason: string) => void;
}

export function useArenaSocket({ token, lang, onUserUpdate, onKicked }: UseArenaSocketOptions) {
  const wsRef = React.useRef<WebSocket | null>(null);
  const retryTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptRef = React.useRef(0);
  const outgoingQueueRef = React.useRef<Record<string, unknown>[]>([]);
  const mountedRef = React.useRef(true);

  const [connectionState, setConnectionState] = React.useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [pingMs, setPingMs] = React.useState<number>(24);
  const [onlinePlayers, setOnlinePlayers] = React.useState<OnlinePlayer[]>([]);
  const [onlineCount, setOnlineCount] = React.useState<number>(0);
  const [activeDevices, setActiveDevices] = React.useState<number>(0);
  const [featureLocks, setFeatureLocks] = React.useState<FeatureLocks>({
    connect4: false,
    ttt: false,
    rps: false,
    sakar_htar: false,
    matchmaking: false,
    chat: false,
    tournaments: false,
  });
  const [frames, setFrames] = React.useState<ProfileFrame[]>([]);
  const [leaderboard, setLeaderboard] = React.useState<UserProfile[]>([]);
  const [tournaments, setTournaments] = React.useState<Tournament[]>([]);
  const [activeMatch, setActiveMatch] = React.useState<ActiveMatch | null>(null);
  const [matchChat, setMatchChat] = React.useState<ChatMessage[]>([]);
  const [pendingChallenge, setPendingChallenge] = React.useState<ChallengeInvite | null>(null);
  const [announcement, setAnnouncement] = React.useState<Announcement | null>(null);
  const [toasts, setToasts] = React.useState<ToastNotice[]>([]);
  const [incomingDMs, setIncomingDMs] = React.useState<DirectMessage[]>([]);
  const [socialRefreshTick, setSocialRefreshTick] = React.useState(0);
  const [queuedGame, setQueuedGame] = React.useState<GameType | null>(null);
  const [queueStatus, setQueueStatus] = React.useState<QueueStatus | null>(null);
  const [matchmakingSettings, setMatchmakingSettings] = React.useState<MatchmakingSettings>({
    maxSearchSeconds: 25,
    botFillDelaySeconds: 8,
    autoBotFillDefault: true,
  });
  const langRef = React.useRef<Language>(lang);
  React.useEffect(() => {
    langRef.current = lang;
  }, [lang]);
  const [sakarQuickCount, setSakarQuickCount] = React.useState<number>(0);
  const [openRooms, setOpenRooms] = React.useState<CustomRoom[]>([]);
  const [currentRoom, setCurrentRoom] = React.useState<CustomRoom | null>(null);
  const [roomChat, setRoomChat] = React.useState<CustomRoomChatMessage[]>([]);
  const [landingContent, setLandingContent] = React.useState<LandingContent>(DEFAULT_LANDING_CONTENT);
  const [pendingWarnings, setPendingWarnings] = React.useState<OfficialWarning[]>([]);

  const pushToast = React.useCallback((level: ToastNotice['level'], message: string) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-3), { id, level, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  const sendWs = React.useCallback((payload: Record<string, unknown>) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(payload));
    } else {
      outgoingQueueRef.current.push(payload);
    }
  }, []);

  const flushQueue = React.useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    while (outgoingQueueRef.current.length > 0) {
      const next = outgoingQueueRef.current.shift();
      if (next) ws.send(JSON.stringify(next));
    }
  }, []);

  React.useEffect(() => {
    mountedRef.current = true;
    if (!token) {
      setConnectionState('disconnected');
      setCurrentRoom(null);
      setRoomChat([]);
      setOpenRooms([]);
      setSakarQuickCount(0);
      setQueuedGame(null);
      setQueueStatus(null);
      setActiveMatch(null);
      return;
    }

    let intentionallyClosed = false;

    const connect = () => {
      if (!mountedRef.current || intentionallyClosed) return;
      setConnectionState('connecting');
      
      // 👉 ဒီနေရာမှာ Replit ရဲ့ WebSocket လင့်ခ်အသစ်ကို တိုက်ရိုက်ချိတ်ဆက်ပေးထားပါတယ်
      const ws = new WebSocket(`wss://2c3f69d0-bb83-4a5c-9c76-cd15a54a147e-00-butmapl87ofc.riker.replit.dev:5000/ws?token=${encodeURIComponent(token)}`);
      wsRef.current = ws;

      ws.onopen = () => {
        attemptRef.current = 0;
        setConnectionState('connected');
        flushQueue();
        ws.send(JSON.stringify({ type: 'match:sync' }));
      };

      ws.onmessage = (ev) => {
        let msg: Record<string, unknown>;
        try {
          msg = JSON.parse(ev.data);
        } catch {
          return;
        }

        switch (msg.type) {
          case 'ping':
            ws.send(JSON.stringify({ type: 'pong', ts: msg.ts }));
            break;
          case 'ping:ack':
            setPingMs(Number(msg.pingMs || 20));
            break;
          case 'init':
            if (msg.user) onUserUpdate(msg.user as UserProfile);
            if (msg.featureLocks) setFeatureLocks(msg.featureLocks as FeatureLocks);
            if (msg.matchmakingSettings) setMatchmakingSettings(msg.matchmakingSettings as MatchmakingSettings);
            if (msg.frames) setFrames(msg.frames as ProfileFrame[]);
            if (msg.onlinePlayers) {
              const list = msg.onlinePlayers as OnlinePlayer[];
              setOnlinePlayers(list);
              setOnlineCount(list.length);
            }
            if (msg.activeDevices !== undefined) setActiveDevices(Number(msg.activeDevices));
            if (msg.leaderboard) setLeaderboard(msg.leaderboard as UserProfile[]);
            if (msg.tournaments) setTournaments(msg.tournaments as Tournament[]);
            if (msg.landingContent) setLandingContent(msg.landingContent as LandingContent);
            if (Array.isArray(msg.warnings)) setPendingWarnings(msg.warnings as OfficialWarning[]);
            if (Array.isArray(msg.openRooms)) setOpenRooms(msg.openRooms as CustomRoom[]);
            if (msg.sakarQueueCount !== undefined) setSakarQuickCount(Number(msg.sakarQueueCount || 0));
            break;
          case 'matchmaking:settings':
            if (msg.matchmakingSettings) setMatchmakingSettings(msg.matchmakingSettings as MatchmakingSettings);
            break;
          case 'queue:tick':
            if (msg.queue) {
              const q = msg.queue as QueueStatus;
              setQueueStatus(q);
              setQueuedGame(q.gameType);
            }
            break;
          case 'queue:cancelled':
            setQueuedGame(null);
            setQueueStatus(null);
            setSakarQuickCount(0);
            break;
          case 'queue:timeout':
            setQueuedGame(null);
            setQueueStatus(null);
            setSakarQuickCount(0);
            soundEngine.playNotify();
            pushToast('info', TRANSLATIONS[langRef.current].lobby.noPlayersTimeoutToast);
            break;
          case 'warning:official':
            if (msg.warning) {
              const w = msg.warning as OfficialWarning;
              soundEngine.playNotify();
              setPendingWarnings((prev) => (prev.some((x) => x.id === w.id) ? prev : [w, ...prev]));
            }
            break;
          case 'landing:update':
            if (msg.landingContent) setLandingContent(msg.landingContent as LandingContent);
            break;
          case 'presence:update': {
            const list = (msg.onlinePlayers as OnlinePlayer[]) || [];
            setOnlinePlayers(list);
            setOnlineCount(Number(msg.onlineCount ?? list.length));
            if (msg.activeDevices !== undefined) setActiveDevices(Number(msg.activeDevices));
            break;
          }
          case 'locks:update':
            setFeatureLocks(msg.featureLocks as FeatureLocks);
            break;
          case 'frames:update':
            setFrames(msg.frames as ProfileFrame[]);
            break;
          case 'leaderboard:update':
            setLeaderboard(msg.leaderboard as UserProfile[]);
            break;
          case 'tournaments:update':
            setTournaments(msg.tournaments as Tournament[]);
            break;
          case 'user:update':
            if (msg.user) onUserUpdate(msg.user as UserProfile);
            break;
          case 'match:state': {
            const nextMatch = msg.match as ActiveMatch;
            setActiveMatch((prev) => {
              if (!prev || prev.id !== nextMatch.id) {
                setMatchChat([]);
                setQueuedGame(null);
                setQueueStatus(null);
                setSakarQuickCount(0);
              }
              return nextMatch;
            });
            break;
          }
          case 'match:left':
            setActiveMatch(null);
            setMatchChat([]);
            break;
          case 'rooms:update':
            setOpenRooms((msg.openRooms as CustomRoom[]) || []);
            break;
          case 'room:state': {
            const nextRoom = (msg.room as CustomRoom | null) || null;
            setCurrentRoom(nextRoom);
            if (Array.isArray(msg.chat)) {
              setRoomChat(msg.chat as CustomRoomChatMessage[]);
            } else if (!nextRoom) {
              setRoomChat([]);
            }
            break;
          }
          case 'room:chat': {
            const rc = msg.message as CustomRoomChatMessage;
            setRoomChat((prev) => (prev.some((m) => m.id === rc.id) ? prev : [...prev.slice(-79), rc]));
            break;
          }
          case 'room:kicked':
            setCurrentRoom(null);
            setRoomChat([]);
            pushToast('error', String(msg.reason || 'Removed from room.'));
            break;
          case 'sakar:queue': {
            const cnt = Number(msg.count || 0);
            setSakarQuickCount(cnt);
            if (cnt === 0) {
              setQueuedGame((prev) => (prev === 'sakar_htar' ? null : prev));
            }
            break;
          }
          case 'match:chat': {
            const chat = msg.message as ChatMessage;
            setMatchChat((prev) => (prev.some((c) => c.id === chat.id) ? prev : [...prev.slice(-79), chat]));
            break;
          }
          case 'challenge:received':
            soundEngine.playNotify();
            setPendingChallenge(msg.invite as ChallengeInvite);
            break;
          case 'announcement':
            soundEngine.playNotify();
            setAnnouncement(msg.announcement as Announcement);
            break;
          case 'dm:new': {
            const dm = msg.message as DirectMessage;
            setIncomingDMs((prev) => [...prev.slice(-30), dm]);
            setSocialRefreshTick((n) => n + 1);
            soundEngine.playNotify();
            break;
          }
          case 'social:update':
            setSocialRefreshTick((n) => n + 1);
            break;
          case 'toast':
            pushToast((msg.level as ToastNotice['level']) || 'info', String(msg.message || ''));
            break;
          case 'kicked':
            intentionallyClosed = true;
            onKicked(String(msg.reason || 'Disconnected by administrator.'));
            break;
          default:
            break;
        }
      };

      ws.onclose = (ev) => {
        if (wsRef.current === ws) wsRef.current = null;
        if (intentionallyClosed || ev.code === 4001 || ev.code === 4003) {
          setConnectionState('disconnected');
          return;
        }
        setConnectionState('connecting');
        const delay = Math.min(15000, 1000 * Math.pow(2, attemptRef.current));
        attemptRef.current += 1;
        retryTimerRef.current = setTimeout(connect, delay);
      };
    };

    connect();

    return () => {
      mountedRef.current = false;
      intentionallyClosed = true;
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [token, flushQueue, onKicked, onUserUpdate, pushToast]);

  const joinQueue = (gameType: GameType, turnTimeLimit?: TurnTimeLimit, autoBotFill?: boolean) => {
    const botFill = autoBotFill ?? matchmakingSettings.autoBotFillDefault;
    setQueuedGame(gameType);
    setQueueStatus({
      gameType,
      joinedAt: Date.now(),
      elapsedSec: 0,
      maxSearchSeconds: matchmakingSettings.maxSearchSeconds,
      botFillDelaySeconds: matchmakingSettings.botFillDelaySeconds,
      autoBotFill: botFill,
      count: 1,
    });
    sendWs({ type: 'queue:join', gameType, turnTimeLimit, autoBotFill: botFill });
  };

  const leaveQueue = () => {
    setQueuedGame(null);
    setQueueStatus(null);
    setSakarQuickCount(0);
    sendWs({ type: 'queue:leave' });
  };

  const joinSakarQuick = (autoBotFill?: boolean) => {
    const botFill = autoBotFill ?? matchmakingSettings.autoBotFillDefault;
    setQueuedGame('sakar_htar');
    setQueueStatus({
      gameType: 'sakar_htar',
      joinedAt: Date.now(),
      elapsedSec: 0,
      maxSearchSeconds: matchmakingSettings.maxSearchSeconds,
      botFillDelaySeconds: matchmakingSettings.botFillDelaySeconds,
      autoBotFill: botFill,
      count: 1,
    });
    sendWs({ type: 'sakar:quick:join', autoBotFill: botFill });
  };

  const leaveSakarQuick = () => {
    setQueuedGame(null);
    setQueueStatus(null);
    setSakarQuickCount(0);
    sendWs({ type: 'sakar:quick:leave' });
  };

  const startSakarQuickNow = () => {
    sendWs({ type: 'sakar:quick:start_now' });
  };

  const sendRoomChat = (roomId: string, content: string) => {
    sendWs({ type: 'room:chat', roomId, content });
  };

  const sendChallenge = (
    targetUserId: string,
    gameType: GameType,
    bestOf: 3 | 5 = 3,
    turnTimeLimit?: TurnTimeLimit
  ) => {
    sendWs({ type: 'challenge:send', targetUserId, gameType, bestOf, turnTimeLimit });
    pushToast('info', 'Challenge invitation sent.');
  };

  const respondChallenge = (inviteId: string, accept: boolean) => {
    setPendingChallenge(null);
    sendWs({ type: 'challenge:respond', inviteId, accept });
  };

  const sendMove = async (matchId: string, payload: Record<string, unknown>) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'match:move', matchId, payload }));
      return;
    }
    if (!token) return;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await fetch(`/api/matches/${matchId}/move`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.match) setActiveMatch(data.match);
          return;
        }
        if (res.status >= 400 && res.status < 500) break;
      } catch {
        await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      }
    }
  };

  const forfeitMatch = (matchId: string) => {
    sendWs({ type: 'match:forfeit', matchId });
  };

  const sendMatchChat = (matchId: string, content: string, kind: 'text' | 'sticker' = 'text') => {
    sendWs({ type: kind === 'sticker' ? 'match:sticker' : 'match:chat', matchId, content });
  };

  const setAdminSocketMode = React.useCallback(
    (mode: 'admin' | 'lobby') => {
      sendWs({ type: 'admin:mode', mode });
    },
    [sendWs]
  );

  const dismissWarningLocal = React.useCallback((id: string) => {
    setPendingWarnings((prev) => prev.filter((w) => w.id !== id));
  }, []);

  return {
    connectionState,
    pingMs,
    onlinePlayers,
    onlineCount,
    activeDevices,
    featureLocks,
    frames,
    leaderboard,
    tournaments,
    landingContent,
    setLandingContent,
    pendingWarnings,
    dismissWarningLocal,
    activeMatch,
    setActiveMatch,
    matchChat,
    pendingChallenge,
    announcement,
    setAnnouncement,
    toasts,
    pushToast,
    incomingDMs,
    socialRefreshTick,
    queuedGame,
    queueStatus,
    matchmakingSettings,
    sakarQuickCount,
    openRooms,
    currentRoom,
    setCurrentRoom,
    roomChat,
    setRoomChat,
    joinQueue,
    leaveQueue,
    joinSakarQuick,
    leaveSakarQuick,
    startSakarQuickNow,
    sendRoomChat,
    sendChallenge,
    respondChallenge,
    sendMove,
    forfeitMatch,
    sendMatchChat,
    setAdminSocketMode,
  };
}
