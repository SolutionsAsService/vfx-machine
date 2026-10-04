"use client";

import { useMemo, useState } from 'react';
import { Activity, ArrowUpRight, Check, ChevronRight, Clock3, CloudOff, FileUp, FolderPlus, KeyRound, Layers3, Play, Plus, RefreshCw, Server, Settings2, ShieldAlert, Sparkles, Video, WandSparkles, Workflow, X } from 'lucide-react';
import { parseCubeLut } from '@/lib/color/cube';
import { structureEffectPrompt } from '@/lib/ai/providers';
import type { CubeLut } from '@/lib/color/cube';
import type { AiProvider } from '@/lib/ai/providers';
import type { EffectManifest, WorkbenchJob } from '@/types/effects';
import type { EffectInstance } from '@/types/effects';
import type { McpServerDescriptor } from '@/types/mcp';

export type ProjectRecord = { id: string; name: string; timeline: string; updatedAt: number };
export type ProjectVersion = { id: string; projectName: string; label: string; createdAt: number; stack: EffectInstance[] };
export type AssetRecord = { name: string; type: string; size: number; url?: string };

export function UtilityWorkspace({
  section, effects, jobs, projects, versions, currentStack, assets, onQueueJob, onCreateProject, onChooseVideo, onAddEffect,
  onCancelJob, onRetryJob, onRestoreVersion, onDuplicateVersion,
}: {
  section: string;
  effects: EffectManifest[];
  jobs: WorkbenchJob[];
  projects: ProjectRecord[];
  versions: ProjectVersion[];
  currentStack: EffectInstance[];
  assets: AssetRecord[];
  onQueueJob: (effect: EffectManifest, title?: string) => void;
  onCreateProject: (name: string) => void;
  onChooseVideo: (file: File) => void;
  onAddEffect: (effect: EffectManifest) => void;
  onCancelJob: (id: string) => void;
  onRetryJob: (job: WorkbenchJob) => void;
  onRestoreVersion: (version: ProjectVersion) => void;
  onDuplicateVersion: (version: ProjectVersion) => void;
}) {
  if (section === 'mcp' || section === 'davinci') return <McpWorkspace effects={effects} onQueueJob={onQueueJob} focused={section === 'davinci'} />;
  if (section === 'ai') return <AiWorkspace effects={effects} onQueueJob={onQueueJob} onAddEffect={onAddEffect} />;
  if (section === 'projects') return <ProjectsWorkspace projects={projects} versions={versions} currentStack={currentStack} onCreateProject={onCreateProject} onRestoreVersion={onRestoreVersion} onDuplicateVersion={onDuplicateVersion} />;
  if (section === 'assets') return <AssetsWorkspace assets={assets} onChooseVideo={onChooseVideo} />;
  if (section === 'jobs') return <JobsWorkspace jobs={jobs} onQueueJob={onQueueJob} effects={effects} onCancelJob={onCancelJob} onRetryJob={onRetryJob} />;
  if (section === 'settings') return <SettingsWorkspace />;
  return <LibraryOverview effects={effects} onAddEffect={onAddEffect} />;
}

function SectionHeader({ eyebrow, title, description, action }: { eyebrow: string; title: string; description: string; action?: React.ReactNode }) {
  return <header className="utility-header"><div><span className="eyebrow">{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{action}</header>;
}

function LibraryOverview({ effects, onAddEffect }: { effects: EffectManifest[]; onAddEffect: (effect: EffectManifest) => void }) {
  const groups = useMemo(() => Object.groupBy(effects, effect => effect.category), [effects]);
  return <div className="utility-page effects-directory">
    <SectionHeader eyebrow="MODULAR EFFECT REGISTRY" title="Effects Library" description="Browse installed manifests. Capability chips describe adapter mappings; previews remain clearly marked as local demo approximations." action={<span className="status-pill">{effects.length} MODULES</span>} />
    {Object.entries(groups).map(([category, entries]) => <section className="directory-group" key={category}><div className="panel-heading"><span>{category.toUpperCase()}</span><small>{entries?.length ?? 0} EFFECTS</small></div><div className="directory-grid">{entries?.map(effect => <article className="directory-card" key={effect.id}><div className="effect-thumb thumb-neutral compact"><div className="thumb-scene"><i /><i /><i /><b /></div><span className="thumb-corner">DEMO</span><strong>{effect.name}</strong></div><h3>{effect.name}</h3><p>{effect.summary}</p><div className="tag-row">{effect.tags.slice(0, 3).map(tag => <span className="tag" key={tag}>{tag}</span>)}</div><button className="button-secondary" type="button" onClick={() => onAddEffect(effect)}><Plus size={14} /> Add to current stack</button></article>)}</div></section>)}
  </div>;
}

function McpWorkspace({ effects, onQueueJob, focused }: { effects: EffectManifest[]; onQueueJob: (effect: EffectManifest, title?: string) => void; focused: boolean }) {
  const [selected, setSelected] = useState('davinci-local');
  const [message, setMessage] = useState('');
  const server: McpServerDescriptor = { id: 'davinci-local', name: 'DaVinci Resolve MCP', description: 'Connection slot for a user-configured MCP server. This workspace has no MCP endpoint attached.', version: 'Not connected', transport: 'streamable-http', status: 'disconnected', permissions: ['Project metadata', 'Timeline edits', 'Color nodes', 'Rendering'], capabilities: [...new Set(effects.flatMap(effect => effect.capabilities.mcp))].sort(), tools: [], resources: [] };
  const operations = server.capabilities;
  const inspector = [
    { name: 'server.info', description: 'Read server identity and advertised protocol capabilities.', schema: '{ }' },
    { name: 'tools.list', description: 'Discover names, descriptions, and JSON input schemas.', schema: '{ }' },
    { name: 'resources.list', description: 'Inspect project, timeline, and media resources exposed by the server.', schema: '{ }' },
    { name: 'tools.call', description: 'Invoke a capability only after schema and permission review.', schema: '{ name: string, arguments: object }' },
  ];
  const representative = effects.find(effect => effect.id === 'cinematic-grade') ?? effects[0];
  return <div className="utility-page">
    <SectionHeader eyebrow={focused ? 'POST-PRODUCTION TARGET' : 'MODEL CONTEXT PROTOCOL'} title={focused ? 'DaVinci Resolve' : 'MCP Servers'} description="Server metadata is adapter-driven. No backend is contacted in this demo workspace." action={<button type="button" className="button-secondary" onClick={() => setMessage('No endpoint configured. Add a secured Streamable HTTP adapter to connect a server.') }><RefreshCw size={14} /> Refresh discovery</button>} />
    <div className="mcp-layout">
      <aside className="mcp-server-list"><div className="panel-heading"><span>SERVERS</span><button className="small-icon-button" title="Add server" type="button" onClick={() => setMessage('Server setup is an adapter slot in this build; no MCP transport is connected.')}><Plus size={14} /></button></div>
        <button className={`mcp-server-row ${selected === server.id ? 'selected' : ''}`} type="button" onClick={() => setSelected(server.id)}><span className="server-icon"><Server size={15} /></span><span><b>{server.name}</b><small>STREAMABLE HTTP · NOT CONFIGURED</small></span><span className="disconnected-dot" /></button>
        <div className="mcp-permission-note"><ShieldAlert size={15} /><span>Live MCP requires server URL validation, permission review, and secret handling. This demo never sends tool calls.</span></div>
      </aside>
      <section className="mcp-inspector"><div className="server-banner"><div className="server-icon large"><Server size={19} /></div><div><span className="eyebrow">SERVER INSPECTOR</span><h2>{server.name}</h2><p>{server.description}</p></div><span className="status-pill disconnected"><i /> DISCONNECTED</span></div>
        <div className="mcp-tabs"><button className="selected" type="button">TOOLS <b>{server.tools.length}</b></button><button type="button" onClick={() => setMessage('Resources are discovered after a server adapter connects.')}>RESOURCES <b>{server.resources.length}</b></button><button type="button" onClick={() => setMessage('No server handshake has been made yet.')}>CAPABILITIES</button></div>
        <div className="mcp-empty"><CloudOff size={22} /><b>No live tools discovered</b><span>Connect an MCP adapter to inspect its actual schemas. Capability mappings below come from the effect registry, not a server handshake.</span></div>
        <div className="capability-cloud">{operations.map(operation => <span className="tag" key={operation}>{operation}</span>)}</div>
        <div className="tool-schema-list"><div className="panel-heading"><span>PROTOCOL INSPECTOR</span><small>ADAPTER CONTRACT</small></div>{inspector.map(tool => <details className="tool-schema" key={tool.name}><summary><code>{tool.name}()</code><span>{tool.description}</span><ChevronRight size={14} /></summary><pre>{tool.schema}</pre></details>)}</div>
        <div className="mcp-test-bar"><button type="button" className="button-secondary" onClick={() => setMessage('Connection test skipped. No server URL is configured.')}>Test connection</button><button type="button" className="button-primary" onClick={() => { if (representative) onQueueJob(representative, 'MCP capability dry-run'); setMessage('Queued as a local demo job; no MCP call was made.'); }}>Run demo job</button></div>
        {message && <div className="inline-status"><InfoIcon />{message}<button type="button" onClick={() => setMessage('')}><X size={13} /></button></div>}
      </section>
    </div>
  </div>;
}

function InfoIcon() { return <Activity size={14} />; }

function AiWorkspace({ effects, onQueueJob, onAddEffect }: { effects: EffectManifest[]; onQueueJob: (effect: EffectManifest, title?: string) => void; onAddEffect: (effect: EffectManifest) => void }) {
  const [prompt, setPrompt] = useState('Create a cinematic smoke pass near the loading bay at frame 143, subtle and 18 frames long.');
  const [source, setSource] = useState('warehouse_demo.mov');
  const [request, setRequest] = useState<ReturnType<typeof structureEffectPrompt> | null>(null);
  const chosen = effects.find(effect => effect.id === request?.effectType.replaceAll(' ', '-')) ?? effects.find(effect => effect.id === 'smoke') ?? effects[0];
  function parsePrompt() {
    setRequest(structureEffectPrompt(prompt, source));
  }
  return <div className="utility-page">
    <SectionHeader eyebrow="PROVIDER-AGNOSTIC REQUEST BUILDER" title="AI Effects" description="Turn a creative brief into a structured operation request. Demo parsing is local; no generation provider is connected." action={<span className="status-pill">DEMO / NO PROVIDER</span>} />
    <div className="ai-workspace-grid"><section className="panel-card ai-prompt-card"><div className="panel-heading"><span>CREATIVE BRIEF</span><WandSparkles size={15} /></div><label className="field-label">SOURCE CLIP<input value={source} onChange={event => setSource(event.currentTarget.value)} /></label><label className="field-label">EFFECT REQUEST<textarea rows={5} value={prompt} onChange={event => setPrompt(event.currentTarget.value)} placeholder="Describe the desired media operation…" /></label><div className="ai-prompt-foot"><span>STRUCTURED LOCALLY · NOT SENT TO AN AI SERVICE</span><button type="button" className="button-primary" onClick={parsePrompt}><Sparkles size={14} /> Parse request</button></div></section>
      <section className="panel-card"><div className="panel-heading"><span>REQUEST PAYLOAD</span><span className="status-pill">{request ? 'READY · DEMO' : 'WAITING'}</span></div>{request ? <div className="request-fields">{Object.entries(request).map(([key, value]) => <div className="request-field" key={key}><span>{key.replace(/[A-Z]/g, letter => ` ${letter.toLowerCase()}`).toUpperCase()}</span><b>{String(value ?? '—')}</b></div>)}</div> : <div className="mcp-empty"><Activity size={21} /><b>Request not parsed</b><span>Parse the brief to preview a typed effect request before routing.</span></div>}
        {request && <div className="utility-actions"><button type="button" className="button-secondary" onClick={() => chosen && onAddEffect(chosen)}><Layers3 size={14} /> Add module</button><button type="button" className="button-primary" onClick={() => chosen && onQueueJob(chosen, `AI demo · ${request.effectType}`)}><Play size={14} /> Queue demo job</button></div>}
      </section></div>
    <section className="provider-grid"><div className="panel-heading"><span>PROVIDER ADAPTERS</span><small>PLUGGABLE · NO CREDENTIALS STORED</small></div>{['Image / video generation', 'Segmentation / rotoscoping', 'Tracking / analysis', 'Inpainting / upscaling'].map(name => <div className="provider-card" key={name}><span className="server-icon"><Sparkles size={14} /></span><div><b>{name}</b><small>Provider interface available · no provider configured</small></div><span className="status-pill disconnected">NOT CONFIGURED</span></div>)}</section>
  </div>;
}

function ProjectsWorkspace({ projects, versions, currentStack, onCreateProject, onRestoreVersion, onDuplicateVersion }: { projects: ProjectRecord[]; versions: ProjectVersion[]; currentStack: EffectInstance[]; onCreateProject: (name: string) => void; onRestoreVersion: (version: ProjectVersion) => void; onDuplicateVersion: (version: ProjectVersion) => void }) {
  const [name, setName] = useState('');
  const [compareId, setCompareId] = useState<string | null>(null);
  return <div className="utility-page">
    <SectionHeader eyebrow="LOCAL PROJECT WORKSPACE" title="Projects" description="Project records are stored in this browser. Original source media is not altered or uploaded." action={<span className="status-pill">LOCAL ONLY</span>} />
    <section className="project-create panel-card"><div><span className="eyebrow">NEW PROJECT</span><h2>Start a new cut</h2><p>Set up a project record to group plates, effect stacks, jobs, and timeline notes.</p></div><form onSubmit={event => { event.preventDefault(); if (name.trim()) { onCreateProject(name.trim()); setName(''); } }}><input value={name} onChange={event => setName(event.currentTarget.value)} placeholder="Project name" maxLength={80} /><button type="submit" className="button-primary"><FolderPlus size={14} /> Create project</button></form></section>
    <div className="panel-heading project-list-heading"><span>RECENT PROJECTS</span><small>{projects.length} LOCAL RECORDS</small></div>
    {projects.length ? <div className="project-grid">{projects.map(project => <article className="project-card" key={project.id}><div className="project-poster"><FilmGlyph /></div><span className="eyebrow">POST / 01</span><h3>{project.name}</h3><p>{project.timeline} · browser-local project metadata</p><div className="project-meta"><span>UPDATED {new Date(project.updatedAt).toLocaleDateString()}</span><ArrowUpRight size={14} /></div></article>)}</div> : <div className="empty-project"><FolderPlus size={22} /><b>No projects yet</b><span>Create one to start organizing clips and effect versions.</span></div>}
    <section className="version-list"><div className="panel-heading"><span>STACK VERSIONS</span><small>{versions.length} SAVED SNAPSHOTS · NON-DESTRUCTIVE</small></div>{versions.length ? versions.map(version => {
      const savedIds = new Set(version.stack.map(item => item.effectId));
      const currentIds = new Set(currentStack.map(item => item.effectId));
      const added = [...savedIds].filter(id => !currentIds.has(id));
      const removed = [...currentIds].filter(id => !savedIds.has(id));
      return <div className="version-row" key={version.id}><div><b>{version.label}</b><small>{version.projectName} · {version.stack.length} nodes · {new Date(version.createdAt).toLocaleString()}</small></div><span className="version-chip">{version.stack.filter(item => item.enabled).length} ACTIVE</span><button type="button" className="button-quiet" onClick={() => setCompareId(compareId === version.id ? null : version.id)}>{compareId === version.id ? 'Hide compare' : 'Compare'}</button><button type="button" className="button-secondary" onClick={() => onRestoreVersion(version)}>Restore</button><button type="button" className="small-icon-button" title="Duplicate as a version branch" onClick={() => onDuplicateVersion(version)}><CopyIcon /></button>{compareId === version.id && <p className="version-compare">Saved: {version.stack.length} nodes ({version.stack.filter(item => item.enabled).length} active) · Current: {currentStack.length} nodes ({currentStack.filter(item => item.enabled).length} active). Added modules: {added.join(', ') || 'none'} · not in snapshot: {removed.join(', ') || 'none'}.</p>}</div>;
    }) : <div className="version-empty">Save an effect-stack version from the viewer to create a restore point.</div>}</section>
  </div>;
}

function FilmGlyph() { return <Video size={25} />; }

function AssetsWorkspace({ assets, onChooseVideo }: { assets: AssetRecord[]; onChooseVideo: (file: File) => void }) {
  const [lut, setLut] = useState<CubeLut | null>(null);
  const [error, setError] = useState('');
  async function loadLut(file?: File) {
    if (!file) return;
    try { setLut(parseCubeLut(await file.text())); setError(''); }
    catch (cause) { setLut(null); setError(cause instanceof Error ? cause.message : 'Could not parse LUT.'); }
  }
  return <div className="utility-page">
    <SectionHeader eyebrow="MEDIA / LUTS / REFERENCES" title="Assets" description="Manage local source media and inspect 3D .cube LUT metadata. Files stay in your browser session unless you export them." action={<span className="status-pill">{assets.length} ASSETS</span>} />
    <div className="asset-actions"><label className="upload-drop"><FileUp size={18} /><b>Import video plate</b><span>Choose a local video file · stays on this device</span><input type="file" accept="video/*" onChange={event => { const file = event.currentTarget.files?.[0]; if (file) onChooseVideo(file); event.currentTarget.value = ''; }} /></label><label className="upload-drop lut-drop"><Layers3 size={18} /><b>Inspect a .cube LUT</b><span>3D LUT metadata only · this preview does not apply the LUT</span><input type="file" accept=".cube,text/plain" onChange={event => void loadLut(event.currentTarget.files?.[0])} /></label></div>
    {error && <div className="inline-error">{error}</div>}
    {lut && <div className="lut-inspector panel-card"><div className="panel-heading"><span>LUT INSPECTOR</span><span className="status-pill">PARSED · NOT APPLIED</span></div><h3>{lut.title}</h3><div className="request-fields"><div className="request-field"><span>3D GRID</span><b>{lut.size} × {lut.size} × {lut.size}</b></div><div className="request-field"><span>SAMPLES</span><b>{lut.values.length.toLocaleString()}</b></div><div className="request-field"><span>DOMAIN MIN</span><b>{lut.domainMin.join(' / ')}</b></div><div className="request-field"><span>DOMAIN MAX</span><b>{lut.domainMax.join(' / ')}</b></div></div></div>}
    <section className="asset-table"><div className="panel-heading"><span>LOCAL ASSET BIN</span><small>EPHEMERAL SESSION</small></div>{assets.length ? assets.map(asset => <div className="asset-row" key={`${asset.name}-${asset.size}`}><Video size={15} /><b>{asset.name}</b><span>{asset.type || 'media'}</span><small>{(asset.size / 1_048_576).toFixed(1)} MB</small><Check size={14} /></div>) : <div className="empty-project"><FilmGlyph /><b>No source media loaded</b><span>Import a video plate to preview it in the viewer.</span></div>}</section>
  </div>;
}

function JobsWorkspace({ jobs, onQueueJob, effects, onCancelJob, onRetryJob }: { jobs: WorkbenchJob[]; onQueueJob: (effect: EffectManifest, title?: string) => void; effects: EffectManifest[]; onCancelJob: (id: string) => void; onRetryJob: (job: WorkbenchJob) => void }) {
  return <div className="utility-page"><SectionHeader eyebrow="ASYNCHRONOUS OPERATION QUEUE" title="Jobs" description="Demo jobs simulate progress locally. They do not contact AI providers or mutate footage." action={<span className="status-pill">{jobs.filter(job => job.status === 'processing' || job.status === 'queued').length} ACTIVE</span>} />
    <div className="jobs-list">{jobs.length ? jobs.map(job => <article className="job-row" key={job.id}><div className="job-symbol"><Workflow size={16} /></div><div className="job-primary"><div className="job-title"><b>{job.title}</b><span className={`job-status ${job.status}`}>{job.status.toUpperCase()}</span></div><p>{effects.find(effect => effect.id === job.effectId)?.name ?? job.effectId} · browser demo executor</p><div className="job-progress"><i style={{ width: `${job.progress}%` }} /></div></div><div className="job-progress-label">{job.progress}%<small>{job.mode.toUpperCase()} MODE</small></div><div className="job-row-actions">{job.status === 'queued' || job.status === 'processing' ? <button type="button" className="button-quiet" onClick={() => onCancelJob(job.id)}>Cancel</button> : <button type="button" className="button-quiet" onClick={() => onRetryJob(job)}>Retry</button>}</div></article>) : <div className="empty-project"><Clock3 size={22} /><b>No jobs queued</b><span>Create a demo preview to see its local execution lifecycle.</span></div>}</div>
    <div className="utility-actions"><button type="button" className="button-secondary" onClick={() => effects[0] && onQueueJob(effects[0], 'Sample preview job')}><Plus size={14} /> Queue sample job</button></div>
  </div>;
}

function CopyIcon() { return <span className="copy-glyph">⧉</span>; }

function SettingsWorkspace() {
  const [tokens, setTokens] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState('');
  const slots: AiProvider[] = [
    { id: 'image', name: 'Image / video generation', status: 'not-configured', capabilities: ['image-generation', 'video-generation'], credentialField: 'API token' },
    { id: 'analysis', name: 'Tracking / segmentation', status: 'not-configured', capabilities: ['tracking', 'segmentation'], credentialField: 'Provider token' },
  ];
  return <div className="utility-page"><SectionHeader eyebrow="WORKBENCH PREFERENCES" title="Settings" description="Adapter credentials are intentionally session-only here. Nothing is sent until a provider integration is explicitly enabled." action={<span className="status-pill">LOCAL SESSION</span>} />
    <section className="settings-card"><div className="panel-heading"><span>AI PROVIDER SLOTS</span><KeyRound size={14} /></div><p className="muted-copy">These token fields are in-memory placeholders. They are not persisted or transmitted by this demo build.</p>{slots.map(slot => <div className="credential-row" key={slot.id}><div><b>{slot.name}</b><small>{slot.capabilities.join(' · ')}</small></div><input type="password" autoComplete="off" placeholder={`${slot.credentialField} · session only`} value={tokens[slot.id] ?? ''} onChange={event => setTokens(current => ({ ...current, [slot.id]: event.currentTarget.value }))} /><span className="disconnected-dot" /></div>)}<button type="button" className="button-secondary" onClick={() => { setTokens({}); setNotice('Session credentials cleared. No network request was made.'); }}><X size={14} /> Clear session fields</button>{notice && <div className="inline-status"><Check size={14} />{notice}</div>}</section>
    <section className="settings-card"><div className="panel-heading"><span>PROJECT STORAGE</span><Settings2 size={14} /></div><div className="setting-row"><div><b>Browser-local metadata</b><small>Projects, effect stacks, and jobs stay on this device. Uploaded media stays in memory.</small></div><span className="status-pill">ENABLED</span></div><div className="setting-row"><div><b>Original media</b><small>Source footage is never rewritten by demo previews.</small></div><span className="status-pill">READ ONLY</span></div></section>
  </div>;
}
