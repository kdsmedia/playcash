

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { generateGrid, calculateWin, processTumble, countScatters } from './utils/gameLogic';
import { GameState, GridState, BonusCode, RTPMode, Transaction, ExtendedGameState, Achievement, ShopItem, BetLog, UserNotification, GlobalConfig } from './types';
import { MIN_BET, MAX_BET, MULTIPLIER_LEVELS, MAX_ADS, AD_REWARD, BET_STEP, RTP_CONFIG, ACHIEVEMENTS, FAKE_LEADERBOARD, FAKE_WINNERS, SHOP_ITEMS, WHEEL_SEGMENTS, CHECK_IN_REWARDS, PIGGY_BANK_RATE, PIGGY_BREAK_COST, REBATE_RATES, AD_DURATION } from './constants';
import { SlotReel } from './components/SlotReel';
import { 
  X, MessageCircle, ArrowUpCircle, ArrowDownCircle, 
  Info, Shield, FileText, Wallet, Clock, User, History, Crown, ShoppingCart, Gift,
  Menu, Minus, Plus, Square, RotateCw, Zap, Video, LogOut, LayoutDashboard, CheckCircle, XCircle, PlayCircle, Calendar, Music, Volume2, VolumeX, Loader2, Target, Sliders, Trophy, Medal, BarChart3, Coins, Star, Palette, Share2, Disc, Bell, Power, Send, TrendingUp, TrendingDown, DollarSign, PiggyBank, Percent, AlertTriangle
} from 'lucide-react';
import { auth } from './firebaseConfig';
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

// Initial default codes
const DEFAULT_ADMIN_CODES: BonusCode[] = [
    { code: 'MAHJONGWIN', amount: 50000, expires: Date.now() + 86400000 },
    { code: 'GACOR2024', amount: 20000, expires: Date.now() + 86400000 },
    { code: 'JPMAXWIN', amount: 100000, expires: Date.now() + 86400000 }
];

const ADMIN_EMAIL = 'appsidhanie@gmail.com';

const App: React.FC = () => {
  // --- AUTH STATE ---
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // --- GLOBAL CONFIG STATE (MAINTENANCE) ---
  const [globalConfig, setGlobalConfig] = useState<GlobalConfig>({ maintenanceMode: false, announcement: '' });

  // --- RTP STATE (ADMIN SETTING) ---
  const [rtpMode, setRtpMode] = useState<RTPMode>('NORMAL');

  // --- JACKPOT STATE ---
  const [jackpotValue, setJackpotValue] = useState(15420500); // Starting Mock Value

  // --- TICKER STATE ---
  const [tickerIndex, setTickerIndex] = useState(0);

  // --- GAME STATE ---
  
  // 1. Initialize State from LocalStorage or Default
  const getStorageKey = (key: string) => {
      if (!user) return `playcash_guest_${key}`;
      return `playcash_${user.uid}_${key}`;
  };

  const [state, setState] = useState<ExtendedGameState>({
      balance: 0,
      bet: MIN_BET,
      currentWin: 0,
      multiplier: 1,
      isSpinning: false,
      isTumbling: false,
      freeSpinsLeft: 0,
      adWatchCount: 0,
      totalLifetimeWin: 0,
      totalLifetimeDeposit: 0,
      totalLifetimeBet: 0,
      claimedCodes: [],
      lastDailyClaim: 0,
      dailyDepositTotal: 0,
      lastDailyResetTime: Date.now(),
      claimedDailyTargets: [],
      // New Achievement States
      achievedIds: [],
      progressSpinCount: 0,
      progressScatterCount: 0,
      // New Feature States
      lastLuckySpinTime: 0,
      referralCode: '',
      referralCount: 0,
      hasRedeemedReferral: false,
      ownedItemIds: ['THEME_CLASSIC', 'FRAME_DEFAULT'],
      equippedThemeId: 'THEME_CLASSIC',
      equippedFrameId: 'FRAME_DEFAULT',
      // Check In & Logs
      checkInStreak: 0,
      lastCheckInDate: 0,
      notifications: [],
      piggyBankBalance: 0,
      rebateBalance: 0,
      lastRebateClaimTime: Date.now(),
  });

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [betLogs, setBetLogs] = useState<BetLog[]>([]);

  const [withdrawalAccount, setWithdrawalAccount] = useState<{
    method: string;
    number: string;
    name: string;
  } | null>(null);

  // Session Stats for Live RTP
  const [sessionStats, setSessionStats] = useState({ totalBet: 0, totalWon: 0 });

  // Load User Data
  useEffect(() => {
      const loadData = () => {
          const stateKey = getStorageKey('state');
          const txKey = getStorageKey('transactions');
          const accKey = getStorageKey('account');
          const logsKey = getStorageKey('betlogs');

          const savedState = localStorage.getItem(stateKey);
          if (savedState) {
              const parsed = JSON.parse(savedState);
              // Merge with default to ensure new fields exists
              setState(prev => ({
                  ...prev,
                  ...parsed,
                  ownedItemIds: parsed.ownedItemIds || ['THEME_CLASSIC', 'FRAME_DEFAULT'],
                  equippedThemeId: parsed.equippedThemeId || 'THEME_CLASSIC',
                  equippedFrameId: parsed.equippedFrameId || 'FRAME_DEFAULT',
                  notifications: parsed.notifications || [],
                  piggyBankBalance: parsed.piggyBankBalance || 0,
                  rebateBalance: parsed.rebateBalance || 0,
                  totalLifetimeBet: parsed.totalLifetimeBet || 0
              }));
          } else {
               // Generate Random Referral Code if new
               const randomRef = 'REF' + Math.floor(Math.random() * 90000 + 10000);
               setState(prev => ({ ...prev, referralCode: randomRef }));
          }

          const savedTx = localStorage.getItem(txKey);
          setTransactions(savedTx ? JSON.parse(savedTx) : []);

          const savedAcc = localStorage.getItem(accKey);
          setWithdrawalAccount(savedAcc ? JSON.parse(savedAcc) : null);

          const savedLogs = localStorage.getItem(logsKey);
          setBetLogs(savedLogs ? JSON.parse(savedLogs) : []);
      };

      if (!isAuthLoading) {
          loadData();
      }
  }, [user, isAuthLoading]);

  // Load Admin Settings (RTP & Global Config)
  useEffect(() => {
      const savedRtp = localStorage.getItem('playcash_admin_rtp');
      if (savedRtp) setRtpMode(savedRtp as RTPMode);

      const savedConfig = localStorage.getItem('playcash_global_config');
      if (savedConfig) setGlobalConfig(JSON.parse(savedConfig));
  }, []);

  useEffect(() => {
      localStorage.setItem('playcash_admin_rtp', rtpMode);
  }, [rtpMode]);

  useEffect(() => {
      localStorage.setItem('playcash_global_config', JSON.stringify(globalConfig));
  }, [globalConfig]);


  // Daily Reset
  useEffect(() => {
      if (!state.lastDailyResetTime) return;
      const now = new Date();
      const lastReset = new Date(state.lastDailyResetTime);
      if (now.getDate() !== lastReset.getDate() || now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear()) {
          setState(prev => ({
              ...prev, dailyDepositTotal: 0, claimedDailyTargets: [], lastDailyResetTime: Date.now()
          }));
      }
  }, [state.lastDailyResetTime, isAuthLoading]);

  // Persist State
  useEffect(() => {
      if (!isAuthLoading) {
          localStorage.setItem(getStorageKey('state'), JSON.stringify(state));
      }
  }, [state, user, isAuthLoading]);

  useEffect(() => {
      if (!isAuthLoading) {
          localStorage.setItem(getStorageKey('transactions'), JSON.stringify(transactions));
      }
  }, [transactions, user, isAuthLoading]);

  useEffect(() => {
      if (!isAuthLoading && withdrawalAccount) {
          localStorage.setItem(getStorageKey('account'), JSON.stringify(withdrawalAccount));
      }
  }, [withdrawalAccount, user, isAuthLoading]);
  
  useEffect(() => {
      if (!isAuthLoading) {
          localStorage.setItem(getStorageKey('betlogs'), JSON.stringify(betLogs));
      }
  }, [betLogs, user, isAuthLoading]);

  // Admin Codes
  const [adminCodes, setAdminCodes] = useState<BonusCode[]>(() => {
      const saved = localStorage.getItem('playcash_admin_codes');
      return saved ? JSON.parse(saved) : DEFAULT_ADMIN_CODES;
  });

  useEffect(() => {
      localStorage.setItem('playcash_admin_codes', JSON.stringify(adminCodes));
  }, [adminCodes]);

  // --- FEATURE EFFECTS ---
  
  // Jackpot Ticker
  useEffect(() => {
      const interval = setInterval(() => {
          setJackpotValue(prev => prev + Math.floor(Math.random() * 50));
      }, 3000);
      return () => clearInterval(interval);
  }, []);

  // Winners Ticker
  useEffect(() => {
      const interval = setInterval(() => {
          setTickerIndex(prev => (prev + 1) % FAKE_WINNERS.length);
      }, 5000);
      return () => clearInterval(interval);
  }, []);

  const [grid, setGrid] = useState<GridState>(generateGrid(RTP_CONFIG['NORMAL']));
  const [message, setMessage] = useState("PLAYCASH");
  const [isTurbo, setIsTurbo] = useState(false);
  const [autoSpinCount, setAutoSpinCount] = useState(0);
  const [isAutoMenuOpen, setIsAutoMenuOpen] = useState(false);

  // Menu States
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);
  const [transactionAmount, setTransactionAmount] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [bonusCodeInput, setBonusCodeInput] = useState('');
  const [referralInput, setReferralInput] = useState('');
  
  // Admin State
  const [newVoucherCode, setNewVoucherCode] = useState('');
  const [newVoucherAmount, setNewVoucherAmount] = useState('');
  const [broadcastMsg, setBroadcastMsg] = useState('');
  const [godModeBalance, setGodModeBalance] = useState('');

  // Timers
  const [paymentTimer, setPaymentTimer] = useState<number>(0);
  const paymentTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [isVerifyingPayment, setIsVerifyingPayment] = useState(false);
  
  // AD STATES
  const [isAdPlaying, setIsAdPlaying] = useState(false);
  const [adTimer, setAdTimer] = useState(0);
  const [adRewardType, setAdRewardType] = useState<'STANDARD' | 'DOUBLE_WIN' | 'SKIP_LUCKY_WAIT' | 'RESCUE_FUND'>('STANDARD');
  const [pendingAdContext, setPendingAdContext] = useState<any>(null); // To store win amount for double win, etc.

  // Lucky Wheel State
  const [isWheelSpinning, setIsWheelSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);

  // Gamble State
  const [isGambleOpen, setIsGambleOpen] = useState(false);
  const [gambleAmount, setGambleAmount] = useState(0);

  const [tempBindData, setTempBindData] = useState({ method: 'DANA', number: '', name: '' });
  const [showFreeSpinPopup, setShowFreeSpinPopup] = useState(false);
  const [freeSpinsWon, setFreeSpinsWon] = useState(0);
  const [showSplash, setShowSplash] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);

  // New Feature States
  const [showDoubleWinBtn, setShowDoubleWinBtn] = useState(false);
  const [tempWinAmount, setTempWinAmount] = useState(0);
  const [showRescueModal, setShowRescueModal] = useState(false);

  // Audio
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isMusicPlayingRef = useRef(isMusicPlaying);

  const WITHDRAWAL_FEE = 2500;
  const WITHDRAWAL_OPTIONS = [30000, 50000, 100000, 200000];
  const DEPOSIT_OPTIONS = [10000, 20000, 30000, 40000, 50000, 60000, 70000, 80000, 90000, 100000];
  const AUTO_SPIN_OPTIONS = [10, 20, 30, 50, 100];
  const BUY_FEATURE_COST_MULTIPLIER = 500;
  const DAILY_COOLDOWN = 24 * 60 * 60 * 1000;

  // --- FINANCIAL STATS (For Logic) ---
  const totalDeposits = transactions.filter(t => t.type === 'DEPOSIT' && t.status === 'SUCCESS').reduce((acc, t) => acc + t.amount, 0);
  const totalWithdrawals = transactions.filter(t => t.type === 'WITHDRAW' && t.status === 'SUCCESS').reduce((acc, t) => acc + t.amount, 0);
  const netProfit = totalDeposits - totalWithdrawals;
  
  // New helper to handle "Rescue Fund" check
  const checkRescueFund = useCallback(() => {
      if (state.balance < MIN_BET && state.balance < 100 && state.currentWin === 0 && !state.isSpinning) {
          setShowRescueModal(true);
      } else {
          setShowRescueModal(false);
      }
  }, [state.balance, state.isSpinning, state.currentWin]);

  useEffect(() => {
      checkRescueFund();
  }, [state.balance, checkRescueFund]);

  const playSound = (type: 'spin' | 'win' | 'scatter' | 'click' | 'jackpot' | 'coins') => {
    if (!isMusicPlayingRef.current) return;
    let src = '';
    switch (type) {
        case 'spin': src = '/sound/spin.mp3'; break;
        case 'win': src = '/sound/win.mp3'; break;
        case 'scatter': src = '/sound/scatter.mp3'; break;
        case 'click': src = '/sound/click.mp3'; break;
        case 'jackpot': src = '/sound/win.mp3'; break; 
        case 'coins': src = '/sound/win.mp3'; break; 
    }
    if (src) {
        const sfx = new Audio(src);
        sfx.volume = type === 'jackpot' ? 1.0 : 0.6;
        sfx.play().catch(() => {});
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        if (currentUser && currentUser.email === ADMIN_EMAIL) {
            setIsAdmin(true);
        } else {
            setIsAdmin(false);
        }
        setIsAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const SPLASH_DURATION = 20000; 
    const INTERVAL = 100;
    const startTime = Date.now();
    const progressTimer = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / SPLASH_DURATION) * 100, 100);
      setLoadingProgress(progress);
      if (elapsed >= SPLASH_DURATION) {
        clearInterval(progressTimer);
        setShowSplash(false);
      }
    }, INTERVAL);
    return () => clearInterval(progressTimer);
  }, []);

  useEffect(() => {
    isMusicPlayingRef.current = isMusicPlaying;
    if (audioRef.current) {
        if (isMusicPlaying) {
            audioRef.current.volume = 0.4;
            audioRef.current.play().catch(e => { setIsMusicPlaying(false); });
        } else {
            audioRef.current.pause();
        }
    }
  }, [isMusicPlaying]);

  // AD TIMER & REWARD LOGIC
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isAdPlaying && adTimer > 0) {
        interval = setInterval(() => { setAdTimer(prev => prev - 1); }, 1000);
    } else if (isAdPlaying && adTimer === 0) {
        setIsAdPlaying(false);
        
        // Handle Rewards Based on Type
        if (adRewardType === 'STANDARD') {
            setState(prev => ({ ...prev, balance: prev.balance + AD_REWARD, adWatchCount: prev.adWatchCount + 1 }));
            setTransactions(prev => [{ id: Math.random().toString(36).substr(2, 9), type: 'AD_REWARD', amount: AD_REWARD, date: new Date().toISOString(), displayDate: new Date().toLocaleString(), status: 'SUCCESS' }, ...prev]);
            setMessage("REWARD: +50 COINS");
            playSound('win');
            alert("Hadiah diterima! Saldo +50 berhasil ditambahkan.");
        } else if (adRewardType === 'DOUBLE_WIN') {
             const amount = pendingAdContext || 0;
             setState(prev => ({ ...prev, balance: prev.balance + amount })); // Add duplicate amount (original already added)
             setTransactions(prev => [{ id: Math.random().toString(36).substr(2, 9), type: 'AD_REWARD', amount: amount, details: 'DOUBLE WIN', date: new Date().toISOString(), displayDate: new Date().toLocaleString(), status: 'SUCCESS' }, ...prev]);
             setMessage(`WIN DOUBLED! +${amount}`);
             playSound('jackpot');
             setShowDoubleWinBtn(false);
        } else if (adRewardType === 'SKIP_LUCKY_WAIT') {
             setState(prev => ({ ...prev, lastLuckySpinTime: 0 })); // Reset timer
             playSound('scatter');
             alert("Cooldown Lucky Wheel dihilangkan! Silakan putar sekarang.");
        } else if (adRewardType === 'RESCUE_FUND') {
             const rescueAmount = 500;
             setState(prev => ({ ...prev, balance: prev.balance + rescueAmount }));
             setTransactions(prev => [{ id: Math.random().toString(36).substr(2, 9), type: 'AD_REWARD', amount: rescueAmount, details: 'RESCUE FUND', date: new Date().toISOString(), displayDate: new Date().toLocaleString(), status: 'SUCCESS' }, ...prev]);
             playSound('win');
             setShowRescueModal(false);
             setMessage("RESCUE FUND: +500");
             alert("Dana Darurat 500 Koin Diterima!");
        }

        if (audioRef.current && isMusicPlaying) audioRef.current.play().catch(() => {});
    }
    return () => clearInterval(interval);
  }, [isAdPlaying, adTimer, adRewardType, pendingAdContext, isMusicPlaying]);

  const handleLogin = async () => {
      playSound('click');
      try {
          const provider = new GoogleAuthProvider();
          await signInWithPopup(auth, provider);
          setIsMusicPlaying(true);
      } catch (error: any) {
          console.error("Login failed", error);
          if (error.code === 'auth/unauthorized-domain' || error.message.includes('unauthorized-domain')) {
              const isDevAdmin = confirm("Developer Environment Detected.\n\nLogin with ADMIN privileges?");
              const mockUser = {
                  uid: isDevAdmin ? 'dev-admin-id' : 'dev-guest-id',
                  displayName: isDevAdmin ? 'Developer Admin' : 'Developer User',
                  email: isDevAdmin ? ADMIN_EMAIL : 'dev@playcash.com',
                  photoURL: null, emailVerified: true, isAnonymous: false, metadata: {}, providerData: [], refreshToken: '', tenantId: null, delete: async () => {}, getIdToken: async () => '', getIdTokenResult: async () => ({} as any), reload: async () => {}, toJSON: () => ({}), phoneNumber: null
              } as unknown as FirebaseUser;
              setUser(mockUser);
              setIsAdmin(isDevAdmin);
              setIsMusicPlaying(true);
              return;
          }
          alert(`Gagal Login: ${error.message}`);
      }
  };

  const handleLogout = async () => {
      playSound('click');
      try {
          if (auth.currentUser) await signOut(auth);
          setUser(null); setIsAdmin(false); setIsMenuOpen(false); setIsMusicPlaying(false);
      } catch (error) { console.error("Logout failed", error); }
  };

  // Helper Rank
  const calculateRank = (xp: number) => {
      if (xp >= 1000000) return { name: 'DIAMOND', color: 'text-cyan-400', border: 'border-cyan-400', bg: 'bg-cyan-900/50', icon: Crown, id: 'DIAMOND' };
      if (xp >= 500000) return { name: 'PLATINUM', color: 'text-slate-300', border: 'border-slate-300', bg: 'bg-slate-800/50', icon: Shield, id: 'PLATINUM' };
      if (xp >= 100000) return { name: 'GOLD', color: 'text-yellow-400', border: 'border-yellow-400', bg: 'bg-yellow-900/50', icon: Shield, id: 'GOLD' };
      if (xp >= 10000) return { name: 'SILVER', color: 'text-gray-300', border: 'border-gray-400', bg: 'bg-gray-700/50', icon: Shield, id: 'SILVER' };
      return { name: 'BRONZE', color: 'text-orange-700', border: 'border-orange-700', bg: 'bg-orange-900/30', icon: Shield, id: 'BRONZE' };
  };

  const currentXP = state.totalLifetimeWin + state.totalLifetimeDeposit;
  const currentRank = calculateRank(currentXP);
  const userProfile = { name: user?.displayName || withdrawalAccount?.name || 'Guest Player', phone: withdrawalAccount?.number ? withdrawalAccount.number.replace(/(\d{4})\d{4}(\d{4})/, '$1****$2') : '-', rank: currentRank, xp: currentXP, avatar: user?.photoURL };

  // Log Bet
  const logBet = (bet: number, win: number, multiplier: number) => {
      const newLog: BetLog = {
          id: Math.random().toString(36).substr(2, 9),
          timestamp: new Date().toISOString(),
          bet, win, multiplier,
          result: win > 0 ? 'WIN' : 'LOSS'
      };
      setBetLogs(prev => [newLog, ...prev].slice(0, 50)); // Keep last 50 logs
  };

  const processGameStep = useCallback(async (currentGrid: GridState, isTumble = false) => {
    const winResult = calculateWin(currentGrid, state.bet);
    
    await new Promise(r => setTimeout(r, isTurbo ? 200 : 500));

    if (winResult.totalWin > 0) {
      playSound('win');
      const payoutMultiplier = state.multiplier;
      const winAmount = winResult.totalWin * payoutMultiplier;

      // Update State & Stats
      setState(prev => ({
        ...prev,
        isSpinning: false, isTumbling: true,
        currentWin: prev.currentWin + winAmount,
        balance: prev.balance + winAmount,
        totalLifetimeWin: prev.totalLifetimeWin + winAmount,
      }));
      setSessionStats(prev => ({ ...prev, totalWon: prev.totalWon + winAmount }));
      
      // Store temp win amount for potential Double Win Feature
      setTempWinAmount(prev => prev + winAmount);

      // Log Step (Optional: can log individual tumbles or just spin result)
      if (!isTumble) logBet(state.bet, winAmount, payoutMultiplier);

      setMessage(`WIN ${winAmount.toFixed(0)}! (x${payoutMultiplier})`);
      
      const markedGrid = currentGrid.map(col => 
        col.map(tile => ({ ...tile, isWinning: winResult.winningTileIds.has(tile.id) }))
      );
      setGrid(markedGrid);
      await new Promise(r => setTimeout(r, 600));

      const nextGrid = processTumble(currentGrid, winResult.winningTileIds, RTP_CONFIG[rtpMode]);
      setGrid(nextGrid);
      
      const currentMultIndex = MULTIPLIER_LEVELS.indexOf(state.multiplier);
      const nextMultiplier = currentMultIndex < MULTIPLIER_LEVELS.length - 1 ? MULTIPLIER_LEVELS[currentMultIndex + 1] : MULTIPLIER_LEVELS[MULTIPLIER_LEVELS.length - 1];
      setState(prev => ({ ...prev, multiplier: nextMultiplier }));
      processGameStep(nextGrid, true);
    } else {
      // If end of tumble or no initial win
      if (!isTumble) logBet(state.bet, 0, 1);

      const scatterCount = countScatters(currentGrid);
      if (scatterCount >= 3) {
        playSound('scatter');
        const spinsAwarded = 10 + ((scatterCount - 3) * 2);
        setAutoSpinCount(0);

        setState(prev => ({
           ...prev,
           progressScatterCount: prev.progressScatterCount + 1 // Achievement Progress
        }));

        if (state.freeSpinsLeft > 0) {
           setMessage(`RETRIGGER! +${spinsAwarded} SPINS`);
           setState(prev => ({ ...prev, freeSpinsLeft: prev.freeSpinsLeft + spinsAwarded, isSpinning: false, isTumbling: false }));
        } else {
           setFreeSpinsWon(spinsAwarded);
           setShowFreeSpinPopup(true);
           setState(prev => ({ ...prev, isSpinning: false, isTumbling: false }));
        }
      } else {
        setState(prev => ({ ...prev, isSpinning: false, isTumbling: false }));
        if (state.currentWin === 0) {
             setMessage("TRY AGAIN");
             setShowDoubleWinBtn(false);
             setTempWinAmount(0);
        }
        else {
             setMessage(`TOTAL WIN: ${state.currentWin.toFixed(0)}`);
             // Show Double Win Option if win > 0 and no gamble active
             if (state.currentWin > 0) {
                 setShowDoubleWinBtn(true);
             }

             if (state.currentWin >= state.bet * 2) {
                 setTimeout(() => {
                     setGambleAmount(state.currentWin);
                     setIsGambleOpen(true);
                 }, 500);
             }
        }
      }
    }
  }, [state.bet, state.multiplier, state.freeSpinsLeft, isTurbo, rtpMode]);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const isIdle = !state.isSpinning && !state.isTumbling && !showFreeSpinPopup && !showSplash && user && !isAdPlaying && !isWheelSpinning && !isGambleOpen && !globalConfig.maintenanceMode && !showRescueModal;

    if (isIdle) {
      if (state.freeSpinsLeft > 0) {
        timeout = setTimeout(() => { handleSpin(true); }, 1000);
      } else if (autoSpinCount > 0) {
        if (state.balance < state.bet) { setAutoSpinCount(0); setMessage("INSUFFICIENT BALANCE"); } 
        else { timeout = setTimeout(() => { setAutoSpinCount(prev => prev - 1); handleSpin(false); }, isTurbo ? 500 : 1000); }
      }
    }
    return () => clearTimeout(timeout);
  }, [state.freeSpinsLeft, autoSpinCount, state.isSpinning, state.isTumbling, showFreeSpinPopup, showSplash, state.balance, state.bet, isTurbo, user, isAdPlaying, isWheelSpinning, isGambleOpen, globalConfig.maintenanceMode, showRescueModal]);

  useEffect(() => { return () => { if (paymentTimerRef.current) clearInterval(paymentTimerRef.current); }; }, []);

  const handleSpin = useCallback((isFreeSpin = false) => {
    if (state.isSpinning || state.isTumbling || globalConfig.maintenanceMode) return;
    if (!isFreeSpin && state.balance < state.bet) { 
        setMessage("INSUFFICIENT BALANCE!"); 
        setAutoSpinCount(0); 
        checkRescueFund();
        return; 
    }

    playSound('spin');
    setShowDoubleWinBtn(false); // Hide double win on new spin
    setTempWinAmount(0);
    
    // --- SMART RTP: ANTI-BANKRUPTCY CHECK ---
    let effectiveRtpMode = rtpMode;
    // 1. Check Global Net Profit: If negative (Admin losing), force RUNGKAD
    if (netProfit < 0) {
        effectiveRtpMode = 'RUNGKAD';
    }
    // 2. Check User Win Rate: If user won > 120% of bets lifetime, force RUNGKAD
    const userWinRate = state.totalLifetimeBet > 0 ? (state.totalLifetimeWin / state.totalLifetimeBet) : 0;
    if (userWinRate > 1.2 && !isFreeSpin) {
        effectiveRtpMode = 'RUNGKAD';
    }

    // Jackpot Chance - ONLY triggers if Admin has enough profit to pay it
    if (!isFreeSpin && Math.random() < 0.00001) {
        // Safe Jackpot Check
        if (netProfit > jackpotValue * 1.5) {
             const jpWin = jackpotValue;
             setTransactions(prev => [{
                 id: Math.random().toString(36).substr(2, 9), type: 'JACKPOT', amount: jpWin, date: new Date().toISOString(), displayDate: new Date().toLocaleString(), status: 'SUCCESS'
             }, ...prev]);
             setState(prev => ({ ...prev, balance: prev.balance + jpWin }));
             alert(`JACKPOT!!! ANDA MEMENANGKAN ${jpWin.toLocaleString()}`);
             setJackpotValue(10000000); // Reset
        }
    }

    // --- PIGGY BANK & REBATE LOGIC ---
    if (!isFreeSpin) {
        const piggyAdd = state.bet * PIGGY_BANK_RATE;
        const rebateRate = REBATE_RATES[currentRank.id as keyof typeof REBATE_RATES] || 0.001;
        const rebateAdd = state.bet * rebateRate;

        setState(prev => ({
          ...prev,
          balance: isFreeSpin ? prev.balance : prev.balance - prev.bet,
          currentWin: 0,
          multiplier: 1,
          isSpinning: true,
          freeSpinsLeft: isFreeSpin ? prev.freeSpinsLeft - 1 : prev.freeSpinsLeft,
          progressSpinCount: prev.progressSpinCount + 1, // Achievement Progress
          totalLifetimeBet: prev.totalLifetimeBet + prev.bet, // Rebate base
          piggyBankBalance: prev.piggyBankBalance + piggyAdd,
          rebateBalance: prev.rebateBalance + rebateAdd
        }));
        
        setSessionStats(prev => ({ ...prev, totalBet: prev.totalBet + (isFreeSpin ? 0 : state.bet) }));
    } else {
         // Free spin doesn't deduct balance or add to piggy bank/rebate usually (optional)
         setState(prev => ({
          ...prev,
          currentWin: 0,
          multiplier: 1,
          isSpinning: true,
          freeSpinsLeft: prev.freeSpinsLeft - 1,
          progressSpinCount: prev.progressSpinCount + 1
        }));
    }

    const msg = isFreeSpin ? `FREE SPIN (${state.freeSpinsLeft - 1} LEFT)` : "GOOD LUCK!";
    setMessage(msg);

    setTimeout(() => {
      // Use the calculated "Safe" RTP Mode
      const newGrid = generateGrid(RTP_CONFIG[effectiveRtpMode]);
      setGrid(newGrid);
      processGameStep(newGrid);
    }, isTurbo ? 300 : 800);
  }, [state.balance, state.bet, state.isSpinning, state.isTumbling, state.freeSpinsLeft, isTurbo, processGameStep, rtpMode, jackpotValue, globalConfig.maintenanceMode, currentRank.id, checkRescueFund, netProfit, state.totalLifetimeBet, state.totalLifetimeWin]);

  const adjustBet = (amount: number) => {
    if (state.isSpinning || state.isTumbling || state.freeSpinsLeft > 0 || autoSpinCount > 0) return;
    playSound('click');
    const newBet = Math.min(Math.max(state.bet + amount, MIN_BET), MAX_BET);
    setState(prev => ({ ...prev, bet: newBet }));
  };

  const triggerAd = (type: typeof adRewardType, data?: any) => {
      playSound('click');
      setAdRewardType(type);
      setPendingAdContext(data);
      setAdTimer(AD_DURATION);
      setIsAdPlaying(true);
      if (audioRef.current && isMusicPlaying) audioRef.current.pause();
      if (isMenuOpen) closeMenu();
  };

  const startWatchAd = () => { triggerAd('STANDARD'); };
  
  const handleClaimDailyTarget = (tier: number) => {
      playSound('click');
      if (state.claimedDailyTargets.includes(tier)) return;
      let rewardSpins = 0;
      if (tier === 1) rewardSpins = 3; if (tier === 2) rewardSpins = 5;
      setState(prev => ({ ...prev, freeSpinsLeft: prev.freeSpinsLeft + rewardSpins, claimedDailyTargets: [...prev.claimedDailyTargets, tier] }));
      setTransactions(prev => [{ id: Math.random().toString(36).substr(2, 9), type: 'TARGET_REWARD', amount: 0, details: `${rewardSpins} Free Spins`, date: new Date().toISOString(), displayDate: new Date().toLocaleString(), status: 'SUCCESS' }, ...prev]);
      setMessage(`DAILY TARGET: +${rewardSpins} SPINS`); playSound('scatter'); alert(`Selamat! Anda telah mengklaim ${rewardSpins} Free Spins.`);
  };

  const handleClaimAchievement = (achievement: Achievement) => {
      playSound('click');
      if (state.achievedIds.includes(achievement.id)) return;
      
      setState(prev => ({
          ...prev,
          balance: prev.balance + achievement.reward,
          achievedIds: [...prev.achievedIds, achievement.id]
      }));
      setTransactions(prev => [{
            id: Math.random().toString(36).substr(2, 9), type: 'ACHIEVEMENT_REWARD', amount: achievement.reward, date: new Date().toISOString(), displayDate: new Date().toLocaleString(), status: 'SUCCESS'
      }, ...prev]);
      playSound('win');
      alert(`Achievement Unlocked: ${achievement.title}! Reward: ${achievement.reward}`);
  };

  const checkAchievementProgress = (ach: Achievement) => {
      if (ach.type === 'SPIN_COUNT') return state.progressSpinCount;
      if (ach.type === 'TOTAL_WIN') return state.totalLifetimeWin;
      if (ach.type === 'SCATTER_COUNT') return state.progressScatterCount;
      return 0;
  };

  // --- NEW FEATURE HANDLERS ---

  const handleBreakPiggyBank = () => {
      playSound('click');
      if (state.balance < PIGGY_BREAK_COST) { alert("Saldo tidak cukup untuk memecahkan celengan!"); return; }
      if (state.piggyBankBalance <= 0) { alert("Celengan masih kosong!"); return; }

      const amount = state.piggyBankBalance;
      setState(prev => ({
          ...prev,
          balance: prev.balance - PIGGY_BREAK_COST + amount,
          piggyBankBalance: 0
      }));
      setTransactions(prev => [{ id: Math.random().toString(36).substr(2, 9), type: 'PIGGY_BREAK', amount: amount, date: new Date().toISOString(), displayDate: new Date().toLocaleString(), status: 'SUCCESS' }, ...prev]);
      playSound('coins'); // Specific sound for coins
      alert(`Celengan Pecah! Anda mendapatkan ${amount.toLocaleString()} koin!`);
      closeMenu();
  };

  const handleClaimRebate = () => {
      playSound('click');
      if (state.rebateBalance < 1) { alert("Rebate belum cukup untuk diklaim."); return; }
      
      const amount = state.rebateBalance;
      setState(prev => ({
          ...prev,
          balance: prev.balance + amount,
          rebateBalance: 0,
          lastRebateClaimTime: Date.now()
      }));
      setTransactions(prev => [{ id: Math.random().toString(36).substr(2, 9), type: 'REBATE_CLAIM', amount: amount, date: new Date().toISOString(), displayDate: new Date().toLocaleString(), status: 'SUCCESS' }, ...prev]);
      playSound('coins');
      alert(`Rebate Sukses! +${amount.toLocaleString()} koin ditambahkan.`);
  };

  const handleLuckySpin = () => {
      if (isWheelSpinning) return;
      playSound('click');
      setIsWheelSpinning(true);

      // WEIGHTED RANDOM SELECTION FOR WHEEL
      const totalWeight = WHEEL_SEGMENTS.reduce((sum, seg) => sum + seg.weight, 0);
      let randomNum = Math.random() * totalWeight;
      let selectedSegment = WHEEL_SEGMENTS[0];
      let selectedIndex = 0;

      for (let i = 0; i < WHEEL_SEGMENTS.length; i++) {
          if (randomNum < WHEEL_SEGMENTS[i].weight) {
              selectedSegment = WHEEL_SEGMENTS[i];
              selectedIndex = i;
              break;
          }
          randomNum -= WHEEL_SEGMENTS[i].weight;
      }

      // Visual Spin
      const spinDegrees = 360 * 5 + (360 - (selectedIndex * (360 / WHEEL_SEGMENTS.length))); 
      setWheelRotation(spinDegrees);

      setTimeout(() => {
          setIsWheelSpinning(false);
          const reward = selectedSegment.value;
          setState(prev => ({
              ...prev,
              balance: prev.balance + reward,
              lastLuckySpinTime: Date.now()
          }));
          
          if (reward > 0) {
              setTransactions(prev => [{ id: Math.random().toString(36).substr(2, 9), type: 'LUCKY_WHEEL', amount: reward, date: new Date().toISOString(), displayDate: new Date().toLocaleString(), status: 'SUCCESS' }, ...prev]);
              playSound('win');
              alert(`Selamat! Anda mendapatkan ${reward.toLocaleString()} dari Lucky Wheel!`);
          } else {
              alert("Anda kurang beruntung! Coba lagi besok.");
          }
          setWheelRotation(0);
          setActiveModal(null);
      }, 5000); // Animation duration
  };

  const handleRedeemReferral = () => {
      playSound('click');
      const code = referralInput.trim().toUpperCase();
      if (!code) return;
      if (state.hasRedeemedReferral) { setErrorMessage("Anda sudah pernah memasukkan kode referral."); return; }
      if (code === state.referralCode) { setErrorMessage("Tidak bisa menggunakan kode sendiri."); return; }

      // Simulate validation (Accept any 6+ char code that isn't own)
      if (code.length < 6) { setErrorMessage("Kode referral tidak valid."); return; }

      setState(prev => ({
          ...prev,
          balance: prev.balance + 10000,
          hasRedeemedReferral: true
      }));
       setTransactions(prev => [{ id: Math.random().toString(36).substr(2, 9), type: 'REFERRAL_BONUS', amount: 10000, date: new Date().toISOString(), displayDate: new Date().toLocaleString(), status: 'SUCCESS' }, ...prev]);
       alert("Kode Referral Berhasil! Anda mendapatkan 10.000");
       setReferralInput('');
       setActiveModal(null);
  };

  const handleShopBuy = (item: ShopItem) => {
      playSound('click');
      if (state.ownedItemIds.includes(item.id)) return;
      if (state.balance < item.price) { alert("Saldo tidak cukup!"); return; }

      setState(prev => ({
          ...prev,
          balance: prev.balance - item.price,
          ownedItemIds: [...prev.ownedItemIds, item.id]
      }));
      setTransactions(prev => [{ id: Math.random().toString(36).substr(2, 9), type: 'SHOP_PURCHASE', amount: item.price, details: `Buy ${item.name}`, date: new Date().toISOString(), displayDate: new Date().toLocaleString(), status: 'SUCCESS' }, ...prev]);
      alert(`Berhasil membeli ${item.name}!`);
  };

  const handleShopEquip = (item: ShopItem) => {
      playSound('click');
      if (item.type === 'THEME') {
          setState(prev => ({ ...prev, equippedThemeId: item.id }));
      } else {
          setState(prev => ({ ...prev, equippedFrameId: item.id }));
      }
      alert(`${item.name} digunakan!`);
  };

  const handleStartFreeSpins = () => { playSound('click'); setShowFreeSpinPopup(false); setState(prev => ({ ...prev, freeSpinsLeft: prev.freeSpinsLeft + freeSpinsWon })); setFreeSpinsWon(0); };
  const handleAutoSpinClick = () => { playSound('click'); if (autoSpinCount > 0) setAutoSpinCount(0); else setIsAutoMenuOpen(!isAutoMenuOpen); };
  const selectAutoSpin = (count: number) => { playSound('click'); setAutoSpinCount(count); setIsAutoMenuOpen(false); if (!state.isSpinning && !state.isTumbling) { handleSpin(false); setAutoSpinCount(count - 1); } };
  const confirmBuyFeature = () => { playSound('click'); const cost = state.bet * BUY_FEATURE_COST_MULTIPLIER; if (state.balance < cost) { setErrorMessage("Saldo tidak cukup untuk membeli fitur!"); return; } setState(prev => ({ ...prev, balance: prev.balance - cost })); setActiveModal(null); setFreeSpinsWon(10); setShowFreeSpinPopup(true); playSound('scatter'); closeMenu(); };
  
  const handleClaimBonus = () => {
    playSound('click'); const code = bonusCodeInput.trim().toUpperCase(); if (!code) { setErrorMessage("Masukkan kode bonus!"); return; }
    if (state.claimedCodes && state.claimedCodes.includes(code)) { setErrorMessage("Kode ini sudah pernah Anda klaim!"); return; }
    const validCode = adminCodes.find(c => c.code === code); if (!validCode) { setErrorMessage("Kode tidak valid atau tidak ditemukan."); return; }
    if (Date.now() > validCode.expires) { setErrorMessage("Kode bonus sudah kadaluarsa."); return; }
    setState(prev => ({ ...prev, balance: prev.balance + validCode.amount, claimedCodes: [...(prev.claimedCodes || []), code], totalLifetimeDeposit: prev.totalLifetimeDeposit + validCode.amount }));
    setTransactions(prev => [{ id: Math.random().toString(36).substr(2, 9), type: 'BONUS', amount: validCode.amount, date: new Date().toISOString(), displayDate: new Date().toLocaleString(), status: 'SUCCESS' }, ...prev]);
    setBonusCodeInput(''); setErrorMessage(null); playSound('win'); alert(`Selamat! Anda mendapatkan Bonus Saldo sebesar ${validCode.amount.toLocaleString()}`); closeMenu();
  };

  const handleCheckIn = (dayIndex: number) => {
     playSound('click');
     const reward = CHECK_IN_REWARDS[dayIndex];
     setState(prev => ({
         ...prev,
         checkInStreak: prev.checkInStreak + 1,
         lastCheckInDate: Date.now(),
         balance: prev.balance + reward.amount
     }));
     setTransactions(prev => [{ id: Math.random().toString(36).substr(2, 9), type: 'DAILY_LOGIN', amount: reward.amount, date: new Date().toISOString(), displayDate: new Date().toLocaleString(), status: 'SUCCESS' }, ...prev]);
     playSound('win');
     alert(`Absensi Hari ke-${dayIndex + 1} Berhasil! Reward: ${reward.amount}`);
  };

  // Gamble Feature
  const handleGamble = (choice: 'RED' | 'BLACK') => {
      playSound('click');
      const win = Math.random() > 0.5; // 50/50
      if (win) {
          const newWin = gambleAmount * 2;
          setState(prev => ({ ...prev, balance: prev.balance + gambleAmount })); // Add double (base was not removed yet, wait, win means we add the extra amount)
          setGambleAmount(newWin);
          playSound('win');
          setTransactions(prev => [{ id: Math.random().toString(36).substr(2, 9), type: 'GAMBLE_WIN', amount: gambleAmount, date: new Date().toISOString(), displayDate: new Date().toLocaleString(), status: 'SUCCESS' }, ...prev]);
      } else {
          setState(prev => ({ ...prev, balance: prev.balance - gambleAmount }));
          setIsGambleOpen(false);
          alert("Anda kalah taruhan!");
      }
  };
  const collectGamble = () => {
      setIsGambleOpen(false);
      // Balance already updated on win step or base win step
  };


  const handleApproveTransaction = (txId: string, type: Transaction['type'], amount: number) => { if (type === 'DEPOSIT') { setState(prev => ({ ...prev, balance: prev.balance + amount, totalLifetimeDeposit: prev.totalLifetimeDeposit + amount, dailyDepositTotal: prev.dailyDepositTotal + amount })); } setTransactions(prev => prev.map(tx => tx.id === txId ? { ...tx, status: 'SUCCESS' } : tx)); };
  const handleRejectTransaction = (txId: string, type: Transaction['type'], amount: number) => { if (type === 'WITHDRAW') { const totalRefund = amount + WITHDRAWAL_FEE; setState(prev => ({ ...prev, balance: prev.balance + totalRefund })); } setTransactions(prev => prev.map(tx => tx.id === txId ? { ...tx, status: 'REJECTED' } : tx)); };
  const handleCreateVoucher = () => { if (!newVoucherCode || !newVoucherAmount) return; const amount = parseInt(newVoucherAmount); if (isNaN(amount)) return; const newCode: BonusCode = { code: newVoucherCode.toUpperCase(), amount: amount, expires: Date.now() + 86400000 }; setAdminCodes(prev => [newCode, ...prev]); setNewVoucherCode(''); setNewVoucherAmount(''); alert("Kode voucher berhasil dibuat!"); };

  // --- NEW ADMIN FUNCTIONS ---
  const handleBroadcast = () => {
      if (!broadcastMsg) return;
      const newNotif: UserNotification = {
          id: Date.now().toString(),
          title: 'Admin Announcement',
          message: broadcastMsg,
          date: new Date().toLocaleString(),
          isRead: false,
          type: 'INFO'
      };
      setState(prev => ({ ...prev, notifications: [newNotif, ...prev.notifications] }));
      setBroadcastMsg('');
      alert("Pesan Broadcast Terkirim!");
  };

  const handleGodModeBalance = () => {
      const amount = parseInt(godModeBalance);
      if (isNaN(amount)) return;
      setState(prev => ({ ...prev, balance: prev.balance + amount }));
      setGodModeBalance('');
      alert("Saldo User Berhasil Diubah!");
  };

  const toggleMaintenance = () => {
      setGlobalConfig(prev => ({ ...prev, maintenanceMode: !prev.maintenanceMode }));
  };

  // --- FINANCIAL STATS ---
  // Moved calculation to top of component to avoid redeclaration error

  const timeLeftLuckyWheel = (state.lastLuckySpinTime + DAILY_COOLDOWN) - Date.now();
  const isLuckyWheelReady = timeLeftLuckyWheel <= 0;
  const formatTimeLeft = (ms: number) => { const h = Math.floor(ms / (1000 * 60 * 60)); const m = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60)); return `${h}h ${m}m`; };
  const tier1Target = 10000; const tier2Target = 30000; const progressPercent = Math.min((state.dailyDepositTotal / tier2Target) * 100, 100); const tier1Claimable = state.dailyDepositTotal >= tier1Target && !state.claimedDailyTargets.includes(1); const tier2Claimable = state.dailyDepositTotal >= tier2Target && !state.claimedDailyTargets.includes(2);

  // Check In Logic
  const msPerDay = 24 * 60 * 60 * 1000;
  const daysSinceCheckIn = Math.floor((Date.now() - state.lastCheckInDate) / msPerDay);
  const isCheckInAvailable = daysSinceCheckIn >= 1;
  const currentStreakIdx = (daysSinceCheckIn > 2) ? 0 : state.checkInStreak % 7; // Reset if missed > 2 days (approx 48h window)

  const handleMenuClick = () => { playSound('click'); setIsMenuOpen(true); };
  const closeMenu = () => { playSound('click'); setIsMenuOpen(false); setActiveModal(null); setTransactionAmount(''); setErrorMessage(null); setBonusCodeInput(''); setIsVerifyingPayment(false); if (paymentTimerRef.current) clearInterval(paymentTimerRef.current); };
  const handleBindAccount = () => { playSound('click'); if (!tempBindData.number || !tempBindData.name) { alert("Mohon lengkapi data akun!"); return; } setWithdrawalAccount({ ...tempBindData }); };
  const startPaymentTimer = () => { setPaymentTimer(1800); if (paymentTimerRef.current) clearInterval(paymentTimerRef.current); paymentTimerRef.current = setInterval(() => { setPaymentTimer((prev) => { if (prev <= 1) { if (paymentTimerRef.current) clearInterval(paymentTimerRef.current); return 0; } return prev - 1; }); }, 1000); };
  const formatTime = (seconds: number) => { const m = Math.floor(seconds / 60); const s = seconds % 60; return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`; };

  const handleTransaction = () => {
    playSound('click'); setErrorMessage(null); const amount = parseInt(transactionAmount); if (isNaN(amount) || amount <= 0) return;
    if (activeModal === 'deposit') { setActiveModal('payment_qris'); startPaymentTimer(); } 
    else if (activeModal === 'withdraw') {
        const totalDeduction = amount + WITHDRAWAL_FEE; if (totalDeduction > state.balance) { setErrorMessage(`Saldo tidak cukup! Total: ${totalDeduction.toLocaleString()} (Termasuk biaya admin)`); return; }
        setState(prev => ({ ...prev, balance: prev.balance - totalDeduction })); setMessage(`WITHDRAW: -${amount}`);
        setTransactions(prev => [{ id: Math.random().toString(36).substr(2, 9), type: 'WITHDRAW', amount: amount, date: new Date().toISOString(), displayDate: new Date().toLocaleString(), status: 'PENDING' }, ...prev]);
        closeMenu(); alert("Permintaan penarikan berhasil dibuat. Menunggu persetujuan admin.");
    }
  };

  const handleConfirmPayment = () => { playSound('click'); setIsVerifyingPayment(true); setTimeout(() => { const amount = parseInt(transactionAmount); setMessage(`DEPOSIT: +${amount}`); setTransactions(prev => [{ id: Math.random().toString(36).substr(2, 9), type: 'DEPOSIT', amount: amount, date: new Date().toISOString(), displayDate: new Date().toLocaleString(), status: 'PENDING' }, ...prev]); closeMenu(); alert("Pembayaran terverifikasi! Saldo akan masuk setelah konfirmasi admin."); }, 2000); };
  const openTelegram = () => { playSound('click'); window.open('https://t.me/', '_blank'); };

  // --- THEME STYLES ---
  const activeTheme = SHOP_ITEMS.find(i => i.id === state.equippedThemeId) || SHOP_ITEMS[0];
  const activeFrame = SHOP_ITEMS.find(i => i.id === state.equippedFrameId) || SHOP_ITEMS.find(i => i.id === 'FRAME_DEFAULT');

  const getThemeBg = () => {
      switch(state.equippedThemeId) {
          case 'THEME_OCEAN': return 'bg-[#1e3a8a]';
          case 'THEME_CYBER': return 'bg-[#2e1065]';
          case 'THEME_GOLD': return 'bg-[#422006]';
          default: return 'bg-[#540b0e]';
      }
  };
  const getThemeBorder = () => {
      switch(state.equippedThemeId) {
          case 'THEME_OCEAN': return 'border-cyan-500';
          case 'THEME_CYBER': return 'border-purple-500';
          case 'THEME_GOLD': return 'border-yellow-500';
          default: return 'border-[#ffb703]';
      }
  };
  const getThemeAccent = () => {
      switch(state.equippedThemeId) {
          case 'THEME_OCEAN': return 'text-cyan-400';
          case 'THEME_CYBER': return 'text-purple-400';
          case 'THEME_GOLD': return 'text-yellow-400';
          default: return 'text-[#ffb703]';
      }
  };


  if (!user && !showSplash) {
      return (
          <div className="w-full h-screen bg-[#540b0e] flex flex-col items-center justify-center p-6 text-white overflow-hidden relative font-sans">
              <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, #9b2226 0%, #000 100%)' }} />
              <div className="z-10 flex flex-col items-center gap-8 w-full max-w-sm">
                  <div className="w-32 h-32 rounded-3xl bg-gradient-to-tr from-[#ffb703] to-[#e85d04] shadow-[0_0_50px_rgba(255,183,3,0.5)] flex items-center justify-center border-4 border-white transform rotate-3 animate-bounce">
                    <span className="text-6xl filter drop-shadow-md">🀄</span>
                  </div>
                  <div className="text-center">
                    <h1 className="text-4xl font-black text-[#ffb703] tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">PLAYCASH</h1>
                    <p className="text-gray-300 mt-2 font-bold tracking-wide">HIGH VOLATILITY SLOT</p>
                  </div>
                  <button onClick={handleLogin} className="w-full bg-white text-gray-800 font-bold py-4 rounded-xl shadow-xl flex items-center justify-center gap-3 hover:bg-gray-100 transition-transform active:scale-95">
                      <svg className="w-6 h-6" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                      Login dengan Google
                  </button>
                  <div className="text-xs text-gray-500 text-center mt-4">Dengan masuk, Anda menyetujui Syarat & Ketentuan kami.</div>
              </div>
          </div>
      );
  }

  // Live RTP Calc
  const liveRTP = sessionStats.totalBet > 0 ? (sessionStats.totalWon / sessionStats.totalBet) * 100 : 0;
  
  // Maintenance Screen
  if (globalConfig.maintenanceMode && !isAdmin && !showSplash) {
      return (
          <div className="w-full h-screen bg-black flex flex-col items-center justify-center p-6 text-center">
              <Shield size={64} className="text-yellow-500 mb-4 animate-pulse" />
              <h1 className="text-3xl font-bold text-white mb-2">MAINTENANCE</h1>
              <p className="text-gray-400">Server sedang dalam perbaikan. Silakan kembali lagi nanti.</p>
          </div>
      );
  }

  return (
    <div className={`w-full h-screen ${getThemeBg()} flex flex-col items-center justify-center p-2 text-white overflow-hidden relative font-sans transition-colors duration-500`}>
      
      {/* Background Decor */}
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, #9b2226 0%, #000 100%)' }} />
      <audio ref={audioRef} src="/sound/alto.mp3" loop />

      {/* --- LIVE WINNERS TICKER --- */}
      <div className={`absolute top-0 left-0 w-full bg-black/80 z-40 border-b ${getThemeBorder()} h-8 flex items-center overflow-hidden pointer-events-none`}>
          <div className={`flex items-center gap-2 px-2 text-xs font-bold ${getThemeAccent()} whitespace-nowrap animate-pulse`}>
             <Volume2 size={12} />
             <span>LIVE WINNERS:</span>
          </div>
          <div className="flex-1 overflow-hidden relative h-full">
             <div key={tickerIndex} className="absolute inset-0 flex items-center animate-[bounceIn_0.5s] pl-2 text-xs text-white font-mono">
                 {FAKE_WINNERS[tickerIndex]}
             </div>
          </div>
      </div>

       {/* --- FLASH TOURNAMENT WIDGET --- */}
       <div className="absolute top-8 right-2 z-30 flex flex-col items-end animate-in slide-in-from-top duration-700">
           <div className="bg-gradient-to-r from-purple-900 to-black px-3 py-1 rounded-bl-xl border-l-2 border-b-2 border-purple-500 shadow-lg">
               <div className="flex items-center gap-2">
                   <Zap size={14} className="text-yellow-400 animate-pulse" />
                   <span className="text-[10px] font-bold text-white">FLASH TOURNAMENT</span>
               </div>
               <div className="text-[9px] text-gray-400 text-right">Ends in: 45m 20s</div>
               <div className="text-[10px] text-purple-300 text-right font-bold mt-0.5">Prize: 500.000</div>
           </div>
       </div>

      {/* --- SPLASH SCREEN --- */}
      {showSplash && (
        <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-gradient-to-b from-[#660708] to-black">
          <div className="flex flex-col items-center gap-6 animate-in zoom-in duration-700">
            <div className="w-32 h-32 rounded-3xl bg-gradient-to-tr from-[#ffb703] to-[#e85d04] shadow-[0_0_50px_rgba(255,183,3,0.5)] flex items-center justify-center border-4 border-white transform rotate-3 animate-bounce">
              <span className="text-6xl filter drop-shadow-md">🀄</span>
            </div>
            <h1 className="text-4xl font-black text-[#ffb703] tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] text-center px-4">PLAYCASH</h1>
            <div className="mt-8 w-64 flex flex-col gap-2">
              <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden border border-white/20">
                <div className="h-full bg-gradient-to-r from-yellow-400 to-red-500 transition-all duration-100 ease-linear" style={{ width: `${loadingProgress}%` }} />
              </div>
              <div className="flex justify-between text-xs text-yellow-500 font-mono">
                 <span className="animate-pulse">Loading resources...</span><span>{Math.floor(loadingProgress)}%</span>
              </div>
            </div>
            <div className="absolute bottom-10 text-xs text-gray-500 font-mono">High Volatility Slot</div>
          </div>
        </div>
      )}
      
      {/* --- AD OVERLAY --- */}
      {isAdPlaying && (
          <div className="fixed inset-0 z-[60] bg-black flex flex-col items-center justify-center">
               <div className="text-white/50 text-sm animate-pulse">Menunggu Iklan...</div>
               <div className="absolute top-5 right-5 text-white font-mono text-xs border border-white/20 px-2 py-1 rounded-lg">
                   Reward in {adTimer}s
               </div>
          </div>
      )}

      {/* --- EMERGENCY FUND MODAL --- */}
      {showRescueModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in zoom-in">
           <div className="bg-[#2a0a0a] border-2 border-red-500 rounded-2xl p-6 w-80 text-center shadow-2xl relative overflow-hidden">
               <div className="absolute top-0 right-0 p-2"><button onClick={() => setShowRescueModal(false)}><X size={20} className="text-gray-500" /></button></div>
               <AlertTriangle size={48} className="text-red-500 mx-auto mb-3 animate-bounce" />
               <h2 className="text-xl font-black text-white mb-2">SALDO HABIS?</h2>
               <p className="text-gray-400 text-xs mb-4">Jangan khawatir! Tonton iklan singkat untuk mendapatkan dana darurat sebesar <span className="text-yellow-400 font-bold">500 KOIN</span>.</p>
               <button onClick={() => triggerAd('RESCUE_FUND')} className="w-full py-3 bg-gradient-to-r from-red-600 to-orange-600 rounded-lg font-bold text-white shadow-lg active:scale-95 flex items-center justify-center gap-2">
                   <PlayCircle size={18} /> AMBIL 500 KOIN
               </button>
           </div>
        </div>
      )}

      {/* --- FREE SPIN POPUP --- */}
      {showFreeSpinPopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in zoom-in duration-300">
            <div className="flex flex-col items-center justify-center gap-4 p-8 bg-gradient-to-b from-red-600 to-red-900 border-4 border-yellow-400 rounded-2xl shadow-[0_0_50px_rgba(255,215,0,0.6)] text-center relative overflow-hidden max-w-sm w-full mx-4">
                <div className="absolute inset-0 bg-repeat opacity-20" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/stardust.png")' }}></div>
                <div className="absolute -inset-[100%] bg-gradient-to-r from-transparent via-yellow-400/30 to-transparent rotate-45 animate-[shine_3s_infinite]"></div>
                <div className="relative z-10 flex flex-col items-center">
                    <h2 className="text-3xl font-black text-yellow-400 drop-shadow-[0_4px_0_#000] tracking-widest uppercase mb-2 animate-bounce">CONGRATULATIONS!</h2>
                    <div className="text-xl font-bold text-white drop-shadow-md mb-4">YOU WON</div>
                    <div className="text-8xl font-black text-white drop-shadow-[0_0_15px_rgba(255,215,0,0.8)] scale-110 mb-2">{freeSpinsWon}</div>
                    <div className="text-xl font-bold text-white drop-shadow-md uppercase mb-6">FREE SPINS</div>
                    <button onClick={handleStartFreeSpins} className="px-8 py-3 bg-gradient-to-b from-yellow-400 to-yellow-600 border-2 border-white rounded-full text-red-900 font-black text-lg shadow-xl hover:scale-105 active:scale-95 transition-transform">START FEATURE</button>
                </div>
            </div>
        </div>
      )}

      {/* --- GAMBLE MODAL --- */}
      {isGambleOpen && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/90 backdrop-blur-md animate-in zoom-in">
              <div className="bg-[#2a0a0a] border-4 border-[#ffb703] rounded-2xl p-6 w-80 text-center relative overflow-hidden shadow-2xl">
                   <h2 className="text-2xl font-black text-white mb-2 uppercase">Gamble Feature</h2>
                   <div className="text-gray-400 text-sm mb-4">Gandakan kemenangan Anda atau kehilangan semuanya?</div>
                   <div className="text-4xl font-bold text-[#ffb703] mb-6">{gambleAmount.toLocaleString()}</div>
                   <div className="grid grid-cols-2 gap-4 mb-4">
                       <button onClick={() => handleGamble('RED')} className="h-32 bg-red-600 rounded-xl border-4 border-red-400 shadow-[0_0_20px_red] flex items-center justify-center active:scale-95 transition-transform">
                           <div className="w-16 h-16 bg-white rounded-full"></div>
                       </button>
                       <button onClick={() => handleGamble('BLACK')} className="h-32 bg-gray-900 rounded-xl border-4 border-gray-600 shadow-[0_0_20px_black] flex items-center justify-center active:scale-95 transition-transform">
                           <div className="w-16 h-16 bg-white rounded-full"></div>
                       </button>
                   </div>
                   <button onClick={collectGamble} className="w-full py-3 bg-green-600 rounded-lg font-bold text-white hover:bg-green-500 shadow-lg">AMBIL KEMENANGAN ({gambleAmount.toLocaleString()})</button>
              </div>
          </div>
      )}

      {/* --- MENU OVERLAY --- */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className={`bg-[#540b0e] w-full max-w-sm rounded-xl border-2 border-[#ffb703] shadow-2xl overflow-hidden flex flex-col relative h-[85vh]`}>
                <div className="bg-[#660708] p-4 flex justify-between items-center border-b border-[#ffb703]">
                    <h2 className="text-[#ffb703] font-bold text-xl drop-shadow-md">{activeModal ? activeModal.replace(/_/g, ' ').toUpperCase() : 'MENU'}</h2>
                    <button onClick={closeMenu} className="text-[#ffb703] hover:bg-black/20 p-1 rounded"><X size={24} /></button>
                </div>
                <div className="p-6 flex flex-col gap-3 overflow-y-auto flex-1 no-scrollbar">
                    
                    {/* INBOX VIEW */}
                    {activeModal === 'inbox' && (
                        <div className="flex flex-col gap-2 animate-in fade-in">
                            {state.notifications.length === 0 ? <div className="text-gray-500 text-center py-10">Kotak masuk kosong.</div> : state.notifications.map(n => (
                                <div key={n.id} className="bg-black/30 p-3 rounded border border-white/10 flex flex-col gap-1">
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold text-yellow-400 text-sm">{n.title}</span>
                                        <span className="text-[10px] text-gray-500">{n.date}</span>
                                    </div>
                                    <p className="text-xs text-gray-300">{n.message}</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* LUCKY WHEEL MODAL */}
                    {activeModal === 'lucky_wheel' && (
                        <div className="flex flex-col items-center gap-4 animate-in zoom-in">
                            <div className="relative w-64 h-64">
                                <div className="absolute inset-0 rounded-full border-4 border-yellow-400 shadow-[0_0_20px_gold] overflow-hidden transition-transform duration-[5000ms] cubic-bezier(0.2, 0.8, 0.2, 1)"
                                     style={{ transform: `rotate(${wheelRotation}deg)`, background: 'conic-gradient(from 0deg, #ef4444 0deg 45deg, #3b82f6 45deg 90deg, #10b981 90deg 135deg, #f59e0b 135deg 180deg, #8b5cf6 180deg 225deg, #4b5563 225deg 270deg, #ef4444 270deg 315deg, #3b82f6 315deg 360deg)' }}>
                                      {/* Segments Visual Simplification */}
                                </div>
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-4 text-4xl">🔻</div>
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center font-bold text-[#660708] shadow-lg z-10 border-4 border-yellow-500">
                                        PLAY
                                    </div>
                                </div>
                            </div>
                            <div className="text-center w-full">
                                {!isLuckyWheelReady && !isWheelSpinning && (
                                    <div className="flex flex-col items-center gap-2 mb-2">
                                        <div className="text-sm text-red-400 font-bold">Cooldown: {formatTimeLeft(timeLeftLuckyWheel)}</div>
                                        <button 
                                            onClick={() => triggerAd('SKIP_LUCKY_WAIT')}
                                            className="px-4 py-2 bg-blue-600 rounded-full text-xs font-bold text-white flex items-center gap-2 hover:bg-blue-500"
                                        >
                                            <PlayCircle size={14} /> Tonton Iklan (Skip Wait)
                                        </button>
                                    </div>
                                )}
                                
                                <button 
                                    onClick={handleLuckySpin} 
                                    disabled={!isLuckyWheelReady || isWheelSpinning}
                                    className="px-8 py-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full font-black text-white shadow-lg active:scale-95 disabled:opacity-50 disabled:grayscale text-xl border-2 border-white w-full"
                                >
                                    {isWheelSpinning ? 'SPINNING...' : 'SPIN NOW'}
                                </button>
                            </div>
                            <div className="text-xs text-gray-400 text-center">Menangkan hadiah Jackpot 50.000 Koin!</div>
                        </div>
                    )}

                    {/* SHOP MODAL */}
                    {activeModal === 'shop' && (
                        <div className="flex flex-col gap-4 animate-in fade-in">
                            <div className="flex items-center gap-2 bg-black/40 p-2 rounded mb-2">
                                <Coins className="text-yellow-400" />
                                <span className="font-bold text-white">{state.balance.toLocaleString()}</span>
                            </div>
                            
                            <h3 className="text-sm font-bold text-gray-300 border-b border-gray-600 pb-1">TEMA APLIKASI</h3>
                            <div className="grid grid-cols-2 gap-2">
                                {SHOP_ITEMS.filter(i => i.type === 'THEME').map(item => {
                                    const isOwned = state.ownedItemIds.includes(item.id);
                                    const isEquipped = state.equippedThemeId === item.id;
                                    return (
                                        <div key={item.id} className="bg-black/30 p-2 rounded border border-white/10 flex flex-col gap-2 relative overflow-hidden">
                                            <div className="h-12 w-full rounded" style={{ backgroundColor: item.previewColor }} />
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-bold text-white">{item.name}</span>
                                                {isEquipped ? <CheckCircle size={14} className="text-green-500" /> : isOwned ? null : <span className="text-[10px] text-yellow-400 font-mono">{item.price.toLocaleString()}</span>}
                                            </div>
                                            {isOwned ? (
                                                <button onClick={() => handleShopEquip(item)} disabled={isEquipped} className={`py-1 rounded text-[10px] font-bold ${isEquipped ? 'bg-green-600/50 text-green-200' : 'bg-blue-600 text-white'}`}>{isEquipped ? 'DIPAKAI' : 'PAKAI'}</button>
                                            ) : (
                                                <button onClick={() => handleShopBuy(item)} className="py-1 bg-yellow-600 text-white rounded text-[10px] font-bold">BELI</button>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>

                            <h3 className="text-sm font-bold text-gray-300 border-b border-gray-600 pb-1 mt-2">BINGKAI AVATAR</h3>
                            <div className="grid grid-cols-2 gap-2">
                                {SHOP_ITEMS.filter(i => i.type === 'FRAME').map(item => {
                                    const isOwned = state.ownedItemIds.includes(item.id);
                                    const isEquipped = state.equippedFrameId === item.id;
                                    return (
                                        <div key={item.id} className="bg-black/30 p-2 rounded border border-white/10 flex flex-col gap-2 relative">
                                            <div className="flex justify-center py-2">
                                                <div className={`w-10 h-10 rounded-full bg-gray-500 border-2 ${item.assetUrl}`}></div>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-bold text-white">{item.name}</span>
                                                {isEquipped ? <CheckCircle size={14} className="text-green-500" /> : isOwned ? null : <span className="text-[10px] text-yellow-400 font-mono">{item.price.toLocaleString()}</span>}
                                            </div>
                                            {isOwned ? (
                                                <button onClick={() => handleShopEquip(item)} disabled={isEquipped} className={`py-1 rounded text-[10px] font-bold ${isEquipped ? 'bg-green-600/50 text-green-200' : 'bg-blue-600 text-white'}`}>{isEquipped ? 'DIPAKAI' : 'PAKAI'}</button>
                                            ) : (
                                                <button onClick={() => handleShopBuy(item)} className="py-1 bg-yellow-600 text-white rounded text-[10px] font-bold">BELI</button>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* REFERRAL MODAL */}
                    {activeModal === 'referral' && (
                        <div className="flex flex-col gap-4 animate-in fade-in">
                            <div className="bg-blue-900/40 p-4 rounded-lg border border-blue-500 flex flex-col items-center gap-2 text-center">
                                <Share2 size={32} className="text-blue-300" />
                                <h3 className="text-lg font-bold text-blue-200">UNDANG TEMAN</h3>
                                <p className="text-xs text-gray-300">Bagikan kode Anda ke teman. Saat mereka memasukkan kode ini, Anda berdua mendapatkan 10.000 koin!</p>
                            </div>
                            
                            <div className="bg-black/30 p-3 rounded border border-white/10">
                                <label className="text-xs text-gray-400">Kode Referral Anda</label>
                                <div className="flex gap-2 mt-1">
                                    <div className="flex-1 bg-black/60 p-2 rounded text-center font-mono font-bold text-xl tracking-widest text-yellow-400 border border-yellow-600/30">
                                        {state.referralCode}
                                    </div>
                                    <button onClick={() => { navigator.clipboard.writeText(state.referralCode); alert("Kode disalin!"); }} className="px-3 bg-gray-700 rounded text-white font-bold text-xs">COPY</button>
                                </div>
                            </div>

                            {!state.hasRedeemedReferral && (
                                <div className="bg-black/30 p-3 rounded border border-white/10">
                                    <label className="text-xs text-gray-400">Punya Kode Teman?</label>
                                    <div className="flex gap-2 mt-1">
                                        <input 
                                            type="text" 
                                            value={referralInput} 
                                            onChange={e => setReferralInput(e.target.value.toUpperCase())}
                                            placeholder="MASUKKAN KODE" 
                                            className="flex-1 bg-black/60 p-2 rounded text-white font-mono uppercase text-sm border border-gray-600 focus:border-blue-500 outline-none" 
                                        />
                                        <button onClick={handleRedeemReferral} className="px-3 bg-green-600 rounded text-white font-bold text-xs">KLAIM</button>
                                    </div>
                                    {errorMessage && <div className="text-xs text-red-400 mt-1">{errorMessage}</div>}
                                </div>
                            )}

                            {state.hasRedeemedReferral && (
                                <div className="p-3 bg-green-900/30 border border-green-500/30 rounded text-center text-green-300 text-xs font-bold">
                                    <CheckCircle size={16} className="inline mr-1" /> Anda sudah mengklaim bonus referral.
                                </div>
                            )}
                        </div>
                    )}

                    {/* LEADERBOARD VIEW */}
                    {activeModal === 'leaderboard' && (
                        <div className="flex flex-col gap-2 animate-in fade-in">
                            <div className="bg-gradient-to-r from-yellow-800 to-yellow-900 p-3 rounded-lg flex items-center gap-3 border border-yellow-500 mb-2">
                                <Trophy className="text-yellow-300" size={32} />
                                <div>
                                    <div className="font-bold text-yellow-100 text-lg">TOP PLAYERS</div>
                                    <div className="text-xs text-yellow-300">Global Ranking (Total XP)</div>
                                </div>
                            </div>
                            {/* Insert User into Leaderboard for visual if not top */}
                            {[...FAKE_LEADERBOARD, {id: 'user', name: userProfile.name, score: userProfile.xp, rank: 99, isUser: true }]
                             .sort((a,b) => b.score - a.score)
                             .slice(0, 20)
                             .map((entry, idx) => (
                                <div key={entry.id} className={`flex items-center justify-between p-2 rounded ${entry.isUser ? 'bg-blue-900/60 border border-blue-400' : 'bg-black/30 border border-white/5'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                            idx === 0 ? 'bg-yellow-400 text-black' : 
                                            idx === 1 ? 'bg-gray-300 text-black' : 
                                            idx === 2 ? 'bg-orange-400 text-black' : 'bg-gray-700 text-gray-400'
                                        }`}>
                                            {idx + 1}
                                        </div>
                                        <span className={`text-sm font-bold ${entry.isUser ? 'text-blue-200' : 'text-gray-300'}`}>
                                            {entry.name} {entry.isUser && '(YOU)'}
                                        </span>
                                    </div>
                                    <span className="text-xs font-mono text-yellow-400">{entry.score.toLocaleString()}</span>
                                </div>
                             ))}
                        </div>
                    )}

                    {/* ACHIEVEMENTS VIEW */}
                    {activeModal === 'achievements' && (
                        <div className="flex flex-col gap-2 animate-in fade-in">
                             <div className="bg-gradient-to-r from-purple-800 to-purple-900 p-3 rounded-lg flex items-center gap-3 border border-purple-500 mb-2">
                                <Medal className="text-purple-300" size={32} />
                                <div>
                                    <div className="font-bold text-purple-100 text-lg">MISSIONS</div>
                                    <div className="text-xs text-purple-300">Selesaikan Misi, Dapatkan Koin!</div>
                                </div>
                            </div>
                            {ACHIEVEMENTS.map(ach => {
                                const current = checkAchievementProgress(ach);
                                const progress = Math.min((current / ach.target) * 100, 100);
                                const isCompleted = current >= ach.target;
                                const isClaimed = state.achievedIds.includes(ach.id);
                                return (
                                    <div key={ach.id} className="bg-black/30 p-3 rounded border border-white/10 flex flex-col gap-2">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <div className="text-sm font-bold text-yellow-400">{ach.title}</div>
                                                <div className="text-xs text-gray-400">{ach.description}</div>
                                            </div>
                                            <div className="text-xs font-bold text-green-400">+{ach.reward.toLocaleString()}</div>
                                        </div>
                                        <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                                            <div className="h-full bg-yellow-500 transition-all duration-500" style={{ width: `${progress}%` }} />
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-[10px] text-gray-500">{current} / {ach.target}</span>
                                            <button 
                                                disabled={!isCompleted || isClaimed}
                                                onClick={() => handleClaimAchievement(ach)}
                                                className={`px-3 py-1 rounded text-[10px] font-bold ${
                                                    isClaimed ? 'bg-gray-700 text-gray-500' :
                                                    isCompleted ? 'bg-green-600 text-white animate-pulse' :
                                                    'bg-gray-800 text-gray-600'
                                                }`}
                                            >
                                                {isClaimed ? 'DIKLAIM' : isCompleted ? 'KLAIM HADIAH' : 'LOCKED'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* PROFILE MODAL VIEW */}
                    {activeModal === 'profile' && (
                        <div className={`mb-4 p-4 rounded-lg border-2 ${userProfile.rank.border} ${userProfile.rank.bg} flex flex-col gap-2 relative overflow-hidden shadow-lg animate-in fade-in`}>
                            <div className="absolute -top-2 -right-2 opacity-10 rotate-12"><userProfile.rank.icon size={100} /></div>
                            <div className="flex items-center gap-3 z-10">
                                <div className={`w-16 h-16 rounded-full bg-gradient-to-tr from-gray-700 to-gray-500 border-2 ${activeFrame ? activeFrame.assetUrl : 'border-white'} flex items-center justify-center shadow-lg relative overflow-hidden`}>
                                    {userProfile.avatar ? <img src={userProfile.avatar} alt="User" className="w-full h-full object-cover" /> : <User size={32} />}
                                    <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                                </div>
                                <div className="flex-1">
                                    <div className="text-[#ffb703] font-bold text-xl leading-none truncate max-w-[150px]">{userProfile.name}</div>
                                    <div className="text-gray-300 text-sm font-mono mt-1">{userProfile.phone}</div>
                                </div>
                            </div>
                            <div className="z-10 mt-4 bg-black/30 rounded p-3 border border-white/5">
                                <div className="flex justify-between items-center text-sm mb-2">
                                    <span className={`font-black tracking-wider ${userProfile.rank.color} drop-shadow-sm flex items-center gap-1`}><userProfile.rank.icon size={16} />{userProfile.rank.name} VIP</span>
                                    <span className="text-gray-400 font-mono text-xs">XP: {userProfile.xp.toLocaleString()}</span>
                                </div>
                                <div className="w-full h-3 bg-black/60 rounded-full overflow-hidden border border-white/10 mb-3">
                                    <div className={`h-full transition-all duration-500 ${userProfile.rank.color.replace('text', 'bg')}`} style={{ width: `${Math.min((userProfile.xp % 10000) / 100, 100)}%` }} />
                                </div>
                                <div className="flex justify-between text-xs text-gray-300 font-mono border-t border-white/10 pt-2">
                                    <div className="flex flex-col items-center"><span className="text-gray-500 text-[10px]">TOTAL WIN</span><span className="text-yellow-400 font-bold">{state.totalLifetimeWin.toLocaleString()}</span></div>
                                    <div className="flex flex-col items-center"><span className="text-gray-500 text-[10px]">TOTAL DEPOSIT</span><span className="text-green-400 font-bold">{state.totalLifetimeDeposit.toLocaleString()}</span></div>
                                </div>
                            </div>
                            
                            {/* --- VIP BENEFIT & REBATE --- */}
                             <div className="z-10 mt-2 bg-gradient-to-r from-gray-800 to-gray-900 rounded p-3 border border-white/10">
                                <div className="flex justify-between items-center mb-2">
                                     <span className="text-xs font-bold text-blue-200 flex items-center gap-1"><Percent size={14}/> VIP Rebate</span>
                                     <span className="text-[10px] text-gray-400">Total Bet: {state.totalLifetimeBet.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="text-lg font-bold text-blue-400">{state.rebateBalance.toFixed(0)}</div>
                                    <button onClick={handleClaimRebate} className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold px-3 py-1.5 rounded active:scale-95">KLAIM</button>
                                </div>
                             </div>

                            <div className="z-10 mt-2">
                                <div className="text-xs font-bold text-gray-400 mb-1 flex items-center gap-1"><History size={12} />Aktivitas Terakhir</div>
                                <div className="flex flex-col gap-1.5">
                                    {transactions.length === 0 ? <div className="text-xs text-gray-500 italic p-2 text-center bg-black/20 rounded">Belum ada transaksi</div> : transactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 3).map(tx => (
                                        <div key={tx.id} className="flex justify-between items-center bg-black/30 p-2 rounded border border-white/5 text-xs">
                                             <div className="flex items-center gap-1">
                                                {tx.type === 'DEPOSIT' && <ArrowDownCircle size={12} className="text-green-500" />}
                                                {tx.type === 'WITHDRAW' && <ArrowUpCircle size={12} className="text-red-500" />}
                                                {(tx.type === 'PIGGY_BREAK' || tx.type === 'REBATE_CLAIM' || tx.type === 'BONUS' || tx.type === 'DAILY_LOGIN' || tx.type === 'AD_REWARD' || tx.type === 'TARGET_REWARD' || tx.type === 'ACHIEVEMENT_REWARD' || tx.type === 'LUCKY_WHEEL' || tx.type === 'REFERRAL_BONUS') && <Gift size={12} className="text-purple-500" />}
                                                <span className="font-bold text-gray-300">{tx.type.replace('_', ' ')}</span>
                                             </div>
                                             <span className={`${tx.status === 'SUCCESS' ? 'text-green-400' : tx.status === 'PENDING' ? 'text-yellow-400' : 'text-red-400'}`}>{tx.amount > 0 ? tx.amount.toLocaleString() : (tx.details || '-')}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <button onClick={() => setActiveModal('history')} className="mt-3 w-full py-2 bg-black/40 hover:bg-black/60 rounded border border-white/20 transition-colors flex items-center justify-center gap-2 text-sm font-bold text-[#ffb703]"><History size={16} />Lihat Semua Riwayat</button>
                            <button onClick={() => setActiveModal('betlogs')} className="mt-2 w-full py-2 bg-black/40 hover:bg-black/60 rounded border border-white/20 transition-colors flex items-center justify-center gap-2 text-sm font-bold text-blue-300"><FileText size={16} />Riwayat Taruhan (Logs)</button>
                            <button onClick={handleLogout} className="mt-2 w-full py-2 bg-red-900/40 hover:bg-red-900/60 rounded border border-red-500/20 transition-colors flex items-center justify-center gap-2 text-sm font-bold text-red-300"><LogOut size={16} />Logout</button>
                        </div>
                    )}

                    {/* BET LOGS VIEW */}
                    {activeModal === 'betlogs' && (
                        <div className="flex flex-col gap-2 animate-in fade-in h-full">
                            <h3 className="font-bold text-blue-300 flex items-center gap-2"><FileText size={16} />Riwayat Taruhan</h3>
                            <div className="flex-1 overflow-y-auto flex flex-col gap-2">
                                {betLogs.length === 0 ? <div className="text-center text-gray-500 py-10">Belum ada riwayat main.</div> : betLogs.map(log => (
                                    <div key={log.id} className="bg-black/30 p-2 rounded border border-white/5 flex justify-between items-center text-xs">
                                        <div>
                                            <div className="text-gray-400 text-[10px]">{new Date(log.timestamp).toLocaleTimeString()}</div>
                                            <div className="font-bold text-gray-200">Bet: {log.bet}</div>
                                        </div>
                                        <div className="text-right">
                                            <div className={`font-bold ${log.win > 0 ? 'text-green-400' : 'text-gray-500'}`}>{log.win > 0 ? `+${log.win}` : '-'}</div>
                                            <div className="text-[10px] text-gray-400">{log.multiplier}x</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => setActiveModal('profile')} className="w-full py-3 bg-[#ffb703] text-[#660708] rounded font-bold">Kembali</button>
                        </div>
                    )}

                    {/* ADMIN DASHBOARD */}
                    {activeModal === 'admin' && isAdmin && (
                        <div className="flex flex-col gap-4 animate-in fade-in">
                            {/* FINANCIAL DASHBOARD */}
                            <div className="bg-gradient-to-br from-gray-800 to-gray-900 p-3 rounded-lg border border-white/10 shadow-lg">
                                <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2"><BarChart3 size={14} />Financial Overview</h3>
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                    <div className="bg-black/30 p-2 rounded border border-green-500/30">
                                        <div className="text-[10px] text-gray-400 flex items-center gap-1"><TrendingUp size={10} className="text-green-500"/> Total Deposit</div>
                                        <div className="text-sm font-bold text-green-400">{totalDeposits.toLocaleString()}</div>
                                    </div>
                                    <div className="bg-black/30 p-2 rounded border border-red-500/30">
                                        <div className="text-[10px] text-gray-400 flex items-center gap-1"><TrendingDown size={10} className="text-red-500"/> Total Withdraw</div>
                                        <div className="text-sm font-bold text-red-400">{totalWithdrawals.toLocaleString()}</div>
                                    </div>
                                </div>
                                <div className="bg-black/30 p-2 rounded border border-yellow-500/30 flex justify-between items-center">
                                    <span className="text-xs text-gray-300">Net Profit (Bandar)</span>
                                    <span className={`text-base font-black ${netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>{netProfit.toLocaleString()}</span>
                                </div>
                            </div>

                            {/* GLOBAL CONTROLS */}
                            <div className="bg-black/30 p-3 rounded border border-white/10">
                                <h3 className="text-sm font-bold text-gray-300 mb-2">System Controls</h3>
                                <button onClick={toggleMaintenance} className={`w-full py-2 rounded font-bold text-xs flex items-center justify-center gap-2 transition-colors ${globalConfig.maintenanceMode ? 'bg-red-600 text-white animate-pulse' : 'bg-gray-700 text-gray-300'}`}>
                                    <Power size={14} /> {globalConfig.maintenanceMode ? 'DISABLE MAINTENANCE MODE' : 'ENABLE MAINTENANCE MODE'}
                                </button>
                            </div>

                            {/* BROADCAST */}
                            <div className="bg-black/30 p-3 rounded border border-blue-500/30">
                                <h3 className="text-sm font-bold text-blue-300 mb-2">Broadcast Message</h3>
                                <div className="flex gap-2">
                                    <input type="text" placeholder="Pesan untuk semua user..." className="bg-black/40 border border-gray-600 rounded p-2 text-xs text-white flex-1" value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)} />
                                    <button onClick={handleBroadcast} className="bg-blue-600 text-white px-3 py-2 rounded text-xs font-bold"><Send size={14} /></button>
                                </div>
                            </div>

                            {/* GOD MODE */}
                            <div className="bg-black/30 p-3 rounded border border-red-500/30">
                                <h3 className="text-sm font-bold text-red-300 mb-2 flex items-center gap-1"><Zap size={14} />God Mode (Edit Balance)</h3>
                                <div className="flex gap-2">
                                    <input type="number" placeholder="+/- Amount" className="bg-black/40 border border-gray-600 rounded p-2 text-xs text-white flex-1" value={godModeBalance} onChange={e => setGodModeBalance(e.target.value)} />
                                    <button onClick={handleGodModeBalance} className="bg-red-600 text-white px-3 py-2 rounded text-xs font-bold">Update</button>
                                </div>
                            </div>

                            <div className="bg-black/30 p-3 rounded border border-white/10">
                                <div className="grid grid-cols-2 gap-2">
                                    <div><div className="text-xs text-gray-400">Total Pengguna (Sim)</div><div className="text-lg font-bold">1</div></div>
                                    <div><div className="text-xs text-gray-400">Pending Requests</div><div className="text-lg font-bold text-yellow-400">{transactions.filter(t => t.status === 'PENDING').length}</div></div>
                                </div>
                            </div>
                            
                            <div className="bg-black/30 p-3 rounded border border-blue-500/30">
                                <h3 className="text-sm font-bold text-blue-300 mb-2 flex items-center gap-2"><Sliders size={14} />Pengaturan RTP (Win Rate)</h3>
                                <div className="flex flex-col gap-2">
                                    <button onClick={() => setRtpMode('RUNGKAD')} className={`flex items-center justify-between p-2 rounded border transition-all ${rtpMode === 'RUNGKAD' ? 'bg-red-900/60 border-red-500' : 'bg-black/20 border-white/5 hover:bg-black/40'}`}><div className="flex flex-col items-start"><span className="text-xs font-bold text-red-400">MODE RUNGKAD</span><span className="text-[10px] text-gray-400">Sangat Sulit (96% Junk)</span></div>{rtpMode === 'RUNGKAD' && <CheckCircle size={16} className="text-red-500" />}</button>
                                    <button onClick={() => setRtpMode('NORMAL')} className={`flex items-center justify-between p-2 rounded border transition-all ${rtpMode === 'NORMAL' ? 'bg-yellow-900/60 border-yellow-500' : 'bg-black/20 border-white/5 hover:bg-black/40'}`}><div className="flex flex-col items-start"><span className="text-xs font-bold text-yellow-400">MODE NORMAL</span><span className="text-[10px] text-gray-400">Volatilitas Tinggi (Standard)</span></div>{rtpMode === 'NORMAL' && <CheckCircle size={16} className="text-yellow-500" />}</button>
                                    <button onClick={() => setRtpMode('GACOR')} className={`flex items-center justify-between p-2 rounded border transition-all ${rtpMode === 'GACOR' ? 'bg-green-900/60 border-green-500' : 'bg-black/20 border-white/5 hover:bg-black/40'}`}><div className="flex flex-col items-start"><span className="text-xs font-bold text-green-400">MODE GACOR</span><span className="text-[10px] text-gray-400">Mudah Menang (Demo Feel)</span></div>{rtpMode === 'GACOR' && <CheckCircle size={16} className="text-green-500" />}</button>
                                </div>
                            </div>
                            <div className="bg-black/30 p-3 rounded border border-purple-500/30">
                                <h3 className="text-sm font-bold text-purple-300 mb-2">Buat Kode Voucher</h3>
                                <div className="flex flex-col gap-2">
                                    <input type="text" placeholder="Kode (e.g. BONUS100)" className="bg-black/40 border border-gray-600 rounded p-2 text-xs text-white uppercase" value={newVoucherCode} onChange={e => setNewVoucherCode(e.target.value.toUpperCase())} />
                                    <div className="flex gap-2"><input type="number" placeholder="Nominal" className="bg-black/40 border border-gray-600 rounded p-2 text-xs text-white flex-1" value={newVoucherAmount} onChange={e => setNewVoucherAmount(e.target.value)} /><button onClick={handleCreateVoucher} className="bg-purple-600 text-white px-4 py-2 rounded text-xs font-bold">Buat</button></div>
                                </div>
                            </div>
                            <h3 className="text-sm font-bold text-[#ffb703] mt-2">Permintaan Pending</h3>
                            <div className="flex flex-col gap-2 max-h-48 overflow-y-auto">{transactions.filter(t => t.status === 'PENDING').length === 0 ? <div className="text-center text-gray-500 text-xs py-4">Tidak ada permintaan pending.</div> : transactions.filter(t => t.status === 'PENDING').map(tx => (<div key={tx.id} className="bg-black/40 p-2 rounded border border-gray-700 flex justify-between items-center"><div><div className={`text-xs font-bold ${tx.type === 'DEPOSIT' ? 'text-green-400' : 'text-red-400'}`}>{tx.type}</div><div className="text-sm">{tx.amount.toLocaleString()}</div></div><div className="flex gap-2"><button onClick={() => handleApproveTransaction(tx.id, tx.type, tx.amount)} className="p-1 bg-green-800 rounded hover:bg-green-700"><CheckCircle size={16} /></button><button onClick={() => handleRejectTransaction(tx.id, tx.type, tx.amount)} className="p-1 bg-red-800 rounded hover:bg-red-700"><XCircle size={16} /></button></div></div>))}</div>
                        </div>
                    )}

                    {!activeModal && (
                        <>
                            {/* NEW: Leaderboard, Achievement, Shop, Referral Buttons */}
                            <div className="grid grid-cols-4 gap-2 mb-2">
                                <button onClick={() => { playSound('click'); setActiveModal('leaderboard'); }} className="bg-black/30 hover:bg-black/50 border border-yellow-500/30 p-2 rounded flex flex-col items-center gap-1">
                                    <Trophy size={16} className="text-yellow-400" />
                                    <span className="text-[9px] font-bold text-yellow-100">Top</span>
                                </button>
                                <button onClick={() => { playSound('click'); setActiveModal('achievements'); }} className="bg-black/30 hover:bg-black/50 border border-purple-500/30 p-2 rounded flex flex-col items-center gap-1">
                                    <Medal size={16} className="text-purple-400" />
                                    <span className="text-[9px] font-bold text-purple-100">Misi</span>
                                </button>
                                <button onClick={() => { playSound('click'); setActiveModal('shop'); }} className="bg-black/30 hover:bg-black/50 border border-blue-500/30 p-2 rounded flex flex-col items-center gap-1">
                                    <Palette size={16} className="text-blue-400" />
                                    <span className="text-[9px] font-bold text-blue-100">Shop</span>
                                </button>
                                <button onClick={() => { playSound('click'); setActiveModal('inbox'); }} className="bg-black/30 hover:bg-black/50 border border-green-500/30 p-2 rounded flex flex-col items-center gap-1 relative">
                                    <Bell size={16} className="text-green-400" />
                                    {state.notifications.some(n => !n.isRead) && <div className="absolute top-1 right-2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />}
                                    <span className="text-[9px] font-bold text-green-100">Inbox</span>
                                </button>
                            </div>

                            <div className="bg-black/30 p-2 rounded-lg border border-white/10 mb-2 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                   <Calendar size={16} className="text-blue-400"/>
                                   <span className="text-xs font-bold text-gray-300">ABSENSI HARIAN</span>
                                </div>
                                <button onClick={() => handleCheckIn(currentStreakIdx)} disabled={!isCheckInAvailable} className={`px-3 py-1 text-[10px] font-bold rounded ${isCheckInAvailable ? 'bg-blue-600 text-white animate-pulse' : 'bg-gray-700 text-gray-500'}`}>
                                    {isCheckInAvailable ? `KLAIM HARI ${currentStreakIdx + 1}` : `HARI ${currentStreakIdx + 1} SELESAI`}
                                </button>
                            </div>

                             {/* --- PIGGY BANK WIDGET --- */}
                            <div className="bg-gradient-to-r from-pink-900/60 to-purple-900/60 p-2 rounded-lg border border-pink-500/30 mb-2 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-pink-600 rounded-full shadow-lg animate-bounce">
                                        <PiggyBank size={18} className="text-white" />
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold text-pink-300">CELENGAN ANDA</span>
                                        <span className="text-sm font-black text-white">{state.piggyBankBalance.toFixed(0)}</span>
                                    </div>
                                </div>
                                <button onClick={handleBreakPiggyBank} className="px-3 py-1 bg-pink-600 hover:bg-pink-500 text-white text-[10px] font-bold rounded shadow-lg active:scale-95 flex items-center gap-1">
                                    PECAHKAN <span className="text-[8px] opacity-70">(-{PIGGY_BREAK_COST})</span>
                                </button>
                            </div>

                            <div className="flex gap-2 mb-2">
                                <button onClick={() => { playSound('click'); setIsMusicPlaying(!isMusicPlaying); }} className={`flex-1 p-3 rounded-lg border flex items-center justify-center gap-2 transition-colors ${isMusicPlaying ? 'bg-[#ffb703] text-[#660708] border-[#ffb703]' : 'bg-[#2a0a0a] border-gray-600 text-gray-400'}`}>{isMusicPlaying ? <Volume2 size={20} /> : <VolumeX size={20} />}<span className="text-xs font-bold">{isMusicPlaying ? 'MUSIC ON' : 'MUSIC OFF'}</span></button>
                                {isAdmin && <button onClick={() => { playSound('click'); setActiveModal('admin'); }} className="flex-1 bg-gradient-to-r from-gray-800 to-gray-900 border border-white/20 p-3 rounded-lg flex items-center justify-center gap-2 shadow-lg"><LayoutDashboard size={20} className="text-white" /><span className="font-bold text-white text-xs">DASHBOARD</span></button>}
                            </div>

                            <div className="bg-gradient-to-br from-[#1e3a8a] to-[#1e293b] p-3 rounded-lg border border-blue-500/30 mb-2">
                                <div className="flex items-center gap-2 mb-3"><Crown size={16} className="text-blue-300" /><span className="text-xs font-bold text-blue-200">MISI & BONUS</span></div>
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                    <button onClick={() => { playSound('click'); setActiveModal('lucky_wheel'); }} disabled={!isLuckyWheelReady} className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all active:scale-95 ${isLuckyWheelReady ? 'bg-gradient-to-b from-orange-600 to-red-600 border-orange-400 text-white shadow-lg animate-pulse' : 'bg-black/40 border-gray-600 text-gray-500 cursor-not-allowed grayscale'}`}><Disc size={20} className={isLuckyWheelReady ? 'text-white' : 'text-gray-500'} /><div className="flex flex-col items-center leading-none mt-1"><span className="text-[10px] font-bold">LUCKY SPIN</span>{isLuckyWheelReady ? <span className="text-xs font-black text-white">PLAY</span> : <span className="text-[10px] font-mono">{formatTimeLeft(timeLeftLuckyWheel)}</span>}</div></button>
                                    <button onClick={startWatchAd} className="bg-gradient-to-b from-blue-600 to-blue-800 border border-blue-400 p-3 rounded-lg shadow-lg flex flex-col items-center justify-center gap-1 transition-transform active:scale-95 hover:brightness-110"><PlayCircle size={20} className="text-blue-200" /><div className="flex flex-col items-center leading-none mt-1"><span className="text-[10px] font-bold text-white">TONTON IKLAN</span><span className="text-xs font-black text-blue-200">+50 COINS</span></div></button>
                                </div>
                                <div className="bg-black/30 p-2 rounded border border-blue-400/30">
                                    <div className="flex justify-between items-center mb-1"><div className="flex items-center gap-1"><Target size={14} className="text-yellow-400" /><span className="text-[10px] font-bold text-gray-300">TARGET DEPOSIT HARIAN</span></div><span className="text-[10px] font-mono text-blue-300">{state.dailyDepositTotal.toLocaleString()} IDR</span></div>
                                    <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden mb-2 relative"><div className="h-full bg-gradient-to-r from-yellow-400 to-red-500 transition-all duration-500" style={{ width: `${progressPercent}%` }} /><div className="absolute top-0 bottom-0 left-[33%] w-0.5 bg-black/50" /><div className="absolute top-0 bottom-0 left-[100%] w-0.5 bg-black/50" /></div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button onClick={() => handleClaimDailyTarget(1)} disabled={!tier1Claimable || state.claimedDailyTargets.includes(1)} className={`p-1 rounded text-[10px] font-bold border transition-all ${state.claimedDailyTargets.includes(1) ? 'bg-gray-700 text-gray-400 border-gray-600' : tier1Claimable ? 'bg-yellow-600 text-white border-yellow-400 animate-pulse' : 'bg-black/40 text-gray-500 border-gray-700'}`}>{state.claimedDailyTargets.includes(1) ? 'DIKLAIM' : '10K: +3 SPINS'}</button>
                                        <button onClick={() => handleClaimDailyTarget(2)} disabled={!tier2Claimable || state.claimedDailyTargets.includes(2)} className={`p-1 rounded text-[10px] font-bold border transition-all ${state.claimedDailyTargets.includes(2) ? 'bg-gray-700 text-gray-400 border-gray-600' : tier2Claimable ? 'bg-yellow-600 text-white border-yellow-400 animate-pulse' : 'bg-black/40 text-gray-500 border-gray-700'}`}>{state.claimedDailyTargets.includes(2) ? 'DIKLAIM' : '30K: +5 SPINS'}</button>
                                    </div>
                                    <div className="text-[9px] text-center text-gray-500 mt-1 italic">Reset setiap 00:00 WIB</div>
                                </div>
                            </div>
                            <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 p-3 rounded-lg border border-purple-500/30 mb-2">
                                <div className="flex items-center gap-2 mb-2"><Gift size={16} className="text-purple-300" /><span className="text-xs font-bold text-purple-200">KLAIM KODE BONUS</span></div>
                                <div className="flex gap-2"><input type="text" value={bonusCodeInput} onChange={(e) => { setBonusCodeInput(e.target.value.toUpperCase()); setErrorMessage(null); }} placeholder="Masukkan Kode" className="flex-1 bg-black/40 border border-gray-600 rounded px-2 py-2 text-sm text-white focus:border-purple-400 outline-none uppercase placeholder:text-gray-500" /><button onClick={handleClaimBonus} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm rounded transition-colors active:scale-95">KLAIM</button></div>
                                {errorMessage && !transactionAmount && <div className="text-[10px] text-red-400 mt-1 font-bold animate-pulse">{errorMessage}</div>}
                            </div>
                            <div className="grid grid-cols-2 gap-3 mb-2">
                                <button onClick={() => { playSound('click'); setActiveModal('deposit'); }} className="bg-green-700 hover:bg-green-600 border border-green-400 p-4 rounded-lg flex flex-col items-center gap-2 transition-transform active:scale-95 shadow-lg"><ArrowDownCircle size={32} className="text-green-200" /><span className="font-bold text-sm">ISI SALDO</span></button>
                                <button onClick={() => { playSound('click'); setActiveModal('withdraw'); }} className="bg-red-700 hover:bg-red-600 border border-red-400 p-4 rounded-lg flex flex-col items-center gap-2 transition-transform active:scale-95 shadow-lg"><ArrowUpCircle size={32} className="text-red-200" /><span className="font-bold text-sm">TARIK SALDO</span></button>
                            </div>
                            <div className="flex flex-col gap-2">
                                <button onClick={() => { playSound('click'); setActiveModal('about'); }} className="flex items-center gap-3 p-3 bg-[#2a0a0a] border border-[#ffb703]/30 rounded hover:bg-[#3a0a0a]"><Info size={20} className="text-[#ffb703]" /><span>About</span></button>
                                <button onClick={() => { playSound('click'); setActiveModal('disclaimer'); }} className="flex items-center gap-3 p-3 bg-[#2a0a0a] border border-[#ffb703]/30 rounded hover:bg-[#3a0a0a]"><Shield size={20} className="text-[#ffb703]" /><span>Disclaimer</span></button>
                                <button onClick={() => { playSound('click'); setActiveModal('privacy'); }} className="flex items-center gap-3 p-3 bg-[#2a0a0a] border border-[#ffb703]/30 rounded hover:bg-[#3a0a0a]"><FileText size={20} className="text-[#ffb703]" /><span>Privacy Policy</span></button>
                            </div>
                            <button onClick={openTelegram} className="mt-4 bg-[#0088cc] hover:bg-[#0077b5] text-white p-3 rounded-lg flex items-center justify-center gap-2 font-bold shadow-lg active:scale-95 border border-blue-300"><MessageCircle size={20} />Chat Telegram</button>
                        </>
                    )}

                    {activeModal === 'history' && (
                        <div className="flex flex-col gap-3 h-full animate-in fade-in">
                            {transactions.length === 0 ? <div className="text-center text-gray-400 py-10 italic">Belum ada transaksi.</div> : transactions.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((tx) => (<div key={tx.id} className="bg-black/30 p-3 rounded border border-white/10 flex justify-between items-center"><div className="flex flex-col gap-1"><div className="flex items-center gap-2">{tx.type === 'DEPOSIT' ? <ArrowDownCircle size={16} className="text-green-400" /> : tx.type === 'WITHDRAW' ? <ArrowUpCircle size={16} className="text-red-400" /> : <Gift size={16} className="text-purple-400" />}<span className={`font-bold text-sm ${tx.type === 'DEPOSIT' ? 'text-green-400' : tx.type === 'WITHDRAW' ? 'text-red-400' : 'text-purple-400'}`}>{tx.type.replace('_', ' ')}</span></div><span className="text-[10px] text-gray-400 font-mono">{tx.displayDate}</span></div><div className="text-right"><div className="font-bold">{tx.amount > 0 ? tx.amount.toLocaleString() : (tx.details || 'Reward')}</div><div className={`text-[10px] px-1.5 rounded inline-block font-bold ${tx.status === 'SUCCESS' ? 'text-green-500 bg-green-900/30' : tx.status === 'REJECTED' ? 'text-red-500 bg-red-900/30' : 'text-yellow-500 bg-yellow-900/30'}`}>{tx.status}</div></div></div>))}
                            <div className="flex gap-2 mt-auto"><button onClick={() => { playSound('click'); setActiveModal('profile'); }} className="flex-1 py-3 bg-gray-700 text-gray-300 rounded font-bold">Kembali ke Profil</button><button onClick={() => { playSound('click'); setActiveModal(null); }} className="flex-1 py-3 bg-[#ffb703] text-[#660708] rounded font-bold">Tutup</button></div>
                        </div>
                    )}
                    {/* ... (Existing modals: deposit, payment_qris, withdraw, buy_feature_confirm, static pages) ... */}
                    {activeModal === 'deposit' && (
                        <div className="flex flex-col gap-4 animate-in fade-in">
                            <div className="flex items-center gap-2 bg-[#2a0a0a] p-3 rounded border border-[#ffb703]/50"><Wallet className="text-[#ffb703]" /><div className="flex flex-col"><span className="text-xs text-gray-400">Saldo Saat Ini</span><span className="text-lg font-bold">{state.balance.toLocaleString()}</span></div></div>
                            <div className="flex flex-col gap-2"><label className="text-sm font-bold text-[#ffb703]">Pilih Nominal Deposit</label><div className="grid grid-cols-2 gap-2">{DEPOSIT_OPTIONS.map((opt) => (<button key={opt} onClick={() => { playSound('click'); setTransactionAmount(opt.toString()); }} className={`p-3 rounded border text-sm font-bold transition-all active:scale-95 ${transactionAmount === opt.toString() ? 'bg-[#ffb703] text-[#660708] border-[#ffb703] shadow-[0_0_10px_#ffb703]' : 'bg-black/30 border-gray-600 hover:bg-black/50'}`}>{opt.toLocaleString()}</button>))}</div></div>
                            <div className="flex gap-2 mt-2"><button onClick={() => { playSound('click'); setActiveModal(null); }} className="flex-1 py-3 bg-gray-700 rounded font-bold text-gray-300">Batal</button><button onClick={handleTransaction} disabled={!transactionAmount} className="flex-1 py-3 bg-[#ffb703] text-[#660708] rounded font-bold hover:bg-[#e0a102] disabled:opacity-50 disabled:grayscale">Lanjut Bayar</button></div>
                        </div>
                    )}
                    {activeModal === 'payment_qris' && (
                         <div className="flex flex-col gap-4 items-center animate-in fade-in relative">
                             {isVerifyingPayment && <div className="absolute inset-0 bg-black/80 z-10 flex flex-col items-center justify-center backdrop-blur-sm rounded-lg"><Loader2 size={48} className="text-[#ffb703] animate-spin mb-2" /><span className="text-white font-bold animate-pulse">Memverifikasi Pembayaran...</span></div>}
                             <div className="bg-white p-2 rounded-lg"><div className="w-48 h-48 bg-gray-200 flex items-center justify-center text-black font-bold border-4 border-black"><img src="/qris.jpg" alt="QRIS CODE" className="w-full h-full object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement!.innerText = 'SCAN QRIS'; }} /></div></div>
                             <div className="text-center space-y-1"><p className="text-yellow-400 font-bold text-sm uppercase">Wajib lakukan pembayaran sesuai nominal!</p><p className="text-2xl font-black text-white">{parseInt(transactionAmount).toLocaleString()}</p></div>
                             <div className="flex items-center gap-2 bg-red-900/50 px-4 py-2 rounded-full border border-red-500"><Clock size={16} className="text-red-300 animate-pulse" /><span className="font-mono text-xl font-bold text-red-100">{formatTime(paymentTimer)}</span></div>
                             <button onClick={handleConfirmPayment} disabled={isVerifyingPayment} className="w-full py-3 bg-green-600 text-white rounded font-bold hover:bg-green-500 shadow-lg mt-2 active:scale-95 disabled:opacity-50">Saya Sudah Bayar</button>
                         </div>
                    )}
                    {activeModal === 'withdraw' && (
                        <div className="flex flex-col gap-4">
                            {!withdrawalAccount ? (
                                <div className="flex flex-col gap-3 animate-in fade-in">
                                    <div className="bg-yellow-900/30 p-3 rounded border border-yellow-700/50 text-xs text-yellow-200">Wajib ikat akun penarikan sebelum melakukan transaksi.</div>
                                    <div className="flex flex-col gap-1"><label className="text-xs text-gray-400">Metode</label><div className="grid grid-cols-3 gap-2">{['DANA', 'OVO', 'GOPAY'].map(m => (<button key={m} onClick={() => { playSound('click'); setTempBindData({...tempBindData, method: m}); }} className={`p-2 rounded border text-sm font-bold transition-all ${tempBindData.method === m ? 'scale-105 shadow-lg border-white' : 'opacity-60 grayscale hover:grayscale-0'} ${m === 'DANA' ? 'bg-[#118EE9] text-white' : m === 'OVO' ? 'bg-[#4C3494] text-white' : 'bg-[#00AED6] text-white'}`}>{m}</button>))}</div></div>
                                    <div className="flex flex-col gap-1"><label className="text-xs text-gray-400">Nomor Akun</label><input type="text" value={tempBindData.number} onChange={(e) => setTempBindData({...tempBindData, number: e.target.value})} placeholder="Contoh: 081234567890" className="bg-black/30 border border-gray-600 p-2 rounded text-white focus:border-[#ffb703] outline-none" /></div>
                                    <div className="flex flex-col gap-1"><label className="text-xs text-gray-400">Nama Pemilik Akun</label><input type="text" value={tempBindData.name} onChange={(e) => setTempBindData({...tempBindData, name: e.target.value})} placeholder="Nama Lengkap" className="bg-black/30 border border-gray-600 p-2 rounded text-white focus:border-[#ffb703] outline-none" /></div>
                                    <button onClick={handleBindAccount} disabled={!tempBindData.number || !tempBindData.name} className="mt-2 py-3 bg-[#ffb703] text-[#660708] rounded font-bold shadow hover:bg-[#e0a102] disabled:opacity-50 disabled:grayscale">Simpan Akun</button>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-4 animate-in fade-in">
                                     <div className="flex items-center justify-between bg-[#2a0a0a] p-3 rounded border border-[#ffb703]/50"><div className="flex items-center gap-2"><Wallet className="text-[#ffb703]" size={20} /><div className="flex flex-col"><span className="text-xs text-gray-400">Saldo</span><span className="text-base font-bold">{state.balance.toLocaleString()}</span></div></div><div className="flex flex-col items-end"><span className={`text-[10px] px-2 py-0.5 rounded border font-bold text-white mb-0.5 ${withdrawalAccount.method === 'DANA' ? 'bg-[#118EE9] border-[#118EE9]' : withdrawalAccount.method === 'OVO' ? 'bg-[#4C3494] border-[#4C3494]' : 'bg-[#00AED6] border-[#00AED6]'}`}>{withdrawalAccount.method}</span><span className="text-xs text-gray-300">{withdrawalAccount.number}</span></div></div>
                                    <div className="flex flex-col gap-2"><label className="text-sm font-bold text-[#ffb703]">Pilih Nominal Penarikan</label><div className="grid grid-cols-2 gap-2">{WITHDRAWAL_OPTIONS.map((opt) => (<button key={opt} onClick={() => { playSound('click'); setTransactionAmount(opt.toString()); setErrorMessage(null); }} className={`p-3 rounded border text-sm font-bold transition-all active:scale-95 ${transactionAmount === opt.toString() ? 'bg-[#ffb703] text-[#660708] border-[#ffb703] shadow-[0_0_10px_#ffb703]' : 'bg-black/30 border-gray-600 hover:bg-black/50'}`}>{opt.toLocaleString()}</button>))}</div></div>
                                    {transactionAmount && <div className="bg-red-900/30 p-2 rounded border border-red-800/50 flex flex-col gap-1 text-xs"><div className="flex justify-between text-gray-400"><span>Nominal:</span><span>{parseInt(transactionAmount).toLocaleString()}</span></div><div className="flex justify-between text-gray-400"><span>Biaya Admin:</span><span>{WITHDRAWAL_FEE.toLocaleString()}</span></div><div className="border-t border-red-800/50 my-1"></div><div className="flex justify-between font-bold text-red-300"><span>Total Potongan:</span><span>{(parseInt(transactionAmount) + WITHDRAWAL_FEE).toLocaleString()}</span></div></div>}
                                    {errorMessage && <div className="text-[10px] text-red-400 font-bold bg-red-900/20 p-2 rounded border border-red-500/30 animate-pulse">{errorMessage}</div>}
                                    <div className="flex gap-2 mt-2"><button onClick={() => { playSound('click'); setActiveModal(null); }} className="flex-1 py-3 bg-gray-700 rounded font-bold text-gray-300">Batal</button><button onClick={handleTransaction} disabled={!transactionAmount} className="flex-1 py-3 bg-[#ffb703] text-[#660708] rounded font-bold hover:bg-[#e0a102] disabled:opacity-50 disabled:grayscale">Tarik Sekarang</button></div>
                                </div>
                            )}
                        </div>
                    )}
                    {activeModal === 'buy_feature_confirm' && (
                        <div className="flex flex-col gap-4 animate-in fade-in">
                            <div className="text-center"><h3 className="text-lg font-bold text-[#ffb703]">Beli Fitur Scatter</h3><p className="text-sm text-gray-300 mt-2">Dapatkan 10 Free Spins instan dengan harga:</p><div className="text-2xl font-black text-white mt-1 drop-shadow-md">{(state.bet * BUY_FEATURE_COST_MULTIPLIER).toLocaleString()}</div></div>
                            {errorMessage && <div className="text-xs text-red-400 text-center font-bold bg-red-900/30 p-2 rounded">{errorMessage}</div>}
                            <div className="flex gap-2 mt-2"><button onClick={() => { playSound('click'); setActiveModal(null); }} className="flex-1 py-3 bg-gray-700 rounded font-bold text-gray-300">Batal</button><button onClick={confirmBuyFeature} className="flex-1 py-3 bg-gradient-to-r from-red-600 to-red-800 text-white rounded font-bold hover:brightness-110 shadow-lg">BELI</button></div>
                        </div>
                    )}
                    {(activeModal === 'about' || activeModal === 'disclaimer' || activeModal === 'privacy') && (
                        <div className="flex flex-col gap-4 text-sm text-gray-300 animate-in fade-in">
                             <div className="bg-black/30 p-4 rounded border border-white/10 h-64 overflow-y-auto">
                                 {activeModal === 'about' && <p>PLAYCASH adalah permainan slot dengan volatilitas tinggi. Nikmati sensasi kemenangan besar dengan fitur cascading dan multiplier yang meningkat.</p>}
                                 {activeModal === 'disclaimer' && <p>Permainan ini hanya untuk tujuan hiburan. Harap bermain dengan bertanggung jawab.</p>}
                                 {activeModal === 'privacy' && <p>Kami menghormati privasi Anda. Data permainan disimpan secara aman.</p>}
                             </div>
                             <button onClick={() => { playSound('click'); setActiveModal(null); }} className="w-full py-3 bg-[#ffb703] text-[#660708] rounded font-bold">Kembali</button>
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* --- HEADER --- */}
      <div className="w-full max-w-md flex justify-between items-center z-10 mb-2 px-2 mt-8">
        <button onClick={handleMenuClick} className="bg-[#660708] p-2 rounded-lg border-2 border-[#ffb703] shadow-lg active:scale-95 transition-transform">
          <Menu className="text-[#ffb703]" size={24} />
        </button>
        <div className="flex items-center gap-2">
             {state.freeSpinsLeft > 0 && <div className="bg-red-600 px-3 py-1 rounded-full border border-yellow-400 text-xs font-bold animate-pulse shadow-lg">FREE SPINS: {state.freeSpinsLeft}</div>}
            <button onClick={() => { playSound('click'); setIsMenuOpen(true); setActiveModal('profile'); }} className={`bg-[#2a0a0a] p-1 pr-3 rounded-full border border-[#ffb703]/50 flex items-center gap-2 hover:bg-[#3a0a0a] transition-colors`}>
                <div className={`w-8 h-8 rounded-full border border-white flex items-center justify-center ${activeFrame ? activeFrame.assetUrl : ''} overflow-hidden`}>
                    {userProfile.avatar ? <img src={userProfile.avatar} alt="User" className="w-full h-full object-cover" /> : <User size={16} className={userProfile.rank.color} />}
                </div>
                <div className="flex flex-col items-start leading-none"><span className="text-[10px] text-gray-400">Rank</span><span className={`text-xs font-bold ${userProfile.rank.color}`}>{userProfile.rank.name}</span></div>
            </button>
        </div>
      </div>

      {/* --- JACKPOT DISPLAY --- */}
      <div className="w-full max-w-md bg-gradient-to-r from-red-900 to-black p-2 mb-2 rounded border border-[#ffb703] flex items-center justify-between shadow-lg relative overflow-hidden">
          <div className="flex items-center gap-2 relative z-10">
              <div className="p-1.5 bg-[#ffb703] rounded"><Crown size={20} className="text-[#660708]" /></div>
              <div className="flex flex-col leading-none">
                  <span className="text-[10px] font-bold text-yellow-200 tracking-wider">GRAND JACKPOT</span>
                  <span className="text-xl font-black text-white drop-shadow-[0_2px_2px_rgba(255,183,3,0.8)] font-mono">{jackpotValue.toLocaleString()}</span>
              </div>
          </div>
          <div className="absolute inset-0 bg-yellow-400/10 animate-pulse pointer-events-none" />
      </div>

      {/* --- MAIN GAME CONTAINER --- */}
      <div className="relative w-full max-w-md aspect-[9/16] bg-[#2a0a0a] rounded-xl border-4 border-[#660708] shadow-2xl overflow-hidden flex flex-col">
        <div className="bg-gradient-to-b from-[#660708] to-[#2a0a0a] p-2 flex justify-between items-center border-b-2 border-[#ffb703] z-20 shadow-md">
            <div className="flex flex-col"><span className="text-[10px] text-[#ffb703] font-bold tracking-wider">BALANCE</span><span className="text-xl font-black text-white drop-shadow-md">{state.balance.toLocaleString()}</span></div>
            <div className="flex gap-1 bg-black/40 p-1 rounded-lg border border-white/10">{MULTIPLIER_LEVELS.map((m) => (<div key={m} className={`w-8 h-8 flex items-center justify-center rounded font-black text-sm transition-all duration-300 ${state.multiplier === m ? 'bg-[#ffb703] text-[#660708] scale-110 shadow-[0_0_10px_#ffb703] z-10' : 'bg-[#2a0a0a] text-gray-500 opacity-60 scale-90'}`}>x{m}</div>))}</div>
        </div>

        {/* --- SLOT GRID --- */}
        <div className="flex-1 bg-[#2a0a0a] relative p-1 overflow-hidden">
             <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 10px, #333 10px, #333 20px)' }} />
             <div className="relative z-10 flex h-full gap-1 border-4 border-[#ffb703] rounded-lg bg-black/60 p-1 shadow-inner">{grid.map((col, i) => (<SlotReel key={i} index={i} tiles={col} isSpinning={state.isSpinning} spinDelay={i * 100} />))}</div>
             <div className="absolute top-1/2 left-0 w-full h-0.5 bg-[#ffb703]/20 pointer-events-none z-0" />
             <button onClick={() => { if (!state.isSpinning && !state.isTumbling && state.freeSpinsLeft === 0) { playSound('click'); setIsMenuOpen(true); setActiveModal('buy_feature_confirm'); } }} disabled={state.isSpinning || state.freeSpinsLeft > 0} className="absolute left-2 top-1/2 -translate-y-1/2 z-30 flex flex-col items-center bg-gradient-to-r from-red-600 to-red-800 border-2 border-[#ffb703] rounded-lg p-1 shadow-lg active:scale-95 transition-transform hover:scale-105 disabled:opacity-50 disabled:grayscale"><div className="text-[8px] font-bold text-yellow-300 uppercase">BELI FITUR</div><ShoppingCart size={16} className="text-white my-1" /><div className="text-[10px] font-black text-white bg-black/40 px-1 rounded">{(state.bet * BUY_FEATURE_COST_MULTIPLIER).toLocaleString()}</div></button>
             
             {/* RTP LIVE WIDGET (Bottom Right of Grid) */}
             <div className="absolute bottom-2 right-2 z-30 bg-black/80 px-2 py-1 rounded border border-white/20 flex flex-col items-end">
                <span className="text-[8px] font-bold text-gray-400">RTP LIVE</span>
                <div className={`text-xs font-black ${liveRTP > 100 ? 'text-green-400' : liveRTP > 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {liveRTP.toFixed(1)}%
                </div>
             </div>

             {/* DOUBLE WIN FLOATING BUTTON */}
             {showDoubleWinBtn && state.currentWin > 0 && (
                 <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
                     <div className="flex flex-col items-center gap-2">
                         <div className="text-white font-bold text-sm uppercase animate-bounce">Win: {state.currentWin.toLocaleString()}</div>
                         <button onClick={() => triggerAd('DOUBLE_WIN', state.currentWin)} className="px-6 py-2 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full border-2 border-white shadow-[0_0_20px_purple] font-black text-white text-lg flex items-center gap-2 hover:scale-105 active:scale-95 transition-transform">
                             <Video size={20} /> 2X WIN
                         </button>
                         <button onClick={() => { setShowDoubleWinBtn(false); setTempWinAmount(0); }} className="text-xs text-gray-400 underline">No thanks</button>
                     </div>
                 </div>
             )}
        </div>

        <div className="h-8 bg-black/80 flex items-center justify-center border-t border-[#ffb703]/30 z-20"><span className={`font-bold tracking-widest text-sm animate-pulse ${state.currentWin > 0 ? 'text-[#ffb703]' : 'text-gray-400'}`}>{message}</span></div>

        <div className="bg-gradient-to-t from-[#660708] to-[#4a0404] p-3 border-t-2 border-[#ffb703] z-20 shadow-[0_-5px_15px_rgba(0,0,0,0.5)]">
            <div className="flex justify-between items-center gap-2">
                <div className="flex flex-col items-center gap-1 bg-black/30 p-1 rounded-lg border border-white/10 w-24"><span className="text-[10px] text-gray-400 font-bold">BET</span><div className="flex items-center justify-between w-full"><button onClick={() => adjustBet(-BET_STEP)} className="p-1 hover:bg-white/10 rounded-full active:scale-90"><Minus size={14} className="text-gray-300" /></button><span className="font-bold text-white">{state.bet}</span><button onClick={() => adjustBet(BET_STEP)} className="p-1 hover:bg-white/10 rounded-full active:scale-90"><Plus size={14} className="text-gray-300" /></button></div></div>
                <div className="relative group"><button onClick={() => handleSpin(false)} disabled={state.isSpinning || state.isTumbling} className={`w-20 h-20 rounded-full border-4 border-[#ffb703] shadow-[0_0_20px_#ffb703] flex items-center justify-center transition-all duration-100 active:scale-95 ${state.freeSpinsLeft > 0 ? 'bg-red-600 animate-pulse' : 'bg-gradient-to-b from-[#ffb703] to-[#e85d04] hover:brightness-110'} disabled:opacity-80 disabled:cursor-not-allowed`}>{state.isSpinning ? (<Square size={32} className="text-[#660708] fill-current animate-spin" />) : state.freeSpinsLeft > 0 ? (<div className="flex flex-col items-center leading-none"><span className="text-xl font-black text-white">{state.freeSpinsLeft}</span><span className="text-[8px] font-bold text-white">AUTO</span></div>) : autoSpinCount > 0 ? (<div className="flex flex-col items-center leading-none"><span className="text-xl font-black text-[#660708]">{autoSpinCount}</span></div>) : (<RotateCw size={40} className="text-[#660708] drop-shadow-sm" />)}</button></div>
                <div className="flex flex-col gap-2 w-24"><div className="relative"><button onClick={handleAutoSpinClick} className={`w-full flex items-center justify-center gap-1 py-1.5 rounded-lg border text-xs font-bold transition-colors active:scale-95 ${autoSpinCount > 0 ? 'bg-red-600 border-red-400 text-white animate-pulse' : 'bg-black/30 border-gray-600 text-gray-300 hover:bg-black/50'}`}>{autoSpinCount > 0 ? 'STOP' : 'AUTO'}</button>{isAutoMenuOpen && (<div className="absolute bottom-full left-0 mb-2 w-full bg-[#2a0a0a] border border-[#ffb703] rounded-lg shadow-xl overflow-hidden animate-in zoom-in-95 z-50">{AUTO_SPIN_OPTIONS.map(opt => (<button key={opt} onClick={() => selectAutoSpin(opt)} className="w-full py-2 text-xs font-bold text-white hover:bg-[#ffb703] hover:text-[#660708] border-b border-white/10 last:border-0">{opt}x</button>))}</div>)}</div><button onClick={() => { if (!state.isSpinning) { playSound('click'); setIsTurbo(!isTurbo); } }} className={`flex items-center justify-center gap-1 py-1.5 rounded-lg border text-xs font-bold transition-colors active:scale-95 ${isTurbo ? 'bg-[#ffb703] border-[#ffb703] text-[#660708] shadow-[0_0_10px_#ffb703]' : 'bg-black/30 border-gray-600 text-gray-300 hover:bg-black/50'}`}><Zap size={12} className={isTurbo ? 'fill-current' : ''} />TURBO</button></div>
            </div>
            <div className="mt-2 bg-black/40 rounded p-1 flex justify-between px-3 items-center border border-white/5"><span className="text-[10px] text-gray-400">TOTAL WIN</span><span className="text-sm font-bold text-yellow-400">{state.currentWin.toLocaleString()}</span></div>
        </div>

        <button onClick={startWatchAd} disabled={state.isSpinning} className="absolute top-16 left-2 z-30 flex items-center gap-1 bg-gradient-to-r from-blue-600 to-blue-500 px-2 py-1 rounded-full border border-blue-300 shadow-lg active:scale-95 disabled:opacity-50 disabled:grayscale transition-all"><Video size={12} className="text-white" /><div className="flex flex-col leading-none"><span className="text-[8px] font-bold text-white">FREE +50</span></div></button>
      </div>
    </div>
  );
};

export default App;