import type { VoiceInputProvider } from './types';

// Web Speech API types vary across browsers — use permissive typing
type SpeechRecognitionInstance = any;

export class WebSpeechInput implements VoiceInputProvider {
  private recognition: SpeechRecognitionInstance = null;
  private transcript: string = '';

  isSupported(): boolean {
    return 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
  }

  start(): void {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;

    this.transcript = '';
    this.recognition = new SpeechRecognitionCtor();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';

    this.recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          this.transcript += result[0].transcript;
        }
      }
    };

    this.recognition.onerror = (event: any) => {
      console.warn('Speech recognition error:', event.error);
    };

    this.recognition.start();
  }

  stop(): Promise<string> {
    return new Promise((resolve) => {
      if (!this.recognition) {
        resolve(this.transcript);
        return;
      }

      this.recognition.onend = () => {
        resolve(this.transcript);
      };

      this.recognition.stop();
    });
  }
}
