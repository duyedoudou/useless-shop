import type { Product } from "../data/products";

type AudioWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext;
  };

const broadcastByProduct: Record<string, string> = {
  "give-up-license": "许可证找到了。申请理由为空，但符合规定。",
  "some-luck": "找到一点散装好运。只有一小袋，千万别洒。",
  "one-minute-peace": "清净库存只剩一分钟。轻拿轻放，不要出声。",
  "no-explanation": "解释已经全部清空。无需说明，直接装箱。",
  "ask-universe": "宇宙刚刚回话了。语气不太确定，但可以发货。",
  "golden-pardon": "免死金牌找到了。边角有点旧，不影响赦免。",
  "life-advice": "人生建议正在现编。放心，听起来很像真的。",
  "daily-manual": "说明书刚刚印好。墨还没干，先不要摸。",
};

const broadcastAudioByProduct: Record<string, string> = {
  "give-up-license": "/audio/warehouse/give-up-license.mp3",
  "some-luck": "/audio/warehouse/some-luck.mp3",
  "one-minute-peace": "/audio/warehouse/one-minute-peace.mp3",
  "no-explanation": "/audio/warehouse/no-explanation.mp3",
  "ask-universe": "/audio/warehouse/ask-universe.mp3",
  "golden-pardon": "/audio/warehouse/golden-pardon.mp3",
  "life-advice": "/audio/warehouse/life-advice.mp3",
  "daily-manual": "/audio/warehouse/daily-manual.mp3",
};

const minimumStageDuration = [675, 1300, 825, 800, 1500, 750, 875, 1275];

const wait = (milliseconds: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, milliseconds));

export function getWarehouseBroadcast(product: Product, step: number) {
  if (step === 1) return "仓库仓库，收到请回答。";
  if (step === 4) return broadcastByProduct[product.id] ?? "货找到了。只有一份，马上处理。";
  if (step === 7) return "黄林坑批准出库。请立即交付。";
  return "";
}

function getWarehouseBroadcastAudio(product: Product, step: number) {
  if (step === 1) return "/audio/warehouse/call.mp3";
  if (step === 4) return broadcastAudioByProduct[product.id] ?? "";
  if (step === 7) return "/audio/warehouse/final.mp3";
  return "";
}

class FulfillmentSoundEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private enabled = true;
  private pendingVoiceResolve: (() => void) | null = null;
  private activeVoiceSource: AudioBufferSourceNode | null = null;
  private voiceBuffers = new Map<string, Promise<AudioBuffer | null>>();

  async unlock() {
    if (typeof window === "undefined") return;

    const AudioContextConstructor =
      window.AudioContext ?? (window as AudioWindow).webkitAudioContext;

    if (!AudioContextConstructor) return;

    if (!this.context) {
      this.context = new AudioContextConstructor();
      this.master = this.context.createGain();
      this.master.gain.value = this.enabled ? 0.32 : 0;
      this.master.connect(this.context.destination);
    }

    if (this.context.state === "suspended") {
      await this.context.resume().catch(() => undefined);
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (this.context && this.master) {
      this.master.gain.setTargetAtTime(
        enabled ? 0.32 : 0,
        this.context.currentTime,
        0.015,
      );
    }

    if (!enabled) {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      this.stopActiveVoice();
      this.finishPendingVoice();
    }
  }

  async prepareVoices(product: Product) {
    if (!this.enabled) return;
    await this.unlock();

    const audioUrls = [1, 4, 7]
      .map((step) => getWarehouseBroadcastAudio(product, step))
      .filter(Boolean);

    await Promise.all(audioUrls.map((audioUrl) => this.loadVoiceBuffer(audioUrl)));
  }

  async previewEnabled() {
    this.setEnabled(true);
    await this.unlock();
    this.tone(660, 0.06, 0.24, 0, "square", 880);
    this.tone(990, 0.09, 0.18, 0.075, "sine", 1180);
  }

  stop() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    this.stopActiveVoice();
    this.finishPendingVoice();
  }

  async playStageAndWait(step: number, product: Product) {
    const minimumWait = wait(minimumStageDuration[step] ?? 1600);
    let voiceFinished: Promise<void> | null = null;

    if (!this.enabled || !this.context || !this.master) {
      await minimumWait;
      return;
    }

    switch (step) {
      case 0:
        this.relayClick();
        this.paymentBeep();
        break;
      case 1:
        this.telephoneRing();
        this.radioStatic(0.72, 0.06);
        voiceFinished = this.announce(
          getWarehouseBroadcast(product, step),
          getWarehouseBroadcastAudio(product, step),
          0.14,
        );
        break;
      case 2:
        this.scannerBurst(3);
        this.rummage();
        break;
      case 3:
        this.packingTape();
        this.boxImpact(0.34);
        break;
      case 4:
        this.productionMachine();
        this.radioStatic(0.8, 0.05);
        voiceFinished = this.announce(
          getWarehouseBroadcast(product, step),
          getWarehouseBroadcastAudio(product, step),
          0.15,
        );
        break;
      case 5:
        this.scannerBurst(2, 0.04);
        this.tone(1320, 0.1, 0.2, 0.25, "sine", 1650);
        break;
      case 6:
        this.stamp();
        break;
      case 7:
        this.conveyorRush();
        this.radioStatic(0.66, 0.045);
        voiceFinished = this.announce(
          getWarehouseBroadcast(product, step),
          getWarehouseBroadcastAudio(product, step),
          0.13,
        );
        break;
    }

    if (voiceFinished) {
      await Promise.all([minimumWait, voiceFinished.then(() => wait(160))]);
      return;
    }

    await minimumWait;
  }

  playResult() {
    if (!this.enabled || !this.context || !this.master) return;

    this.noise(0.28, 1150, 0.07, 0.02, "bandpass");
    this.tone(620, 0.22, 0.18, 0.18, "sine", 780);
    this.tone(930, 0.32, 0.13, 0.25, "triangle", 1180);
    this.stamp(0.55, 1.15);
  }

  private tone(
    frequency: number,
    duration: number,
    volume: number,
    delay = 0,
    type: OscillatorType = "sine",
    endFrequency = frequency,
  ) {
    if (!this.context || !this.master) return;

    const start = this.context.currentTime + delay;
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(20, endFrequency),
      start + duration,
    );
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(this.master);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  private noise(
    duration: number,
    frequency: number,
    volume: number,
    delay = 0,
    filterType: BiquadFilterType = "lowpass",
  ) {
    if (!this.context || !this.master) return;

    const frameCount = Math.ceil(this.context.sampleRate * duration);
    const buffer = this.context.createBuffer(1, frameCount, this.context.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let index = 0; index < frameCount; index += 1) {
      channel[index] = Math.random() * 2 - 1;
    }

    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const gain = this.context.createGain();
    const start = this.context.currentTime + delay;
    source.buffer = buffer;
    filter.type = filterType;
    filter.frequency.value = frequency;
    filter.Q.value = filterType === "bandpass" ? 0.9 : 0.45;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), start + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start(start);
    source.stop(start + duration + 0.02);
  }

  private relayClick() {
    this.noise(0.045, 2400, 0.22, 0, "bandpass");
    this.tone(96, 0.055, 0.3, 0, "square", 58);
  }

  private paymentBeep() {
    this.tone(880, 0.07, 0.18, 0.08, "square", 1040);
    this.tone(1180, 0.09, 0.18, 0.19, "square", 1450);
  }

  private telephoneRing() {
    this.tone(425, 0.3, 0.2, 0, "sine", 410);
    this.tone(510, 0.3, 0.14, 0, "sine", 500);
    this.tone(425, 0.22, 0.16, 0.34, "sine", 400);
    this.tone(510, 0.22, 0.1, 0.34, "sine", 490);
  }

  private scannerBurst(count: number, initialDelay = 0) {
    for (let index = 0; index < count; index += 1) {
      this.tone(720 + index * 180, 0.075, 0.2, initialDelay + index * 0.11, "square", 1720 + index * 90);
    }
  }

  private rummage() {
    this.noise(0.16, 900, 0.11, 0.03, "bandpass");
    this.noise(0.19, 1400, 0.1, 0.19, "bandpass");
    this.noise(0.12, 700, 0.12, 0.39, "lowpass");
  }

  private packingTape() {
    this.noise(0.42, 3300, 0.17, 0, "highpass");
    this.tone(1700, 0.36, 0.07, 0, "sawtooth", 520);
  }

  private boxImpact(delay: number) {
    this.tone(112, 0.13, 0.34, delay, "sine", 42);
    this.noise(0.09, 520, 0.22, delay, "lowpass");
  }

  private productionMachine() {
    this.tone(92, 0.48, 0.12, 0, "sawtooth", 78);
    for (let index = 0; index < 6; index += 1) {
      this.noise(0.035, 1800, 0.13, index * 0.075, "bandpass");
      this.tone(380, 0.025, 0.12, index * 0.075, "square", 250);
    }
  }

  private stamp(delay = 0, volumeScale = 1) {
    this.noise(0.075, 980, 0.62 * volumeScale, delay, "lowpass");
    this.noise(0.04, 2600, 0.34 * volumeScale, delay + 0.012, "bandpass");
    this.tone(136, 0.22, 0.84 * volumeScale, delay + 0.014, "sine", 34);
    this.tone(62, 0.3, 0.58 * volumeScale, delay + 0.045, "sine", 28);
    this.noise(0.32, 430, 0.4 * volumeScale, delay + 0.065, "lowpass");
  }

  private conveyorRush() {
    this.noise(0.72, 520, 0.13, 0, "lowpass");
    this.tone(68, 0.72, 0.12, 0, "sawtooth", 104);
    this.boxImpact(0.5);
  }

  private radioStatic(duration: number, volume: number) {
    this.noise(duration, 2100, volume, 0, "bandpass");
  }

  private async announce(copy: string, audioUrl: string, delaySeconds: number) {
    if (!copy) return;

    if (audioUrl && this.context && this.master) {
      const playedRecording = await this.playRecordedVoice(audioUrl, delaySeconds);
      if (playedRecording) return;
    }

    await this.announceWithDeviceVoice(copy, delaySeconds);
  }

  private async playRecordedVoice(audioUrl: string, delaySeconds: number) {
    const [buffer] = await Promise.all([
      this.loadVoiceBuffer(audioUrl),
      wait(delaySeconds * 1000),
    ]);

    if (!buffer || !this.context || !this.master || !this.enabled) return false;

    this.finishPendingVoice();
    this.stopActiveVoice();

    return new Promise<boolean>((resolve) => {
      let settled = false;
      const source = this.context!.createBufferSource();
      const highpass = this.context!.createBiquadFilter();
      const compressor = this.context!.createDynamicsCompressor();
      const gain = this.context!.createGain();

      source.buffer = buffer;
      highpass.type = "highpass";
      highpass.frequency.value = 150;
      compressor.threshold.value = -22;
      compressor.knee.value = 18;
      compressor.ratio.value = 3.5;
      compressor.attack.value = 0.004;
      compressor.release.value = 0.16;
      gain.gain.value = 1.6;

      source.connect(highpass);
      highpass.connect(compressor);
      compressor.connect(gain);
      gain.connect(this.master!);

      const finish = () => {
        if (settled) return;
        settled = true;
        if (this.activeVoiceSource === source) this.activeVoiceSource = null;
        if (this.pendingVoiceResolve === finish) this.pendingVoiceResolve = null;
        resolve(true);
      };

      this.activeVoiceSource = source;
      this.pendingVoiceResolve = finish;
      source.onended = finish;
      source.start();
    });
  }

  private loadVoiceBuffer(audioUrl: string) {
    if (!this.context) return Promise.resolve<AudioBuffer | null>(null);

    const cached = this.voiceBuffers.get(audioUrl);
    if (cached) return cached;

    const context = this.context;
    const loading = fetch(audioUrl)
      .then((response) => {
        if (!response.ok) throw new Error(`Unable to load voice recording: ${audioUrl}`);
        return response.arrayBuffer();
      })
      .then((audioData) => context.decodeAudioData(audioData))
      .catch(() => null);

    this.voiceBuffers.set(audioUrl, loading);
    return loading;
  }

  private announceWithDeviceVoice(copy: string, delaySeconds: number) {
    if (
      !copy ||
      typeof window === "undefined" ||
      !("speechSynthesis" in window) ||
      !("SpeechSynthesisUtterance" in window)
    ) {
      return Promise.resolve();
    }

    this.finishPendingVoice();

    return new Promise<void>((resolve) => {
      let settled = false;
      let startTimer = 0;
      let fallbackTimer = 0;

      const finish = () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(startTimer);
        window.clearTimeout(fallbackTimer);
        if (this.pendingVoiceResolve === finish) this.pendingVoiceResolve = null;
        resolve();
      };

      this.pendingVoiceResolve = finish;
      const estimatedVoiceDuration = Math.min(5200, Math.max(1800, copy.length * 165));
      fallbackTimer = window.setTimeout(
        finish,
        delaySeconds * 1000 + estimatedVoiceDuration,
      );

      startTimer = window.setTimeout(() => {
        if (!this.enabled) {
          finish();
          return;
        }

        const utterance = new SpeechSynthesisUtterance(copy);
        const voices = window.speechSynthesis.getVoices();
        const chineseVoices = voices.filter((voice) => voice.lang.toLowerCase().startsWith("zh"));
        const preferredVoice = chineseVoices.find((voice) =>
          /yunxi|kangkang|sin-ji|ting-ting|xiaoxiao|普通话/i.test(voice.name),
        );

        utterance.voice = preferredVoice ?? chineseVoices[0] ?? null;
        utterance.lang = "zh-CN";
        utterance.rate = 0.94;
        utterance.pitch = 0.72;
        utterance.volume = 0.9;
        utterance.onend = finish;
        utterance.onerror = finish;
        window.speechSynthesis.speak(utterance);
      }, delaySeconds * 1000);
    });
  }

  private stopActiveVoice() {
    const source = this.activeVoiceSource;
    this.activeVoiceSource = null;
    if (!source) return;

    try {
      source.stop();
    } catch {
      // The source may already have stopped naturally.
    }
  }

  private finishPendingVoice() {
    const finish = this.pendingVoiceResolve;
    this.pendingVoiceResolve = null;
    finish?.();
  }
}

export const fulfillmentSound = new FulfillmentSoundEngine();
