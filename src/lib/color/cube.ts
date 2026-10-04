export type CubeLut = {
  title: string;
  size: number;
  domainMin: [number, number, number];
  domainMax: [number, number, number];
  values: number[][];
};

export function parseCubeLut(source: string): CubeLut {
  let title = 'Untitled LUT';
  let size = 0;
  const domainMin: [number, number, number] = [0, 0, 0];
  const domainMax: [number, number, number] = [1, 1, 1];
  const values: number[][] = [];
  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    if (/^LUT_1D_SIZE\b/i.test(line)) throw new Error('1D .cube LUTs are not supported; only 3D LUT_3D_SIZE data can be inspected.');
    const titleMatch = line.match(/^TITLE\s+["']?(.*?)["']?$/i);
    if (titleMatch) { title = titleMatch[1]; continue; }
    const sizeMatch = line.match(/^LUT_3D_SIZE\s+(\d+)$/i);
    if (sizeMatch) { size = Number(sizeMatch[1]); continue; }
    const minMatch = line.match(/^DOMAIN_MIN\s+(.+)$/i);
    const maxMatch = line.match(/^DOMAIN_MAX\s+(.+)$/i);
    if (minMatch || maxMatch) {
      const parts = (minMatch ?? maxMatch)![1].trim().split(/\s+/).map(Number);
      if (parts.length !== 3 || parts.some(value => !Number.isFinite(value))) throw new Error('Invalid DOMAIN_MIN/MAX: expected three finite values.');
      (minMatch ? domainMin : domainMax).splice(0, 3, ...parts as [number, number, number]);
      continue;
    }
    const triplet = line.split(/\s+/).map(Number);
    if (triplet.length !== 3 || triplet.some(value => !Number.isFinite(value))) throw new Error(`Invalid LUT sample: ${line.slice(0, 60)}`);
    values.push(triplet);
  }
  if (!Number.isInteger(size) || size < 2 || size > 65) throw new Error('Only 3D .cube LUTs with LUT_3D_SIZE 2–65 are supported.');
  if (values.length !== size ** 3) throw new Error(`LUT declares ${size ** 3} samples but contains ${values.length}.`);
  if (domainMin.some((value, index) => domainMax[index] <= value)) throw new Error('Every DOMAIN_MAX value must exceed DOMAIN_MIN.');
  return { title, size, domainMin, domainMax, values };
}
