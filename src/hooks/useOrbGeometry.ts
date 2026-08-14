import { useMemo } from 'react';

export interface OrbParticle {
  x: number;
  y: number;
  z: number;
  size: number;
  tier: 'small' | 'medium' | 'large';
}

const GOLDEN_ANGLE = 2.399963229728653;

export function useOrbGeometry(count: number = 600): OrbParticle[] {
  return useMemo(() => {
    const particles: OrbParticle[] = [];
    for (let i = 0; i < count; i++) {
      const y = 1 - (i / (count - 1)) * 2;
      const radiusAtY = Math.sqrt(1 - y * y);
      const phi = i * GOLDEN_ANGLE;
      const x = Math.cos(phi) * radiusAtY;
      const z = Math.sin(phi) * radiusAtY;

      const roll = Math.random();
      let tier: 'small' | 'medium' | 'large';
      let size: number;
      if (roll < 0.70) {
        tier = 'small';
        size = 1.5;
      } else if (roll < 0.92) {
        tier = 'medium';
        size = 2.5;
      } else {
        tier = 'large';
        size = 4;
      }

      particles.push({ x, y, z, size, tier });
    }
    return particles;
  }, [count]);
}
