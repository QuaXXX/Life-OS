// A lightweight utility for sensory feedback (haptics + Web Audio API tones)
// We use Web Audio API to avoid loading external audio files.

let audioCtx: AudioContext | null = null;

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

function playTone(freq1: number, freq2: number, duration: number, type: OscillatorType = 'sine') {
  try {
    const ctx = getAudioContext();
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = type;
    osc2.type = type;
    osc1.frequency.setValueAtTime(freq1, ctx.currentTime);
    osc2.frequency.setValueAtTime(freq2, ctx.currentTime);

    // Envelope to avoid clicks
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start();
    osc2.start();
    osc1.stop(ctx.currentTime + duration);
    osc2.stop(ctx.currentTime + duration);
  } catch (e) {
    // Ignore errors (e.g. if audio context fails to resume)
  }
}

export const sensory = {
  vibrate(pattern: number | number[]) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  },

  playStartListening() {
    this.vibrate(50); // Short tap
    playTone(440, 554, 0.15); // A4 + C#5 (pleasant major third)
  },

  playStopListening() {
    this.vibrate([30, 50, 30]); // Double tap
    playTone(554, 440, 0.2); // C#5 + A4 (descending)
  },
  
  playActionSuccess() {
    this.vibrate(30);
    playTone(523.25, 659.25, 0.3); // C5 + E5
  }
};
