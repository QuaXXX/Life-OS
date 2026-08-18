import type { VoiceOutputProvider } from './types';

export interface SpeakOptions {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

export class WebSpeechOutput implements VoiceOutputProvider {
  // Keep a reference to the active utterance to prevent GC before onend fires.
  // This field is intentionally write-heavy — it exists to prevent garbage collection.
  private activeUtterance: SpeechSynthesisUtterance | null = null;
  /** @internal */ getActiveUtterance() { return this.activeUtterance; }

  isSupported(): boolean {
    return 'speechSynthesis' in window;
  }

  speak(text: string, options?: SpeakOptions): Promise<void> {
    return new Promise((resolve) => {
      if (!this.isSupported()) {
        options?.onError?.(new Error('Speech synthesis not supported'));
        resolve();
        return;
      }

      this.cancel();

      // Clean text: strip markdown characters for clearer speech
      const cleanText = text.replace(/[*_#`~\[\]]/g, '').trim();
      if (!cleanText) {
        resolve();
        return;
      }

      let resolved = false;
      const finish = () => {
        if (resolved) return;
        resolved = true;
        this.activeUtterance = null;
        options?.onEnd?.();
        resolve();
      };

      const utterance = new SpeechSynthesisUtterance(cleanText);
      this.activeUtterance = utterance;

      // Safety timeout: if TTS hangs (browser bug, GC, audio interruption),
      // force resolve after 30s to prevent orbState getting stuck
      const timeout = setTimeout(() => {
        console.warn('TTS timeout — forcing completion after 30s');
        this.cancel();
        finish();
      }, 30000);

      utterance.onstart = () => {
        options?.onStart?.();
      };

      utterance.onend = () => {
        clearTimeout(timeout);
        finish();
      };

      utterance.onerror = (e) => {
        clearTimeout(timeout);
        console.warn('Speech synthesis error or canceled:', e);
        options?.onError?.(e);
        finish();
      };

      window.speechSynthesis.speak(utterance);
    });
  }

  cancel(): void {
    if (this.isSupported()) {
      window.speechSynthesis.cancel();
    }
    this.activeUtterance = null;
  }
}
