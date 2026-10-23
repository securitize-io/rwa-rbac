import { spawn, ChildProcess } from 'child_process';
import { closeSync, existsSync, mkdirSync, openSync } from 'fs';
import { join } from 'path';
import Mocha from 'mocha';
import { build } from './build';
import { inspect, output } from './inspect';
import { prepare } from './prepare';
import { local, localUrl } from './harness';

export async function run() {
  if (process.argv.includes('--refresh') || !existsSync(join(output, 'manifest.json'))) {
    await inspect();
    await prepare();
  }
  build();
  mkdirSync(output, { recursive: true });
  const port = new URL(localUrl).port;
  if (new URL(localUrl).hostname !== '127.0.0.1') throw new Error('Use a dedicated loopback Surfpool endpoint');
  // Fail if this port is already serving RPC. Never reset an unrelated validator.
  let occupied = false;
  try {
    await local('getHealth');
    occupied = true;
  } catch {
    /* unused port */
  }
  if (occupied) throw new Error(`Port ${port} is already in use; choose SURFPOOL_RPC_URL`);
  const log = openSync(join(output, 'surfpool.log'), 'w');
  let child: ChildProcess | undefined;
  try {
    child = spawn(
      process.env.SURFPOOL_BIN || 'surfpool',
      [
        'start',
        '--offline',
        '--no-deploy',
        '--no-tui',
        '--no-studio',
        '--skip-signature-verification',
        '--port',
        port,
        '--ws-port',
        String(Number(port) + 1),
        '--airdrop-amount',
        '0',
        '--log-path',
        join(output, 'surfpool-logs'),
        '--disable-instruction-profiling',
      ],
      {
        cwd: __dirname,
        stdio: ['ignore', log, log],
      }
    );
    let startError: Error | undefined;
    child.on('error', (error) => {
      startError = error;
    });
    let ready = false;
    for (let i = 0; i < 100; i++) {
      if (startError) throw startError;
      if (child.exitCode !== null) throw new Error(`Surfpool exited ${child.exitCode}; see artifacts/surfpool.log`);
      try {
        await local('getHealth');
        ready = true;
        break;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }
    if (!ready) throw new Error('Surfpool did not become ready; see artifacts/surfpool.log');
    process.env.RUN_MAINNET_PRUNING = '1';
    const mocha = new Mocha({ timeout: 120000 });
    mocha.addFile(join(__dirname, 'pruning.test.ts'));
    const failures = await new Promise<number>((resolve) => mocha.run(resolve));
    if (failures) throw new Error(`${failures} regression tests failed`);
  } finally {
    if (child?.pid && child.exitCode === null) {
      child.kill('SIGTERM');
      await new Promise<void>((resolve) => {
        child!.once('exit', () => resolve());
        setTimeout(() => {
          child!.kill('SIGKILL');
          resolve();
        }, 3000).unref();
      });
    }
    closeSync(log);
  }
}
if (require.main === module)
  run().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
