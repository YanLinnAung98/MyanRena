import React from 'react';
import { motion } from 'motion/react';
import {
  Award,
  Camera,
  Check,
  Copy,
  Crown,
  Gift,
  Lock,
  Palette,
  Save,
  Sparkles,
  Trophy,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import type { Language, UserProfile } from '../types.ts';
import { SVG_FRAME_TEMPLATES } from '../utils/gameArtworks.ts';
import { soundEngine } from '../utils/sound.ts';
import { AvatarWithFrame } from './AvatarWithFrame.tsx';
import {
  BANNER_THEMES,
  getBannerTheme,
  getGiftMeta,
  getPlayerTitle,
  PLAYER_TITLES,
  PremiumGiftSvg,
} from './PremiumIcons.tsx';

interface ProfileViewProps {
  lang: Language;
  token: string;
  user: UserProfile;
  frames: any[];
  onUserUpdated: (user: UserProfile) => void;
  onNotify: (level: string, message: string) => void;
}

function getRankProgress(xp: number) {
  const tiers = [
    { name: 'Bronze', min: 0, max: 1000 },
    { name: 'Silver', min: 1000, max: 1300 },
    { name: 'Gold', min: 1300, max: 1900 },
    { name: 'Diamond', min: 1900, max: 2500 },
    { name: 'Legend', min: 2500, max: 3500 },
  ];
  const current = tiers.find((t) => xp >= t.min && xp < t.max) || tiers[tiers.length - 1];
  const pct = Math.min(100, Math.max(4, Math.round(((xp - current.min) / (current.max - current.min)) * 100)));
  const level = Math.max(1, Math.floor(xp / 150) + 1);
  return { current, pct, level };
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  lang,
  token,
  user,
  onUserUpdated,
  onNotify,
}) => {
  const uAny = user as any;
  const [displayName, setDisplayName] = React.useState(user.displayName || '');
  const [bio, setBio] = React.useState(uAny.bio || '');
  const [selectedFrame, setSelectedFrame] = React.useState(user.frameId || 'bronze');
  const [selectedBanner, setSelectedBanner] = React.useState(uAny.bannerTheme || 'imperial');
  const [selectedTitle, setSelectedTitle] = React.useState(uAny.titleId || 'rookie');
  const [activeTab, setActiveTab] = React.useState<'overview' | 'gifts' | 'frames' | 'customize'>('overview');
  const [saving, setSaving] = React.useState(false);
  const [copiedId, setCopiedId] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [cropSource, setCropSource] = React.useState<string | null>(null);
  const [zoom, setZoom] = React.useState<number>(1.15);
  const [offset, setOffset] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragging, setDragging] = React.useState(false);
  const dragStartRef = React.useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const imgRef = React.useRef<HTMLImageElement | null>(null);

  const xp = Number(user.xp || 1000);
  const wins = Number(user.wins || 0);
  const losses = Number(user.losses || 0);
  const draws = Number(user.draws || 0);
  const totalGames = wins + losses + draws;
  const winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;
  const rankProg = getRankProgress(xp);
  const bannerObj = getBannerTheme(selectedBanner);
  const titleObj = getPlayerTitle(selectedTitle);
  const unlockedFrames: string[] = Array.isArray(uAny.unlockedFrames) ? uAny.unlockedFrames : [];
  const userGifts: any[] = Array.isArray(uAny.gifts) ? uAny.gifts : [];

  const achievements = [
    { id: 'first', icon: '⚔️', title: lang === 'my' ? 'ပထမဆုံး အောင်ပွဲ' : 'First Victory', unlocked: wins >= 1 },
    { id: 'five', icon: '🔥', title: lang === 'my' ? '၅ ပွဲနိုင် စစ်သည်' : '5-Win Striker', unlocked: wins >= 5 },
    { id: 'gold', icon: '🥇', title: lang === 'my' ? 'Gold အဆင့်ရောက်' : 'Gold Tier', unlocked: xp >= 1300 },
    { id: 'diamond', icon: '💎', title: lang === 'my' ? 'Diamond သခင်' : 'Diamond Tier', unlocked: xp >= 1900 },
    { id: 'gift', icon: '🎁', title: lang === 'my' ? 'ပြိုင်ပွဲဆုရှင်' : 'Prize Winner', unlocked: userGifts.length >= 1 },
    { id: 'legend', icon: '👑', title: lang === 'my' ? 'ဒဏ္ဍာရီ ချန်ပီယံ' : 'Arena Legend', unlocked: xp >= 2500 },
  ];

  const handleCopyId = () => {
    navigator.clipboard?.writeText(user.gameId || user.id);
    soundEngine.playClick();
    setCopiedId(true);
    onNotify('success', `Copied Game ID: ${user.gameId}`);
    setTimeout(() => setCopiedId(false), 1800);
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCropSource(reader.result);
        setZoom(1.15);
        setOffset({ x: 0, y: 0 });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    setDragging(true);
    dragStartRef.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    setOffset({
      x: Math.max(-110, Math.min(110, e.clientX - dragStartRef.current.x)),
      y: Math.max(-110, Math.min(110, e.clientY - dragStartRef.current.y)),
    });
  };

  const applyCroppedAvatar = async () => {
    const img = imgRef.current;
    if (!img) return;
    const canvas = document.createElement('canvas');
    const size = 256;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    const naturalW = img.naturalWidth || 256;
    const naturalH = img.naturalHeight || 256;
    const baseScale = Math.max(size / naturalW, size / naturalH);
    const drawW = naturalW * baseScale * zoom;
    const drawH = naturalH * baseScale * zoom;
    const ratio = size / 220;
    const drawX = (size - drawW) / 2 + offset.x * ratio;
    const drawY = (size - drawH) / 2 + offset.y * ratio;

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    ctx.restore();

    const croppedDataUrl = canvas.toDataURL('image/webp', 0.88);
    setCropSource(null);

    const updatedUser = { ...user, avatarUrl: croppedDataUrl };
    onUserUpdated(updatedUser);
    await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ avatarUrl: croppedDataUrl }),
    });
    soundEngine.playNotify();
    onNotify('success', lang === 'my' ? 'Profile ဓာတ်ပုံ ပြောင်းလဲပြီးပါပြီ!' : 'Avatar updated!');
  };

  const handleEquipFrame = async (frameId: string, unlocked: boolean) => {
    if (!unlocked) {
      onNotify('error', lang === 'my' ? 'ဤ Frame ရရှိရန် XP စုဆောင်းပါ သို့မဟုတ် ပြိုင်ပွဲဆုရယူပါ။' : 'Earn XP or tournament prize to unlock.');
      return;
    }
    setSelectedFrame(frameId);
    const updatedUser = { ...user, frameId };
    onUserUpdated(updatedUser);
    await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ frameId }),
    });
    soundEngine.playClick();
    onNotify('success', lang === 'my' ? 'Profile Frame တပ်ဆင်ပြီးပါပြီ!' : 'Frame equipped!');
  };

  const handleSaveCustomization = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const patch = {
        displayName: displayName.trim() || user.displayName,
        bio: bio.trim().slice(0, 120),
        bannerTheme: selectedBanner,
        titleId: selectedTitle,
        frameId: selectedFrame,
      };
      const updatedUser = { ...user, ...patch } as UserProfile;
      onUserUpdated(updatedUser);
      await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(patch),
      });
      soundEngine.playNotify();
      onNotify('success', lang === 'my' ? 'Profile သိမ်းဆည်းပြီးပါပြီ!' : 'Profile saved!');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-3 sm:py-5 space-y-4">
      {/* HERO PROFILE HEADER */}
      <div className="cyber-panel rounded-3xl overflow-hidden border border-amber-400/25 shadow-2xl">
        <div className={`h-24 sm:h-32 bg-gradient-to-r ${bannerObj.bg} relative overflow-hidden`}>
          <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fbbf24_1px,transparent_1px)] [background-size:18px_18px]" />
          <div className="absolute top-3 right-3">
            <span className="px-3 py-1 rounded-full bg-black/55 backdrop-blur-md border border-amber-400/40 text-[11px] font-mono font-bold text-amber-300 flex items-center gap-1">
              <Crown className="w-3.5 h-3.5" /> LV.{rankProg.level} · {user.rank || rankProg.current.name}
            </span>
          </div>
        </div>

        <div className="px-4 sm:px-6 pb-5 -mt-12 sm:-mt-14 relative z-10 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="flex items-end gap-4">
              <div className="relative">
                <AvatarWithFrame avatarUrl={user.avatarUrl} frameId={selectedFrame} displayName={user.displayName} size="xl" />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 z-30 w-9 h-9 rounded-full cyber-cta-gold text-slate-950 flex items-center justify-center shadow-lg cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelected} className="hidden" />
              </div>

              <div className="pb-1 space-y-1 min-w-0">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-400/30 text-[10px] font-bold text-amber-300">
                  <Sparkles className="w-3 h-3" />
                  {lang === 'my' ? titleObj.labelMy : titleObj.labelEn}
                </span>
                <h1 className="text-xl sm:text-2xl font-display font-extrabold text-white truncate">
                  {user.displayName}
                </h1>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyId}
                    className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-white/5 hover:bg-amber-500/20 border border-white/10 text-xs font-mono text-amber-300 cursor-pointer"
                  >
                    <span>ID: {user.gameId}</span>
                    {copiedId ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                  <span className="text-xs font-mono text-slate-400">@{user.username}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 h-10 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-bold text-white flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <Upload className="w-3.5 h-3.5 text-amber-400" />
              <span>{lang === 'my' ? 'ပုံတင် & Crop ညှိမည်' : 'Upload & Crop'}</span>
            </button>
          </div>

          {bio && (
            <p className="text-xs sm:text-sm text-slate-300 bg-[#070b13]/80 border border-white/5 rounded-xl px-3.5 py-2.5 italic">
              “{bio}”
            </p>
          )}

          <div className="space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300">{rankProg.current.name} Tier Progress</span>
              <span className="font-mono font-bold text-amber-400">
                {xp} / {rankProg.current.max} XP ({rankProg.pct}%)
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-[#070b13] border border-white/10 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${rankProg.pct}%` }}
                transition={{ duration: 0.7 }}
                className="h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 4 Sub-Tabs */}
      <div className="grid grid-cols-4 gap-1.5 p-1 rounded-2xl cyber-panel text-[11px] sm:text-xs font-bold">
        {[
          { id: 'overview', label: lang === 'my' ? '📊 မှတ်တမ်း' : 'Stats' },
          { id: 'gifts', label: `${lang === 'my' ? '🎁 လက်ဆောင်' : 'Gifts'} (${userGifts.length})` },
          { id: 'frames', label: '🖼️ Frames' },
          { id: 'customize', label: lang === 'my' ? '🎨 ပြင်ဆင်' : 'Edit' },
        ].map((tb) => (
          <button
            key={tb.id}
            type="button"
            onClick={() => {
              soundEngine.playClick();
              setActiveTab(tb.id as any);
            }}
            className={`py-2.5 rounded-xl transition-all cursor-pointer truncate ${
              activeTab === tb.id ? 'cyber-gold-active text-amber-200' : 'text-slate-400 hover:text-white'
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {/* TAB 1: STATS & MEDALS */}
      {activeTab === 'overview' && (
        <div className="grid md:grid-cols-12 gap-4">
          <div className="md:col-span-5 cyber-panel rounded-2xl p-5 flex flex-col items-center justify-center gap-4">
            <div className="relative w-32 h-32 flex items-center justify-center">
              <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
                <motion.circle
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray={314}
                  initial={{ strokeDashoffset: 314 }}
                  animate={{ strokeDashoffset: 314 - (314 * winRate) / 100 }}
                  transition={{ duration: 0.9 }}
                />
              </svg>
              <div className="absolute text-center">
                <div className="text-2xl font-display font-extrabold text-white">{winRate}%</div>
                <div className="text-[10px] text-slate-400 uppercase">Win Rate</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 w-full text-center">
              <div className="p-2.5 rounded-xl bg-[#070b13] border border-emerald-500/20">
                <div className="text-lg font-mono font-extrabold text-emerald-400">{wins}</div>
                <div className="text-[10px] text-slate-400">Wins</div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#070b13] border border-rose-500/20">
                <div className="text-lg font-mono font-extrabold text-rose-400">{losses}</div>
                <div className="text-[10px] text-slate-400">Losses</div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#070b13] border border-sky-500/20">
                <div className="text-lg font-mono font-extrabold text-sky-400">{draws}</div>
                <div className="text-[10px] text-slate-400">Draws</div>
              </div>
            </div>
          </div>

          <div className="md:col-span-7 cyber-panel rounded-2xl p-5 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>{lang === 'my' ? 'အောင်မြင်မှု ဆုတံဆိပ်များ' : 'Arena Achievements'}</span>
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {achievements.map((ach) => (
                <div
                  key={ach.id}
                  className={`p-3 rounded-2xl border text-center space-y-1.5 ${
                    ach.unlocked ? 'bg-amber-500/10 border-amber-400/35' : 'bg-[#070b13] border-white/5 opacity-45 grayscale'
                  }`}
                >
                  <div className="text-2xl">{ach.icon}</div>
                  <div className="text-[11px] font-bold text-white">{ach.title}</div>
                  <div className="text-[10px] font-mono text-amber-300">{ach.unlocked ? '✓ Unlocked' : 'Locked'}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: RECEIVED TOURNAMENT GIFTS & TROPHIES VAULT */}
      {activeTab === 'gifts' && (
        <div className="cyber-panel rounded-2xl p-5 space-y-3">
          <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
            <Gift className="w-4 h-4" />
            <span>{lang === 'my' ? 'ပြိုင်ပွဲဆုနှင့် Admin ချီးမြှင့်ထားသော လက်ဆောင်များ' : 'Tournament Prizes & Gifts Vault'}</span>
          </h3>
          {userGifts.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <PremiumGiftSvg giftId="vip_gift_box" className="w-12 h-12 mx-auto opacity-60" />
              <div className="text-xs text-slate-400">
                {lang === 'my'
                  ? 'လက်ဆောင် ရရှိထားခြင်း မရှိသေးပါ။ ပြိုင်ပွဲကြီးများတွင် ဝင်ရောက်ယှဉ်ပြိုင်ပြီး ဆုလက်ဆောင်များ ရယူပါ!'
                  : 'Compete in official tournaments to earn exclusive prizes and gifts!'}
              </div>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-3">
              {userGifts.map((g, i) => {
                const meta = getGiftMeta(g.giftId);
                return (
                  <div
                    key={g.id || i}
                    className={`p-3.5 rounded-2xl bg-gradient-to-br border flex items-center gap-3.5 ${meta.accent}`}
                  >
                    <PremiumGiftSvg giftId={g.giftId} className="w-12 h-12 shrink-0" />
                    <div className="min-w-0 space-y-0.5">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider opacity-85">
                        {g.placement || meta.rarity}
                      </span>
                      <div className="text-sm font-bold text-white truncate">
                        {g.title || (lang === 'my' ? meta.nameMy : meta.nameEn)}
                      </div>
                      {g.tournamentTitle && (
                        <div className="text-[11px] text-amber-200/90 truncate">🏆 {g.tournamentTitle}</div>
                      )}
                      {g.note && <div className="text-[11px] text-slate-200/80 italic">“{g.note}”</div>}
                      {g.bonusXp ? (
                        <div className="text-[10px] font-mono font-bold text-emerald-300">+{g.bonusXp} Bonus XP</div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: FRAMES */}
      {activeTab === 'frames' && (
        <div className="cyber-panel rounded-2xl p-4 sm:p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-400" />
              <span>{lang === 'my' ? 'Profile Frame ဘောင်များ ရွေးချယ်ရန်' : 'Equip Rank Frame'}</span>
            </h3>
            <span className="text-xs font-mono text-amber-400">{xp} XP</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {SVG_FRAME_TEMPLATES.map((tpl) => {
              const unlocked = user.role === 'admin' || xp >= tpl.minXp || unlockedFrames.includes(tpl.id);
              const equipped = selectedFrame === tpl.id;
              return (
                <motion.button
                  key={tpl.id}
                  whileTap={{ scale: 0.96 }}
                  type="button"
                  onClick={() => handleEquipFrame(tpl.id, unlocked)}
                  className={`p-3 rounded-2xl border flex flex-col items-center gap-2 transition-all cursor-pointer ${
                    equipped
                      ? 'cyber-gold-active'
                      : unlocked
                      ? 'bg-[#080d17] border-white/10 hover:border-amber-400/40'
                      : 'bg-[#070a12] border-white/5 opacity-55'
                  }`}
                >
                  <AvatarWithFrame avatarUrl={user.avatarUrl} frameId={tpl.id} displayName={user.displayName} size="md" />
                  <div className="text-xs font-bold text-white truncate max-w-full">
                    {lang === 'my' ? tpl.nameMy : tpl.name}
                  </div>
                  <div className="text-[10px] font-mono text-amber-300 flex items-center gap-1">
                    {equipped ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" /> Active
                      </>
                    ) : unlocked ? (
                      'Equip'
                    ) : (
                      <>
                        <Lock className="w-2.5 h-2.5" /> {tpl.minXp} XP
                      </>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: CUSTOMIZE */}
      {activeTab === 'customize' && (
        <form onSubmit={handleSaveCustomization} className="cyber-panel rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full h-10 px-3.5 rounded-xl bg-[#070b13] border border-white/15 text-sm text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">
                {lang === 'my' ? 'ဘွဲ့အမည် (Title Badge)' : 'Player Title'}
              </label>
              <select
                value={selectedTitle}
                onChange={(e) => setSelectedTitle(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-[#070b13] border border-white/15 text-xs text-white"
              >
                {PLAYER_TITLES.map((tl) => {
                  const locked = user.role !== 'admin' && xp < tl.minXp;
                  return (
                    <option key={tl.id} value={tl.id} disabled={locked}>
                      {lang === 'my' ? tl.labelMy : tl.labelEn} {locked ? `(${tl.minXp} XP)` : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">
              {lang === 'my' ? 'ကိုယ်ရေးအကျဉ်း (Bio / Motto)' : 'Bio / Motto'}
            </label>
            <input
              type="text"
              maxLength={120}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder={lang === 'my' ? 'အခြားသူများ သင့် Profile ဝင်ကြည့်လျှင် မြင်ရမည့် Bio စာသား...' : 'Write your profile bio...'}
              className="w-full h-10 px-3.5 rounded-xl bg-[#070b13] border border-white/15 text-xs text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs text-slate-400 flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-amber-400" />
              {lang === 'my' ? 'Profile Banner အရောင် ရွေးချယ်ရန်' : 'Cover Banner Theme'}
            </label>
            <div className="grid grid-cols-5 gap-2">
              {BANNER_THEMES.map((bn) => (
                <button
                  key={bn.id}
                  type="button"
                  onClick={() => setSelectedBanner(bn.id)}
                  className={`h-12 rounded-xl bg-gradient-to-r ${bn.bg} border-2 cursor-pointer transition-all ${
                    selectedBanner === bn.id ? 'border-amber-400 scale-105' : 'border-white/10 opacity-75'
                  }`}
                  title={bn.name}
                />
              ))}
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-6 h-11 rounded-xl cyber-cta-gold text-slate-950 font-extrabold text-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? '...' : lang === 'my' ? 'Profile သိမ်းဆည်းမည်' : 'Save Profile'}</span>
          </button>
        </form>
      )}

      {/* Crop Modal */}
      {cropSource && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl cyber-panel border border-amber-400/50 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">
                {lang === 'my' ? 'Frame အတွင်း ပုံနေရာညှိပြီး Crop ဖြတ်ပါ' : 'Fit & Crop Avatar'}
              </h3>
              <button type="button" onClick={() => setCropSource(null)} className="w-8 h-8 rounded-lg bg-white/10 text-slate-300 flex items-center justify-center cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex justify-center">
              <div
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={() => setDragging(false)}
                onPointerLeave={() => setDragging(false)}
                className="relative w-[220px] h-[220px] rounded-full overflow-hidden bg-[#070b13] border-4 border-amber-400 shadow-[0_0_24px_rgba(245,158,11,0.4)] touch-none cursor-grab active:cursor-grabbing flex items-center justify-center"
              >
                <img
                  ref={imgRef}
                  src={cropSource}
                  alt="Crop Preview"
                  draggable={false}
                  style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})` }}
                  className="max-w-none w-full h-full object-cover select-none pointer-events-none"
                />
                <div className="absolute inset-0 rounded-full ring-2 ring-inset ring-white/30 pointer-events-none" />
              </div>
            </div>
            <div className="flex items-center gap-3 px-2">
              <ZoomOut className="w-4 h-4 text-slate-400" />
              <input type="range" min="1" max="3" step="0.05" value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} className="flex-1 accent-amber-500 cursor-pointer" />
              <ZoomIn className="w-4 h-4 text-amber-400" />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button type="button" onClick={() => setCropSource(null)} className="h-11 rounded-xl bg-white/10 text-xs font-bold text-white cursor-pointer">
                Cancel
              </button>
              <button type="button" onClick={applyCroppedAvatar} className="h-11 rounded-xl cyber-cta-gold text-slate-950 font-extrabold text-xs cursor-pointer">
                ✓ Crop & Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
