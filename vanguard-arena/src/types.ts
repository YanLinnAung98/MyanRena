export type Language = 'my' | 'en';
export type GameType = 'connect4' | 'tictactoe' | 'ttt' | 'rps' | 'sakarhtar' | 'sakar_htar';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type TurnTimeLimit = 10 | 15 | 20 | 30;
export type RankTier = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Master' | 'Grandmaster' | 'Mythic';

export interface PlayerGift {
  id: string;
  giftId: string;
  name: string;
  nameMy: string;
  iconId: 'dragon_cup' | 'mythic_crown' | 'diamond_relic' | 'cyber_medal' | 'vip_voucher';
  rarity: 'rare' | 'epic' | 'legendary' | 'mythic';
  tournamentId?: string;
  tournamentTitle?: string;
  placement?: '1st' | '2nd' | '3rd' | 'mvp' | 'special';
  bonusXp?: number;
  note?: string;
  awardedBy?: string;
  awardedAtMs: number;
}

export interface UserProfile {
  id: string;
  username: string;
  displayName: string;
  gameId: string;
  role?: 'user' | 'player' | 'admin';
  isAdmin?: boolean;
  isBanned?: boolean;
  avatarUrl?: string;
  frameId?: string;
  bannerId?: string;
  bannerUrl?: string;
  bio?: string;
  favoriteGame?: GameType;
  gender?: 'woman' | 'man' | 'non-binary' | 'self-describe' | 'prefer-not-to-say';
  ageRange?: 'under-16' | '16-17' | '18-24' | '25-34' | '35-plus' | '';
  /** Stable township ID from the Myanmar administrative directory. */
  city?: string;
  showCity?: boolean;
  /** Legacy profile fields retained for reading older player documents. */
  country?: string;
  showGender?: boolean;
  showAgeRange?: boolean;
  showCountry?: boolean;
  xp: number;
  rank?: string;
  wins?: number;
  losses?: number;
  draws?: number;
  friends?: string[];
  blocked?: string[];
  gifts?: PlayerGift[];
  unlockedFrames?: string[];
  unlockedBanners?: string[];
  online?: boolean;
  lastSeenMs?: number;
  updatedAtMs?: number;
  status?: 'active' | 'warned' | 'suspended' | 'banned';
  suspendedUntil?: string | null;
  createdAt?: string;
  [key: string]: any;
}

export interface TournamentMatchup {
  id: string;
  round: number;
  player1Id: string;
  player2Id?: string;
  matchId?: string;
  winnerId?: string;
  status: 'pending' | 'live' | 'finished';
}

export interface TournamentWinnerRecord {
  userId: string;
  displayName: string;
  gameId: string;
  placement: '1st' | '2nd' | '3rd' | 'mvp';
  giftName: string;
  giftIconId: PlayerGift['iconId'];
  bonusXp: number;
  awardedAtMs: number;
}

export interface Tournament {
  id: string;
  title: string;
  description?: string;
  rules?: string;
  gameType: GameType | string;
  bracketSize?: 8 | 16 | 32;
  maxPlayers?: number;
  roundsPerMatch?: number;
  turnTimeLimit?: TurnTimeLimit;
  startMode?: string;
  [key: string]: any;
  prizeXp?: number;
  prizeLabel?: string;
  minXpRequired?: number;
  scheduledAt?: string;
  featuredOnBillboard?: boolean;
  status: 'open' | 'ongoing' | 'completed';
  participants: any[];
  matchups?: TournamentMatchup[];
  winners?: TournamentWinnerRecord[];
  createdAtMs?: number;
  createdAt?: string;
}

export interface LandingContent {
  heroTitleMy?: string;
  heroTitleEn?: string;
  heroSubtitleMy?: string;
  heroSubtitleEn?: string;
  [key: string]: any;
}

export interface MatchParticipant {
  id: string;
  gameId?: string;
  username?: string;
  displayName: string;
  avatarUrl?: string;
  frameId?: string;
  xp: number;
  rank?: string;
  pingMs?: number;
  isBot?: boolean;
  role?: 'user' | 'player' | 'admin';
  [key: string]: any;
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
  gameType: 'ttt' | 'tictactoe';
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
  p1Choice: RPSChoice | null;
  p2Choice: RPSChoice | null;
  lastReveal: RPSRoundRecord | null;
  history: RPSRoundRecord[];
  winner: 0 | 1 | 2 | 'draw';
}

export interface SakarRiddle {
  id: string;
  questionMy: string;
  hintEn?: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
  explanationMy: string;
  explanationEn: string;
  isCustom?: boolean;
}

export interface SakarHtarAnswerRecord {
  questionIndex: number;
  selectedIndex: number | null;
  isCorrect: boolean;
  points: number;
  timeMs: number;
}

export interface SakarHtarPlayerState extends MatchParticipant {
  seatIndex: number;
  score: number;
  correctCount: number;
  streak: number;
  answeredCurrent: boolean;
  selectedOptionCurrent: number | null;
  lastAnswerCorrect: boolean | null;
  lastPointsEarned: number;
  answers: SakarHtarAnswerRecord[];
}

export interface SakarHtarQuestion {
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
  seatCapacity: number;
  totalQuestions: number;
  questionIndex: number;
  phase: 'question' | 'reveal' | 'finished';
  questionStartedAt: number;
  questionDeadline: number;
  revealDeadline: number | null;
  questions: SakarHtarQuestion[];
  players: SakarHtarPlayerState[];
  winner: 0 | 1 | 2 | 'draw';
}

export type GameState = Connect4State | TTTState | RPSState | SakarHtarState;

export interface QueueStatus {
  gameType: GameType;
  maxSearchSeconds: number;
  elapsedSec: number;
  botFillDelaySeconds: number;
  count: number;
  autoBotFill: boolean;
}

export interface ProfileFrame {
  id: string;
  name: string;
  nameMy?: string;
  imageUrl?: string;
  badgeIcon?: string;
  minXp?: number;
  unlockTier?: string;
  [key: string]: any;
}

export interface CustomRoom {
  id: string;
  code: string;
  gameType: GameType | string;
  title?: string;
  hostId: string;
  maxPlayers: number;
  participants: MatchParticipant[];
  players?: MatchParticipant[];
  status: 'waiting' | 'playing' | 'in_game' | 'finished' | string;
  activeMatchId?: string | null;
  [key: string]: any;
}

export interface ActiveMatch {
  id: string;
  gameType: GameType;
  state: GameState;
  player1: MatchParticipant;
  player2: MatchParticipant;
  participants?: MatchParticipant[];
  status: 'active' | 'finished' | string;
  mode?: string;
  moveLog?: MatchMoveLogEntry[];
  [key: string]: any;
}

export type Announcement = any;
export type BracketMatch = any;
export type ChatMessage = any;
export type CustomRoomChatMessage = any;
export type FeatureLocks = any;
export type GameMode = string;
export type MatchmakingSettings = any;
export type MatchMoveLogEntry = any;
export type OfficialWarning = any;
export type OnlinePlayer = any;
export type PlayerReport = any;
export type ReportCategory = any;
