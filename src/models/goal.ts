// Phase 2: Goals data model
export interface Goal {
  id: string;
  title: string;
  target: string;
  progress: number; // 0..1
  completed: boolean;
}
