"use client";

import { Plus, Settings2 } from 'lucide-react';
import type { EffectManifest } from '@/types/effects';

const tones: Record<string, string> = {
  Action: 'thumb-action', Atmosphere: 'thumb-atmosphere', Camera: 'thumb-camera',
  Cleanup: 'thumb-cleanup', Color: 'thumb-color', 'Film Looks': 'thumb-film', Tracking: 'thumb-tracking',
};

export function EffectThumbnail({ effect, compact = false }: { effect: EffectManifest; compact?: boolean }) {
  return (
    <div className={`effect-thumb ${tones[effect.category] ?? 'thumb-neutral'} ${compact ? 'compact' : ''}`} aria-label={`${effect.name}, illustrative demo preview`}>
      <div className="thumb-scene"><i /><i /><i /><b /></div>
      <span className="thumb-corner">DEMO</span>
      <strong>{effect.name}</strong>
    </div>
  );
}

export function EffectShelf({ effects, selectedId, onOpen, onAdd }: {
  effects: EffectManifest[];
  selectedId: string | null;
  onOpen: (effect: EffectManifest) => void;
  onAdd: (effect: EffectManifest) => void;
}) {
  return (
    <div className="effect-shelf" aria-label="Effect library">
      <div className="shelf-heading"><span>EFFECT LIBRARY <b>{effects.length.toString().padStart(2, '0')}</b></span><button type="button" className="small-icon-button" title="Open effect filters"><Settings2 size={14} /></button></div>
      <div className="effect-card-grid">
        {effects.map(effect => <article className={`effect-card ${selectedId === effect.id ? 'is-active' : ''}`} key={effect.id}>
          <button type="button" className="effect-card-open" onClick={() => onOpen(effect)} aria-label={`Configure ${effect.name}`}>
            <EffectThumbnail effect={effect} compact />
            <span className="effect-card-meta"><b>{effect.name}</b><small>{effect.category.toUpperCase()} · {effect.execution.mode.toUpperCase()}</small></span>
          </button>
          <button type="button" className="effect-card-add" onClick={() => onAdd(effect)} title={`Add ${effect.name} to the effect stack`}><Plus size={14} /></button>
        </article>)}
      </div>
      {!effects.length && <p className="muted-copy">No modules match this filter.</p>}
    </div>
  );
}
