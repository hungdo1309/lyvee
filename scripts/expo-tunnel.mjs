import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const METRO_PORT = Number(process.env.RCT_METRO_PORT ?? process.env.EXPO_DEV_SERVER_PORT ?? 8081);

function loadEnvFile() {
  const envPath = join(process.cwd(), '.env');
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separator = trimmed.indexOf('=');
    if (separator === -1) continue;

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

function readAuthtokenFromConfig(path) {
  if (!existsSync(path)) return null;

  const content = readFileSync(path, 'utf8');
  const match = content.match(/^\s*authtoken:\s*(\S+)/m);
  return match?.[1] ?? null;
}

function resolveNgrokAuthtoken() {
  if (process.env.NGROK_AUTHTOKEN) {
    return process.env.NGROK_AUTHTOKEN;
  }

  const localAppData = process.env.LOCALAPPDATA ?? join(homedir(), 'AppData', 'Local');
  const configPaths = [
    join(localAppData, 'ngrok', 'ngrok.yml'),
    join(homedir(), '.ngrok2', 'ngrok.yml'),
    join(homedir(), '.config', 'ngrok', 'ngrok.yml'),
  ];

  for (const path of configPaths) {
    const token = readAuthtokenFromConfig(path);
    if (token) return token;
  }

  return null;
}

function printSetupHelp() {
  console.error('');
  console.error('LyVee remote dev needs your own free ngrok account.');
  console.error('Expo shared tunnel (expo start --tunnel) is broken and is not used here.');
  console.error('');
  console.error('Setup (one time):');
  console.error('  1. Create a token: https://dashboard.ngrok.com/get-started/your-authtoken');
  console.error('  2. Either add NGROK_AUTHTOKEN=... to .env');
  console.error('     or run: ngrok config add-authtoken YOUR_TOKEN');
  console.error('');
  console.error('Same WiFi? Use LAN mode instead: npm start');
}

async function startTunnel() {
  loadEnvFile();

  const authtoken = resolveNgrokAuthtoken();
  if (!authtoken) {
    printSetupHelp();
    process.exit(1);
  }

  process.env.NGROK_AUTHTOKEN = authtoken;

  const ngrok = await import('@ngrok/ngrok');

  console.log(`Starting ngrok tunnel to localhost:${METRO_PORT}...`);

  const listener = await ngrok.forward({
    addr: METRO_PORT,
    authtoken_from_env: true,
    host_header: 'localhost',
  });

  const tunnelUrl = listener.url();
  if (!tunnelUrl) {
    throw new Error('Ngrok did not return a public URL.');
  }

  console.log(`Tunnel ready: ${tunnelUrl}`);
  console.log('Starting Expo with EXPO_PACKAGER_PROXY_URL...\n');

  const expo = spawn('npx', ['expo', 'start', '--lan'], {
    stdio: 'inherit',
    shell: true,
    env: {
      ...process.env,
      EXPO_PACKAGER_PROXY_URL: tunnelUrl,
    },
  });

  let shuttingDown = false;

  const shutdown = async (exitCode = 0) => {
    if (shuttingDown) return;
    shuttingDown = true;

    try {
      await listener.close();
    } catch {
      // Ignore cleanup errors on forced exit.
    }

    process.exit(exitCode);
  };

  process.on('SIGINT', () => {
    expo.kill('SIGINT');
    void shutdown(0);
  });

  process.on('SIGTERM', () => {
    expo.kill('SIGTERM');
    void shutdown(0);
  });

  expo.on('exit', (code) => {
    void shutdown(code ?? 0);
  });
}

startTunnel().catch((error) => {
  console.error('\nTunnel failed to start.');
  console.error(error instanceof Error ? error.message : String(error));
  printSetupHelp();
  process.exit(1);
});
