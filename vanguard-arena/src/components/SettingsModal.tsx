import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Bell,
  Check,
  Copy,
  Globe,
  KeyRound,
  LogOut,
  Monitor,
  Music,
  RefreshCw,
  Settings,
  ShieldAlert,
  Smartphone,
  Volume2,
  X,
} from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db, isFirebaseConfigured } from '../lib/firebase.ts';
import type { Language, UserProfile } from '../types.ts';
import { soundEngine, type GraphicsQuality, type UserGameSettings } from '../utils/sound.ts';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
  lang: Language;
  onChangeLang: (lang: Language) => void;
  user: UserProfile;
  isAdmin?: boolean;
  onOpenAdmin?: () => void;
  onLogout: () => void;
  onNotify: (level: string, message: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  onClose,
  lang,
  onChangeLang,
  user,
  isAdmin,
  onOpenAdmin,
  onLogout,
  onNotify,
}) => {
  const [cfg, setCfg] = React.useState<UserGameSettings>(() => soundEngine.getSettings());
  const [idCopied, setIdCopied] = React.useState(false);
  const [newPass, setNewPass] = React.useState('');
  const [savingPass, setSavingPass] = React.useState(false);

  React.useEffect(() => {
    if (open) setCfg(soundEngine.getSettings());
  }, [open]);

  const patchCfg = (partial: Partial<UserGameSettings>) => {
    const updated = soundEngine.updateSettings(partial);
    setCfg(updated);
  };

  const handleCopyId = () => {
    navigator.clipboard?.writeText(user.gameId || user.id);
    soundEngine.playClick();
    setIdCopied(true);
    onNotify('success', lang === 'my' ? `Game ID (${user.gameId}) ကူးယူပြီးပါပြီ!` : `Copied Game ID: ${user.gameId}`);
    setTimeout(() => setIdCopied(false), 2000);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newPass.trim();
    if (clean.length < 4) {
      onNotify('error', lang === 'my' ? 'စကားဝှက် အနည်းဆုံး ၄ လုံး ထည့်ပါ။' : 'Password must be at least 4 characters.');
      return;
    }
    setSavingPass(true);
    try {
      const localKey = `myanrena_acc_${user.id}`;
      const raw = localStorage.getItem(localKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        parsed.password = clean;
        localStorage.setItem(localKey, JSON.stringify(parsed));
      }
      if (isFirebaseConfigured && db && user.role !== 'admin') {
        await setDoc(doc(db, 'users', user.id), { password: clean }, { merge: true }).catch(() => {});
      }
      setNewPass('');
      onNotify('success', lang === 'my' ? 'စကားဝှက် အသစ်ပြောင်းလဲပြီးပါပြီ!' : 'Password updated successfully!');
    } finally {
      setSavingPass(false);
    }
  };

  const handleClearCache = () => {
    if ('caches' in window) {
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
    }
    window.location.reload();
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
        >
          <motion.div
            initial={{ scale: 0.94, y: 16, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.94, y: 16, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 360, damping: 26 }}
            className="w-full max-w-md max-h-[90dvh] overflow-y-auto rounded-2xl cyber-panel border border-amber-400/45 p-5 space-y-4 shadow-2xl"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-display font-bold text-white">
                  {lang === 'my' ? 'ဂိမ်း ဆက်တင်များ (Settings)' : 'Game Settings'}
                </h2>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/15 text-slate-300 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* One-Click Copy Game ID Box */}
            <div className="p-3 rounded-xl bg-[#070b14] border border-amber-400/30 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[11px] text-slate-400">{user.displayName} — Game ID</div>
                <div className="text-sm font-mono font-bold text-amber-300 tracking-wider">{user.gameId}</div>
              </div>
              <button
                type="button"
                onClick={handleCopyId}
                className="px-3 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-xs font-bold text-amber-200 flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                {idCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{idCopied ? (lang === 'my' ? 'ကူးပြီး' : 'Copied') : (lang === 'my' ? 'ID ကူးမည်' : 'Copy ID')}</span>
              </button>
            </div>

            {/* Audio Settings: Background Music & Sound FX */}
            <div className="p-3.5 rounded-xl bg-[#070b14] border border-white/10 space-y-3.5">
              {/* Music */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <Music className="w-4 h-4 text-sky-400" />
                    {lang === 'my' ? 'နောက်ခံတေးဂီတ (Music)' : 'Background Music'}
                  </span>
                  <button
                    type="button"
                    onClick={() => patchCfg({ musicEnabled: !cfg.musicEnabled })}
                    className={`px-3 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                      cfg.musicEnabled ? 'bg-emerald-500 text-slate-950' : 'bg-white/10 text-slate-400'
                    }`}
                  >
                    {cfg.musicEnabled ? 'ON' : 'OFF'}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={cfg.musicVolume}
                    disabled={!cfg.musicEnabled}
                    onChange={(e) => patchCfg({ musicVolume: Number(e.target.value) })}
                    className="flex-1 accent-sky-400 cursor-pointer disabled:opacity-40"
                  />
                  <span className="w-9 text-right text-[11px] font-mono text-slate-300">{cfg.musicVolume}%</span>
                </div>
              </div>

              <div className="h-px bg-white/10" />

              {/* Sound FX */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-amber-400" />
                    {lang === 'my' ? 'အသံအကျိုးသက်ရောက်မှု (Sound FX)' : 'Sound Effects (FX)'}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => soundEngine.playNotify()}
                      className="px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[10px] font-semibold text-amber-300 cursor-pointer"
                    >
                      Test
                    </button>
                    <button
                      type="button"
                      onClick={() => patchCfg({ sfxEnabled: !cfg.sfxEnabled })}
                      className={`px-3 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                        cfg.sfxEnabled ? 'bg-emerald-500 text-slate-950' : 'bg-white/10 text-slate-400'
                      }`}
                    >
                      {cfg.sfxEnabled ? 'ON' : 'OFF'}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={cfg.sfxVolume}
                    disabled={!cfg.sfxEnabled}
                    onChange={(e) => patchCfg({ sfxVolume: Number(e.target.value) })}
                    className="flex-1 accent-amber-400 cursor-pointer disabled:opacity-40"
                  />
                  <span className="w-9 text-right text-[11px] font-mono text-slate-300">{cfg.sfxVolume}%</span>
                </div>
              </div>
            </div>

            {/* Graphic Quality Settings */}
            <div className="p-3.5 rounded-xl bg-[#070b14] border border-white/10 space-y-2.5">
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <Monitor className="w-4 h-4 text-purple-400" />
                {lang === 'my' ? 'ဂရပ်ဖစ် အရည်အသွေး (Graphics)' : 'Graphics Quality'}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'low', label: lang === 'my' ? 'အနိမ့် (Fast)' : 'Low' },
                    { id: 'medium', label: lang === 'my' ? 'အလယ်' : 'Medium' },
                    { id: 'high', label: lang === 'my' ? 'အမြင့် (Ultra)' : 'High' },
                  ] as Array<{ id: GraphicsQuality; label: string }>
                ).map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => {
                      patchCfg({ graphics: g.id });
                      soundEngine.playClick();
                    }}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      cfg.graphics === g.id
                        ? 'cyber-violet-active text-white'
                        : 'bg-[#0e1526] border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Language, Vibration & Notification Preferences */}
            <div className="p-3.5 rounded-xl bg-[#070b14] border border-white/10 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-200 font-semibold flex items-center gap-2">
                  <Globe className="w-4 h-4 text-sky-400" />
                  {lang === 'my' ? 'ဘာသာစကား (Language)' : 'Language'}
                </span>
                <div className="flex gap-1 p-0.5 rounded-lg bg-[#101728] border border-white/10">
                  <button
                    type="button"
                    onClick={() => onChangeLang('en')}
                    className={`px-2.5 py-1 rounded-md font-bold cursor-pointer ${
                      lang === 'en' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                    }`}
                  >
                    EN
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeLang('my')}
                    className={`px-2.5 py-1 rounded-md font-bold cursor-pointer ${
                      lang === 'my' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                    }`}
                  >
                    မြန်မာ
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-200 font-semibold flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  {lang === 'my' ? 'ဖုန်းတုန်ခါမှု (Vibration)' : 'Haptic Vibration'}
                </span>
                <button
                  type="button"
                  onClick={() => patchCfg({ haptics: !cfg.haptics })}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                    cfg.haptics ? 'bg-emerald-500 text-slate-950' : 'bg-white/10 text-slate-400'
                  }`}
                >
                  {cfg.haptics ? 'ON' : 'OFF'}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-200 font-semibold flex items-center gap-2">
                  <Bell className="w-4 h-4 text-amber-400" />
                  {lang === 'my' ? 'အသိပေးချက်များ (Alerts)' : 'Push Popups'}
                </span>
                <button
                  type="button"
                  onClick={() => patchCfg({ showNotifications: !cfg.showNotifications })}
                  className={`px-3 py-1 rounded-lg text-[11px] font-bold cursor-pointer ${
                    cfg.showNotifications ? 'bg-emerald-500 text-slate-950' : 'bg-white/10 text-slate-400'
                  }`}
                >
                  {cfg.showNotifications ? 'ON' : 'OFF'}
                </button>
              </div>
            </div>

            {/* Quick Password Update (Players Only) */}
            {!isAdmin && (
              <form onSubmit={handleChangePassword} className="p-3.5 rounded-xl bg-[#070b14] border border-white/10 space-y-2">
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-amber-400" />
                  {lang === 'my' ? 'စကားဝှက် ပြောင်းလဲရန်' : 'Change Account Password'}
                </div>
                <div className="flex gap-2">
                  <input
                    type="password"
                    minLength={4}
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    placeholder={lang === 'my' ? 'စကားဝှက်အသစ် (၄ လုံးအထက်)' : 'New password (min 4 chars)'}
                    className="flex-1 h-9 px-3 rounded-lg bg-[#101728] border border-white/10 text-xs text-white"
                  />
                  <button
                    type="submit"
                    disabled={savingPass || !newPass.trim()}
                    className="px-3.5 h-9 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs cursor-pointer"
                  >
                    {lang === 'my' ? 'ပြောင်းမည်' : 'Update'}
                  </button>
                </div>
              </form>
            )}

            {/* Admin Shortcut (Visible ONLY for Admin) */}
            {isAdmin && onOpenAdmin && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAdmin();
                }}
                className="w-full h-10 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 text-amber-200 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>Open Master Admin Panel</span>
              </button>
            )}

            {/* System Actions: Clear Cache & Logout */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleClearCache}
                className="h-11 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
                <span>{lang === 'my' ? 'Cache ရှင်းမည်' : 'Reload App'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLogout();
                }}
                className="h-11 rounded-xl bg-rose-500/20 hover:bg-rose-500/35 border border-rose-500/40 text-xs font-extrabold text-rose-200 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>{lang === 'my' ? 'အကောင့်ထွက်မည်' : 'Sign Out'}</span>
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
