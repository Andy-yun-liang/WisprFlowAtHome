import type { Configuration } from 'electron-builder'

const config: Configuration = {
  appId: 'com.whisprhome.app',
  productName: 'WhisprAtHome',
  directories: {
    buildResources: 'build',
    output: 'dist'
  },
  files: ['out/**/*'],
  asarUnpack: [
    'out/main/node_modules/uiohook-napi/**/*',
    'out/main/node_modules/keytar/**/*',
    'out/main/node_modules/@nut-tree-fork/**/*',
    'out/main/node_modules/node-record-lpcm16/**/*'
  ],
  mac: {
    target: [{ target: 'dmg', arch: ['arm64', 'x64'] }],
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
