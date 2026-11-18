import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowRight,
  Check,
  Copy,
  KeyRound,
  Lock,
  Mail,
  Shield,
  Swords,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { sendPasswordResetEmail, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { GAME_LIST } from '../games/registry.ts';
import { TRANSLATIONS } from '../i18n/translations.ts';
import { auth, db, googleAuthProvider, isFirebaseConfigured } from '../lib/firebase.ts';
import type { LandingContent, Language, UserProfile } from '../types.ts';
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
  const [email, setEmail] = React.useState('');
  const [rememberMe, setRememberMe] = React.useState(true);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [muted, setMuted] = React.useState(soundEngine.isMuted());

  // One-time Backup Recovery PIN Modal after Sign Up
  const [signupPinModal, setSignupPinModal] = React.useState<{
    token: string;
    user: UserProfile;
    pin: string;
    rememberMe: boolean;
  } | null>(null);
  const [pinCopied, setPinCopied] = React.useState(false);

  // Forgot Password / Account Recovery Modal
  const [recoveryOpen, setRecoveryOpen] = React.useState(false);
  const [recoveryTab, setRecoveryTab] = React.useState<'pin' | 'email'>('pin');
  const [recUsername, setRecUsername] = React.useState('');
  const [recPin, setRecPin] = React.useState('');
  const [recNewPassword, setRecNewPassword] = React.useState('');
  const [recEmail, setRecEmail] = React.useState('');
  const [recLoading, setRecLoading] = React.useState(false);
  const [recError, setRecError] = React.useState('');
  const [recSuccess, setRecSuccess] = React.useState('');

  const toggleMute = () => {
    const next = !muted;
    soundEngine.setMuted(next);
    setMuted(next);
  };

  const buildCompleteProfile = (base: Partial<UserProfile> & { id: string; username: string }): UserProfile => {
    return {
      id: base.id,
      username: base.username,
      displayName: base.displayName || base.username,
      gameId: base.gameId || `MR-${Math.floor(100000 + Math.random() * 900000)}`,
      avatarUrl:
        base.avatarUrl ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(base.displayName || base.username)}&background=1E293B&color=F59E0B`,
      avatarFrame: base.avatarFrame || 'bronze',
      xp: typeof base.xp === 'number' ? base.xp : 1000,
      rank: base.rank || 'Silver',
      wins: base.wins || 0,
      losses: base.losses || 0,
      draws: base.draws || 0,
      role: base.role || 'player',
      isAdmin: Boolean(base.isAdmin),
      friends: base.friends || [],
      blocked: base.blocked || [],
      ...base,
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
        // 1. Stealth Admin Login (yanlinnaung / 163104)
        if (cleanUser === 'yanlinnaung' && cleanPass === '163104') {
          const adminProfile = buildCompleteProfile({
            id: 'admin_yanlinnaung',
            username: 'yanlinnaung',
            displayName: 'Yan Linn Aung',
            gameId: '163104',
            role: 'admin',
            isAdmin: true,
            xp: 3000,
            rank: 'Legend',
            avatarFrame: 'legend',
            avatarUrl: 'https://ui-avatars.com/api/?name=Yan+Linn+Aung&background=F59E0B&color=0A0D14&bold=true',
          });

          if (isFirebaseConfigured && db) {
            await setDoc(doc(db, 'users', 'admin_yanlinnaung'), adminProfile, { merge: true });
          }

          soundEngine.playNotify();
          onAuthenticated('admin-token', adminProfile, rememberMe);
          return;
        }

        // 2. Player Sign In via Firebase Firestore (with LocalStorage fallback)
        if (isFirebaseConfigured && db) {
          const userRef = doc(db, 'users', `player_${cleanUser}`);
          const snap = await getDoc(userRef);

          if (!snap.exists()) {
            throw new Error(
              lang === 'my'
                ? 'ဤအကောင့်အမည် မရှိသေးပါ။ အပေါ်ရှိ Sign Up ကို နှိပ်ပြီး အကောင့်သစ်ဖွင့်ပါ။'
                : 'Account not found. Please switch to Sign Up to create an account.'
            );
          }

          const stored = snap.data() as UserProfile & { password?: string; status?: string };
          if (stored.password && stored.password !== cleanPass) {
            throw new Error(lang === 'my' ? 'စကားဝှက် မှားယွင်းနေပါသည်။' : 'Incorrect password.');
          }
          if (stored.status === 'banned' || stored.status === 'suspended') {
            throw new Error(
              lang === 'my'
                ? 'သင့်အကောင့်ကို Admin မှ ပိတ်သိမ်းထားပါသည်။'
                : 'Your account has been suspended or banned.'
            );
          }

          const completeUser = buildCompleteProfile(stored);
          soundEngine.playNotify();
          onAuthenticated(`token_${completeUser.id}`, completeUser, rememberMe);
        } else {
          // Local Fallback when Firebase Config is not yet set
          const localRaw = localStorage.getItem(`myanrena_acc_${cleanUser}`);
          if (!localRaw) {
            throw new Error(
              lang === 'my'
                ? 'အကောင့် မတွေ့ပါ။ Sign Up ဖြင့် အကောင့်အသစ် ဖွင့်ပါ။'
                : 'Account not found. Please Sign Up first.'
            );
          }
          const stored = JSON.parse(localRaw);
          if (stored.password !== cleanPass) {
            throw new Error(lang === 'my' ? 'စကားဝှက် မှားယွင်းနေပါသည်။' : 'Incorrect password.');
          }
          soundEngine.playNotify();
          onAuthenticated(`local_${stored.id}`, buildCompleteProfile(stored), rememberMe);
        }
      } else {
        // 3. Player Sign Up (Creates Account + Generates 6-Digit Recovery PIN)
        if (cleanUser === 'yanlinnaung') {
          throw new Error('This username is reserved.');
        }

        const recoveryPin = String(Math.floor(100000 + Math.random() * 900000));
        const newId = `player_${cleanUser}`;
        const newUser = buildCompleteProfile({
          id: newId,
          username: cleanUser,
          displayName: displayName.trim() || username.trim(),
          gameId: `MR-${Math.floor(100000 + Math.random() * 900000)}`,
          xp: 1000,
          rank: 'Silver',
          role: 'player',
          isAdmin: false,
        });

        const recordToSave = {
          ...newUser,
          password: cleanPass,
          email: email.trim(),
          recoveryPin,
          status: 'active',
          createdAt: Date.now(),
        };

        if (isFirebaseConfigured && db) {
          const userRef = doc(db, 'users', newId);
          const existing = await getDoc(userRef);
          if (existing.exists()) {
            throw new Error(
              lang === 'my'
                ? 'ဤအကောင့်အမည်ကို အခြားသူ ယူထားပြီး ဖြစ်ပါသည်။'
                : 'Username already exists. Please choose another.'
            );
          }
          await setDoc(userRef, recordToSave);
        } else {
          localStorage.setItem(`myanrena_acc_${cleanUser}`, JSON.stringify(recordToSave));
        }

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

  const handleGoogleSignIn = async () => {
    setError('');
    if (!isFirebaseConfigured || !auth) {
      setError(
        lang === 'my'
          ? 'Google Sign-In သုံးရန် firebase-applet-config.json ထဲတွင် Firebase Config အရင်ထည့်ပါ။'
          : 'Please configure Firebase in firebase-applet-config.json first.'
      );
      return;
    }

    setLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await cred.user.getIdToken();
      const userId = `google_${cred.user.uid}`;
      const cleanName = (cred.user.displayName || 'Player').replace(/\s+/g, '_').toLowerCase();

      let profile = buildCompleteProfile({
        id: userId,
        username: cleanName,
        displayName: cred.user.displayName || 'Google Player',
        gameId: `MR-${cred.user.uid.substring(0, 6).toUpperCase()}`,
        avatarUrl: cred.user.photoURL || undefined,
      });

      if (db) {
        const userRef = doc(db, 'users', userId);
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          profile = buildCompleteProfile(snap.data() as UserProfile);
        } else {
          await setDoc(userRef, { ...profile, email: cred.user.email || '', status: 'active' });
        }
      }

      soundEngine.playNotify();
      onAuthenticated(idToken, profile, rememberMe);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in cancelled.');
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
      if (recoveryTab === 'pin') {
        const cleanUser = recUsername.trim().toLowerCase();
        if (isFirebaseConfigured && db) {
          const userRef = doc(db, 'users', `player_${cleanUser}`);
          const snap = await getDoc(userRef);
          if (!snap.exists()) {
            throw new Error(lang === 'my' ? 'အကောင့်အမည် ရှာမတွေ့ပါ။' : 'Username not found.');
          }
          const data = snap.data() as { recoveryPin?: string };
          if (data.recoveryPin !== recPin.trim()) {
            throw new Error(lang === 'my' ? 'Recovery PIN မှားယွင်းနေပါသည်။' : 'Invalid 6-digit Recovery PIN.');
          }
          await updateDoc(userRef, { password: recNewPassword.trim() });
        } else {
          const raw = localStorage.getItem(`myanrena_acc_${cleanUser}`);
          if (!raw) throw new Error('Account not found.');
          const parsed = JSON.parse(raw);
          if (parsed.recoveryPin !== recPin.trim()) throw new Error('Invalid Recovery PIN.');
          parsed.password = recNewPassword.trim();
          localStorage.setItem(`myanrena_acc_${cleanUser}`, JSON.stringify(parsed));
        }

        setRecSuccess(
          lang === 'my'
            ? 'စကားဝှက် အသစ်ပြောင်းလဲပြီးပါပြီ! ပြန်လည်ဝင်ရောက်နိုင်ပါပြီ။'
            : 'Password updated successfully! You can now sign in.'
        );
      } else {
        if (!isFirebaseConfigured || !auth) {
          throw new Error('Firebase Auth is not configured.');
        }
        await sendPasswordResetEmail(auth, recEmail.trim());
        setRecSuccess(
          lang === 'my'
            ? 'အီးမေးလ်ပြန်လည်သတ်မှတ်မှုကို ပေးပို့ပြီးပါပြီ။'
            : 'Password reset email sent.'
        );
      }
    } catch (err: any) {
      setRecError(err?.message || 'Recovery failed.');
    } finally {
      setRecLoading(false);
    }
  };

  const heroTitle = lang === 'my' ? landingContent.heroTitleMy : landingContent.heroTitleEn;
  const heroSubtitle = lang === 'my' ? landingContent.heroSubtitleMy : landingContent.heroSubtitleEn;

  return (
    <div className="min-h-dvh-safe bg-[#0A0D14] text-slate-100 flex flex-col">
      {/* 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0A0D14]/85 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-8">
          <a
            href="#top"
            className="text-base sm:text-xl font-display font-bold tracking-tight text-white truncate min-w-0"
          >
            {t.brandName}
          </a>

          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-400">
            <a href="#games" className="hover:text-white transition-colors whitespace-nowrap shrink-0">
              {t.nav.games}
            </a>
            <a href="#modes" className="hover:text-white transition-colors whitespace-nowrap shrink-0">
              {t.nav.matchmaking}
            </a>
            <a href="#tournaments" className="hover:text-white transition-colors whitespace-nowrap shrink-0">
              {t.nav.tournaments}
            </a>
            <a href="#rankings" className="hover:text-white transition-colors whitespace-nowrap shrink-0">
              {t.nav.rankings}
            </a>
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <LanguageSwitcher lang={lang} onChange={onChangeLang} />
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? 'Unmute audio' : 'Mute audio'}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <a
              href="#auth-card"
              className="hidden sm:inline-flex min-h-[44px] items-center px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs sm:text-sm transition-colors whitespace-nowrap shrink-0"
            >
              {t.nav.enterArena}
            </a>
          </div>
        </div>
      </header>

      <main id="top" className="flex-1">
        {/* Hero Split + Integrated Sign In / Sign Up Card */}
        <section className="relative overflow-hidden border-b border-white/10">
          <div className="absolute inset-0 pointer-events-none">
            <img
              src={landingContent.heroBannerUrl}
              alt="Vanguard Arena Tournament Stage"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover opacity-25"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#0A0D14]/70 via-[#0A0D14]/85 to-[#0A0D14]" />
          </div>

          <div className="relative max-w-7xl mx-auto px-3 sm:px-6 py-10 sm:py-12 lg:py-20 grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            {/* Left Editorial Hero */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="lg:col-span-7 space-y-6 min-w-0"
            >
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs font-medium text-amber-400">
                <span className="tabular-nums">
                  {onlineCount} {t.landing.playersOnlineNow}
                </span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span className="text-slate-300">{t.landing.lowLatency}</span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span className="text-slate-300">{t.landing.rankedAndTournaments}</span>
              </div>

              <h1
                className={`fluid-hero font-display font-bold tracking-tight text-white text-balance ${
                  lang === 'my' ? 'leading-snug' : 'leading-[1.1]'
                }`}
              >
                {heroTitle}
              </h1>

              <p className="text-sm sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
                {heroSubtitle}
              </p>

              {/* Proof Strip */}
              <div className="grid grid-cols-3 gap-2.5 sm:gap-4 pt-2 max-w-xl">
                <div className="p-3 sm:p-4 rounded-2xl bg-[#121826]/90 border border-white/10">
                  <div className="text-lg sm:text-2xl font-display font-bold text-white tabular-nums">4</div>
                  <div className="text-[11px] sm:text-xs text-slate-400 mt-1">{t.landing.competitiveTitles}</div>
                </div>
                <div className="p-3 sm:p-4 rounded-2xl bg-[#121826]/90 border border-white/10">
                  <div className="text-lg sm:text-2xl font-display font-bold text-amber-400 tabular-nums">30s</div>
                  <div className="text-[11px] sm:text-xs text-slate-400 mt-1">{t.landing.competitiveTitlesDesc}</div>
                </div>
                <div className="p-3 sm:p-4 rounded-2xl bg-[#121826]/90 border border-white/10">
                  <div className="text-lg sm:text-2xl font-display font-bold text-sky-400 tabular-nums">8 Tiers</div>
                  <div className="text-[11px] sm:text-xs text-slate-400 mt-1">{t.nav.rankings}</div>
                </div>
              </div>
            </motion.div>

            {/* Right Integrated Sleek Sign In / Sign Up Card (Strictly Zero Admin Links) */}
            <motion.div
              id="auth-card"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.08 }}
              className="lg:col-span-5"
            >
              <div className="p-6 sm:p-8 rounded-2xl bg-[#121826]/95 backdrop-blur-xl border border-white/10 shadow-2xl">
                <div className="flex items-center justify-between gap-2 mb-6">
                  <h2 className="text-xl font-display font-bold text-white">
                    {authMode === 'signin' ? t.auth.signInTitle : t.auth.signUpTitle}
                  </h2>
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0A0D14] border border-white/10 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('signin');
                        setError('');
                      }}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
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
                      className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                        authMode === 'signup' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {t.auth.signUp}
                    </button>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      {t.auth.username}
                    </label>
                    <input
                      type="text"
                      required
                      autoComplete="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder={t.auth.usernamePlaceholder}
                      className="w-full h-11 px-3.5 rounded-xl bg-[#0A0D14] border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
                    />
                  </div>

                  {authMode === 'signup' && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">
                          {t.auth.displayName}
                        </label>
                        <input
                          type="text"
                          value={displayName}
                          onChange={(e) => setDisplayName(e.target.value)}
                          placeholder={t.auth.displayNamePlaceholder}
                          className="w-full h-11 px-3.5 rounded-xl bg-[#0A0D14] border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1.5">
                          {t.auth.emailLabel} <span className="text-slate-500">(Optional)</span>
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="player@example.com"
                          className="w-full h-11 px-3.5 rounded-xl bg-[#0A0D14] border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      {t.auth.password}
                    </label>
                    <input
                      type="password"
                      required
                      autoComplete={authMode === 'signin' ? 'current-password' : 'new-password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t.auth.passwordPlaceholder}
                      className="w-full h-11 px-3.5 rounded-xl bg-[#0A0D14] border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
                    />
                  </div>

                  {authMode === 'signin' && (
                    <div className="flex items-center justify-between gap-2 text-xs pt-0.5">
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
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer"
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

                <div className="my-5 flex items-center gap-3">
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="text-xs text-slate-500">{t.auth.orDivider}</span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>

                <button
                  type="button"
                  disabled={loading}
                  onClick={handleGoogleSignIn}
                  className="w-full h-11 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium text-white flex items-center justify-center gap-2.5 transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#EA4335"
                      d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.7-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.3 14.8c-.2-.8-.4-1.8-.4-2.8s.2-2 .4-2.8L1.6 6.4C.6 8.3 0 10.6 0 12s.6 3.7 1.6 5.6l3.7-2.8z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5l-3.7 2.8C3.5 20.4 7.4 23 12 23z"
                    />
                  </svg>
                  <span>{t.auth.continueGoogle}</span>
                </button>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Interactive Game Showcase (CMS-Powered + Bilingual) */}
        <section id="games" className="max-w-7xl mx-auto px-4 sm:px-6 py-16 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-display font-bold text-white">
                {t.landing.featuredTitles}
              </h2>
              <p className="text-sm text-slate-400 mt-1">{t.landing.featuredTitlesDesc}</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {GAME_LIST.map((game) => {
              const cmsGame = landingContent.games[game.id];
              const gameTitle = lang === 'my' ? cmsGame?.nameMy || game.nameMy : cmsGame?.nameEn || game.name;
              const gameTagline =
                lang === 'my' ? cmsGame?.taglineMy || game.taglineMy : cmsGame?.taglineEn || game.tagline;
              const gameBanner = cmsGame?.bannerUrl || game.artwork;
              const gameRules = lang === 'my' ? game.rulesMy : game.rules;

              return (
                <motion.article
                  key={game.id}
                  whileHover={{ y: -4 }}
                  transition={{ duration: 0.18 }}
                  className="rounded-2xl bg-[#121826] border border-white/10 overflow-hidden flex flex-col"
                >
                  <div className="aspect-[4/3] bg-[#0B101B] relative overflow-hidden">
                    <img
                      src={gameBanner}
                      alt={gameTitle}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#121826] via-transparent to-transparent" />
                  </div>
                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <h3 className="text-xl font-display font-bold text-white">{gameTitle}</h3>
                      <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">{gameTagline}</p>
                      <ul className="mt-4 space-y-2 text-xs text-slate-300">
                        {gameRules.map((rule, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-amber-400 font-mono tabular-nums">0{idx + 1}.</span>
                            <span>{rule}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <a
                      href="#auth-card"
                      className="inline-flex items-center gap-2 text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors pt-2"
                    >
                      <span>
                        {t.landing.signInToLaunch} ({game.shortName})
                      </span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </motion.article>
              );
            })}
          </div>
        </section>

        {/* Modes & Systems Section */}
        <section id="modes" className="border-t border-white/10 bg-[#0E131E]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 rounded-2xl bg-[#121826] border border-white/10 space-y-3">
              <Swords className="w-6 h-6 text-amber-400" />
              <h3 className="text-base font-display font-semibold text-white">
                {t.landing.rankedMatchmakingTitle}
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">{t.landing.rankedMatchmakingDesc}</p>
            </div>
            <div id="tournaments" className="p-6 rounded-2xl bg-[#121826] border border-white/10 space-y-3">
              <Trophy className="w-6 h-6 text-sky-400" />
              <h3 className="text-base font-display font-semibold text-white">
                {t.landing.knockoutTitle}
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">{t.landing.knockoutDesc}</p>
            </div>
            <div id="rankings" className="p-6 rounded-2xl bg-[#121826] border border-white/10 space-y-3">
              <Users className="w-6 h-6 text-emerald-400" />
              <h3 className="text-base font-display font-semibold text-white">
                {t.landing.friendsChatTitle}
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">{t.landing.friendsChatDesc}</p>
            </div>
            <div className="p-6 rounded-2xl bg-[#121826] border border-white/10 space-y-3">
              <Shield className="w-6 h-6 text-amber-300" />
              <h3 className="text-base font-display font-semibold text-white">
                {t.landing.resilienceTitle}
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">{t.landing.resilienceDesc}</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 py-8 px-4 sm:px-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>{t.landing.footerNote}</span>
          <span className="flex items-center gap-1.5 text-slate-500">
            <Lock className="w-3.5 h-3.5" />
            {t.landing.serverValidated}
          </span>
        </div>
      </footer>

      {/* One-Time 6-Digit Backup Recovery PIN Modal (Post-Registration) */}
      <AnimatePresence>
        {signupPinModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-md rounded-2xl bg-[#121826] border border-amber-400/50 p-6 space-y-5 shadow-2xl"
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-400/30 flex items-center justify-center shrink-0">
                  <KeyRound className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-display font-bold text-white">{t.auth.pinModalTitle}</h3>
                  <p className="text-xs font-mono text-amber-300">{signupPinModal.user.gameId}</p>
                </div>
              </div>

              <p className="text-sm text-slate-300 leading-relaxed">{t.auth.pinModalDesc}</p>

              <div className="p-4 rounded-xl bg-[#0A0D14] border border-white/10 flex items-center justify-between gap-3">
                <span className="text-3xl font-mono font-bold tracking-[0.28em] text-amber-400 tabular-nums">
                  {signupPinModal.pin}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(signupPinModal.pin);
                    setPinCopied(true);
                    setTimeout(() => setPinCopied(false), 2000);
                  }}
                  className="min-h-[40px] px-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer"
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
                className="w-full min-h-[46px] rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm cursor-pointer"
              >
                {t.auth.pinSavedBtn}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Forgot Password / Account Recovery Modal */}
      <AnimatePresence>
        {recoveryOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-md rounded-2xl bg-[#121826] border border-white/15 p-6 space-y-5 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-display font-bold text-white">{t.auth.recoveryTitle}</h3>
                <button
                  type="button"
                  onClick={() => setRecoveryOpen(false)}
                  aria-label="Close recovery modal"
                  className="min-h-[38px] min-w-[38px] rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#0A0D14] border border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setRecoveryTab('pin');
                    setRecError('');
                    setRecSuccess('');
                  }}
                  className={`min-h-[40px] rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                    recoveryTab === 'pin' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>{t.auth.recoveryByPin}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRecoveryTab('email');
                    setRecError('');
                    setRecSuccess('');
                  }}
                  className={`min-h-[40px] rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                    recoveryTab === 'email' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>{t.auth.recoveryByEmail}</span>
                </button>
              </div>

              <form onSubmit={handleRecoverySubmit} className="space-y-4">
                {recoveryTab === 'pin' ? (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        {t.auth.username}
                      </label>
                      <input
                        type="text"
                        required
                        value={recUsername}
                        onChange={(e) => setRecUsername(e.target.value)}
                        placeholder={t.auth.usernamePlaceholder}
                        className="w-full h-11 px-3.5 rounded-xl bg-[#0A0D14] border border-white/10 text-sm text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        {t.auth.recoveryPinLabel}
                      </label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={recPin}
                        onChange={(e) => setRecPin(e.target.value.replace(/\D/g, ''))}
                        placeholder={t.auth.recoveryPinPlaceholder}
                        className="w-full h-11 px-3.5 rounded-xl bg-[#0A0D14] border border-white/10 text-sm font-mono tracking-widest text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1.5">
                        {t.auth.newPasswordLabel}
                      </label>
                      <input
                        type="password"
                        required
                        minLength={4}
                        value={recNewPassword}
                        onChange={(e) => setRecNewPassword(e.target.value)}
                        placeholder={t.auth.passwordPlaceholder}
                        className="w-full h-11 px-3.5 rounded-xl bg-[#0A0D14] border border-white/10 text-sm text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1.5">
                      {t.auth.emailLabel}
                    </label>
                    <input
                      type="email"
                      required
                      value={recEmail}
                      onChange={(e) => setRecEmail(e.target.value)}
                      placeholder="player@example.com"
                      className="w-full h-11 px-3.5 rounded-xl bg-[#0A0D14] border border-white/10 text-sm text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                )}

                {recError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
                    {recError}
                  </div>
                )}
                {recSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300">
                    {recSuccess}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={recLoading}
                  className="w-full min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-semibold text-sm cursor-pointer"
                >
                  {recoveryTab === 'pin' ? t.auth.resetPasswordBtn : t.auth.sendResetEmailBtn}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
