import React from 'react';
import { createAvatarSvg, SVG_FRAME_TEMPLATES } from '../utils/gameArtworks.ts';

interface AvatarWithFrameProps {
  avatarUrl?: string; frameId?: string; frames?: any[]; displayName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'; status?: 'online' | 'offline' | 'ingame';
}
const SIZE_MAP = {
  xs: { box: 'w-7 h-7', pad: 'p-[2px]', badge: 'text-[8px] -bottom-1 -right-1' },
  sm: { box: 'w-9 h-9', pad: 'p-[2.5px]', badge: 'text-[9px] -bottom-1 -right-1' },
  md: { box: 'w-12 h-12', pad: 'p-[3px]', badge: 'text-[11px] -bottom-1 -right-1' },
  lg: { box: 'w-16 h-16', pad: 'p-[3.5px]', badge: 'text-xs -bottom-1 -right-1' },
  xl: { box: 'w-24 h-24', pad: 'p-[4px]', badge: 'text-sm -bottom-1 -right-1' },
};
export const AvatarWithFrame: React.FC<AvatarWithFrameProps> = ({ avatarUrl, frameId = 'bronze', displayName = 'Player', size = 'md', status }) => {
  const tpl = SVG_FRAME_TEMPLATES.find((f) => f.id === frameId) || SVG_FRAME_TEMPLATES[0];
  const dims = SIZE_MAP[size] || SIZE_MAP.md;
  const gradId = 'frameGrad_' + tpl.id + '_' + size;
  const fallbackSrc = createAvatarSvg(displayName);
  const isLegend = tpl.id === 'legend';
  return (
    <div className={'relative inline-flex items-center justify-center shrink-0 ' + dims.box + (isLegend ? ' mr-legend-frame' : '')}>
      {isLegend && <svg viewBox="0 0 120 120" className="mr-legend-aura absolute inset-[-13%] w-[126%] h-[126%] pointer-events-none z-0 overflow-visible" aria-hidden="true">
        <defs>
          <linearGradient id={'legendOrbit_' + size} x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#fff4bd" stopOpacity="0" /><stop offset="48%" stopColor="#ffd66e" /><stop offset="72%" stopColor="#ff526e" /><stop offset="100%" stopColor="#fff4bd" stopOpacity="0" /></linearGradient>
          <radialGradient id={'legendCore_' + size}><stop offset="0%" stopColor="#ffd66e" stopOpacity=".22" /><stop offset="100%" stopColor="#ff526e" stopOpacity="0" /></radialGradient>
        </defs>
        <circle cx="60" cy="60" r="53" fill={'url(#legendCore_' + size + ')'} />
        <ellipse className="mr-legend-orbit mr-legend-orbit-one" cx="60" cy="60" rx="55" ry="43" fill="none" stroke={'url(#legendOrbit_' + size + ')'} strokeWidth="1.7" strokeDasharray="20 8 3 8" />
        <ellipse className="mr-legend-orbit mr-legend-orbit-two" cx="60" cy="60" rx="49" ry="57" fill="none" stroke="#ffcf69" strokeOpacity=".72" strokeWidth="1" strokeDasharray="3 10 18 12" />
        <path className="mr-legend-ray" d="M60 1 L64 13 L60 10 L56 13 Z M60 119 L64 107 L60 110 L56 107 Z M1 60 L13 56 L10 60 L13 64 Z M119 60 L107 56 L110 60 L107 64 Z" fill="#fff0a8" />
        <circle className="mr-legend-star mr-legend-star-a" cx="15" cy="35" r="2.2" fill="#fff1b0" /><circle className="mr-legend-star mr-legend-star-b" cx="101" cy="25" r="1.8" fill="#ff7890" /><circle className="mr-legend-star mr-legend-star-c" cx="103" cy="91" r="2.1" fill="#ffe7a0" /><circle className="mr-legend-star mr-legend-star-d" cx="20" cy="91" r="1.6" fill="#ff7890" />
      </svg>}
      <svg viewBox="0 0 100 100" className={'absolute inset-0 w-full h-full pointer-events-none z-10 ' + (isLegend ? 'mr-legend-ring' : '')} style={{ filter: 'drop-shadow(0 0 6px ' + tpl.glowColor + ')' }} aria-hidden="true">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor={tpl.ringGradient[0]} /><stop offset="50%" stopColor={tpl.ringGradient[1]} /><stop offset="100%" stopColor={tpl.ringGradient[2]} /></linearGradient>
          {isLegend && <linearGradient id={'legendMetal_' + size} x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#fff4bf" /><stop offset="32%" stopColor="#fbbf45" /><stop offset="62%" stopColor="#e33d55" /><stop offset="100%" stopColor="#8f183b" /></linearGradient>}
        </defs>
        {isLegend ? <g>
          <circle cx="50" cy="50" r="45.5" fill="none" stroke={'url(#legendMetal_' + size + ')'} strokeWidth="7" />
          <circle className="mr-legend-inner-track" cx="50" cy="50" r="39.5" fill="none" stroke="#ffe7a0" strokeOpacity=".8" strokeWidth="1.25" strokeDasharray="2 3" />
          <circle cx="50" cy="50" r="48.5" fill="none" stroke="#ffdf83" strokeOpacity=".7" strokeWidth=".8" />
          <path d="M28 18 L34 8 L42 15 L50 2 L58 15 L66 8 L72 18 L67 25 L33 25 Z" fill={'url(#legendMetal_' + size + ')'} stroke="#fff0ad" strokeWidth="1.1" strokeLinejoin="round" />
          <path d="M44 17 L50 7 L56 17 L50 22 Z" fill="#fff5c7" stroke="#b42348" strokeWidth=".8" />
          <path d="M10 43 L17 38 L18 47 L13 53 Z M90 43 L83 38 L82 47 L87 53 Z" fill="#e9a94e" stroke="#fff0ad" strokeWidth=".8" />
          <path d="M34 86 L50 96 L66 86" fill="none" stroke="#ffe5a0" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M8 58 L13 63 L8 68 M92 58 L87 63 L92 68" fill="none" stroke="#ff6b79" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="8" cy="50" r="2.3" fill="#fff0a8" /><circle cx="92" cy="50" r="2.3" fill="#fff0a8" />
        </g> : <g><circle cx="50" cy="50" r="46" fill="none" stroke={'url(#' + gradId + ')'} strokeWidth="6.5" /><circle cx="50" cy="50" r="41" fill="none" stroke={tpl.ringGradient[0]} strokeOpacity="0.45" strokeWidth="1.2" strokeDasharray="6 4" /><polygon points="50,1 55,8 45,8" fill={tpl.ringGradient[0]} /><polygon points="50,99 55,92 45,92" fill={tpl.ringGradient[1]} /></g>}
      </svg>
      <div className={'relative z-[1] w-full h-full rounded-full overflow-hidden bg-[#0b101d] ' + dims.pad + (isLegend ? ' mr-legend-avatar' : '')}>
        <img src={avatarUrl || fallbackSrc} alt={displayName} onError={(e) => { (e.currentTarget as HTMLImageElement).src = fallbackSrc; }} className="w-full h-full rounded-full object-cover" />
      </div>
      {status === 'online' ? <span className="absolute bottom-0 right-0 z-20 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0a0e17]" /> : <span className={'absolute z-20 leading-none drop-shadow ' + dims.badge + (isLegend ? ' mr-legend-badge' : '')}>{isLegend ? '✦' : tpl.badgeIcon}</span>}
    </div>
  );
};