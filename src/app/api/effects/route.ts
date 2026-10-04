import registry from '@/generated/effect-registry.json';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json({ schemaVersion: 1, effects: registry }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}
