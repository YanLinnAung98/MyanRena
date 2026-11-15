import React from 'react';
import type { ProfileFrame } from '../types.ts';

interface AvatarWithFrameProps {
  avatarUrl: string;
  frameId?: string;
  frames?: ProfileFrame[];
  displayName: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'in_game' | 'queue' | 'offline';
}

const SIZE_CLASSES = {
  sm: 'w-10 h-10',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24',
};

export const AvatarWithFrame: React.FC<AvatarWithFrameProps> = ({
  avatarUrl,
  frameId,
  frames = [],
  displayName,
  size = 'md',
  status,
}) => {
  const frame = frames.find((f) => f.id === frameId);
  const [imgError, setImgError] = React.useState(false);

  const initials = (displayName || 'VA')
    .split(/\s+/)
    .map((s) => s[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${SIZE_CLASSES[size]}`}>
      {/* Inner 72% Safe-Zone Circular Avatar matching 512x512 Frame Template */}
      <div className="w-[72%] h-[72%] rounded-full overflow-hidden bg-slate-800 border border-white/10 flex items-center justify-center">
        {!imgError && avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-xs font-semibold text-slate-300">{initials}</span>
        )}
      </div>

      {/* Decorative PNG/SVG Frame Overlay */}
      {frame && frame.imageUrl && (
        <img
          src={frame.imageUrl}
          alt={frame.name}
          referrerPolicy="no-referrer"
          className="pointer-events-none absolute inset-0 w-full h-full object-contain"
        />
      )}

      {/* Real-time Telemetry Status Indicator */}
      {status && (
        <span
          title={status === 'in_game' ? 'In Match' : status === 'queue' ? 'In Queue' : status === 'online' ? 'Online' : 'Offline'}
          className={`absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full border-2 border-[#0F1420] ${
            status === 'online'
              ? 'bg-emerald-400'
              : status === 'in_game'
              ? 'bg-amber-400'
              : status === 'queue'
              ? 'bg-sky-400'
              : 'bg-slate-600'
          }`}
        />
      )}
    </div>
  );
};
