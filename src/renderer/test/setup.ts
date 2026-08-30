import { vi } from 'vitest';

vi.mock('*.css?inline', () => ({
  default: '',
}));
