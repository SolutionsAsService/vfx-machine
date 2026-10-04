"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  Activity, Aperture, Archive, ArrowUpRight, AudioLines, BadgeCheck, Brush, ChevronDown,
  CircleHelp, Clock3, Cloud, Code2, Contrast, Crosshair, Film, FolderOpen, Grid2X2,
  Layers3, ListFilter, Menu, PanelRight, Play, Radio, Search, Settings, Sparkles, SunMoon,
  Save, Target, TimerReset, Video, Workflow, X,
} from 'lucide-react';
import type { EffectInstance, EffectManifest, WorkbenchJob } from '@/types/effects';
import { clampParameter, defaultsForEffect } from '@/lib/effects/parameters';
import { Viewer, type ViewerHandle } from './Viewer';
import { EffectControls } from './EffectControls';
import { EffectGraph } from './EffectGraph';
import { EffectShelf } from './EffectShelf';
import { TimelinePanel } from './TimelinePanel';
import { UtilityWorkspace, type AssetRecord, type ProjectRecord, type ProjectVersion } from './UtilityWorkspace';

const STORAGE = 'vfx-machine-workbench-v1';
const navGroups = [
  { label: 'WORKSPACE', links: [
    { href: '/viewer', title: 'Viewer', icon: Video }, { href: '/effects', title: 'Effects Library', icon: Grid2X2 }, { href: '/ai', title: 'AI Effects', icon: Sparkles },
  ] },
  { label: 'EFFECT DEPARTMENTS', links: [
    { href: '/color', title: 'Color', icon: Contrast }, { href: '/compositing', title: 'Compositing', icon: Layers3 },
    { href: '/tracking', title: 'Tracking', icon: Crosshair }, { href: '/cleanup', title: 'Cleanup', icon: Brush },
    { href: '/atmosphere', title: 'Atmosphere', icon: Cloud }, { href: '/sci-fi', title: 'Sci-Fi', icon: Radio },
    { href: '/horror', title: 'Horror', icon: Aperture }, { href: '/action', title: 'Action', icon: Target }, { href: '/film-looks', title: 'Film Looks', icon: SunMoon },
  ] },
  { label: 'PRODUCTION', links: [
    { href: '/projects', title: 'Projects', icon: FolderOpen }, { href: '/timeline', title: 'Timeline', icon: AudioLines },
    { href: '/assets', title: 'Assets', icon: Archive }, { href: '/jobs', title: 'Jobs', icon: Clock3 },
  ] },
  { label: 'INTEGRATIONS', links: [
    { href: '/mcp', title: 'MCP Inspector', icon: Code2 }, { href: '/davinci', title: 'DaVinci Resolve', icon: Film }, { href: '/settings', title: 'Settings', icon: Settings },
  ] },
];

const categoryByRoute: Record<string, string[]> = {
  color: ['Color', 'Film Looks'], compositing: ['Action', 'Atmosphere'], tracking: ['Tracking'], cleanup: ['Cleanup'], atmosphere: ['Atmosphere'],
  'sci-fi': ['Film Looks', 'Camera'], horror: ['Film Looks', 'Atmosphere'], action: ['Action', 'Camera'], 'film-looks': ['Film Looks', 'Color'],
};

function stableId(prefix: string) {
  return `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`}`;
}

function seedStack(effects: EffectManifest[]): EffectInstance[] {
  return ['cinematic-grade', 'film-grain'].flatMap(id => {
    const effect = effects.find(item => item.id === id);
    return effect ? [{ instanceId: stableId('fx'), effectId: id, enabled: true, parameters: defaultsForEffect(effect) }] : [];
  });
}

function readStoredWorkspace() {
  const fallback = { stack: null as EffectInstance[] | null, projects: [] as ProjectRecord[], versions: [] as ProjectVersion[], jobs: [] as WorkbenchJob[], projectName: 'BLACK HORIZON / EP 01' };
  if (typeof window === 'undefined') return fallback;
  try {
    const stored = localStorage.getItem(STORAGE);
    if (!stored) return fallback;
    const parsed = JSON.parse(stored) as Partial<typeof fallback>;
    return {
      stack: Array.isArray(parsed.stack) ? parsed.stack : fallback.stack,
      projects: Array.isArray(parsed.projects) ? parsed.projects : fallback.projects,
      versions: Array.isArray(parsed.versions) ? parsed.versions : fallback.versions,
      jobs: Array.isArray(parsed.jobs) ? parsed.jobs : fallback.jobs,
      projectName: typeof parsed.projectName === 'string' ? parsed.projectName : fallback.projectName,
    };
  } catch { return fallback; }
}

export function Workbench() {
  const router = useRouter();
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);
  const section = segments[0] || 'viewer';
  const effectSlug = section === 'effects' ? segments[1] : undefined;
  const [effects, setEffects] = useState<EffectManifest[]>([]);
  const [registryError, setRegistryError] = useState('');
  const [stack, setStack] = useState<EffectInstance[]>([]);
  const [selectedEffectId, setSelectedEffectId] = useState('gunshot-impact');
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [effectParameters, setEffectParameters] = useState<Record<string, Record<string, number | string | boolean>>>({});
  const [previewEffectId, setPreviewEffectId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaName, setMediaName] = useState('');
  const [assets, setAssets] = useState<AssetRecord[]>([]);
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [versions, setVersions] = useState<ProjectVersion[]>([]);
  const [projectName, setProjectName] = useState('BLACK HORIZON / EP 01');
  const [jobs, setJobs] = useState<WorkbenchJob[]>([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(26);
  const [notice, setNotice] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [navigationOpen, setNavigationOpen] = useState(false);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const mediaUrlRef = useRef<string | null>(null);
  const viewerRef = useRef<ViewerHandle>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    fetch('/api/effects', { cache: 'no-store' }).then(async response => {
      if (!response.ok) throw new Error(`Effect registry request failed (${response.status}).`);
      const payload = await response.json() as { effects?: EffectManifest[] };
      if (!Array.isArray(payload.effects)) throw new Error('Effect registry response has no effects array.');
      if (!alive) return;
      const saved = readStoredWorkspace();
      const validIds = new Set(payload.effects.map(effect => effect.id));
      setEffects(payload.effects);
      setSelectedEffectId(current => payload.effects?.find(effect => effect.id === current)?.id ?? payload.effects?.[0]?.id ?? '');
      setStack(saved.stack ? saved.stack.filter(item => validIds.has(item.effectId)) : seedStack(payload.effects));
      setProjects(saved.projects); setVersions(saved.versions); setJobs(saved.jobs); setProjectName(saved.projectName); setLoaded(true);
      setRegistryError('');
    }).catch(error => {
      if (!alive) return;
      const saved = readStoredWorkspace();
      if (saved.stack) setStack(saved.stack);
      setProjects(saved.projects); setVersions(saved.versions); setJobs(saved.jobs); setProjectName(saved.projectName); setLoaded(true);
      setRegistryError(error instanceof Error ? error.message : 'Effect registry unavailable.');
    });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === 'Escape') {
        setNavigationOpen(false);
        searchRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleShortcut);
    return () => window.removeEventListener('keydown', handleShortcut);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(STORAGE, JSON.stringify({ stack, projects, versions, jobs, projectName }));
  }, [jobs, loaded, projectName, projects, stack, versions]);

  useEffect(() => () => {
    if (mediaUrlRef.current) URL.revokeObjectURL(mediaUrlRef.current);
  }, []);

  useEffect(() => {
    if (!notice) return undefined;
    const timeout = window.setTimeout(() => setNotice(''), 4800);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    const interval = window.setInterval(() => setJobs(current => current.map(job => {
      if (job.status === 'queued') return { ...job, status: 'processing', progress: Math.max(8, job.progress) };
      if (job.status === 'processing') {
        const progress = Math.min(100, job.progress + 11 + Math.round(Math.random() * 6));
        return { ...job, progress, status: progress >= 100 ? 'complete' : 'processing', message: progress >= 100 ? 'Demo operation completed locally; no render or MCP call was performed.' : job.message };
      }
      return job;
    })), 550);
    return () => window.clearInterval(interval);
  }, []);

  const selectedStackInstance = stack.find(item => item.instanceId === selectedInstanceId);
  const activeEffectId = selectedStackInstance?.effectId ?? effectSlug ?? selectedEffectId;
  const selectedEffect = effects.find(effect => effect.id === activeEffectId) ?? null;
  const routeCategories = categoryByRoute[section];
  const filteredEffects = useMemo(() => effects.filter(effect => {
    const categoryMatch = !routeCategories || routeCategories.includes(effect.category);
    const text = `${effect.name} ${effect.category} ${effect.summary} ${effect.tags.join(' ')}`.toLowerCase();
    return categoryMatch && text.includes(search.toLowerCase());
  }), [effects, routeCategories, search]);
  const previewEffect = effects.find(effect => effect.id === previewEffectId) ?? null;

  const openEffect = useCallback((effect: EffectManifest) => {
    setSelectedEffectId(effect.id); setSelectedInstanceId(null); setPreviewEffectId(null);
    router.push(`/effects/${effect.id}`);
  }, [router]);

  const addEffect = useCallback((effect: EffectManifest) => {
    const instance: EffectInstance = { instanceId: stableId('fx'), effectId: effect.id, enabled: true, parameters: defaultsForEffect(effect) };
    setStack(current => [...current, instance]); setSelectedEffectId(effect.id); setSelectedInstanceId(instance.instanceId); setNotice(`${effect.name} added as an editable stack node.`);
    setPreviewEffectId(null);
  }, []);

  const selectInstance = useCallback((instanceId: string) => {
    const instance = stack.find(item => item.instanceId === instanceId);
    if (!instance) return;
    setSelectedInstanceId(instanceId); setSelectedEffectId(instance.effectId);
  }, [stack]);

  const updateParameter = useCallback((key: string, value: number | string | boolean) => {
    const parameter = selectedEffect?.parameters.find(item => item.id === key);
    const safeValue = parameter ? clampParameter(parameter, value) : value;
    if (selectedEffect) setEffectParameters(current => ({ ...current, [selectedEffect.id]: { ...(current[selectedEffect.id] ?? defaultsForEffect(selectedEffect)), [key]: safeValue } }));
    if (selectedInstanceId) setStack(current => current.map(item => item.instanceId === selectedInstanceId ? { ...item, parameters: { ...item.parameters, [key]: safeValue } } : item));
  }, [selectedEffect, selectedInstanceId]);

  const toggleInstance = useCallback((instanceId: string) => setStack(current => current.map(item => item.instanceId === instanceId ? { ...item, enabled: !item.enabled } : item)), []);
  const duplicateInstance = useCallback((instanceId: string) => {
    const index = stack.findIndex(item => item.instanceId === instanceId);
    if (index < 0) return;
    const source = stack[index]; const duplicate = { ...source, instanceId: stableId('fx'), parameters: { ...source.parameters } };
    setStack(current => { const next = [...current]; const latestIndex = next.findIndex(item => item.instanceId === instanceId); next.splice(latestIndex + 1, 0, duplicate); return next; });
    setSelectedInstanceId(duplicate.instanceId); setSelectedEffectId(duplicate.effectId);
  }, [stack]);
  const removeInstance = useCallback((instanceId: string) => {
    setStack(current => current.filter(item => item.instanceId !== instanceId));
    if (selectedInstanceId === instanceId) setSelectedInstanceId(null);
  }, [selectedInstanceId]);
  const reorderStack = useCallback((ids: string[]) => setStack(current => {
    const byId = new Map(current.map(item => [item.instanceId, item]));
    return ids.flatMap(id => byId.has(id) ? [byId.get(id)!] : []);
  }), []);

  const queueJob = useCallback((effect: EffectManifest, title?: string) => {
    const job: WorkbenchJob = {
      id: `JOB-${String(Date.now()).slice(-5)}`, title: title ?? `Preview · ${effect.name}`, effectId: effect.id,
      status: 'queued', progress: 0, mode: 'demo', createdAt: Date.now(),
      message: 'Queued in the local demo executor; no AI provider or MCP server is connected.',
    };
    setJobs(current => [job, ...current].slice(0, 30)); setNotice(`${job.id} queued · DEMO MODE · no remote execution.`);
  }, []);

  const saveVersion = useCallback(() => {
    const project = projectName.split('/')[0].trim();
    const versionNumber = versions.filter(version => version.projectName === project).length + 1;
    const version: ProjectVersion = {
      id: stableId('version'), projectName: project, label: `Version ${String(versionNumber).padStart(2, '0')}`,
      createdAt: Date.now(), stack: stack.map(item => ({ ...item, parameters: { ...item.parameters } })),
    };
    setVersions(current => [version, ...current].slice(0, 100));
    setNotice(`${version.label} saved as a non-destructive stack snapshot.`);
  }, [projectName, stack, versions]);

  const restoreVersion = useCallback((version: ProjectVersion) => {
    setStack(version.stack.map(item => ({ ...item, parameters: { ...item.parameters } })));
    setSelectedInstanceId(null);
    setPreviewEffectId(null);
    setNotice(`${version.label} restored to the current effect stack.`);
  }, []);

  const duplicateVersion = useCallback((version: ProjectVersion) => {
    const branch: ProjectVersion = {
      ...version, id: stableId('version'), label: `${version.label} · branch`, createdAt: Date.now(),
      stack: version.stack.map(item => ({ ...item, instanceId: stableId('fx'), parameters: { ...item.parameters } })),
    };
    setVersions(current => [branch, ...current].slice(0, 100));
    setNotice(`Created an independent branch from ${version.label}.`);
  }, []);

  const cancelJob = useCallback((id: string) => setJobs(current => current.map(job => job.id === id && (job.status === 'queued' || job.status === 'processing')
    ? { ...job, status: 'cancelled', message: 'Cancelled locally; no remote operation was running.' } : job)), []);

  const retryJob = useCallback((job: WorkbenchJob) => {
    const effect = effects.find(item => item.id === job.effectId);
    if (effect) queueJob(effect, `${job.title} · retry`);
  }, [effects, queueJob]);

  const onCreateProject = useCallback((name: string) => {
    const project = { id: stableId('project'), name, timeline: 'Edit 01', updatedAt: Date.now() };
    setProjects(current => [project, ...current]); setProjectName(name.toUpperCase()); setNotice(`Project “${name}” created in browser-local metadata.`);
  }, []);

  const onChooseVideo = useCallback((file: File) => {
    if (mediaUrlRef.current) URL.revokeObjectURL(mediaUrlRef.current);
    const url = URL.createObjectURL(file); mediaUrlRef.current = url; setMediaUrl(url); setMediaName(file.name); setCurrentTime(0);
    setAssets(current => [{ name: file.name, type: file.type || 'video', size: file.size, url }, ...current.filter(asset => asset.name !== file.name)]);
    setNotice(`Loaded ${file.name} locally. The original file is not uploaded or modified.`);
  }, []);

  const onTime = useCallback((seconds: number) => setCurrentTime(seconds), []);
  const onDuration = useCallback((seconds: number) => setDuration(seconds), []);
  const previewStack = useMemo(() => {
    if (!previewEffect || stack.some(item => item.effectId === previewEffect.id && item.enabled)) return stack;
    return [...stack, { instanceId: 'preview-only', effectId: previewEffect.id, enabled: true, parameters: effectParameters[previewEffect.id] ?? defaultsForEffect(previewEffect) }];
  }, [effectParameters, previewEffect, stack]);
  const selectedValues = selectedStackInstance?.parameters ?? (selectedEffect ? effectParameters[selectedEffect.id] ?? defaultsForEffect(selectedEffect) : {});
  const isUtility = ['ai', 'projects', 'assets', 'jobs', 'mcp', 'davinci', 'settings'].includes(section);
  const sectionTitle = navGroups.flatMap(group => group.links).find(link => link.href === `/${section}`)?.title ?? (section === 'effects' ? 'Effects Library' : 'Viewer');
  const currentJobCount = jobs.filter(job => job.status === 'processing' || job.status === 'queued').length;

  return <div className="vfx-shell">
    <header className="topbar">
      <button type="button" className="mobile-menu" title="Toggle navigation" aria-expanded={navigationOpen} onClick={() => setNavigationOpen(value => !value)}><Menu size={17} /></button>
      <div className="brand-lockup"><span className="brand-mark"><Aperture size={18} /></span><div><b>VFX MACHINE</b><small>MODULAR FILM EFFECTS WORKBENCH</small></div></div>
      <div className="topbar-divider" />
      <button className="project-select" type="button" onClick={() => router.push('/projects')}><span className="project-dot" /><span><small>PROJECT / TIMELINE</small><b>{projectName} <i>/</i> EDIT 01</b></span><ChevronDown size={14} /></button>
      <div className="topbar-spacer" />
      <div className="demo-chip"><span />LOCAL DEMO</div>
      <button className="integration-status" type="button" onClick={() => router.push('/mcp')}><span className="status-led offline" /><span>MCP <b>DISCONNECTED</b></span></button>
      <button type="button" className="topbar-icon" title="Jobs" onClick={() => router.push('/jobs')}><Activity size={16} />{currentJobCount > 0 && <i>{currentJobCount}</i>}</button>
      <button type="button" className="button-primary topbar-render" onClick={() => selectedEffect && queueJob(selectedEffect, `Preview · ${selectedEffect.name}`)}><Play size={14} /> PREVIEW</button>
      <button type="button" className="topbar-icon" title="Settings" onClick={() => router.push('/settings')}><Settings size={16} /></button>
    </header>

    <div className="app-body">
      <aside className={`sidebar ${navigationOpen ? 'navigation-open' : ''}`}>
        <div className="sidebar-project"><span>ACTIVE PROJECT</span><b>{projectName.split('/')[0]}</b><small><i /> EDIT 01 · SAVED LOCALLY</small></div>
        <div className="sidebar-scroll">{navGroups.map(group => <section className="nav-group" key={group.label}><div className="nav-group-label">{group.label}</div>{group.links.map(({ href, title, icon: Icon }) => {
          const active = href === `/${section}` || (href === '/effects' && section === 'effects');
          return <button key={href} type="button" className={`nav-link ${active ? 'active' : ''}`} onClick={() => { router.push(href); setNavigationOpen(false); }}><Icon size={15} /><span>{title}</span>{title === 'Jobs' && currentJobCount > 0 && <i className="nav-count">{currentJobCount}</i>}</button>;
        })}</section>)}</div>
        <div className="sidebar-footer"><span className="status-led offline" /><div><b>DA VINCI</b><small>NOT CONNECTED</small></div><button type="button" title="Inspect DaVinci connection" onClick={() => router.push('/davinci')}><ArrowUpRight size={13} /></button></div>
      </aside>

      <main className={`workspace ${isUtility ? 'utility-view' : ''}`}>
        <div className="workspace-heading">
          <div><span className="eyebrow">POST / 01 <i>/</i> WORKBENCH <i>/</i> {sectionTitle.toUpperCase()}</span><h1>{sectionTitle}<small>{section === 'viewer' ? ' · WAREHOUSE DEMO' : section === 'effects' ? ` · ${effects.length} INSTALLED MODULES` : ''}</small></h1></div>
          <div className="workspace-heading-actions"><label className="search-field"><Search size={14} /><input ref={searchRef} value={search} onChange={event => setSearch(event.currentTarget.value)} placeholder="Search effects / tools" /><kbd>⌘ K</kbd></label><button className="small-icon-button" type="button" title="Focus effect search" onClick={() => searchRef.current?.focus()}><ListFilter size={15} /></button><button className={`small-icon-button ${inspectorOpen ? 'active' : ''}`} type="button" title="Toggle effect inspector" aria-pressed={inspectorOpen} onClick={() => setInspectorOpen(value => !value)}><PanelRight size={15} /></button></div>
        </div>

        {registryError && <div className="registry-error"><CircleHelp size={16} /><span>Effect registry failed to load: {registryError}. Run the registry build and reload.</span><button type="button" onClick={() => window.location.reload()}><TimerReset size={13} /> Retry</button></div>}

        {isUtility ? <UtilityWorkspace section={section} effects={effects} jobs={jobs} projects={projects} versions={versions} currentStack={stack} assets={assets} onQueueJob={queueJob} onCreateProject={onCreateProject} onChooseVideo={onChooseVideo} onAddEffect={addEffect} onCancelJob={cancelJob} onRetryJob={retryJob} onRestoreVersion={restoreVersion} onDuplicateVersion={duplicateVersion} /> :
          <div className={`workstation ${inspectorOpen ? '' : 'inspector-hidden'}`}>
            <div className="workstation-main">
              <Viewer ref={viewerRef} effects={effects} stack={previewStack} mediaUrl={mediaUrl} mediaName={mediaName} onFile={onChooseVideo} onTime={onTime} activePreview={previewEffect} onClearPreview={() => setPreviewEffectId(null)} onDuration={onDuration} />
              <div className="below-viewer">
                <EffectShelf effects={filteredEffects} selectedId={selectedEffect?.id ?? null} onOpen={openEffect} onAdd={addEffect} />
                <TimelinePanel effects={effects} stack={stack} frame={Math.round(currentTime * 24)} duration={duration} sourceLabel={mediaName} onSeek={seconds => viewerRef.current?.seek(seconds)} onSelectEffect={selectInstance} selectedId={selectedInstanceId} />
                <div className="graph-section"><div className="graph-section-heading"><div><span className="eyebrow">NON-DESTRUCTIVE PIPELINE</span><b>Effect Stack</b></div><span>{stack.filter(item => item.enabled).length} ACTIVE / {stack.length} NODES</span><button type="button" className="button-quiet" onClick={saveVersion}><Save size={14} /> Save version</button><button type="button" className="button-quiet" onClick={() => router.push('/timeline')}><Workflow size={14} /> Open timeline</button></div>
                  <EffectGraph stack={stack} effects={effects} selectedId={selectedInstanceId} onSelect={selectInstance} onToggle={toggleInstance} onDuplicate={duplicateInstance} onRemove={removeInstance} onReorder={reorderStack} />
                </div>
              </div>
            </div>
            {inspectorOpen && <EffectControls effect={selectedEffect} values={selectedValues} onChange={updateParameter} onAdd={() => selectedEffect && addEffect(selectedEffect)} onPreview={() => { if (!selectedEffect) return; setPreviewEffectId(selectedEffect.id); setNotice(`Local approximation previewed: ${selectedEffect.name}. No media was generated.`); }} onApply={() => selectedEffect && queueJob(selectedEffect, `Demo operation · ${selectedEffect.name}`)} />}
          </div>}
      </main>
    </div>
    {notice && <div className="toast" role="status"><BadgeCheck size={15} />{notice}<button type="button" onClick={() => setNotice('')}><X size={13} /></button></div>}
  </div>;
}
