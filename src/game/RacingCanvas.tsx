import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { RacingAudioEngine } from './audio';
import { BIOMES, CARS, getEffectiveCarStats } from './data';
import {
  buildCockpit,
  buildFuelPickup,
  buildSceneryItem,
  buildTrafficVehicle,
  type CockpitRig,
  type TrafficMeshBundle,
  type TrafficVariant,
} from './models';
import {
  createCheckeredTexture,
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
  level: LevelConfig | null; // null = endless mode on city/selected biome
  endlessBiome: BiomeId;
  status: GameStatus;
  cameraPreset: CameraPreset;
  runNonce: number; // increments when starting/restarting a race
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
  x: number;
  z: number;
  speedMps: number;
  isOncoming: boolean;
  closePassAwarded: boolean;
}

interface FuelEntity {
  group: THREE.Group;
  x: number;
  z: number;
  active: boolean;
}

interface SceneryPair {
  left: THREE.Group;
  right: THREE.Group;
  z: number;
}

const LANE_WIDTH = 3.6;

export const RacingCanvas: React.FC<RacingCanvasProps> = ({
  carId,
  upgrades,
  level,
  endlessBiome,
  status,
  cameraPreset,
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
    audio,
    onTelemetry,
    onRaceEnd,
  };

  // Mutable simulation state shared with rebuild hooks
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
    eventText: null as string | null,
    eventTone: 'info' as 'info' | 'bonus' | 'warn',
    eventTimer: 0,
    raceEnded: false,
    nextFuelDistanceM: 420,
    lastRunNonce: -1,
    activeCarId: '',
    activeBiomeKey: '',
    activeLanesKey: '',
  });

  // Reset run state whenever runNonce increments
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
      s.eventText = null;
      s.eventTimer = 0;
      s.raceEnded = false;
      s.nextFuelDistanceM = 380;
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
    renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    container.appendChild(renderer.domElement);

    const maxAniso = renderer.capabilities.getMaxAnisotropy();

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      64,
      (container.clientWidth || window.innerWidth) /
        (container.clientHeight || window.innerHeight),
      0.08,
      360
    );

    // Studio reflection environment
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(
      new RoomEnvironment(),
      0.04
    ).texture;
    scene.environment = envTex;
    pmremGenerator.dispose();

    // Lighting rig (warm sun key + cool sky/ground hemi + subtle cockpit fill)
    const hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x3f4f38, 0.9);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xfffbeb, 1.7);
    sunLight.position.set(28, 46, 18);
    sunLight.castShadow = !isSoftwareGl;
    sunLight.shadow.mapSize.width = 1024;
    sunLight.shadow.mapSize.height = 1024;
    sunLight.shadow.camera.near = 2;
    sunLight.shadow.camera.far = 140;
    const d = 28;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.02;
    scene.add(sunLight);

    const dashLight = new THREE.PointLight(0xffffff, 0.7, 4);
    scene.add(dashLight);

    // Player Group (holds camera + cockpit rig)
    const playerGroup = new THREE.Group();
    scene.add(playerGroup);
    playerGroup.add(camera);
    dashLight.position.set(0, 1.35, 0.05);
    playerGroup.add(dashLight);

    // World Road & Ground
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x5c6b43,
      roughness: 0.95,
    });
    const groundMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(340, 340),
      groundMat
    );
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.set(0, -0.04, -120);
    groundMesh.receiveShadow = true;
    scene.add(groundMesh);

    const roadMat = new THREE.MeshStandardMaterial({
      roughness: 0.85,
      metalness: 0.05,
    });
    const roadMesh = new THREE.Mesh(new THREE.PlaneGeometry(14.4, 300), roadMat);
    roadMesh.rotation.x = -Math.PI / 2;
    roadMesh.position.set(0, 0, -110);
    roadMesh.receiveShadow = true;
    scene.add(roadMesh);

    // Shoulders / Guardrails
    const railMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.4,
      metalness: 0.65,
    });
    const leftRail = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.42, 300),
      railMat
    );
    leftRail.position.set(-7.6, 0.45, -110);
    scene.add(leftRail);

    const rightRail = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.42, 300),
      railMat
    );
    rightRail.position.set(7.6, 0.45, -110);
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

    // Dashboard & Cockpit
    const dashRenderer = new DashboardRenderer(maxAniso);
    let cockpitRig: CockpitRig | null = null;
    let currentRoadTex: THREE.CanvasTexture | null = null;

    // Traffic, Fuel, Scenery Pools
    let trafficList: TrafficEntity[] = [];
    let sceneryList: SceneryPair[] = [];
    const fuelGroup = buildFuelPickup();
    fuelGroup.visible = false;
    scene.add(fuelGroup);
    const fuelEntity: FuelEntity = {
      group: fuelGroup,
      x: 0,
      z: -150,
      active: false,
    };

    const dummyObj = new THREE.Object3D();

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
      cockpitRig.root.position.set(0, 1.18, 0.22);
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
        scene.fog = new THREE.FogExp2(biome.fogColor, biome.fogDensity);
        hemiLight.color.setHex(biome.ambientSky);
        hemiLight.groundColor.setHex(biome.ambientGround);
        sunLight.color.setHex(biome.sunColor);
        sunLight.intensity = biome.sunIntensity;
        groundMat.color.setHex(biome.groundColor);

        // Rebuild scenery
        const oldScenery: THREE.Object3D[] = [];
        sceneryList.forEach((p) => oldScenery.push(p.left, p.right));
        clearGroupArray(oldScenery);
        sceneryList = [];

        const roadHalf = (lanes * LANE_WIDTH) / 2;
        for (let i = 0; i < 16; i++) {
          const z = -i * 17;
          const left = buildSceneryItem(biomeId, -1);
          const right = buildSceneryItem(biomeId, 1);
          left.position.set(-roadHalf - 0.8, 0, z);
          right.position.set(roadHalf + 0.8, 0, z);
          scene.add(left, right);
          sceneryList.push({ left, right, z });
        }
      }

      if (simRef.current.activeLanesKey !== lanesKey) {
        simRef.current.activeLanesKey = lanesKey;
        const roadWidth = lanes * LANE_WIDTH;
        roadMesh.geometry.dispose();
        roadMesh.geometry = new THREE.PlaneGeometry(roadWidth, 300);

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

        leftRail.position.x = -roadWidth / 2 - 0.45;
        rightRail.position.x = roadWidth / 2 + 0.45;

        finishPillarL.position.set(-roadWidth / 2 - 0.2, 3.1, 0);
        finishPillarR.position.set(roadWidth / 2 + 0.2, 3.1, 0);
        finishSign.scale.x = roadWidth / 14.4;

        // Rebuild traffic pool
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
        const baseTrafficSpeed = ((lvl ? lvl.trafficSpeedKmh : 92) / 3.6);

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
            x: laneX,
            z,
            speedMps: baseTrafficSpeed * (0.82 + Math.random() * 0.36),
            isOncoming,
            closePassAwarded: false,
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
      duration = 1.4
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
      const inp = inputRef.current;

      const isPlaying = st === 'playing';
      const isMenuAttract = st === 'menu';
      const isPaused = st === 'paused';

      if (!isPaused) {
        // Physics & Vehicle Dynamics
        const maxSpeedMps = stats.topSpeedKmh / 3.6;

        if (isMenuAttract) {
          // Smooth cruise in menu backdrop
          const targetCruise = 23;
          s.speedMps = THREE.MathUtils.damp(s.speedMps, targetCruise, 2.5, dt);
          const targetX = laneCenterX(lanes === 4 ? 2 : 1, lanes);
          s.playerX = THREE.MathUtils.damp(s.playerX, targetX, 2.2, dt);
          s.steerVisual = THREE.MathUtils.damp(s.steerVisual, 0, 5, dt);
        } else if (isPlaying && !s.raceEnded) {
          // Acceleration / Braking / Fuel Cutout
          const hasFuel = s.fuel > 0;
          if (inp.brake) {
            s.speedMps = Math.max(0, s.speedMps - stats.braking * dt);
          } else if (inp.throttle && hasFuel) {
            const boostMult = inp.boost ? 1.25 : 1.0;
            const speedRatio = s.speedMps / maxSpeedMps;
            const torqueCurve = Math.max(0.18, 1.0 - speedRatio * 0.72);
            s.speedMps = Math.min(
              maxSpeedMps * (inp.boost ? 1.08 : 1.0),
              s.speedMps + stats.accel * torqueCurve * boostMult * dt
            );
          } else {
            // Engine braking / rolling drag
            const drag = hasFuel ? 3.8 : 6.2;
            s.speedMps = Math.max(0, s.speedMps - drag * dt);
          }

          // Steering responsiveness (scales smoothly with speed)
          const steerAuthority = Math.min(1.0, 0.25 + s.speedMps / 16);
          s.playerX += inp.steer * stats.handling * steerAuthority * dt;

          // Guardrail boundary rub
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

          // Distance & Score
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

          // Check Finish Line for Career Level
          if (lvl && s.distanceM >= lvl.targetDistanceM && !s.raceEnded) {
            s.raceEnded = true;
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
        }

        // Gear & RPM Simulation (6-speed automatic feel)
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
          // 24 repeats over 300m -> 12.5m per texture repeat
          currentRoadTex.offset.y -= (s.speedMps * dt) / 12.5;
        }

        // Scroll Guardrail Posts
        const postSpacing = 12.5;
        const postOffset = (s.distanceM % postSpacing);
        let pIdx = 0;
        for (let i = 0; i < postCount / 2; i++) {
          const z = 14 - i * postSpacing + postOffset;
          dummyObj.position.set(-roadHalf - 0.5, 0.36, z);
          dummyObj.updateMatrix();
          postsInstanced.setMatrixAt(pIdx++, dummyObj.matrix);

          dummyObj.position.set(roadHalf + 0.5, 0.36, z);
          dummyObj.updateMatrix();
          postsInstanced.setMatrixAt(pIdx++, dummyObj.matrix);
        }
        postsInstanced.instanceMatrix.needsUpdate = true;

        // Scroll Scenery
        for (let i = 0; i < sceneryList.length; i++) {
          const pair = sceneryList[i];
          pair.z += s.speedMps * dt;
          if (pair.z > 24) {
            pair.z -= sceneryList.length * 17;
          }
          pair.left.position.z = pair.z;
          pair.right.position.z = pair.z;
        }

        // Finish Line Positioning
        if (lvl) {
          const distToFinish = lvl.targetDistanceM - s.distanceM;
          if (distToFinish < 240 && distToFinish > -20) {
            finishGroup.visible = true;
            finishGroup.position.z = -distToFinish;
          } else {
            finishGroup.visible = false;
          }
        } else {
          finishGroup.visible = false;
        }

        // Fuel Pickup Spawning & Collection
        if (isPlaying && !s.raceEnded) {
          if (!fuelEntity.active && s.distanceM >= s.nextFuelDistanceM) {
            fuelEntity.active = true;
            const spawnLane = Math.floor(Math.random() * lanes);
            fuelEntity.x = laneCenterX(spawnLane, lanes);
            fuelEntity.z = -195;
            fuelEntity.group.position.set(fuelEntity.x, 0, fuelEntity.z);
            fuelEntity.group.visible = true;
            s.nextFuelDistanceM = s.distanceM + 360 + Math.random() * 140;
          }

          if (fuelEntity.active) {
            fuelEntity.z += s.speedMps * dt;
            fuelEntity.group.position.z = fuelEntity.z;
            fuelEntity.group.rotation.y += dt * 2.2;

            // Collect check
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
              triggerEvent('FUEL +28%', 'bonus', 1.3);
            } else if (fuelEntity.z > 14) {
              fuelEntity.active = false;
              fuelEntity.group.visible = false;
            }
          }
        } else {
          fuelEntity.group.visible = false;
          fuelEntity.active = false;
        }

        // Traffic Update & Collision
        if (s.invulnTimer > 0) s.invulnTimer -= dt;
        if (s.eventTimer > 0) {
          s.eventTimer -= dt;
          if (s.eventTimer <= 0) s.eventText = null;
        }

        const baseTrafficSpeed = (lvl ? lvl.trafficSpeedKmh : 92) / 3.6;

        for (let i = 0; i < trafficList.length; i++) {
          const t = trafficList[i];
          // Move relative to player speed
          const relSpeed = t.isOncoming
            ? s.speedMps + t.speedMps
            : s.speedMps - t.speedMps;
          t.z += relSpeed * dt;

          // Keep safe spacing from car directly ahead in same lane
          let braking = false;
          for (let j = 0; j < trafficList.length; j++) {
            if (i === j) continue;
            const other = trafficList[j];
            if (other.lane === t.lane && other.isOncoming === t.isOncoming) {
              const dz = t.z - other.z; // positive if other is ahead (-Z)
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

          // Brake light emissive brightness
          const tlColor = braking ? 0xff4444 : 0xaa1111;
          for (let b = 0; b < t.bundle.brakeLights.length; b++) {
            (
              t.bundle.brakeLights[b].material as THREE.MeshBasicMaterial
            ).color.setHex(tlColor);
          }

          // Recycle traffic far ahead or behind
          if (t.z > 22 || t.z < -250) {
            const newLane = Math.floor(Math.random() * lanes);
            t.lane = newLane;
            t.x = laneCenterX(newLane, lanes);
            t.isOncoming = twoWay && newLane < Math.floor(lanes / 2);
            t.z =
              t.z > 22
                ? -195 - Math.random() * 65
                : -185 - Math.random() * 60;
            t.speedMps = baseTrafficSpeed * (0.8 + Math.random() * 0.4);
            t.closePassAwarded = false;
            t.bundle.group.rotation.y = t.isOncoming ? Math.PI : 0;

            // Avoid overlapping another car upon respawn
            for (let k = 0; k < trafficList.length; k++) {
              if (k === i) continue;
              const o = trafficList[k];
              if (o.lane === t.lane && Math.abs(o.z - t.z) < 16) {
                t.z -= 20;
              }
            }
          }

          t.bundle.group.position.set(t.x, 0, t.z);

          // Collision & Close Pass checks during active play
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

                // Damage proportional to impact speed
                const impactDmg =
                  t.isOncoming && speedKmh > 140
                    ? 60
                    : speedKmh > 190
                      ? 50
                      : 35;
                s.integrityPct = Math.max(0, s.integrityPct - impactDmg);
                s.speedMps = Math.max(6, s.speedMps * 0.35);

                // Lateral push away from traffic center
                const pushDir = s.playerX >= t.x ? 1 : -1;
                s.playerX = THREE.MathUtils.clamp(
                  s.playerX + pushDir * 1.15,
                  -roadHalf + 1.0,
                  roadHalf - 1.0
                );
                t.z -= 8;

                triggerEvent('IMPACT!', 'warn', 1.2);

                if (s.integrityPct <= 0) {
                  s.raceEnded = true;
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
              triggerEvent(`CLOSE PASS +${bonusPts}`, 'bonus', 1.1);
            }
          }
        }

        // Update Player Group, Cockpit & Camera Choreography
        playerGroup.position.x = s.playerX;

        if (cockpitRig) {
          cockpitRig.steeringWheelGroup.rotation.z = -s.steerVisual;
          cockpitRig.root.visible = camPreset !== 'hood';
        }

        // Camera preset offsets & dynamic FOV + corner roll + impact shake
        let camY = 1.18;
        let camZ = 0.28;
        let targetFov = 62 + Math.min(15, (s.speedMps / 85) * 15);
        if (camPreset === 'dash') {
          camY = 1.22;
          camZ = -0.14;
        } else if (camPreset === 'hood') {
          camY = 1.28;
          camZ = -0.88;
          targetFov += 4;
        }

        camera.fov = THREE.MathUtils.damp(camera.fov, targetFov, 5, dt);
        camera.updateProjectionMatrix();

        s.cameraRoll = THREE.MathUtils.damp(
          s.cameraRoll,
          -s.steerVisual * 0.028,
          8,
          dt
        );
        s.shakeIntensity = THREE.MathUtils.damp(s.shakeIntensity, 0, 7, dt);
        const shakeX = (Math.random() - 0.5) * s.shakeIntensity;
        const shakeY = (Math.random() - 0.5) * s.shakeIntensity;

        // Subtle engine vibration at high speed
        const speedVib =
          s.speedMps > 35 ? Math.sin(performance.now() * 0.06) * 0.002 : 0;

        camera.position.set(shakeX, camY + shakeY + speedVib, camZ);
        camera.lookAt(s.playerX + s.steerVisual * 0.85, 1.04, -26);
        camera.rotation.z += s.cameraRoll;

        // Update Live Dashboard CanvasTexture
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

      renderer.render(scene, camera);

      // Push React HUD telemetry at ~20Hz
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
      finishBannerMat.map?.dispose();
      finishBannerMat.dispose();
      envTex.dispose();

      clearGroupArray(trafficList.map((t) => t.bundle.group));
      const allScenery: THREE.Object3D[] = [];
      sceneryList.forEach((p) => allScenery.push(p.left, p.right));
      clearGroupArray(allScenery);

      groundMesh.geometry.dispose();
      groundMat.dispose();
      roadMesh.geometry.dispose();
      roadMat.dispose();
      leftRail.geometry.dispose();
      rightRail.geometry.dispose();
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
