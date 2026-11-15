import React from 'react';
import type { Language } from '../types.ts';

interface LanguageSwitcherProps {
  lang: Language;
  onChange: (lang: Language) => void;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({ lang, onChange }) => {
  return (
    <div
      role="group"
      aria-label="Language Switcher"
      className="inline-flex items-center p-0.5 rounded-xl bg-[#121826] border border-white/10 shrink-0"
    >
      <button
        type="button"
        onClick={() => onChange('en')}
        className={`min-h-[40px] min-w-[40px] px-2 sm:px-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
          lang === 'en' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => onChange('my')}
        className={`min-h-[40px] min-w-[44px] px-2 sm:px-2.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
          lang === 'my' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
        }`}
      >
        မြန်မာ
      </button>
    </div>
  );
};
