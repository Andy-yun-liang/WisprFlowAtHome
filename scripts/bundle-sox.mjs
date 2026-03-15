#!/usr/bin/env node
/**
 * Bundles the SoX binary and all its dylib dependencies into resources/sox-bundle/
 * so the packaged Electron app doesn't require a user-installed SoX.
 *
 * Output layout:
 *   resources/sox-bundle/sox          ← the executable
 *   resources/sox-bundle/lib/*.dylib  ← all non-system dylibs
 *
 * Install names are rewritten to @loader_path-relative paths so they resolve
 * at runtime regardless of where the app is installed.
 */

if (process.platform !== 'darwin') {
  console.log(`Skipping SoX bundle step on ${process.platform}`)
  process.exit(0)
}

import { execSync } from 'child_process'
import { existsSync, mkdirSync, copyFileSync, chmodSync, realpathSync } from 'fs'
import { join, basename } from 'path'

const SOX_SRC = '/opt/homebrew/bin/sox'
const BUNDLE_DIR = 'resources/sox-bundle'
const LIB_DIR = join(BUNDLE_DIR, 'lib')
const SOX_DEST = join(BUNDLE_DIR, 'sox')

const SYSTEM_PREFIXES = ['/usr/lib/', '/System/Library/']
const isSystem = (p) => SYSTEM_PREFIXES.some((s) => p.startsWith(s))

/** Return all non-system dylib paths linked by a binary/dylib. */
function linkedLibs(binary) {
  try {
    return execSync(`otool -L "${binary}"`, { stdio: ['ignore', 'pipe', 'pipe'] })
      .toString()
      .split('\n')
      .slice(1) // skip header line (path:)
      .map((l) => l.trim().split(' ')[0])
      .filter((p) => p && p.startsWith('/') && !isSystem(p))
  } catch {
    return []
  }
}

/** Recursively collect every non-system transitive dep, resolving symlinks. */
function collectDeps(path, visited = new Set()) {
  const real = existsSync(path) ? realpathSync(path) : path
  if (visited.has(real)) return visited
  visited.add(real)
  for (const dep of linkedLibs(real)) {
    if (existsSync(dep)) collectDeps(dep, visited)
  }
  return visited
}

// ── Setup directories ────────────────────────────────────────────────────────
mkdirSync(BUNDLE_DIR, { recursive: true })
mkdirSync(LIB_DIR, { recursive: true })

// ── Copy sox binary ──────────────────────────────────────────────────────────
const soxReal = realpathSync(SOX_SRC)
copyFileSync(soxReal, SOX_DEST)
chmodSync(SOX_DEST, 0o755)
console.log(`Copied sox  ← ${soxReal}`)

// ── Collect & copy all dylib deps ────────────────────────────────────────────
const deps = collectDeps(soxReal)
deps.delete(soxReal) // sox binary itself — already copied

const libMap = new Map() // original path → bundled basename
for (const dep of deps) {
  const name = basename(dep)
  const dest = join(LIB_DIR, name)
  if (!existsSync(dest)) {
    copyFileSync(dep, dest)
    chmodSync(dest, 0o755)
    console.log(`Copied lib  ← ${name}`)
  }
  libMap.set(dep, name)
}

// Some libs are referenced by their opt/ symlink path as well as Cellar path.
// Build an alias map: every original path variant → bundled basename.
function aliasedLibMap() {
  const m = new Map(libMap)
  for (const [orig, name] of libMap) {
    // Also map the symlinked opt/ path (already in libMap if collected above)
    m.set(orig, name)
  }
  return m
}
const allLibMap = aliasedLibMap()

// Re-resolve: if linked lib path isn't in map try resolving it
function resolveToName(dep) {
  if (allLibMap.has(dep)) return allLibMap.get(dep)
  if (existsSync(dep)) {
    const real = realpathSync(dep)
    if (allLibMap.has(real)) return allLibMap.get(real)
    const name = basename(dep)
    // Check if a lib with matching basename is already bundled
    if (existsSync(join(LIB_DIR, name))) return name
  }
  return null
}

// ── Rewrite install names in the sox binary ──────────────────────────────────
console.log('\nRewriting sox binary install names…')
for (const dep of linkedLibs(SOX_DEST)) {
  if (!isSystem(dep)) {
    const name = resolveToName(dep)
    if (name) {
      execSync(`install_name_tool -change "${dep}" "@loader_path/lib/${name}" "${SOX_DEST}"`)
      console.log(`  sox: ${basename(dep)} → @loader_path/lib/${name}`)
    }
  }
}

// ── Rewrite install names in each bundled dylib ──────────────────────────────
console.log('\nRewriting dylib install names…')
for (const name of [...new Set(libMap.values())]) {
  const dest = join(LIB_DIR, name)

  // Update the dylib's own ID
  execSync(`install_name_tool -id "@loader_path/${name}" "${dest}"`)

  for (const dep of linkedLibs(dest)) {
    if (!isSystem(dep)) {
      const depName = resolveToName(dep)
      if (depName) {
        execSync(`install_name_tool -change "${dep}" "@loader_path/${depName}" "${dest}"`)
        console.log(`  ${name}: ${basename(dep)} → @loader_path/${depName}`)
      }
    }
  }
}

// ── Ad-hoc re-sign everything (required after modifying binaries on macOS) ───
console.log('\nAd-hoc signing…')
for (const name of [...new Set(libMap.values())]) {
  execSync(`codesign --force --sign - "${join(LIB_DIR, name)}"`)
}
execSync(`codesign --force --sign - "${SOX_DEST}"`)
console.log('Done.')

console.log(`\n✓ SoX bundle ready at ${BUNDLE_DIR}/`)
console.log(`  Binary : sox`)
console.log(`  Libs   : ${libMap.size} dylibs in lib/`)
