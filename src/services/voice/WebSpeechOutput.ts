import type { VoiceOutputProvider } from './types';

export class WebSpeechOutput implements VoiceOutputProvider {
  isSupported(): boolean {
    return 'speechSynthesis' in window;
  }

  speak(text: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isSupported()) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => resolve();
      utterance.onerror = (e) => reject(e);
      speechSynthesis.speak(utterance);
    });
  }

  cancel(): void {
    if (this.isSupported()) {
      speechSynthesis.cancel();
    }
  }
}
