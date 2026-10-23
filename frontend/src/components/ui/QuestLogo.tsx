import React from 'react';

export const QuestLogo: React.FC<{ compact?: boolean; light?: boolean }> = ({
  compact = false,
  light = false,
}) => {
  return (
    <div className="flex items-center gap-3 select-none">
      <div className="w-10 h-10 rounded-xl bg-[#FF5A00] flex items-center justify-center shadow-sm shrink-0">
        <span className="text-white font-extrabold text-xl tracking-tighter">Q</span>
      </div>
      {!compact && (
        <div className="flex flex-col leading-tight">
          <div className="flex items-center gap-1.5">
            <span
              className={`font-extrabold text-base tracking-tight ${
                light ? 'text-white' : 'text-[#111111]'
              }`}
            >
              QUEST
            </span>
            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-[#FF5A00]/15 text-[#FF5A00]">
              2026
            </span>
          </div>
          <span
            className={`text-xs font-medium ${
              light ? 'text-zinc-400' : 'text-[#333333]'
            }`}
          >
            Playbook de Vendas
          </span>
        </div>
      )}
    </div>
  );
};

