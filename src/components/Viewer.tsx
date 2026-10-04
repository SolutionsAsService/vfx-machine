"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type CSSProperties } from 'react';
import { ChevronLeft, ChevronRight, FileVideo2, Maximize2, Pause, Play, Repeat2, Upload, Volume2 } from 'lucide-react';
import type { EffectInstance, EffectManifest } from '@/types/effects';
import { previewFilter } from '@/lib/effects/parameters';
import { DemoPlate, timecode } from './EffectPreview';

type ComparisonMode = 'processed' | 'original' | 'split' | 'wipe' | 'side-by-side';
export type ViewerHandle = { seek: (seconds: number) => void };

export const Viewer = forwardRef<ViewerHandle, {
  effects: EffectManifest[];
  stack: EffectInstance[];
  mediaUrl: string | null;
  mediaName: string;
  onFile: (file: File) => void;
  onTime?: (seconds: number) => void;
  activePreview: EffectManifest | null;
  onClearPreview: () => void;
  onDuration?: (seconds: number) => void;
}>(function Viewer({
  effects, stack, mediaUrl, mediaName, onFile, onTime, activePreview, onClearPreview,
  onDuration,
}, ref) {
  const sourceRef = useRef<HTMLVideoElement>(null);
  const processedRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const [playing, setPlaying] = useState(false);
  const [loop, setLoop] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(26);
  const [frame, setFrame] = useState(0);
  const [wipe, setWipe] = useState(50);
  const [zoom, setZoom] = useState(1);
  const [compare, setCompare] = useState<ComparisonMode>('processed');
  const filterState = useMemo(() => previewFilter(effects, stack), [effects, stack]);
  const activeEffectIds = useMemo(() => stack.filter(item => item.enabled).map(item => item.effectId), [stack]);
  const hasMedia = Boolean(mediaUrl);

  useEffect(() => {
    if (hasMedia || !playing) return undefined;
    const interval = window.setInterval(() => {
      setCurrentTime(previous => {
        const next = previous + 0.1;
        const result = next >= duration ? (loop ? 0 : duration) : next;
        setFrame(Math.round(result * 24));
        onTime?.(result);
        if (result === duration && !loop) setPlaying(false);
        return result;
      });
    }, 100);
    return () => window.clearInterval(interval);
  }, [duration, hasMedia, loop, onTime, playing]);

  useEffect(() => {
    const source = sourceRef.current;
    const processed = processedRef.current;
    if (!source || !processed || !mediaUrl) return;
    source.loop = loop; processed.loop = loop;
    if (Math.abs(source.currentTime - processed.currentTime) > 0.08) processed.currentTime = source.currentTime;
    if (playing) void processed.play().catch(() => undefined);
    else processed.pause();
  }, [loop, mediaUrl, playing]);

  const setMediaTime = useCallback((seconds: number) => {
    const safe = Math.max(0, Math.min(duration, seconds));
    setCurrentTime(safe);
    setFrame(Math.round(safe * 24));
    const source = sourceRef.current;
    const processed = processedRef.current;
    if (source) source.currentTime = safe;
    if (processed) processed.currentTime = safe;
    onTime?.(safe);
  }, [duration, onTime]);

  useImperativeHandle(ref, () => ({ seek: setMediaTime }), [setMediaTime]);

  const togglePlayback = useCallback(async () => {
    if (playing) {
      sourceRef.current?.pause(); processedRef.current?.pause(); setPlaying(false); return;
    }
    if (currentTime >= duration) setMediaTime(0);
    if (sourceRef.current) {
      try { await sourceRef.current.play(); await processedRef.current?.play(); setPlaying(true); }
      catch { setPlaying(false); }
    } else setPlaying(true);
  }, [currentTime, duration, playing, setMediaTime]);

  function syncOverlay() {
    const source = sourceRef.current;
    const processed = processedRef.current;
    if (!source || !processed) return;
    if (Math.abs(source.currentTime - processed.currentTime) > 0.05) processed.currentTime = source.currentTime;
    if (source.paused && !processed.paused) processed.pause();
    setCurrentTime(source.currentTime); setFrame(Math.round(source.currentTime * 24));
    onTime?.(source.currentTime);
  }

  async function fullScreen() {
    if (!frameRef.current) return;
    if (document.fullscreenElement) await document.exitFullscreen();
    else await frameRef.current.requestFullscreen();
  }

  const processedStyle = { filter: filterState.filter };
  const clipProcessed = compare === 'original' ? 'inset(0 0 0 100%)'
    : compare === 'wipe' ? `inset(0 0 0 ${wipe}%)`
      : compare === 'split' ? 'inset(0 0 0 50%)'
        : 'inset(0)';
  const clipOriginal = compare === 'processed' ? 'inset(0 100% 0 0)' : 'inset(0)';

  function renderPlate(processed: boolean, side = false) {
    const visible = processed ? compare !== 'original' : compare !== 'processed';
    const clip = side ? 'inset(0)' : processed ? clipProcessed : clipOriginal;
    const css = processed ? processedStyle : undefined;
    return <div className={`plate-layer ${processed ? 'processed-layer' : 'original-layer'} ${side ? 'side-layer' : ''}`} style={{ clipPath: clip, ...(visible ? {} : { visibility: 'hidden' as const }) }}>
      {mediaUrl ? <video ref={processed ? processedRef : sourceRef} src={mediaUrl} muted playsInline preload="metadata"
        style={css} onLoadedMetadata={event => { if (!processed) { const nextDuration = event.currentTarget.duration || 26; setDuration(nextDuration); onDuration?.(nextDuration); setCurrentTime(0); } }}
        onTimeUpdate={!processed ? syncOverlay : undefined} onPlay={!processed ? () => { setPlaying(true); void processedRef.current?.play().catch(() => undefined); } : undefined}
        onPause={!processed ? () => { setPlaying(false); processedRef.current?.pause(); } : undefined}
        onEnded={!processed ? () => { if (!loop) setPlaying(false); } : undefined} />
        : <div className="sample-canvas-wrap" style={css}><DemoPlate frame={frame} playing={playing} /></div>}
      {processed && <DemoEffectLayers ids={activeEffectIds} />}
      {filterState.nightVision && processed && <div className="scanline-overlay" />}
      {filterState.grain > 0.02 && processed && <div className="grain-overlay" style={{ opacity: filterState.grain * 0.42 }} />}
    </div>;
  }

  const showSplit = compare === 'side-by-side';

  return (
    <section className="viewer-panel">
      <div className="viewer-toolbar">
        <div className="viewer-source"><FileVideo2 size={15} /><span>{mediaName || 'WAREHOUSE · SAMPLE PLATE'}</span><i className={mediaUrl ? 'media-state loaded' : 'media-state'} />{mediaUrl ? <small>LOCAL SOURCE</small> : <small>SYNTHETIC DEMO</small>}</div>
        <div className="viewer-toolbar-actions">
          <div className="compare-switch" role="group" aria-label="Before and after viewing mode">
            {(['processed', 'original', 'split', 'wipe', 'side-by-side'] as ComparisonMode[]).map(mode => <button type="button" key={mode} className={compare === mode ? 'active' : ''} onClick={() => setCompare(mode)}>{mode === 'side-by-side' ? 'A/B' : mode.toUpperCase()}</button>)}
          </div>
          <button className="small-icon-button" title="Zoom out" type="button" onClick={() => setZoom(value => Math.max(0.6, value - 0.2))}>−</button>
          <span className="zoom-readout">{Math.round(zoom * 100)}%</span>
          <button className="small-icon-button" title="Zoom in" type="button" onClick={() => setZoom(value => Math.min(2, value + 0.2))}>+</button>
          <button className="small-icon-button" title="Fit to viewer" type="button" onClick={() => setZoom(1)}>FIT</button>
          <button className="small-icon-button" title="Fullscreen" type="button" onClick={() => void fullScreen()}><Maximize2 size={14} /></button>
        </div>
      </div>

      <div className={`viewer-stage ${showSplit ? 'ab-view' : ''}`} ref={frameRef}>
        {showSplit ? <>
          <div className="ab-half"><span className="compare-label">ORIGINAL</span>{renderPlate(false, true)}</div>
          <div className="ab-half"><span className="compare-label">PROCESSED · DEMO</span>{renderPlate(true, true)}</div>
        </> : <div className={`viewer-transform ${activeEffectIds.includes('camera-shake') && compare !== 'original' ? 'shake-preview' : ''}`} style={{ '--zoom': zoom } as CSSProperties}>
          {renderPlate(false)}{renderPlate(true)}
          {filterState.aberration && compare !== 'original' && <div className="chromatic-demo-mark" />}
          {compare === 'wipe' && <div className="wipe-divider" style={{ left: `${wipe}%` }}><span /></div>}
        </div>}
        <div className="viewer-corner-status"><span className="record-square" />{mediaUrl ? 'SOURCE LOADED' : 'DEMO PLATE'} <span>·</span> 1920 × 1080 <span>·</span> 24 FPS</div>
        {activePreview && <div className="preview-toast"><span className="status-pill">PREVIEW ONLY</span> {activePreview.name} · {activePreview.preview.label}<button type="button" onClick={onClearPreview}>Dismiss</button></div>}
        {!mediaUrl && <div className="sample-watermark">SYNTHETIC PLATE — NO EFFECT HAS BEEN GENERATED</div>}
        <label className="drop-media"><Upload size={14} /><span>LOAD PLATE</span><input ref={uploadRef} type="file" accept="video/*" onChange={event => { const file = event.currentTarget.files?.[0]; if (file) onFile(file); event.currentTarget.value = ''; }} /></label>
      </div>

      {compare === 'wipe' && <div className="wipe-control"><span>ORIGINAL</span><input type="range" min="0" max="100" value={wipe} onChange={event => setWipe(Number(event.currentTarget.value))} aria-label="Before and after wipe position" /><span>PROCESSED</span><b>{wipe}%</b></div>}
      <div className="transport-row">
        <div className="transport-left">
          <button className="transport-button" type="button" title="Step one frame backward" onClick={() => setMediaTime(currentTime - 1 / 24)}><ChevronLeft size={15} /><span>1F</span></button>
          <button className="play-button" type="button" onClick={() => void togglePlayback()} aria-label={playing ? 'Pause' : 'Play'}>{playing ? <Pause size={16} /> : <Play size={16} fill="currentColor" />}</button>
          <button className="transport-button" type="button" title="Step one frame forward" onClick={() => setMediaTime(currentTime + 1 / 24)}><span>1F</span><ChevronRight size={15} /></button>
          <button className={`transport-button ${loop ? 'active' : ''}`} type="button" onClick={() => setLoop(value => !value)} title="Toggle loop"><Repeat2 size={15} /></button>
          <button className="transport-button" type="button" title="Audio is muted in preview"><Volume2 size={15} /><span className="muted-audio">MUTED</span></button>
          <span className="timecode">{timecode(currentTime)} <small>/ {timecode(duration)}</small></span>
        </div>
        <div className="transport-meta">FRAME {String(Math.round(currentTime * 24)).padStart(5, '0')} <span>·</span> {mediaUrl ? 'SOURCE PLATE' : 'DEMO CLIP'}</div>
      </div>
      <input className="transport-scrub" type="range" min="0" max={Math.max(duration, 0.1)} step="0.01" value={currentTime} onChange={event => setMediaTime(Number(event.currentTarget.value))} aria-label="Scrub timeline" style={{ '--scrub-progress': `${duration ? currentTime / duration * 100 : 0}%` } as CSSProperties} />
    </section>
  );
});

function DemoEffectLayers({ ids }: { ids: string[] }) {
  const has = (...names: string[]) => names.some(name => ids.includes(name));
  return <div className="demo-effect-layers">
    {has('gunshot-impact', 'blood-impact') && <div className="effect-overlay impact-overlay"><i /><b /></div>}
    {has('muzzle-flash') && <div className="effect-overlay flash-overlay" />}
    {has('smoke') && <div className="effect-overlay smoke-overlay" />}
    {has('fog') && <div className="effect-overlay fog-overlay" />}
    {has('rain') && <div className="effect-overlay rain-overlay" />}
    {has('sparks', 'fire-explosion', 'embers') && <div className="effect-overlay ember-overlay"><i /><i /><i /><i /><i /></div>}
    {has('roto-mask', 'object-removal', 'point-track') && <div className="effect-overlay track-overlay"><i /><b /><span>DEMO TRACK</span></div>}
  </div>;
}
