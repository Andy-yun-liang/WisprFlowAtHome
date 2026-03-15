/**
 * Generate app icon assets programmatically using the `canvas` package.
 *
 * Generates:
 *   build/icon.icns           — macOS app icon (ICNS format with multiple PNG sizes)
 *   resources/tray-idle.png   — 22x22 grey mic (idle state)
 *   resources/tray-recording.png  — 22x22 red mic (recording state)
 *   resources/tray-processing.png — 22x22 yellow mic (processing state)
 *   resources/tray-error.png  — 22x22 orange mic (error state)
 */

import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// ─── Drawing helpers ────────────────────────────────────────────────────────

/**
 * Draw the full app icon on a canvas of the given size.
 * Design: dark navy rounded-rect background, white mic body, subtle waveform arcs.
 */
function drawAppIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  const r = size * 0.18; // corner radius
  const pad = size * 0.04;

  // Background: dark navy rounded rect
  ctx.fillStyle = '#1a1a2e';
  ctx.beginPath();
  ctx.moveTo(pad + r, pad);
  ctx.lineTo(size - pad - r, pad);
  ctx.arcTo(size - pad, pad, size - pad, pad + r, r);
  ctx.lineTo(size - pad, size - pad - r);
  ctx.arcTo(size - pad, size - pad, size - pad - r, size - pad, r);
  ctx.lineTo(pad + r, size - pad);
  ctx.arcTo(pad, size - pad, pad, size - pad - r, r);
  ctx.lineTo(pad, pad + r);
  ctx.arcTo(pad, pad, pad + r, pad, r);
  ctx.closePath();
  ctx.fill();

  // White microphone
  const cx = size * 0.42;
  const micW = size * 0.22;
  const micH = size * 0.36;
  const micTop = size * 0.16;
  const micR = micW / 2;

  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = size * 0.03;

  // Mic body (rounded rectangle)
  ctx.beginPath();
  ctx.moveTo(cx - micR + micR, micTop);
  ctx.arcTo(cx + micR, micTop, cx + micR, micTop + micH, micR);
  ctx.arcTo(cx + micR, micTop + micH, cx - micR, micTop + micH, micR);
  ctx.arcTo(cx - micR, micTop + micH, cx - micR, micTop, micR);
  ctx.arcTo(cx - micR, micTop, cx + micR, micTop, micR);
  ctx.closePath();
  ctx.fill();

  // Mic stand arc
  const standY = micTop + micH;
  const arcR = size * 0.18;
  ctx.beginPath();
  ctx.arc(cx, standY, arcR, Math.PI, 0, true);
  ctx.stroke();

  // Mic stand vertical line
  ctx.beginPath();
  ctx.moveTo(cx, standY + arcR);
  ctx.lineTo(cx, standY + arcR + size * 0.06);
  ctx.stroke();

  // Mic stand base (horizontal line)
  const baseW = size * 0.22;
  ctx.beginPath();
  ctx.moveTo(cx - baseW / 2, standY + arcR + size * 0.06);
  ctx.lineTo(cx + baseW / 2, standY + arcR + size * 0.06);
  ctx.stroke();

  // Waveform arcs on the right side (subtle, white with alpha)
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.lineWidth = size * 0.025;
  const waveX = cx + micR + size * 0.04;
  const waveCY = micTop + micH * 0.45;

  for (let i = 0; i < 3; i++) {
    const wr = size * (0.07 + i * 0.07);
    ctx.globalAlpha = 0.9 - i * 0.25;
    ctx.beginPath();
    ctx.arc(waveX - size * 0.02, waveCY, wr, -Math.PI * 0.42, Math.PI * 0.42);
    ctx.stroke();
  }
  ctx.globalAlpha = 1.0;

  return canvas;
}

/**
 * Draw a small tray icon (22x22) with a microphone in the given colour.
 */
function drawTrayIcon(color) {
  const size = 22;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Transparent background
  ctx.clearRect(0, 0, size, size);

  const cx = size * 0.5;
  const micW = size * 0.32;
  const micH = size * 0.42;
  const micTop = size * 0.08;
  const micR = micW / 2;

  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = size * 0.1;

  // Mic body
  ctx.beginPath();
  ctx.moveTo(cx, micTop + micR);
  ctx.arcTo(cx + micR, micTop, cx + micR, micTop + micH, micR);
  ctx.arcTo(cx + micR, micTop + micH, cx - micR, micTop + micH, micR);
  ctx.arcTo(cx - micR, micTop + micH, cx - micR, micTop, micR);
  ctx.arcTo(cx - micR, micTop, cx + micR, micTop, micR);
  ctx.closePath();
  ctx.fill();

  // Stand arc
  const standY = micTop + micH;
  const arcR = size * 0.23;
  ctx.beginPath();
  ctx.arc(cx, standY, arcR, Math.PI, 0, true);
  ctx.stroke();

  // Vertical line
  ctx.beginPath();
  ctx.moveTo(cx, standY + arcR);
  ctx.lineTo(cx, standY + arcR + size * 0.08);
  ctx.stroke();

  // Base
  const baseW = size * 0.3;
  ctx.beginPath();
  ctx.moveTo(cx - baseW / 2, standY + arcR + size * 0.08);
  ctx.lineTo(cx + baseW / 2, standY + arcR + size * 0.08);
  ctx.stroke();

  return canvas;
}

// ─── ICNS builder ───────────────────────────────────────────────────────────

// ICNS OSType codes for PNG data at each size
// Standard macOS ICNS sizes. ic10 (1024px) is required for Retina dock/Finder display.
const ICNS_SIZES = [
  { size: 16,   ostype: 'icp4' },
  { size: 32,   ostype: 'icp5' },
  { size: 128,  ostype: 'ic07' },
  { size: 256,  ostype: 'ic08' },
  { size: 512,  ostype: 'ic09' },
  { size: 1024, ostype: 'ic10' }, // 512×512@2x — required for Retina displays
];

function buildIcns(pngBuffers) {
  // Calculate total size: 8 bytes header + sum of (8 + data) per entry
  let totalSize = 8;
  for (const { png } of pngBuffers) {
    totalSize += 8 + png.length;
  }

  const buf = Buffer.alloc(totalSize);
  let offset = 0;

  // File header: 'icns' magic + total file size
  buf.write('icns', offset, 'ascii'); offset += 4;
  buf.writeUInt32BE(totalSize, offset); offset += 4;

  for (const { ostype, png } of pngBuffers) {
    const entrySize = 8 + png.length;
    buf.write(ostype, offset, 'ascii'); offset += 4;
    buf.writeUInt32BE(entrySize, offset); offset += 4;
    png.copy(buf, offset); offset += png.length;
  }

  return buf;
}

// ─── Main ────────────────────────────────────────────────────────────────────

const mode = process.argv[2] // '--icons-only' | '--inline-only' | undefined (both)

async function main() {
  // Ensure output directories exist
  const buildDir = path.join(projectRoot, 'build');
  const resourcesDir = path.join(projectRoot, 'resources');
  fs.mkdirSync(buildDir, { recursive: true });
  fs.mkdirSync(resourcesDir, { recursive: true });

  if (mode === '--inline-only') {
    // Inject logo as base64 into the already-built settings HTML
    console.log('Inlining logo into built settings HTML...');
    const logoPng = fs.readFileSync(path.join(resourcesDir, 'logo.png'));
    const logoB64 = `data:image/png;base64,${logoPng.toString('base64')}`;
    const builtHtml = path.join(projectRoot, 'out/renderer/settings/index.html');
    let html = fs.readFileSync(builtHtml, 'utf8');
    html = html.replace('__LOGO_BASE64__', logoB64);
    fs.writeFileSync(builtHtml, html);
    console.log('  Done.');
    return;
  }

  // Generate ICNS — logo centered with padding on dark rounded-rect background
  console.log('Generating build/icon.icns...');
  const sourcePng = path.join(buildDir, 'icon-source.png');
  const sourceImg = await loadImage(sourcePng);

  function drawIconWithPadding(size) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);

    // Logo scaled to 60% of canvas, centered
    const scale = 0.70;
    const logoW = size * scale;
    const logoH = logoW * (sourceImg.height / sourceImg.width);
    const x = (size - logoW) / 2;
    const y = (size - logoH) / 2;
    ctx.drawImage(sourceImg, x, y, logoW, logoH);
    return canvas;
  }

  const pngBuffers = ICNS_SIZES.map(({ size, ostype }) => {
    const png = drawIconWithPadding(size).toBuffer('image/png');
    return { ostype, png };
  });
  const icnsData = buildIcns(pngBuffers);
  fs.writeFileSync(path.join(buildDir, 'icon.icns'), icnsData);
  console.log(`  Written ${icnsData.length} bytes`);

  // Generate DMG background (540x380, dark with centered logo)
  console.log('Generating build/dmg-background.png...');
  const dmgW = 540, dmgH = 380;
  const dmgCanvas = createCanvas(dmgW, dmgH);
  const dmgCtx = dmgCanvas.getContext('2d');
  dmgCtx.fillStyle = '#1a1a2e';
  dmgCtx.fillRect(0, 0, dmgW, dmgH);
  const logoSize = 120;
  const logoX = (dmgW / 2) - logoSize / 2;
  const logoY = 60;
  dmgCtx.drawImage(sourceImg, logoX, logoY, logoSize, logoSize);
  dmgCtx.fillStyle = 'rgba(255,255,255,0.7)';
  dmgCtx.font = 'bold 22px -apple-system, sans-serif';
  dmgCtx.textAlign = 'center';
  dmgCtx.fillText('WhisprAtHome', dmgW / 2, logoY + logoSize + 28);
  dmgCtx.fillStyle = 'rgba(255,255,255,0.3)';
  dmgCtx.font = '13px -apple-system, sans-serif';
  dmgCtx.fillText('Drag to Applications to install', dmgW / 2, logoY + logoSize + 52);
  fs.writeFileSync(path.join(buildDir, 'dmg-background.png'), dmgCanvas.toBuffer('image/png'));
  console.log('  Written dmg-background.png');

  // Generate tray icons
  const trayIcons = [
    { name: 'tray-idle.png',       color: '#9ca3af' }, // grey
    { name: 'tray-recording.png',  color: '#ef4444' }, // red
    { name: 'tray-processing.png', color: '#eab308' }, // yellow
    { name: 'tray-error.png',      color: '#f97316' }, // orange
  ];

  for (const { name, color } of trayIcons) {
    console.log(`Generating resources/${name}...`);
    const canvas = drawTrayIcon(color);
    const png = canvas.toBuffer('image/png');
    fs.writeFileSync(path.join(resourcesDir, name), png);
    console.log(`  Written ${png.length} bytes`);
  }

  // Inject logo into built settings HTML as base64 to avoid asar path issues
  console.log('Inlining logo into built settings HTML...');
  const logoPng = fs.readFileSync(path.join(resourcesDir, 'logo.png'));
  const logoB64 = `data:image/png;base64,${logoPng.toString('base64')}`;
  const builtHtml = path.join(projectRoot, 'out/renderer/settings/index.html');
  let html = fs.readFileSync(builtHtml, 'utf8');
  html = html.replace('__LOGO_BASE64__', logoB64);
  fs.writeFileSync(builtHtml, html);
  console.log('  Done.');

  console.log('\nDone! All icon assets generated.');
}

main().catch((err) => {
  console.error('generate-icons failed:', err);
  process.exit(1);
});
