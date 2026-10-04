import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const registry = JSON.parse(await readFile(new URL('../src/generated/effect-registry.json', import.meta.url), 'utf8'));

test('effect registry is a non-empty set of unique modular manifests', () => {
  assert.equal(registry.length, 16);
  assert.equal(new Set(registry.map(effect => effect.id)).size, registry.length);
  for (const effect of registry) {
    assert.equal(effect.schemaVersion, 1);
    assert.ok(effect.name && effect.category && effect.version && effect.execution.adapter);
    assert.deepEqual(Object.keys(effect.capabilities).sort(), ['ai', 'davinci', 'mcp']);
    assert.equal(effect.execution.mode, 'demo');
    assert.equal(new Set(effect.parameters.map(parameter => parameter.id)).size, effect.parameters.length);
    for (const parameter of effect.parameters) {
      if (parameter.type === 'range') {
        assert.ok(parameter.min <= parameter.default && parameter.default <= parameter.max);
      }
    }
  }
});

test('registry groups contain the requested platform categories', () => {
  const categories = new Set(registry.map(effect => effect.category));
  for (const category of ['Action', 'Atmosphere', 'Camera', 'Cleanup', 'Color', 'Film Looks', 'Tracking']) assert.ok(categories.has(category));
});
