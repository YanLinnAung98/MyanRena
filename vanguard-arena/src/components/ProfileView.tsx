import React from 'react';
import { motion } from 'motion/react';
import { Camera, Check, Lock, Save, Sparkles, Upload, X, ZoomIn, ZoomOut } from 'lucide-react';
import type { Language, UserProfile } from '../types.ts';
import { SVG_FRAME_TEMPLATES } from '../utils/gameArtworks.ts';
import { AvatarWithFrame } from './AvatarWithFrame.tsx';

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
  const [selectedFrame, setSelectedFrame] = React.useState(user.frameId || 'bronze');
  const [saving, setSaving] = React.useState(false);

  // Image Cropper State
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const [cropSource, setCropSource] = React.useState<string | null>(null);
  const [zoom, setZoom] = React.useState<number>(1.15);
  const [offset, setOffset] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [dragging, setDragging] = React.useState(false);
  const dragStartRef = React.useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const imgRef = React.useRef<HTMLImageElement | null>(null);

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

    // Circular Clipping Mask
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
    const ratio = size / 220; // Viewport is 220x220
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
    onNotify('success', lang === 'my' ? 'Profile ဓာတ်ပုံ အသစ်ပြောင်းလဲပြီးပါပြီ!' : 'Profile picture updated!');
  };

  const handleEquipFrame = async (frameId: string, unlocked: boolean) => {
    if (!unlocked) {
      onNotify('error', lang === 'my' ? 'ဤ Frame ကို ရရှိရန် XP ပိုမိုစုဆောင်းပါ။' : 'Earn more XP to unlock this frame.');
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
    onNotify('success', lang === 'my' ? 'Profile Frame တပ်ဆင်ပြီးပါပြီ!' : 'Profile frame equipped!');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updatedUser = {
        ...user,
        displayName: displayName.trim() || user.displayName,
        frameId: selectedFrame,
      };
      onUserUpdated(updatedUser);
      await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ displayName: updatedUser.displayName, frameId: selectedFrame }),
      });
      onNotify('success', lang === 'my' ? 'Profile သိမ်းဆည်းပြီးပါပြီ!' : 'Profile saved!');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-6 py-3 sm:py-6 space-y-4">
      {/* Top Avatar + Crop Upload Card */}
      <div className="cyber-panel rounded-2xl p-4 sm:p-6 border border-amber-500/25 flex flex-col sm:flex-row items-center gap-4">
        <div className="relative">
          <AvatarWithFrame
            avatarUrl={user.avatarUrl}
            frameId={selectedFrame}
            displayName={user.displayName}
            size="xl"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-1 -left-1 z-30 w-9 h-9 rounded-full bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center shadow-lg cursor-pointer"
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

        <div className="flex-1 text-center sm:text-left space-y-1.5">
          <h2 className="text-lg sm:text-xl font-display font-bold text-white">{user.displayName}</h2>
          <div className="text-xs font-mono text-amber-400">
            {user.gameId} • {user.xp} XP ({user.rank || 'Silver'})
          </div>
          <div className="pt-1 flex flex-wrap justify-center sm:justify-start gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-xs font-bold text-amber-300 flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{lang === 'my' ? 'ဓာတ်ပုံတင်ပြီး Crop ညှိမည်' : 'Upload & Crop Photo'}</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center bg-[#070b14] p-3 rounded-xl border border-white/10 text-xs shrink-0">
          <div>
            <div className="text-slate-400">Win</div>
            <div className="font-bold text-emerald-400 text-sm">{user.wins || 0}</div>
          </div>
          <div>
            <div className="text-slate-400">Loss</div>
            <div className="font-bold text-rose-400 text-sm">{user.losses || 0}</div>
          </div>
          <div>
            <div className="text-slate-400">Draw</div>
            <div className="font-bold text-sky-400 text-sm">{user.draws || 0}</div>
          </div>
        </div>
      </div>

      {/* SVG Profile Frame Selector */}
      <div className="cyber-panel rounded-2xl p-4 sm:p-5 space-y-3 border border-white/10">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>{lang === 'my' ? 'Profile Frame ဘောင်များ ရွေးချယ်ရန်' : 'Select Profile Frame'}</span>
          </h3>
          <span className="text-[11px] text-slate-400">XP: {user.xp}</span>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
          {SVG_FRAME_TEMPLATES.map((tpl) => {
            const unlocked = user.role === 'admin' || (user.xp || 0) >= tpl.minXp;
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

      {/* Display Name Form */}
      <form onSubmit={handleSaveProfile} className="cyber-panel rounded-2xl p-4 flex gap-2 items-center">
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Display Name"
          className="flex-1 h-11 px-3.5 rounded-xl bg-[#070b14] border border-white/10 text-sm text-white focus:outline-none focus:border-amber-400"
        />
        <button
          type="submit"
          disabled={saving}
          className="h-11 px-5 rounded-xl cyber-cta-gold text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
        >
          <Save className="w-4 h-4" />
          <span>{lang === 'my' ? 'သိမ်းဆည်းမည်' : 'Save'}</span>
        </button>
      </form>

      {/* Interactive Frame Crop Modal */}
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

            <p className="text-[11px] text-slate-400 text-center">
              {lang === 'my'
                ? 'ပုံကို လက်ဖြင့်ဆွဲရွှေ့ပြီး အောက်မှ Zoom ဖြင့် အရွယ်အစား ချိန်ညှိပါ'
                : 'Drag photo to center and adjust zoom slider'}
            </p>

            {/* 220x220 Interactive Circular Crop Viewport with Active Frame Guide */}
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
                  style={{
                    transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                  }}
                  className="max-w-none w-full h-full object-cover select-none pointer-events-none"
                />
                {/* Crosshair Center Guide */}
                <div className="absolute inset-0 rounded-full ring-2 ring-inset ring-white/30 pointer-events-none" />
              </div>
            </div>

            {/* Zoom Slider */}
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
                {lang === 'my' ? '✓ Crop လုပ်ပြီး တင်မည်' : '✓ Crop & Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
