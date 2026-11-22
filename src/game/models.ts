import * as THREE from 'three';
import type { BiomeId, CarSpec } from './types';

export interface CockpitRig {
  root: THREE.Group;
  steeringWheelGroup: THREE.Group;
  hoodMesh: THREE.Mesh;
  leftMirrorHousing: THREE.Mesh;
  dashMesh: THREE.Mesh;
  dispose: () => void;
}

export function buildCockpit(
  car: CarSpec,
  dashTexture: THREE.Texture
): CockpitRig {
  const root = new THREE.Group();

  const bodyPaintMat = new THREE.MeshPhysicalMaterial({
    color: car.bodyColor,
    metalness: 0.45,
    roughness: 0.25,
    clearcoat: 1.0,
    clearcoatRoughness: 0.12,
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
    color: 0xd1d5db,
    roughness: 0.18,
    metalness: 0.92,
  });

  const mirrorGlassMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    roughness: 0.06,
    metalness: 0.96,
  });

  const darkGlassMat = new THREE.MeshStandardMaterial({
    color: 0x0b0d12,
    roughness: 0.2,
    metalness: 0.5,
  });

  // 1. Visible Hood (sloped forward outside windshield)
  const hoodGeo = new THREE.BoxGeometry(1.74, 0.08, 1.38);
  const hoodMesh = new THREE.Mesh(hoodGeo, bodyPaintMat);
  hoodMesh.position.set(0.18, -0.31, -1.38);
  hoodMesh.rotation.x = 0.065;
  root.add(hoodMesh);

  // Hood bulge / power dome for muscle/super/hyper cars
  if (car.dashStyle !== 'classic') {
    const domeGeo = new THREE.BoxGeometry(0.68, 0.04, 1.05);
    const dome = new THREE.Mesh(domeGeo, bodyPaintMat);
    dome.position.set(0.18, -0.265, -1.35);
    dome.rotation.x = 0.065;
    root.add(dome);
  }

  // Wiper blades along windshield cowl
  const wiperMat = new THREE.MeshStandardMaterial({
    color: 0x111318,
    roughness: 0.65,
    metalness: 0.2,
  });
  const wiper1 = new THREE.Mesh(
    new THREE.BoxGeometry(0.64, 0.018, 0.025),
    wiperMat
  );
  wiper1.position.set(-0.08, -0.22, -0.78);
  wiper1.rotation.z = 0.04;
  root.add(wiper1);

  const wiper2 = new THREE.Mesh(
    new THREE.BoxGeometry(0.58, 0.018, 0.025),
    wiperMat
  );
  wiper2.position.set(0.56, -0.22, -0.78);
  wiper2.rotation.z = -0.02;
  root.add(wiper2);

  // 2. Main Dashboard Upper & Lower Cowl
  const dashUpper = new THREE.Mesh(
    new THREE.BoxGeometry(2.05, 0.22, 0.58),
    dashMat
  );
  dashUpper.position.set(0.24, -0.31, -0.52);
  root.add(dashUpper);

  const dashLower = new THREE.Mesh(
    new THREE.BoxGeometry(2.05, 0.42, 0.42),
    trimMat
  );
  dashLower.position.set(0.24, -0.58, -0.44);
  root.add(dashLower);

  // Instrument Binnacle Hood
  const binnacle = new THREE.Mesh(
    new THREE.BoxGeometry(0.64, 0.14, 0.24),
    dashMat
  );
  binnacle.position.set(0, -0.15, -0.45);
  root.add(binnacle);

  // Live Illuminated Instrument Cluster Plane
  const clusterMat = new THREE.MeshBasicMaterial({
    map: dashTexture,
  });
  const dashMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(0.58, 0.18),
    clusterMat
  );
  dashMesh.position.set(0, -0.205, -0.355);
  dashMesh.rotation.x = -0.12;
  root.add(dashMesh);

  // Center Infotainment Display (on modern / super / gt / hyper)
  if (car.dashStyle !== 'classic' && car.dashStyle !== 'muscle') {
    const screenFrame = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.18, 0.04),
      darkGlassMat
    );
    screenFrame.position.set(0.52, -0.24, -0.38);
    screenFrame.rotation.y = -0.18;
    root.add(screenFrame);

    const screenGlow = new THREE.Mesh(
      new THREE.PlaneGeometry(0.38, 0.14),
      new THREE.MeshBasicMaterial({ color: car.accentColor })
    );
    screenGlow.position.set(0.52, -0.24, -0.358);
    screenGlow.rotation.y = -0.18;
    root.add(screenGlow);
  }

  // Air vents
  for (let i = 0; i < 2; i++) {
    const vent = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.07, 0.03),
      new THREE.MeshStandardMaterial({ color: 0x0f1116, roughness: 0.9 })
    );
    vent.position.set(0.45 + i * 0.24, -0.34, -0.24);
    root.add(vent);
  }

  // 3. Left & Right A-Pillars + Roof Header + Door Top Sill
  const leftPillar = new THREE.Mesh(
    new THREE.BoxGeometry(0.085, 0.92, 0.11),
    trimMat
  );
  leftPillar.position.set(-0.68, 0.15, -0.48);
  leftPillar.rotation.z = -0.26;
  leftPillar.rotation.x = 0.34;
  root.add(leftPillar);

  const leftPillarOuter = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.9, 0.08),
    bodyPaintMat
  );
  leftPillarOuter.position.set(-0.73, 0.15, -0.5);
  leftPillarOuter.rotation.z = -0.26;
  leftPillarOuter.rotation.x = 0.34;
  root.add(leftPillarOuter);

  const rightPillar = new THREE.Mesh(
    new THREE.BoxGeometry(0.085, 0.92, 0.11),
    trimMat
  );
  rightPillar.position.set(1.04, 0.15, -0.48);
  rightPillar.rotation.z = 0.24;
  rightPillar.rotation.x = 0.34;
  root.add(rightPillar);

  const roofBar = new THREE.Mesh(
    new THREE.BoxGeometry(1.9, 0.09, 0.25),
    trimMat
  );
  roofBar.position.set(0.18, 0.52, -0.24);
  root.add(roofBar);

  // Left door sill
  const doorSill = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.24, 1.05),
    trimMat
  );
  doorSill.position.set(-0.74, -0.44, -0.18);
  root.add(doorSill);

  // 4. Left Side Wing Mirror (iconic Screenshot 1 & 2 detail!)
  const mirrorArm = new THREE.Mesh(
    new THREE.BoxGeometry(0.14, 0.05, 0.07),
    darkGlassMat
  );
  mirrorArm.position.set(-0.79, -0.24, -0.62);
  root.add(mirrorArm);

  const leftMirrorHousing = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.14, 0.11),
    bodyPaintMat
  );
  leftMirrorHousing.position.set(-0.91, -0.22, -0.64);
  leftMirrorHousing.rotation.y = 0.2;
  root.add(leftMirrorHousing);

  const leftMirrorFace = new THREE.Mesh(
    new THREE.PlaneGeometry(0.2, 0.11),
    mirrorGlassMat
  );
  leftMirrorFace.position.set(-0.91, -0.22, -0.582);
  leftMirrorFace.rotation.y = 0.2;
  root.add(leftMirrorFace);

  // 5. Rearview Mirror (top right of windshield)
  const rearStalk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.014, 0.014, 0.12, 8),
    darkGlassMat
  );
  rearStalk.position.set(0.45, 0.45, -0.35);
  root.add(rearStalk);

  const rearFrame = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.095, 0.04),
    darkGlassMat
  );
  rearFrame.position.set(0.45, 0.37, -0.35);
  rearFrame.rotation.y = -0.15;
  root.add(rearFrame);

  const rearGlass = new THREE.Mesh(
    new THREE.PlaneGeometry(0.29, 0.075),
    mirrorGlassMat
  );
  rearGlass.position.set(0.45, 0.37, -0.328);
  rearGlass.rotation.y = -0.15;
  root.add(rearGlass);

  // 6. Steering Wheel + Driver Hands & Forearms
  const steeringWheelGroup = new THREE.Group();
  steeringWheelGroup.position.set(0, -0.3, -0.22);
  steeringWheelGroup.rotation.x = -0.22;

  const wheelLeatherMat = new THREE.MeshStandardMaterial({
    color: 0x191b20,
    roughness: 0.62,
    metalness: 0.15,
  });

  const wheelRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.195, 0.022, 14, 36),
    wheelLeatherMat
  );
  steeringWheelGroup.add(wheelRim);

  // Accent top-center racing stripe on steering wheel
  const topMarker = new THREE.Mesh(
    new THREE.TorusGeometry(0.195, 0.0235, 8, 8, 0.22),
    new THREE.MeshStandardMaterial({
      color: car.accentColor,
      roughness: 0.4,
    })
  );
  topMarker.rotation.z = Math.PI / 2 - 0.11;
  steeringWheelGroup.add(topMarker);

  // Center Hub
  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.068, 0.072, 0.045, 20),
    wheelLeatherMat
  );
  hub.rotation.x = Math.PI / 2;
  steeringWheelGroup.add(hub);

  const emblem = new THREE.Mesh(
    new THREE.CylinderGeometry(0.024, 0.024, 0.048, 16),
    chromeMat
  );
  emblem.rotation.x = Math.PI / 2;
  steeringWheelGroup.add(emblem);

  // 3 Spokes (Left, Right, Bottom)
  const spokeMat = car.dashStyle === 'classic' ? wheelLeatherMat : chromeMat;
  const spokeL = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.036, 0.018),
    spokeMat
  );
  spokeL.position.set(-0.1, -0.015, 0);
  spokeL.rotation.z = 0.12;
  steeringWheelGroup.add(spokeL);

  const spokeR = new THREE.Mesh(
    new THREE.BoxGeometry(0.15, 0.036, 0.018),
    spokeMat
  );
  spokeR.position.set(0.1, -0.015, 0);
  spokeR.rotation.z = -0.12;
  steeringWheelGroup.add(spokeR);

  const spokeB = new THREE.Mesh(
    new THREE.BoxGeometry(0.042, 0.14, 0.018),
    spokeMat
  );
  spokeB.position.set(0, -0.11, 0);
  steeringWheelGroup.add(spokeB);

  // Driver Hands & Forearms gripping 9 and 3 o'clock (just like Screenshots 1 & 2)
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
    handGroup.position.set(side * 0.195, -0.01, 0.015);

    const palm = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.028, 0.045, 6, 10),
      skinMat
    );
    palm.rotation.z = side * 0.2;
    handGroup.add(palm);

    const thumb = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.014, 0.03, 4, 8),
      skinMat
    );
    thumb.position.set(-side * 0.022, 0.025, 0.018);
    thumb.rotation.z = side * 0.65;
    handGroup.add(thumb);

    const forearm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.034, 0.044, 0.28, 12),
      skinMat
    );
    forearm.position.set(side * 0.075, -0.12, 0.11);
    forearm.rotation.x = 0.72;
    forearm.rotation.z = side * 0.45;
    handGroup.add(forearm);

    const sleeve = new THREE.Mesh(
      new THREE.CylinderGeometry(0.046, 0.052, 0.14, 12),
      sleeveMat
    );
    sleeve.position.set(side * 0.125, -0.2, 0.19);
    sleeve.rotation.x = 0.72;
    sleeve.rotation.z = side * 0.45;
    handGroup.add(sleeve);

    return handGroup;
  };

  steeringWheelGroup.add(buildHand(-1));
  steeringWheelGroup.add(buildHand(1));
  root.add(steeringWheelGroup);

  const dispose = () => {
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
    steeringWheelGroup,
    hoodMesh,
    leftMirrorHousing,
    dashMesh,
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

export function buildSceneryItem(biome: BiomeId, side: -1 | 1): THREE.Group {
  const group = new THREE.Group();

  if (biome === 'city') {
    const h = 14 + Math.random() * 24;
    const w = 7 + Math.random() * 5;
    const d = 8 + Math.random() * 5;
    const hue = 0.56 + Math.random() * 0.08;
    const bColor = new THREE.Color().setHSL(hue, 0.14, 0.25 + Math.random() * 0.22);

    const bldg = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      new THREE.MeshStandardMaterial({
        color: bColor,
        roughness: 0.45,
        metalness: 0.35,
      })
    );
    bldg.position.set(side * (4.5 + w / 2), h / 2, 0);
    group.add(bldg);

    // Architectural facade band
    const winBand = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.08, h * 0.8, d * 0.8),
      new THREE.MeshStandardMaterial({
        color: 0x93c5fd,
        roughness: 0.2,
        metalness: 0.7,
      })
    );
    winBand.position.copy(bldg.position);
    group.add(winBand);

    // Sidewalk tree + bollard
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.24, 2.2, 8),
      new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.9 })
    );
    trunk.position.set(side * 1.4, 1.1, 2.5);
    group.add(trunk);

    const crown = new THREE.Mesh(
      new THREE.DodecahedronGeometry(1.5, 0),
      new THREE.MeshStandardMaterial({ color: 0x2f6f3e, roughness: 0.85 })
    );
    crown.position.set(side * 1.4, 3.0, 2.5);
    group.add(crown);

    const bollard = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.12, 0.85, 8),
      new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.5 })
    );
    bollard.position.set(side * 0.5, 0.42, -2.0);
    group.add(bollard);
  } else if (biome === 'mountain') {
    // Tall tiered pine tree (matching Screenshot 2!)
    const scale = 0.85 + Math.random() * 0.7;
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22 * scale, 0.32 * scale, 2.8 * scale, 8),
      new THREE.MeshStandardMaterial({ color: 0x4a3525, roughness: 0.92 })
    );
    trunk.position.set(side * (2.6 + Math.random() * 5), 1.4 * scale, 0);
    group.add(trunk);

    const pineMat = new THREE.MeshStandardMaterial({
      color: 0x1e462a,
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
        0
      );
      group.add(cone);
    }

    // Rock outcrop occasionally
    if (Math.random() < 0.4) {
      const cliff = new THREE.Mesh(
        new THREE.DodecahedronGeometry(3.2, 0),
        new THREE.MeshStandardMaterial({ color: 0x6b665b, roughness: 0.95 })
      );
      cliff.position.set(side * 9.5, 1.4, 2);
      cliff.scale.set(1.6, 1.3, 2.0);
      group.add(cliff);
    }
  } else if (biome === 'desert') {
    if (Math.random() < 0.45) {
      const mesa = new THREE.Mesh(
        new THREE.CylinderGeometry(3.5, 5.8, 11 + Math.random() * 8, 7),
        new THREE.MeshStandardMaterial({ color: 0xa45435, roughness: 0.94 })
      );
      mesa.position.set(side * (8.5 + Math.random() * 6), 5, 0);
      group.add(mesa);
    } else {
      const cactusMat = new THREE.MeshStandardMaterial({
        color: 0x3b7a47,
        roughness: 0.85,
      });
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.32, 3.6, 8),
        cactusMat
      );
      stem.position.set(side * (2.8 + Math.random() * 4), 1.8, 0);
      group.add(stem);

      const arm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.2, 1.4, 8),
        cactusMat
      );
      arm.position.set(stem.position.x + side * 0.55, 2.3, 0);
      arm.rotation.z = side * -0.5;
      group.add(arm);
    }
  } else if (biome === 'coastal') {
    // Bridge suspension pylon & cable
    const pylon = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 14, 1.1),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.5 })
    );
    pylon.position.set(side * 1.4, 6.5, 0);
    group.add(pylon);

    const lampArm = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.25, 0.35),
      new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.4 })
    );
    lampArm.position.set(side * 0.4, 12.8, 0);
    group.add(lampArm);
  } else {
    // Night expressway tall streetlamp + skyline block
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

    if (Math.random() < 0.55) {
      const h = 15 + Math.random() * 20;
      const tower = new THREE.Mesh(
        new THREE.BoxGeometry(7, h, 7),
        new THREE.MeshStandardMaterial({
          color: 0x0f172a,
          roughness: 0.7,
          emissive: 0x1e293b,
          emissiveIntensity: 0.4,
        })
      );
      tower.position.set(side * (7 + Math.random() * 5), h / 2, 0);
      group.add(tower);
    }
  }

  return group;
}
