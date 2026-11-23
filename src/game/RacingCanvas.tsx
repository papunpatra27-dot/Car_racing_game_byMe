import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { RacingAudioEngine } from './audio';
import { BIOMES, CARS, getEffectiveCarStats, getMyCarPipRect } from './data';
import {
  buildBoostPad,
  buildCockpit,
  buildFuelPickup,
  buildOverheadGantry,
  buildRoadworkHazard,
  buildSceneryItem,
  buildTrafficVehicle,
  type CockpitRig,
  type TrafficMeshBundle,
  type TrafficVariant,
} from './models';
import {
  createBoostPadTexture,
  createCheckeredTexture,
  createCityBuildingTextures,
  createRoadTexture,
  DashboardRenderer,
} from './textures';
import type {
  BiomeId,
  CameraPreset,
  CarUpgrades,
  GameStatus,
  InputState,
  LevelConfig,
  LiveTelemetry,
} from './types';

interface RacingCanvasProps {
  carId: string;
  upgrades: CarUpgrades;
  level: LevelConfig | null;
  endlessBiome: BiomeId;
  status: GameStatus;
  cameraPreset: CameraPreset;
  showMiniCar?: boolean;
  runNonce: number;
  inputRef: React.MutableRefObject<InputState>;
  audio: RacingAudioEngine;
  onTelemetry: (telemetry: LiveTelemetry) => void;
  onRaceEnd: (
    outcome: 'won' | 'crashed' | 'out_of_fuel',
    finalTelemetry: LiveTelemetry
  ) => void;
}

interface TrafficEntity {
  bundle: TrafficMeshBundle;
  lane: number;
  targetLane: number;
  x: number;
  z: number;
  speedMps: number;
  isOncoming: boolean;
  closePassAwarded: boolean;
  hornReactionTimer: number;
}

interface FuelEntity {
  group: THREE.Group;
  x: number;
  z: number;
  active: boolean;
}

interface BoostPadEntity {
  group: THREE.Group;
  x: number;
  z: number;
  active: boolean;
  triggered: boolean;
}

interface HazardEntity {
  group: THREE.Group;
  x: number;
  z: number;
  active: boolean;
  hit: boolean;
}

interface SceneryPair {
  left: THREE.Group;
  right: THREE.Group;
  z: number;
}

interface GantryEntity {
  group: THREE.Group;
  z: number;
}

const LANE_WIDTH = 3.6;
const ROAD_Z_START = 20;
const ROAD_LEN = 260;
const ROAD_SEGMENTS = 65; // 4m per slice
const SLICE_STEP = ROAD_LEN / ROAD_SEGMENTS;

export const RacingCanvas: React.FC<RacingCanvasProps> = ({
  carId,
  upgrades,
  level,
  endlessBiome,
  status,
  cameraPreset,
  showMiniCar = true,
  runNonce,
  inputRef,
  audio,
  onTelemetry,
  onRaceEnd,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const propsRef = useRef({
    carId,
    upgrades,
    level,
    endlessBiome,
    status,
    cameraPreset,
    showMiniCar,
    audio,
    onTelemetry,
    onRaceEnd,
  });
  propsRef.current = {
    carId,
    upgrades,
    level,
    endlessBiome,
    status,
    cameraPreset,
    showMiniCar,
    audio,
    onTelemetry,
    onRaceEnd,
  };

  const simRef = useRef({
    speedMps: 18,
    rpm: 2100,
    gear: 2,
    fuel: 100,
    fuelPct: 100,
    integrityPct: 100,
    distanceM: 0,
    score: 0,
    sessionCoins: 0,
    closePasses: 0,
    playerX: 1.8,
    steerVisual: 0,
    cameraRoll: 0,
    shakeIntensity: 0,
    invulnTimer: 0,
    boostPadTimer: 0,
    eventText: null as string | null,
    eventTone: 'info' as 'info' | 'bonus' | 'warn',
    eventTimer: 0,
    raceEnded: false,
    nextFuelDistanceM: 380,
    nextBoostDistanceM: 220,
    nextHazardDistanceM: 310,
    lastRunNonce: -1,
    activeCarId: '',
    activeBiomeKey: '',
    activeLanesKey: '',
  });

  useEffect(() => {
    const s = simRef.current;
    if (runNonce !== s.lastRunNonce) {
      s.lastRunNonce = runNonce;
      const car = CARS.find((c) => c.id === carId) ?? CARS[0];
      const stats = getEffectiveCarStats(car, upgrades);
      const lanes = level ? level.lanes : 4;
      s.speedMps = status === 'playing' ? 14 : 20;
      s.rpm = 2200;
      s.gear = 2;
      s.fuel = stats.fuelCapacity;
      s.fuelPct = 100;
      s.integrityPct = 100;
      s.distanceM = 0;
      s.score = 0;
      s.sessionCoins = 0;
      s.closePasses = 0;
      s.playerX = lanes === 4 ? LANE_WIDTH * 0.5 : 0;
      s.steerVisual = 0;
      s.cameraRoll = 0;
      s.shakeIntensity = 0;
      s.invulnTimer = 0;
      s.boostPadTimer = 0;
      s.eventText = null;
      s.eventTimer = 0;
      s.raceEnded = false;
      s.nextFuelDistanceM = 360;
      s.nextBoostDistanceM = 200;
      s.nextHazardDistanceM = 290;
    }
  }, [runNonce, carId, upgrades, level, status]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      try {
        const probe = document.createElement('canvas').getContext('webgl2');
        if (!probe) return true;
        const ext = probe.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : probe.RENDERER;
        const gpu = String(probe.getParameter(param));
        probe.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2)
    );
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.autoClear = false;
    renderer.setSize(
      container.clientWidth || window.innerWidth,
      container.clientHeight || window.innerHeight
    );
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    container.appendChild(renderer.domElement);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      68,
      (container.clientWidth || window.innerWidth) /
        (container.clientHeight || window.innerHeight),
      0.08,
      360
    );
    const pipCamera = new THREE.PerspectiveCamera(46, 1.38, 0.1, 260);

    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(
      new RoomEnvironment(),
      0.04
    ).texture;
    scene.environment = envTex;
    pmremGenerator.dispose();

    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x3f4f38, 0.95);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfffbeb, 1.75);
    sunLight.position.set(28, 46, 18);
    sunLight.castShadow = !isSoftwareGl;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 2;
    sunLight.shadow.camera.far = 140;
    const dShadow = 32;
    sunLight.shadow.camera.left = -dShadow;
    sunLight.shadow.camera.right = dShadow;
    sunLight.shadow.camera.top = dShadow;
    sunLight.shadow.camera.bottom = -dShadow;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.02;
    scene.add(sunLight);

    const dashLight = new THREE.PointLight(0xffffff, 0.85, 4);
    const playerGroup = new THREE.Group();
    scene.add(playerGroup);
    playerGroup.add(camera);
    playerGroup.add(pipCamera);
    dashLight.position.set(0, 1.38, 0.08);
    playerGroup.add(dashLight);

    // Cached shared architectural & boost textures
    const cityTextures = createCityBuildingTextures(maxAniso);
    const boostTex = createBoostPadTexture(maxAniso);

    // Deformable Ground, Road & Guardrails (65 slices for smooth curves + hills)
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x5c6b43,
      roughness: 0.95,
    });
    const groundGeo = new THREE.PlaneGeometry(460, ROAD_LEN, 14, ROAD_SEGMENTS);
    groundGeo.rotateX(-Math.PI / 2);
    groundGeo.translate(0, -0.1, ROAD_Z_START - ROAD_LEN / 2);
    const groundBasePos = new Float32Array(groundGeo.attributes.position.array);
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.receiveShadow = true;
    groundMesh.frustumCulled = false;
    scene.add(groundMesh);

    const roadMat = new THREE.MeshStandardMaterial({
      roughness: 0.84,
      metalness: 0.05,
    });
    let roadGeo = new THREE.PlaneGeometry(14.4, ROAD_LEN, 6, ROAD_SEGMENTS);
    roadGeo.rotateX(-Math.PI / 2);
    roadGeo.translate(0, 0, ROAD_Z_START - ROAD_LEN / 2);
    let roadBasePos = new Float32Array(roadGeo.attributes.position.array);
    const roadMesh = new THREE.Mesh(roadGeo, roadMat);
    roadMesh.receiveShadow = true;
    roadMesh.frustumCulled = false;
    scene.add(roadMesh);

    const railMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.4,
      metalness: 0.65,
    });
    const leftRailGeo = new THREE.BoxGeometry(0.16, 0.42, ROAD_LEN, 1, 1, ROAD_SEGMENTS);
    leftRailGeo.translate(0, 0.45, ROAD_Z_START - ROAD_LEN / 2);
    const leftRailBase = new Float32Array(leftRailGeo.attributes.position.array);
    const leftRail = new THREE.Mesh(leftRailGeo, railMat);
    leftRail.frustumCulled = false;
    scene.add(leftRail);

    const rightRailGeo = new THREE.BoxGeometry(0.16, 0.42, ROAD_LEN, 1, 1, ROAD_SEGMENTS);
    rightRailGeo.translate(0, 0.45, ROAD_Z_START - ROAD_LEN / 2);
    const rightRailBase = new Float32Array(rightRailGeo.attributes.position.array);
    const rightRail = new THREE.Mesh(rightRailGeo, railMat);
    rightRail.frustumCulled = false;
    scene.add(rightRail);

    // Guardrail posts (InstancedMesh)
    const postCount = 48;
    const postGeo = new THREE.BoxGeometry(0.12, 0.72, 0.12);
    const postMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.6,
      metalness: 0.5,
    });
    const postsInstanced = new THREE.InstancedMesh(postGeo, postMat, postCount);
    postsInstanced.frustumCulled = false;
    scene.add(postsInstanced);

    // Finish Line Gantry
    const finishGroup = new THREE.Group();
    const finishBannerMat = new THREE.MeshBasicMaterial({
      map: createCheckeredTexture(maxAniso),
    });
    const finishPillarL = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 6.2, 0.45),
      railMat
    );
    const finishPillarR = new THREE.Mesh(
      new THREE.BoxGeometry(0.45, 6.2, 0.45),
      railMat
    );
    const finishSign = new THREE.Mesh(
      new THREE.BoxGeometry(15, 1.5, 0.35),
      finishBannerMat
    );
    finishSign.position.y = 5.4;
    finishGroup.add(finishPillarL, finishPillarR, finishSign);
    finishGroup.visible = false;
    scene.add(finishGroup);

    // Dashboard & Player Car Rig
    const dashRenderer = new DashboardRenderer(maxAniso);
    let cockpitRig: CockpitRig | null = null;
    let currentRoadTex: THREE.CanvasTexture | null = null;

    // Entities
    let trafficList: TrafficEntity[] = [];
    let sceneryList: SceneryPair[] = [];
    let gantryList: GantryEntity[] = [];

    const fuelGroup = buildFuelPickup();
    fuelGroup.visible = false;
    scene.add(fuelGroup);
    const fuelEntity: FuelEntity = {
      group: fuelGroup,
      x: 0,
      z: -150,
      active: false,
    };

    const boostPadGroup = buildBoostPad(boostTex);
    boostPadGroup.visible = false;
    scene.add(boostPadGroup);
    const boostEntity: BoostPadEntity = {
      group: boostPadGroup,
      x: 0,
      z: -150,
      active: false,
      triggered: false,
    };

    const hazardGroup = buildRoadworkHazard();
    hazardGroup.visible = false;
    scene.add(hazardGroup);
    const hazardEntity: HazardEntity = {
      group: hazardGroup,
      x: 0,
      z: -160,
      active: false,
      hit: false,
    };

    const dummyObj = new THREE.Object3D();

    // Precomputed curve slice arrays for fast O(1) lookup every frame
    const sliceX = new Float32Array(ROAD_SEGMENTS + 1);
    const sliceY = new Float32Array(ROAD_SEGMENTS + 1);
    const sliceAngle = new Float32Array(ROAD_SEGMENTS + 1);
    const PLAYER_SLICE = Math.round(ROAD_Z_START / SLICE_STEP); // index 5 -> z = 0

    const getCurvature = (d: number, curveScale: number) => {
      if (curveScale <= 0.01) return 0;
      const fade = Math.min(1, Math.max(0, (d - 35) / 75));
      const c1 = Math.sin(d * 0.0085) * 0.0032;
      const c2 = Math.sin(d * 0.021 + 1.15) * 0.0021;
      return (c1 + c2) * curveScale * fade;
    };

    const getRoadSlope = (d: number, hillScale: number) => {
      if (hillScale <= 0.01) return 0;
      const fade = Math.min(1, Math.max(0, (d - 25) / 65));
      return (
        (Math.sin(d * 0.014) * 0.048 + Math.cos(d * 0.029) * 0.024) *
        hillScale *
        fade
      );
    };

    const computeRoadSlices = (
      distM: number,
      curveScale: number,
      hillScale: number
    ) => {
      sliceX[PLAYER_SLICE] = 0;
      sliceY[PLAYER_SLICE] = 0;
      sliceAngle[PLAYER_SLICE] = 0;

      // Forward slices (PLAYER_SLICE + 1 .. ROAD_SEGMENTS)
      let ang = 0;
      let cx = 0;
      let cy = 0;
      for (let i = PLAYER_SLICE + 1; i <= ROAD_SEGMENTS; i++) {
        const ahead = (i - PLAYER_SLICE) * SLICE_STEP;
        const k = getCurvature(distM + ahead, curveScale);
        const sl = getRoadSlope(distM + ahead, hillScale);
        ang = THREE.MathUtils.clamp(ang + k * SLICE_STEP, -0.78, 0.78);
        cx += Math.sin(ang) * SLICE_STEP;
        cy += sl * SLICE_STEP;
        sliceX[i] = cx;
        sliceY[i] = cy;
        sliceAngle[i] = ang;
      }

      // Backward slices (PLAYER_SLICE - 1 .. 0)
      ang = 0;
      cx = 0;
      cy = 0;
      for (let i = PLAYER_SLICE - 1; i >= 0; i--) {
        const ahead = (i - PLAYER_SLICE) * SLICE_STEP;
        const k = getCurvature(Math.max(0, distM + ahead), curveScale);
        const sl = getRoadSlope(Math.max(0, distM + ahead), hillScale);
        ang = THREE.MathUtils.clamp(ang - k * SLICE_STEP, -0.78, 0.78);
        cx -= Math.sin(ang) * SLICE_STEP;
        cy -= sl * SLICE_STEP;
        sliceX[i] = cx;
        sliceY[i] = cy;
        sliceAngle[i] = ang;
      }
    };

    const sampleCurve = (z: number) => {
      const f = THREE.MathUtils.clamp(
        (ROAD_Z_START - z) / SLICE_STEP,
        0,
        ROAD_SEGMENTS - 0.001
      );
      const i0 = Math.floor(f);
      const i1 = Math.min(ROAD_SEGMENTS, i0 + 1);
      const t = f - i0;
      return {
        x: sliceX[i0] + (sliceX[i1] - sliceX[i0]) * t,
        y: sliceY[i0] + (sliceY[i1] - sliceY[i0]) * t,
        angle: sliceAngle[i0] + (sliceAngle[i1] - sliceAngle[i0]) * t,
      };
    };

    const deformRoadEnvironment = (roadHalf: number) => {
      const rPos = roadGeo.attributes.position;
      for (let i = 0; i < rPos.count; i++) {
        const ox = roadBasePos[i * 3];
        const oz = roadBasePos[i * 3 + 2];
        const c = sampleCurve(oz);
        rPos.setXYZ(
          i,
          c.x + ox * Math.cos(c.angle),
          c.y,
          oz - ox * Math.sin(c.angle)
        );
      }
      rPos.needsUpdate = true;

      const gPos = groundGeo.attributes.position;
      for (let i = 0; i < gPos.count; i++) {
        const ox = groundBasePos[i * 3];
        const oy = groundBasePos[i * 3 + 1];
        const oz = groundBasePos[i * 3 + 2];
        const c = sampleCurve(oz);
        gPos.setXYZ(i, c.x + ox, c.y + oy, oz);
      }
      gPos.needsUpdate = true;

      const railDist = roadHalf + 0.45;
      const lrPos = leftRailGeo.attributes.position;
      const rrPos = rightRailGeo.attributes.position;
      for (let i = 0; i < lrPos.count; i++) {
        const oxL = leftRailBase[i * 3] - railDist;
        const oyL = leftRailBase[i * 3 + 1];
        const ozL = leftRailBase[i * 3 + 2];
        const cL = sampleCurve(ozL);
        lrPos.setXYZ(
          i,
          cL.x + oxL * Math.cos(cL.angle),
          cL.y + oyL,
          ozL - oxL * Math.sin(cL.angle)
        );

        const oxR = rightRailBase[i * 3] + railDist;
        const oyR = rightRailBase[i * 3 + 1];
        const ozR = rightRailBase[i * 3 + 2];
        const cR = sampleCurve(ozR);
        rrPos.setXYZ(
          i,
          cR.x + oxR * Math.cos(cR.angle),
          cR.y + oyR,
          ozR - oxR * Math.sin(cR.angle)
        );
      }
      lrPos.needsUpdate = true;
      rrPos.needsUpdate = true;
    };

    const clearGroupArray = (items: THREE.Object3D[]) => {
      items.forEach((item) => {
        scene.remove(item);
        item.traverse((c) => {
          if ((c as THREE.Mesh).isMesh) {
            const m = c as THREE.Mesh;
            m.geometry?.dispose();
            if (Array.isArray(m.material)) {
              m.material.forEach((mat) => mat.dispose());
            } else {
              m.material?.dispose();
            }
          }
        });
      });
    };

    const syncCarCockpit = () => {
      const { carId: cid } = propsRef.current;
      if (simRef.current.activeCarId === cid && cockpitRig) return;
      simRef.current.activeCarId = cid;
      if (cockpitRig) {
        playerGroup.remove(cockpitRig.root);
        cockpitRig.dispose();
      }
      const spec = CARS.find((c) => c.id === cid) ?? CARS[0];
      cockpitRig = buildCockpit(spec, dashRenderer.texture);
      cockpitRig.root.position.set(0, 1.18, 0.16);
      playerGroup.add(cockpitRig.root);
    };

    const syncEnvironmentAndTraffic = () => {
      const { level: lvl, endlessBiome: eb } = propsRef.current;
      const biomeId = lvl ? lvl.biome : eb;
      const lanes = lvl ? lvl.lanes : 4;
      const twoWay = lvl ? lvl.twoWayTraffic : false;
      const biome = BIOMES[biomeId];
      const lanesKey = `${lanes}-${twoWay}-${biomeId}`;

      if (simRef.current.activeBiomeKey !== biomeId) {
        simRef.current.activeBiomeKey = biomeId;
        scene.background = new THREE.Color(biome.skyColor);
        renderer.setClearColor(biome.skyColor, 1);
        scene.fog = new THREE.FogExp2(biome.fogColor, biome.fogDensity);
        hemiLight.color.setHex(biome.ambientSky);
        hemiLight.groundColor.setHex(biome.ambientGround);
        sunLight.color.setHex(biome.sunColor);
        sunLight.intensity = biome.sunIntensity;
        groundMat.color.setHex(biome.groundColor);

        const oldScenery: THREE.Object3D[] = [];
        sceneryList.forEach((p) => oldScenery.push(p.left, p.right));
        clearGroupArray(oldScenery);
        sceneryList = [];

        const roadHalf = (lanes * LANE_WIDTH) / 2;
        for (let i = 0; i < 16; i++) {
          const z = -i * 16.5;
          const left = buildSceneryItem(biomeId, -1, cityTextures);
          const right = buildSceneryItem(biomeId, 1, cityTextures);
          left.position.set(-roadHalf - 0.8, 0, z);
          right.position.set(roadHalf + 0.8, 0, z);
          scene.add(left, right);
          sceneryList.push({ left, right, z });
        }

        // Rebuild overhead highway gantries
        clearGroupArray(gantryList.map((g) => g.group));
        gantryList = [];
        const roadW = lanes * LANE_WIDTH;
        for (let i = 0; i < 3; i++) {
          const gGroup = buildOverheadGantry(biomeId, roadW);
          const gz = -65 - i * 85;
          gGroup.position.set(0, 0, gz);
          scene.add(gGroup);
          gantryList.push({ group: gGroup, z: gz });
        }
      }

      if (simRef.current.activeLanesKey !== lanesKey) {
        simRef.current.activeLanesKey = lanesKey;
        const roadWidth = lanes * LANE_WIDTH;

        roadGeo.dispose();
        roadGeo = new THREE.PlaneGeometry(roadWidth, ROAD_LEN, 6, ROAD_SEGMENTS);
        roadGeo.rotateX(-Math.PI / 2);
        roadGeo.translate(0, 0, ROAD_Z_START - ROAD_LEN / 2);
        roadBasePos = new Float32Array(roadGeo.attributes.position.array);
        roadMesh.geometry = roadGeo;

        currentRoadTex?.dispose();
        currentRoadTex = createRoadTexture(
          lanes,
          twoWay,
          biome.asphaltColor,
          biome.centerLineColor,
          maxAniso
        );
        roadMat.map = currentRoadTex;
        roadMat.needsUpdate = true;

        finishPillarL.position.set(-roadWidth / 2 - 0.2, 3.1, 0);
        finishPillarR.position.set(roadWidth / 2 + 0.2, 3.1, 0);
        finishSign.scale.x = roadWidth / 14.4;

        clearGroupArray(trafficList.map((t) => t.bundle.group));
        trafficList = [];

        const density = lvl ? lvl.trafficDensity : 13;
        const variants: TrafficVariant[] = [
          'sedan',
          'hatch',
          'van',
          'pickup',
          'truck',
        ];
        const baseTrafficSpeed = (lvl ? lvl.trafficSpeedKmh : 92) / 3.6;

        for (let i = 0; i < density; i++) {
          const v = variants[i % variants.length];
          const bundle = buildTrafficVehicle(v, biome.isNight);
          const lane = i % lanes;
          const isOncoming = twoWay && lane < Math.floor(lanes / 2);
          const laneX = (lane - (lanes - 1) / 2) * LANE_WIDTH;
          const z = -42 - i * (185 / density) - Math.random() * 8;
          bundle.group.position.set(laneX, 0, z);
          bundle.group.rotation.y = isOncoming ? Math.PI : 0;
          scene.add(bundle.group);

          trafficList.push({
            bundle,
            lane,
            targetLane: lane,
            x: laneX,
            z,
            speedMps: baseTrafficSpeed * (0.82 + Math.random() * 0.36),
            isOncoming,
            closePassAwarded: false,
            hornReactionTimer: 0,
          });
        }
      }
    };

    syncCarCockpit();
    syncEnvironmentAndTraffic();

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);

    const clock = new THREE.Clock();
    let frameId = 0;
    let disposed = false;
    let lastTelemetryPush = 0;

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const laneCenterX = (lane: number, lanes: 3 | 4) =>
      (lane - (lanes - 1) / 2) * LANE_WIDTH;

    const triggerEvent = (
      text: string,
      tone: 'info' | 'bonus' | 'warn',
      duration = 1.3
    ) => {
      simRef.current.eventText = text;
      simRef.current.eventTone = tone;
      simRef.current.eventTimer = duration;
    };

    function tick() {
      if (disposed) return;
      const dt = Math.min(clock.getDelta(), 0.05);
      const s = simRef.current;
      const {
        carId: cid,
        upgrades: upg,
        level: lvl,
        status: st,
        cameraPreset: camPreset,
        audio: aud,
        onTelemetry: emitTelemetry,
        onRaceEnd: emitRaceEnd,
      } = propsRef.current;

      syncCarCockpit();
      syncEnvironmentAndTraffic();

      const car = CARS.find((c) => c.id === cid) ?? CARS[0];
      const stats = getEffectiveCarStats(car, upg);
      const lanes: 3 | 4 = lvl ? lvl.lanes : 4;
      const twoWay = lvl ? lvl.twoWayTraffic : false;
      const roadHalf = (lanes * LANE_WIDTH) / 2;
      const curveIntensity = lvl ? lvl.curveIntensity : 0.72;
      const hillIntensity = lvl ? lvl.hillIntensity : 0.55;
      const hasRoadwork = lvl ? lvl.hasRoadwork : true;
      const inp = inputRef.current;

      const isPlaying = st === 'playing';
      const isMenuAttract = st === 'menu';
      const isPaused = st === 'paused';

      // Compute current curved & hilly road profile ahead
      computeRoadSlices(s.distanceM, curveIntensity, hillIntensity);
      deformRoadEnvironment(roadHalf);

      if (!isPaused) {
        const maxSpeedMps = stats.topSpeedKmh / 3.6;

        if (isMenuAttract) {
          const targetCruise = 24;
          s.speedMps = THREE.MathUtils.damp(s.speedMps, targetCruise, 2.5, dt);
          const targetX = laneCenterX(lanes === 4 ? 2 : 1, lanes);
          s.playerX = THREE.MathUtils.damp(s.playerX, targetX, 2.2, dt);
          s.steerVisual = THREE.MathUtils.damp(s.steerVisual, 0, 5, dt);
          s.distanceM += s.speedMps * dt;
          aud.setHorn(false);
        } else if (isPlaying && !s.raceEnded) {
          if (s.boostPadTimer > 0) s.boostPadTimer -= dt;

          const hasFuel = s.fuel > 0;
          const activeBoost = inp.boost || s.boostPadTimer > 0;
          if (inp.brake) {
            s.speedMps = Math.max(0, s.speedMps - stats.braking * dt);
          } else if (inp.throttle && hasFuel) {
            const boostMult = activeBoost ? 1.28 : 1.0;
            const speedRatio = s.speedMps / maxSpeedMps;
            const torqueCurve = Math.max(0.18, 1.0 - speedRatio * 0.72);
            s.speedMps = Math.min(
              maxSpeedMps * (activeBoost ? 1.12 : 1.0),
              s.speedMps + stats.accel * torqueCurve * boostMult * dt
            );
          } else if (s.boostPadTimer > 0) {
            s.speedMps = Math.min(maxSpeedMps * 1.12, s.speedMps + 18 * dt);
          } else {
            const drag = hasFuel ? 3.8 : 6.2;
            s.speedMps = Math.max(0, s.speedMps - drag * dt);
          }

          // Steering + gentle realistic centrifugal drift in bends
          const steerAuthority = Math.min(1.0, 0.25 + s.speedMps / 16);
          const curK = getCurvature(s.distanceM, curveIntensity);
          const centrifugalDrift = -curK * s.speedMps * s.speedMps * 0.16;
          s.playerX +=
            (inp.steer * stats.handling * steerAuthority + centrifugalDrift) *
            dt;

          const maxLateral = roadHalf - 0.92;
          if (s.playerX < -maxLateral) {
            s.playerX = -maxLateral;
            if (s.speedMps > 12) {
              s.speedMps *= 0.96;
              s.shakeIntensity = Math.max(s.shakeIntensity, 0.025);
            }
          } else if (s.playerX > maxLateral) {
            s.playerX = maxLateral;
            if (s.speedMps > 12) {
              s.speedMps *= 0.96;
              s.shakeIntensity = Math.max(s.shakeIntensity, 0.025);
            }
          }

          s.steerVisual = THREE.MathUtils.damp(
            s.steerVisual,
            inp.steer * 0.78,
            10,
            dt
          );

          aud.setHorn(inp.horn);

          // Fuel consumption
          const drainBase = lvl ? lvl.fuelDrainFactor : 0.95;
          const rpmNorm = Math.min(1, s.rpm / 7600);
          const burnRate =
            (inp.throttle ? 0.55 + rpmNorm * 0.85 : 0.14) *
            drainBase *
            stats.fuelBurnMultiplier;
          s.fuel = Math.max(0, s.fuel - burnRate * dt);
          s.fuelPct = (s.fuel / stats.fuelCapacity) * 100;

          if (s.fuel <= 0 && s.speedMps < 1.2) {
            s.raceEnded = true;
            aud.setHorn(false);
            const finalTel: LiveTelemetry = {
              speedKmh: 0,
              rpm: 0,
              gear: 1,
              fuelPct: 0,
              integrityPct: s.integrityPct,
              distanceM: s.distanceM,
              targetDistanceM: lvl ? lvl.targetDistanceM : 0,
              score: Math.round(s.score),
              sessionCoins: Math.round(s.sessionCoins),
              closePasses: s.closePasses,
              levelNumber: lvl ? lvl.levelNumber : 0,
              status: 'out_of_fuel',
              eventText: 'OUT OF FUEL',
              eventTone: 'warn',
            };
            emitRaceEnd('out_of_fuel', finalTel);
          }

          const deltaDist = s.speedMps * dt;
          s.distanceM += deltaDist;

          const speedKmh = s.speedMps * 3.6;
          const oncomingBonus =
            twoWay && s.playerX < 0 && speedKmh > 60 ? 2.0 : 1.0;
          const speedBonus = speedKmh > 100 ? 1 + (speedKmh - 100) / 140 : 0.5;
          s.score +=
            deltaDist *
            1.4 *
            car.scoreMultiplier *
            speedBonus *
            oncomingBonus;
          s.sessionCoins += deltaDist * 0.028 * car.scoreMultiplier;

          if (lvl && s.distanceM >= lvl.targetDistanceM && !s.raceEnded) {
            s.raceEnded = true;
            aud.setHorn(false);
            aud.playWin();
            const finalTel: LiveTelemetry = {
              speedKmh: Math.round(speedKmh),
              rpm: Math.round(s.rpm),
              gear: s.gear,
              fuelPct: s.fuelPct,
              integrityPct: s.integrityPct,
              distanceM: lvl.targetDistanceM,
              targetDistanceM: lvl.targetDistanceM,
              score: Math.round(s.score),
              sessionCoins: Math.round(s.sessionCoins + lvl.coinReward),
              closePasses: s.closePasses,
              levelNumber: lvl.levelNumber,
              status: 'won',
              eventText: 'FINISH!',
              eventTone: 'bonus',
            };
            emitRaceEnd('won', finalTel);
          }
        } else {
          aud.setHorn(false);
        }

        // Gear & RPM Simulation
        const speedKmh = s.speedMps * 3.6;
        const speedNorm = Math.min(1, s.speedMps / maxSpeedMps);
        const gearCount = 6;
        const rawGear = Math.min(
          gearCount,
          Math.max(1, Math.floor(speedNorm * gearCount) + 1)
        );
        s.gear = speedKmh < 4 ? 1 : rawGear;
        const gearMin = (s.gear - 1) / gearCount;
        const gearSpan = 1 / gearCount;
        const gearProgress = Math.max(
          0,
          Math.min(1, (speedNorm - gearMin) / gearSpan)
        );
        const targetRpm =
          speedKmh < 3
            ? 850 + (inp.throttle ? 1800 : 0)
            : 2100 + gearProgress * 5400;
        s.rpm = THREE.MathUtils.damp(s.rpm, targetRpm, 9, dt);

        aud.updateEngine(
          s.rpm,
          inp.throttle || isMenuAttract,
          car.enginePitch,
          isPlaying
        );

        // Scroll Road Texture
        if (currentRoadTex) {
          currentRoadTex.offset.y -= (s.speedMps * dt) / 13.0;
        }

        // Scroll Guardrail Posts along curve
        const postSpacing = 12.5;
        const postOffset = s.distanceM % postSpacing;
        let pIdx = 0;
        for (let i = 0; i < postCount / 2; i++) {
          const z = 14 - i * postSpacing + postOffset;
          const c = sampleCurve(z);
          const cosA = Math.cos(c.angle);
          const sinA = Math.sin(c.angle);

          const lxL = -roadHalf - 0.52;
          dummyObj.position.set(c.x + lxL * cosA, c.y + 0.36, z - lxL * sinA);
          dummyObj.rotation.set(0, -c.angle, 0);
          dummyObj.updateMatrix();
          postsInstanced.setMatrixAt(pIdx++, dummyObj.matrix);

          const lxR = roadHalf + 0.52;
          dummyObj.position.set(c.x + lxR * cosA, c.y + 0.36, z - lxR * sinA);
          dummyObj.rotation.set(0, -c.angle, 0);
          dummyObj.updateMatrix();
          postsInstanced.setMatrixAt(pIdx++, dummyObj.matrix);
        }
        postsInstanced.instanceMatrix.needsUpdate = true;

        // Scroll Scenery aligned with curved & hilly terrain
        for (let i = 0; i < sceneryList.length; i++) {
          const pair = sceneryList[i];
          pair.z += s.speedMps * dt;
          if (pair.z > 20) {
            pair.z -= sceneryList.length * 16.5;
          }
          const c = sampleCurve(pair.z);
          const cosA = Math.cos(c.angle);
          const sinA = Math.sin(c.angle);
          const off = roadHalf + 0.65;

          pair.left.position.set(c.x - off * cosA, c.y, pair.z + off * sinA);
          pair.left.rotation.y = -c.angle;

          pair.right.position.set(c.x + off * cosA, c.y, pair.z - off * sinA);
          pair.right.rotation.y = -c.angle;
        }

        // Scroll Overhead Highway Gantries
        for (let i = 0; i < gantryList.length; i++) {
          const g = gantryList[i];
          g.z += s.speedMps * dt;
          if (g.z > 18) {
            g.z -= gantryList.length * 85;
          }
          const c = sampleCurve(g.z);
          g.group.position.set(c.x, c.y, g.z);
          g.group.rotation.y = -c.angle;
        }

        // Finish Line Positioning
        if (lvl) {
          const distToFinish = lvl.targetDistanceM - s.distanceM;
          if (distToFinish < 235 && distToFinish > -20) {
            finishGroup.visible = true;
            const zFin = -distToFinish;
            const c = sampleCurve(zFin);
            finishGroup.position.set(c.x, c.y, zFin);
            finishGroup.rotation.y = -c.angle;
          } else {
            finishGroup.visible = false;
          }
        } else {
          finishGroup.visible = false;
        }

        // Fuel Pickup, Turbo Boost Pad & Roadwork Cones
        if (isPlaying && !s.raceEnded) {
          // 1. Fuel Canister
          if (!fuelEntity.active && s.distanceM >= s.nextFuelDistanceM) {
            fuelEntity.active = true;
            const spawnLane = Math.floor(Math.random() * lanes);
            fuelEntity.x = laneCenterX(spawnLane, lanes);
            fuelEntity.z = -195;
            fuelEntity.group.visible = true;
            s.nextFuelDistanceM = s.distanceM + 350 + Math.random() * 140;
          }

          if (fuelEntity.active) {
            fuelEntity.z += s.speedMps * dt;
            const c = sampleCurve(fuelEntity.z);
            fuelEntity.group.position.set(
              c.x + fuelEntity.x * Math.cos(c.angle),
              c.y,
              fuelEntity.z - fuelEntity.x * Math.sin(c.angle)
            );
            fuelEntity.group.rotation.y += dt * 2.2;

            if (
              Math.abs(fuelEntity.z - -0.3) < 2.2 &&
              Math.abs(fuelEntity.x - s.playerX) < 1.55
            ) {
              fuelEntity.active = false;
              fuelEntity.group.visible = false;
              s.fuel = Math.min(
                stats.fuelCapacity,
                s.fuel + stats.fuelCapacity * 0.28
              );
              s.fuelPct = (s.fuel / stats.fuelCapacity) * 100;
              aud.playPickup('fuel');
              triggerEvent('FUEL +28%', 'bonus', 1.2);
            } else if (fuelEntity.z > 14) {
              fuelEntity.active = false;
              fuelEntity.group.visible = false;
            }
          }

          // 2. Highway Speed Boost Chevron Pad
          if (!boostEntity.active && s.distanceM >= s.nextBoostDistanceM) {
            boostEntity.active = true;
            boostEntity.triggered = false;
            const startLane = twoWay ? Math.floor(lanes / 2) : 0;
            const lane = startLane + Math.floor(Math.random() * (lanes - startLane));
            boostEntity.x = laneCenterX(lane, lanes);
            boostEntity.z = -190;
            boostEntity.group.visible = true;
            s.nextBoostDistanceM = s.distanceM + 310 + Math.random() * 140;
          }

          if (boostEntity.active) {
            boostEntity.z += s.speedMps * dt;
            const c = sampleCurve(boostEntity.z);
            boostEntity.group.position.set(
              c.x + boostEntity.x * Math.cos(c.angle),
              c.y + 0.02,
              boostEntity.z - boostEntity.x * Math.sin(c.angle)
            );
            boostEntity.group.rotation.y = -c.angle;

            if (
              !boostEntity.triggered &&
              Math.abs(boostEntity.z - -0.3) < 2.6 &&
              Math.abs(boostEntity.x - s.playerX) < 1.45
            ) {
              boostEntity.triggered = true;
              s.boostPadTimer = 1.6;
              s.score += Math.round(120 * car.scoreMultiplier);
              aud.playBoostPad();
              triggerEvent('TURBO STRIP +120', 'bonus', 1.1);
            } else if (boostEntity.z > 14) {
              boostEntity.active = false;
              boostEntity.group.visible = false;
            }
          }

          // 3. Roadwork Cones Hazard
          if (hasRoadwork && !hazardEntity.active && s.distanceM >= s.nextHazardDistanceM) {
            hazardEntity.active = true;
            hazardEntity.hit = false;
            const startLane = twoWay ? Math.floor(lanes / 2) : 0;
            const lane = startLane + Math.floor(Math.random() * (lanes - startLane));
            hazardEntity.x = laneCenterX(lane, lanes);
            hazardEntity.z = -205;
            hazardEntity.group.visible = true;
            s.nextHazardDistanceM = s.distanceM + 285 + Math.random() * 150;
          }

          if (hazardEntity.active) {
            hazardEntity.z += s.speedMps * dt;
            const c = sampleCurve(hazardEntity.z);
            hazardEntity.group.position.set(
              c.x + hazardEntity.x * Math.cos(c.angle),
              c.y,
              hazardEntity.z - hazardEntity.x * Math.sin(c.angle)
            );
            hazardEntity.group.rotation.y = -c.angle;

            if (
              !hazardEntity.hit &&
              Math.abs(hazardEntity.z - -0.3) < 1.8 &&
              Math.abs(hazardEntity.x - s.playerX) < 1.45
            ) {
              hazardEntity.hit = true;
              s.shakeIntensity = 0.06;
              s.speedMps = Math.max(8, s.speedMps * 0.55);
              s.integrityPct = Math.max(0, s.integrityPct - 18);
              aud.playCrash();
              triggerEvent('ROADWORK HIT', 'warn', 1.1);
            } else if (hazardEntity.z > 14) {
              hazardEntity.active = false;
              hazardEntity.group.visible = false;
            }
          }
        } else {
          fuelEntity.group.visible = false;
          fuelEntity.active = false;
          boostEntity.group.visible = false;
          boostEntity.active = false;
          hazardEntity.group.visible = false;
          hazardEntity.active = false;
        }

        // Traffic Update, Horn Yielding & Collision
        if (s.invulnTimer > 0) s.invulnTimer -= dt;
        if (s.eventTimer > 0) {
          s.eventTimer -= dt;
          if (s.eventTimer <= 0) s.eventText = null;
        }

        const baseTrafficSpeed = (lvl ? lvl.trafficSpeedKmh : 92) / 3.6;

        for (let i = 0; i < trafficList.length; i++) {
          const t = trafficList[i];
          if (t.hornReactionTimer > 0) t.hornReactionTimer -= dt;

          const relSpeed = t.isOncoming
            ? s.speedMps + t.speedMps
            : s.speedMps - t.speedMps;
          t.z += relSpeed * dt;

          // Horn reaction: same-direction car directly ahead yields lane if space is open!
          if (
            isPlaying &&
            inp.horn &&
            !t.isOncoming &&
            t.hornReactionTimer <= 0 &&
            t.z < -6 &&
            t.z > -48 &&
            Math.abs(t.x - s.playerX) < 2.2
          ) {
            t.hornReactionTimer = 2.0;
            const minSameDirLane = twoWay ? Math.floor(lanes / 2) : 0;
            const candidates = [t.lane + 1, t.lane - 1].filter(
              (cand) => cand >= minSameDirLane && cand < lanes
            );
            for (const cand of candidates) {
              const blocked = trafficList.some(
                (o) =>
                  o !== t &&
                  o.lane === cand &&
                  Math.abs(o.z - t.z) < 16
              );
              if (!blocked) {
                t.lane = cand;
                t.targetLane = cand;
                break;
              }
            }
            t.speedMps = Math.max(t.speedMps, baseTrafficSpeed * 1.18);
          }

          // Smooth lateral lane transition
          const targetX = laneCenterX(t.targetLane, lanes);
          t.x = THREE.MathUtils.damp(t.x, targetX, 4.5, dt);

          let braking = false;
          for (let j = 0; j < trafficList.length; j++) {
            if (i === j) continue;
            const other = trafficList[j];
            if (other.lane === t.lane && other.isOncoming === t.isOncoming) {
              const dz = t.z - other.z;
              if (dz > 0 && dz < 14) {
                if (t.speedMps > other.speedMps) {
                  t.speedMps = THREE.MathUtils.damp(
                    t.speedMps,
                    other.speedMps * 0.96,
                    5,
                    dt
                  );
                  braking = true;
                }
              }
            }
          }

          const tlColor =
            braking || t.hornReactionTimer > 1.3 ? 0xff4444 : 0xaa1111;
          for (let b = 0; b < t.bundle.brakeLights.length; b++) {
            (
              t.bundle.brakeLights[b].material as THREE.MeshBasicMaterial
            ).color.setHex(tlColor);
          }

          if (t.z > 22 || t.z < -245) {
            const newLane = Math.floor(Math.random() * lanes);
            t.lane = newLane;
            t.targetLane = newLane;
            t.x = laneCenterX(newLane, lanes);
            t.isOncoming = twoWay && newLane < Math.floor(lanes / 2);
            t.z =
              t.z > 22
                ? -195 - Math.random() * 65
                : -185 - Math.random() * 60;
            t.speedMps = baseTrafficSpeed * (0.8 + Math.random() * 0.4);
            t.closePassAwarded = false;
            t.hornReactionTimer = 0;

            for (let k = 0; k < trafficList.length; k++) {
              if (k === i) continue;
              const o = trafficList[k];
              if (o.lane === t.lane && Math.abs(o.z - t.z) < 16) {
                t.z -= 20;
              }
            }
          }

          // Position & orient traffic car along curved, hilly road
          const ct = sampleCurve(t.z);
          t.bundle.group.position.set(
            ct.x + t.x * Math.cos(ct.angle),
            ct.y,
            t.z - t.x * Math.sin(ct.angle)
          );
          t.bundle.group.rotation.y = (t.isOncoming ? Math.PI : 0) - ct.angle;

          if (isPlaying && !s.raceEnded) {
            const dx = Math.abs(t.x - s.playerX);
            const dz = Math.abs(t.z - -0.35);
            const hitX = t.bundle.halfWidth + 0.78;
            const hitZ = t.bundle.halfLength + 1.85;

            if (dx < hitX && dz < hitZ) {
              if (s.invulnTimer <= 0) {
                s.invulnTimer = 1.1;
                s.shakeIntensity = 0.085;
                aud.playCrash();

                const impactDmg =
                  t.isOncoming && speedKmh > 140
                    ? 60
                    : speedKmh > 190
                      ? 50
                      : 35;
                s.integrityPct = Math.max(0, s.integrityPct - impactDmg);
                s.speedMps = Math.max(6, s.speedMps * 0.35);

                const pushDir = s.playerX >= t.x ? 1 : -1;
                s.playerX = THREE.MathUtils.clamp(
                  s.playerX + pushDir * 1.15,
                  -roadHalf + 1.0,
                  roadHalf - 1.0
                );
                t.z -= 8;

                triggerEvent('IMPACT!', 'warn', 1.1);

                if (s.integrityPct <= 0) {
                  s.raceEnded = true;
                  aud.setHorn(false);
                  const finalTel: LiveTelemetry = {
                    speedKmh: 0,
                    rpm: 0,
                    gear: 1,
                    fuelPct: s.fuelPct,
                    integrityPct: 0,
                    distanceM: s.distanceM,
                    targetDistanceM: lvl ? lvl.targetDistanceM : 0,
                    score: Math.round(s.score),
                    sessionCoins: Math.round(s.sessionCoins),
                    closePasses: s.closePasses,
                    levelNumber: lvl ? lvl.levelNumber : 0,
                    status: 'crashed',
                    eventText: 'CRASHED',
                    eventTone: 'warn',
                  };
                  emitRaceEnd('crashed', finalTel);
                }
              }
            } else if (
              !t.closePassAwarded &&
              speedKmh > 85 &&
              dz < hitZ + 0.6 &&
              dx < hitX + 1.15
            ) {
              t.closePassAwarded = true;
              s.closePasses += 1;
              const bonusPts = Math.round(50 * car.scoreMultiplier);
              s.score += bonusPts;
              s.sessionCoins += 15;
              aud.playClosePass();
              triggerEvent(`CLOSE PASS +${bonusPts}`, 'bonus', 1.0);
            }
          }
        }

        // Update Player Group, Wheels, Exterior Physics & Adaptive Camera Framing
        playerGroup.position.x = s.playerX;

        const isBoostingNow =
          isPlaying &&
          (inp.boost || s.boostPadTimer > 0) &&
          s.fuel > 0 &&
          !inp.brake;
        const suspBounce =
          s.speedMps > 2 ? Math.sin(s.distanceM * 0.72) * 0.014 : 0;
        const carYaw = -s.steerVisual * 0.095;
        const carRoll = s.steerVisual * 0.055;
        const carPitch = inp.brake
          ? -0.025
          : isBoostingNow
            ? 0.022
            : inp.throttle
              ? 0.01
              : 0;

        if (cockpitRig) {
          cockpitRig.steeringWheelGroup.rotation.z = -s.steerVisual;
          cockpitRig.root.visible = true;
          cockpitRig.interiorGroup.visible =
            camPreset === 'cockpit' || camPreset === 'dash';
          cockpitRig.hoodGroup.visible = camPreset !== 'chase';
          cockpitRig.chaseOnlyGroup.visible = camPreset === 'chase';
          dashLight.intensity = camPreset === 'chase' ? 0 : 0.85;

          if (camPreset === 'chase') {
            cockpitRig.root.position.set(0, 1.18 + suspBounce, 0.16);
            cockpitRig.root.rotation.set(carPitch, carYaw, carRoll);
          } else {
            cockpitRig.root.position.set(0, 1.18, 0.16);
            cockpitRig.root.rotation.set(0, 0, 0);
          }

          // Spin wheels & steer front wheels
          const wheelSpin = (s.speedMps / 0.34) * dt;
          for (let w = 0; w < cockpitRig.wheelMeshes.length; w++) {
            cockpitRig.wheelMeshes[w].rotation.x -= wheelSpin;
          }
          for (let fp = 0; fp < cockpitRig.frontWheelPivots.length; fp++) {
            cockpitRig.frontWheelPivots[fp].rotation.y = -s.steerVisual * 0.42;
          }
          const playerTlColor = inp.brake ? 0xff2222 : 0xb91c1c;
          for (let bl = 0; bl < cockpitRig.brakeLights.length; bl++) {
            (
              cockpitRig.brakeLights[bl].material as THREE.MeshBasicMaterial
            ).color.setHex(playerTlColor);
          }
          const flamePulse = 0.8 + Math.sin(performance.now() * 0.05) * 0.25;
          for (let fl = 0; fl < cockpitRig.boostFlames.length; fl++) {
            cockpitRig.boostFlames[fl].visible = isBoostingNow;
            if (isBoostingNow) {
              cockpitRig.boostFlames[fl].scale.set(1, flamePulse, 1);
            }
          }
        }

        // Portrait-aware horizontal FOV so BOTH steering wheel AND car body/mirrors/hood fit cleanly!
        const aspect = camera.aspect || 1;
        const desiredHorizFovRad = THREE.MathUtils.degToRad(74);
        const adaptedBaseFov =
          aspect < 1.1
            ? Math.min(
                100,
                THREE.MathUtils.radToDeg(
                  2 * Math.atan(Math.tan(desiredHorizFovRad / 2) / Math.max(0.42, aspect))
                )
              )
            : 66;

        let camX = 0;
        let camY = 1.27;
        let camZ = 0.43;
        let lookY = 1.04;
        let lookZ = -26;
        let targetFov =
          adaptedBaseFov + Math.min(13, (s.speedMps / 85) * 13);

        if (camPreset === 'dash') {
          camY = 1.24;
          camZ = 0.05;
        } else if (camPreset === 'hood') {
          camY = 1.32;
          camZ = -0.82;
          targetFov += 3;
        } else if (camPreset === 'chase') {
          const isPortrait = aspect < 0.85;
          camX = (isPortrait ? -0.2 : -0.58) - s.steerVisual * 0.22;
          camY = isPortrait ? 2.12 : 1.84;
          camZ = isPortrait
            ? 6.75 + (0.85 - Math.max(0.4, aspect)) * 3.2
            : 5.75;
          lookY = isPortrait ? 0.86 : 0.74;
          lookZ = -12;
          targetFov =
            (isPortrait ? 56 : 52) + Math.min(8, (s.speedMps / 85) * 8);
        }

        camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, 5, dt);
        camera.updateProjectionMatrix();

        s.cameraRoll = THREE.MathUtils.damp(
          s.cameraRoll,
          -s.steerVisual * 0.032,
          8,
          dt
        );
        s.shakeIntensity = THREE.MathUtils.damp(s.shakeIntensity, 0, 7, dt);
        const shakeX = (Math.random() - 0.5) * s.shakeIntensity;
        const shakeY = (Math.random() - 0.5) * s.shakeIntensity;

        const speedVib =
          s.speedMps > 35 ? Math.sin(performance.now() * 0.06) * 0.002 : 0;

        camera.position.set(camX + shakeX, camY + shakeY + speedVib, camZ);
        const cLook = sampleCurve(lookZ);
        const lookBiasX = camPreset === 'chase' && aspect < 0.85 ? 0.04 : 0;
        camera.lookAt(
          s.playerX + lookBiasX + cLook.x * 0.25 + s.steerVisual * 0.65,
          lookY + cLook.y * 0.16,
          lookZ
        );
        camera.rotation.z += s.cameraRoll;

        dashRenderer.draw(
          speedKmh,
          s.rpm,
          s.gear,
          s.fuelPct,
          stats.topSpeedKmh,
          car.dashStyle,
          '#' + car.accentColor.toString(16).padStart(6, '0')
        );
      } else {
        aud.updateEngine(0, false, car.enginePitch, false);
      }

      const viewW = container?.clientWidth || window.innerWidth;
      const viewH = container?.clientHeight || window.innerHeight;
      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, viewW, viewH);
      renderer.clear();
      renderer.render(scene, camera);

      // Render live small 3D "My Car" running on the road inside corner PiP whenever cockpit/dash/hood is active
      if (
        propsRef.current.showMiniCar &&
        (st === 'playing' || st === 'paused') &&
        camPreset !== 'chase' &&
        cockpitRig
      ) {
        const pipRect = getMyCarPipRect(viewW, viewH);
        const pipBottomY = Math.max(0, viewH - pipRect.top - pipRect.height);
        pipCamera.aspect = pipRect.width / Math.max(1, pipRect.height);
        pipCamera.updateProjectionMatrix();

        const pipSusp =
          s.speedMps > 2 ? Math.sin(s.distanceM * 0.72) * 0.014 : 0;
        const pipYaw = -s.steerVisual * 0.095;
        const pipRoll = s.steerVisual * 0.055;
        const pipBoost =
          st === 'playing' &&
          (inp.boost || s.boostPadTimer > 0) &&
          s.fuel > 0 &&
          !inp.brake;
        const pipPitch = inp.brake
          ? -0.025
          : pipBoost
            ? 0.022
            : inp.throttle
              ? 0.01
              : 0;

        const cPipLook = sampleCurve(-11);
        pipCamera.fov = 40;
        pipCamera.position.set(-0.74 - s.steerVisual * 0.2, 1.64, 4.95);
        pipCamera.lookAt(
          s.playerX + cPipLook.x * 0.18 + s.steerVisual * 0.3,
          0.56 + cPipLook.y * 0.12,
          -11
        );

        const prevDashIntensity = dashLight.intensity;
        dashLight.intensity = 0;
        cockpitRig.interiorGroup.visible = false;
        cockpitRig.hoodGroup.visible = false;
        cockpitRig.chaseOnlyGroup.visible = true;
        cockpitRig.root.position.set(0, 1.18 + pipSusp, 0.16);
        cockpitRig.root.rotation.set(pipPitch, pipYaw, pipRoll);

        renderer.setScissorTest(true);
        renderer.setViewport(pipRect.left, pipBottomY, pipRect.width, pipRect.height);
        renderer.setScissor(pipRect.left, pipBottomY, pipRect.width, pipRect.height);
        renderer.clear();
        renderer.render(scene, pipCamera);
        renderer.setScissorTest(false);

        dashLight.intensity = prevDashIntensity;
        cockpitRig.root.position.set(0, 1.18, 0.16);
        cockpitRig.root.rotation.set(0, 0, 0);
        cockpitRig.chaseOnlyGroup.visible = false;
        cockpitRig.hoodGroup.visible = true;
        cockpitRig.interiorGroup.visible =
          camPreset === 'cockpit' || camPreset === 'dash';
      }

      const now = performance.now();
      if (now - lastTelemetryPush > 48) {
        lastTelemetryPush = now;
        emitTelemetry({
          speedKmh: Math.round(s.speedMps * 3.6),
          rpm: Math.round(s.rpm),
          gear: s.gear,
          fuelPct: s.fuelPct,
          integrityPct: s.integrityPct,
          distanceM: s.distanceM,
          targetDistanceM: lvl ? lvl.targetDistanceM : 0,
          score: Math.round(s.score),
          sessionCoins: Math.round(s.sessionCoins),
          closePasses: s.closePasses,
          levelNumber: lvl ? lvl.levelNumber : 0,
          status: st,
          eventText: s.eventText,
          eventTone: s.eventTone,
        });
      }

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener(
        'webglcontextlost',
        handleContextLost
      );

      cockpitRig?.dispose();
      dashRenderer.dispose();
      currentRoadTex?.dispose();
      cityTextures.forEach((t) => t.dispose());
      boostTex.dispose();
      finishBannerMat.map?.dispose();
      finishBannerMat.dispose();
      envTex.dispose();

      clearGroupArray(trafficList.map((t) => t.bundle.group));
      clearGroupArray(gantryList.map((g) => g.group));
      const allScenery: THREE.Object3D[] = [];
      sceneryList.forEach((p) => allScenery.push(p.left, p.right));
      clearGroupArray(allScenery);

      groundGeo.dispose();
      groundMat.dispose();
      roadGeo.dispose();
      roadMat.dispose();
      leftRailGeo.dispose();
      rightRailGeo.dispose();
      railMat.dispose();
      postGeo.dispose();
      postMat.dispose();

      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [inputRef]);

  return (
    <div
      ref={mountRef}
      className="fixed inset-0 w-full h-full overflow-hidden bg-[#0e1015]"
    />
  );
};
