import React from 'react';
import { motion } from 'motion/react';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  Share2,
  Sparkles,
  X,
} from 'lucide-react';
import type { Language, UserProfile } from '../types.ts';
import { resolveBannerImage } from '../utils/gameArtworks.ts';
import { AvatarWithFrame } from './AvatarWithFrame.tsx';
import { RankTierIcon } from './PremiumIcons.tsx';

interface ShareProfileModalProps {
  lang: Language;
  player: UserProfile;
  frames?: any[];
  onClose: () => void;
  onNotify?: (level: string, message: string) => void;
}

export const ShareProfileModal: React.FC<ShareProfileModalProps> = ({
  lang,
  player,
  frames = [],
  onClose,
  onNotify,
}) => {
  const [copiedLink, setCopiedLink] = React.useState(false);
  const [copiedText, setCopiedText] = React.useState(false);
  const [downloading, setDownloading] = React.useState(false);

  const shareUrl = React.useMemo(() => {
    if (typeof window === 'undefined') return '';
    const base = `${window.location.origin}${window.location.pathname}`;
    const key = player.gameId || player.id;
    return `${base}?player=${encodeURIComponent(key)}`;
  }, [player.gameId, player.id]);

  const totalMatches = (player.wins || 0) + (player.losses || 0) + (player.draws || 0);
  const winRate = totalMatches > 0 ? Math.round(((player.wins || 0) / totalMatches) * 100) : 0;
  const giftsCount = Array.isArray(player.gifts) ? player.gifts.length : 0;
  const bannerSrc = resolveBannerImage(player.bannerUrl, player.bannerId);

  const shareMessage =
    lang === 'my'
      ? `⚔️ Vanguard Arena မှာ ${player.displayName} (${player.gameId}) နဲ့ လာရောက်ယှဉ်ပြိုင်လိုက်ပါ!\n🏆 Rank: ${player.rank || 'Silver'} | ${player.xp || 0} XP | Win Rate: ${winRate}%\n👉 ${shareUrl}`
      : `⚔️ Challenge ${player.displayName} (${player.gameId}) on Vanguard Arena!\n🏆 Rank: ${player.rank || 'Silver'} | ${player.xp || 0} XP | Win Rate: ${winRate}%\n👉 ${shareUrl}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      onNotify?.('success', lang === 'my' ? 'Profile လင့်ခ် ကူးယူပြီးပါပြီ!' : 'Profile link copied!');
      setTimeout(() => setCopiedLink(false), 1800);
    } catch {
      onNotify?.('error', 'Unable to copy link.');
    }
  };

  const handleCopyCaption = async () => {
    try {
      await navigator.clipboard.writeText(shareMessage);
      setCopiedText(true);
      onNotify?.('success', lang === 'my' ? 'ဖိတ်ခေါ်စာသား ကူးယူပြီးပါပြီ!' : 'Invite caption copied!');
      setTimeout(() => setCopiedText(false), 1800);
    } catch {
      onNotify?.('error', 'Unable to copy caption.');
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${player.displayName} — Vanguard Arena`,
          text: shareMessage,
          url: shareUrl,
        });
        return;
      } catch {
        // User cancelled or unsupported
      }
    }
    handleCopyCaption();
  };

  const openSocialUrl = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Generate High-Res Shareable Player Card PNG via HTML5 Canvas
  const handleDownloadCard = async () => {
    setDownloading(true);
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1000;
      canvas.height = 540;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Obsidian Cyber Background
      const bgGrad = ctx.createLinearGradient(0, 0, 1000, 540);
      bgGrad.addColorStop(0, '#070b14');
      bgGrad.addColorStop(0.55, '#10192d');
      bgGrad.addColorStop(1, '#2a1406');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1000, 540);

      // Decorative Diagonal Cyber Accent
      ctx.fillStyle = 'rgba(245, 158, 11, 0.12)';
      ctx.beginPath();
      ctx.moveTo(640, 0);
      ctx.lineTo(1000, 0);
      ctx.lineTo(1000, 540);
      ctx.lineTo(480, 540);
      ctx.closePath();
      ctx.fill();

      // Gold Outer Border Frame
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.7)';
      ctx.lineWidth = 4;
      ctx.strokeRect(18, 18, 964, 504);

      // Brand Header
      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 22px system-ui, sans-serif';
      ctx.fillText('VANGUARD ARENA  •  OFFICIAL PLAYER CARD', 54, 72);

      // Avatar Circle (Safe fallback to Initials if cross-origin)
      const cx = 148;
      const cy = 220;
      const r = 82;
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, r + 6, 0, Math.PI * 2);
      ctx.fillStyle = '#f59e0b';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(cx - r, cy - r, r * 2, r * 2);

      let drewAvatar = false;
      if (player.avatarUrl) {
        try {
          const img = await new Promise<HTMLImageElement>((resolve, reject) => {
            const im = new Image();
            im.crossOrigin = 'anonymous';
            im.onload = () => resolve(im);
            im.onerror = reject;
            im.src = player.avatarUrl!;
          });
          ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
          drewAvatar = true;
        } catch {
          drewAvatar = false;
        }
      }
      if (!drewAvatar) {
        ctx.fillStyle = '#fbbf24';
        ctx.font = 'bold 58px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText((player.displayName || 'VG').slice(0, 2).toUpperCase(), cx, cy + 20);
        ctx.textAlign = 'left';
      }
      ctx.restore();

      // Player Name, ID & Bio
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 44px system-ui, sans-serif';
      ctx.fillText((player.displayName || 'Player').slice(0, 24), 268, 185);

      ctx.fillStyle = '#fbbf24';
      ctx.font = 'bold 24px monospace';
      ctx.fillText(`${player.gameId}   •   ${player.rank || 'Silver'} Rank`, 268, 228);

      ctx.fillStyle = '#cbd5e1';
      ctx.font = '20px system-ui, sans-serif';
      const bioLine = (player.bio || 'Competing live in Vanguard Arena.').slice(0, 56);
      ctx.fillText(bioLine, 268, 274);

      // Stats Boxes
      const stats = [
        { label: 'TOTAL XP', value: `${player.xp || 0}`, color: '#fbbf24' },
        { label: 'WINS', value: `${player.wins || 0}`, color: '#34d399' },
        { label: 'WIN RATE', value: `${winRate}%`, color: '#38bdf8' },
        { label: 'TROPHIES', value: `${giftsCount}`, color: '#f472b6' },
      ];
      stats.forEach((s, idx) => {
        const bx = 54 + idx * 228;
        const by = 345;
        ctx.fillStyle = 'rgba(7, 11, 20, 0.85)';
        ctx.fillRect(bx, by, 208, 108);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx, by, 208, 108);

        ctx.fillStyle = '#94a3b8';
        ctx.font = 'bold 16px system-ui, sans-serif';
        ctx.fillText(s.label, bx + 20, by + 36);

        ctx.fillStyle = s.color;
        ctx.font = 'bold 34px monospace';
        ctx.fillText(s.value, bx + 20, by + 84);
      });

      // Footer Link
      ctx.fillStyle = '#94a3b8';
      ctx.font = '16px monospace';
      ctx.fillText(shareUrl.slice(0, 82), 54, 494);

      const pngUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = `vanguard-${player.gameId || 'player'}.png`;
      a.click();

      onNotify?.(
        'success',
        lang === 'my'
          ? 'Player Card ပုံ (PNG) သိမ်းဆည်းပြီးပါပြီ! Social Media တွင် တင်နိုင်ပါပြီ။'
          : 'Player Card PNG saved! Ready to post on social media.'
      );
    } catch {
      onNotify?.('error', 'Could not export image card.');
    } finally {
      setDownloading(false);
    }
  };

  const socialButtons = [
    {
      name: 'Facebook',
      bg: 'bg-[#1877F2]/20 hover:bg-[#1877F2]/35 border-[#1877F2]/50 text-[#93c5fd]',
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(shareMessage)}`,
    },
    {
      name: 'Telegram',
      bg: 'bg-[#229ED9]/20 hover:bg-[#229ED9]/35 border-[#229ED9]/50 text-[#7dd3fc]',
      url: `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareMessage)}`,
    },
    {
      name: 'Viber',
      bg: 'bg-[#7360F2]/20 hover:bg-[#7360F2]/35 border-[#7360F2]/50 text-[#c4b5fd]',
      url: `viber://forward?text=${encodeURIComponent(shareMessage)}`,
    },
    {
      name: 'WhatsApp',
      bg: 'bg-[#25D366]/20 hover:bg-[#25D366]/35 border-[#25D366]/50 text-[#86efac]',
      url: `https://wa.me/?text=${encodeURIComponent(shareMessage)}`,
    },
    {
      name: 'X / Twitter',
      bg: 'bg-white/10 hover:bg-white/20 border-white/20 text-slate-200',
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}`,
    },
  ];

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md rounded-2xl cyber-panel border border-amber-400/50 p-5 space-y-4 shadow-2xl max-h-[92dvh] overflow-y-auto"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h3 className="text-sm sm:text-base font-display font-bold text-amber-300 flex items-center gap-2">
            <Share2 className="w-4 h-4" />
            <span>{lang === 'my' ? 'Profile ကို Social Media သို့ မျှဝေမည်' : 'Share Player Profile'}</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-white/10 text-slate-300 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Shareable Card Preview */}
        <div className="rounded-2xl overflow-hidden border border-amber-400/40 bg-[#070b14] relative">
          <div className="h-24 relative">
            <img src={bannerSrc} alt="Banner" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#070b14] via-[#070b14]/40 to-transparent" />
            <span className="absolute top-2 right-2.5 px-2 py-0.5 rounded-full bg-black/70 border border-amber-400/40 text-[9px] font-mono font-bold text-amber-300">
              VANGUARD CARD
            </span>
          </div>
          <div className="px-4 pb-4 -mt-8 relative z-10 space-y-2.5">
            <div className="flex items-end gap-3">
              <AvatarWithFrame
                avatarUrl={player.avatarUrl}
                frameId={player.frameId}
                frames={frames}
                displayName={player.displayName}
                size="md"
              />
              <div className="min-w-0 pb-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-display font-bold text-white truncate">
                    {player.displayName}
                  </span>
                  <RankTierIcon tier={player.rank || 'silver'} className="w-4 h-4 shrink-0" />
                </div>
                <div className="text-[11px] font-mono text-amber-300">
                  {player.gameId} • {player.xp || 0} XP • {winRate}% WR
                </div>
              </div>
            </div>
            {player.bio && <p className="text-[11px] text-slate-300 line-clamp-2">{player.bio}</p>}
          </div>
        </div>

        {/* Share Link Box */}
        <div className="flex gap-2">
          <input
            type="text"
            readOnly
            value={shareUrl}
            className="flex-1 h-9 px-3 rounded-xl bg-[#070b14] border border-white/15 text-[11px] font-mono text-slate-300 select-all"
          />
          <button
            type="button"
            onClick={handleCopyLink}
            className="px-3 h-9 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer shrink-0"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedLink ? 'Copied' : 'Copy'}</span>
          </button>
        </div>

        {/* Social Platform Buttons */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold text-slate-400">
            {lang === 'my' ? 'တိုက်ရိုက် မျှဝေမည့် Platform ရွေးချယ်ပါ' : 'Share Directly To'}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {socialButtons.map((s) => (
              <button
                key={s.name}
                type="button"
                onClick={() => openSocialUrl(s.url)}
                className={`h-9 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${s.bg}`}
              >
                <span>{s.name}</span>
                <ExternalLink className="w-3 h-3 opacity-75" />
              </button>
            ))}
            <button
              type="button"
              onClick={handleCopyCaption}
              className="h-9 px-3 rounded-xl border bg-amber-500/15 hover:bg-amber-500/25 border-amber-400/40 text-amber-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {copiedText ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedText ? 'Copied!' : 'Copy Text'}</span>
            </button>
          </div>
        </div>

        {/* Native Share + Download Card PNG */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={handleNativeShare}
            className="h-10 rounded-xl cyber-cta-gold text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>{lang === 'my' ? 'အခြား App သို့ Share' : 'More Apps'}</span>
          </button>
          <button
            type="button"
            disabled={downloading}
            onClick={handleDownloadCard}
            className="h-10 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4 text-amber-400" />
            <span>{downloading ? 'Saving...' : lang === 'my' ? 'Card ပုံသိမ်းမည်' : 'Save Card PNG'}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
