export type GraphicsQuality = 'low' | 'medium' | 'high';

export interface UserGameSettings {
  musicEnabled: boolean;
  musicVolume: number; // 0 - 100
  sfxEnabled: boolean;
  sfxVolume: number; // 0 - 100
  graphics: GraphicsQuality;
  haptics: boolean;
  showNotifications: boolean;
}

const SETTINGS_KEY = 'vanguard_user_settings_v1';

const DEFAULT_SETTINGS: UserGameSettings = {
  musicEnabled: false,
  musicVolume: 35,
  sfxEnabled: true,
  sfxVolume: 70,
  graphics: 'high',
  haptics: true,
  showNotifications: true,
};

class VanguardSoundEngine {
  private ctx: AudioContext | null = null;
  private musicTimer: number | null = null;
  private settings: UserGameSettings = { ...DEFAULT_SETTINGS };
  private stepIdx = 0;

  constructor() {
    this.loadSettings();
    this.applyGraphics(this.settings.graphics);
  }

  private loadSettings() {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
      }
    } catch {}
  }

  private saveSettings() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(this.settings));
    } catch {}
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public getSettings(): UserGameSettings {
    return { ...this.settings };
  }

  public applyGraphics(mode: GraphicsQuality) {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-graphics', mode);
    }
  }

  public updateSettings(patch: Partial<UserGameSettings>): UserGameSettings {
    this.settings = { ...this.settings, ...patch };
    this.saveSettings();
    this.applyGraphics(this.settings.graphics);

    if (this.settings.musicEnabled) {
      this.startAmbientMusic();
    } else {
      this.stopAmbientMusic();
    }
    return this.getSettings();
  }

  // Backward compatibility with existing header mute toggle
  public isMuted(): boolean {
    return !this.settings.sfxEnabled && !this.settings.musicEnabled;
  }

  public setMuted(muted: boolean) {
    if (muted) {
      this.updateSettings({ sfxEnabled: false, musicEnabled: false });
    } else {
      this.updateSettings({ sfxEnabled: true });
    }
  }

  public vibrate(ms = 18) {
    if (!this.settings.haptics) return;
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(ms);
      } catch {}
    }
  }

  private playTone(freq: number, duration: number, type: OscillatorType, volScale: number) {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      const gainVal = Math.max(0.001, volScale);
      gain.gain.setValueAtTime(gainVal, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0008, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {}
  }

  public playClick() {
    if (!this.settings.sfxEnabled) return;
    const v = (this.settings.sfxVolume / 100) * 0.12;
    this.playTone(620, 0.06, 'sine', v);
    this.vibrate(10);
  }

  public playNotify() {
    if (!this.settings.sfxEnabled) return;
    const v = (this.settings.sfxVolume / 100) * 0.16;
    this.playTone(587.33, 0.11, 'triangle', v);
    setTimeout(() => this.playTone(880, 0.18, 'triangle', v), 90);
    this.vibrate(20);
  }

  public playWin() {
    if (!this.settings.sfxEnabled) return;
    const v = (this.settings.sfxVolume / 100) * 0.18;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
      setTimeout(() => this.playTone(f, 0.22, 'triangle', v), idx * 95);
    });
    this.vibrate(35);
  }

  public playLose() {
    if (!this.settings.sfxEnabled) return;
    const v = (this.settings.sfxVolume / 100) * 0.16;
    [392, 329.63, 261.63].forEach((f, idx) => {
      setTimeout(() => this.playTone(f, 0.22, 'sawtooth', v * 0.6), idx * 120);
    });
  }

  public startAmbientMusic() {
    if (typeof window === 'undefined' || this.musicTimer !== null) return;
    // Soft ambient pentatonic synth loop (no external MP3 404s)
    const notes = [220, 261.63, 293.66, 329.63, 392, 329.63, 293.66, 261.63];
    const playStep = () => {
      if (!this.settings.musicEnabled) {
        this.stopAmbientMusic();
        return;
      }
      const vol = (this.settings.musicVolume / 100) * 0.06;
      const freq = notes[this.stepIdx % notes.length];
      this.stepIdx += 1;
      this.playTone(freq, 0.85, 'sine', vol);
    };
    playStep();
    this.musicTimer = window.setInterval(playStep, 900);
  }

  public stopAmbientMusic() {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}

export const soundEngine = new VanguardSoundEngine();
