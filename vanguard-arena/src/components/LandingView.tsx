import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  Check,
  Copy,
  KeyRound,
  Lock,
  Shield,
  Swords,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { GAME_LIST } from '../games/registry.ts';
import { TRANSLATIONS } from '../i18n/translations.ts';
import { db, isFirebaseConfigured } from '../lib/firebase.ts';
import { saveActiveSessionUser } from '../lib/serverlessApi.ts';
import type { LandingContent, Language, UserProfile } from '../types.ts';
import { createAvatarSvg, GAME_ARTWORKS } from '../utils/gameArtworks.ts';
import { soundEngine } from '../utils/sound.ts';
import { LanguageSwitcher } from './LanguageSwitcher.tsx';

interface LandingViewProps {
  lang: Language;
  onChangeLang: (lang: Language) => void;
  onlineCount: number;
  landingContent: LandingContent;
  onAuthenticated: (token: string, user: UserProfile, rememberMe: boolean) => void;
}

export const LandingView: React.FC<LandingViewProps> = ({
  lang,
  onChangeLang,
  onlineCount,
  landingContent,
  onAuthenticated,
}) => {
  const t = TRANSLATIONS[lang];
  const [authMode, setAuthMode] = React.useState<'signin' | 'signup'>('signin');
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [displayName, setDisplayName] = React.useState('');
  const [rememberMe, setRememberMe] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [muted, setMuted] = React.useState(soundEngine.isMuted());

  const [signupPinModal, setSignupPinModal] = React.useState<{
    token: string;
    user: UserProfile;
    pin: string;
    rememberMe: boolean;
  } | null>(null);
  const [pinCopied, setPinCopied] = React.useState(false);

  const [recoveryOpen, setRecoveryOpen] = React.useState(false);
  const [recUsername, setRecUsername] = React.useState('');
  const [recPin, setRecPin] = React.useState('');
  const [recNewPassword, setRecNewPassword] = React.useState('');
  const [recLoading, setRecLoading] = React.useState(false);
  const [recError, setRecError] = React.useState('');
  const [recSuccess, setRecSuccess] = React.useState('');

  const toggleMute = () => {
    const next = !muted;
    soundEngine.setMuted(next);
    setMuted(next);
  };

  const buildPlayerProfile = (base: Partial<UserProfile> & { id: string; username: string }): UserProfile => {
    const name = base.displayName || base.username;
    return {
      ...base,
      id: base.id,
      username: base.username,
      displayName: name,
      gameId: base.gameId || `MR-${Math.floor(100000 + Math.random() * 900000)}`,
      avatarUrl: base.avatarUrl || createAvatarSvg(name),
      frameId: base.frameId || 'bronze',
      xp: typeof base.xp === 'number' ? base.xp : 1000,
      rank: base.rank || 'Silver',
      wins: base.wins || 0,
      losses: base.losses || 0,
      draws: base.draws || 0,
      role: 'player',
      isAdmin: false,
      friends: base.friends || [],
      blocked: base.blocked || [],
    } as UserProfile;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();

    try {
      if (!cleanUser || !cleanPass) {
        throw new Error(lang === 'my' ? 'အကောင့်အမည်နှင့် စကားဝှက် ထည့်သွင်းပါ။' : 'Please enter username and password.');
      }

      if (authMode === 'signin') {
        if (cleanUser === 'yanlinnaung' && cleanPass === '163104') {
          const adminProfile = {
            id: 'admin_yanlinnaung',
            username: 'yanlinnaung',
            displayName: 'Yan Linn Aung',
            gameId: '163104',
            role: 'admin',
            isAdmin: true,
            xp: 3000,
            rank: 'Legend',
            wins: 45,
            losses: 2,
            draws: 1,
            frameId: 'legend',
            avatarUrl: createAvatarSvg('YL', '#f59e0b', '#090d16'),
            friends: [],
            blocked: [],
          } as unknown as UserProfile;

          saveActiveSessionUser(adminProfile);
          if (isFirebaseConfigured && db) {
            await setDoc(doc(db, 'users', 'admin_yanlinnaung'), adminProfile, { merge: true }).catch(() => {});
          }

          soundEngine.playNotify();
          onAuthenticated('admin-token', adminProfile, rememberMe);
          return;
        }

        if (cleanUser === 'yanlinnaung') {
          throw new Error(lang === 'my' ? 'စကားဝှက် မှားယွင်းနေပါသည်။' : 'Incorrect password.');
        }

        const playerId = `player_${cleanUser}`;
        let foundRecord: any = null;

        if (isFirebaseConfigured && db) {
          const snap = await getDoc(doc(db, 'users', playerId)).catch(() => null);
          if (snap && snap.exists()) {
            foundRecord = snap.data();
          }
        }

        if (!foundRecord) {
          const localRaw = localStorage.getItem(`myanrena_acc_${cleanUser}`);
          if (localRaw) {
            foundRecord = JSON.parse(localRaw);
          }
        }

        if (!foundRecord) {
          throw new Error(
            lang === 'my'
              ? 'ဤအကောင့် မရှိသေးပါ။ အပေါ်ရှိ Sign Up ကို နှိပ်ပြီး အကောင့်သစ်ဖွင့်ပါ။'
              : 'Account not found. Please switch to Sign Up first.'
          );
        }

        if (foundRecord.password && foundRecord.password !== cleanPass) {
          throw new Error(lang === 'my' ? 'စကားဝှက် မှားယွင်းနေပါသည်။' : 'Incorrect password.');
        }

        if (foundRecord.status === 'banned' || foundRecord.status === 'suspended') {
          throw new Error(
            lang === 'my' ? 'သင့်အကောင့်ကို ပိတ်သိမ်းထားပါသည်။' : 'Your account is suspended or banned.'
          );
        }

        const playerProfile = buildPlayerProfile({ ...foundRecord, id: playerId, username: cleanUser });
        saveActiveSessionUser(playerProfile);
        soundEngine.playNotify();
        onAuthenticated(`token_${playerId}`, playerProfile, rememberMe);
      } else {
        if (cleanUser === 'yanlinnaung' || cleanUser === 'admin') {
          throw new Error('This username is reserved.');
        }

        const recoveryPin = String(Math.floor(100000 + Math.random() * 900000));
        const newId = `player_${cleanUser}`;
        const newUser = buildPlayerProfile({
          id: newId,
          username: cleanUser,
          displayName: displayName.trim() || username.trim(),
          gameId: `MR-${Math.floor(100000 + Math.random() * 900000)}`,
          xp: 1000,
          rank: 'Silver',
        });

        const recordToSave = {
          ...newUser,
          password: cleanPass,
          recoveryPin,
          status: 'active',
          createdAt: Date.now(),
        };

        if (isFirebaseConfigured && db) {
          const userRef = doc(db, 'users', newId);
          const existing = await getDoc(userRef).catch(() => null);
          if (existing && existing.exists()) {
            throw new Error(
              lang === 'my'
                ? 'ဤအကောင့်အမည်ကို အခြားသူ ယူထားပြီး ဖြစ်ပါသည်။'
                : 'Username already exists. Please choose another.'
            );
          }
          await setDoc(userRef, recordToSave).catch(() => {});
        }

        localStorage.setItem(`myanrena_acc_${cleanUser}`, JSON.stringify(recordToSave));
        saveActiveSessionUser(newUser);

        soundEngine.playNotify();
        setPinCopied(false);
        setSignupPinModal({
          token: `token_${newId}`,
          user: newUser,
          pin: recoveryPin,
          rememberMe,
        });
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleRecoverySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRecError('');
    setRecSuccess('');
    setRecLoading(true);

    try {
      const cleanUser = recUsername.trim().toLowerCase();
      let updated = false;

      if (isFirebaseConfigured && db) {
        const userRef = doc(db, 'users', `player_${cleanUser}`);
        const snap = await getDoc(userRef).catch(() => null);
        if (snap && snap.exists()) {
          const data = snap.data() as { recoveryPin?: string };
          if (data.recoveryPin !== recPin.trim()) {
            throw new Error(lang === 'my' ? 'Recovery PIN မှားယွင်းနေပါသည်။' : 'Invalid 6-digit Recovery PIN.');
          }
          await updateDoc(userRef, { password: recNewPassword.trim() });
          updated = true;
        }
      }

      const raw = localStorage.getItem(`myanrena_acc_${cleanUser}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.recoveryPin !== recPin.trim()) {
          throw new Error(lang === 'my' ? 'Recovery PIN မှားယွင်းနေပါသည်။' : 'Invalid 6-digit Recovery PIN.');
        }
        parsed.password = recNewPassword.trim();
        localStorage.setItem(`myanrena_acc_${cleanUser}`, JSON.stringify(parsed));
        updated = true;
      }

      if (!updated) {
        throw new Error(lang === 'my' ? 'အကောင့်အမည် ရှာမတွေ့ပါ။' : 'Username not found.');
      }

      setRecSuccess(
        lang === 'my'
          ? 'စကားဝှက် အသစ်ပြောင်းလဲပြီးပါပြီ! ပြန်လည်ဝင်ရောက်နိုင်ပါပြီ။'
          : 'Password updated successfully! You can now sign in.'
      );
    } catch (err: any) {
      setRecError(err?.message || 'Recovery failed.');
    } finally {
      setRecLoading(false);
    }
  };

  const heroTitle = lang === 'my' ? landingContent.heroTitleMy : landingContent.heroTitleEn;
  const heroSubtitle = lang === 'my' ? landingContent.heroSubtitleMy : landingContent.heroSubtitleEn;

  return (
    <div className="h-dvh lg:h-auto lg:min-h-dvh-safe overflow-hidden lg:overflow-visible bg-[#0A0D14] text-slate-100 flex flex-col">
      {/* Compact Header */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0A0D14]/90 backdrop-blur-md shrink-0">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-base sm:text-xl font-display font-bold tracking-tight text-white truncate">
              {t.brandName}
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-semibold shrink-0">
              ● {onlineCount}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <LanguageSwitcher lang={lang} onChange={onChangeLang} />
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? 'Unmute audio' : 'Mute audio'}
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl border border-white/10 text-slate-300 hover:text-white cursor-pointer"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Viewport — Fits 100% on Mobile Without Scrolling */}
      <main className="flex-1 flex flex-col justify-center lg:block relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <img
            src={GAME_ARTWORKS.heroBanner}
            alt="Vanguard Arena Stage"
            className="w-full h-full object-cover opacity-35"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[#0A0D14]/70 via-[#0A0D14]/85 to-[#0A0D14]" />
        </div>

        <div className="relative max-w-7xl mx-auto w-full px-3 sm:px-6 py-3 lg:py-16 grid lg:grid-cols-12 gap-4 lg:gap-12 items-center">
          {/* Desktop Hero Column (Hidden on Mobile so Auth Form fits with Zero Scroll) */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="hidden lg:block lg:col-span-7 space-y-6"
          >
            <div className="flex items-center gap-3 text-xs font-medium text-amber-400">
              <span>{onlineCount} {t.landing.playersOnlineNow}</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-300">{t.landing.lowLatency}</span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-300">{t.landing.rankedAndTournaments}</span>
            </div>
            <h1 className="fluid-hero font-display font-bold tracking-tight text-white">
              {heroTitle}
            </h1>
            <p className="text-base text-slate-300 max-w-2xl leading-relaxed">
              {heroSubtitle}
            </p>
            <div className="grid grid-cols-3 gap-4 pt-2 max-w-xl">
              <div className="p-4 rounded-2xl bg-[#121826]/90 border border-white/10">
                <div className="text-2xl font-display font-bold text-white">4</div>
                <div className="text-xs text-slate-400 mt-1">{t.landing.competitiveTitles}</div>
              </div>
              <div className="p-4 rounded-2xl bg-[#121826]/90 border border-white/10">
                <div className="text-2xl font-display font-bold text-amber-400">1-8P</div>
                <div className="text-xs text-slate-400 mt-1">Custom & Sakar-Htar</div>
              </div>
              <div className="p-4 rounded-2xl bg-[#121826]/90 border border-white/10">
                <div className="text-2xl font-display font-bold text-sky-400">Live</div>
                <div className="text-xs text-slate-400 mt-1">Real-Time PvP</div>
              </div>
            </div>
          </motion.div>

          {/* Sign In / Sign Up Card — Directly Visible Above Fold on Mobile */}
          <div id="auth-card" className="lg:col-span-5 w-full max-w-md mx-auto">
            <div className="p-5 sm:p-7 rounded-2xl bg-[#121826]/95 backdrop-blur-xl border border-white/10 shadow-2xl space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg sm:text-xl font-display font-bold text-white">
                    {authMode === 'signin' ? t.auth.signInTitle : t.auth.signUpTitle}
                  </h2>
                  <p className="text-[11px] text-slate-400 lg:hidden">
                    Connect 4 · Tic-Tac-Toe · RPS · စကားထာ
                  </p>
                </div>
                <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0A0D14] border border-white/10 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('signin');
                      setError('');
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      authMode === 'signin' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {t.auth.signIn}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('signup');
                      setError('');
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      authMode === 'signup' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {t.auth.signUp}
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {t.auth.username}
                  </label>
                  <input
                    type="text"
                    required
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={t.auth.usernamePlaceholder}
                    className="w-full h-11 px-3.5 rounded-xl bg-[#0A0D14] border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                {authMode === 'signup' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      {t.auth.displayName}
                    </label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder={t.auth.displayNamePlaceholder}
                      className="w-full h-11 px-3.5 rounded-xl bg-[#0A0D14] border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    {t.auth.password}
                  </label>
                  <input
                    type="password"
                    required
                    autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t.auth.passwordPlaceholder}
                    className="w-full h-11 px-3.5 rounded-xl bg-[#0A0D14] border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400"
                  />
                </div>

                {authMode === 'signin' && (
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <label className="inline-flex items-center gap-2 text-slate-300 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 rounded border-white/20 bg-[#0A0D14] accent-amber-500 cursor-pointer"
                      />
                      <span>{t.auth.rememberMe}</span>
                    </label>

                    <button
                      type="button"
                      onClick={() => {
                        setRecoveryOpen(true);
                        setRecError('');
                        setRecSuccess('');
                      }}
                      className="text-amber-400 hover:text-amber-300 font-medium cursor-pointer"
                    >
                      {t.auth.forgotPassword}
                    </button>
                  </div>
                )}

                {error && (
                  <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <span>
                    {loading
                      ? t.auth.authenticating
                      : authMode === 'signin'
                      ? t.auth.signIn
                      : t.auth.createAccount}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>

              <div className="pt-1 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                <Lock className="w-3 h-3 text-amber-400" />
                <span>{lang === 'my' ? 'အကောင့်သစ်ဖွင့်လျှင် 6-Digit PIN ရရှိပါမည်' : 'Instant account with 6-Digit Recovery PIN'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Desktop Game Showcase */}
        <section id="games" className="hidden lg:block max-w-7xl mx-auto px-6 py-14 space-y-8 relative">
          <h2 className="text-3xl font-display font-bold text-white">{t.landing.featuredTitles}</h2>
          <div className="grid grid-cols-4 gap-6">
            {GAME_LIST.map((game) => {
              const gameTitle = lang === 'my' ? game.nameMy : game.name;
              const gameTagline = lang === 'my' ? game.taglineMy : game.tagline;
              return (
                <article key={game.id} className="rounded-2xl bg-[#121826] border border-white/10 overflow-hidden flex flex-col">
                  <div className="aspect-[4/3] bg-[#0B101B]">
                    <img src={GAME_ARTWORKS[game.id]} alt={gameTitle} className="w-full h-full object-cover" />
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="text-lg font-display font-bold text-white">{gameTitle}</h3>
                      <p className="text-xs text-slate-400 mt-1">{gameTagline}</p>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </main>

      {/* One-Time 6-Digit Backup Recovery PIN Modal */}
      <AnimatePresence>
        {signupPinModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div className="w-full max-w-md rounded-2xl bg-[#121826] border border-amber-400/50 p-6 space-y-4 shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center shrink-0">
                  <KeyRound className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-display font-bold text-white">{t.auth.pinModalTitle}</h3>
                  <p className="text-xs font-mono text-amber-300">{signupPinModal.user.gameId}</p>
                </div>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">{t.auth.pinModalDesc}</p>
              <div className="p-3.5 rounded-xl bg-[#0A0D14] border border-white/10 flex items-center justify-between gap-3">
                <span className="text-2xl font-mono font-bold tracking-[0.25em] text-amber-400">
                  {signupPinModal.pin}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(signupPinModal.pin);
                    setPinCopied(true);
                    setTimeout(() => setPinCopied(false), 2000);
                  }}
                  className="px-3 py-2 rounded-xl bg-white/10 text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer"
                >
                  {pinCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{pinCopied ? t.auth.copied : t.auth.copyPin}</span>
                </button>
              </div>
              <button
                type="button"
                onClick={() => {
                  const payload = signupPinModal;
                  setSignupPinModal(null);
                  onAuthenticated(payload.token, payload.user, payload.rememberMe);
                }}
                className="w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm cursor-pointer"
              >
                {t.auth.pinSavedBtn}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PIN Password Recovery Modal */}
      <AnimatePresence>
        {recoveryOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div className="w-full max-w-md rounded-2xl bg-[#121826] border border-white/15 p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-display font-bold text-white">{t.auth.recoveryTitle}</h3>
                <button
                  type="button"
                  onClick={() => setRecoveryOpen(false)}
                  className="w-9 h-9 rounded-xl bg-white/5 text-slate-300 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <form onSubmit={handleRecoverySubmit} className="space-y-3">
                <input
                  type="text"
                  required
                  value={recUsername}
                  onChange={(e) => setRecUsername(e.target.value)}
                  placeholder={t.auth.usernamePlaceholder}
                  className="w-full h-11 px-3.5 rounded-xl bg-[#0A0D14] border border-white/10 text-sm text-white"
                />
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={recPin}
                  onChange={(e) => setRecPin(e.target.value.replace(/\D/g, ''))}
                  placeholder={t.auth.recoveryPinPlaceholder}
                  className="w-full h-11 px-3.5 rounded-xl bg-[#0A0D14] border border-white/10 text-sm font-mono tracking-widest text-white"
                />
                <input
                  type="password"
                  required
                  minLength={4}
                  value={recNewPassword}
                  onChange={(e) => setRecNewPassword(e.target.value)}
                  placeholder={t.auth.newPasswordLabel}
                  className="w-full h-11 px-3.5 rounded-xl bg-[#0A0D14] border border-white/10 text-sm text-white"
                />
                {recError && <div className="p-2.5 rounded-xl bg-rose-500/10 text-xs text-rose-300">{recError}</div>}
                {recSuccess && <div className="p-2.5 rounded-xl bg-emerald-500/10 text-xs text-emerald-300">{recSuccess}</div>}
                <button
                  type="submit"
                  disabled={recLoading}
                  className="w-full h-11 rounded-xl bg-amber-500 text-slate-950 font-bold text-sm cursor-pointer"
                >
                  {t.auth.resetPasswordBtn}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
