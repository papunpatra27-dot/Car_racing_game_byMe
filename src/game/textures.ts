import * as THREE from 'three';
import type { DashStyle } from './types';

export function createRoadTexture(
  lanes: 3 | 4,
  twoWay: boolean,
  asphaltColor: string,
  centerLineColor: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const width = 512;
  const height = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  // Base asphalt
  ctx.fillStyle = asphaltColor;
  ctx.fillRect(0, 0, width, height);

  // Subtle asphalt aggregate noise + tire wear tracks
  for (let i = 0; i < 6500; i++) {
    const x = Math.random() * width;
    const y = Math.random() * height;
    const v = Math.random() > 0.5 ? 255 : 0;
    ctx.fillStyle = `rgba(${v},${v},${v},${0.025 + Math.random() * 0.035})`;
    ctx.fillRect(x, y, 2, 2);
  }

  const laneWidth = width / lanes;
  // Subtle dark tire wear paths down each lane
  for (let l = 0; l < lanes; l++) {
    const cx = (l + 0.5) * laneWidth;
    ctx.fillStyle = 'rgba(0,0,0,0.08)';
    ctx.fillRect(cx - laneWidth * 0.24, 0, laneWidth * 0.14, height);
    ctx.fillRect(cx + laneWidth * 0.1, 0, laneWidth * 0.14, height);
  }

  // Outer edge solid lines
  ctx.fillStyle = 'rgba(248,250,252,0.85)';
  ctx.fillRect(10, 0, 8, height);
  ctx.fillRect(width - 18, 0, 8, height);

  // Inner lane dividers
  for (let i = 1; i < lanes; i++) {
    const x = i * laneWidth;
    const isCenterDivider =
      (lanes === 4 && i === 2) || (lanes === 3 && i === 1 && twoWay);

    if (isCenterDivider && twoWay) {
      // Double solid center line like Screenshot 1 & 2
      ctx.fillStyle = centerLineColor;
      ctx.fillRect(x - 8, 0, 5, height);
      ctx.fillRect(x + 3, 0, 5, height);
    } else if (isCenterDivider && !twoWay) {
      // Double dashed or bright dashed
      ctx.fillStyle = 'rgba(248,250,252,0.88)';
      for (let y = 0; y < height; y += 128) {
        ctx.fillRect(x - 4, y + 14, 8, 66);
      }
    } else {
      ctx.fillStyle = 'rgba(248,250,252,0.78)';
      for (let y = 0; y < height; y += 128) {
        ctx.fillRect(x - 3, y + 16, 6, 62);
      }
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 24);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createCheckeredTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const size = 32;
  for (let y = 0; y < canvas.height; y += size) {
    for (let x = 0; x < canvas.width; x += size) {
      const even = ((x / size) + (y / size)) % 2 === 0;
      ctx.fillStyle = even ? '#f8fafc' : '#111827';
      ctx.fillRect(x, y, size, size);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export class DashboardRenderer {
  readonly canvas: HTMLCanvasElement;
  readonly texture: THREE.CanvasTexture;
  private ctx: CanvasRenderingContext2D;
  private lastDrawTime = 0;

  constructor(maxAnisotropy: number) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 1024;
    this.canvas.height = 320;
    this.ctx = this.canvas.getContext('2d')!;
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.anisotropy = maxAnisotropy;
    this.draw(0, 900, 1, 100, 260, 'classic', '#38bdf8', true);
  }

  draw(
    speedKmh: number,
    rpm: number,
    gear: number,
    fuelPct: number,
    maxSpeed: number,
    style: DashStyle,
    accentHex: string,
    force = false
  ): void {
    const now = performance.now();
    if (!force && now - this.lastDrawTime < 30) return;
    this.lastDrawTime = now;

    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.fillStyle = '#0c0e13';
    ctx.fillRect(0, 0, w, h);

    // Subtle cluster framing
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 4;
    ctx.strokeRect(8, 8, w - 16, h - 16);

    const drawGauge = (
      cx: number,
      cy: number,
      r: number,
      valueNorm: number,
      maxLabel: number,
      step: number,
      label: string,
      redlineFrom?: number
    ) => {
      // Dial face
      const grad = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
      grad.addColorStop(0, '#181c26');
      grad.addColorStop(1, '#090b10');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      // Chrome/bezel ring
      ctx.strokeStyle = style === 'classic' ? '#64748b' : accentHex;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      const startAng = Math.PI * 0.75;
      const endAng = Math.PI * 2.25;
      const span = endAng - startAng;

      // Redline arc if tachometer
      if (redlineFrom !== undefined) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.arc(
          cx,
          cy,
          r - 14,
          startAng + span * redlineFrom,
          endAng
        );
        ctx.stroke();
      }

      // Tick marks & numbers
      const totalTicks = Math.round(maxLabel / step);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '700 18px "JetBrains Mono", monospace';
      for (let i = 0; i <= totalTicks * 2; i++) {
        const t = i / (totalTicks * 2);
        const ang = startAng + t * span;
        const isMajor = i % 2 === 0;
        const inner = r - (isMajor ? 22 : 13);
        const outer = r - 6;
        ctx.strokeStyle =
          redlineFrom !== undefined && t >= redlineFrom ? '#ef4444' : '#e2e8f0';
        ctx.lineWidth = isMajor ? 3 : 1.5;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(ang) * inner, cy + Math.sin(ang) * inner);
        ctx.lineTo(cx + Math.cos(ang) * outer, cy + Math.sin(ang) * outer);
        ctx.stroke();

        if (isMajor) {
          const val = Math.round((i / 2) * step);
          const tx = cx + Math.cos(ang) * (r - 38);
          const ty = cy + Math.sin(ang) * (r - 38);
          ctx.fillStyle = '#e2e8f0';
          ctx.fillText(String(val), tx, ty);
        }
      }

      ctx.fillStyle = '#94a3b8';
      ctx.font = '600 15px "Chakra Petch", sans-serif';
      ctx.fillText(label, cx, cy + r * 0.45);

      // Needle
      const clamped = Math.max(0, Math.min(1, valueNorm));
      const needleAng = startAng + clamped * span;
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(cx - Math.cos(needleAng) * 16, cy - Math.sin(needleAng) * 16);
      ctx.lineTo(
        cx + Math.cos(needleAng) * (r - 18),
        cy + Math.sin(needleAng) * (r - 18)
      );
      ctx.stroke();

      // Center cap
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(cx, cy, 11, 0, Math.PI * 2);
      ctx.fill();
    };

    const dialMaxSpeed = maxSpeed > 260 ? 360 : 280;
    const speedStep = maxSpeed > 260 ? 40 : 40;
    drawGauge(
      235,
      160,
      132,
      speedKmh / dialMaxSpeed,
      dialMaxSpeed,
      speedStep,
      'KM/H'
    );

    // Center MFD (Gear + Digital Speed + Fuel bar)
    ctx.fillStyle = '#12161f';
    ctx.fillRect(405, 42, 214, 236);
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 2;
    ctx.strokeRect(405, 42, 214, 236);

    ctx.textAlign = 'center';
    ctx.fillStyle = accentHex;
    ctx.font = '700 44px "Chakra Petch", sans-serif';
    ctx.fillText(`G${gear}`, 512, 92);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 54px "JetBrains Mono", monospace';
    ctx.fillText(`${Math.round(speedKmh)}`, 512, 158);
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 15px "Chakra Petch", sans-serif';
    ctx.fillText('KM/H', 512, 192);

    // Fuel gauge bar inside cluster
    const fuelW = 166;
    const fuelX = 512 - fuelW / 2;
    const fuelY = 232;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(fuelX, fuelY, fuelW, 18);
    const fuelRatio = Math.max(0, Math.min(1, fuelPct / 100));
    ctx.fillStyle =
      fuelPct < 20 ? '#ef4444' : fuelPct < 40 ? '#f59e0b' : '#22c55e';
    ctx.fillRect(fuelX, fuelY, fuelW * fuelRatio, 18);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 13px "JetBrains Mono", monospace';
    ctx.fillText(`FUEL ${Math.round(fuelPct)}%`, 512, 222);

    // Right RPM Tachometer
    drawGauge(789, 160, 132, rpm / 8000, 8, 1, 'x1000 RPM', 0.82);

    this.texture.needsUpdate = true;
  }

  dispose(): void {
    this.texture.dispose();
  }
}
