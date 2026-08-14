export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking';

export interface VoiceInputProvider {
  start(): void;
  stop(): Promise<string>;
  isSupported(): boolean;
}

export interface VoiceOutputProvider {
  speak(text: string): Promise<void>;
  cancel(): void;
  isSupported(): boolean;
}
