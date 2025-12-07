import React from 'react';
import { TileData } from '../types';
import { Tile } from './Tile';
import { ROW_COUNT } from '../constants';

interface SlotReelProps {
  tiles: TileData[];
  isSpinning: boolean;
  spinDelay: number; // Delay to start stopping (cascading effect)
  index: number;
}

export const SlotReel: React.FC<SlotReelProps> = ({ tiles, isSpinning, spinDelay, index }) => {
  return (
    <div className="relative flex-1 bg-black/40 border-r border-gold/30 last:border-r-0 overflow-hidden h-full rounded-sm">
      <div className="flex flex-col h-full w-full p-1 gap-1">
        {isSpinning ? (
          // Spinning State: Blurred infinite scroll illusion
          <div 
            className="flex flex-col gap-1 w-full h-[200%] animate-spin-blur opacity-80"
            style={{ animationDuration: '0.2s', animationDelay: `${index * 0.05}s` }}
          >
            {/* Repeat a pattern to simulate blur */}
            {Array(ROW_COUNT * 3).fill(null).map((_, i) => (
              <div key={i} className="flex-1 min-h-[25%] rounded-lg bg-gradient-to-b from-slate-200 to-slate-300 border-b-4 border-slate-400 blur-[2px]" />
            ))}
          </div>
        ) : (
          // Static/Tumbling State
          tiles.map((tile) => (
            <div key={tile.id} className="h-1/4 w-full" style={{ minHeight: '25%' }}>
              <Tile data={tile} />
            </div>
          ))
        )}
      </div>
      
      {/* Reel Shadow Overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/50 pointer-events-none" />
    </div>
  );
};
