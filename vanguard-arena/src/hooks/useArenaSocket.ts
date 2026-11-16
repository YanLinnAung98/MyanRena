import React from 'react';
import { supabase } from '../utils/supabaseClient';
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
  const [connectionState, setConnectionState] = React.useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [pingMs, setPingMs] = React.useState<number>(24);
  const [onlinePlayers, setOnlinePlayers] = React.useState<OnlinePlayer[]>([]);
  const [onlineCount, setOnlineCount] = React.useState<number>(0);
  const [activeDevices, setActiveDevices] = React.useState<number>(0);
  
  // State များကို Default အတိုင်း ဆက်လက်ထားရှိသည်
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
  const [sakarQuickCount, setSakarQuickCount] = React.useState<number>(0);
  const [openRooms, setOpenRooms] = React.useState<CustomRoom[]>([]);
  const [currentRoom, setCurrentRoom] = React.useState<CustomRoom | null>(null);
  const [roomChat, setRoomChat] = React.useState<CustomRoomChatMessage[]>([]);
  const [landingContent, setLandingContent] = React.useState<LandingContent>(DEFAULT_LANDING_CONTENT);
  const [pendingWarnings, setPendingWarnings] = React.useState<OfficialWarning[]>([]);

  const langRef = React.useRef<Language>(lang);
  React.useEffect(() => {
    langRef.current = lang;
  }, [lang]);

  const pushToast = React.useCallback((level: ToastNotice['level'], message: string) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev.slice(-3), { id, level, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  // Supabase Realtime ချိတ်ဆက်ခြင်း (WebSocket အစား)
  React.useEffect(() => {
    if (!token) {
      setConnectionState('disconnected');
      return;
    }

    setConnectionState('connecting');

    // Global Public Channel ဖန်တီးခြင်း
    const globalChannel = supabase.channel('vanguard-global');

    globalChannel
      .on('broadcast', { event: 'ping' }, () => {
        setPingMs(Math.floor(Math.random() * 20) + 20); // Dummy Ping for UI
      })
      .on('broadcast', { event: 'online-count' }, (payload) => {
        if (payload.count) setOnlineCount(payload.count);
      })
      .on('broadcast', { event: 'announcement' }, (payload) => {
        soundEngine.playNotify();
        setAnnouncement(payload.announcement as Announcement);
      })
      .on('presence', { event: 'sync' }, () => {
        const newState = globalChannel.presenceState();
        setOnlineCount(Object.keys(newState).length);
        // User Profile များကို Update လုပ်ရန် ဤနေရာတွင် ရေးနိုင်သည်
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionState('connected');
          // မိမိကိုယ်တိုင် Presence သို့ ဝင်ရောက်ခြင်း
          await globalChannel.track({
            online_at: new Date().toISOString(),
            status: 'lobby'
          });
        }
      });

    return () => {
      supabase.removeChannel(globalChannel);
      setConnectionState('disconnected');
    };
  }, [token, pushToast]);

  // Matchmaking (Queue) သို့ဝင်ရောက်ခြင်း
  const joinQueue = async (gameType: GameType, turnTimeLimit?: TurnTimeLimit, autoBotFill?: boolean) => {
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
    
    // မှတ်ချက်: Vercel ပေါ်တွင် Database Query ဖြင့် Matchmaking ကို ဆက်လက်ရေးသားရမည် (ဥပမာ - matchmaking_queue Table ထဲသို့ Insert လုပ်ခြင်း)
    pushToast('info', 'Searching for opponent...');
  };

  const leaveQueue = () => {
    setQueuedGame(null);
    setQueueStatus(null);
    setSakarQuickCount(0);
    pushToast('info', 'Left matchmaking queue.');
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
  };

  const leaveSakarQuick = () => leaveQueue();
  const startSakarQuickNow = () => pushToast('info', 'Starting match now...');

  const sendRoomChat = async (roomId: string, content: string) => {
    // Supabase DB (သို့) Realtime Broadcast သို့ ပို့ပေးရမည်
    pushToast('info', 'Room chat not yet implemented on Vercel.');
  };

  const sendChallenge = (targetUserId: string, gameType: GameType, bestOf: 3 | 5 = 3, turnTimeLimit?: TurnTimeLimit) => {
    pushToast('info', 'Challenge invitation sent.');
  };

  const respondChallenge = (inviteId: string, accept: boolean) => {
    setPendingChallenge(null);
  };

  const sendMove = async (matchId: string, payload: Record<string, unknown>) => {
    // သီးသန့် Match Channel သို့ Broadcast လုပ်ခြင်း (သို့) Database Update လုပ်ခြင်း
    const matchChannel = supabase.channel(`match-${matchId}`);
    matchChannel.send({
      type: 'broadcast',
      event: 'match:move',
      payload: payload
    });
  };

  const forfeitMatch = (matchId: string) => {
    pushToast('info', 'You forfeited the match.');
    setActiveMatch(null);
  };

  const sendMatchChat = (matchId: string, content: string, kind: 'text' | 'sticker' = 'text') => {
    const chatMsg: ChatMessage = {
      id: Date.now().toString(),
      matchId,
      senderId: 'me', // လက်ရှိ User ID ကို ထည့်ပါ
      content,
      isSticker: kind === 'sticker',
      timestamp: Date.now()
    };
    setMatchChat((prev) => [...prev, chatMsg]);
    // Supabase Channel မှတစ်ဆင့် ပြိုင်ဘက်ထံ ပို့ပေးရန်
  };

  const setAdminSocketMode = React.useCallback(
    (mode: 'admin' | 'lobby') => {
      console.log(`Switched to ${mode} mode`);
    },
    []
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
