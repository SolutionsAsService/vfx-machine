"use client";

import type { EffectManifest, EffectParameter } from '@/types/effects';
import { Info, Plus, Play, Sparkles } from 'lucide-react';

type Value = number | string | boolean;

export function EffectControls({
  effect,
  values,
  onChange,
  onAdd,
  onPreview,
  onApply,
}: {
  effect: EffectManifest | null;
  values: Record<string, Value>;
  onChange: (key: string, value: Value) => void;
  onAdd: () => void;
  onPreview: () => void;
  onApply: () => void;
}) {
  if (!effect) return <aside className="inspector-panel"><div className="panel-heading"><span>INSPECTOR</span></div><p className="muted-copy">Choose an effect to inspect its parameters.</p></aside>;
  const groups = Object.groupBy(effect.parameters, parameter => parameter.group);

  return (
    <aside className="inspector-panel">
      <div className="panel-heading"><span>EFFECT INSPECTOR</span><span className="tiny-status demo-dot">DEMO</span></div>
      <div className="inspector-effect-title">
        <span className="effect-mark">FX</span>
        <div><h2>{effect.name}</h2><p>{effect.category} / {effect.version}</p></div>
      </div>
      <p className="inspector-summary">{effect.summary}</p>
      <div className="inspector-parameters">
        {Object.entries(groups).map(([group, parameters]) => (
          <fieldset className="parameter-group" key={group}>
            <legend>{group}</legend>
            {parameters?.map(parameter => (
              <ParameterField key={parameter.id} parameter={parameter} value={values[parameter.id] ?? parameter.default} onChange={value => onChange(parameter.id, value)} />
            ))}
          </fieldset>
        ))}
      </div>
      <section className="inspector-capabilities">
        <div className="panel-heading"><span>ROUTING</span><Info size={13} /></div>
        <div className="capability-row"><span>AI</span><b>{effect.capabilities.ai.length ? effect.capabilities.ai.join(' · ') : 'No provider'}</b></div>
        <div className="capability-row"><span>MCP</span><b>{effect.capabilities.mcp.length ? effect.capabilities.mcp.length + ' tool mappings' : 'Not mapped'}</b></div>
        <div className="capability-row"><span>RESOLVE</span><b>{effect.capabilities.davinci.length ? 'Operation mapping ready' : 'Not mapped'}</b></div>
        <p>Capability metadata describes adapter targets; no remote operation runs in demo mode.</p>
      </section>
      <div className="inspector-actions">
        <button type="button" className="button-primary" onClick={onPreview}><Sparkles size={15} /> Generate preview</button>
        <button type="button" className="button-secondary" onClick={onAdd}><Plus size={15} /> Add to stack</button>
        <button type="button" className="button-quiet" onClick={onApply}><Play size={14} /> Queue demo operation</button>
      </div>
      <div className="demo-disclaimer"><span className="status-pill">DEMO</span> Preview is an editable UI approximation, not a generated render.</div>
    </aside>
  );
}

function ParameterField({ parameter, value, onChange }: { parameter: EffectParameter; value: Value; onChange: (value: Value) => void }) {
  if (parameter.type === 'range') {
    const numeric = Number(value);
    return (
      <label className="parameter-field">
        <span className="parameter-label">{parameter.label}<output>{numeric.toFixed(parameter.step && parameter.step < 1 ? 2 : 0)}{parameter.unit ? ` ${parameter.unit}` : ''}</output></span>
        <input type="range" min={parameter.min} max={parameter.max} step={parameter.step} value={numeric} onChange={event => onChange(Number(event.currentTarget.value))} />
      </label>
    );
  }
  if (parameter.type === 'select') {
    return <label className="parameter-field"><span className="parameter-label">{parameter.label}</span><select value={String(value)} onChange={event => onChange(event.currentTarget.value)}>{parameter.options?.map(option => <option value={option} key={option}>{option.replaceAll('-', ' ')}</option>)}</select></label>;
  }
  if (parameter.type === 'color') {
    return <label className="parameter-field color-field"><span className="parameter-label">{parameter.label}</span><input type="color" value={String(value)} onChange={event => onChange(event.currentTarget.value)} /></label>;
  }
  return <label className="toggle-row"><span>{parameter.label}</span><input type="checkbox" checked={Boolean(value)} onChange={event => onChange(event.currentTarget.checked)} /><i /></label>;
}
