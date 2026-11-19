import React from 'react';
import { createAvatarSvg, SVG_FRAME_TEMPLATES } from '../utils/gameArtworks.ts';

interface AvatarWithFrameProps {
  avatarUrl?: string;
  frameId?: string;
  frames?: any[];
  displayName?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'offline' | 'ingame';
}

const SIZE_MAP = {
  xs: { box: 'w-7 h-7', pad: 'p-[2px]', badge: 'text-[8px] -bottom-1 -right-1' },
  sm: { box: 'w-9 h-9', pad: 'p-[2.5px]', badge: 'text-[9px] -bottom-1 -right-1' },
  md: { box: 'w-12 h-12', pad: 'p-[3px]', badge: 'text-[11px] -bottom-1 -right-1' },
  lg: { box: 'w-16 h-16', pad: 'p-[3.5px]', badge: 'text-xs -bottom-1 -right-1' },
  xl: { box: 'w-24 h-24', pad: 'p-[4px]', badge: 'text-sm -bottom-1 -right-1' },
};

export const AvatarWithFrame: React.FC<AvatarWithFrameProps> = ({
  avatarUrl,
  frameId = 'bronze',
  displayName = 'Player',
  size = 'md',
  status,
}) => {
  const tpl =
    SVG_FRAME_TEMPLATES.find((f) => f.id === frameId) || SVG_FRAME_TEMPLATES[0];
  const dims = SIZE_MAP[size] || SIZE_MAP.md;
  const gradId = `frameGrad_${tpl.id}_${size}`;
  const fallbackSrc = createAvatarSvg(displayName);

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${dims.box}`}>
      {/* Ornamental SVG Frame Ring */}
      <svg
        viewBox="0 0 100 100"
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
        style={{ filter: `drop-shadow(0 0 6px ${tpl.glowColor})` }}
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={tpl.ringGradient[0]} />
            <stop offset="50%" stopColor={tpl.ringGradient[1]} />
            <stop offset="100%" stopColor={tpl.ringGradient[2]} />
          </linearGradient>
        </defs>
        <circle
          cx="50"
          cy="50"
          r="46"
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth="6.5"
        />
        <circle
          cx="50"
          cy="50"
          r="41"
          fill="none"
          stroke={tpl.ringGradient[0]}
          strokeOpacity="0.45"
          strokeWidth="1.2"
          strokeDasharray="6 4"
        />
        {/* Top & Bottom Ornamental Cyber Wing Nodes */}
        <polygon points="50,1 55,8 45,8" fill={tpl.ringGradient[0]} />
        <polygon points="50,99 55,92 45,92" fill={tpl.ringGradient[1]} />
      </svg>

      {/* Inner Cropped Circular Avatar */}
      <div className={`w-full h-full rounded-full overflow-hidden bg-[#0b101d] ${dims.pad}`}>
        <img
          src={avatarUrl || fallbackSrc}
          alt={displayName}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = fallbackSrc;
          }}
          className="w-full h-full rounded-full object-cover"
        />
      </div>

      {/* Rank Badge or Online Indicator */}
      {status === 'online' ? (
        <span className="absolute bottom-0 right-0 z-20 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-[#0a0e17]" />
      ) : (
        <span className={`absolute z-20 leading-none drop-shadow ${dims.badge}`}>
          {tpl.badgeIcon}
        </span>
      )}
    </div>
  );
};
