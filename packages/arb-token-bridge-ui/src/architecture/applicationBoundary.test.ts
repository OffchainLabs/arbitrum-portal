import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('application dependency boundary', () => {
  const directory = path.resolve(import.meta.dirname, '../application');
  const modules = readdirSync(directory).filter(
    (name) => name.endsWith('.ts') && !name.includes('.test.'),
  );
  it.each(modules)('%s has no component imports', (name) => {
    const text = readFileSync(path.join(directory, name), 'utf8');
    expect(text).not.toMatch(/from\s+['"][^'"]*components\//);
  });
  it('history reads do not import UI effects or hook implementations', () => {
    const text = readFileSync(path.resolve(import.meta.dirname, '../services/history.ts'), 'utf8');
    expect(text).not.toMatch(/from\s+['"][^'"]*components\//);
    expect(text).not.toMatch(/from\s+['"][^'"]*hooks\/(?!arbTokenBridge\.types)/);
  });
});
