import * as THREE from 'three';
import type { BiomeId, CarSpec } from './types';

export interface CockpitRig {
  root: THREE.Group;
  interiorGroup: THREE.Group;
  hoodGroup: THREE.Group;
  chaseOnlyGroup: THREE.Group;
  steeringWheelGroup: THREE.Group;
  hoodMesh: THREE.Mesh;
  leftMirrorHousing: THREE.Mesh;
  dashMesh: THREE.Mesh;
  wheelMeshes: THREE.Mesh[];
  frontWheelPivots: THREE.Group[];
  brakeLights: THREE.Mesh[];
  boostFlames: THREE.Mesh[];
  dispose: () => void;
}

interface ExteriorDimensions {
  width: number;
  height: number;
  length: number;
  wheelRadius: number;
  rimColor: number;
  mirrorColor: 'body' | 'chrome' | 'carbon';
  cabinLengthRatio: number;
  cabinCenterZRatio: number;
  hoodLengthRatio: number;
  rearDeckRatio: number;
  wingStyle: 'none' | 'loop' | 'swan_black' | 'swan_gold';
  hasCowlBulge: boolean;
  hasSideScoops: boolean;
  hasGlassEngineDeck: boolean;
  hasGoldAero: boolean;
  hasChromeBumpers: boolean;
  hasBlackRockerStripe: boolean;
  hasSharkFin: boolean;
  hasRoofScoop: boolean;
  taillightStyle: 'rect' | 'bar' | 'quad_round';
}

const EXTERIOR_SPECS: Record<string, ExteriorDimensions> = {
  compact_blue: {
    width: 1.66,
    height: 1.3,
    length: 3.94,
    wheelRadius: 0.305,
    rimColor: 0xd8dee9,
    mirrorColor: 'body',
    cabinLengthRatio: 0.43,
    cabinCenterZRatio: 0.04,
    hoodLengthRatio: 0.34,
    rearDeckRatio: 0.22,
    wingStyle: 'loop',
    hasCowlBulge: false,
    hasSideScoops: false,
    hasGlassEngineDeck: false,
    hasGoldAero: false,
    hasChromeBumpers: false,
    hasBlackRockerStripe: false,
    hasSharkFin: false,
    hasRoofScoop: false,
    taillightStyle: 'rect',
  },
  sedan_red: {
    width: 1.82,
    height: 1.42,
    length: 4.44,
    wheelRadius: 0.33,
    rimColor: 0xe2e8f0,
    mirrorColor: 'body',
    cabinLengthRatio: 0.48,
    cabinCenterZRatio: 0.02,
    hoodLengthRatio: 0.32,
    rearDeckRatio: 0.2,
    wingStyle: 'none',
    hasCowlBulge: false,
    hasSideScoops: false,
    hasGlassEngineDeck: false,
    hasGoldAero: false,
    hasChromeBumpers: false,
    hasBlackRockerStripe: false,
    hasSharkFin: true,
    hasRoofScoop: false,
    taillightStyle: 'rect',
  },
  muscle_green: {
    width: 1.9,
    height: 1.36,
    length: 4.56,
    wheelRadius: 0.34,
    rimColor: 0xf1f5f9,
    mirrorColor: 'chrome',
    cabinLengthRatio: 0.38,
    cabinCenterZRatio: 0.05,
    hoodLengthRatio: 0.38,
    rearDeckRatio: 0.24,
    wingStyle: 'none',
    hasCowlBulge: true,
    hasSideScoops: false,
    hasGlassEngineDeck: false,
    hasGoldAero: false,
    hasChromeBumpers: true,
    hasBlackRockerStripe: true,
    hasSharkFin: false,
    hasRoofScoop: false,
    taillightStyle: 'rect',
  },
  super_red: {
    width: 1.96,
    height: 1.12,
    length: 4.18,
    wheelRadius: 0.33,
    rimColor: 0x52525b,
    mirrorColor: 'body',
    cabinLengthRatio: 0.42,
    cabinCenterZRatio: -0.06,
    hoodLengthRatio: 0.31,
    rearDeckRatio: 0.27,
    wingStyle: 'none',
    hasCowlBulge: false,
    hasSideScoops: true,
    hasGlassEngineDeck: true,
    hasGoldAero: false,
    hasChromeBumpers: false,
    hasBlackRockerStripe: false,
    hasSharkFin: false,
    hasRoofScoop: false,
    taillightStyle: 'quad_round',
  },
  gt_yellow: {
    width: 1.88,
    height: 1.2,
    length: 4.08,
    wheelRadius: 0.33,
    rimColor: 0x71717a,
    mirrorColor: 'carbon',
    cabinLengthRatio: 0.44,
    cabinCenterZRatio: 0.01,
    hoodLengthRatio: 0.32,
    rearDeckRatio: 0.23,
    wingStyle: 'swan_black',
    hasCowlBulge: false,
    hasSideScoops: true,
    hasGlassEngineDeck: false,
    hasGoldAero: false,
    hasChromeBumpers: false,
    hasBlackRockerStripe: false,
    hasSharkFin: false,
    hasRoofScoop: false,
    taillightStyle: 'bar',
  },
  hyper_obsidian: {
    width: 2.06,
    height: 1.04,
    length: 4.48,
    wheelRadius: 0.34,
    rimColor: 0x27272a,
    mirrorColor: 'carbon',
    cabinLengthRatio: 0.41,
    cabinCenterZRatio: -0.04,
    hoodLengthRatio: 0.31,
    rearDeckRatio: 0.28,
    wingStyle: 'swan_gold',
    hasCowlBulge: false,
    hasSideScoops: true,
    hasGlassEngineDeck: true,
    hasGoldAero: true,
    hasChromeBumpers: false,
    hasBlackRockerStripe: false,
    hasSharkFin: false,
    hasRoofScoop: true,
    taillightStyle: 'bar',
  },
};

export function buildCockpit(
  car: CarSpec,
  dashTexture: THREE.Texture
): CockpitRig {
  const root = new THREE.Group();
  const interiorGroup = new THREE.Group();
  const hoodGroup = new THREE.Group();
  const chaseOnlyGroup = new THREE.Group();
  root.add(interiorGroup);
  root.add(hoodGroup);
  root.add(chaseOnlyGroup);

  const ext = EXTERIOR_SPECS[car.id] ?? EXTERIOR_SPECS.compact_blue;

  const bodyPaintMat = new THREE.MeshPhysicalMaterial({
    color: car.bodyColor,
    metalness: car.id === 'hyper_obsidian' ? 0.28 : 0.34,
    roughness: car.id === 'hyper_obsidian' ? 0.42 : 0.18,
    clearcoat: car.id === 'hyper_obsidian' ? 0.28 : 1.0,
    clearcoatRoughness: 0.06,
    envMapIntensity: 1.35,
  });

  const dashMat = new THREE.MeshStandardMaterial({
    color: car.dashColor,
    roughness: 0.82,
    metalness: 0.08,
  });

  const trimMat = new THREE.MeshStandardMaterial({
    color: car.interiorColor,
    roughness: 0.72,
    metalness: 0.14,
  });

  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0x9aa3b2,
    roughness: 0.16,
    metalness: 0.94,
    envMapIntensity: 1.15,
  });

  const mirrorGlassMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.06,
    metalness: 0.96,
  });

  const darkGlassMat = new THREE.MeshPhysicalMaterial({
    color: 0x070a10,
    roughness: 0.16,
    metalness: 0.3,
    clearcoat: 0.48,
    clearcoatRoughness: 0.14,
    envMapIntensity: 0.6,
  });

  const carbonMat = new THREE.MeshStandardMaterial({
    color: 0x181a20,
    roughness: 0.48,
    metalness: 0.25,
  });

  const goldAeroMat = new THREE.MeshPhysicalMaterial({
    color: 0xd4af37,
    metalness: 0.78,
    roughness: 0.24,
    clearcoat: 0.6,
  });

  const accentMat = new THREE.MeshStandardMaterial({
    color: car.accentColor,
    roughness: 0.32,
    metalness: 0.4,
  });

  const mirrorHousingMat =
    ext.mirrorColor === 'chrome'
      ? chromeMat
      : ext.mirrorColor === 'carbon'
        ? carbonMat
        : bodyPaintMat;

  // =========================================================================
  // PART A: DRIVER-VIEW HOOD GROUP (visible in cockpit, dash, hood views)
  // Scaled proportionally to chosen garage car while framed for driver FOV
  // =========================================================================
  const cabCenterX = 0.18;
  const cabHoodScaleW = THREE.MathUtils.clamp(ext.width / 1.82, 0.88, 1.12);
  const cabHoodScaleL = THREE.MathUtils.clamp(ext.length / 4.2, 0.9, 1.1);

  const hoodMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1.44 * cabHoodScaleW, 0.09, 1.56 * cabHoodScaleL),
    bodyPaintMat
  );
  hoodMesh.position.set(cabCenterX, -0.35, -1.48);
  hoodMesh.rotation.x = car.dashStyle === 'super' || car.dashStyle === 'hyper' ? 0.11 : 0.07;
  hoodMesh.castShadow = true;
  hoodGroup.add(hoodMesh);

  for (const side of [-1, 1]) {
    const fender = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.14, 1.58 * cabHoodScaleL),
      bodyPaintMat
    );
    fender.position.set(cabCenterX + side * 0.78 * cabHoodScaleW, -0.32, -1.46);
    fender.rotation.x = 0.06;
    fender.castShadow = true;
    hoodGroup.add(fender);
  }

  // Exact car-specific hood signature visible from cockpit!
  if (ext.hasCowlBulge) {
    // Emerald SS 454 raised cowl hood bulge
    const cowl = new THREE.Mesh(
      new THREE.BoxGeometry(0.62, 0.08, 1.24),
      bodyPaintMat
    );
    cowl.position.set(cabCenterX, -0.275, -1.36);
    cowl.rotation.x = 0.07;
    hoodGroup.add(cowl);
  } else if (ext.hasGoldAero) {
    // Obsidian Apex gold aero hood vents
    for (const side of [-1, 1]) {
      const ventTrim = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.025, 0.72),
        goldAeroMat
      );
      ventTrim.position.set(cabCenterX + side * 0.34, -0.305, -1.32);
      ventTrim.rotation.x = 0.11;
      hoodGroup.add(ventTrim);
    }
  } else if (car.id === 'gt_yellow') {
    // GT3 RS twin black NACA hood ducts
    for (const side of [-1, 1]) {
      const duct = new THREE.Mesh(
        new THREE.BoxGeometry(0.15, 0.02, 0.22),
        carbonMat
      );
      duct.position.set(cabCenterX + side * 0.24, -0.305, -1.45);
      duct.rotation.x = 0.08;
      hoodGroup.add(duct);
    }
  } else if (car.id === 'sedan_red') {
    // M-Line sculpted twin hood ribs
    for (const side of [-1, 1]) {
      const rib = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.022, 1.32),
        bodyPaintMat
      );
      rib.position.set(cabCenterX + side * 0.28, -0.295, -1.44);
      rib.rotation.x = 0.07;
      hoodGroup.add(rib);
    }
  }

  // =========================================================================
  // PART B: INTERIOR GROUP (dashboard, steering wheel + hands, pillars, mirrors)
  // =========================================================================
  const wiperMat = new THREE.MeshStandardMaterial({
    color: 0x111318,
    roughness: 0.65,
    metalness: 0.2,
  });
  const wiper1 = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.016, 0.024), wiperMat);
  wiper1.position.set(cabCenterX - 0.26, -0.25, -0.78);
  wiper1.rotation.z = 0.04;
  interiorGroup.add(wiper1);

  const wiper2 = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.016, 0.024), wiperMat);
  wiper2.position.set(cabCenterX + 0.36, -0.25, -0.78);
  wiper2.rotation.z = -0.02;
  interiorGroup.add(wiper2);

  const dashUpper = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.18, 0.56), dashMat);
  dashUpper.position.set(cabCenterX, -0.35, -0.55);
  interiorGroup.add(dashUpper);

  const dashLower = new THREE.Mesh(new THREE.BoxGeometry(1.88, 0.38, 0.42), trimMat);
  dashLower.position.set(cabCenterX, -0.6, -0.46);
  interiorGroup.add(dashLower);

  const binnacle = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.12, 0.22), dashMat);
  binnacle.position.set(0, -0.2, -0.48);
  interiorGroup.add(binnacle);

  const clusterMat = new THREE.MeshBasicMaterial({ map: dashTexture });
  const dashMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.52, 0.16), clusterMat);
  dashMesh.position.set(0, -0.245, -0.372);
  dashMesh.rotation.x = -0.12;
  interiorGroup.add(dashMesh);

  if (car.dashStyle !== 'classic' && car.dashStyle !== 'muscle') {
    const screenFrame = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.15, 0.04), darkGlassMat);
    screenFrame.position.set(cabCenterX + 0.26, -0.28, -0.4);
    screenFrame.rotation.y = -0.18;
    interiorGroup.add(screenFrame);

    const screenGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(0.34, 0.12),
      new THREE.MeshBasicMaterial({ color: car.accentColor })
    );
    screenGlow.position.set(cabCenterX + 0.26, -0.28, -0.378);
    screenGlow.rotation.y = -0.18;
    interiorGroup.add(screenGlow);
  }

  for (let i = 0; i < 2; i++) {
    const vent = new THREE.Mesh(
      new THREE.BoxGeometry(0.16, 0.06, 0.03),
      new THREE.MeshStandardMaterial({ color: 0x0f1116, roughness: 0.9 })
    );
    vent.position.set(cabCenterX + 0.2 + i * 0.22, -0.37, -0.27);
    interiorGroup.add(vent);
  }

  // A-Pillars + Roof Header + Interior Door Trim + Wing Mirrors
  const leftPillar = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.92, 0.1), trimMat);
  leftPillar.position.set(cabCenterX - 0.86, 0.14, -0.48);
  leftPillar.rotation.z = -0.26;
  leftPillar.rotation.x = 0.34;
  interiorGroup.add(leftPillar);

  const rightPillar = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.92, 0.1), trimMat);
  rightPillar.position.set(cabCenterX + 0.86, 0.14, -0.48);
  rightPillar.rotation.z = 0.26;
  rightPillar.rotation.x = 0.34;
  interiorGroup.add(rightPillar);

  const roofBar = new THREE.Mesh(new THREE.BoxGeometry(1.78, 0.08, 0.24), bodyPaintMat);
  roofBar.position.set(cabCenterX, 0.52, -0.22);
  interiorGroup.add(roofBar);

  for (const side of [-1, 1]) {
    const doorSill = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.38, 1.5), bodyPaintMat);
    doorSill.position.set(cabCenterX + side * 0.9, -0.48, -0.15);
    interiorGroup.add(doorSill);
  }

  // Left & Right Wing Mirrors (matched to each car: chrome for muscle, carbon for GT3/Hyper, painted for Coupe/Sedan/Super)
  const mirrorArmL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.045, 0.065), darkGlassMat);
  mirrorArmL.position.set(cabCenterX - 0.95, -0.25, -0.64);
  interiorGroup.add(mirrorArmL);

  const leftMirrorHousing = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.13, 0.1),
    mirrorHousingMat
  );
  leftMirrorHousing.position.set(cabCenterX - 1.07, -0.23, -0.66);
  leftMirrorHousing.rotation.y = 0.22;
  interiorGroup.add(leftMirrorHousing);

  const leftMirrorFace = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.1), mirrorGlassMat);
  leftMirrorFace.position.set(cabCenterX - 1.07, -0.23, -0.606);
  leftMirrorFace.rotation.y = 0.22;
  interiorGroup.add(leftMirrorFace);

  const mirrorArmR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.045, 0.065), darkGlassMat);
  mirrorArmR.position.set(cabCenterX + 0.95, -0.25, -0.64);
  interiorGroup.add(mirrorArmR);

  const rightMirrorHousing = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.13, 0.1),
    mirrorHousingMat
  );
  rightMirrorHousing.position.set(cabCenterX + 1.07, -0.23, -0.66);
  rightMirrorHousing.rotation.y = -0.22;
  interiorGroup.add(rightMirrorHousing);

  const rightMirrorFace = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 0.1), mirrorGlassMat);
  rightMirrorFace.position.set(cabCenterX + 1.07, -0.23, -0.606);
  rightMirrorFace.rotation.y = -0.22;
  interiorGroup.add(rightMirrorFace);

  // Rearview Mirror
  const rearStalk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.11, 8),
    darkGlassMat
  );
  rearStalk.position.set(cabCenterX + 0.12, 0.45, -0.35);
  interiorGroup.add(rearStalk);

  const rearFrame = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.036), darkGlassMat);
  rearFrame.position.set(cabCenterX + 0.12, 0.37, -0.35);
  rearFrame.rotation.y = -0.1;
  interiorGroup.add(rearFrame);

  const rearGlass = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 0.065), mirrorGlassMat);
  rearGlass.position.set(cabCenterX + 0.12, 0.37, -0.33);
  rearGlass.rotation.y = -0.1;
  interiorGroup.add(rearGlass);

  // Compact Realistic Steering Wheel + Driver Hands & Forearms
  const steeringWheelGroup = new THREE.Group();
  steeringWheelGroup.position.set(0, -0.31, -0.31);
  steeringWheelGroup.rotation.x = -0.22;

  const wheelLeatherMat = new THREE.MeshStandardMaterial({
    color: 0x191b20,
    roughness: 0.62,
    metalness: 0.15,
  });

  const wheelRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.145, 0.018, 12, 32),
    wheelLeatherMat
  );
  steeringWheelGroup.add(wheelRim);

  const topMarker = new THREE.Mesh(
    new THREE.TorusGeometry(0.145, 0.0195, 8, 8, 0.22),
    accentMat
  );
  topMarker.rotation.z = Math.PI / 2 - 0.11;
  steeringWheelGroup.add(topMarker);

  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.052, 0.056, 0.04, 18),
    wheelLeatherMat
  );
  hub.rotation.x = Math.PI / 2;
  steeringWheelGroup.add(hub);

  const emblem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.02, 0.02, 0.043, 14),
    chromeMat
  );
  emblem.rotation.x = Math.PI / 2;
  steeringWheelGroup.add(emblem);

  const spokeMat = car.dashStyle === 'classic' ? wheelLeatherMat : chromeMat;
  const spokeL = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.028, 0.015), spokeMat);
  spokeL.position.set(-0.075, -0.012, 0);
  spokeL.rotation.z = 0.12;
  steeringWheelGroup.add(spokeL);

  const spokeR = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.028, 0.015), spokeMat);
  spokeR.position.set(0.075, -0.012, 0);
  spokeR.rotation.z = -0.12;
  steeringWheelGroup.add(spokeR);

  const spokeB = new THREE.Mesh(new THREE.BoxGeometry(0.034, 0.105, 0.015), spokeMat);
  spokeB.position.set(0, -0.082, 0);
  steeringWheelGroup.add(spokeB);

  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xc58c63,
    roughness: 0.68,
    metalness: 0.04,
  });
  const sleeveMat = new THREE.MeshStandardMaterial({
    color: 0x1e2430,
    roughness: 0.85,
  });

  const buildHand = (side: -1 | 1) => {
    const handGroup = new THREE.Group();
    handGroup.position.set(side * 0.145, -0.008, 0.012);

    const palm = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.036, 6, 10), skinMat);
    palm.rotation.z = side * 0.2;
    handGroup.add(palm);

    const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.011, 0.024, 4, 8), skinMat);
    thumb.position.set(-side * 0.017, 0.02, 0.014);
    thumb.rotation.z = side * 0.65;
    handGroup.add(thumb);

    const forearm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.036, 0.24, 12),
      skinMat
    );
    forearm.position.set(side * 0.06, -0.1, 0.095);
    forearm.rotation.x = 0.72;
    forearm.rotation.z = side * 0.45;
    handGroup.add(forearm);

    const sleeve = new THREE.Mesh(
      new THREE.CylinderGeometry(0.038, 0.044, 0.13, 12),
      sleeveMat
    );
    sleeve.position.set(side * 0.105, -0.17, 0.165);
    sleeve.rotation.x = 0.72;
    sleeve.rotation.z = side * 0.45;
    handGroup.add(sleeve);

    return handGroup;
  };

  steeringWheelGroup.add(buildHand(-1));
  steeringWheelGroup.add(buildHand(1));
  interiorGroup.add(steeringWheelGroup);

  // =========================================================================
  // PART C: LOFTED 3D EXTERIOR CAR (Exact silhouette, curves & trim per Garage Car)
  // Centered at x = 0, wheels sit cleanly on road y = -1.18 (world y = 0)
  // =========================================================================
  type Vec3 = [number, number, number];

  const buildLoftedShell = (
    rings: Vec3[][],
    capEnds = true
  ): THREE.BufferGeometry => {
    const N = rings.length;
    const M = rings[0].length;
    const positions: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i < N; i++) {
      for (let p = 0; p < M; p++) {
        positions.push(rings[i][p][0], rings[i][p][1], rings[i][p][2]);
      }
    }

    for (let i = 0; i < N - 1; i++) {
      const rowA = i * M;
      const rowB = (i + 1) * M;
      for (let p = 0; p < M; p++) {
        const pNext = (p + 1) % M;
        const a = rowA + p;
        const b = rowA + pNext;
        const c = rowB + p;
        const d = rowB + pNext;
        indices.push(a, b, d, a, d, c);
      }
    }

    if (capEnds && N >= 2) {
      const addCap = (ring: Vec3[], flip: boolean) => {
        let cx = 0;
        let cy = 0;
        let cz = 0;
        for (let p = 0; p < M; p++) {
          cx += ring[p][0];
          cy += ring[p][1];
          cz += ring[p][2];
        }
        const cIdx = positions.length / 3;
        positions.push(cx / M, cy / M, cz / M);
        const start = positions.length / 3;
        for (let p = 0; p < M; p++) {
          positions.push(ring[p][0], ring[p][1], ring[p][2]);
        }
        for (let p = 0; p < M; p++) {
          const pNext = (p + 1) % M;
          if (flip) {
            indices.push(cIdx, start + pNext, start + p);
          } else {
            indices.push(cIdx, start + p, start + pNext);
          }
        }
      };
      addCap(rings[0], true);
      addCap(rings[N - 1], false);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3)
    );
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  };

  const roadGroundY = -1.18;
  const extScale = 0.78;
  const W = ext.width * extScale;
  const halfW = W * 0.5;
  const H = ext.height * 0.72;
  const L = ext.length * extScale;
  const halfL = L * 0.5;
  const wr = ext.wheelRadius * extScale;
  const groundClearance =
    car.id === 'hyper_obsidian'
      ? wr * 0.32
      : car.id === 'super_red' || car.id === 'gt_yellow'
        ? wr * 0.36
        : wr * 0.42;
  const sillY = roadGroundY + groundClearance;
  const wheelCY = roadGroundY + wr;
  const archR = wr + 0.044;
  const frontAxleZ = -L * 0.315;
  const rearAxleZ = L * 0.315;
  const tireWidth = wr * 0.72;
  const trackHalfW = halfW - tireWidth * 0.46;
  const wellInnerW = Math.max(0.2, trackHalfW - tireWidth * 0.62);

  const isLowExotic =
    car.id === 'super_red' || car.id === 'hyper_obsidian' || car.id === 'gt_yellow';
  const beltHeight = H * (car.id === 'hyper_obsidian' ? 0.52 : isLowExotic ? 0.49 : 0.47);
  const shoulderY = sillY + beltHeight;
  const roofTopY = roadGroundY + H;
  const cabinW = W * (car.id === 'hyper_obsidian' ? 0.62 : isLowExotic ? 0.66 : 0.71);

  const cowlZ = -halfL + L * ext.hoodLengthRatio;
  const trunkStartZ = halfL - L * ext.rearDeckRatio;
  const noseFrontY =
    sillY +
    beltHeight *
      (car.id === 'hyper_obsidian'
        ? 0.34
        : car.id === 'super_red'
          ? 0.38
          : car.id === 'gt_yellow'
            ? 0.44
            : car.id === 'compact_blue'
              ? 0.56
              : 0.68);
  const rearHaunchKick =
    car.id === 'muscle_green' || car.id === 'super_red' || car.id === 'gt_yellow' || car.id === 'hyper_obsidian'
      ? 0.055
      : 0.022;

  // Generate sorted Z stations with dense curved samples across nose, wheel arches, waist, and tail
  const archSpanZ = archR * 0.99;
  const zSet = new Set<number>();
  const addRange = (z0: number, z1: number, steps: number) => {
    for (let k = 0; k <= steps; k++) {
      zSet.add(Number(THREE.MathUtils.lerp(z0, z1, k / steps).toFixed(4)));
    }
  };
  addRange(-halfL, frontAxleZ - archSpanZ, 6);
  addRange(frontAxleZ - archSpanZ, frontAxleZ + archSpanZ, 9);
  addRange(frontAxleZ + archSpanZ, rearAxleZ - archSpanZ, 8);
  addRange(rearAxleZ - archSpanZ, rearAxleZ + archSpanZ, 9);
  addRange(rearAxleZ + archSpanZ, halfL, 6);
  const zStations = Array.from(zSet).sort((a, b) => a - b);

  const sampleWheelArch = (z: number) => {
    let bestT = 0;
    for (const axZ of [frontAxleZ, rearAxleZ]) {
      const dz = Math.abs(z - axZ);
      if (dz < archSpanZ) {
        const t = Math.sqrt(Math.max(0, 1 - (dz / archSpanZ) * (dz / archSpanZ)));
        if (t > bestT) bestT = t;
      }
    }
    return bestT;
  };

  // 1. Sculpted 3D Lofted Main Body Shell
  const bodyRings: Vec3[][] = [];
  for (const z of zStations) {
    const u = (z + halfL) / L; // 0 nose -> 1 tail

    // Plan-view horizontal taper + sculpted door waist + muscular modern rear haunches
    let wFactor = 1.0;
    if (u < 0.16) {
      const t = u / 0.16;
      const tipW = isLowExotic ? 0.62 : car.id === 'compact_blue' ? 0.72 : 0.78;
      wFactor = tipW + (1.0 - tipW) * Math.sin((t * Math.PI) / 2);
    } else if (u > 0.85) {
      const t = (1.0 - u) / 0.15;
      const tailTipW = isLowExotic ? 0.78 : 0.82;
      wFactor = tailTipW + (1.0 - tailTipW) * Math.sin((t * Math.PI) / 2);
    }

    if (u > 0.28 && u < 0.66) {
      // Sculpted side waist crease for modern hourglass silhouette
      const waistT = Math.sin(((u - 0.28) / 0.38) * Math.PI);
      wFactor *= 1.0 - (isLowExotic ? 0.08 : 0.045) * waistT;
    }
    if (u > 0.58 && u < 0.91) {
      // Wide modern muscular rear quarter haunches
      const flareT = Math.sin(((u - 0.58) / 0.33) * Math.PI);
      const flareAmt = isLowExotic ? 0.08 : 0.055;
      wFactor *= 1.0 + flareAmt * flareT;
    }

    // Longitudinal deck height profile (sloped hood -> shoulder -> haunch kick -> fastback tail)
    let yDeckTop = shoulderY;
    if (z <= cowlZ) {
      const ht = THREE.MathUtils.clamp((z - -halfL) / Math.max(0.18, cowlZ - -halfL), 0, 1);
      const curve = Math.pow(ht, isLowExotic ? 0.62 : 0.72);
      yDeckTop = THREE.MathUtils.lerp(noseFrontY, shoulderY, curve);
    } else if (z <= trunkStartZ) {
      const dt = (z - cowlZ) / Math.max(0.18, trunkStartZ - cowlZ);
      const exoticDip = isLowExotic ? -0.03 * Math.sin(dt * Math.PI) : 0;
      const rearLift = rearHaunchKick * Math.pow(dt, 1.7);
      yDeckTop = shoulderY + exoticDip + rearLift;
    } else {
      const rt = (z - trunkStartZ) / Math.max(0.18, halfL - trunkStartZ);
      const duckUp = car.id === 'super_red' || car.id === 'compact_blue' ? 0.042 * rt * rt : -0.032 * rt;
      yDeckTop = shoulderY + rearHaunchKick * (1.0 - 0.28 * rt) + duckUp;
    }

    // Centerline crown height (rounded hood & deck camber)
    const noseDropCrown = z < cowlZ ? 0.026 : 0.018;
    const yCrown = yDeckTop + noseDropCrown;

    // Aggressive modern rear diffuser upsweep
    const rearDiffLift = u > 0.86 ? ((u - 0.86) / 0.14) * 0.085 : 0;
    const frontSplitLift = u < 0.05 ? ((0.05 - u) / 0.05) * 0.03 : 0;
    const yFloor = sillY + rearDiffLift + frontSplitLift;

    const wCur = halfW * wFactor;
    let wFloor = wCur * 0.84;
    let yOuterSill = yFloor + 0.015;
    let wLower = wCur * 0.96;
    let yLower = THREE.MathUtils.lerp(yOuterSill, yDeckTop, 0.28);
    let wMid = wCur * 1.0;
    let yMid = THREE.MathUtils.lerp(yOuterSill, yDeckTop, 0.6);
    let wShoulder = wCur * 0.93;
    let yShoulder = yDeckTop - 0.024;
    const wDeck = wCur * 0.66;

    // Dent-free wheel-well cutout: only lower points behind the tire tuck inward;
    // mid/upper fender flares cleanly outward over the top of the wheel arch
    const archT = sampleWheelArch(z);
    if (archT > 0.02) {
      const wellBlend = THREE.MathUtils.smoothstep(archT, 0.02, 0.22);
      const archCeilingY = wheelCY + archR * (0.12 + 0.88 * archT);
      wFloor = THREE.MathUtils.lerp(wFloor, wellInnerW * 0.96, wellBlend);
      wLower = THREE.MathUtils.lerp(wLower, wellInnerW, wellBlend);
      yLower = THREE.MathUtils.lerp(yLower, archCeilingY, wellBlend);
      wMid = wCur * (1.0 + 0.028 * archT);
      yMid = Math.max(yMid, archCeilingY + 0.032);
      wShoulder = wCur * (0.95 + 0.025 * archT);
      yShoulder = Math.max(yShoulder, yMid + 0.045);
      if (yDeckTop < yShoulder + 0.025) {
        yDeckTop = yShoulder + 0.025;
      }
    }

    const finalCrown = Math.max(yCrown, yDeckTop + 0.016);
    bodyRings.push([
      [0, yFloor, z],
      [wFloor, yOuterSill, z],
      [wLower, yLower, z],
      [wMid, yMid, z],
      [wShoulder, yShoulder, z],
      [wDeck, yDeckTop, z],
      [0, finalCrown, z],
      [-wDeck, yDeckTop, z],
      [-wShoulder, yShoulder, z],
      [-wMid, yMid, z],
      [-wLower, yLower, z],
      [-wFloor, yOuterSill, z],
    ]);
  }

  const bodyMesh = new THREE.Mesh(buildLoftedShell(bodyRings, true), bodyPaintMat);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  chaseOnlyGroup.add(bodyMesh);

  // Dark Inner Wheel-Well Liners seated cleanly inside the sculpted fenders
  const wellMat = new THREE.MeshStandardMaterial({ color: 0x090a0d, roughness: 0.96 });
  const wellGeo = new THREE.CylinderGeometry(
    archR * 0.96,
    archR * 0.96,
    tireWidth * 1.08,
    20,
    1,
    false,
    0,
    Math.PI
  );
  wellGeo.rotateZ(Math.PI / 2);

  for (const axZ of [frontAxleZ, rearAxleZ]) {
    for (const side of [-1, 1]) {
      const liner = new THREE.Mesh(wellGeo, wellMat);
      liner.position.set(side * (trackHalfW - tireWidth * 0.06), wheelCY, axZ);
      chaseOnlyGroup.add(liner);
    }
  }

  // 2. Lofted 3D Greenhouse Canopy (Curved Windshield, Tumblehome Side Glass & Roofline)
  const glassStartZ = cowlZ - 0.04;
  const glassEndZ =
    car.id === 'gt_yellow'
      ? halfL - 0.14
      : car.id === 'hyper_obsidian'
        ? halfL - 0.28
        : car.id === 'super_red'
          ? trunkStartZ + 0.12
          : trunkStartZ + 0.16;
  const glassSpan = glassEndZ - glassStartZ;

  // Signature roofline profile per car
  const sampleCabin = (t: number) => {
    const z = glassStartZ + glassSpan * t;
    let yRoofEdge = shoulderY;
    let wBase = cabinW * 0.54;
    let wTop = cabinW * 0.4;

    if (car.id === 'gt_yellow') {
      // Iconic continuous 911 teardrop arc
      const riseEnd = 0.34;
      if (t < riseEnd) {
        const k = t / riseEnd;
        yRoofEdge = THREE.MathUtils.lerp(shoulderY - 0.02, roofTopY - 0.025, Math.sin((k * Math.PI) / 2));
      } else {
        const k = (t - riseEnd) / (1 - riseEnd);
        yRoofEdge = THREE.MathUtils.lerp(roofTopY - 0.025, shoulderY + 0.02, Math.pow(k, 1.38));
      }
      const plan = 0.84 + 0.16 * Math.sin(t * Math.PI);
      wBase *= plan * (1 - 0.14 * t);
      wTop = wBase * (0.76 - 0.1 * t);
    } else if (car.id === 'super_red' || car.id === 'hyper_obsidian') {
      // Cab-forward sculpted teardrop bubble canopy
      const riseEnd = 0.32;
      const flatEnd = 0.58;
      if (t < riseEnd) {
        const k = t / riseEnd;
        yRoofEdge = THREE.MathUtils.lerp(shoulderY - 0.03, roofTopY - 0.02, Math.sin((k * Math.PI) / 2));
      } else if (t <= flatEnd) {
        const k = (t - riseEnd) / (flatEnd - riseEnd);
        yRoofEdge = roofTopY - 0.02 + Math.sin(k * Math.PI) * 0.015;
      } else {
        const k = (t - flatEnd) / (1 - flatEnd);
        yRoofEdge = THREE.MathUtils.lerp(roofTopY - 0.02, shoulderY + 0.03, k * k * (3 - 2 * k));
      }
      const plan = 0.8 + 0.2 * Math.sin(t * Math.PI);
      wBase *= plan * (1 - 0.12 * t);
      wTop = wBase * (0.72 - 0.08 * t);
    } else if (car.id === 'sedan_red') {
      // Athletic 4-door notchback greenhouse
      const riseEnd = 0.26;
      const flatEnd = 0.74;
      if (t < riseEnd) {
        const k = t / riseEnd;
        yRoofEdge = THREE.MathUtils.lerp(shoulderY - 0.02, roofTopY - 0.025, Math.sin((k * Math.PI) / 2));
      } else if (t <= flatEnd) {
        const k = (t - riseEnd) / (flatEnd - riseEnd);
        yRoofEdge = roofTopY - 0.025 + Math.sin(k * Math.PI) * 0.016;
      } else {
        const k = (t - flatEnd) / (1 - flatEnd);
        yRoofEdge = THREE.MathUtils.lerp(roofTopY - 0.025, shoulderY, Math.pow(k, 1.3));
      }
      const plan = 0.88 + 0.12 * Math.sin(t * Math.PI);
      wBase *= plan;
      wTop = wBase * 0.82;
    } else {
      // Classic 2-door fastback / sport coupe (compact_blue, muscle_green)
      const riseEnd = 0.3;
      const flatEnd = 0.62;
      if (t < riseEnd) {
        const k = t / riseEnd;
        yRoofEdge = THREE.MathUtils.lerp(shoulderY - 0.02, roofTopY - 0.025, Math.sin((k * Math.PI) / 2));
      } else if (t <= flatEnd) {
        const k = (t - riseEnd) / (flatEnd - riseEnd);
        yRoofEdge = roofTopY - 0.025 + Math.sin(k * Math.PI) * 0.015;
      } else {
        const k = (t - flatEnd) / (1 - flatEnd);
        yRoofEdge = THREE.MathUtils.lerp(roofTopY - 0.025, shoulderY + 0.01, Math.pow(k, 1.35));
      }
      const plan = 0.86 + 0.14 * Math.sin(t * Math.PI);
      wBase *= plan;
      wTop = wBase * 0.79;
    }

    const yBase = shoulderY - 0.055;
    const yMidGlass = THREE.MathUtils.lerp(yBase, yRoofEdge, 0.52);
    const wMidGlass = THREE.MathUtils.lerp(wBase, wTop, 0.45);
    const yCrown = Math.max(yRoofEdge + 0.028, yBase + 0.04);
    return { z, yBase, yMidGlass, yRoofEdge, yCrown, wBase, wMidGlass, wTop };
  };

  const glassRings: Vec3[][] = [];
  for (let i = 0; i <= 14; i++) {
    const s = sampleCabin(i / 14);
    glassRings.push([
      [0, s.yBase, s.z],
      [s.wBase, s.yBase, s.z],
      [s.wMidGlass, s.yMidGlass, s.z],
      [s.wTop, s.yRoofEdge, s.z],
      [0, s.yCrown, s.z],
      [-s.wTop, s.yRoofEdge, s.z],
      [-s.wMidGlass, s.yMidGlass, s.z],
      [-s.wBase, s.yBase, s.z],
    ]);
  }
  const cabinGlassMesh = new THREE.Mesh(
    buildLoftedShell(glassRings, true),
    darkGlassMat
  );
  cabinGlassMesh.castShadow = true;
  chaseOnlyGroup.add(cabinGlassMesh);

  // Contoured Painted Roof Skin hugging the exact top of the Greenhouse
  const rStartT =
    car.id === 'sedan_red' ? 0.25 : isLowExotic ? 0.31 : 0.29;
  const rEndT =
    car.id === 'gt_yellow'
      ? 0.78
      : car.id === 'sedan_red'
        ? 0.76
        : isLowExotic
          ? 0.64
          : 0.67;
  const roofRings: Vec3[][] = [];
  for (let i = 0; i <= 9; i++) {
    const t = THREE.MathUtils.lerp(rStartT, rEndT, i / 9);
    const s = sampleCabin(t);
    const wRoofOuter = s.wTop * 1.02;
    const wRoofInner = s.wTop * 0.94;
    roofRings.push([
      [0, s.yRoofEdge - 0.015, s.z],
      [wRoofInner, s.yRoofEdge - 0.005, s.z],
      [wRoofOuter, s.yRoofEdge + 0.015, s.z],
      [0, s.yCrown + 0.018, s.z],
      [-wRoofOuter, s.yRoofEdge + 0.015, s.z],
      [-wRoofInner, s.yRoofEdge - 0.005, s.z],
    ]);
  }
  const roofMesh = new THREE.Mesh(buildLoftedShell(roofRings, true), bodyPaintMat);
  roofMesh.castShadow = true;
  chaseOnlyGroup.add(roofMesh);

  // Contoured A-Pillars, C-Pillars / Flying Buttresses, and Sedan B-Pillars
  const aPillarMat =
    car.id === 'hyper_obsidian' ? carbonMat : bodyPaintMat;
  const buildPillarRibbon = (
    tFrom: number,
    tTo: number,
    steps: number,
    thickW: number,
    mat: THREE.Material
  ) => {
    for (const side of [-1, 1]) {
      const rings: Vec3[][] = [];
      for (let i = 0; i <= steps; i++) {
        const t = THREE.MathUtils.lerp(tFrom, tTo, i / steps);
        const s = sampleCabin(t);
        const xBaseEdge =
          i === 0 && tFrom < 0.1
            ? side * s.wBase * 0.98
            : i === steps && tTo > 0.85
              ? side * s.wBase * 0.98
              : side *
                THREE.MathUtils.lerp(
                  s.wBase * 0.96,
                  s.wTop * 1.01,
                  t < 0.5 ? t / rStartT : (1 - t) / (1 - rEndT)
                );
        const cx =
          THREE.MathUtils.clamp(
            Math.abs(xBaseEdge),
            s.wTop * 0.9,
            s.wBase * 1.02
          ) * side;
        const innerX = cx - side * thickW;
        const yBot = s.yRoofEdge - 0.025;
        const yTop = s.yRoofEdge + 0.016;
        const xL = Math.min(cx, innerX);
        const xR = Math.max(cx, innerX);
        rings.push([
          [xL, yBot, s.z],
          [xR, yBot, s.z],
          [xR, yTop, s.z],
          [xL, yTop, s.z],
        ]);
      }
      chaseOnlyGroup.add(new THREE.Mesh(buildLoftedShell(rings, true), mat));
    }
  };

  buildPillarRibbon(0.02, rStartT, 5, 0.06, aPillarMat);
  buildPillarRibbon(
    rEndT,
    0.98,
    6,
    car.id === 'super_red' ? 0.11 : 0.075,
    bodyPaintMat
  );

  if (car.id === 'sedan_red') {
    // Black 4-door B-pillars following exact tumblehome slope (CCW on both sides)
    const midS = sampleCabin(0.5);
    for (const side of [-1, 1]) {
      const bBotIn = side * (midS.wBase * 0.95);
      const bBotOut = side * (midS.wBase * 1.01);
      const bTopIn = side * (midS.wTop * 0.95);
      const bTopOut = side * (midS.wTop * 1.01);
      const bRings: Vec3[][] = [-0.04, 0.04].map((dz) => [
        [Math.min(bBotIn, bBotOut), midS.yBase, midS.z + dz],
        [Math.max(bBotIn, bBotOut), midS.yBase, midS.z + dz],
        [Math.max(bTopIn, bTopOut), midS.yRoofEdge, midS.z + dz],
        [Math.min(bTopIn, bTopOut), midS.yRoofEdge, midS.z + dz],
      ]);
      chaseOnlyGroup.add(new THREE.Mesh(buildLoftedShell(bRings, true), carbonMat));
    }
  }

  // 3. Car-Specific Sculpted Hood, Side Aero, Roof Details & Rear Engine Deck
  const beltY = sillY + beltHeight * 0.56;
  const cabinZ = glassStartZ + glassSpan * 0.48;
  const rearDeckL = halfL - trunkStartZ;
  const rearDeckZ = (trunkStartZ + halfL) * 0.5;

  if (ext.hasCowlBulge) {
    // Emerald SS 454 Lofted Cowl Induction Power-Dome Hood
    const cowlRings: Vec3[][] = [];
    for (let i = 0; i <= 7; i++) {
      const ct = i / 7;
      const cz = THREE.MathUtils.lerp(-halfL + L * 0.07, cowlZ - 0.03, ct);
      const cw = W * (0.14 + 0.07 * Math.sin((ct * Math.PI) / 2));
      const baseY = THREE.MathUtils.lerp(noseFrontY + 0.05, shoulderY + 0.005, ct);
      const bulgeLift = 0.072 * Math.pow(ct, 0.72);
      cowlRings.push([
        [0, baseY - 0.01, cz],
        [cw, baseY, cz],
        [cw * 0.72, baseY + bulgeLift, cz],
        [0, baseY + bulgeLift + 0.014, cz],
        [-cw * 0.72, baseY + bulgeLift, cz],
        [-cw, baseY, cz],
      ]);
    }
    chaseOnlyGroup.add(new THREE.Mesh(buildLoftedShell(cowlRings, true), bodyPaintMat));
  }

  if (car.id === 'gt_yellow') {
    // Porsche GT3 RS Twin Black Carbon NACA Hood Vents
    for (const side of [-1, 1]) {
      const naca = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.02, 0.19),
        carbonMat
      );
      naca.position.set(side * 0.17, noseFrontY + (shoulderY - noseFrontY) * 0.36, -halfL + 0.44);
      naca.rotation.x = 0.22;
      chaseOnlyGroup.add(naca);
    }
  }

  // Front Splitter / Modernized Aero Lip
  const frontLipMat = ext.hasGoldAero ? goldAeroMat : carbonMat;
  const frontSplitter = new THREE.Mesh(
    new THREE.BoxGeometry(W * (ext.hasGoldAero ? 0.96 : 0.88), 0.042, 0.17),
    frontLipMat
  );
  frontSplitter.position.set(0, sillY + 0.028, -halfL + 0.06);
  chaseOnlyGroup.add(frontSplitter);

  if (car.id === 'sedan_red') {
    // M-Line Sport Sedan Twin Black Kidney Grille
    for (const side of [-1, 1]) {
      const kidney = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.05), carbonMat);
      kidney.position.set(side * 0.14, sillY + beltHeight * 0.5, -halfL - 0.008);
      chaseOnlyGroup.add(kidney);
    }
  }

  // Mid-Engine V8 Glass Deck + Louver Spine (Stradale V8 & Obsidian Apex GT)
  if (ext.hasGlassEngineDeck) {
    const engineDeckRings: Vec3[][] = [];
    for (let i = 0; i <= 5; i++) {
      const t = i / 5;
      const ez = THREE.MathUtils.lerp(trunkStartZ - 0.12, halfL - 0.12, t);
      const ew = W * (0.28 - 0.06 * t);
      const ey = shoulderY + rearHaunchKick * 0.45 + 0.01 * (1 - t);
      engineDeckRings.push([
        [0, ey - 0.016, ez],
        [ew, ey - 0.006, ez],
        [0, ey + 0.018, ez],
        [-ew, ey - 0.006, ez],
      ]);
    }
    chaseOnlyGroup.add(new THREE.Mesh(buildLoftedShell(engineDeckRings, true), darkGlassMat));

    const v8Cover = new THREE.Mesh(
      new THREE.BoxGeometry(W * 0.26, 0.028, rearDeckL * 0.5),
      car.id === 'super_red' ? bodyPaintMat : goldAeroMat
    );
    v8Cover.position.set(0, shoulderY + 0.016, rearDeckZ - 0.04);
    chaseOnlyGroup.add(v8Cover);
  }

  // Side Air Intakes (Stradale V8 sculpted black ducts, GT3 RS intakes, Obsidian Apex GT Gold C-Blades)
  if (ext.hasSideScoops) {
    for (const side of [-1, 1]) {
      if (ext.hasGoldAero) {
        const cBladeRings: Vec3[][] = [];
        for (let i = 0; i <= 6; i++) {
          const bt = i / 6;
          const bz = THREE.MathUtils.lerp(cabinZ - 0.17, rearAxleZ - 0.26, bt);
          const bx = side * (halfW * (0.93 + 0.08 * Math.sin(bt * Math.PI)));
          const byBot = sillY + 0.085 + 0.11 * Math.pow(bt, 1.4);
          const byTop = shoulderY - 0.03 + 0.04 * Math.sin(bt * Math.PI);
          const inX = bx - side * 0.038;
          const x0 = Math.min(bx, inX);
          const x1 = Math.max(bx, inX);
          cBladeRings.push([
            [x0, byBot, bz],
            [x1, byBot, bz],
            [x1, byTop, bz],
            [x0, byTop, bz],
          ]);
        }
        chaseOnlyGroup.add(new THREE.Mesh(buildLoftedShell(cBladeRings, true), goldAeroMat));

        const darkCavity = new THREE.Mesh(
          new THREE.BoxGeometry(0.032, beltHeight * 0.42, L * 0.16),
          carbonMat
        );
        darkCavity.position.set(side * (halfW * 0.94), beltY + 0.015, cabinZ + L * 0.11);
        chaseOnlyGroup.add(darkCavity);
      } else {
        const scoop = new THREE.Mesh(
          new THREE.BoxGeometry(0.055, beltHeight * 0.34, L * 0.16),
          carbonMat
        );
        scoop.position.set(side * (halfW * 0.96), beltY + 0.024, cabinZ + L * 0.13);
        chaseOnlyGroup.add(scoop);
      }
    }
  }

  // Side Skirts / Modern Carbon Lower Aero Blades
  if (ext.hasBlackRockerStripe || ext.hasGoldAero || car.id === 'gt_yellow' || car.id === 'sedan_red') {
    const skirtMat = ext.hasGoldAero ? goldAeroMat : carbonMat;
    for (const side of [-1, 1]) {
      const skirt = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.034, L * 0.44),
        skirtMat
      );
      skirt.position.set(
        side * (halfW * 0.985),
        ext.hasBlackRockerStripe ? sillY + 0.072 : sillY + 0.028,
        0
      );
      chaseOnlyGroup.add(skirt);
    }
  }

  // Roof Shark-Fin Antenna (M-Line Sedan) or Champagne-Gold Roof Scoop + Spine (Obsidian Apex GT)
  if (ext.hasSharkFin) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.022, 0.058, 0.13), bodyPaintMat);
    fin.position.set(0, roofTopY + 0.022, glassStartZ + glassSpan * 0.72);
    chaseOnlyGroup.add(fin);
  }
  if (ext.hasRoofScoop) {
    const scoopRings: Vec3[][] = [];
    for (let i = 0; i <= 5; i++) {
      const st = i / 5;
      const sz = THREE.MathUtils.lerp(cabinZ - 0.14, trunkStartZ + 0.2, st);
      const sw = 0.092 - 0.046 * st;
      const syBot = THREE.MathUtils.lerp(roofTopY - 0.008, shoulderY + 0.04, Math.pow(st, 1.3));
      const syTop = syBot + (st < 0.35 ? 0.058 : THREE.MathUtils.lerp(0.058, 0.015, (st - 0.35) / 0.65));
      scoopRings.push([
        [0, syBot, sz],
        [sw, syBot, sz],
        [sw * 0.75, syTop, sz],
        [0, syTop + 0.008, sz],
        [-sw * 0.75, syTop, sz],
        [-sw, syBot, sz],
      ]);
    }
    chaseOnlyGroup.add(new THREE.Mesh(buildLoftedShell(scoopRings, true), goldAeroMat));
  }

  // Sculpted Aerodynamic Teardrop Wing Mirrors + Door Stalks
  const mirrorPodGeo = new THREE.SphereGeometry(0.042, 12, 8);
  mirrorPodGeo.scale(1.38, 0.66, 0.92);
  for (const side of [-1, 1]) {
    const stalk = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.016, 0.024), carbonMat);
    stalk.position.set(side * (halfW * 0.86 + 0.025), shoulderY + 0.036, cowlZ + 0.12);
    stalk.rotation.z = side * 0.25;
    chaseOnlyGroup.add(stalk);

    const pod = new THREE.Mesh(mirrorPodGeo, mirrorHousingMat);
    pod.position.set(side * (halfW * 0.92 + 0.055), shoulderY + 0.048, cowlZ + 0.13);
    pod.rotation.y = side * -0.22;
    chaseOnlyGroup.add(pod);
  }

  // Car-Specific Rear Wing / Spoiler
  const spoilerBaseY = shoulderY + rearHaunchKick * 0.65;
  const spoilerZ = halfL - 0.16;
  if (ext.wingStyle === 'loop') {
    // Blue Coupe Arched Loop Trunk Spoiler
    const wingSpan = W * 0.76;
    const loopRings: Vec3[][] = [];
    for (let i = 0; i <= 6; i++) {
      const wt = i / 6;
      const x = THREE.MathUtils.lerp(-wingSpan * 0.5, wingSpan * 0.5, wt);
      const lift = 0.085 + 0.018 * Math.sin(wt * Math.PI);
      loopRings.push([
        [x, spoilerBaseY + lift - 0.02, spoilerZ - 0.07],
        [x, spoilerBaseY + lift - 0.02, spoilerZ + 0.08],
        [x, spoilerBaseY + lift + 0.022, spoilerZ + 0.08],
        [x, spoilerBaseY + lift + 0.022, spoilerZ - 0.07],
      ]);
    }
    chaseOnlyGroup.add(new THREE.Mesh(buildLoftedShell(loopRings, true), bodyPaintMat));
    for (const side of [-1, 1]) {
      const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.09, 0.12), bodyPaintMat);
      pylon.position.set(side * wingSpan * 0.46, spoilerBaseY + 0.042, spoilerZ);
      chaseOnlyGroup.add(pylon);
    }
  } else if (ext.wingStyle === 'swan_black' || ext.wingStyle === 'swan_gold') {
    // Track GT3 RS / Apex GT Sculpted Cambered Carbon Airfoil + Swan-Neck Pylons
    const wingHalf = W * 0.48;
    const wingY = spoilerBaseY + 0.195;
    const wingRings: Vec3[][] = [];
    for (let i = 0; i <= 8; i++) {
      const wt = i / 8;
      const x = THREE.MathUtils.lerp(-wingHalf, wingHalf, wt);
      const sweepZ = spoilerZ + 0.03 + 0.03 * Math.abs(wt - 0.5) * 2;
      const camberY = wingY + 0.018 * Math.cos((wt - 0.5) * Math.PI);
      wingRings.push([
        [x, camberY - 0.012, sweepZ - 0.09],
        [x, camberY - 0.022, sweepZ + 0.095],
        [x, camberY + 0.008, sweepZ + 0.095],
        [x, camberY + 0.015, sweepZ - 0.09],
      ]);
    }
    chaseOnlyGroup.add(new THREE.Mesh(buildLoftedShell(wingRings, true), carbonMat));

    const endplateMat = ext.wingStyle === 'swan_gold' ? goldAeroMat : carbonMat;
    for (const side of [-1, 1]) {
      const pylon = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.2, 0.095), carbonMat);
      pylon.position.set(side * W * 0.21, spoilerBaseY + 0.1, spoilerZ - 0.02);
      pylon.rotation.x = -0.22;
      chaseOnlyGroup.add(pylon);

      const topHook = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.03, 0.09), carbonMat);
      topHook.position.set(side * W * 0.21, wingY + 0.028, spoilerZ + 0.02);
      chaseOnlyGroup.add(topHook);

      const endplate = new THREE.Mesh(
        new THREE.BoxGeometry(0.026, 0.12, 0.22),
        endplateMat
      );
      endplate.position.set(side * wingHalf, wingY - 0.008, spoilerZ + 0.055);
      chaseOnlyGroup.add(endplate);
    }
  } else if (car.id === 'sedan_red') {
    // M-Line subtle trunk deck lip
    const subtleLip = new THREE.Mesh(
      new THREE.BoxGeometry(W * 0.66, 0.028, 0.07),
      carbonMat
    );
    subtleLip.position.set(0, spoilerBaseY + 0.01, halfL - 0.09);
    chaseOnlyGroup.add(subtleLip);
  }

  // Modern Gloss-Black Rear Aero Mask + Multi-Fin Carbon Diffuser + Recessed Exhausts
  const rearMaskW = W * 0.72;
  const rearFasciaPanel = new THREE.Mesh(
    new THREE.BoxGeometry(rearMaskW, beltHeight * 0.24, 0.028),
    carbonMat
  );
  rearFasciaPanel.position.set(0, shoulderY - 0.085, halfL - 0.012);
  chaseOnlyGroup.add(rearFasciaPanel);

  // Modern multi-vane carbon rear diffuser across ALL models (restomod brushed trim accent on muscle_green)
  const rearDiffuser = new THREE.Mesh(
    new THREE.BoxGeometry(W * 0.64, 0.068, 0.08),
    carbonMat
  );
  rearDiffuser.position.set(0, sillY + 0.078, halfL - 0.032);
  chaseOnlyGroup.add(rearDiffuser);

  if (ext.hasChromeBumpers) {
    const restomodAccent = new THREE.Mesh(
      new THREE.BoxGeometry(W * 0.66, 0.018, 0.024),
      chromeMat
    );
    restomodAccent.position.set(0, sillY + 0.112, halfL - 0.002);
    chaseOnlyGroup.add(restomodAccent);
  }

  for (const fx of [-0.26, -0.09, 0.09, 0.26]) {
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.064, 0.09), carbonMat);
    fin.position.set(fx * W * 0.48, sillY + 0.07, halfL - 0.028);
    chaseOnlyGroup.add(fin);
  }

  const exhaustOffsets =
    car.id === 'sedan_red'
      ? [-W * 0.28, -W * 0.21, W * 0.21, W * 0.28]
      : car.id === 'gt_yellow' || car.id === 'hyper_obsidian'
        ? [-W * 0.075, W * 0.075]
        : [-W * 0.25, W * 0.25];
  const exhaustOuterGeo = new THREE.CylinderGeometry(0.028, 0.028, 0.075, 12);
  exhaustOuterGeo.rotateX(Math.PI / 2);
  const exhaustInnerGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.08, 10);
  exhaustInnerGeo.rotateX(Math.PI / 2);

  for (const ex of exhaustOffsets) {
    const pipe = new THREE.Mesh(exhaustOuterGeo, chromeMat);
    pipe.position.set(ex, sillY + 0.078, halfL - 0.012);
    chaseOnlyGroup.add(pipe);

    const bore = new THREE.Mesh(exhaustInnerGeo, wellMat);
    bore.position.set(ex, sillY + 0.078, halfL - 0.009);
    chaseOnlyGroup.add(bore);
  }

  // Sleek Dark-Framed Mini Plate
  const plateFrame = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.064, 0.012),
    carbonMat
  );
  plateFrame.position.set(0, sillY + beltHeight * 0.36, halfL - 0.002);
  chaseOnlyGroup.add(plateFrame);
  const plateFace = new THREE.Mesh(
    new THREE.PlaneGeometry(0.195, 0.048),
    new THREE.MeshBasicMaterial({ color: 0x334155 })
  );
  plateFace.position.set(0, sillY + beltHeight * 0.36, halfL + 0.005);
  chaseOnlyGroup.add(plateFace);

  // Modern Razor-Sharp Glowing LED Taillight Signatures (Full-Width Bar / Halo / Dual LED Blades)
  const brakeLights: THREE.Mesh[] = [];
  const tlY = shoulderY - 0.082;
  if (ext.taillightStyle === 'bar') {
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(W * 0.68, 0.018, 0.018),
      new THREE.MeshBasicMaterial({ color: 0xff1e38 })
    );
    bar.position.set(0, tlY, halfL + 0.004);
    chaseOnlyGroup.add(bar);
    brakeLights.push(bar);

    for (const side of [-1, 1]) {
      const tick = new THREE.Mesh(
        new THREE.BoxGeometry(W * 0.11, 0.028, 0.02),
        new THREE.MeshBasicMaterial({ color: 0xff1e38 })
      );
      tick.position.set(side * W * 0.27, tlY, halfL + 0.004);
      chaseOnlyGroup.add(tick);
      brakeLights.push(tick);
    }
  } else if (ext.taillightStyle === 'quad_round') {
    for (const side of [-1, 1]) {
      for (const inner of [0.21, 0.295]) {
        const housing = new THREE.Mesh(
          new THREE.CylinderGeometry(0.036, 0.036, 0.022, 16),
          carbonMat
        );
        housing.rotation.x = Math.PI / 2;
        housing.position.set(side * W * inner, tlY, halfL - 0.002);
        chaseOnlyGroup.add(housing);

        const lamp = new THREE.Mesh(
          new THREE.TorusGeometry(0.025, 0.0075, 8, 18),
          new THREE.MeshBasicMaterial({ color: 0xff1e38 })
        );
        lamp.position.set(side * W * inner, tlY, halfL + 0.009);
        chaseOnlyGroup.add(lamp);
        brakeLights.push(lamp);
      }
    }
  } else {
    // Sleek modern twin-blade LED signature + center light bridge
    const bridge = new THREE.Mesh(
      new THREE.BoxGeometry(W * 0.64, 0.008, 0.014),
      new THREE.MeshBasicMaterial({ color: 0x991b1b })
    );
    bridge.position.set(0, tlY + 0.006, halfL + 0.003);
    chaseOnlyGroup.add(bridge);

    for (const side of [-1, 1]) {
      const upperBlade = new THREE.Mesh(
        new THREE.BoxGeometry(W * 0.19, 0.016, 0.018),
        new THREE.MeshBasicMaterial({ color: 0xff1e38 })
      );
      upperBlade.position.set(side * W * 0.245, tlY + 0.01, halfL + 0.004);
      upperBlade.rotation.y = side * 0.12;
      chaseOnlyGroup.add(upperBlade);
      brakeLights.push(upperBlade);

      const lowerBlade = new THREE.Mesh(
        new THREE.BoxGeometry(W * 0.15, 0.012, 0.018),
        new THREE.MeshBasicMaterial({ color: 0xff1e38 })
      );
      lowerBlade.position.set(side * W * 0.26, tlY - 0.012, halfL + 0.004);
      lowerBlade.rotation.y = side * 0.12;
      chaseOnlyGroup.add(lowerBlade);
      brakeLights.push(lowerBlade);
    }
  }

  // Headlights (visible in reflections & sharp front profile)
  const headGlowMat = new THREE.MeshBasicMaterial({ color: 0xfef9c3 });
  for (const side of [-1, 1]) {
    if (car.id === 'gt_yellow') {
      const ovalHl = new THREE.Mesh(
        new THREE.CylinderGeometry(0.062, 0.062, 0.04, 14),
        headGlowMat
      );
      ovalHl.rotation.x = Math.PI / 2;
      ovalHl.position.set(side * W * 0.3, noseFrontY + 0.04, -halfL + 0.08);
      chaseOnlyGroup.add(ovalHl);
    } else {
      const hl = new THREE.Mesh(
        new THREE.BoxGeometry(W * 0.16, 0.042, 0.04),
        headGlowMat
      );
      hl.position.set(side * W * 0.28, sillY + beltHeight * 0.44, -halfL + 0.04);
      hl.rotation.y = side * -0.18;
      chaseOnlyGroup.add(hl);
    }
  }

  // Soft Radial-Gradient Ground Contact Shadow
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 64;
  shadowCanvas.height = 64;
  const sCtx = shadowCanvas.getContext('2d');
  if (sCtx) {
    const grad = sCtx.createRadialGradient(32, 32, 6, 32, 32, 31);
    grad.addColorStop(0, 'rgba(4, 6, 10, 0.72)');
    grad.addColorStop(0.6, 'rgba(4, 6, 10, 0.38)');
    grad.addColorStop(1, 'rgba(4, 6, 10, 0.0)');
    sCtx.fillStyle = grad;
    sCtx.fillRect(0, 0, 64, 64);
  }
  const shadowTex = new THREE.CanvasTexture(shadowCanvas);
  const underShadow = new THREE.Mesh(
    new THREE.PlaneGeometry(W * 1.28, L * 1.14),
    new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
    })
  );
  underShadow.rotation.x = -Math.PI / 2;
  underShadow.position.set(0, roadGroundY + 0.015, 0);
  chaseOnlyGroup.add(underShadow);

  // Twin Nitro / Boost Exhaust Flames
  const boostFlameMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.9,
  });
  const boostFlames: THREE.Mesh[] = [];
  for (const side of [-1, 1]) {
    const flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.052, 0.34, 8),
      boostFlameMat
    );
    flame.rotation.x = Math.PI / 2;
    flame.position.set(side * W * 0.24, sillY + 0.075, halfL + 0.18);
    flame.visible = false;
    chaseOnlyGroup.add(flame);
    boostFlames.push(flame);
  }

  // 4 High-Detail Y-Spoke Alloy Wheels + Outer Rim Lip + Rotors + Brake Calipers
  const wheelMeshes: THREE.Mesh[] = [];
  const frontWheelPivots: THREE.Group[] = [];
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.86 });
  const rimMat = new THREE.MeshStandardMaterial({
    color: ext.rimColor,
    roughness: 0.2,
    metalness: 0.88,
  });
  const rotorMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.32,
    metalness: 0.82,
  });
  const caliperColor =
    car.id === 'gt_yellow'
      ? 0xfacc15
      : car.id === 'hyper_obsidian'
        ? 0xd4af37
        : car.id === 'super_red' || car.id === 'sedan_red'
          ? 0xdc2626
          : 0x64748b;
  const caliperMat = new THREE.MeshStandardMaterial({
    color: caliperColor,
    roughness: 0.34,
    metalness: 0.45,
  });

  const tireGeo = new THREE.CylinderGeometry(wr, wr, tireWidth, 26);
  tireGeo.rotateZ(Math.PI / 2);
  const barrelGeo = new THREE.CylinderGeometry(
    wr * 0.68,
    wr * 0.68,
    tireWidth + 0.008,
    18
  );
  barrelGeo.rotateZ(Math.PI / 2);
  const rimLipGeo = new THREE.TorusGeometry(wr * 0.68, 0.02, 8, 24);
  rimLipGeo.rotateY(Math.PI / 2);
  const rotorGeo = new THREE.CylinderGeometry(
    wr * 0.52,
    wr * 0.52,
    tireWidth * 0.45,
    16
  );
  rotorGeo.rotateZ(Math.PI / 2);
  const ySpokeGeo = new THREE.BoxGeometry(0.024, wr * 0.64, 0.024);

  const wheelPositions: { x: number; z: number; isFront: boolean }[] = [
    { x: -trackHalfW, z: frontAxleZ, isFront: true },
    { x: trackHalfW, z: frontAxleZ, isFront: true },
    { x: -trackHalfW, z: rearAxleZ, isFront: false },
    { x: trackHalfW, z: rearAxleZ, isFront: false },
  ];

  for (const wp of wheelPositions) {
    const pivot = new THREE.Group();
    pivot.position.set(wp.x, wheelCY, wp.z);

    // Non-spinning brake caliper attached inside wheel pivot
    const outwardSign = Math.sign(wp.x);
    const caliper = new THREE.Mesh(
      new THREE.BoxGeometry(tireWidth * 0.5, wr * 0.34, wr * 0.24),
      caliperMat
    );
    caliper.position.set(outwardSign * 0.025, wr * 0.12, -wr * 0.26);
    pivot.add(caliper);

    const tire = new THREE.Mesh(tireGeo, tireMat);
    const barrel = new THREE.Mesh(barrelGeo, wellMat);
    const rotor = new THREE.Mesh(rotorGeo, rotorMat);
    const rimLip = new THREE.Mesh(rimLipGeo, rimMat);
    rimLip.position.x = outwardSign * (tireWidth * 0.46);
    tire.add(barrel);
    tire.add(rotor);
    tire.add(rimLip);

    // 5 pairs of crisp Y-spokes around outer wheel face
    for (let sp = 0; sp < 5; sp++) {
      const baseAngle = (sp * Math.PI * 2) / 5;
      for (const fork of [-0.18, 0.18]) {
        const spoke = new THREE.Mesh(ySpokeGeo, rimMat);
        const angle = baseAngle + fork * 0.55;
        spoke.position.set(
          outwardSign * (tireWidth * 0.465),
          Math.cos(angle) * wr * 0.35,
          Math.sin(angle) * wr * 0.35
        );
        spoke.rotation.x = baseAngle + fork;
        tire.add(spoke);
      }
    }

    const hubCap = new THREE.Mesh(
      new THREE.CylinderGeometry(wr * 0.15, wr * 0.15, tireWidth + 0.022, 12),
      ext.hasGoldAero ? goldAeroMat : rimMat
    );
    hubCap.rotateZ(Math.PI / 2);
    tire.add(hubCap);

    pivot.add(tire);
    chaseOnlyGroup.add(pivot);
    wheelMeshes.push(tire);
    if (wp.isFront) frontWheelPivots.push(pivot);
  }

  const dispose = () => {
    shadowTex.dispose();
    root.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const m = obj as THREE.Mesh;
        m.geometry?.dispose();
        if (Array.isArray(m.material)) {
          m.material.forEach((mat) => mat.dispose());
        } else {
          m.material?.dispose();
        }
      }
    });
  };

  return {
    root,
    interiorGroup,
    hoodGroup,
    chaseOnlyGroup,
    steeringWheelGroup,
    hoodMesh,
    leftMirrorHousing,
    dashMesh,
    wheelMeshes,
    frontWheelPivots,
    brakeLights,
    boostFlames,
    dispose,
  };
}

export type TrafficVariant = 'sedan' | 'hatch' | 'van' | 'pickup' | 'truck';

const TRAFFIC_COLORS = [
  0xf8fafc, // Crisp white (very common in Screenshots 1 & 2)
  0xe2e8f0, // Silver
  0xdc2626, // Red hatchback/sedan
  0x2563eb, // Blue SUV/sedan
  0x1e293b, // Charcoal
  0xf59e0b, // Yellow cab / amber
  0x0f766e, // Teal
];

export interface TrafficMeshBundle {
  group: THREE.Group;
  halfWidth: number;
  halfLength: number;
  brakeLights: THREE.Mesh[];
}

export function buildTrafficVehicle(
  variant: TrafficVariant,
  isNight: boolean
): TrafficMeshBundle {
  const group = new THREE.Group();
  const color =
    variant === 'van' || variant === 'pickup'
      ? Math.random() < 0.72
        ? 0xf8fafc
        : 0xd1d5db
      : TRAFFIC_COLORS[Math.floor(Math.random() * TRAFFIC_COLORS.length)];

  const paintMat = new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.28,
    metalness: 0.35,
    clearcoat: 0.85,
  });

  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.12,
    metalness: 0.8,
  });

  const wheelMat = new THREE.MeshStandardMaterial({
    color: 0x171717,
    roughness: 0.85,
  });

  const rimMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.25,
    metalness: 0.85,
  });

  const tailLightMat = new THREE.MeshBasicMaterial({
    color: isNight ? 0xff2222 : 0xdc2626,
  });
  const headLightMat = new THREE.MeshBasicMaterial({
    color: isNight ? 0xfffbeb : 0xe2e8f0,
  });
  const bumperMat = new THREE.MeshStandardMaterial({
    color: 0x1f2937,
    roughness: 0.8,
  });

  let width = 1.88;
  let length = 4.35;
  let chassisH = 0.62;
  let cabinW = 1.56;
  let cabinH = 0.56;
  let cabinL = 2.15;
  let cabinZ = 0.12;

  if (variant === 'hatch') {
    width = 1.78;
    length = 3.85;
    cabinL = 2.0;
    cabinZ = 0.25;
  } else if (variant === 'van') {
    width = 1.98;
    length = 4.9;
    chassisH = 1.45;
    cabinW = 1.88;
    cabinH = 0.6;
    cabinL = 3.8;
    cabinZ = 0.2;
  } else if (variant === 'pickup') {
    width = 1.94;
    length = 4.7;
    chassisH = 0.72;
    cabinW = 1.66;
    cabinH = 0.65;
    cabinL = 1.65;
    cabinZ = -0.65;
  } else if (variant === 'truck') {
    width = 2.28;
    length = 6.5;
    chassisH = 0.78;
    cabinW = 2.08;
    cabinH = 1.65;
    cabinL = 4.55;
    cabinZ = 0.58;
  }

  // Lower chassis (bottom sits at y = 0.22 wheel clearance)
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(width, chassisH, length),
    paintMat
  );
  body.position.y = 0.24 + chassisH / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  // Upper cabin / cargo box
  if (variant === 'truck') {
    const cargo = new THREE.Mesh(
      new THREE.BoxGeometry(cabinW, cabinH, cabinL),
      new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.6 })
    );
    cargo.position.set(0, 0.24 + chassisH + cabinH / 2, cabinZ);
    cargo.castShadow = true;
    group.add(cargo);

    const cab = new THREE.Mesh(
      new THREE.BoxGeometry(width * 0.94, 1.25, 1.45),
      paintMat
    );
    cab.position.set(0, 0.24 + chassisH + 0.52, -length / 2 + 0.85);
    group.add(cab);
  } else if (variant !== 'van') {
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(cabinW, cabinH, cabinL),
      paintMat
    );
    cabin.position.set(0, 0.24 + chassisH + cabinH / 2 - 0.04, cabinZ);
    cabin.castShadow = true;
    group.add(cabin);

    // Rear & front windshields
    const rearGlass = new THREE.Mesh(
      new THREE.PlaneGeometry(cabinW * 0.86, cabinH * 0.72),
      glassMat
    );
    rearGlass.position.set(
      0,
      0.24 + chassisH + cabinH * 0.48,
      cabinZ + cabinL / 2 + 0.012
    );
    group.add(rearGlass);

    const frontGlass = new THREE.Mesh(
      new THREE.PlaneGeometry(cabinW * 0.86, cabinH * 0.72),
      glassMat
    );
    frontGlass.position.set(
      0,
      0.24 + chassisH + cabinH * 0.48,
      cabinZ - cabinL / 2 - 0.012
    );
    frontGlass.rotation.y = Math.PI;
    group.add(frontGlass);
  } else {
    // Van high roof + rear windows
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(cabinW, 0.28, length * 0.85),
      paintMat
    );
    roof.position.set(0, 0.24 + chassisH + 0.14, 0.1);
    group.add(roof);

    const rearWin = new THREE.Mesh(
      new THREE.PlaneGeometry(width * 0.72, 0.5),
      glassMat
    );
    rearWin.position.set(0, 0.24 + chassisH * 0.68, length / 2 + 0.012);
    group.add(rearWin);
  }

  // Front & Rear bumpers
  const rearBumper = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.04, 0.18, 0.14),
    bumperMat
  );
  rearBumper.position.set(0, 0.3, length / 2);
  group.add(rearBumper);

  const frontBumper = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.04, 0.18, 0.14),
    bumperMat
  );
  frontBumper.position.set(0, 0.3, -length / 2);
  group.add(frontBumper);

  // License plate
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(0.42, 0.14),
    new THREE.MeshBasicMaterial({ color: 0xf8fafc })
  );
  plate.position.set(0, 0.52, length / 2 + 0.014);
  group.add(plate);

  // Tail / Brake Lights (2)
  const brakeLights: THREE.Mesh[] = [];
  for (const side of [-1, 1]) {
    const tl = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.13, 0.05),
      tailLightMat.clone()
    );
    tl.position.set(side * (width * 0.36), 0.62, length / 2 + 0.01);
    group.add(tl);
    brakeLights.push(tl);

    const hl = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.13, 0.05),
      headLightMat
    );
    hl.position.set(side * (width * 0.36), 0.58, -length / 2 - 0.01);
    group.add(hl);
  }

  // 4 Wheels grounded at y = 0
  const wheelR = variant === 'truck' ? 0.38 : 0.32;
  const wheelGeo = new THREE.CylinderGeometry(wheelR, wheelR, 0.22, 16);
  wheelGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(wheelR * 0.58, wheelR * 0.58, 0.23, 12);
  rimGeo.rotateZ(Math.PI / 2);

  const zOffsets = [-length * 0.31, length * 0.31];
  for (const xSide of [-1, 1]) {
    for (const zOff of zOffsets) {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.position.set(xSide * (width / 2 - 0.04), wheelR, zOff);
      group.add(wheel);

      const rim = new THREE.Mesh(rimGeo, rimMat);
      rim.position.copy(wheel.position);
      group.add(rim);
    }
  }

  return {
    group,
    halfWidth: width / 2,
    halfLength: length / 2,
    brakeLights,
  };
}

export function buildFuelPickup(): THREE.Group {
  const group = new THREE.Group();

  const canMat = new THREE.MeshStandardMaterial({
    color: 0x16a34a,
    roughness: 0.35,
    metalness: 0.2,
    emissive: 0x052e16,
    emissiveIntensity: 0.4,
  });
  const capMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.3,
    metalness: 0.4,
  });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.92, 0.44), canMat);
  body.position.y = 0.72;
  body.castShadow = true;
  group.add(body);

  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(0.78, 0.2, 0.46),
    new THREE.MeshBasicMaterial({ color: 0xfef08a })
  );
  stripe.position.y = 0.72;
  group.add(stripe);

  const spout = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.09, 0.26, 10),
    capMat
  );
  spout.position.set(0.2, 1.28, 0);
  spout.rotation.z = -0.3;
  group.add(spout);

  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.68, 0.045, 8, 28),
    new THREE.MeshBasicMaterial({ color: 0x4ade80 })
  );
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.08;
  group.add(ring);

  return group;
}

export function buildSceneryItem(
  biome: BiomeId,
  side: -1 | 1,
  cityTextures?: THREE.CanvasTexture[]
): THREE.Group {
  const group = new THREE.Group();

  if (biome === 'city') {
    // Raised concrete sidewalk & curb slab along each block
    const sidewalk = new THREE.Mesh(
      new THREE.BoxGeometry(5.6, 0.22, 16.8),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.88 })
    );
    sidewalk.position.set(side * 2.75, 0.11, 0);
    sidewalk.receiveShadow = true;
    group.add(sidewalk);

    const curb = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 0.28, 16.8),
      new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.78 })
    );
    curb.position.set(side * 0.05, 0.14, 0);
    group.add(curb);

    // Textured multi-story skyscrapers & commercial mid-rises
    const h = 16 + Math.random() * 26;
    const w = 7.5 + Math.random() * 4.5;
    const d = 11.5 + Math.random() * 3.5;
    const tex =
      cityTextures && cityTextures.length > 0
        ? cityTextures[Math.floor(Math.random() * cityTextures.length)]
        : undefined;

    const facadeMat = tex
      ? new THREE.MeshStandardMaterial({
          map: tex,
          roughness: 0.35,
          metalness: 0.22,
        })
      : new THREE.MeshStandardMaterial({
          color: 0x475569,
          roughness: 0.45,
          metalness: 0.3,
        });

    const bldg = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), facadeMat);
    bldg.position.set(side * (5.2 + w / 2), h / 2, 0);
    bldg.castShadow = true;
    bldg.receiveShadow = true;
    group.add(bldg);

    // Stepped penthouse crown / rooftop detail
    const roofCapMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.65,
    });
    const parapet = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.35, 0.7, d + 0.35),
      roofCapMat
    );
    parapet.position.set(bldg.position.x, h + 0.35, 0);
    group.add(parapet);

    if (h > 26) {
      const penthouse = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.52, 3.2, d * 0.52),
        roofCapMat
      );
      penthouse.position.set(bldg.position.x, h + 1.9, 0);
      group.add(penthouse);

      const spire = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.12, 5.5, 8),
        new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.8 })
      );
      spire.position.set(bldg.position.x, h + 6.2, 0);
      group.add(spire);
    }

    // Modern curved urban streetlamp
    const poleMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.35,
      metalness: 0.75,
    });
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.12, 6.2, 8),
      poleMat
    );
    pole.position.set(side * 0.85, 3.1, -3.5);
    group.add(pole);

    const lampArm = new THREE.Mesh(
      new THREE.BoxGeometry(1.6, 0.1, 0.12),
      poleMat
    );
    lampArm.position.set(side * 0.15, 6.15, -3.5);
    group.add(lampArm);

    const lampHead = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 0.08, 0.22),
      new THREE.MeshBasicMaterial({ color: 0xfef3c7 })
    );
    lampHead.position.set(-side * 0.45, 6.08, -3.5);
    group.add(lampHead);

    // Leafy multi-cluster boulevard tree in stone planter
    const planter = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 0.36, 1.5),
      new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85 })
    );
    planter.position.set(side * 2.1, 0.38, 3.2);
    group.add(planter);

    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.16, 0.22, 2.3, 8),
      new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 })
    );
    trunk.position.set(side * 2.1, 1.55, 3.2);
    group.add(trunk);

    const foliageMat = new THREE.MeshStandardMaterial({
      color: 0x2d7a45,
      roughness: 0.8,
    });
    const crown1 = new THREE.Mesh(new THREE.SphereGeometry(1.15, 10, 8), foliageMat);
    crown1.position.set(side * 2.1, 3.2, 3.2);
    const crown2 = new THREE.Mesh(new THREE.SphereGeometry(0.85, 9, 7), foliageMat);
    crown2.position.set(side * 2.45, 2.85, 2.75);
    const crown3 = new THREE.Mesh(new THREE.SphereGeometry(0.85, 9, 7), foliageMat);
    crown3.position.set(side * 1.75, 2.9, 3.65);
    group.add(crown1, crown2, crown3);
  } else if (biome === 'mountain') {
    // Tall tiered pine trees (2 trees per slot for lush forest)
    for (let p = 0; p < 2; p++) {
      const scale = 0.8 + Math.random() * 0.75;
      const offsetZ = p === 0 ? -2.5 : 4.2;
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22 * scale, 0.32 * scale, 2.8 * scale, 8),
        new THREE.MeshStandardMaterial({ color: 0x4a3525, roughness: 0.92 })
      );
      trunk.position.set(
        side * (2.6 + p * 3.4 + Math.random() * 2.8),
        1.4 * scale,
        offsetZ
      );
      group.add(trunk);

      const pineMat = new THREE.MeshStandardMaterial({
        color: p === 0 ? 0x1e462a : 0x245432,
        roughness: 0.88,
      });
      for (let t = 0; t < 3; t++) {
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry((2.3 - t * 0.45) * scale, (3.4 - t * 0.4) * scale, 7),
          pineMat
        );
        cone.position.set(
          trunk.position.x,
          (3.2 + t * 1.9) * scale,
          offsetZ
        );
        group.add(cone);
      }
    }

    if (Math.random() < 0.45) {
      const cliff = new THREE.Mesh(
        new THREE.DodecahedronGeometry(3.4, 0),
        new THREE.MeshStandardMaterial({ color: 0x6b665b, roughness: 0.95 })
      );
      cliff.position.set(side * 10.5, 1.5, 1);
      cliff.scale.set(1.7, 1.4, 2.1);
      group.add(cliff);
    }
  } else if (biome === 'desert') {
    if (Math.random() < 0.48) {
      const mesa = new THREE.Mesh(
        new THREE.CylinderGeometry(3.5, 6.2, 12 + Math.random() * 9, 7),
        new THREE.MeshStandardMaterial({ color: 0xa45435, roughness: 0.94 })
      );
      mesa.position.set(side * (8.5 + Math.random() * 6), 5.5, 0);
      group.add(mesa);
    } else {
      const cactusMat = new THREE.MeshStandardMaterial({
        color: 0x3b7a47,
        roughness: 0.85,
      });
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.32, 3.8, 8),
        cactusMat
      );
      stem.position.set(side * (2.8 + Math.random() * 4), 1.9, 0);
      group.add(stem);

      const arm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.2, 1.4, 8),
        cactusMat
      );
      arm.position.set(stem.position.x + side * 0.55, 2.4, 0);
      arm.rotation.z = side * -0.5;
      group.add(arm);
    }
  } else if (biome === 'coastal') {
    const pylon = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 14, 1.1),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.45 })
    );
    pylon.position.set(side * 1.4, 6.5, 0);
    group.add(pylon);

    const lampArm = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.25, 0.35),
      new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.4 })
    );
    lampArm.position.set(side * 0.4, 12.8, 0);
    group.add(lampArm);

    const cable = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 12, 6),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.7 })
    );
    cable.position.set(side * 1.4, 7.2, 4.2);
    cable.rotation.x = 0.62;
    group.add(cable);
  } else {
    const poleMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.4,
      metalness: 0.7,
    });
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.14, 7.5, 8),
      poleMat
    );
    pole.position.set(side * 0.9, 3.75, 0);
    group.add(pole);

    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 0.12, 0.14),
      poleMat
    );
    arm.position.set(side * 0.05, 7.45, 0);
    group.add(arm);

    const bulb = new THREE.Mesh(
      new THREE.BoxGeometry(0.55, 0.1, 0.25),
      new THREE.MeshBasicMaterial({ color: 0xfef08a })
    );
    bulb.position.set(-side * 0.6, 7.38, 0);
    group.add(bulb);

    if (Math.random() < 0.65) {
      const h = 16 + Math.random() * 22;
      const tex =
        cityTextures && cityTextures.length > 0
          ? cityTextures[Math.floor(Math.random() * cityTextures.length)]
          : undefined;
      const towerMat = tex
        ? new THREE.MeshStandardMaterial({
            map: tex,
            color: 0x64748b,
            emissive: 0x1e293b,
            emissiveIntensity: 0.7,
            roughness: 0.6,
          })
        : new THREE.MeshStandardMaterial({
            color: 0x0f172a,
            roughness: 0.7,
            emissive: 0x1e293b,
            emissiveIntensity: 0.4,
          });
      const tower = new THREE.Mesh(new THREE.BoxGeometry(7.5, h, 8), towerMat);
      tower.position.set(side * (7.2 + Math.random() * 5), h / 2, 0);
      group.add(tower);
    }
  }

  return group;
}

export function buildOverheadGantry(
  biome: BiomeId,
  roadWidth: number
): THREE.Group {
  const group = new THREE.Group();
  const steelMat = new THREE.MeshStandardMaterial({
    color: biome === 'night' ? 0x334155 : 0x94a3b8,
    roughness: 0.42,
    metalness: 0.72,
  });

  const halfSpan = roadWidth / 2 + 0.9;
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 6.2, 0.45),
      steelMat
    );
    leg.position.set(side * halfSpan, 3.1, 0);
    group.add(leg);
  }

  const crossBeam = new THREE.Mesh(
    new THREE.BoxGeometry(halfSpan * 2 + 0.6, 0.55, 0.55),
    steelMat
  );
  crossBeam.position.set(0, 5.9, 0);
  group.add(crossBeam);

  // Highway green/blue overhead directional signboards
  const signMat = new THREE.MeshStandardMaterial({
    color: biome === 'city' || biome === 'coastal' ? 0x0369a1 : 0x15803d,
    roughness: 0.5,
  });
  const signBoard = new THREE.Mesh(
    new THREE.BoxGeometry(roadWidth * 0.58, 1.55, 0.16),
    signMat
  );
  signBoard.position.set(0, 5.75, 0.32);
  group.add(signBoard);

  const arrowStrip = new THREE.Mesh(
    new THREE.PlaneGeometry(roadWidth * 0.52, 0.24),
    new THREE.MeshBasicMaterial({ color: 0xf8fafc })
  );
  arrowStrip.position.set(0, 5.35, 0.41);
  group.add(arrowStrip);

  return group;
}

export function buildRoadworkHazard(): THREE.Group {
  const group = new THREE.Group();
  const orangeMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    roughness: 0.45,
  });
  const whiteMat = new THREE.MeshBasicMaterial({ color: 0xf8fafc });

  // 3 Reflective Traffic Cones across a single lane width
  for (const cx of [-0.75, 0, 0.75]) {
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.24, 0.78, 10),
      orangeMat
    );
    cone.position.set(cx, 0.39, 0);
    cone.castShadow = true;
    group.add(cone);

    const stripe = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.17, 0.16, 10),
      whiteMat
    );
    stripe.position.set(cx, 0.45, 0);
    group.add(stripe);
  }

  // Amber warning beacon bar behind cones
  const barrier = new THREE.Mesh(
    new THREE.BoxGeometry(2.1, 0.34, 0.16),
    new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.5 })
  );
  barrier.position.set(0, 0.56, -0.65);
  group.add(barrier);

  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 10, 8),
    new THREE.MeshBasicMaterial({ color: 0xf59e0b })
  );
  beacon.position.set(0, 0.85, -0.65);
  group.add(beacon);

  return group;
}

export function buildBoostPad(tex: THREE.Texture): THREE.Group {
  const group = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    transparent: true,
    opacity: 0.94,
  });
  const pad = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 5.6), mat);
  pad.rotation.x = -Math.PI / 2;
  pad.position.y = 0.03;
  group.add(pad);
  return group;
}
