import { useEffect, useState, useCallback } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  limit,
  updateDoc,
  arrayUnion,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase';
import {
  PlayerProfile,
  ServerConfig,
  GameRoom,
  TournamentEvent,
  PlayerReport,
  RiddleItem,
} from '../services/myanRenaEngine';

const DEFAULT_SERVER_CONFIG: ServerConfig = {
  maintenance: false,
  announcement: 'Vanguard Arena (MyanRena) မှ ကြိုဆိုပါတယ်!',
  matchmakingTimeoutSec: 30,
  lockedGames: {
    connect4: false,
    tictactoe: false,
    rps: false,
    sakarhtar: false,
  },
  landingTitle: 'VANGUARD ARENA (MYANRENA)',
  landingSubtitle: 'မြန်မာ့အဆင့်မြင့် Real-Time Multiplayer နှင့် စကားထာပြိုင်ပွဲ',
};

export function useArenaSocket(currentUser: PlayerProfile | null) {
  const [connected, setConnected] = useState<boolean>(true);
  const [serverConfig, setServerConfig] = useState<ServerConfig>(DEFAULT_SERVER_CONFIG);
  const [leaderboard, setLeaderboard] = useState<PlayerProfile[]>([]);
  const [activeRoom, setActiveRoom] = useState<GameRoom | null>(null);
  const [tournaments, setTournaments] = useState<TournamentEvent[]>([]);
  const [reports, setReports] = useState<PlayerReport[]>([]);
  const [riddles, setRiddles] = useState<RiddleItem[]>([]);

  useEffect(() => {
    if (!isFirebaseConfigured || !db) {
      setConnected(true);
      return;
    }

    // 1. Live Server Controls & Feature Locks
    const unsubConfig = onSnapshot(doc(db, 'system', 'config'), (snap) => {
      if (snap.exists()) {
        setServerConfig({ ...DEFAULT_SERVER_CONFIG, ...(snap.data() as ServerConfig) });
      }
    });

    // 2. Real-time Leaderboard (Top 50 by XP)
    const qUsers = query(collection(db, 'users'), orderBy('xp', 'desc'), limit(50));
    const unsubUsers = onSnapshot(qUsers, (snap) => {
      const list: PlayerProfile[] = [];
      snap.forEach((d) => list.push(d.data() as PlayerProfile));
      setLeaderboard(list);
    });

    // 3. Live Tournaments (8 / 16 / 32 Brackets)
    const unsubTourneys = onSnapshot(collection(db, 'tournaments'), (snap) => {
      const list: TournamentEvent[] = [];
      snap.forEach((d) => list.push(d.data() as TournamentEvent));
      setTournaments(list);
    });

    // 4. Custom Riddles (Sakar-Htar)
    const unsubRiddles = onSnapshot(collection(db, 'riddles'), (snap) => {
      const list: RiddleItem[] = [];
      snap.forEach((d) => list.push(d.data() as RiddleItem));
      setRiddles(list);
    });

    // 5. Player Reports (Admin Only)
    let unsubReports = () => {};
    if (currentUser?.isAdmin) {
      unsubReports = onSnapshot(collection(db, 'reports'), (snap) => {
        const list: PlayerReport[] = [];
        snap.forEach((d) => list.push(d.data() as PlayerReport));
        setReports(list);
      });
    }

    return () => {
      unsubConfig();
      unsubUsers();
      unsubTourneys();
      unsubRiddles();
      unsubReports();
    };
  }, [currentUser?.uid, currentUser?.isAdmin]);

  // Subscribe to Active Match Room in Real-time
  const subscribeRoom = useCallback((roomId: string | null) => {
    if (!roomId || !isFirebaseConfigured || !db) {
      setActiveRoom(null);
      return () => {};
    }
    return onSnapshot(doc(db, 'rooms', roomId), (snap) => {
      if (snap.exists()) {
        setActiveRoom(snap.data() as GameRoom);
      } else {
        setActiveRoom(null);
      }
    });
  }, []);

  // In-Match Chat Sender
  const sendRoomChat = useCallback(
    async (roomId: string, text: string) => {
      if (!currentUser || !text.trim() || !isFirebaseConfigured || !db) return;
      await updateDoc(doc(db, 'rooms', roomId), {
        chat: arrayUnion({
          sender: currentUser.displayName,
          text: text.trim(),
          time: Date.now(),
        }),
      });
    },
    [currentUser]
  );

  return {
    connected,
    serverConfig,
    leaderboard,
    activeRoom,
    setActiveRoom,
    subscribeRoom,
    sendRoomChat,
    tournaments,
    reports,
    riddles,
  };
}
