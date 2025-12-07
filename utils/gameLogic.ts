
import { GridState, TileData, WinResult, SymbolType, ProbabilityWeights } from '../types';
import { SYMBOLS, SYMBOL_MAP, REEL_COUNT, ROW_COUNT, WEIGHTS } from '../constants';
import { v4 as uuidv4 } from 'uuid'; // We'll implement a simple ID generator if uuid is not available, but let's use a simple helper here.

const generateId = () => Math.random().toString(36).substring(2, 9);

/**
 * Weighted random symbol selector with dynamic weights
 */
export const getRandomSymbol = (currentWeights: ProbabilityWeights = WEIGHTS): string => {
  const rand = Math.random() * 100;
  
  // Determine category
  let category: SymbolType = SymbolType.LOW;
  if (rand < currentWeights.LOW) category = SymbolType.LOW;
  else if (rand < currentWeights.LOW + currentWeights.HIGH) category = SymbolType.HIGH;
  else if (rand < currentWeights.LOW + currentWeights.HIGH + currentWeights.WILD) category = SymbolType.WILD;
  else category = SymbolType.SCATTER;

  // Pick specific symbol from category
  const candidates = SYMBOLS.filter(s => s.type === category);
  const symbol = candidates[Math.floor(Math.random() * candidates.length)];
  return symbol.id;
};

/**
 * Generate a fresh full grid
 */
export const generateGrid = (currentWeights: ProbabilityWeights = WEIGHTS): GridState => {
  return Array(REEL_COUNT).fill(null).map(() => 
    Array(ROW_COUNT).fill(null).map(() => ({
      id: generateId(),
      symbolId: getRandomSymbol(currentWeights),
      isNew: true
    }))
  );
};

/**
 * Calculate Wins based on "Ways" logic (Left-to-Right adjacent reels)
 */
export const calculateWin = (grid: GridState, bet: number): WinResult => {
  const winningTileIds = new Set<string>();
  const winDetails: { symbolId: string; count: number; winAmount: number }[] = [];
  let totalWin = 0;

  // Check every paying symbol (excluding Scatter usually, handled separately, but let's assume Scatter pays or triggers. 
  // In typical Ways games, Scatter just triggers features. We will ignore Scatter for cash wins here unless specified).
  const payingSymbols = SYMBOLS.filter(s => s.type !== SymbolType.SCATTER && s.type !== SymbolType.WILD);

  payingSymbols.forEach(sym => {
    let consecutiveReels = 0;
    let symbolCountPerReel: number[] = [];
    let tileIdsChain: string[] = [];

    // 1. Check reels left to right
    for (let col = 0; col < REEL_COUNT; col++) {
      const columnTiles = grid[col];
      // Count matching symbols (Symbol itself OR Wild)
      const matchingTiles = columnTiles.filter(
        t => t.symbolId === sym.id || SYMBOL_MAP[t.symbolId].type === SymbolType.WILD
      );

      if (matchingTiles.length > 0) {
        consecutiveReels++;
        symbolCountPerReel.push(matchingTiles.length);
        matchingTiles.forEach(t => tileIdsChain.push(t.id));
      } else {
        break; // Chain broken
      }
    }

    // 2. Determine if it's a win (usually min 3 reels)
    if (consecutiveReels >= 3) {
      // Calculate Ways: Product of counts on active reels
      const ways = symbolCountPerReel.reduce((a, b) => a * b, 1);
      
      // Multiplier based on length (Simplified payout table)
      // 3 reels: 1x base, 4 reels: 2x base, 5 reels: 5x base
      let lengthMultiplier = 1;
      if (consecutiveReels === 4) lengthMultiplier = 2;
      if (consecutiveReels === 5) lengthMultiplier = 5;

      const winAmount = sym.value * lengthMultiplier * ways * (bet / 10); // Normalized bet calculation
      
      if (winAmount > 0) {
        totalWin += winAmount;
        winDetails.push({ symbolId: sym.id, count: consecutiveReels, winAmount });
        tileIdsChain.forEach(id => winningTileIds.add(id));
      }
    }
  });

  return {
    totalWin: Math.floor(totalWin),
    winningTileIds,
    winDetails
  };
};

/**
 * Process Tumble: Remove winners, drop down, fill top
 */
export const processTumble = (grid: GridState, winningIds: Set<string>, currentWeights: ProbabilityWeights = WEIGHTS): GridState => {
  const newGrid: GridState = [];

  for (let col = 0; col < REEL_COUNT; col++) {
    // 1. Keep non-winning tiles
    const remainingTiles = grid[col].filter(t => !winningIds.has(t.id));
    
    // 2. Count how many needed
    const needed = ROW_COUNT - remainingTiles.length;
    
    // 3. Generate new tiles for the top
    const newTiles: TileData[] = Array(needed).fill(null).map(() => ({
      id: generateId(),
      symbolId: getRandomSymbol(currentWeights),
      isNew: true
    }));

    // 4. Stack: New tiles on top, remaining on bottom
    // In DOM, first element is top. 
    newGrid.push([...newTiles, ...remainingTiles.map(t => ({ ...t, isNew: false }))]);
  }

  return newGrid;
};

export const countScatters = (grid: GridState): number => {
  let count = 0;
  grid.flat().forEach(t => {
    if (SYMBOL_MAP[t.symbolId].type === SymbolType.SCATTER) count++;
  });
  return count;
};
