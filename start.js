#!/usr/bin/env node

/**
 * AUFA - Script de arranque universal
 * ====================================
 * Funciona en Windows, macOS y Linux.
 * Uso:
 *   Primera vez:  node start.js
 *   Siguientes:   node start.js
 *   Solo API:     node start.js --api
 *   Solo Web:     node start.js --web
 *   Reset DB:     node start.js --reset-db
 *   Skip checks:  node start.js --fast
 */

const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// ── Config ──────────────────────────────────────────────────
const ROOT = __dirname;
const API_DIR = path.join(ROOT, 'apps', 'api');
const WEB_DIR = path.join(ROOT, 'apps', 'web');
const ENV_EXAMPLE = path.join(ROOT, '.env.example');
const ENV_API = path.join(API_DIR, '.env');
const PRISMA_SCHEMA = path.join(API_DIR, 'prisma', 'schema.prisma');
const UPLOADS_DIR = path.join(API_DIR, 'uploads');

const args = process.argv.slice(2);
const FLAG_API_ONLY = args.includes('--api');
const FLAG_WEB_ONLY = args.includes('--web');
const FLAG_RESET_DB = args.includes('--reset-db');
const FLAG_FAST = args.includes('--fast');
const FLAG_HELP = args.includes('--help') || args.includes('-h');

// ── Colors ──────────────────────────────────────────────────
const C = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

function log(msg) { console.log(msg); }
function info(msg) { log(`${C.cyan}  ℹ ${C.reset}${msg}`); }
function ok(msg) { log(`${C.green}  ✓ ${C.reset}${msg}`); }
function warn(msg) { log(`${C.yellow}  ⚠ ${C.reset}${msg}`); }
function fail(msg) { log(`${C.red}  ✗ ${C.reset}${msg}`); }
function step(n, msg) { log(`\n${C.bright}${C.blue}[${n}]${C.reset} ${C.bright}${msg}${C.reset}`); }

function banner() {
  log(`
${C.blue}${C.bright}╔══════════════════════════════════════════════════╗
║     █████╗ ██╗   ██╗███████╗ █████╗              ║
║    ██╔══██╗██║   ██║██╔════╝██╔══██╗             ║
║    ███████║██║   ██║█████╗  ███████║             ║
║    ██╔══██║██║   ██║██╔══╝  ██╔══██║             ║
║    ██║  ██║╚██████╔╝██║     ██║  ██║             ║
║    ╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚═╝  ╚═╝             ║
║              Nube de Ligas                       ║
╚══════════════════════════════════════════════════╝${C.reset}
`);
}

function showHelp() {
  banner();
  log(`${C.bright}Uso:${C.reset}  node start.js [opciones]\n`);
  log(`${C.bright}Opciones:${C.reset}`);
  log(`  ${C.cyan}(sin opciones)${C.reset}  Verificar todo e iniciar API + Web`);
  log(`  ${C.cyan}--api${C.reset}           Iniciar solo el backend (API)`);
  log(`  ${C.cyan}--web${C.reset}           Iniciar solo el frontend (Web)`);
  log(`  ${C.cyan}--fast${C.reset}          Saltar verificaciones (arranque rapido)`);
  log(`  ${C.cyan}--reset-db${C.reset}      Borrar y recrear la base de datos`);
  log(`  ${C.cyan}--help, -h${C.reset}      Mostrar esta ayuda\n`);
  log(`${C.bright}Credenciales demo:${C.reset}`);
  log(`  Super Admin:  admin@aufa.uy / admin123`);
  log(`  Organizador:  organizador@ligademo.uy / liga123`);
  log(`  Jugador (CI): 12345678 / player123\n`);
  process.exit(0);
}

// ── Helpers ─────────────────────────────────────────────────
function run(cmd, opts = {}) {
  try {
    return execSync(cmd, {
      stdio: opts.silent ? 'pipe' : 'inherit',
      cwd: opts.cwd || ROOT,
      env: { ...process.env, ...opts.env },
      timeout: opts.timeout || 120000,
    });
  } catch (e) {
    if (opts.canFail) return null;
    throw e;
  }
}

function runSilent(cmd, opts = {}) {
  try {
    const result = execSync(cmd, {
      stdio: 'pipe',
      cwd: opts.cwd || ROOT,
      timeout: opts.timeout || 30000,
    });
    return result.toString().trim();
  } catch {
    return null;
  }
}

function fileExists(p) { return fs.existsSync(p); }
function dirExists(p) { return fs.existsSync(p) && fs.statSync(p).isDirectory(); }

function ask(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(`${C.yellow}  ? ${C.reset}${question} `, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

function spawnProcess(name, cmd, args, cwd, env = {}) {
  const isWin = process.platform === 'win32';
  const proc = spawn(isWin ? 'cmd' : cmd, isWin ? ['/c', cmd, ...args] : args, {
    cwd,
    stdio: 'pipe',
    env: { ...process.env, ...env, FORCE_COLOR: '1' },
    shell: isWin,
  });

  const prefix = name === 'API' ? `${C.cyan}[API]${C.reset}` : `${C.green}[WEB]${C.reset}`;

  proc.stdout.on('data', (data) => {
    data.toString().split('\n').filter(Boolean).forEach((line) => {
      console.log(`${prefix} ${line}`);
    });
  });

  proc.stderr.on('data', (data) => {
    data.toString().split('\n').filter(Boolean).forEach((line) => {
      console.log(`${prefix} ${C.gray}${line}${C.reset}`);
    });
  });

  proc.on('error', (err) => {
    fail(`${name} error: ${err.message}`);
  });

  return proc;
}

// ── Checks ──────────────────────────────────────────────────

function checkNode() {
  step('1/7', 'Verificando Node.js...');
  const version = runSilent('node --version');
  if (!version) {
    fail('Node.js no esta instalado.');
    log(`\n    Descargalo de: ${C.cyan}https://nodejs.org${C.reset} (version LTS)\n`);
    process.exit(1);
  }
  const major = parseInt(version.replace('v', '').split('.')[0]);
  if (major < 18) {
    fail(`Node.js ${version} detectado. Se requiere v18+.`);
    log(`\n    Descarga la version LTS de: ${C.cyan}https://nodejs.org${C.reset}\n`);
    process.exit(1);
  }
  ok(`Node.js ${version}`);
}

function checkNpm() {
  const version = runSilent('npm --version');
  if (!version) {
    fail('npm no encontrado. Se instala junto con Node.js.');
    process.exit(1);
  }
  ok(`npm v${version}`);
}

async function checkPostgres() {
  step('2/7', 'Verificando PostgreSQL...');

  // Try connecting with psql
  const psqlVersion = runSilent('psql --version');
  if (psqlVersion) {
    ok(`${psqlVersion.split('\n')[0]}`);
  }

  // Read DATABASE_URL from .env to test connection
  if (fileExists(ENV_API)) {
    const envContent = fs.readFileSync(ENV_API, 'utf-8');
    const match = envContent.match(/DATABASE_URL="?([^"\n]+)"?/);
    if (match) {
      const dbUrl = match[1];
      // Test connection via prisma
      const result = runSilent(`npx prisma db execute --stdin --url "${dbUrl}" <<< "SELECT 1"`, { cwd: API_DIR, timeout: 15000 });
      if (result !== null) {
        ok('Conexion a PostgreSQL exitosa');
        return true;
      }
    }
  }

  // If we can't test, just warn
  warn('No se pudo verificar la conexion a PostgreSQL.');
  info('Asegurate de que PostgreSQL esta corriendo y los datos en .env son correctos.');
  info('Si usas Docker:  docker compose up -d postgres');
  const answer = await ask('Continuar de todos modos? (s/n)');
  if (answer !== 's' && answer !== 'si') {
    log('\n  Arranca PostgreSQL y volve a correr este script.\n');
    process.exit(0);
  }
  return false;
}

function setupEnv() {
  step('3/7', 'Configurando variables de entorno...');

  // API .env
  if (!fileExists(ENV_API)) {
    if (fileExists(ENV_EXAMPLE)) {
      fs.copyFileSync(ENV_EXAMPLE, ENV_API);
      ok(`Creado apps/api/.env desde .env.example`);
      info('Revisa apps/api/.env si tu PostgreSQL usa otro usuario/contrasena.');
    } else {
      // Create a default .env
      const defaultEnv = `# Database
DATABASE_URL="postgresql://aufa:aufa_secret@localhost:5432/aufa?schema=public"

# Auth
JWT_SECRET="dev-secret-aufa-2026"
JWT_REFRESH_SECRET="dev-refresh-secret-aufa-2026"
JWT_EXPIRES_IN="15m"
JWT_REFRESH_EXPIRES_IN="7d"

# App
NODE_ENV="development"
API_PORT=3001
API_URL="http://localhost:3001"
WEB_URL="http://localhost:3000"

# File uploads
UPLOAD_DIR="./uploads"
MAX_FILE_SIZE=5242880

# Super Admin
SUPER_ADMIN_EMAIL="admin@aufa.uy"
SUPER_ADMIN_PASSWORD="change-me"
`;
      fs.writeFileSync(ENV_API, defaultEnv);
      ok('Creado apps/api/.env con valores por defecto');
    }
  } else {
    ok('apps/api/.env ya existe');
  }

  // Web .env.local (for NEXT_PUBLIC_API_URL)
  const webEnvLocal = path.join(WEB_DIR, '.env.local');
  if (!fileExists(webEnvLocal)) {
    fs.writeFileSync(webEnvLocal, 'NEXT_PUBLIC_API_URL=http://localhost:3001\n');
    ok('Creado apps/web/.env.local');
  } else {
    ok('apps/web/.env.local ya existe');
  }
}

function installDependencies() {
  step('4/7', 'Instalando dependencias...');

  const nodeModulesRoot = path.join(ROOT, 'node_modules');
  const nodeModulesApi = path.join(API_DIR, 'node_modules');
  const nodeModulesWeb = path.join(WEB_DIR, 'node_modules');

  // Check if already installed
  if (dirExists(nodeModulesRoot) && dirExists(nodeModulesApi) && dirExists(nodeModulesWeb)) {
    // Quick check: compare package-lock timestamp with node_modules
    const lockFile = path.join(ROOT, 'package-lock.json');
    if (fileExists(lockFile)) {
      const lockMtime = fs.statSync(lockFile).mtimeMs;
      const nmMtime = fs.statSync(nodeModulesRoot).mtimeMs;
      if (nmMtime > lockMtime) {
        ok('Dependencias ya instaladas (sin cambios)');
        return;
      }
    }
  }

  info('Instalando paquetes (esto puede tardar un minuto la primera vez)...');
  run('npm install', { timeout: 300000 });
  ok('Dependencias instaladas');
}

function setupPrisma() {
  step('5/7', 'Configurando base de datos (Prisma)...');

  // Always generate the client
  info('Generando cliente Prisma...');
  run('npx prisma generate', { cwd: API_DIR });
  ok('Cliente Prisma generado');

  if (FLAG_RESET_DB) {
    warn('Flag --reset-db detectado: recreando base de datos...');
    run('npx prisma db push --force-reset --accept-data-loss', { cwd: API_DIR });
    ok('Base de datos recreada desde cero');
    info('Cargando datos de prueba...');
    run('npx tsx prisma/seed.ts', { cwd: API_DIR, timeout: 60000 });
    ok('Datos de prueba cargados');
    return;
  }

  // Push schema (creates tables if they don't exist, safe to re-run)
  info('Sincronizando esquema con la base de datos...');
  const pushResult = run('npx prisma db push', { cwd: API_DIR, canFail: true });

  if (pushResult === null) {
    fail('No se pudo conectar a PostgreSQL.');
    info('Verifica que PostgreSQL esta corriendo y que DATABASE_URL en apps/api/.env es correcta.');
    info('Si usas Docker: docker compose up -d postgres');
    process.exit(1);
  }
  ok('Esquema sincronizado');
}

async function seedDatabase() {
  step('6/7', 'Verificando datos de prueba...');

  // Check if seed data already exists by trying to query
  // We do this by checking if prisma can find users
  const checkCmd = `npx tsx -e "
    const { PrismaClient } = require('@prisma/client');
    const p = new PrismaClient();
    p.user.count().then(c => { console.log(c); p.\\$disconnect(); }).catch(() => { console.log(0); p.\\$disconnect(); });
  "`;

  const userCount = runSilent(checkCmd, { cwd: API_DIR, timeout: 15000 });
  const count = parseInt(userCount || '0');

  if (count > 0 && !FLAG_RESET_DB) {
    ok(`Base de datos tiene ${count} usuarios. Seed no es necesario.`);
    return;
  }

  info('Cargando datos de prueba (jugadores, equipos, torneo demo)...');
  run('npx tsx prisma/seed.ts', { cwd: API_DIR, timeout: 60000 });
  ok('Datos de prueba cargados');
  log('');
  log(`  ${C.bright}Credenciales de prueba:${C.reset}`);
  log(`  ${C.gray}──────────────────────────────────────────${C.reset}`);
  log(`  Super Admin:    ${C.cyan}admin@aufa.uy${C.reset} / admin123`);
  log(`  Organizador:    ${C.cyan}organizador@ligademo.uy${C.reset} / liga123`);
  log(`  Jugador (CI):   CI: ${C.cyan}12345678${C.reset} / player123`);
  log(`  Jugador (mail): ${C.cyan}martin@example.com${C.reset} / player123`);
  log(`  ${C.gray}──────────────────────────────────────────${C.reset}`);
}

function ensureUploadDirs() {
  const dirs = ['identity', 'medical', 'logos', 'general'];
  for (const dir of dirs) {
    const fullPath = path.join(UPLOADS_DIR, dir);
    if (!dirExists(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  }
  ok('Directorios de uploads verificados');
}

function startServers() {
  step('7/7', 'Iniciando servidores...');

  const procs = [];

  if (!FLAG_WEB_ONLY) {
    info('Iniciando API en http://localhost:3001 ...');
    const apiProc = spawnProcess('API', 'npx', ['tsx', 'watch', 'src/index.ts'], API_DIR);
    procs.push(apiProc);
  }

  if (!FLAG_API_ONLY) {
    // Small delay so API starts first
    const webDelay = FLAG_WEB_ONLY ? 0 : 2000;
    setTimeout(() => {
      info('Iniciando Web en http://localhost:3000 ...');
      const webProc = spawnProcess('WEB', 'npx', ['next', 'dev', '-p', '3000'], WEB_DIR);
      procs.push(webProc);
    }, webDelay);
  }

  log('');
  log(`${C.bright}${C.green}  AUFA esta arrancando!${C.reset}`);
  log('');
  if (!FLAG_WEB_ONLY) log(`  ${C.bright}API:${C.reset} http://localhost:3001`);
  if (!FLAG_API_ONLY) log(`  ${C.bright}Web:${C.reset} http://localhost:3000`);
  log('');
  log(`  ${C.gray}Presiona Ctrl+C para detener ambos servidores.${C.reset}`);
  log('');

  // Graceful shutdown
  function shutdown() {
    log(`\n${C.yellow}  Deteniendo servidores...${C.reset}`);
    for (const proc of procs) {
      try {
        if (process.platform === 'win32') {
          execSync(`taskkill /pid ${proc.pid} /T /F`, { stdio: 'pipe' });
        } else {
          proc.kill('SIGTERM');
        }
      } catch { /* process may already be dead */ }
    }
    log(`${C.green}  Servidores detenidos. Hasta la proxima!${C.reset}\n`);
    process.exit(0);
  }

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// ── Main ────────────────────────────────────────────────────
async function main() {
  if (FLAG_HELP) showHelp();

  banner();

  if (FLAG_FAST) {
    info('Modo rapido: saltando verificaciones...');
    ensureUploadDirs();
    startServers();
    return;
  }

  checkNode();
  checkNpm();
  await checkPostgres();
  setupEnv();
  installDependencies();
  setupPrisma();
  await seedDatabase();
  ensureUploadDirs();
  startServers();
}

main().catch((err) => {
  fail(`Error inesperado: ${err.message}`);
  log(`\n${C.gray}${err.stack}${C.reset}\n`);
  process.exit(1);
});
