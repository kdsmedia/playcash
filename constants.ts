

import { SymbolDef, SymbolType, ProbabilityWeights, RTPMode, Achievement, LeaderboardEntry, ShopItem, WheelSegment } from './types';

// Game Configuration
export const REEL_COUNT = 5;
export const ROW_COUNT = 4; // Visible rows
export const MIN_BET = 10;
export const MAX_BET = 200;
export const BET_STEP = 10;
export const MULTIPLIER_LEVELS = [1, 2, 3, 5];
export const MAX_ADS = 20;
export const AD_REWARD = 50;
export const AD_DURATION = 20; 

// Symbol Definitions
export const SYMBOLS: SymbolDef[] = [
  { id: 'S_A', name: '🀄', value: 0.05, type: SymbolType.LOW, color: 'bg-slate-200', textColor: 'text-green-700' },
  { id: 'S_B', name: '🀐', value: 0.05, type: SymbolType.LOW, color: 'bg-slate-200', textColor: 'text-blue-700' },
  { id: 'S_C', name: '🀙', value: 0.05, type: SymbolType.LOW, color: 'bg-slate-200', textColor: 'text-red-600' },
  { id: 'S_D', name: '🀇', value: 0.1, type: SymbolType.LOW, color: 'bg-slate-200', textColor: 'text-orange-600' },
  { id: 'S_E', name: '🀅', value: 0.2, type: SymbolType.HIGH, color: 'bg-emerald-100', textColor: 'text-green-600' },
  { id: 'S_F', name: '🀁', value: 0.4, type: SymbolType.HIGH, color: 'bg-blue-100', textColor: 'text-blue-600' },
  { id: 'S_G', name: '🀂', value: 0.8, type: SymbolType.HIGH, color: 'bg-yellow-100', textColor: 'text-yellow-700' },
  { id: 'S_H', name: '🀃', value: 1.5, type: SymbolType.HIGH, color: 'bg-red-100', textColor: 'text-red-700' },
  { id: 'WILD', name: 'WILD', value: 0, type: SymbolType.WILD, color: 'bg-yellow-500', textColor: 'text-yellow-900' },
  { id: 'SCATTER', name: '夺', value: 0, type: SymbolType.SCATTER, color: 'bg-red-600', textColor: 'text-gold' },
];

export const SYMBOL_MAP = SYMBOLS.reduce((acc, s) => {
  acc[s.id] = s;
  return acc;
}, {} as Record<string, SymbolDef>);

// Probabilities Configuration
export const RTP_CONFIG: Record<RTPMode, ProbabilityWeights> = {
    // RUNGKAD (Mode Aman Admin): Hampir mustahil menang besar. 
    RUNGKAD: {
        LOW: 98,
        HIGH: 1.5,
        WILD: 0.4,
        SCATTER: 0.1
    },
    // NORMAL (Mode Standar): Volatilitas tinggi, jarang menang tapi ada potensi.
    NORMAL: {
        LOW: 92,
        HIGH: 6,
        WILD: 1.5,
        SCATTER: 0.5
    },
    // GACOR (Mode Pancingan): Diberikan sedikit 'nafas' tapi tetap dikontrol.
    GACOR: {
        LOW: 75,
        HIGH: 15,
        WILD: 8,
        SCATTER: 2
    }
};

export const WEIGHTS = RTP_CONFIG.NORMAL;

// --- NEW CONSTANTS FOR FEATURES ---

export const ACHIEVEMENTS: Achievement[] = [
    { id: 'SPIN_50', title: 'Pemanasan', description: 'Lakukan 50x Putaran', target: 50, reward: 1000, type: 'SPIN_COUNT' },
    { id: 'SPIN_200', title: 'Slot Maniac', description: 'Lakukan 200x Putaran', target: 200, reward: 5000, type: 'SPIN_COUNT' },
    { id: 'SCATTER_5', title: 'Bonus Hunter', description: 'Dapatkan 5x Fitur Scatter', target: 5, reward: 10000, type: 'SCATTER_COUNT' },
    { id: 'WIN_100K', title: 'Big Winner', description: 'Total Kemenangan 100.000', target: 100000, reward: 25000, type: 'TOTAL_WIN' },
    { id: 'WIN_1M', title: 'Sultan Slot', description: 'Total Kemenangan 1.000.000', target: 1000000, reward: 100000, type: 'TOTAL_WIN' },
];

export const FAKE_LEADERBOARD: LeaderboardEntry[] = [
    { id: 'bot1', name: 'BudiSultan88', score: 12500000, rank: 1 },
    { id: 'bot2', name: 'DewiSlotGacor', score: 9800000, rank: 2 },
    { id: 'bot3', name: 'RajaMaxwin', score: 8500000, rank: 3 },
    { id: 'bot4', name: 'HokiTerus', score: 5200000, rank: 4 },
    { id: 'bot5', name: 'AntiRungkad', score: 4100000, rank: 5 },
    { id: 'bot6', name: 'SpinMaster', score: 3500000, rank: 6 },
    { id: 'bot7', name: 'SlotLover', score: 2800000, rank: 7 },
    { id: 'bot8', name: 'CuanEveryday', score: 1900000, rank: 8 },
    { id: 'bot9', name: 'PejuangRupiah', score: 1200000, rank: 9 },
    { id: 'bot10', name: 'ModalReceh', score: 900000, rank: 10 },
];

export const FAKE_WINNERS = [
    "Budi88 baru saja memenangkan 500.000!",
    "Santi_Slot mendapatkan Scatter!",
    "User9928 menang BIG WIN 1.200.000!",
    "Rizky_Gacor memicu 10 Free Spins!",
    "Dewi_Hoki menarik saldo 5.000.000!",
    "SlotKing mendapatkan Jackpot Mini!",
    "Andi_Cuan baru saja deposit 100.000",
    "MaxwinHunter menang 300.000 dari Scatter",
    "PejuangSlot menang SUPER WIN 2.500.000!"
];

export const SHOP_ITEMS: ShopItem[] = [
    // THEMES
    { id: 'THEME_CLASSIC', name: 'Classic Red', type: 'THEME', price: 0, description: 'Tema klasik original PlayCash.', previewColor: '#660708' },
    { id: 'THEME_OCEAN', name: 'Ocean Blue', type: 'THEME', price: 25000, description: 'Suasana laut yang tenang dan menyegarkan.', previewColor: '#1e3a8a' },
    { id: 'THEME_CYBER', name: 'Cyber Neon', type: 'THEME', price: 50000, description: 'Gaya futuristik dengan lampu neon.', previewColor: '#581c87' },
    { id: 'THEME_GOLD', name: 'Royal Gold', type: 'THEME', price: 100000, description: 'Kemewahan emas untuk para Sultan.', previewColor: '#854d0e' },
    
    // FRAMES
    { id: 'FRAME_DEFAULT', name: 'Standard', type: 'FRAME', price: 0, description: 'Bingkai standar.', assetUrl: 'border-white' },
    { id: 'FRAME_GOLD', name: 'Golden Ring', type: 'FRAME', price: 15000, description: 'Bingkai emas berkilau.', assetUrl: 'border-yellow-400 ring-2 ring-yellow-200' },
    { id: 'FRAME_NEON', name: 'Neon Pulse', type: 'FRAME', price: 30000, description: 'Efek neon berdenyut.', assetUrl: 'border-cyan-400 shadow-[0_0_10px_cyan]' },
    { id: 'FRAME_FIRE', name: 'Fire Aura', type: 'FRAME', price: 75000, description: 'Aura api membara.', assetUrl: 'border-red-500 shadow-[0_0_15px_red]' },
];

export const WHEEL_SEGMENTS: WheelSegment[] = [
    { label: 'ZONK', value: 0, color: '#4b5563', weight: 60 }, // 60% Chance
    { label: '500', value: 500, color: '#f59e0b', weight: 25 }, // 25% Chance
    { label: '1000', value: 1000, color: '#3b82f6', weight: 10 }, // 10% Chance
    { label: '200', value: 200, color: '#f59e0b', weight: 4.5 }, // 4.5% Chance
    { label: '5000', value: 5000, color: '#8b5cf6', weight: 0.4 }, // 0.4% Chance
    { label: 'ZONK', value: 0, color: '#4b5563', weight: 0 }, // Duplicate visual, handled by weight logic
    { label: 'JACKPOT', value: 50000, color: '#ef4444', weight: 0.01 }, // 0.01% Chance (Very Hard)
    { label: '2500', value: 2500, color: '#10b981', weight: 0.09 }, // 0.09% Chance
];

export const CHECK_IN_REWARDS = [
    { day: 1, amount: 100 },
    { day: 2, amount: 250 },
    { day: 3, amount: 500 },
    { day: 4, amount: 1000 },
    { day: 5, amount: 2500 },
    { day: 6, amount: 5000 },
    { day: 7, amount: 10000 },
];

export const PIGGY_BANK_RATE = 0.1; // 10% of bet goes to piggy bank (simulated accumulation)
export const PIGGY_BREAK_COST = 2000; // Cost to break the bank
export const REBATE_RATES = {
    BRONZE: 0.001, // 0.1%
    SILVER: 0.002, // 0.2%
    GOLD: 0.003, // 0.3%
    PLATINUM: 0.005, // 0.5%
    DIAMOND: 0.008 // 0.8%
};