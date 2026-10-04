"use client";

import { ChevronDown, Film, Plus } from 'lucide-react';
import type { EffectInstance, EffectManifest } from '@/types/effects';

const palette: Record<string, string> = {
  Action: 'clip-action', Atmosphere: 'clip-atmosphere', Camera: 'clip-camera', Cleanup: 'clip-cleanup', Color: 'clip-color', 'Film Looks': 'clip-film', Tracking: 'clip-tracking',
};

export function TimelinePanel({ effects, stack, frame, duration, sourceLabel, onSeek, onSelectEffect, selectedId }: {
  effects: EffectManifest[];
  stack: EffectInstance[];
  frame: number;
  duration: number;
  sourceLabel: string;
  onSeek: (seconds: number) => void;
  onSelectEffect: (id: string) => void;
  selectedId: string | null;
}) {
  const totalFrames = Math.max(1, Math.round(duration * 24));
  const playhead = Math.min(100, Math.max(0, frame / totalFrames * 100));
  return (
    <section className="timeline-panel">
      <div className="timeline-heading"><div className="panel-heading"><span>SEQUENCE / EDIT 01</span><span className="timeline-detail">24 FPS · 1920 × 1080 · {totalFrames.toLocaleString()} FRAMES</span></div><button className="small-icon-button" type="button" title="Timeline options"><ChevronDown size={14} /></button></div>
      <div className="timeline-ruler" role="slider" aria-label="Timeline ruler" aria-valuemin={0} aria-valuemax={totalFrames} aria-valuenow={frame} tabIndex={0} onClick={event => { const box = event.currentTarget.getBoundingClientRect(); onSeek(((event.clientX - box.left) / box.width) * duration); }} onKeyDown={event => { if (event.key === 'ArrowRight') onSeek(Math.min(duration, frame / 24 + 1 / 24)); if (event.key === 'ArrowLeft') onSeek(Math.max(0, frame / 24 - 1 / 24)); }}>
        <div className="ruler-ticks">{Array.from({ length: 9 }, (_, index) => <span key={index} style={{ left: `${index * 12.5}%` }}><i />{String(Math.round(totalFrames * index / 8)).padStart(5, '0')}</span>)}</div>
        <div className="timeline-playhead" style={{ left: `${playhead}%` }}><b /></div>
      </div>
      <div className="timeline-tracks">
        <div className="track-label"><Film size={13} /><span>VIDEO 01</span></div>
        <div className="track-lane"><div className="source-clip" style={{ width: '100%' }}><Film size={12} /><span>{sourceLabel || 'WAREHOUSE_SAMPLE_PLATE'}</span><small>V1 · SOURCE</small></div></div>
        <div className="track-label effect-track-label"><Plus size={13} /><span>FX STACK</span></div>
        <div className="track-lane fx-lane">{stack.map((instance, index) => {
          const effect = effects.find(item => item.id === instance.effectId);
          const width = Math.max(8, Math.min(46, 20 + (index % 3) * 7));
          return <button type="button" className={`timeline-effect ${palette[effect?.category ?? ''] ?? 'clip-neutral'} ${instance.enabled ? '' : 'bypassed'} ${instance.instanceId === selectedId ? 'selected' : ''}`} style={{ left: `${4 + index * 3}%`, width: `${width}%` }} key={instance.instanceId} onClick={() => onSelectEffect(instance.instanceId)} title={effect?.name ?? instance.effectId}>{effect?.name ?? instance.effectId}<small>{instance.enabled ? 'ACTIVE' : 'BYPASS'}</small></button>;
        })}{!stack.length && <span className="track-empty">Add effects to build the stack.</span>}</div>
      </div>
      <div className="timeline-foot"><span>TRACKS 02</span><span>NON-DESTRUCTIVE · SOURCE UNCHANGED</span><span>SNAP ON</span></div>
    </section>
  );
}
