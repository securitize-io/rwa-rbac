import { spawnSync } from 'child_process';
import { mkdirSync } from 'fs';
import { join, resolve } from 'path';

export function build() {
  const root = resolve(__dirname, '../..');
  const artifacts = join(__dirname, 'artifacts');
  mkdirSync(join(artifacts, 'build'), { recursive: true });
  const result = spawnSync(
    'cargo',
    [
      'build-sbf',
      '--manifest-path',
      join(root, 'programs/rwa-rbac/Cargo.toml'),
      '--sbf-out-dir',
      join(artifacts, 'build'),
      '--',
      '--locked',
    ],
    {
      cwd: root,
      stdio: 'inherit',
      env: { ...process.env, CARGO_TARGET_DIR: join(artifacts, 'build-cache') },
    }
  );
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`RBAC build failed: ${result.status}`);
}
if (require.main === module) {
  try {
    build();
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  }
}
