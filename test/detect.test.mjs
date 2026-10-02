import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Classic script: its function declarations land on the context.
const ctx = vm.createContext({});
vm.runInContext(readFileSync(new URL('../src/detect.js', import.meta.url), 'utf8'), ctx);

test('isDarkColor', () => {
  for (const c of [
    [0, 0, 0],
    [18, 18, 18],
    [40, 44, 52],
    [100, 100, 100],
  ])
    assert.equal(ctx.isDarkColor(c), true, String(c));
  for (const c of [
    [255, 255, 255],
    [245, 245, 245],
    [128, 128, 128],
    [255, 255, 0],
  ])
    assert.equal(ctx.isDarkColor(c), false, String(c));
});
