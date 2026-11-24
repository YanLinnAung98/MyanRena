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
  sfxVolume: 75,
  graphics: 'high',
  haptics: true,
  showNotifications: true,
};

class VanguardSoundEngine {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
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

  // Noise Buffer (လေတိုးသံနှင့် ပလတ်စတစ်ထိသံ Texture အတွက်)
  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer) return this.noiseBuffer;
    const bufferSize = ctx.sampleRate * 0.5;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  private getSfxGain(): number {
    return Math.max(0.001, this.settings.sfxVolume / 100);
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

  public vibrate(ms: number | number[] = 18) {
    if (!this.settings.haptics) return;
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(ms);
      } catch {}
    }
  }

  private playTone(
    freq: number,
    duration: number,
    type: OscillatorType,
    volScale: number,
    delaySec = 0,
    endFreq?: number
  ) {
    const ctx = this.getContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime + delaySec;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, now);
      if (endFreq !== undefined) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), now + duration);
      }

      const gainVal = Math.max(0.0008, volScale);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(gainVal, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0005, now + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    } catch {}
  }

  // =========================================================================
  // 1. UI & GENERAL SOUNDS
  // =========================================================================
  public playClick() {
    if (!this.settings.sfxEnabled) return;
    const v = this.getSfxGain() * 0.14;
    this.playTone(640, 0.055, 'sine', v, 0, 520);
    this.vibrate(10);
  }

  public playNotify() {
    if (!this.settings.sfxEnabled) return;
    const v = this.getSfxGain() * 0.16;
    this.playTone(587.33, 0.11, 'triangle', v, 0);
    this.playTone(880, 0.18, 'triangle', v, 0.09);
    this.vibrate(20);
  }

  public playWin() {
    if (!this.settings.sfxEnabled) return;
    const v = this.getSfxGain() * 0.18;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
      this.playTone(f, 0.24, 'triangle', v, idx * 0.095);
    });
    this.vibrate([25, 40, 45]);
  }

  public playLose() {
    if (!this.settings.sfxEnabled) return;
    const v = this.getSfxGain() * 0.15;
    [392, 349.23, 311.13, 261.63].forEach((f, idx) => {
      this.playTone(f, 0.24, 'sawtooth', v * 0.55, idx * 0.13);
    });
  }

  public playDraw() {
    if (!this.settings.sfxEnabled) return;
    const v = this.getSfxGain() * 0.14;
    this.playTone(440, 0.18, 'triangle', v, 0);
    this.playTone(440, 0.28, 'sine', v * 0.9, 0.16, 392);
    this.vibrate(15);
  }

  // =========================================================================
  // 2. CONNECT 4 — DISC PHYSICS SOUNDS (ချသံ + အောက်ခြေထိသံ + ပြန်ကန်သံ)
  // =========================================================================

  /** ကော်လံပေါ် Hover လုပ်သည့် ခပ်တိုးတိုး Tick သံ */
  public playDiscHover() {
    if (!this.settings.sfxEnabled) return;
    const v = this.getSfxGain() * 0.06;
    this.playTone(920, 0.03, 'triangle', v, 0, 700);
  }

  /** ကော်လံပြည့်နေ၍ ထည့်မရသည့်အသံ */
  public playColumnFull() {
    if (!this.settings.sfxEnabled) return;
    const v = this.getSfxGain() * 0.16;
    this.playTone(150, 0.09, 'sawtooth', v, 0, 110);
    this.playTone(125, 0.12, 'sawtooth', v * 0.85, 0.09, 95);
    this.vibrate([15, 25, 15]);
  }

  /** အဝိုင်းပြား လွှတ်ချလိုက်သည့်အသံ (Slide / Soft Whoosh) */
  public playDiscRelease() {
    if (!this.settings.sfxEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const v = this.getSfxGain();

    try {
      // 1. Soft Plastic Slot Entry Click
      this.playTone(760, 0.04, 'sine', v * 0.12, 0, 420);

      // 2. Filtered Noise Whoosh (ဘုတ်အပေါက်ထဲ လျှောကျသံ)
      const noise = ctx.createBufferSource();
      noise.buffer = this.getNoiseBuffer(ctx);

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1600, now);
      filter.frequency.exponentialRampToValueAtTime(500, now + 0.16);
      filter.Q.value = 2.2;

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(v * 0.14, now + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.17);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);
      noise.stop(now + 0.18);
    } catch {}
  }

  /** ပလတ်စတစ်/သစ်သား အဝိုင်းပြား အောက်ခြေထိသည့် Clack တစ်ချက် */
  private triggerSingleClack(delaySec: number, intensity: number) {
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime + delaySec;
    const v = this.getSfxGain() * intensity;

    try {
      // A. Resonant Plastic Body Thud (အတွင်းပိုင်း ပလတ်စတစ်ထိသံ)
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(360 + Math.random() * 45, now);
      osc.frequency.exponentialRampToValueAtTime(125, now + 0.065);

      oscGain.gain.setValueAtTime(Math.max(0.001, v * 0.32), now);
      oscGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.07);

      osc.connect(oscGain);
      oscGain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.075);

      // B. Sharp High-Frequency Snap (အနားသားချင်း ရိုက်မိသည့် "တောက်" သံ)
      const noise = ctx.createBufferSource();
      noise.buffer = this.getNoiseBuffer(ctx);

      const hp = ctx.createBiquadFilter();
      hp.type = 'bandpass';
      hp.frequency.setValueAtTime(2200 + Math.random() * 350, now);
      hp.Q.value = 3.0;

      const nGain = ctx.createGain();
      nGain.gain.setValueAtTime(Math.max(0.001, v * 0.28), now);
      nGain.gain.exponentialRampToValueAtTime(0.0008, now + 0.032);

      noise.connect(hp);
      hp.connect(nGain);
      nGain.connect(ctx.destination);
      noise.start(now);
      noise.stop(now + 0.036);
    } catch {}
  }

  /**
   * အဝိုင်းပြား ချသံ + Row အနက် (0=အပေါ်ဆုံး, 5=အောက်ဆုံး) အလိုက်
   * အောက်ခြေထိသံနှင့် ၂ ချက် ပြန်ကန်သံ (Double Bounce) တွဲဖွင့်ပေးမည်
   */
  public playDiscDropSequence(row: number) {
    if (!this.settings.sfxEnabled) return;

    // 1. ချက်ချင်း လွှတ်ချသံ
    this.playDiscRelease();

    // 2. Row အနက်အလိုက် ကျရောက်ချိန် တွက်ချက်ခြင်း (0.14s မှ 0.34s)
    const clampedRow = Math.max(0, Math.min(5, row));
    const impactDelaySec = 0.13 + clampedRow * 0.038;

    // 3. ပထမဆုံး အောက်ခြေထိသံ (အကျယ်ဆုံး) + ပြန်ကန်သံ ၂ ချက်
    this.triggerSingleClack(impactDelaySec, 1.0);
    this.triggerSingleClack(impactDelaySec + 0.095, 0.48);
    this.triggerSingleClack(impactDelaySec + 0.165, 0.22);

    // 4. ထိသည့်အချိန်တွင် ဖုန်းတုန်ခါမှု (Haptic)
    window.setTimeout(() => {
      this.vibrate(16);
    }, Math.round(impactDelaySec * 1000));
  }

  // =========================================================================
  // 3. မောင်ဖိုးသား CHARACTER SOUNDS (စဥ်းစားသံ၊ ငိုသံ၊ ပျော်သံ)
  // =========================================================================

  /** မောင်ဖိုးသား စဥ်းစားနေသည့်အသံ ("အင်း..." ညည်းသံ + Soft Tick) */
  public playKidThinking() {
    if (!this.settings.sfxEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const v = this.getSfxGain();

    try {
      // Cute inquisitive "Hmm...?" voice-like formant sweep
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(310, now);
      osc.frequency.linearRampToValueAtTime(295, now + 0.14);
      osc.frequency.exponentialRampToValueAtTime(385, now + 0.36);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(950, now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(v * 0.15, now + 0.06);
      gain.gain.setValueAtTime(v * 0.13, now + 0.24);
      gain.gain.exponentialRampToValueAtTime(0.0008, now + 0.4);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.42);

      // Soft playful wooden thinking ticks
      this.playTone(820, 0.035, 'sine', v * 0.06, 0.45);
      this.playTone(960, 0.035, 'sine', v * 0.05, 0.72);
    } catch {}
  }

  /** မောင်ဖိုးသား ရှုံးသွား၍ ငိုသည့်အသံ (Cute Sobbing "အီးဟီး... ဟင့်ဟင့်") */
  public playKidCry() {
    if (!this.settings.sfxEnabled) return;
    const ctx = this.getContext();
    if (!ctx) return;

    const v = this.getSfxGain();

    // ရှိုက်ငိုသံ ၃ ချက် (Waaah... uh... uh...)
    const sobs = [
      { start: 0.0, dur: 0.38, fStart: 540, fEnd: 350, amp: 0.17 },
      { start: 0.46, dur: 0.32, fStart: 480, fEnd: 320, amp: 0.15 },
      { start: 0.86, dur: 0.42, fStart: 440, fEnd: 270, amp: 0.13 },
    ];

    sobs.forEach((sob) => {
      try {
        const now = ctx.currentTime + sob.start;
        const osc = ctx.createOscillator();
        const lfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(sob.fStart, now);
        osc.frequency.exponentialRampToValueAtTime(sob.fEnd, now + sob.dur);

        // Vibrato (ငိုသံတုန်ခါမှု)
        lfo.type = 'sine';
        lfo.frequency.setValueAtTime(11, now);
        lfoGain.gain.setValueAtTime(14, now);
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);

        // Soften harshness into cute cartoon voice
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1100, now);
        filter.Q.value = 1.6;

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(v * sob.amp, now + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0008, now + sob.dur);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        lfo.start(now);
        osc.stop(now + sob.dur + 0.02);
        lfo.stop(now + sob.dur + 0.02);
      } catch {}
    });
  }

  /** မောင်ဖိုးသား နိုင်သွား၍ ခုန်ပေါက်ပျော်ရွှင်သည့်အသံ */
  public playKidHappy() {
    if (!this.settings.sfxEnabled) return;
    const v = this.getSfxGain() * 0.17;
    // Bouncy giggle notes
    const melody = [
      { f: 523.25, t: 0.0, d: 0.11 },
      { f: 659.25, t: 0.11, d: 0.11 },
      { f: 783.99, t: 0.22, d: 0.13 },
      { f: 1046.5, t: 0.36, d: 0.26 },
      { f: 880.0, t: 0.56, d: 0.12 },
      { f: 1046.5, t: 0.68, d: 0.32 },
    ];
    melody.forEach((n) => this.playTone(n.f, n.d, 'triangle', v, n.t));
    this.vibrate([20, 40, 20, 40, 35]);
  }

  /** Connect 4 နိုင်သည့်အခါ ၄ လုံးတန်း လင်းလာသည့် Fanfare */
  public playConnect4Win() {
    if (!this.settings.sfxEnabled) return;
    const v = this.getSfxGain() * 0.18;
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, idx) => {
      this.playTone(f, 0.28, 'triangle', v, idx * 0.085);
      this.playTone(f * 2, 0.18, 'sine', v * 0.35, idx * 0.085 + 0.02);
    });
    this.vibrate([30, 45, 55]);
  }

  // =========================================================================
  // 4. AMBIENT BACKGROUND MUSIC
  // =========================================================================
  public startAmbientMusic() {
    if (typeof window === 'undefined' || this.musicTimer !== null) return;
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
