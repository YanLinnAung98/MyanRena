class SoundEngine {
  private ctx: AudioContext | null = null;
  private muted: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.muted = localStorage.getItem('vanguard_muted') === '1';
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined' || this.muted) return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  isMuted(): boolean {
    return this.muted;
  }

  setMuted(next: boolean): void {
    this.muted = next;
    if (typeof window !== 'undefined') {
      localStorage.setItem('vanguard_muted', next ? '1' : '0');
    }
  }

  private tone(freq: number, duration: number, type: OscillatorType = 'sine', gainVal = 0.08, delay = 0) {
    const ctx = this.getContext();
    if (!ctx) return;
    const now = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainVal, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  playMove() {
    this.tone(420, 0.09, 'triangle', 0.09);
    this.tone(620, 0.06, 'sine', 0.05, 0.03);
  }

  playDrop() {
    this.tone(240, 0.12, 'sine', 0.11);
    this.tone(180, 0.08, 'triangle', 0.07, 0.05);
  }

  playTick() {
    this.tone(760, 0.05, 'sine', 0.05);
  }

  playNotify() {
    this.tone(587.33, 0.12, 'sine', 0.06);
    this.tone(880, 0.18, 'sine', 0.06, 0.09);
  }

  playWin() {
    this.tone(523.25, 0.15, 'triangle', 0.09, 0);
    this.tone(659.25, 0.15, 'triangle', 0.09, 0.1);
    this.tone(783.99, 0.18, 'triangle', 0.09, 0.2);
    this.tone(1046.5, 0.36, 'sine', 0.1, 0.3);
  }

  playLose() {
    this.tone(349.23, 0.16, 'sawtooth', 0.04, 0);
    this.tone(293.66, 0.18, 'sawtooth', 0.04, 0.12);
    this.tone(220, 0.32, 'triangle', 0.06, 0.24);
  }
}

export const soundEngine = new SoundEngine();
