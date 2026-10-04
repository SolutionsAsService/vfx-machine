# Architecture and Execution Boundaries

## Platform flow

```text
local video / project metadata
          ↓
effect manifest registry → parameterized instances → comparison preview
          ↓                                      ↓
AI provider adapter contract               non-destructive graph
          ↓                                      ↓
MCP adapter contract → discovered server schemas → DaVinci target
```

The current execution path is the client-side **demo executor**. It supports local plate viewing, parameter editing, graph reordering and toggling, CSS/canvas look approximations, and locally simulated jobs. It does not generate media, call a provider, apply a Resolve node, or render a file. UI status remains `DEMO`, `DISCONNECTED`, or `NOT CONFIGURED` until an implementation proves otherwise.

## Effect modules

Effect manifests live in independently addressable pack directories under `effects/packs/`. `scripts/build-effect-registry.mjs` recursively discovers manifests and validates IDs, parameter types, bounded range defaults, select defaults, capability arrays, and execution mode. The generated JSON is the only catalog consumed by the registry API. The browser builds its forms from parameter metadata and does not own a hard-coded effect count.

An effect-specific runtime may later provide an executor alongside its manifest. That executor must declare supported inputs/outputs and an explicit run mode; a capability label is descriptive metadata and is not proof that a service supports a tool.

## Media viewer

The preview uses the browser's native `<video>` for local source files and a synthetic, canvas-rendered plate when no file is loaded. The sample is labelled as synthetic. Original/processed, split, wipe, and A/B modes compare the same local source. CSS look filters and compositing overlays are illustrative previews only; no processed video is generated or saved. Source bytes are never written back.

## AI provider boundary

`src/lib/ai/providers.ts` defines provider capability slots and the structured-effect-request type. The included prompt parser is local and intentionally simple: it extracts a few explicit fields but does not make an AI request. Provider credentials entered in Settings exist only in component memory and are neither persisted nor transmitted. A real provider connector belongs in a server-side adapter and must create a typed job with provider provenance and cancellation support.

## MCP and DaVinci boundary

`src/types/mcp.ts` defines server, tool, resource, permission, call-request, and result contracts. `src/lib/mcp/demo-adapter.ts` returns a disconnected DaVinci record and a simulated result that explicitly says it made no call. Empty tool/resource arrays represent undiscovered data, not a guessed Resolve API.

For a real adapter:

1. Select transport and authentication on a trusted server process. Browser code must not spawn stdio servers or receive long-lived tokens.
2. Validate an operator-approved URL against allowed schemes, hosts, and private-network policy before connecting. Never accept arbitrary browser-supplied fetch destinations; protect against SSRF, redirects, DNS rebinding, and local-network access.
3. Discover server identity, protocol version, tools, resources, and JSON schemas from the actual handshake. Store the observed schema and timestamp; do not infer tools from effect capability metadata.
4. Present scopes/permissions and argument schemas before execution. Validate call arguments against the discovered schema server-side.
5. Record a job with queued/running/complete/failed/cancelled status, server/tool identity, sanitized arguments, and returned error/result metadata. Do not log credentials.
6. Gate Resolve mutations behind an explicit user action and show whether the result was preview-only, applied, or rendered.

The official Model Context Protocol SDK can implement a future server-side adapter behind `McpAdapter`. This initial build does not configure or connect one.

## Projects and jobs

Project records, effect-stack JSON, and demo job records are stored in browser local storage. Uploaded video object URLs are ephemeral and are not persisted. Demo jobs progress locally and have no remote worker, render output, or cancellation beyond local queue state. Production project sharing, durable job storage, version history, and render artifacts require a separately designed backend.

## Add a module

1. Add `effects/packs/<department>/<slug>/manifest.json`.
2. Declare stable `id`, display details, `inputs`, `outputs`, unique parameters, capabilities, and explicit `execution.mode`/`adapter`.
3. Run `npm run effects:build` and `npm test`.
4. Open the module in the library. It appears from the generated manifest, even if no AI or MCP executor is configured.

Use existing pack manifests as examples. Do not describe a module as available in Resolve or an AI provider until an adapter has discovered and verified the operation.
