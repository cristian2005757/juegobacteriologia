const STORAGE_KEY = "selectiva-muted";

type Mood = "ward" | "danger" | "clear";

const WARD = [null, 220, null, 261.63, null, 329.63, null, 196, null, 246.94, null, 293.66, null, 174.61, null, 233.08];
const DANGER = [110, null, 164.81, null, 196, null, 146.83, null, 110, null, 174.61, null, 130.81, null, 196, null];
const CLEAR = [261.63, 329.63, 392, 523.25, null, 392, 329.63, 261.63, 293.66, 369.99, 440, 587.33, null, 440, 349.23, 293.66];

class WardAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private music: GainNode | null = null;
  private muted = false;
  private running = false;
  private next = 0;
  private step = 0;
  private mood: Mood = "ward";
  private readonly listeners = new Set<() => void>();

  constructor() {
    try {
      this.muted = localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      this.muted = false;
    }
  }

  get isMuted() {
    return this.muted;
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  unlock() {
    const Ctx = window.AudioContext;
    if (!this.ctx) {
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.85;
      this.master.connect(this.ctx.destination);
      this.music = this.ctx.createGain();
      this.music.gain.value = 0.2;
      this.music.connect(this.master);
    }
    void this.ctx.resume();
    if (!this.running) {
      this.running = true;
      this.next = this.ctx.currentTime + 0.08;
      this.loop();
    }
  }

  toggleMute() {
    this.unlock();
    this.muted = !this.muted;
    try {
      localStorage.setItem(STORAGE_KEY, this.muted ? "1" : "0");
    } catch {
      /* the choice still applies this session */
    }
    if (this.master && this.ctx) {
      const now = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.linearRampToValueAtTime(this.muted ? 0 : 0.85, now + 0.06);
    }
    this.listeners.forEach((fn) => fn());
  }

  setMood(mood: Mood) {
    this.mood = mood;
  }

  hit() {
    this.blip(540, 0.1, "triangle", 0.11, 920);
  }

  resist() {
    this.blip(160, 0.16, "sawtooth", 0.04, 80);
  }

  attack() {
    this.blip(130, 0.26, "sine", 0.16, 55);
  }

  win() {
    this.setMood("clear");
    this.blip(523, 0.14, "triangle", 0.08);
    window.setTimeout(() => this.blip(659, 0.14, "triangle", 0.08), 110);
    window.setTimeout(() => this.blip(784, 0.26, "triangle", 0.08), 220);
  }

  lose() {
    this.blip(311, 0.42, "sine", 0.1, 82);
  }

  ui() {
    this.blip(680, 0.05, "sine", 0.035);
  }

  private loop = () => {
    if (!this.ctx || !this.music) return;
    const horizon = this.ctx.currentTime + 0.28;
    const beat = this.mood === "danger" ? 0.3 : 0.4;
    while (this.next < horizon) {
      this.tick(this.next, this.step);
      this.step = (this.step + 1) % 16;
      this.next += beat;
    }
    window.setTimeout(this.loop, 90);
  };

  private tick(time: number, step: number) {
    if (step === 0) this.thump(time, 48, 0.16);
    if (step === 1) this.thump(time, 40, 0.08);
    const row = this.mood === "danger" ? DANGER : this.mood === "clear" ? CLEAR : WARD;
    const freq = row[step];
    if (freq) this.note(time, freq, this.mood === "clear" ? 0.04 : 0.028, 0.36);
    if (step === 8) this.note(time, 880, 0.01, 0.06);
  }

  private note(time: number, freq: number, gain: number, dur: number) {
    if (!this.ctx || !this.music) return;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    amp.gain.setValueAtTime(0.0001, time);
    amp.gain.exponentialRampToValueAtTime(gain, time + 0.04);
    amp.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(amp);
    amp.connect(this.music);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  }

  private thump(time: number, freq: number, gain: number) {
    if (!this.ctx || !this.music) return;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq * 2.2, time);
    osc.frequency.exponentialRampToValueAtTime(freq, time + 0.09);
    amp.gain.setValueAtTime(gain, time);
    amp.gain.exponentialRampToValueAtTime(0.0001, time + 0.18);
    osc.connect(amp);
    amp.connect(this.music);
    osc.start(time);
    osc.stop(time + 0.2);
  }

  private blip(freq: number, dur: number, type: OscillatorType, gain: number, slide?: number) {
    this.unlock();
    if (!this.ctx || !this.master) return;
    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const amp = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, time);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, slide), time + dur);
    amp.gain.setValueAtTime(gain, time);
    amp.gain.exponentialRampToValueAtTime(0.0001, time + dur);
    osc.connect(amp);
    amp.connect(this.master);
    osc.start(time);
    osc.stop(time + dur + 0.02);
  }
}

export const audio = new WardAudio();
