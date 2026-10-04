# VFX Machine

**A modular film-effects workbench for look development, plate review, and MCP-ready post-production workflows.**

VFX Machine is a Next.js App Router application designed as the visual control surface between a filmmaker, effect modules, AI providers, MCP servers, and DaVinci Resolve. The first build focuses on the workstation platform: inspect and configure effect manifests, load a local video, compare preview treatments, build a non-destructive effect graph, organize project metadata, and inspect future execution targets.

## Current build

- **Effect registry:** 16 independent JSON manifests are discovered from `effects/packs/**/manifest.json` and validated into a generated registry. Forms, capability metadata, cards, and technical routing information are rendered from manifest data—not a fixed list in the UI.
- **Viewer and timeline:** Native browser video supports local clip import, play/pause, frame stepping, scrub, loop, fit/zoom, fullscreen, and original/processed/split/wipe/A-B comparison. The bundled warehouse plate is a clearly labelled synthetic canvas scene; uploaded source footage remains local and unchanged.
- **Effect graph:** Drag nodes to reorder the live stack; toggle, duplicate, select, and remove modules. The stack drives look and overlay approximations in the viewer. Parameter edits are stored per effect instance.
- **Projects, versions, and jobs:** Project records, non-destructive effect-stack snapshots, and demo jobs persist in this browser. Snapshots can be compared, restored, and branched; demo jobs can be cancelled or retried. Media file blobs are not uploaded or written into project storage.
- **AI and MCP boundaries:** Prompt parsing creates a typed request locally. Provider and MCP adapter contracts are isolated under `src/lib/ai` and `src/lib/mcp`; the current Resolve server is explicitly disconnected, and its empty tool list is not presented as discovered capability. Token fields are ephemeral in-memory placeholders only.
- **Color:** 3D `.cube` LUT metadata can be inspected locally. LUT application is an adapter mapping with an approximate UI preview; this build does not apply the LUT to video pixels or produce a color-managed render.
- **Assets and settings:** Imported video stays local in memory. Provider token fields are intentionally session-only and are never transmitted by the demo build. No backend, provider credential, or Resolve connection is assumed.

The UI preview is an **illustrative local approximation**, not generated or composited output. Demo jobs, MCP dry-runs, and AI parsing are never represented as real provider, DaVinci, or render execution. No original footage is overwritten.

## Run locally

Requires Node.js **24 LTS** (or a compatible Node 22.12+ release) and npm.

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use **Load Plate** in the viewer or the **Assets** workspace to select a local `video/*` file. The media object URL lives only for the browser session.

## Effect modules

Add a directory with a `manifest.json` under `effects/packs/<department>/<effect-id>/`. Use the schema in [`src/types/effects.ts`](src/types/effects.ts) and copy an existing manifest as a starter. Each module defines:

- Stable ID, display metadata, tags, inputs, and outputs.
- Typed/ranged parameters with validated defaults.
- AI, MCP, and DaVinci capability mappings.
- A preview label and an explicit execution adapter/mode.

The registry builder walks nested packs, rejects invalid or duplicate modules, sorts the result deterministically, and writes `src/generated/effect-registry.json`. Both development startup and production builds rebuild it; `npm test` checks that the checked-in registry is current. Runtime provider execution is deliberately not inferred from a capability string.

## Architecture

- `src/app`: Next.js App Router, API route for the generated effect catalog, root shell.
- `src/components`: workstation, viewer, effect controls, XYFlow node graph, timeline, and utility panels.
- `src/types`: effect, job, project, and MCP contracts.
- `src/lib/effects`: manifest-driven parameters and demo preview transforms.
- `src/lib/color`: local 3D `.cube` parser and metadata validation.
- `src/lib/ai`: provider capability contracts and local structured-request parser.
- `src/lib/mcp`: app-owned MCP interface and visibly simulated demo adapter.
- `effects/packs`: separately installable effect manifests.
- `scripts/build-effect-registry.mjs`: discovery and schema validation.
- `docs/ARCHITECTURE.md`: execution boundaries, MCP security notes, and extension guide.

The browser uses native `<video>` for media transport and [XYFlow](https://github.com/xyflow/xyflow) for the interactive graph. Effect parameter state and adapters remain app-owned so the graph library is not coupled to rendering. A real MCP client belongs in a secured server-side adapter, not in the browser bundle. Any HTTP adapter must validate destinations and permissions to avoid SSRF and credential leaks; stdio servers require a trusted local host process.

## Verification

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

`npm test` checks registry freshness, manifest uniqueness and bounds, LUT parsing, parameter clamping, and local prompt structuring. A successful production build verifies the Next.js routes and component types; it does not assert a live MCP or DaVinci connection.

## Deployment

Deploy as a **Next.js Node application** (for example, Vercel or a Node server), not as a static export. The catalog API route uses the generated JSON registry. Uploaded footage stays in the user's browser. No API token is required for demo mode. A future live provider/MCP adapter needs server-side secret storage, scoped permission grants, URL allowlisting, execution audit records, and provider-specific job cancellation; do not expose long-lived tokens to client JavaScript.
