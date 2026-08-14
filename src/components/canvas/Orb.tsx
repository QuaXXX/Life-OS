import { useRef, useEffect, useCallback } from 'react';
import { useOrbGeometry } from '../../hooks/useOrbGeometry';
import { useOrbPhysics } from '../../hooks/useOrbPhysics';
import { useOrbRenderer } from '../../hooks/useOrbRenderer';
import type { OrbState } from '../../services/voice/types';

interface OrbProps {
  state: OrbState;
  onHoldStart?: () => void;
  onHoldEnd?: () => void;
}

export function Orb({ state, onHoldStart, onHoldEnd }: OrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const isHoldingRef = useRef(false);
  const hasDraggedRef = useRef(false);
  const pointerStartRef = useRef({ x: 0, y: 0 });
  const pulseRef = useRef(0);

  const particles = useOrbGeometry(600);
  const physics = useOrbPhysics(state);
  const { render } = useOrbRenderer();

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const animate = (time: number) => {
      const delta = lastTimeRef.current
        ? (time - lastTimeRef.current) / 1000
        : 0.016;
      lastTimeRef.current = time;

      const transform = physics.update(delta);

      // Apply one-off release pulse decay
      if (pulseRef.current > 0) {
        pulseRef.current *= 0.90;
        if (pulseRef.current < 0.005) pulseRef.current = 0;
        transform.breathScale += pulseRef.current * 0.1;
      }

      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        render(ctx, particles, transform, rect.width, rect.height);
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [particles, physics, render]);

  // ── Pointer handlers ──
  // pointerDown immediately enters listening and activates drag tracking.
  // Movement updates rotation while keeping listening active until pointer release.
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.setPointerCapture(e.pointerId);

      pointerStartRef.current = { x: e.clientX, y: e.clientY };
      hasDraggedRef.current = false;

      // Immediately enter listening — no delay
      isHoldingRef.current = true;
      onHoldStart?.();

      physics.onPointerDown(e.clientX, e.clientY);

      // Trigger a ripple at the touch point (approximate sphere hit)
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        // Convert screen coords to normalised sphere coords
        const nx = (e.clientX - rect.left - rect.width / 2) / (rect.width * 0.38);
        const ny = (e.clientY - rect.top - rect.height / 2) / (rect.height * 0.38);
        const lenSq = nx * nx + ny * ny;
        const nz = lenSq < 1 ? Math.sqrt(1 - lenSq) : 0;
        physics.triggerRipple(nx, ny, nz);
      }
    },
    [physics, onHoldStart]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      physics.onPointerMove(e.clientX, e.clientY);
    },
    [physics]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      const canvas = canvasRef.current;
      if (canvas && canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId);
      }
      physics.onPointerUp();

      if (isHoldingRef.current) {
        // Fire release pulse and end listening
        pulseRef.current = 1;
        onHoldEnd?.();
        isHoldingRef.current = false;
      }
    },
    [physics, onHoldEnd]
  );

  return (
    <canvas
      ref={canvasRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    />
  );
}
