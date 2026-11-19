import React from 'react';
import { motion } from 'motion/react';
import {
  Award,
  Camera,
  Check,
  FileText,
  Image as ImageIcon,
  Lock,
  Save,
  Sparkles,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured, stripUndefined } from '../lib/firebase.ts';
import { saveActiveSessionUser } from '../lib/serverlessApi.ts';
import type { GameType, Language, UserProfile } from '../types.ts';
import {
  PREMIUM_BANNER_TEMPLATES,
  resolveBannerImage,
  SVG_FRAME_TEMPLATES,
} from '../utils/gameArtworks.ts';
import { AvatarWithFrame } from './AvatarWithFrame.tsx';
import { GameBadgeIcon, GiftTrophyIcon, RankTierIcon } from './PremiumIcons.tsx';

interface ProfileViewProps {
  lang: Language;
  token: string;
  user: UserProfile;
  frames: any[];
  onUserUpdated: (user: UserProfile) => void;
  onNotify: (level: string, message: string) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  lang,
  token,
  user,
  onUserUpdated,
  onNotify,
}) => {
  const [displayName, setDisplayName] = React.useState(user.displayName || '');
  const [bio, setBio] = React.useState(user.bio || '');
  const [favoriteGame, setFavoriteGame] = React.useState<GameType>(user.favoriteGame || 'connect4');
  const [selectedFrame, setSelectedFrame] = React.useState(user.frameId || 'bronze');
  const [selectedBannerId, setSelectedBannerId] = React.useState(user.bannerId || 'cyber_gold');
  const [customBannerUrl, setCustomBannerUrl] = React.useState<string>(user.bannerUrl || '');
  const [saving, setSaving] = React.useState(false);

  // Avatar Cropper State
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const bannerInputRef = React.useRef<HTMLInputElement | null>(null);
  const [cropSource, setCropSource] = React.useState<string | null>(null);
  const [zoom, setZoom] = React.useState<number>(1.15);
  const [offset, setOffset] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragging, setDragging] = React.useState(false);
  const dragStartRef = React.useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const imgRef = React.useRef<HTMLImageElement | null>(null);

  const persistProfilePatch = async (patch: Partial<UserProfile>) => {
    const updatedUser = { ...user, ...patch };
    saveActiveSessionUser(updatedUser);
    onUserUpdated(updatedUser);

    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, 'users', user.id), stripUndefined(patch), { merge: true }).catch(() => {});
    }
    await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(patch),
    }).catch(() => {});
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

  // Compress & Upload Custom Profile Banner (800x260 WebP)
  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result !== 'string') return;
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        canvas.width = 800;
        canvas.height = 260;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const scale = Math.max(800 / img.width, 260 / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (800 - w) / 2, (260 - h) / 2, w, h);

        const bannerDataUrl = canvas.toDataURL('image/webp', 0.82);
        setCustomBannerUrl(bannerDataUrl);
        await persistProfilePatch({ bannerUrl: bannerDataUrl, bannerId: 'custom' });
        onNotify('success', lang === 'my' ? 'Profile Banner အသစ် တင်ပြီးပါပြီ!' : 'Custom Profile Banner updated!');
      };
      img.src = reader.result;
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

  const handlePointerUp = () => setDragging(false);

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

    await persistProfilePatch({ avatarUrl: croppedDataUrl });
    onNotify('success', lang === 'my' ? 'Profile ဓာတ်ပုံ အသစ်ပြောင်းလဲပြီးပါပြီ!' : 'Profile picture updated!');
  };

  const handleEquipFrame = async (frameId: string, unlocked: boolean) => {
    if (!unlocked) {
      onNotify('error', lang === 'my' ? 'ဤ Frame ကို ရရှိရန် XP ပိုမိုစုဆောင်းပါ။' : 'Earn more XP to unlock this frame.');
      return;
    }
    setSelectedFrame(frameId);
    await persistProfilePatch({ frameId });
    onNotify('success', lang === 'my' ? 'Profile Frame တပ်ဆင်ပြီးပါပြီ!' : 'Profile frame equipped!');
  };

  const handleEquipBanner = async (bannerId: string, unlocked: boolean) => {
    if (!unlocked) {
      onNotify('error', lang === 'my' ? 'ဤ Banner ကို ဖွင့်ရန် XP ပိုမိုစုဆောင်းပါ သို့မဟုတ် ပြိုင်ပွဲဆုရယူပါ။' : 'Earn more XP or win a tournament gift to unlock.');
      return;
    }
    setSelectedBannerId(bannerId);
    setCustomBannerUrl('');
    await persistProfilePatch({ bannerId, bannerUrl: '' });
    onNotify('success', lang === 'my' ? 'Profile Banner ပြောင်းလဲပြီးပါပြီ!' : 'Profile banner equipped!');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await persistProfilePatch({
        displayName: displayName.trim() || user.displayName,
        bio: bio.trim().slice(0, 180),
        favoriteGame,
        frameId: selectedFrame,
      });
      onNotify('success', lang === 'my' ? 'Profile နှင့် Bio သိမ်းဆည်းပြီးပါပြီ!' : 'Profile & Bio saved!');
    } finally {
      setSaving(false);
    }
  };

  const activeBannerSrc = resolveBannerImage(customBannerUrl, selectedBannerId);
  const totalGames = (user.wins || 0) + (user.losses || 0) + (user.draws || 0);
  const winRate = totalGames > 0 ? Math.round(((user.wins || 0) / totalGames) * 100) : 0;
  const gifts = Array.isArray(user.gifts) ? user.gifts : [];
  const unlockedFrames = Array.isArray(user.unlockedFrames) ? user.unlockedFrames : [];
  const unlockedBanners = Array.isArray(user.unlockedBanners) ? user.unlockedBanners : [];

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-3 sm:py-6 space-y-4">
      {/* Live Profile Banner + Avatar Header Preview Card */}
      <div className="cyber-panel rounded-2xl overflow-hidden border border-amber-500/30 shadow-xl">
        <div className="relative h-36 sm:h-44 w-full bg-[#070b14]">
          <img
            src={activeBannerSrc}
            alt="Profile Banner"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0b101d] via-[#0b101d]/30 to-transparent" />
          <button
            type="button"
            onClick={() => bannerInputRef.current?.click()}
            className="absolute top-3 right-3 px-3 py-1.5 rounded-xl bg-black/70 hover:bg-black/90 border border-amber-400/40 text-[11px] font-bold text-amber-200 flex items-center gap-1.5 backdrop-blur-sm cursor-pointer"
          >
            <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
            <span>{lang === 'my' ? 'Banner ပုံတင်မည်' : 'Upload Banner'}</span>
          </button>
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/*"
            onChange={handleBannerUpload}
            className="hidden"
          />
        </div>

        <div className="px-4 sm:px-6 pb-5 -mt-12 relative z-10 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4">
            <div className="relative">
              <AvatarWithFrame
                avatarUrl={user.avatarUrl}
                frameId={selectedFrame}
                displayName={user.displayName}
                size="xl"
                status="online"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 z-30 w-9 h-9 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center shadow-lg cursor-pointer"
                title={lang === 'my' ? 'ပုံတင်ပြီး Crop လုပ်ရန်' : 'Upload & Crop Photo'}
              >
                <Camera className="w-4 h-4" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelected}
                className="hidden"
              />
            </div>

            <div className="text-center sm:text-left space-y-1 pb-1">
              <div className="flex items-center justify-center sm:justify-start gap-2">
                <h2 className="text-lg sm:text-xl font-display font-bold text-white">
                  {displayName || user.displayName}
                </h2>
                <RankTierIcon tier={user.rank || 'silver'} className="w-5 h-5" />
              </div>
              <div className="text-xs font-mono text-amber-400">
                {user.gameId} • {user.xp} XP ({user.rank || 'Silver'})
              </div>
              {bio && (
                <p className="text-xs text-slate-300 max-w-md line-clamp-2 pt-0.5">{bio}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center bg-[#070b14]/90 p-2.5 rounded-xl border border-white/10 text-xs shrink-0">
            <div>
              <div className="text-[10px] text-slate-400">Win</div>
              <div className="font-bold text-emerald-400">{user.wins || 0}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">Loss</div>
              <div className="font-bold text-rose-400">{user.losses || 0}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">Draw</div>
              <div className="font-bold text-sky-400">{user.draws || 0}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-400">WR%</div>
              <div className="font-bold text-amber-300">{winRate}%</div>
            </div>
          </div>
        </div>
      </div>

      {/* Received Tournament Gifts & Trophies Showcase */}
      {gifts.length > 0 && (
        <div className="cyber-panel rounded-2xl p-4 space-y-3 border border-amber-400/25">
          <h3 className="text-sm font-bold text-amber-300 flex items-center gap-2">
            <Award className="w-4 h-4" />
            <span>
              {lang === 'my'
                ? `ရရှိထားသော ပြိုင်ပွဲဆုတံဆိပ်နှင့် လက်ဆောင်များ (${gifts.length})`
                : `Tournament Trophies & Admin Gifts (${gifts.length})`}
            </span>
          </h3>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {gifts.map((g) => (
              <div
                key={g.id}
                className="p-3 rounded-xl bg-gradient-to-br from-[#0e1526] to-[#1a1308] border border-amber-400/35 flex items-center gap-3"
              >
                <GiftTrophyIcon iconId={g.iconId} className="w-10 h-10 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">
                    {lang === 'my' ? g.nameMy : g.name}
                  </div>
                  <div className="text-[10px] text-amber-300 truncate">
                    {g.tournamentTitle || 'Vanguard Official Reward'} {g.placement ? `• ${g.placement.toUpperCase()}` : ''}
                  </div>
                  {g.note && <div className="text-[10px] text-slate-400 truncate mt-0.5">{g.note}</div>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Display Name, Bio & Favorite Game Editor */}
      <form onSubmit={handleSaveProfile} className="cyber-panel rounded-2xl p-4 sm:p-5 space-y-3 border border-white/10">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <FileText className="w-4 h-4 text-amber-400" />
          <span>{lang === 'my' ? 'ကိုယ်ရေးအချက်အလက်နှင့် Bio ပြင်ဆင်ရန်' : 'Edit Profile Details & Bio'}</span>
        </h3>

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Display Name"
              className="w-full h-10 px-3.5 rounded-xl bg-[#070b14] border border-white/10 text-xs text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-[11px] text-slate-400 mb-1">
              {lang === 'my' ? 'အကြိုက်ဆုံး ဂိမ်း (Favorite Game)' : 'Favorite Game'}
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {(['connect4', 'tictactoe', 'rps', 'sakarhtar'] as GameType[]).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setFavoriteGame(g)}
                  className={`h-10 rounded-xl flex items-center justify-center border cursor-pointer transition-all ${
                    favoriteGame === g ? 'cyber-gold-active' : 'bg-[#070b14] border-white/10 opacity-70 hover:opacity-100'
                  }`}
                  title={g}
                >
                  <GameBadgeIcon gameType={g} className="w-6 h-6" />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-[11px] text-slate-400">
              {lang === 'my' ? 'ကိုယ်ရေးအကျဉ်း (Player Bio)' : 'Player Bio'}
            </label>
            <span className="text-[10px] font-mono text-slate-500">{bio.length}/180</span>
          </div>
          <textarea
            rows={2}
            maxLength={180}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder={
              lang === 'my'
                ? 'အခြားကစားသမားများ သင့် Profile ဝင်ကြည့်ချိန် မြင်ရမည့် စာသားရေးပါ...'
                : 'Write a short bio visible when players inspect your profile...'
            }
            className="w-full p-3 rounded-xl bg-[#070b14] border border-white/10 text-xs text-white focus:outline-none focus:border-amber-400"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="h-10 px-6 rounded-xl cyber-cta-gold text-slate-950 font-extrabold text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : lang === 'my' ? 'Profile & Bio သိမ်းဆည်းမည်' : 'Save Profile & Bio'}</span>
          </button>
        </div>
      </form>

      {/* Premium Profile Banner Selector */}
      <div className="cyber-panel rounded-2xl p-4 sm:p-5 space-y-3 border border-white/10">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-amber-400" />
            <span>{lang === 'my' ? 'Profile Banner များ ရွေးချယ်ရန်' : 'Select Premium Profile Banner'}</span>
          </h3>
          <button
            type="button"
            onClick={() => bannerInputRef.current?.click()}
            className="text-[11px] font-bold text-amber-300 hover:text-amber-200 flex items-center gap-1 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" /> {lang === 'my' ? 'ကိုယ်ပိုင်ပုံတင်မည်' : 'Upload Custom'}
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {PREMIUM_BANNER_TEMPLATES.map((b) => {
            const unlocked =
              user.role === 'admin' || (user.xp || 0) >= b.minXp || unlockedBanners.includes(b.id);
            const equipped = !customBannerUrl && selectedBannerId === b.id;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => handleEquipBanner(b.id, unlocked)}
                className={`rounded-xl overflow-hidden border text-left transition-all cursor-pointer ${
                  equipped
                    ? 'border-amber-400 ring-2 ring-amber-400/40'
                    : unlocked
                    ? 'border-white/10 hover:border-amber-400/50'
                    : 'border-white/5 opacity-55'
                }`}
              >
                <div className="h-16 w-full relative">
                  <img src={b.imageUrl} alt={b.name} className="w-full h-full object-cover" />
                  {equipped && (
                    <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 text-[9px] font-extrabold">
                      ACTIVE
                    </span>
                  )}
                  {!unlocked && (
                    <span className="absolute inset-0 bg-black/55 flex items-center justify-center text-[10px] font-mono text-amber-200 gap-1">
                      <Lock className="w-3 h-3" /> {b.minXp} XP
                    </span>
                  )}
                </div>
                <div className="p-2 bg-[#080d17] text-[11px] font-bold text-white truncate">
                  {lang === 'my' ? b.nameMy : b.name}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* SVG Profile Frame Selector */}
      <div className="cyber-panel rounded-2xl p-4 sm:p-5 space-y-3 border border-white/10">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{lang === 'my' ? 'Profile Frame ဘောင်များ ရွေးချယ်ရန်' : 'Select Profile Frame'}</span>
          </h3>
          <span className="text-[11px] font-mono text-slate-400">XP: {user.xp}</span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
          {SVG_FRAME_TEMPLATES.map((tpl) => {
            const unlocked =
              user.role === 'admin' || (user.xp || 0) >= tpl.minXp || unlockedFrames.includes(tpl.id);
            const equipped = selectedFrame === tpl.id;
            return (
              <motion.button
                key={tpl.id}
                whileTap={{ scale: 0.96 }}
                type="button"
                onClick={() => handleEquipFrame(tpl.id, unlocked)}
                className={`p-2.5 rounded-2xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer relative ${
                  equipped
                    ? 'cyber-gold-active'
                    : unlocked
                    ? 'bg-[#090d16] border-white/10 hover:border-amber-400/40'
                    : 'bg-[#070a12] border-white/5 opacity-55'
                }`}
              >
                <div className="absolute top-2 right-2">
                  <RankTierIcon tier={tpl.id} className="w-4 h-4" />
                </div>
                <AvatarWithFrame
                  avatarUrl={user.avatarUrl}
                  frameId={tpl.id}
                  displayName={user.displayName}
                  size="md"
                />
                <div className="text-[11px] font-bold text-white truncate max-w-full">
                  {lang === 'my' ? tpl.nameMy : tpl.name}
                </div>
                <div className="text-[10px] font-mono text-amber-300 flex items-center gap-1">
                  {equipped ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" /> Active
                    </>
                  ) : unlocked ? (
                    'Unlocked'
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

      {/* Avatar Circular Crop Modal */}
      {cropSource && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl cyber-panel border border-amber-400/50 p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">
                {lang === 'my' ? 'Frame အတွင်း ပုံနေရာညှိပြီး Crop ဖြတ်ပါ' : 'Fit & Crop Avatar in Frame'}
              </h3>
              <button
                type="button"
                onClick={() => setCropSource(null)}
                className="w-8 h-8 rounded-lg bg-white/10 text-slate-300 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex justify-center">
              <div
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                className="relative w-[220px] h-[220px] rounded-full overflow-hidden bg-[#070b14] border-4 border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.45)] touch-none cursor-grab active:cursor-grabbing flex items-center justify-center"
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
              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="flex-1 accent-amber-500 cursor-pointer"
              />
              <ZoomIn className="w-4 h-4 text-amber-400" />
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setCropSource(null)}
                className="h-11 rounded-xl bg-white/10 text-xs font-bold text-white cursor-pointer"
              >
                {lang === 'my' ? 'မလုပ်တော့ပါ' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={applyCroppedAvatar}
                className="h-11 rounded-xl cyber-cta-gold text-slate-950 font-bold text-xs cursor-pointer"
              >
                {lang === 'my' ? 'Crop လုပ်ပြီး တင်မည်' : 'Crop & Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
