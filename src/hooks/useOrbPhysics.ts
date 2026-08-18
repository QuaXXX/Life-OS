import { useRef, useCallback, useMemo } from 'react';

export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking';

export interface OrbTransform {
  rotationX: number;
  rotationY: number;
  breathScale: number;
  time: number; // global time for shimmer
  /** Touch ripple: normalised sphere coords of touch + age */
  ripple: { x: number; y: number; z: number; age: number } | null;
  state: OrbState;
}

// Target parameters for each state
const STATE_PARAMS = {
  idle:      { rotSpeed: 0.06, swayPeriod: 6,   swayAmp: 0.15, breathPeriod: 4,   breathAmp: 0.020 },
  listening: { rotSpeed: 0.12, swayPeriod: 3,   swayAmp: 0.18, breathPeriod: 1.8, breathAmp: 0.045 },
  thinking:  { rotSpeed: 0.04, swayPeriod: 8,   swayAmp: 0.10, breathPeriod: 2.5, breathAmp: 0.015 },
  speaking:  { rotSpeed: 0.09, swayPeriod: 4,   swayAmp: 0.16, breathPeriod: 2.5, breathAmp: 0.030 },
} as const;

interface PhysicsState {
  // Time (always advances)
  time: number;
  // Accumulated rotation — built incrementally to avoid jumps
  accRotY: number;
  // Accumulated phase angles — built incrementally to avoid compounding
  swayPhase: number;
  breathPhase: number;
  // Smoothly interpolated current parameters
  curRotSpeed: number;
  curSwayPeriod: number;
  curSwayAmp: number;
  curBreathPeriod: number;
  curBreathAmp: number;
  // Drag
  dragOffsetX: number;
  dragOffsetY: number;
  isDragging: boolean;
  dragStartX: number;
  dragStartY: number;
  dragBaseOffsetX: number;
  dragBaseOffsetY: number;
  // Ripple
  ripple: { x: number; y: number; z: number; age: number } | null;
}

/** Exponential ease toward target: returns value closer to target each frame */
function lerp(current: number, target: number, speed: number, dt: number): number {
  // speed = how many times per second we close ~63% of the gap
  const alpha = 1 - Math.exp(-speed * dt);
  return current + (target - current) * alpha;
}

export function useOrbPhysics(orbState: OrbState) {
  const state = useRef<PhysicsState>({
    time: 0,
    accRotY: 0,
    swayPhase: 0,
    breathPhase: 0,
    curRotSpeed: STATE_PARAMS.idle.rotSpeed,
    curSwayPeriod: STATE_PARAMS.idle.swayPeriod,
    curSwayAmp: STATE_PARAMS.idle.swayAmp,
    curBreathPeriod: STATE_PARAMS.idle.breathPeriod,
    curBreathAmp: STATE_PARAMS.idle.breathAmp,
    dragOffsetX: 0,
    dragOffsetY: 0,
    isDragging: false,
    dragStartX: 0,
    dragStartY: 0,
    dragBaseOffsetX: 0,
    dragBaseOffsetY: 0,
    ripple: null,
  });

  const update = useCallback(
    (delta: number): OrbTransform => {
      const s = state.current;
      const dt = Math.min(delta, 0.05);

      s.time += dt;

      // ── Smooth parameter interpolation ──
      // Ease rate: 3 = smooth (~0.3s to settle), higher = faster snap
      const easeRate = 3;
      const target = STATE_PARAMS[orbState];

      s.curRotSpeed    = lerp(s.curRotSpeed,    target.rotSpeed,    easeRate, dt);
      s.curSwayPeriod  = lerp(s.curSwayPeriod,  target.swayPeriod,  easeRate, dt);
      s.curSwayAmp     = lerp(s.curSwayAmp,     target.swayAmp,     easeRate, dt);
      s.curBreathPeriod = lerp(s.curBreathPeriod, target.breathPeriod, easeRate, dt);
      s.curBreathAmp   = lerp(s.curBreathAmp,   target.breathAmp,   easeRate, dt);

      // ── Accumulated rotation (incremental — never jumps) ──
      s.accRotY += s.curRotSpeed * dt;

      // ── Sway (X-axis tilt) — phase accumulated incrementally ──
      // This prevents the phase derivative spike that caused compounding:
      // old: sin(t * 2π / period) had d/dt = 2π/P - t*2π*dP/dt/P²
      // new: phase += 2π/P * dt, so frequency is always exactly 1/P
      s.swayPhase += (Math.PI * 2 / s.curSwayPeriod) * dt;
      const swayX = Math.sin(s.swayPhase) * s.curSwayAmp;

      // ── Breathing — phase accumulated incrementally ──
      s.breathPhase += (Math.PI * 2 / s.curBreathPeriod) * dt;
      let breathScale: number;
      if (orbState === 'speaking') {
        // Speech-like harmonic wave, but amplitude is smoothly interpolated
        const primaryWave = Math.sin(s.breathPhase * 3.75) * s.curBreathAmp;
        const secondaryWave = Math.sin(s.breathPhase * 7.5) * (s.curBreathAmp * 0.5);
        breathScale = 1 + primaryWave + secondaryWave;
      } else {
        breathScale = 1 + Math.sin(s.breathPhase) * s.curBreathAmp;
      }

      // ── Final rotation = accumulated idle + drag offset ──
      const rotationX = swayX + s.dragOffsetX;
      const rotationY = s.accRotY + s.dragOffsetY;

      // ── Ripple aging ──
      if (s.ripple) {
        s.ripple.age += dt;
        if (s.ripple.age > 1.2) s.ripple = null;
      }

      return {
        rotationX,
        rotationY,
        breathScale,
        time: s.time,
        ripple: s.ripple ? { ...s.ripple } : null,
        state: orbState,
      };
    },
    [orbState]
  );

  const onPointerDown = useCallback((clientX: number, clientY: number) => {
    const s = state.current;
    s.isDragging = true;
    s.dragStartX = clientX;
    s.dragStartY = clientY;
    s.dragBaseOffsetX = s.dragOffsetX;
    s.dragBaseOffsetY = s.dragOffsetY;
  }, []);

  const onPointerMove = useCallback((clientX: number, clientY: number) => {
    const s = state.current;
    if (!s.isDragging) return;
    s.dragOffsetX = s.dragBaseOffsetX + (clientY - s.dragStartY) * 0.005;
    s.dragOffsetY = s.dragBaseOffsetY + (clientX - s.dragStartX) * 0.005;
  }, []);

  const onPointerUp = useCallback(() => {
    state.current.isDragging = false;
  }, []);

  const triggerRipple = useCallback((nx: number, ny: number, nz: number) => {
    state.current.ripple = { x: nx, y: ny, z: nz, age: 0 };
  }, []);

  // Memoize the return object so Orb.tsx's useEffect doesn't re-fire on every render
  return useMemo(
    () => ({ update, onPointerDown, onPointerMove, onPointerUp, triggerRipple }),
    [update, onPointerDown, onPointerMove, onPointerUp, triggerRipple]
  );
}
