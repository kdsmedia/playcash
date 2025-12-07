import React from 'react';
import { TileData, SymbolType } from '../types';
import { SYMBOL_MAP } from '../constants';

interface TileProps {
  data: TileData;
  className?: string;
}

export const Tile: React.FC<TileProps> = ({ data, className = '' }) => {
  const def = SYMBOL_MAP[data.symbolId];

  // Base style
  const baseStyle = "w-full h-full rounded-lg flex items-center justify-center shadow-md border-b-4 select-none relative overflow-hidden transition-all duration-300";
  const colorStyle = def.color;
  const borderColor = "border-black/20";
  
  // Specific styling based on type
  let content;
  if (def.type === SymbolType.WILD) {
    content = (
      <div className="flex flex-col items-center justify-center p-1 w-full h-full bg-yellow-500 border-4 border-yellow-300 rounded-lg animate-pulse">
         <span className="text-2xl font-black text-red-900 drop-shadow-md">WILD</span>
      </div>
    );
  } else if (def.type === SymbolType.SCATTER) {
    content = (
      <div className="flex flex-col items-center justify-center w-full h-full bg-red-700 border-2 border-gold rounded-lg shadow-[0_0_15px_rgba(255,215,0,0.5)]">
        <span className="text-3xl filter drop-shadow-lg">🀄</span>
        <span className="text-[10px] text-yellow-300 font-bold uppercase mt-1">Scatter</span>
      </div>
    );
  } else {
    // Regular tiles (Mahjong style)
    content = (
      <div className={`flex flex-col items-center justify-center w-full h-full border border-gray-300/50 rounded-md ${def.color}`}>
        <span className={`text-4xl ${def.textColor} drop-shadow-sm`}>{def.name}</span>
        {def.type === SymbolType.HIGH && (
          <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-yellow-400 animate-ping" />
        )}
      </div>
    );
  }

  return (
    <div 
      className={`
        ${baseStyle} 
        ${colorStyle} 
        ${borderColor} 
        ${data.isWinning ? 'animate-pop-out z-50' : ''}
        ${data.isNew ? 'animate-bounce-in' : ''}
        ${className}
      `}
    >
      {content}
      {/* Glossy overlay */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent pointer-events-none rounded-lg" />
    </div>
  );
};
