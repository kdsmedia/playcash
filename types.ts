

export enum SymbolType {
  LOW = 'LOW',
  HIGH = 'HIGH',
  WILD = 'WILD',
  SCATTER = 'SCATTER'
}

export interface SymbolDef {
  id: string;
  name: string;
  value: number; // Base multiplier value
  type: SymbolType;
  color: string;
  textColor: string;
  imgSrc?: string; // Optional if we want to use specific images
}

export interface TileData {
  id: string; // Unique ID for React keys
  symbolId: string;
  isWinning?: boolean;
  isNew?: boolean;
}

export type GridState = TileData[][]; // 5 Columns, each containing N rows

export interface WinResult {
  totalWin: number;
  winningTileIds: Set<string>;
  winDetails: {
    symbolId: string;
    count: number;
    winAmount: number;
  }[];
}

export interface GameState {
  balance: number;
  bet: number;
  currentWin: number; // Total win for the current spin session
  multiplier: number; // 1, 2, 3, 5
  isSpinning: boolean;
  isTumbling: boolean;
  freeSpinsLeft: number;
  adWatchCount: number;
}

export interface BonusCode {
    code: string;
    amount: number;
    expires: number;
}

export type RTPMode = 'RUNGKAD' | 'NORMAL' | 'GACOR';

export interface ProbabilityWeights {
    LOW: number;
    HIGH: number;
    WILD: number;
    SCATTER: number;
}

export interface Transaction {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAW' | 'BONUS' | 'DAILY_LOGIN' | 'AD_REWARD' | 'TARGET_REWARD' | 'ACHIEVEMENT_REWARD' | 'JACKPOT' | 'LUCKY_WHEEL' | 'REFERRAL_BONUS' | 'SHOP_PURCHASE' | 'GAMBLE_WIN' | 'PIGGY_BREAK' | 'REBATE_CLAIM';
  amount: number;
  date: string;
  displayDate: string;
  status: 'SUCCESS' | 'PENDING' | 'REJECTED';
  details?: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  target: number;
  reward: number;
  type: 'SPIN_COUNT' | 'TOTAL_WIN' | 'SCATTER_COUNT';
}

export interface LeaderboardEntry {
  id: string;
  name: string;
  score: number; // Total Win or XP
  rank: number;
  isUser?: boolean;
}

export interface ShopItem {
  id: string;
  name: string;
  type: 'THEME' | 'FRAME';
  price: number;
  previewColor?: string;
  assetUrl?: string; // For frames, maybe a CSS class or image URL
  description: string;
}

export interface BetLog {
  id: string;
  timestamp: string;
  bet: number;
  win: number;
  multiplier: number;
  result: 'WIN' | 'LOSS';
}

export interface UserNotification {
  id: string;
  title: string;
  message: string;
  date: string;
  isRead: boolean;
  type: 'INFO' | 'BONUS' | 'SYSTEM';
}

export interface GlobalConfig {
  maintenanceMode: boolean;
  announcement: string;
}

export interface WheelSegment {
    label: string;
    value: number;
    color: string;
    weight: number; // Probability weight (higher = more frequent)
}

export interface ExtendedGameState extends GameState {
  totalLifetimeWin: number;
  totalLifetimeDeposit: number;
  totalLifetimeBet: number; // For Rebate Calculation
  claimedCodes: string[];
  lastDailyClaim: number;
  dailyDepositTotal: number;
  lastDailyResetTime: number;
  claimedDailyTargets: number[];
  
  // Achievement Progress
  achievedIds: string[];
  progressSpinCount: number;
  progressScatterCount: number;

  // New Features
  lastLuckySpinTime: number;
  referralCode: string;
  referralCount: number;
  hasRedeemedReferral: boolean;
  
  // Shop
  ownedItemIds: string[];
  equippedThemeId: string;
  equippedFrameId: string;

  // Logs & Streak
  checkInStreak: number;
  lastCheckInDate: number; // Timestamp of last check-in (midnight)
  
  notifications: UserNotification[];

  // Piggy Bank & Rebate
  piggyBankBalance: number;
  rebateBalance: number;
  lastRebateClaimTime: number;
}