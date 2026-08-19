import type { VoiceInputProvider } from './types';

// Web Speech API types vary across browsers — use permissive typing
type SpeechRecognitionInstance = any;

export class WebSpeechInput implements VoiceInputProvider {
  private recognition: SpeechRecognitionInstance = null;
  private finalSegments: string[] = [];

  isSupported(): boolean {
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  }

  start(): void {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    // Clean up any previous instance to prevent overlapping sessions
    if (this.recognition) {
      try {
        this.recognition.onresult = null;
        this.recognition.onerror = null;
        this.recognition.onend = null;
        this.recognition.abort();
      } catch {
        // Already stopped/aborted
      }
      this.recognition = null;
    }

    this.finalSegments = [];
    this.recognition = new SpeechRecognitionCtor();

    // ── Key settings ──
    // continuous=false: single utterance per hold-to-talk (avoids boundary re-transcription)
    // interimResults=false: only receive final, committed transcripts (no partial duplicates)
    this.recognition.continuous = false;
    this.recognition.interimResults = false;
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 1;

    this.recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          const text = (result[0].transcript || '').trim();
          if (text) {
            this.finalSegments.push(text);
          }
        }
      }
    };

    this.recognition.onerror = (event: any) => {
      // 'no-speech' and 'aborted' are expected when user releases quickly
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        console.warn('Speech recognition error:', event.error);
      }
    };

    this.recognition.start();
  }

  stop(): Promise<string> {
    return new Promise((resolve) => {
      if (!this.recognition) {
        resolve(this.buildTranscript());
        return;
      }

      // Capture reference so we resolve for THIS instance only
      const rec = this.recognition;
      let resolved = false;

      const finish = () => {
        if (resolved) return;
        resolved = true;
        // Only nullify if this is still the active instance
        if (this.recognition === rec) {
          this.recognition = null;
        }
        resolve(this.buildTranscript());
      };

      // Timeout fallback: if onend never fires (browser bug), resolve after 2s
      const timeout = setTimeout(finish, 2000);

      rec.onend = () => {
        clearTimeout(timeout);
        finish();
      };

      rec.onerror = () => {
        clearTimeout(timeout);
        finish();
      };

      try {
        rec.stop();
      } catch {
        // Already stopped
        clearTimeout(timeout);
        finish();
      }
    });
  }

  /**
   * Join final segments with spaces, then deduplicate any repeated
   * trailing phrases that the engine may have re-transcribed at
   * chunk boundaries.
   */
  private buildTranscript(): string {
    const raw = this.finalSegments.join(' ').trim();
    return this.deduplicateTrailing(raw);
  }

  /**
   * Detect and remove trailing repeated phrases.
   * Example: "add math test add math test" → "add math test"
   *
   * Checks suffix lengths from half the string down to 3 words,
   * looking for an exact duplicate immediately preceding the suffix.
   */
  private deduplicateTrailing(text: string): string {
    const words = text.split(/\s+/);
    if (words.length < 2) return text;

    // Check for trailing repeated sequences of 1..half words
    const maxLen = Math.floor(words.length / 2);
    for (let seqLen = maxLen; seqLen >= 1; seqLen--) {
      const tail = words.slice(-seqLen).join(' ').toLowerCase();
      const preceding = words.slice(-seqLen * 2, -seqLen).join(' ').toLowerCase();
      if (tail === preceding) {
        // Remove the duplicate tail
        return words.slice(0, -seqLen).join(' ');
      }
    }

    return text;
  }
}
