import type { VoiceOutputProvider } from './types';

export interface SpeakOptions {
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
}

export class WebSpeechOutput implements VoiceOutputProvider {
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

      const utterance = new SpeechSynthesisUtterance(cleanText);

      utterance.onstart = () => {
        options?.onStart?.();
      };

      utterance.onend = () => {
        options?.onEnd?.();
        resolve();
      };

      utterance.onerror = (e) => {
        console.warn('Speech synthesis error or canceled:', e);
        options?.onError?.(e);
        options?.onEnd?.();
        resolve();
      };

      window.speechSynthesis.speak(utterance);
    });
  }

  cancel(): void {
    if (this.isSupported()) {
      window.speechSynthesis.cancel();
    }
  }
}
