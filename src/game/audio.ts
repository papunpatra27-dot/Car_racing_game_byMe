export class RacingAudioEngine {
  private ctx: AudioContext | null = null;
  private osc1: OscillatorNode | null = null;
  private osc2: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private filter: BiquadFilterNode | null = null;
  private hornOsc1: OscillatorNode | null = null;
  private hornOsc2: OscillatorNode | null = null;
  private hornGain: GainNode | null = null;
  private hornActive = false;
  private enabled = true;
  private initialized = false;

  setEnabled(val: boolean): void {
    this.enabled = val;
    if (this.engineGain && this.ctx) {
      this.engineGain.gain.setTargetAtTime(
        val ? 0.04 : 0,
        this.ctx.currentTime,
        0.05
      );
    }
    if (!val) {
      this.setHorn(false);
    }
  }

  unlock(): void {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    if (!this.initialized && this.ctx) {
      this.initialized = true;
      this.osc1 = this.ctx.createOscillator();
      this.osc2 = this.ctx.createOscillator();
      this.filter = this.ctx.createBiquadFilter();
      this.engineGain = this.ctx.createGain();

      this.osc1.type = 'sawtooth';
      this.osc2.type = 'triangle';
      this.osc1.frequency.value = 55;
      this.osc2.frequency.value = 110;

      this.filter.type = 'lowpass';
      this.filter.frequency.value = 260;
      this.filter.Q.value = 2.2;

      this.engineGain.gain.value = 0;

      this.osc1.connect(this.filter);
      this.osc2.connect(this.filter);
      this.filter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);

      this.osc1.start();
      this.osc2.start();

      // Dual-tone car horn (F4 + A4 harmony through warm bandpass/lowpass)
      this.hornOsc1 = this.ctx.createOscillator();
      this.hornOsc2 = this.ctx.createOscillator();
      const hornFilter = this.ctx.createBiquadFilter();
      this.hornGain = this.ctx.createGain();

      this.hornOsc1.type = 'sawtooth';
      this.hornOsc2.type = 'triangle';
      this.hornOsc1.frequency.value = 392; // G4
      this.hornOsc2.frequency.value = 493.88; // B4

      hornFilter.type = 'lowpass';
      hornFilter.frequency.value = 1350;
      hornFilter.Q.value = 1.6;

      this.hornGain.gain.value = 0;

      this.hornOsc1.connect(hornFilter);
      this.hornOsc2.connect(hornFilter);
      hornFilter.connect(this.hornGain);
      this.hornGain.connect(this.ctx.destination);

      this.hornOsc1.start();
      this.hornOsc2.start();
    }
  }

  setHorn(active: boolean): void {
    if (!this.ctx || !this.hornGain) return;
    const shouldPlay = active && this.enabled;
    if (shouldPlay === this.hornActive) return;
    this.hornActive = shouldPlay;
    const now = this.ctx.currentTime;
    this.hornGain.gain.cancelScheduledValues(now);
    this.hornGain.gain.setTargetAtTime(shouldPlay ? 0.14 : 0, now, 0.018);
  }

  updateEngine(
    rpm: number,
    throttle: boolean,
    pitchFactor: number,
    active: boolean
  ): void {
    if (!this.ctx || !this.osc1 || !this.osc2 || !this.filter || !this.engineGain)
      return;
    const now = this.ctx.currentTime;
    if (!this.enabled || !active) {
      this.engineGain.gain.setTargetAtTime(0, now, 0.08);
      this.setHorn(false);
      return;
    }

    const rpmNorm = Math.max(0.12, Math.min(1.0, rpm / 7800));
    const baseFreq = (42 + rpmNorm * 155) * pitchFactor;
    this.osc1.frequency.setTargetAtTime(baseFreq, now, 0.04);
    this.osc2.frequency.setTargetAtTime(baseFreq * 1.99, now, 0.04);
    this.filter.frequency.setTargetAtTime(
      throttle ? 240 + rpmNorm * 820 : 160 + rpmNorm * 340,
      now,
      0.06
    );
    this.engineGain.gain.setTargetAtTime(
      throttle ? 0.065 + rpmNorm * 0.045 : 0.028 + rpmNorm * 0.015,
      now,
      0.06
    );
  }

  playPickup(type: 'fuel' | 'coin'): void {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    if (type === 'fuel') {
      osc.frequency.setValueAtTime(523.25, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.14);
    } else {
      osc.frequency.setValueAtTime(784, now);
      osc.frequency.exponentialRampToValueAtTime(1174, now + 0.1);
    }
    gain.gain.setValueAtTime(0.12, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.19);
  }

  playBoostPad(): void {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(210, now);
    osc.frequency.exponentialRampToValueAtTime(660, now + 0.22);
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.25);
  }

  playClosePass(): void {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(340, now);
    osc.frequency.exponentialRampToValueAtTime(120, now + 0.14);
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  playCrash(): void {
    if (!this.enabled || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(32, now + 0.35);
    gain.gain.setValueAtTime(0.24, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  }

  playWin(): void {
    if (!this.enabled || !this.ctx) return;
    const notes = [523.25, 659.25, 783.99, 1046.5];
    const now = this.ctx.currentTime;
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.09);
      gain.gain.setValueAtTime(0.11, now + idx * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.32);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now + idx * 0.09);
      osc.stop(now + idx * 0.09 + 0.34);
    });
  }

  dispose(): void {
    try {
      this.osc1?.stop();
      this.osc2?.stop();
      this.hornOsc1?.stop();
      this.hornOsc2?.stop();
      this.ctx?.close();
    } catch {
      // ignore
    }
    this.ctx = null;
    this.initialized = false;
  }
}
