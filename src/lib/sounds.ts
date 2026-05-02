import { NotificationSound } from '../types';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtx;
}

function playBirdChirp() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  const chirpPattern = [0, 0.15, 0.3, 0.5, 0.65, 0.8];
  chirpPattern.forEach((offset) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const freq = 2400 + Math.random() * 800;
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now + offset);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.3, now + offset + 0.05);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.9, now + offset + 0.1);

    gain.gain.setValueAtTime(0, now + offset);
    gain.gain.linearRampToValueAtTime(0.18, now + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.12);

    osc.start(now + offset);
    osc.stop(now + offset + 0.15);
  });
}

function playWindSound() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  const duration = 2.5;

  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1);
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(400, now);
  filter.frequency.linearRampToValueAtTime(800, now + 1.2);
  filter.frequency.linearRampToValueAtTime(350, now + duration);
  filter.Q.value = 0.5;

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.15, now + 0.5);
  gain.gain.linearRampToValueAtTime(0.2, now + 1.2);
  gain.gain.linearRampToValueAtTime(0, now + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  source.start(now);
  source.stop(now + duration);
}

function playBellSound() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  const harmonics = [1, 2.756, 5.404, 8.933, 13.394];
  const amplitudes = [1, 0.5, 0.25, 0.12, 0.06];

  harmonics.forEach((ratio, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.value = 520 * ratio;

    gain.gain.setValueAtTime(amplitudes[i] * 0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2.5 - i * 0.1);

    osc.start(now);
    osc.stop(now + 2.5);
  });
}

function playChimeSound() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.value = freq;

    const startTime = now + i * 0.18;
    gain.gain.setValueAtTime(0, startTime);
    gain.gain.linearRampToValueAtTime(0.2, startTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + 1.8);

    osc.start(startTime);
    osc.stop(startTime + 2);
  });
}

export function playNotificationSound(type: NotificationSound) {
  try {
    switch (type) {
      case 'bird':
        playBirdChirp();
        break;
      case 'wind':
        playWindSound();
        break;
      case 'bell':
        playBellSound();
        break;
      case 'chime':
        playChimeSound();
        break;
    }
  } catch (e) {
    console.error('Failed to play sound', e);
  }
}
