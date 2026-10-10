import { spawn } from 'node:child_process'
import path from 'node:path'
import './prepare-release.mjs'

// The cache stays on the project drive to avoid the observed Windows EXDEV failure.
const env = { ...process.env, ELECTRON_BUILDER_CACHE: process.env.ELECTRON_BUILDER_CACHE || path.resolve('.cache/electron-builder') }
const child = spawn(process.execPath, ['node_modules/electron-builder/cli.js', '--win', process.argv.includes('--dir') ? '--dir' : 'nsis', '--x64'], { env, stdio: 'inherit', windowsHide: true })
child.on('error', (error) => { console.error(error); process.exitCode = 1 })
child.on('exit', (code) => { process.exitCode = code ?? 1 })
