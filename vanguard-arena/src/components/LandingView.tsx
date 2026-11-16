import { supabase } from '../utils/supabaseClient'; // (ဖိုင်လမ်းကြောင်း မှန်/မမှန် စစ်ဆေးပါ)
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
import { GAME_LIST } from '../games/registry.ts';
import { TRANSLATIONS } from '../i18n/translations.ts';
import { auth, googleAuthProvider } from '../lib/firebase.ts';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      if (authMode === 'signin') {
        // Admin Account ဟုတ်/မဟုတ် စစ်ဆေးခြင်း
        if (username.trim() === 'yanlinnaung' && password === '163104') {
          console.log("Admin Logged In");
          soundEngine.playNotify();
          // Admin အဖြစ် OnAuthenticated သို့ ပို့ပေးရန် (သင်၏ UserProfile Type အတိုင်း လိုအပ်သလို ချိန်ညှိပါ)
          onAuthenticated('admin-token', { 
            id: 'admin', 
            username: 'yanlinnaung', 
            displayName: 'Admin', 
            gameId: '163104' 
          } as UserProfile, rememberMe);
        } else {
          // သာမန် User Login ဝင်ခြင်း
          const { data, error } = await supabase.auth.signInWithPassword({
            email: `${username.trim()}@myanrena.com`,
            password: password,
          });
          if (error) throw error;
          
          soundEngine.playNotify();
          // Login အောင်မြင်လျှင် ဂိမ်းဘက်သို့ ညွှန်းပေးခြင်း
          if (data.user) {
            onAuthenticated(data.session?.access_token || 'token', { 
              id: data.user.id, 
              username: username.trim(), 
              displayName: username.trim(), 
              gameId: data.user.id.substring(0,6) 
            } as UserProfile, rememberMe);
          }
        }
      } else {
        // အကောင့်သစ်ဖွင့်ခြင်း (Register)
        const { data, error } = await supabase.auth.signUp({
          email: `${username.trim()}@myanrena.com`,
          password: password,
        });
        if (error) throw error;
        
        soundEngine.playNotify();
        // Register အောင်မြင်လျှင် Recovery PIN ပြသရန် သို့မဟုတ် တန်းဝင်ရန်
        if (data.user) {
           onAuthenticated(data.session?.access_token || 'token', { 
              id: data.user.id, 
              username: username.trim(), 
              displayName: displayName || username.trim(), 
              gameId: data.user.id.substring(0,6) 
            } as UserProfile, rememberMe);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await cred.user.getIdToken();
      // Google Auth အတွက် Supabase ဘက်သို့ ဆက်လက်ချိတ်ဆက်ရန် (ယခုလောလောဆယ် Firebase မှ ရသော User ကို တိုက်ရိုက်သုံးထားသည်)
      soundEngine.playNotify();
      onAuthenticated(idToken, { 
        id: cred.user.uid, 
        username: cred.user.displayName || 'GooglePlayer', 
        displayName: cred.user.displayName || 'GooglePlayer', 
        gameId: cred.user.uid.substring(0,6) 
      } as UserProfile, rememberMe);
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
        // သင့် Custom PIN recovery စနစ်ကို ဤနေရာတွင် ရေးရန်
        setRecSuccess('PIN recovery is under development.');
      } else {
        const cleanEmail = recEmail.trim();
        await sendPasswordResetEmail(auth, cleanEmail);
        setRecSuccess(
          lang === 'my'
            ? 'အီးမေးလ်ပြန်လည်သတ်မှတ်မှုကို ပေးပို့ပြီးပါပြီ။'
            : 'Password reset email sent.'
        );
      }
    } catch {
      setRecError('Network error during recovery.');
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

          <nav className="hidden lg:flex items-center gap-6 text-sm font-medium text-slate-400
