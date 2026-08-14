import { useCallback } from 'react';
import type { OrbParticle } from './useOrbGeometry';
import type { OrbTransform } from './useOrbPhysics';

interface TransformedPoint {
  sx: number;
  sy: number;
  z: number;
  size: number;
  index: number;
  // Original un-rotated position for ripple distance calc
  ox: number;
  oy: number;
  oz: number;
}

function rotatePoint(
  x: number,
  y: number,
  z: number,
  rx: number,
  ry: number
): [number, number, number] {
  // Rotate around Y axis
  const x1 = x * Math.cos(ry) - z * Math.sin(ry);
  const z1 = x * Math.sin(ry) + z * Math.cos(ry);
  // Rotate around X axis
  const y1 = y * Math.cos(rx) - z1 * Math.sin(rx);
  const z2 = y * Math.sin(rx) + z1 * Math.cos(rx);
  return [x1, y1, z2];
}

export function useOrbRenderer() {
  const render = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      particles: OrbParticle[],
      transform: OrbTransform,
      width: number,
      height: number
    ) => {
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      const baseRadius = Math.min(width, height) * 0.38;
      const sphereRadius = baseRadius * transform.breathScale;

      // Transform and project all particles
      const projected: TransformedPoint[] = [];
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const [rx, ry, rz] = rotatePoint(
          p.x, p.y, p.z,
          transform.rotationX,
          transform.rotationY
        );

        // ── Depth parallax on drag ──
        // Near-side points get a slight extra offset (makes drag feel dimensional)
        const depthParallax = 1 + rz * 0.06; // 0.94..1.06

        projected.push({
          sx: centerX + rx * sphereRadius * depthParallax,
          sy: centerY + ry * sphereRadius * depthParallax,
          z: rz,
          size: p.size,
          index: i,
          ox: p.x,
          oy: p.y,
          oz: p.z,
        });
      }

      // Sort back-to-front (painter's order)
      projected.sort((a, b) => a.z - b.z);

      // ── Pre-compute ripple state ──
      const ripple = transform.ripple;
      const rippleActive = ripple !== null;
      // Ripple wavefront: expands from 0 to ~2 (full sphere diameter) over its lifetime
      const rippleWavefront = ripple ? ripple.age * 3.5 : 0;
      const rippleWidth = 0.6; // width of the bright band

      // Draw each dot
      for (const pt of projected) {
        // ── Depth-based base values ──
        const depthFactor = (pt.z + 1) / 2; // 0..1
        let alpha = 0.3 + depthFactor * 0.65; // 0.3..0.95
        let sizeScale = 0.4 + depthFactor * 0.6; // 0.4..1.0

        // ── Per-point micro-shimmer ──
        // Each point oscillates brightness independently, phase-offset by index
        const shimmerFreq = 2.5 + (pt.index % 7) * 0.3; // vary frequency per point
        const shimmerPhase = pt.index * 1.618; // golden-ratio phase offset
        const shimmer = Math.sin(transform.time * shimmerFreq + shimmerPhase);
        alpha += shimmer * 0.12; // ±0.12 brightness oscillation

        // ── Touch ripple ──
        if (rippleActive && ripple) {
          // Distance on the unit sphere from ripple origin to this point
          const dx = pt.ox - ripple.x;
          const dy = pt.oy - ripple.y;
          const dz = pt.oz - ripple.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          // How close is this point to the current wavefront?
          const distFromWavefront = Math.abs(dist - rippleWavefront);
          if (distFromWavefront < rippleWidth) {
            const rippleIntensity = 1 - distFromWavefront / rippleWidth;
            const rippleFade = 1 - Math.min(ripple.age / 1.2, 1); // fade out over lifetime
            const rippleBoost = rippleIntensity * rippleFade;
            alpha += rippleBoost * 0.4;
            sizeScale += rippleBoost * 0.35;
          }
        }

        // Clamp alpha
        alpha = Math.max(0.1, Math.min(1, alpha));

        const dotRadius = pt.size * sizeScale;

        ctx.beginPath();
        ctx.arc(pt.sx, pt.sy, dotRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(93, 202, 165, ${alpha.toFixed(3)})`;
        ctx.fill();
      }
    },
    []
  );

  return { render };
}
