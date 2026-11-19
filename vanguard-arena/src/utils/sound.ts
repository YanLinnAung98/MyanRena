export type GraphicsQuality = 'low' | 'medium' | 'high';

export interface UserGameSettings {
  musicEnabled: boolean;
  musicVolume: number;
  sfxEnabled: boolean;
  sfxVolume: number;
  graphics: GraphicsQuality;
  haptics: boolean;
  showNotifications: boolean;
}

const SETTINGS_KEY = 'vanguard_user_settings_v1';

const DEFAULT_SETTINGS: UserGameSettings = {
  musicEnabled: false,
  musicVolume: 35,
  sfxEnabled: true,
  sfxVolume: 75,
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
      if (raw) this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
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
    if (this.settings.musicEnabled) this.startAmbientMusic();
    else this.stopAmbientMusic();
    return this.getSettings();
  }

  public isMuted(): boolean {
    return !this.settings.sfxEnabled && !this.settings.musicEnabled;
  }

  public setMuted(muted: boolean) {
    if (muted) this.updateSettings({ sfxEnabled: false, musicEnabled: false });
    else this.updateSettings({ sfxEnabled: true });
  }

  public vibrate(ms = 18) {
    if (!this.settings.haptics) return;
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(ms);
      } catch {}
    }
  }

  private vol(mult = 0.16): number {
    return Math.max(0.001, (this.settings.sfxVolume / 100) * mult);
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType,
    volScale: number,
    endFreq?: number
  ) {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      if (endFreq) {
        osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + duration);
      }
      gain.gain.setValueAtTime(Math.max(0.001, volScale), ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0008, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {}
  }

  public playClick() {
    if (!this.settings.sfxEnabled) return;
    this.playTone(680, 0.055, 'sine', this.vol(0.11), 860);
    this.vibrate(8);
  }

  public playCardSelect() {
    if (!this.settings.sfxEnabled) return;
    this.playTone(440, 0.08, 'triangle', this.vol(0.13), 660);
    setTimeout(() => this.playTone(660, 0.1, 'sine', this.vol(0.11), 880), 65);
    this.vibrate(12);
  }

  // Chalk / Stick Scratch Sound FX for Village Tic-Tac-Toe
  public playScratch() {
    if (!this.settings.sfxEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const bufferSize = Math.floor(ctx.sampleRate * 0.14);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.45));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1600, ctx.currentTime);
      filter.Q.setValueAtTime(3.5, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(this.vol(0.24), ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start();
      this.vibrate(14);
    } catch {}
  }

  // Disc Gravity Drop + Double Bounce Sound FX for Connect 4
  public playDrop() {
    if (!this.settings.sfxEnabled) return;
    this.playTone(420, 0.11, 'sine', this.vol(0.18), 160);
    setTimeout(() => this.playTone(230, 0.07, 'triangle', this.vol(0.15), 140), 115);
    setTimeout(() => this.playTone(270, 0.05, 'sine', this.vol(0.09), 190), 185);
    this.vibrate(18);
  }

  // Playful Cartoon Head-Bonk Sound FX (Wise Owl & RPS)
  public playBonk() {
    if (!this.settings.sfxEnabled) return;
    this.playTone(540, 0.09, 'sine', this.vol(0.28), 145);
    setTimeout(() => this.playTone(320, 0.14, 'triangle', this.vol(0.22), 95), 55);
    this.vibrate(40);
  }

  // RPS Fist Swing Clash Sound FX
  public playClash() {
    if (!this.settings.sfxEnabled) return;
    [0, 140, 280].forEach((delay, idx) => {
      setTimeout(() => {
        this.playTone(260 + idx * 70, 0.08, 'triangle', this.vol(0.14), 190);
      }, delay);
    });
    this.vibrate(15);
  }

  public playCorrect() {
    if (!this.settings.sfxEnabled) return;
    this.playTone(587.33, 0.1, 'triangle', this.vol(0.16));
    setTimeout(() => this.playTone(880, 0.16, 'triangle', this.vol(0.18)), 85);
    this.vibrate(16);
  }

  public playWrong() {
    if (!this.settings.sfxEnabled) return;
    this.playTone(280, 0.14, 'sawtooth', this.vol(0.12), 180);
  }

  public playThinking() {
    if (!this.settings.sfxEnabled) return;
    this.playTone(520, 0.05, 'sine', this.vol(0.06), 560);
  }

  public playNotify() {
    if (!this.settings.sfxEnabled) return;
    this.playTone(587.33, 0.11, 'triangle', this.vol(0.16));
    setTimeout(() => this.playTone(880, 0.18, 'triangle', this.vol(0.16)), 90);
    this.vibrate(20);
  }

  // Happy Victory Dance Fanfare
  public playWin() {
    if (!this.settings.sfxEnabled) return;
    const notes = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5];
    notes.forEach((f, idx) => {
      setTimeout(() => this.playTone(f, 0.18, 'triangle', this.vol(0.18)), idx * 95);
    });
    this.vibrate(35);
  }

  // Cute Sad Cry / Defeat Sound
  public playCry() {
    if (!this.settings.sfxEnabled) return;
    this.playTone(460, 0.2, 'sine', this.vol(0.14), 310);
    setTimeout(() => this.playTone(380, 0.22, 'sine', this.vol(0.14), 240), 210);
    setTimeout(() => this.playTone(300, 0.28, 'sine', this.vol(0.12), 190), 430);
  }

  public playLose() {
    this.playCry();
  }

  public startAmbientMusic() {
    if (typeof window === 'undefined' || this.musicTimer !== null) return;
    const notes = [220, 261.63, 293.66, 329.63, 392, 329.63, 293.66, 261.63];
    const playStep = () => {
      if (!this.settings.musicEnabled) {
        this.stopAmbientMusic();
        return;
      }
      const vol = (this.settings.musicVolume / 100) * 0.055;
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
