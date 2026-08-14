import { useRef, useCallback } from 'react';

export type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking';

export interface OrbTransform {
  rotationX: number;
  rotationY: number;
  breathScale: number;
  time: number; // global time for shimmer
  /** Touch ripple: normalised sphere coords of touch + age */
  ripple: { x: number; y: number; z: number; age: number } | null;
}

interface PhysicsState {
  // Continuous idle time — never pauses
  idleTime: number;
  // Drag offset — additive on top of idle
  dragOffsetX: number;
  dragOffsetY: number;
  // Drag tracking
  isDragging: boolean;
  dragStartX: number;
  dragStartY: number;
  dragBaseOffsetX: number;
  dragBaseOffsetY: number;
  // Ripple
  ripple: { x: number; y: number; z: number; age: number } | null;
}

export function useOrbPhysics(orbState: OrbState) {
  const state = useRef<PhysicsState>({
    idleTime: 0,
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

      // Idle time ALWAYS advances — never stops for drag or listening
      s.idleTime += dt;
      const t = s.idleTime;

      // ── Idle rotation (continuous, never stops) ──
      const isListening = orbState === 'listening';
      const rotSpeed = isListening ? 0.12 : 0.06;
      const idleRotY = t * rotSpeed;

      // Sinusoidal tilt sway
      const swayPeriod = isListening ? 3 : 6;
      const swayAmplitude = 0.15;
      const idleRotX = Math.sin((t * Math.PI * 2) / swayPeriod) * swayAmplitude;

      // ── Breathing (continuous, more intense when listening) ──
      const breathPeriod = isListening ? 1.8 : 4;
      const breathAmount = isListening ? 0.045 : 0.02;
      const breathScale = 1 + Math.sin((t * Math.PI * 2) / breathPeriod) * breathAmount;

      // ── Final rotation = idle + drag offset (additive) ──
      const rotationX = idleRotX + s.dragOffsetX;
      const rotationY = idleRotY + s.dragOffsetY;

      // ── Ripple aging ──
      if (s.ripple) {
        s.ripple.age += dt;
        if (s.ripple.age > 1.2) s.ripple = null; // expire after 1.2s
      }

      return {
        rotationX,
        rotationY,
        breathScale,
        time: t,
        ripple: s.ripple ? { ...s.ripple } : null,
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

  /** Trigger a touch ripple at a normalised sphere position */
  const triggerRipple = useCallback((nx: number, ny: number, nz: number) => {
    state.current.ripple = { x: nx, y: ny, z: nz, age: 0 };
  }, []);

  return { update, onPointerDown, onPointerMove, onPointerUp, triggerRipple };
}
