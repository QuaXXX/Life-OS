// Phase 4: Memory layer — pattern recognition and user behavior summary
// This module will provide a lightweight "memory" of user patterns
// (e.g., "usually skips Monday morning workouts") that the assistant
// can read from when making suggestions.

export interface MemoryEntry {
  pattern: string;
  confidence: number;
  lastUpdated: Date;
}

export interface MemoryStore {
  getPatterns(): Promise<MemoryEntry[]>;
  addPattern(pattern: string, confidence: number): Promise<void>;
}

// Placeholder — not implemented yet
