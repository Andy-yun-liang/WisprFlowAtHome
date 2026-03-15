import type { Configuration } from 'electron-builder'

const config: Configuration = {
  appId: 'com.whisprhome.app',
  productName: 'WhisprAtHome',
  directories: {
    buildResources: 'build',
    output: 'dist'
  },
  files: ['out/**/*', 'resources/**/*'],
  extraResources: [
    { from: 'resources/sox-bundle', to: 'sox-bundle', filter: ['**/*'] }
  ],
  asarUnpack: [
    '**/node_modules/uiohook-napi/**',
    '**/node_modules/keytar/**',
    '**/node_modules/@nut-tree-fork/**',
    '**/node_modules/node-record-lpcm16/**'
  ],
  dmg: {
    artifactName: 'WhisprAtHome-${version}-${arch}.dmg',
    background: 'build/dmg-background.png',
    window: { width: 540, height: 380 },
    contents: [
      { x: 150, y: 240, type: 'file' },
      { x: 390, y: 240, type: 'link', path: '/Applications' }
    ]
  },
  mac: {
    identity: null,
    target: [{ target: 'dmg', arch: ['arm64'] }],
    icon: 'build/icon.icns',
    entitlementsInherit: 'build/entitlements.mac.plist',
    extendInfo: {
      NSMicrophoneUsageDescription: 'WhisprAtHome needs microphone access to transcribe your speech.',
      NSAccessibilityUsageDescription: 'WhisprAtHome needs accessibility access to paste transcribed text.'
    }
  },
  win: {
    target: [{ target: 'nsis', arch: ['x64'] }],
    icon: 'build/icon.ico'
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true
  }
}

export default config
