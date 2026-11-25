export type Language = 'my' | 'en';
export type GameType = 'connect4' | 'tictactoe' | 'rps' | 'sakarhtar';
export type Difficulty = 'easy' | 'medium' | 'hard';
export type TurnTimeLimit = 15 | 20 | 30;

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
  avatarUrl?: string;
  frameId?: string;
  bannerId?: string;
  bannerUrl?: string;
  bio?: string;
  favoriteGame?: GameType;
  gender?: 'woman' | 'man' | 'non-binary' | 'self-describe' | 'prefer-not-to-say';
  ageRange?: 'under-16' | '16-17' | '18-24' | '25-34' | '35-plus' | '';
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
  suspendedUntil?: string;
  createdAt?: string;
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
  bracketSize: 8 | 16 | 32;
  prizeXp: number;
  prizeLabel?: string;
  minXpRequired?: number;
  scheduledAt?: string;
  featuredOnBillboard?: boolean;
  status: 'open' | 'ongoing' | 'completed';
  participants: string[];
  matchups?: TournamentMatchup[];
  winners?: TournamentWinnerRecord[];
  createdAtMs: number;
  createdAt?: string;
}

export interface LandingContent {
  heroTitleMy?: string;
  heroTitleEn?: string;
  heroSubtitleMy?: string;
  heroSubtitleEn?: string;
  [key: string]: any;
}
