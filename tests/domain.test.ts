import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCubeLut } from '../src/lib/color/cube.ts';
import { structureEffectPrompt } from '../src/lib/ai/providers.ts';
import { clampParameter, defaultsForEffect, previewFilter } from '../src/lib/effects/parameters.ts';
import type { EffectManifest } from '../src/types/effects.ts';

const identityCube = `TITLE "Identity Test"
LUT_3D_SIZE 2
DOMAIN_MIN 0 0 0
DOMAIN_MAX 1 1 1
0 0 0
1 0 0
0 1 0
1 1 0
0 0 1
1 0 1
0 1 1
1 1 1`;

test('3D cube parser retains title, domain, grid size and all samples', () => {
  const parsed = parseCubeLut(identityCube);
  assert.equal(parsed.title, 'Identity Test');
  assert.equal(parsed.size, 2);
  assert.equal(parsed.values.length, 8);
  assert.deepEqual(parsed.domainMax, [1, 1, 1]);
});

test('cube parser rejects unsupported 1D and truncated lookup tables', () => {
  assert.throws(() => parseCubeLut('LUT_1D_SIZE 2\n0 0 0\n1 1 1'), /LUT_3D_SIZE/);
  assert.throws(() => parseCubeLut('LUT_3D_SIZE 2\n0 0 0'), /contains 1/);
});

test('prompt structuring extracts frame, duration, style and type without an external provider', () => {
  const result = structureEffectPrompt('Create a realistic smoke pass at frame 143 for 18 frames near the loading bay.', 'warehouse.mov');
  assert.equal(result.executionMode, 'demo');
  assert.equal(result.effectType, 'smoke');
  assert.equal(result.frame, 143);
  assert.equal(result.durationFrames, 18);
  assert.equal(result.style, 'realistic');
  assert.equal(result.sourceClip, 'warehouse.mov');
});

test('parameter defaults and bounded controls remain driven by manifest metadata', () => {
  const effect = { parameters: [
    { id: 'amount', label: 'Amount', group: 'Test', type: 'range', default: 0.5, min: 0, max: 1, step: 0.1 },
    { id: 'mode', label: 'Mode', group: 'Test', type: 'select', default: 'screen', options: ['screen', 'normal'] },
  ] } as unknown as EffectManifest;
  assert.deepEqual(defaultsForEffect(effect), { amount: 0.5, mode: 'screen' });
  assert.equal(clampParameter(effect.parameters[0], 2), 1);
  assert.equal(clampParameter(effect.parameters[1], 'unknown'), 'screen');
});

test('preview look adapter labels its composed output as a local approximation', () => {
  const effects = [{ id: 'cinematic-grade', parameters: [] }] as unknown as EffectManifest[];
  const look = previewFilter(effects, [{ effectId: 'cinematic-grade', enabled: true, parameters: { contrast: 0.2, saturation: -0.2, exposure: 0.1 } }]);
  assert.match(look.filter, /contrast\(1\.2\)/);
  assert.equal(look.approximate, true);
});
