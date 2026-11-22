import React, { useState } from 'react';
import {
  Camera,
  Check,
  Copy,
  Download,
  FileCode2,
  Gamepad2,
  Package,
  RotateCcw,
  Settings,
  Smartphone,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type { CameraPreset, ControlMode, SaveState } from '../game/types';
import { createZipBlob, triggerFileDownload } from '../game/zipBuilder';
import { PWAInstallButton } from './PWAInstallButton';

interface SettingsModalProps {
  save: SaveState;
  initialTab?: 'controls' | 'playstore';
  onUpdateSettings: (patch: Partial<SaveState>) => void;
  onResetProgress: () => void;
  onClose: () => void;
}

const SHARED_APP_URL =
  'https://ais-pre-bogkrgs5k2763wepi2nou5-909802727779.asia-northeast1.run.app';

export const SettingsModal: React.FC<SettingsModalProps> = ({
  save,
  initialTab = 'controls',
  onUpdateSettings,
  onResetProgress,
  onClose,
}) => {
  const [tab, setTab] = useState<'controls' | 'playstore'>(initialTab);
  const [confirmReset, setConfirmReset] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const getPublicOrigin = () => {
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      if (origin.includes('ais-dev-')) {
        return origin.replace('ais-dev-', 'ais-pre-');
      }
      if (origin.startsWith('https://')) {
        return origin;
      }
    }
    return SHARED_APP_URL;
  };

  const buildTwaManifestJson = () => {
    const origin = getPublicOrigin();
    const host = origin.replace(/^https?:\/\//, '');
    return JSON.stringify(
      {
        packageId: 'com.newbabydriver.game',
        host,
        name: 'New Baby Driver',
        launcherName: 'Baby Driver',
        display: 'fullscreen',
        themeColor: '#111318',
        navigationColor: '#111318',
        navigationColorDark: '#111318',
        backgroundColor: '#111318',
        enableNotifications: false,
        startUrl: '/',
        iconUrl: `${origin}/pwa-512x512.png`,
        maskableIconUrl: `${origin}/pwa-maskable-512x512.png`,
        monochromeIconUrl: `${origin}/pwa-192x192.png`,
        splashScreenFadeOutDuration: 300,
        signingKey: {
          path: './android.keystore',
          alias: 'android',
        },
        appVersionName: '1.0.0',
        appVersionCode: 1,
        shortcuts: [],
        generatorApp: 'bubblewrap-cli',
        webManifestUrl: `${origin}/manifest.webmanifest`,
        fallbackType: 'customtabs',
        orientation: 'landscape',
        isChromeOSOnly: false,
      },
      null,
      2
    );
  };

  const handleDownloadTwaManifest = () => {
    const json = buildTwaManifestJson();
    const blob = new Blob([json], { type: 'application/json' });
    triggerFileDownload(blob, 'twa-manifest.json');
  };

  const handleDownloadAndroidBuildKit = () => {
    const capacitorConfig = JSON.stringify(
      {
        appId: 'com.newbabydriver.game',
        appName: 'New Baby Driver',
        webDir: 'dist',
        bundledWebRuntime: false,
        android: {
          allowMixedContent: false,
          captureInput: true,
          webContentsDebuggingEnabled: false,
        },
        server: {
          androidScheme: 'https',
        },
      },
      null,
      2
    );

    const workflowYaml = `name: Build Android APK & Play Store AAB

on:
  workflow_dispatch:
  push:
    branches: [ main, master ]

jobs:
  build-android:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: '21'
      - uses: android-actions/setup-android@v3
      - name: Build Web Game
        run: |
          npm install
          npm run build
      - name: Sync Capacitor Android
        run: |
          npm install @capacitor/core @capacitor/cli @capacitor/android
          if [ ! -d "android" ]; then
            npx cap add android
          fi
          npx cap sync android
      - name: Build Debug APK (Phone Install)
        run: |
          cd android
          chmod +x gradlew
          ./gradlew assembleDebug
      - name: Build Release AAB (Google Play Store)
        run: |
          cd android
          ./gradlew bundleRelease
      - name: Upload APK & AAB
        uses: actions/upload-artifact@v4
        with:
          name: new-baby-driver-android-builds
          path: |
            android/app/build/outputs/apk/debug/app-debug.apk
            android/app/build/outputs/bundle/release/app-release.aab
`;

    const readme = `# New Baby Driver — Android (.APK) & Google Play Store (.AAB) Guide

## Formats Explained
1. **.APK (Android Package)**: Install directly on any Android phone for testing.
2. **.AAB (Android App Bundle)**: Required format for uploading to Google Play Console.

## Option A: Free Cloud Build (No Android Studio Needed)
1. Export your project from AI Studio and push it to a GitHub repository.
2. Place \`capacitor.config.json\` in the root folder and \`.github/workflows/build-android.yml\` inside \`.github/workflows/\`.
3. Open GitHub -> **Actions** -> **Build Android APK & Play Store AAB** -> **Run workflow**.
4. Download the generated **app-debug.apk** (for your phone) and **app-release.aab** (for Google Play Store) from the workflow artifacts!

## Option B: Local Build with Capacitor (Offline Native Android App)
\`\`\`bash
npm install
npm run build
npm install @capacitor/core @capacitor/cli @capacitor/android
npx cap add android
npx cap sync android
cd android
./gradlew assembleDebug     # -> outputs app-debug.apk for phone
./gradlew bundleRelease     # -> outputs app-release.aab for Play Store
\`\`\`

## Option C: Bubblewrap (TWA Play Store Wrapper using twa-manifest.json)
\`\`\`bash
npm i -g @bubblewrap/cli
bubblewrap build
\`\`\`
Sign the generated \`.aab\` with your upload keystore and upload it to Google Play Console -> Production / Internal Testing.
`;

    const zipBlob = createZipBlob([
      { path: 'capacitor.config.json', content: capacitorConfig },
      { path: '.github/workflows/build-android.yml', content: workflowYaml },
      { path: 'twa-manifest.json', content: buildTwaManifestJson() },
      { path: 'README-PLAYSTORE.md', content: readme },
    ]);

    triggerFileDownload(zipBlob, 'new-baby-driver-android-kit.zip');
  };

  const handleCopyPhoneLink = async () => {
    const url = getPublicOrigin();
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(true);
      window.setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      // ignore clipboard restriction
    }
  };

  const requestTiltPermission = async () => {
    const DevOrient = DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<'granted' | 'denied'>;
    };
    if (typeof DevOrient?.requestPermission === 'function') {
      try {
        await DevOrient.requestPermission();
      } catch {
        // ignore
      }
    }
    onUpdateSettings({ controlMode: 'tilt' });
  };

  const controlOptions: { id: ControlMode; label: string; desc: string }[] = [
    {
      id: 'buttons',
      label: 'Touch Arrows',
      desc: 'Left/Right thumb pads + Gas & Brake pedals',
    },
    {
      id: 'wheel',
      label: 'Steering Wheel',
      desc: 'Drag on-screen rotating steering wheel',
    },
    {
      id: 'tilt',
      label: 'Phone Tilt (Gyro)',
      desc: 'Tilt Android/iOS device left & right to steer',
    },
  ];

  const cameraOptions: { id: CameraPreset; label: string }[] = [
    { id: 'cockpit', label: 'Cockpit Driver' },
    { id: 'dash', label: 'Dash Close' },
    { id: 'hood', label: 'Hood Cam' },
  ];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/75 p-3 sm:p-6">
      <div className="w-full max-w-xl max-h-[92vh] flex flex-col rounded-lg bg-[#1d1f24] border border-white/15 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 bg-[#15171b] border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <Settings className="w-5 h-5 text-amber-400" />
            <h2 className="font-display text-lg font-bold text-white tracking-wide">
              SETTINGS &amp; ANDROID DOWNLOADS
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="flex items-center justify-center w-8 h-8 rounded-sm bg-neutral-300 hover:bg-white text-neutral-900 transition cursor-pointer"
          >
            <X className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Sub-tabs */}
        <div className="flex gap-2 px-5 py-2.5 bg-[#181a1f] border-b border-white/10">
          <button
            type="button"
            onClick={() => setTab('controls')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold cursor-pointer ${
              tab === 'controls'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5" />
            Controls &amp; Audio
          </button>
          <button
            type="button"
            onClick={() => setTab('playstore')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold cursor-pointer ${
              tab === 'playstore'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            Phone &amp; Play Store (.APK / .AAB)
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          {tab === 'controls' ? (
            <>
              <div>
                <h3 className="text-xs font-semibold text-slate-400 mb-2">
                  Steering Control Mode (Android &amp; Touch)
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  {controlOptions.map((opt) => {
                    const active = save.controlMode === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          opt.id === 'tilt'
                            ? requestTiltPermission()
                            : onUpdateSettings({ controlMode: opt.id })
                        }
                        className={`flex items-center justify-between p-3 rounded border text-left transition cursor-pointer ${
                          active
                            ? 'bg-amber-500/15 border-amber-400 text-white'
                            : 'bg-[#23262e] border-white/10 text-slate-300 hover:border-white/25'
                        }`}
                      >
                        <div>
                          <div className="text-sm font-bold">{opt.label}</div>
                          <div className="text-xs text-slate-400">
                            {opt.desc}
                          </div>
                        </div>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded ${
                            active
                              ? 'bg-amber-400 text-slate-950'
                              : 'bg-white/10 text-slate-400'
                          }`}
                        >
                          {active ? 'Active' : 'Select'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5" />
                  Camera View
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {cameraOptions.map((cam) => (
                    <button
                      key={cam.id}
                      type="button"
                      onClick={() => onUpdateSettings({ cameraPreset: cam.id })}
                      className={`py-2 px-3 rounded text-xs font-bold transition cursor-pointer ${
                        save.cameraPreset === cam.id
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-[#23262e] text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {cam.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded bg-[#23262e] border border-white/10">
                <div className="flex items-center gap-2.5">
                  {save.soundEnabled ? (
                    <Volume2 className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <VolumeX className="w-5 h-5 text-slate-400" />
                  )}
                  <div>
                    <div className="text-sm font-bold text-white">
                      Engine &amp; Effects Audio
                    </div>
                    <div className="text-xs text-slate-400">
                      Synthesized RPM engine note &amp; road SFX
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateSettings({ soundEnabled: !save.soundEnabled })
                  }
                  className={`px-3.5 py-1.5 rounded text-xs font-bold cursor-pointer ${
                    save.soundEnabled
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-white/10 text-slate-300'
                  }`}
                >
                  {save.soundEnabled ? 'ON' : 'OFF'}
                </button>
              </div>

              <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                {!confirmReset ? (
                  <button
                    type="button"
                    onClick={() => setConfirmReset(true)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset Career Save
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-rose-300">
                      Reset all coins, cars &amp; 100 levels?
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onResetProgress();
                        setConfirmReset(false);
                      }}
                      className="px-2.5 py-1 rounded bg-rose-600 text-white text-xs font-bold cursor-pointer"
                    >
                      Confirm Reset
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmReset(false)}
                      className="px-2.5 py-1 rounded bg-white/10 text-slate-300 text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                )}
                <span className="text-[11px] text-slate-500">
                  Keyboard: A/D or Arrows + W/S
                </span>
              </div>
            </>
          ) : (
            <div className="space-y-3.5 text-sm text-slate-300">
              {/* 1. Direct Phone Play (Instant Install) */}
              <div className="p-4 rounded bg-emerald-500/10 border border-emerald-500/30 space-y-2.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-display font-bold text-white text-base">
                      1. Install &amp; Play on Your Phone Now
                    </h3>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Open this link in Chrome on Android and tap{' '}
                      <strong>Install App</strong> (or Chrome Menu → Install
                      app) for fullscreen offline play.
                    </p>
                  </div>
                  <PWAInstallButton />
                </div>

                <div className="flex items-center gap-2 bg-black/50 border border-white/10 rounded px-2.5 py-1.5">
                  <span className="text-[11px] font-mono-tabular text-emerald-300 truncate flex-1">
                    {getPublicOrigin()}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyPhoneLink}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-xs font-semibold text-white shrink-0 cursor-pointer"
                  >
                    {copiedUrl ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Copy Link
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* 2. Downloadable Android (.APK) & Play Store (.AAB) Build Kit */}
              <div className="p-4 rounded bg-[#14161b] border border-white/15 space-y-3">
                <div>
                  <h3 className="font-display font-bold text-white text-base">
                    2. Download Android (.APK) &amp; Play Store (.AAB) Kit
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Google Play Store requires a signed{' '}
                    <strong className="text-amber-300">.AAB</strong> (Android
                    App Bundle), while direct phone installation uses{' '}
                    <strong className="text-sky-300">.APK</strong>. Download the
                    ready-to-build kit below to compile both formats via
                    Capacitor or Bubblewrap (cloud or local):
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={handleDownloadAndroidBuildKit}
                    className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-display font-bold text-xs sm:text-sm cursor-pointer transition"
                  >
                    <Package className="w-4 h-4" />
                    Download APK &amp; AAB Kit (.ZIP)
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadTwaManifest}
                    className="flex items-center justify-center gap-2 px-3.5 py-2.5 rounded bg-[#23262e] hover:bg-[#2d313d] border border-white/15 text-white font-display font-bold text-xs sm:text-sm cursor-pointer transition"
                  >
                    <FileCode2 className="w-4 h-4 text-sky-400" />
                    Download twa-manifest.json
                  </button>
                </div>

                <div className="text-[11px] text-slate-400 leading-relaxed pt-1 border-t border-white/10 space-y-1">
                  <div className="flex items-start gap-1.5">
                    <Download className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>APK &amp; AAB Kit (.ZIP)</strong> includes{' '}
                      <code className="text-slate-200">
                        capacitor.config.json
                      </code>
                      ,{' '}
                      <code className="text-slate-200">
                        .github/workflows/build-android.yml
                      </code>{' '}
                      (builds both <strong>app-debug.apk</strong> and{' '}
                      <strong>app-release.aab</strong> in GitHub Actions with
                      zero local Android Studio setup), and{' '}
                      <code className="text-slate-200">
                        README-PLAYSTORE.md
                      </code>
                      .
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
