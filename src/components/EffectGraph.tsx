"use client";

import { useEffect, useMemo } from 'react';
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  useEdgesState,
  useNodesState,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import { Copy, Eye, EyeOff, GripVertical, Trash2 } from 'lucide-react';
import type { EffectInstance, EffectManifest } from '@/types/effects';

type EffectNodeData = {
  kind: 'effect';
  instance: EffectInstance;
  effect?: EffectManifest;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
};

type StageNodeData = { kind: 'stage'; title: string; detail: string };
type FlowNode = Node<EffectNodeData | StageNodeData>;

function EffectNodeCard({ data, selected }: NodeProps<FlowNode>) {
  if (data.kind === 'stage') return <div className={`flow-stage-node ${data.title === 'OUTPUT' ? 'output' : ''}`}><Handle type="target" position={Position.Top} /> <span>{data.title}</span><small>{data.detail}</small><Handle type="source" position={Position.Bottom} /></div>;
  const { instance, effect } = data;
  return (
    <div className={`flow-effect-node ${instance.enabled ? '' : 'is-disabled'} ${selected ? 'is-selected' : ''}`} onClick={() => data.onSelect(instance.instanceId)}>
      <Handle type="target" position={Position.Top} />
      <div className="flow-node-top"><GripVertical size={13} /><span>{effect?.category ?? 'EFFECT'}</span><div className="flow-node-tools">
        <button type="button" title={instance.enabled ? 'Disable effect' : 'Enable effect'} onClick={event => { event.stopPropagation(); data.onToggle(instance.instanceId); }}>{instance.enabled ? <Eye size={12} /> : <EyeOff size={12} />}</button>
        <button type="button" title="Duplicate" onClick={event => { event.stopPropagation(); data.onDuplicate(instance.instanceId); }}><Copy size={11} /></button>
        <button type="button" title="Remove" onClick={event => { event.stopPropagation(); data.onRemove(instance.instanceId); }}><Trash2 size={11} /></button>
      </div></div>
      <strong>{effect?.name ?? instance.effectId}</strong>
      <small>{instance.enabled ? 'ACTIVE · NON-DESTRUCTIVE' : 'BYPASSED'}</small>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

const nodeTypes = { flowNode: EffectNodeCard };

function graphData(
  stack: EffectInstance[], effects: EffectManifest[], selectedId: string | null,
  onSelect: (id: string) => void, onToggle: (id: string) => void,
  onDuplicate: (id: string) => void, onRemove: (id: string) => void,
) {
  const nodes: FlowNode[] = [
    { id: 'source', type: 'flowNode', position: { x: 138, y: 18 }, data: { kind: 'stage', title: 'SOURCE', detail: 'Original media · locked' } },
    ...stack.map((instance, index) => {
      const effect = effects.find(item => item.id === instance.effectId);
      return {
        id: instance.instanceId, type: 'flowNode', position: { x: 90 + (index % 2) * 86, y: 135 + index * 108 },
        selected: instance.instanceId === selectedId,
        data: { kind: 'effect', instance, effect, onSelect, onToggle, onDuplicate, onRemove },
      } as FlowNode;
    }),
    { id: 'output', type: 'flowNode', position: { x: 138, y: 150 + stack.length * 108 }, data: { kind: 'stage', title: 'OUTPUT', detail: 'Preview composite · not rendered' } },
  ];
  const orderedIds = ['source', ...stack.map(instance => instance.instanceId), 'output'];
  const edges: Edge[] = orderedIds.slice(0, -1).map((id, index) => ({
    id: `${id}-${orderedIds[index + 1]}`, source: id, target: orderedIds[index + 1],
    type: 'smoothstep', animated: false,
    style: { stroke: '#4d6471', strokeWidth: 1.2 },
    markerEnd: { type: MarkerType.ArrowClosed, color: '#688494', width: 12, height: 12 },
  }));
  return { nodes, edges };
}

export function EffectGraph({
  stack, effects, selectedId, onSelect, onToggle, onDuplicate, onRemove, onReorder,
}: {
  stack: EffectInstance[];
  effects: EffectManifest[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onDuplicate: (id: string) => void;
  onRemove: (id: string) => void;
  onReorder: (ids: string[]) => void;
}) {
  const initial = useMemo(() => graphData(stack, effects, selectedId, onSelect, onToggle, onDuplicate, onRemove), [effects, onDuplicate, onRemove, onSelect, onToggle, selectedId, stack]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initial.nodes);
  const [edges, setEdges] = useEdgesState(initial.edges);

  useEffect(() => {
    const next = graphData(stack, effects, selectedId, onSelect, onToggle, onDuplicate, onRemove);
    setNodes(next.nodes);
    setEdges(next.edges);
  }, [stack, effects, selectedId, onSelect, onToggle, onDuplicate, onRemove, setNodes, setEdges]);

  function applyVisualOrder() {
    const ids = nodes.filter(node => node.id !== 'source' && node.id !== 'output')
      .sort((left, right) => left.position.y - right.position.y)
      .map(node => node.id);
    if (ids.length === stack.length && ids.some((id, index) => stack[index]?.instanceId !== id)) onReorder(ids);
  }

  return (
    <div className="effect-graph">
      <div className="graph-label">PIPELINE GRAPH <span>DRAG NODES TO REORDER</span></div>
      <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} onNodesChange={onNodesChange}
        onNodeClick={(_, node) => { if (node.data.kind === 'effect') onSelect(node.id); }}
        onNodeDragStop={applyVisualOrder} fitView fitViewOptions={{ padding: 0.12 }} minZoom={0.45} maxZoom={1.25}
        proOptions={{ hideAttribution: true }} nodesConnectable={false} elementsSelectable panOnScroll zoomOnScroll={false}>
        <Background color="#1d2b33" gap={22} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  );
}
