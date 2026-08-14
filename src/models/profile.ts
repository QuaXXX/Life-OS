// Phase 2: User profile — stable facts
export interface UserProfile {
  name: string;
  schedule?: string; // e.g., "MWF classes, TTh free"
  dietaryRestrictions?: string[];
  chronotype?: 'early-bird' | 'night-owl' | 'flexible';
}
