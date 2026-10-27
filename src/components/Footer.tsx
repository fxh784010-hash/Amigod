import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-neutral-950 border-t border-neutral-900 px-4 py-2 text-center text-xs text-neutral-500 font-mono select-none">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-1">
        <span className="text-emerald-500/80 font-semibold tracking-wider">
          BUILD IT. TUNE IT. HEAR IT.
        </span>
        <span>
          © FX HAMZA — FX ENGINE LAB
        </span>
      </div>
    </footer>
  );
};
