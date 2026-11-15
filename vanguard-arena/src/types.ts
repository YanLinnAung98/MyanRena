import type { SakarRiddle } from './games/sakarHtar/riddles.ts';

export type { SakarRiddle };

export type GameType = 'connect4' | 'ttt' | 'rps' | 'sakar_htar';
export type GameMode = 'bot' | 'pvp' | 'matchmaking' | 'tournament' | 'custom_room';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type UserRole = 'user' | 'admin';
export type Language = 'en' | 'my';
export type TurnTimeLimit = 10 | 15 | 20 | 30;

export type RankTier =
  | 'Bronze'
  | 'Silver'
  | 'Gold'
  | 'Platinum'
  | 'Diamond'
  | 'Master'
  | 'Grandmaster'
  | 'Mythic';

export interface UserProfile {
  id: string;
  username: string;
  gameId: string;
  displayName: string;
  avatarUrl: string;
  frameId: string;
  xp: number;
  wins: number;
  losses: number;
  draws: number;
  role: UserRole;
  isBanned: boolean;
  warningCount: number;
  suspendedUntil: string | null;
  createdAt: string;
}

export interface OnlinePlayer {
  id: string;
  gameId: string;
  displayName: string;
  avatarUrl: string;
  frameId: string;
  xp: number;
  wins: number;
  losses: number;
  draws: number;
  status: 'online' | 'in_game' | 'queue';
  pingMs: number;
  deviceCount: number;
}

export interface ProfileFrame {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  unlockTier: RankTier | 'All';
  isActive: boolean;
  createdAt: string;
}

export interface FeatureLocks {
  connect4: boolean;
  ttt: boolean;
  rps: boolean;
  sakar_htar: boolean;
  matchmaking: boolean;
  chat: boolean;
  tournaments: boolean;
}

export interface MatchmakingSettings {
  maxSearchSeconds: number;
  botFillDelaySeconds: number;
  autoBotFillDefault: boolean;
}

export interface QueueStatus {
  gameType: GameType;
  joinedAt: number;
  elapsedSec: number;
  maxSearchSeconds: number;
  botFillDelaySeconds: number;
  autoBotFill: boolean;
  count: number;
}

export interface LandingGameContent {
  nameEn: string;
  nameMy: string;
  taglineEn: string;
  taglineMy: string;
  bannerUrl: string;
}

export interface LandingContent {
  heroTitleEn: string;
  heroTitleMy: string;
  heroSubtitleEn: string;
  heroSubtitleMy: string;
  heroBannerUrl: string;
  games: Record<GameType, LandingGameContent>;
  updatedAt: string;
}

export interface Connect4State {
  gameType: 'connect4';
  board: (0 | 1 | 2)[][];
  turn: 1 | 2;
  winner: 0 | 1 | 2 | 'draw';
  winLine: [number, number][] | null;
  lastMove: { row: number; col: number } | null;
}

export interface TTTState {
  gameType: 'ttt';
  board: (0 | 1 | 2)[];
  turn: 1 | 2;
  winner: 0 | 1 | 2 | 'draw';
  winLine: number[] | null;
  lastMove: number | null;
}

export type RPSChoice = 'rock' | 'paper' | 'scissors';

export interface RPSRoundRecord {
  round: number;
  p1Choice: RPSChoice;
  p2Choice: RPSChoice;
  winner: 1 | 2 | 'draw';
}

export interface RPSState {
  gameType: 'rps';
  bestOf: 1 | 3 | 5;
  currentRound: number;
  p1Score: number;
  p2Score: number;
  p1Submitted: boolean;
  p2Submitted: boolean;
  p1Choice?: RPSChoice | null;
  p2Choice?: RPSChoice | null;
  lastReveal: RPSRoundRecord | null;
  history: RPSRoundRecord[];
  winner: 0 | 1 | 2 | 'draw';
}

export interface SakarHtarPlayerAnswer {
  questionIndex: number;
  selectedIndex: number | null;
  isCorrect: boolean;
  points: number;
  timeMs: number;
}

export interface SakarHtarPlayerState {
  id: string;
  gameId: string;
  displayName: string;
  avatarUrl: string;
  frameId: string;
  xp: number;
  seatIndex: number;
  score: number;
  correctCount: number;
  streak: number;
  answeredCurrent: boolean;
  selectedOptionCurrent?: number | null;
  lastAnswerCorrect?: boolean | null;
  lastPointsEarned?: number;
  answers: SakarHtarPlayerAnswer[];
}

export interface SakarHtarQuestionView {
  id: string;
  questionMy: string;
  hintEn?: string;
  options: [string, string, string, string];
  correctIndex?: 0 | 1 | 2 | 3;
  explanationMy?: string;
  explanationEn?: string;
}

export interface SakarHtarState {
  gameType: 'sakar_htar';
  seatCapacity: number; // 1-6 solo/quick, 2-8 custom room
  totalQuestions: number; // 10
  questionIndex: number; // 0..9
  phase: 'question' | 'reveal' | 'finished';
  questionStartedAt: number;
  questionDeadline: number;
  revealDeadline: number | null;
  questions: SakarHtarQuestionView[];
  players: SakarHtarPlayerState[];
  winner: 0 | 1 | 2 | 'draw';
  turn?: 1 | 2;
}

export interface CustomRoomChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
}

export interface CustomRoom {
  id: string;
  code: string; // e.g. #SKH-4829
  title: string;
  gameType: 'sakar_htar';
  hostId: string;
  maxPlayers: number; // 2..8
  status: 'waiting' | 'in_game';
  activeMatchId: string | null;
  participants: MatchParticipant[];
  createdAt: string;
}

export type GameState = Connect4State | TTTState | RPSState | SakarHtarState;

export interface MatchParticipant {
  id: string;
  gameId: string;
  displayName: string;
  avatarUrl: string;
  frameId: string;
  xp: number;
  isBot?: boolean;
  pingMs?: number;
}

export interface MatchMoveLogEntry {
  step: number;
  playerId: string;
  playerName: string;
  summary: string;
  timestamp: string;
}

export interface ActiveMatch {
  id: string;
  gameType: GameType;
  mode: GameMode;
  difficulty?: Difficulty;
  player1: MatchParticipant;
  player2: MatchParticipant;
  participants?: MatchParticipant[];
  roomId?: string;
  state: GameState;
  status: 'active' | 'finished';
  winnerId: string | null;
  isDraw: boolean;
  turnTimeLimit: TurnTimeLimit;
  turnDeadline: number;
  graceDeadline: number | null;
  disconnectedPlayerId: string | null;
  tournamentId?: string;
  bracketMatchId?: string;
  xpAwarded?: { p1: number; p2: number; byUser?: Record<string, number> };
  moveLog?: MatchMoveLogEntry[];
}

export interface MatchHistoryRecord {
  id: string;
  gameType: GameType;
  mode: GameMode;
  player1Id: string;
  player2Id: string;
  player1Name: string;
  player2Name: string;
  winnerId: string | null;
  isDraw: boolean;
  createdAt: string;
  finishedAt: string | null;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  kind: 'text' | 'sticker';
  createdAt: string;
}

export interface FriendshipItem {
  id: string;
  user: OnlinePlayer | UserProfile;
  status: 'pending_incoming' | 'pending_outgoing' | 'accepted' | 'blocked';
  isOnline: boolean;
  playerStatus?: 'online' | 'in_game' | 'queue' | 'offline';
  pingMs?: number;
  unreadCount?: number;
}

export interface DirectMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  read: boolean;
  createdAt: string;
}

export interface BracketMatch {
  id: string;
  round: number;
  matchIndex: number;
  gameType: GameType;
  bestOf: 1 | 3 | 5;
  p1Score: number;
  p2Score: number;
  player1: MatchParticipant | null;
  player2: MatchParticipant | null;
  winnerId: string | null;
  liveMatchId: string | null;
  status: 'pending' | 'ready' | 'active' | 'completed';
}

export interface Tournament {
  id: string;
  title: string;
  gameType: GameType;
  includedGames: GameType[];
  maxPlayers: 4 | 8 | 16 | 32 | 64;
  roundsPerMatch: 1 | 3 | 5;
  turnTimeLimit: TurnTimeLimit;
  startMode: 'auto' | 'manual';
  status: 'draft' | 'registration' | 'live' | 'completed';
  startTime: string;
  participants: MatchParticipant[];
  rounds: BracketMatch[][];
  championId: string | null;
  createdAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  message: string;
  targetUserId: string | null;
  createdAt: string;
}

export interface ChallengeInvite {
  id: string;
  from: MatchParticipant;
  gameType: GameType;
  bestOf?: 1 | 3 | 5;
  turnTimeLimit?: TurnTimeLimit;
  createdAt: number;
}

export type ReportCategory =
  | 'toxic_chat'
  | 'cheating'
  | 'afk_stalling'
  | 'inappropriate_profile';

export interface PlayerReport {
  id: string;
  matchId: string;
  gameType: GameType;
  reporterId: string;
  reporterName: string;
  reportedId: string;
  reportedName: string;
  category: ReportCategory;
  notes: string;
  chatTranscript: ChatMessage[];
  moveHistory: MatchMoveLogEntry[];
  status: 'pending' | 'resolved';
  actionTaken: string | null;
  adminNotes: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface OfficialWarning {
  id: string;
  userId: string;
  reportId: string | null;
  reason: string;
  acknowledged: boolean;
  createdAt: string;
}

export interface AdminTelemetry {
  totalUsers: number;
  onlineUsers: number;
  activeDevices: number;
  activeMatches: number;
  queueSize: number;
  pendingReports: number;
  serverUptimeSec: number;
  memoryMb: number;
  serverStatus: 'healthy' | 'degraded';
}
