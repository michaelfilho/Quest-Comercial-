import React from 'react';
import questSymbol from '../../assets/quest-symbol.svg';

export const QuestLogo: React.FC<{ compact?: boolean; light?: boolean }> = ({
  compact = false,
  light = false,
}) => {
  return (
    <div className="flex items-center gap-3 select-none" aria-label="Quest Seller">
      <img src={questSymbol} alt="" aria-hidden="true" className="w-10 h-10 object-contain shrink-0" />
      {!compact && (
        <div className="flex flex-col leading-tight">
          <div className="flex items-center gap-1.5">
            <span
              className={`font-extrabold text-base tracking-tight ${
                light ? 'text-white' : 'text-[#111111]'
              }`}
            >
              Quest Seller
            </span>
          </div>
          <span
            className={`text-xs font-medium ${
              light ? 'text-zinc-400' : 'text-[#333333]'
            }`}
          >
            Gestão Comercial
          </span>
        </div>
      )}
    </div>
  );
};

