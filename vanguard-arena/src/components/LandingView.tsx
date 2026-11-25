import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { GAME_LIST } from '../games/registry.ts';
import { TRANSLATIONS } from '../i18n/translations.ts';
import { db, isFirebaseConfigured, stripUndefined, withTimeout } from '../lib/firebase.ts';
import { normalizeGameId, saveActiveSessionUser } from '../lib/serverlessApi.ts';
import type { LandingContent, Language, UserProfile } from '../types.ts';
import { detectClientDevice } from '../utils/deviceDetector.ts';
import { createAvatarSvg, GAME_ARTWORKS } from '../utils/gameArtworks.ts';
import { soundEngine } from '../utils/sound.ts';

interface LandingViewProps {
  lang: Language;
  onlineCount: number;
  landingContent: LandingContent;
  onAuthenticated: (token: string, user: UserProfile, rememberMe: boolean) => void;
}

function makeSafePlayerId(rawUsername: string): string {
  const trimmed = rawUsername.trim().toLowerCase();
  const ascii = trimmed.replace(/[^a-z0-9_-]/g, '');
  if (ascii.length >= 2) return `player_${ascii}`;
  const bytes = Array.from(new TextEncoder().encode(trimmed));
  const hex = bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
  return `player_u_${hex.slice(0, 48)}`;
}

export const LandingView: React.FC<LandingViewProps> = ({
  lang,
  onlineCount,
  landingContent,
  onAuthenticated,
}) => {
  const t = TRANSLATIONS[lang];
  const [authMode, setAuthMode] = React.useState<'signin' | 'signup'>('signin');
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPass, setShowPass] = React.useState(false);
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
    const dev = detectClientDevice();
    return stripUndefined({
      ...base,
      ...dev,
      online: true,
      lastSeenMs: Date.now(),
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
      status: 'active',
      friends: base.friends || [],
      blocked: base.blocked || [],
    }) as UserProfile;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const cleanUser = username.trim().toLowerCase();
    const cleanPass = password.trim();
    const dev = detectClientDevice();

    try {
      if (cleanUser.length < 2) {
        throw new Error(
          lang === 'my'
            ? 'အကောင့်အမည် အနည်းဆုံး စာလုံး ၂ လုံး ရိုက်ထည့်ပါ။'
            : 'Username must be at least 2 characters.'
        );
      }
      if (cleanPass.length < 4) {
        throw new Error(
          lang === 'my'
            ? 'စကားဝှက် အနည်းဆုံး ၄ လုံး ရိုက်ထည့်ပါ။'
            : 'Password must be at least 4 characters.'
        );
      }

      if (authMode === 'signin') {
        // 1. Stealth Admin Login
        if (cleanUser === 'yanlinnaung' && cleanPass === '163104') {
          const adminProfile = stripUndefined({
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
            status: 'active',
            online: true,
            lastSeenMs: Date.now(),
            ...dev,
            avatarUrl: createAvatarSvg('YL', '#f59e0b', '#090d16'),
            friends: [],
            blocked: [],
          }) as unknown as UserProfile;

          saveActiveSessionUser(adminProfile);
          if (isFirebaseConfigured && db) {
            withTimeout(setDoc(doc(db, 'users', 'admin_yanlinnaung'), adminProfile, { merge: true }), 4500).catch(
              (err) => console.warn('Admin Firestore sync skipped:', err)
            );
          }

          soundEngine.playNotify();
          onAuthenticated('admin-token', adminProfile, rememberMe);
          return;
        }

        if (cleanUser === 'yanlinnaung') {
          throw new Error(lang === 'my' ? 'စကားဝှက် မှားယွင်းနေပါသည်။' : 'Incorrect password.');
        }

        // 2. Player Sign In (Check Cloud Firestore with Timeout, then LocalStorage fallback)
        const playerId = makeSafePlayerId(cleanUser);
        let foundRecord: any = null;

        if (isFirebaseConfigured && db) {
          try {
            const snap = await withTimeout(getDoc(doc(db, 'users', playerId)), 4500);
            if (snap && snap.exists()) {
              foundRecord = snap.data();
            }
          } catch (err) {
            console.warn('Firestore sign-in check fallback to local:', err);
          }
        }

        if (!foundRecord) {
          const localById = localStorage.getItem(`myanrena_acc_${playerId}`);
          const localLegacy = localStorage.getItem(`myanrena_acc_${cleanUser}`);
          if (localById) foundRecord = JSON.parse(localById);
          else if (localLegacy) foundRecord = JSON.parse(localLegacy);
        }

        if (!foundRecord) {
          throw new Error(
            lang === 'my'
              ? 'ဤအကောင့် မရှိသေးပါ။ အပေါ်ရှိ Sign Up ကို နှိပ်ပြီး အကောင့်သစ်ဖွင့်ပါ။'
              : 'Account not found. Please switch to Sign Up first.'
          );
        }

        if (foundRecord.password && String(foundRecord.password) !== cleanPass) {
          throw new Error(lang === 'my' ? 'စကားဝှက် မှားယွင်းနေပါသည်။' : 'Incorrect password.');
        }

        if (foundRecord.status === 'banned' || foundRecord.status === 'suspended') {
          throw new Error(
            lang === 'my' ? 'သင့်အကောင့်ကို Admin မှ ပိတ်သိမ်းထားပါသည်။' : 'Your account is suspended or banned.'
          );
        }

        const playerProfile = buildPlayerProfile({ ...foundRecord, id: playerId, username: cleanUser });
        saveActiveSessionUser(playerProfile);
        localStorage.setItem(
          `myanrena_acc_${playerId}`,
          JSON.stringify(stripUndefined({ ...foundRecord, ...playerProfile, password: cleanPass }))
        );

        if (isFirebaseConfigured && db) {
          withTimeout(
            setDoc(
              doc(db, 'users', playerId),
              stripUndefined({ ...foundRecord, ...playerProfile, password: cleanPass }),
              { merge: true }
            ),
            4500
          ).catch((err) => console.warn('Login Firestore sync warning:', err));
        }

        soundEngine.playNotify();
        onAuthenticated(`token_${playerId}`, playerProfile, rememberMe);
      } else {
        // 3. Player Sign Up (Never crashes or hangs even if Firestore is slow)
        if (cleanUser === 'yanlinnaung' || cleanUser === 'admin') {
          throw new Error(
            lang === 'my' ? 'ဤအကောင့်အမည်ကို အသုံးပြုခွင့် မရှိပါ။' : 'This username is reserved.'
          );
        }

        const playerId = makeSafePlayerId(cleanUser);

        // Check duplicate in Firestore (with safe timeout)
        if (isFirebaseConfigured && db) {
          try {
            const existing = await withTimeout(getDoc(doc(db, 'users', playerId)), 4500);
            if (existing && existing.exists()) {
              throw new Error(
                lang === 'my'
                  ? 'ဤအကောင့်အမည် ရှိပြီးသားဖြစ်ပါသည်။ Sign In မှတစ်ဆင့် ဝင်ပါ သို့မဟုတ် အခြားအမည်ရွေးပါ။'
                  : 'Username already exists. Please Sign In or choose another.'
              );
            }
          } catch (err: any) {
            if (err?.message && !err.message.includes('CLOUD_TIMEOUT') && !err.code) {
              throw err;
            }
            console.warn('Firestore duplicate check bypassed due to network/rules:', err);
          }
        }

        const recoveryPin = String(Math.floor(100000 + Math.random() * 900000));
        const newUser = buildPlayerProfile({
          id: playerId,
          username: cleanUser,
          displayName: displayName.trim() || username.trim(),
          gameId: `MR-${Math.floor(100000 + Math.random() * 900000)}`,
          xp: 1000,
          rank: 'Silver',
        });

        const recordToSave = stripUndefined({
          ...newUser,
          password: cleanPass,
          recoveryPin,
          status: 'active',
          createdAt: Date.now(),
        });

        // Always persist locally first so Sign Up NEVER fails
        localStorage.setItem(`myanrena_acc_${playerId}`, JSON.stringify(recordToSave));
        saveActiveSessionUser(newUser);

        // Push to Firestore Cloud with timeout protection
        if (isFirebaseConfigured && db) {
          try {
            await withTimeout(setDoc(doc(db, 'users', playerId), recordToSave), 5000);
          } catch (err) {
            console.warn('Firestore signup sync delayed/failed (using local session):', err);
          }
        }

        soundEngine.playNotify();
        setPinCopied(false);
        setSignupPinModal({
          token: `token_${playerId}`,
          user: newUser,
          pin: recoveryPin,
          rememberMe,
        });
      }
    } catch (err: any) {
      setError(err?.message || (lang === 'my' ? 'အကောင့်ဝင်ရောက်မှု မအောင်မြင်ပါ။' : 'Authentication failed.'));
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
      const playerId = makeSafePlayerId(cleanUser);
      let updated = false;

      if (isFirebaseConfigured && db) {
        try {
          const userRef = doc(db, 'users', playerId);
          const snap = await withTimeout(getDoc(userRef), 4500);
          if (snap && snap.exists()) {
            const data = snap.data() as { recoveryPin?: string };
            if (data.recoveryPin !== recPin.trim()) {
              throw new Error(lang === 'my' ? 'Recovery PIN မှားယွင်းနေပါသည်။' : 'Invalid Recovery PIN.');
            }
            await withTimeout(updateDoc(userRef, { password: recNewPassword.trim() }), 4500);
            updated = true;
          }
        } catch (err: any) {
          if (err?.message?.includes('PIN')) throw err;
        }
      }

      const raw = localStorage.getItem(`myanrena_acc_${playerId}`) || localStorage.getItem(`myanrena_acc_${cleanUser}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.recoveryPin !== recPin.trim()) {
          throw new Error(lang === 'my' ? 'Recovery PIN မှားယွင်းနေပါသည်။' : 'Invalid Recovery PIN.');
        }
        parsed.password = recNewPassword.trim();
        localStorage.setItem(`myanrena_acc_${playerId}`, JSON.stringify(parsed));
        updated = true;
      }

      if (!updated) throw new Error(lang === 'my' ? 'အကောင့်အမည် ရှာမတွေ့ပါ။' : 'Username not found.');
      setRecSuccess(
        lang === 'my' ? 'စကားဝှက် အသစ်ပြောင်းလဲပြီးပါပြီ! ပြန်လည်ဝင်ရောက်နိုင်ပါပြီ။' : 'Password updated successfully!'
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
    <div className="min-h-dvh overflow-x-hidden cyber-bg text-slate-100 flex flex-col">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#080c15]/90 backdrop-blur-md shrink-0">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="vanguard-brand-box px-3 py-1.5 rounded-xl text-sm sm:text-base font-display font-extrabold text-amber-200 tracking-wide">
              MYANRENA
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-semibold shrink-0">
              ● {onlineCount}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={toggleMute}
              className="w-10 h-10 flex items-center justify-center rounded-xl border border-white/10 text-slate-300 cursor-pointer"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col justify-center lg:block relative overflow-hidden">
        <div className="relative max-w-7xl mx-auto w-full px-3 sm:px-6 py-5 sm:py-8 lg:py-14 grid lg:grid-cols-12 gap-5 lg:gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="hidden lg:block lg:col-span-7 space-y-6 rounded-[1.75rem] border border-white/[0.08] bg-[radial-gradient(ellipse_at_80%_0%,rgba(232,185,92,.15),transparent_42%),linear-gradient(145deg,rgba(19,32,51,.8),rgba(8,14,24,.3))] p-7 xl:p-9"
          >
            <h1 className="fluid-hero font-display font-bold tracking-tight text-white">{heroTitle}</h1>
            <p className="text-base text-slate-300 max-w-2xl leading-relaxed">{heroSubtitle}</p>
            <div className="grid grid-cols-4 gap-3 pt-2">
              {GAME_LIST.map((g) => {
                const nid = normalizeGameId(g.id);
                const title = nid === 'sakarhtar' ? 'ဉာဏ်စမ်းပဟေဠိ' : lang === 'my' ? g.nameMy : g.name;
                return (
                  <div key={g.id} className="cyber-panel rounded-2xl p-2 text-center">
                    <img src={GAME_ARTWORKS[nid]} alt={title} className="w-full h-20 object-cover rounded-xl mb-1.5" />
                    <div className="text-xs font-bold text-white truncate">{title}</div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          <section className="mr-landing-mobile-hero lg:hidden p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-2 text-[9px] font-black tracking-[.22em] text-amber-200/85 uppercase">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,.8)]" />
              MYANRENA • PLAY TOGETHER
            </div>
            <h1 className="fluid-title font-display font-black tracking-tight text-white leading-tight">{heroTitle}</h1>
            <p className="text-xs sm:text-sm text-slate-300 leading-6 max-w-xl">{heroSubtitle}</p>
            <div className="grid grid-cols-4 gap-2 pt-1">
              {GAME_LIST.map((g) => {
                const nid = normalizeGameId(g.id);
                const title = nid === 'sakarhtar' ? 'ဉာဏ်စမ်း' : lang === 'my' ? g.nameMy : g.name;
                return (
                  <div key={g.id} className="rounded-xl border border-white/10 bg-black/20 p-1.5 text-center min-w-0">
                    <img src={GAME_ARTWORKS[nid]} alt={title} className="w-full aspect-square object-cover rounded-lg" />
                    <div className="mt-1 text-[9px] font-bold text-slate-200 truncate">{title}</div>
                  </div>
                );
              })}
            </div>
          </section>

          <div id="auth-card" className="lg:col-span-5 w-full max-w-md mx-auto">
            <div className="p-5 sm:p-7 rounded-[1.5rem] cyber-panel border border-amber-300/25 shadow-[0_24px_65px_rgba(0,0,0,.38)] space-y-5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg sm:text-xl font-display font-bold text-white">
                    {authMode === 'signin' ? t.auth.signInTitle : t.auth.signUpTitle}
                  </h2>
                  <p className="text-[11px] text-amber-300/80 lg:hidden">
                    ၄ လုံးတန်း · Tic-Tac-Toe · RPS · ဉာဏ်စမ်းပဟေဠိ
                  </p>
                </div>
                <div className="flex items-center gap-1 p-1 rounded-xl bg-[#070b14] border border-white/10 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('signin');
                      setError('');
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer ${
                      authMode === 'signin' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
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
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg cursor-pointer ${
                      authMode === 'signup' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                    }`}
                  >
                    {t.auth.signUp}
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">{t.auth.username}</label>
                  <input
                    type="text"
                    required
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder={t.auth.usernamePlaceholder}
                    className="w-full h-11 px-3.5 rounded-xl bg-[#070b14] border border-white/15 text-sm text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                {authMode === 'signup' && (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">{t.auth.displayName}</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder={t.auth.displayNamePlaceholder}
                      className="w-full h-11 px-3.5 rounded-xl bg-[#070b14] border border-white/15 text-sm text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">{t.auth.password}</label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      required
                      minLength={4}
                      autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t.auth.passwordPlaceholder}
                      className="w-full h-11 pl-3.5 pr-10 rounded-xl bg-[#070b14] border border-white/15 text-sm text-white focus:outline-none focus:border-amber-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {authMode === 'signin' && (
                  <div className="flex items-center justify-between text-xs">
                    <label className="inline-flex items-center gap-2 text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        className="w-4 h-4 accent-amber-500"
                      />
                      <span>{t.auth.rememberMe}</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setRecoveryOpen(true)}
                      className="text-amber-400 font-medium cursor-pointer"
                    >
                      {t.auth.forgotPassword}
                    </button>
                  </div>
                )}

                {error && (
                  <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/35 text-xs text-rose-200 leading-relaxed">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-12 rounded-xl cyber-cta-gold disabled:opacity-60 text-slate-950 font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer"
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

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                <Lock className="w-3 h-3 text-amber-400" />
                <span>{lang === 'my' ? 'Real-Time Cloud Sync ဖြင့် ချိတ်ဆက်ထားပါသည်' : 'Secured Real-Time Cloud Sync'}</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {signupPinModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div className="w-full max-w-md rounded-2xl cyber-panel border border-amber-400/50 p-6 space-y-4 shadow-2xl">
              <div className="flex items-center gap-3">
                <KeyRound className="w-6 h-6 text-amber-400 shrink-0" />
                <div>
                  <h3 className="text-base font-bold text-white">{t.auth.pinModalTitle}</h3>
                  <p className="text-xs font-mono text-amber-300">{signupPinModal.user.gameId}</p>
                </div>
              </div>
              <p className="text-xs text-slate-300">{t.auth.pinModalDesc}</p>
              <div className="p-3.5 rounded-xl bg-[#070b14] border border-white/10 flex items-center justify-between">
                <span className="text-2xl font-mono font-bold tracking-[0.25em] text-amber-400">
                  {signupPinModal.pin}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(signupPinModal.pin);
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
                className="w-full h-11 rounded-xl cyber-cta-gold text-slate-950 font-bold text-sm cursor-pointer"
              >
                {t.auth.pinSavedBtn}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {recoveryOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div className="w-full max-w-md rounded-2xl cyber-panel border border-white/15 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white">{t.auth.recoveryTitle}</h3>
                <button type="button" onClick={() => setRecoveryOpen(false)} className="text-slate-300 cursor-pointer">
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
                  className="w-full h-11 px-3.5 rounded-xl bg-[#070b14] border border-white/10 text-sm text-white"
                />
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={recPin}
                  onChange={(e) => setRecPin(e.target.value.replace(/\D/g, ''))}
                  placeholder={t.auth.recoveryPinPlaceholder}
                  className="w-full h-11 px-3.5 rounded-xl bg-[#070b14] border border-white/10 text-sm font-mono text-white"
                />
                <input
                  type="password"
                  required
                  minLength={4}
                  value={recNewPassword}
                  onChange={(e) => setRecNewPassword(e.target.value)}
                  placeholder={t.auth.newPasswordLabel}
                  className="w-full h-11 px-3.5 rounded-xl bg-[#070b14] border border-white/10 text-sm text-white"
                />
                {recError && <div className="text-xs text-rose-300">{recError}</div>}
                {recSuccess && <div className="text-xs text-emerald-300">{recSuccess}</div>}
                <button
                  type="submit"
                  disabled={recLoading}
                  className="w-full h-11 rounded-xl cyber-cta-gold text-slate-950 font-bold text-sm cursor-pointer"
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
