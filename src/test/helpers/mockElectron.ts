import { vi } from 'vitest';

export const mockElectronPaths = {
  temp: '/tmp/notebook-test',
  home: '/home/testuser',
};

export function mockElectronApp(): void {
  vi.mock('electron', () => ({
    app: {
      getPath: vi.fn((name: string) => {
        if (name === 'temp') {
          return mockElectronPaths.temp;
        }
        if (name === 'home') {
          return mockElectronPaths.home;
        }
        return `/mock/${name}`;
      }),
    },
    net: { fetch: vi.fn() },
    protocol: {
      registerSchemesAsPrivileged: vi.fn(),
      handle: vi.fn(),
    },
  }));
}
