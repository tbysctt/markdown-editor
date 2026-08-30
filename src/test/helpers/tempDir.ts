import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export async function createTempDir(prefix = 'notebook-test-'): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

export async function removeTempDir(dirPath: string): Promise<void> {
  await fs.rm(dirPath, { recursive: true, force: true });
}
