import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const packsRoot = path.join(root, 'effects', 'packs');
const outputPath = path.join(root, 'src', 'generated', 'effect-registry.json');

async function manifestFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(entry => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return manifestFiles(entryPath);
    return entry.name === 'manifest.json' ? [entryPath] : [];
  }));
  return nested.flat();
}

function validate(manifest, sourcePath) {
  const required = ['id', 'name', 'category', 'version', 'summary', 'tags', 'preview', 'inputs', 'outputs', 'parameters', 'capabilities', 'execution'];
  if (!manifest || manifest.schemaVersion !== 1 || required.some(key => !(key in manifest))) throw new Error(`${sourcePath}: missing required schema field.`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(manifest.id)) throw new Error(`${sourcePath}: invalid stable id.`);
  if (!Array.isArray(manifest.parameters) || !Array.isArray(manifest.tags) || !Array.isArray(manifest.inputs) || !Array.isArray(manifest.outputs)) throw new Error(`${sourcePath}: expected parameter/tag/input/output arrays.`);
  const parameterIds = new Set();
  for (const parameter of manifest.parameters) {
    if (!parameter.id || parameterIds.has(parameter.id)) throw new Error(`${sourcePath}: missing or duplicate parameter id.`);
    parameterIds.add(parameter.id);
    if (!['range', 'select', 'toggle', 'color'].includes(parameter.type)) throw new Error(`${sourcePath}: unsupported parameter type ${parameter.type}.`);
    if (parameter.type === 'range' && (!Number.isFinite(parameter.default) || parameter.min > parameter.max || parameter.default < parameter.min || parameter.default > parameter.max)) throw new Error(`${sourcePath}: range defaults must be within bounds.`);
    if (parameter.type === 'select' && (!parameter.options?.length || !parameter.options.includes(parameter.default))) throw new Error(`${sourcePath}: select default must be one of its options.`);
  }
  if (!manifest.capabilities || !['ai', 'mcp', 'davinci'].every(key => Array.isArray(manifest.capabilities[key]))) throw new Error(`${sourcePath}: capabilities need ai, mcp, and davinci arrays.`);
  if (manifest.execution.mode !== 'demo') throw new Error(`${sourcePath}: this initial build only supports explicit demo execution.`);
}

const files = (await manifestFiles(packsRoot)).sort();
const manifests = await Promise.all(files.map(async file => {
  const manifest = JSON.parse(await readFile(file, 'utf8'));
  validate(manifest, path.relative(root, file));
  return manifest;
}));
const ids = new Set();
for (const manifest of manifests) {
  if (ids.has(manifest.id)) throw new Error(`Duplicate effect id: ${manifest.id}`);
  ids.add(manifest.id);
}
manifests.sort((left, right) => left.category.localeCompare(right.category) || left.name.localeCompare(right.name));
await mkdir(path.dirname(outputPath), { recursive: true });
const output = `${JSON.stringify(manifests, null, 2)}\n`;
if (process.argv.includes('--check')) {
  const current = await readFile(outputPath, 'utf8').catch(() => '');
  if (current !== output) throw new Error('Generated effect registry is stale; run npm run effects:build.');
} else {
  await writeFile(outputPath, output);
}
console.log(`Effect registry: ${manifests.length} validated modules → ${path.relative(root, outputPath)}`);
