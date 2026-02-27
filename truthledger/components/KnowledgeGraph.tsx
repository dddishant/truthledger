'use client';

import { useEffect, useMemo } from 'react';
import ReactFlow, { Background, Controls, MarkerType, useEdgesState, useNodesState } from 'reactflow';
import 'reactflow/dist/style.css';
import { Claim } from '@/types';

interface Props {
  entityName: string;
  claims: Claim[];
}

const NODE_TYPES = {};
const EDGE_TYPES = {};

export default function KnowledgeGraph({ entityName, claims }: Props) {
  const { nodes: initNodes, edges: initEdges } = useMemo(() => {
    const nodes: any[] = [
      {
        id: 'entity',
        position: { x: 0, y: 180 },
        data: { label: entityName },
        style: { background: '#18181b', color: '#fafafa', border: '1px solid #3f3f46' }
      }
    ];
    const edges: any[] = [];

    claims.slice(0, 10).forEach((claim, i) => {
      const claimId = `claim-${claim.id}`;
      nodes.push({
        id: claimId,
        position: { x: 260, y: i * 90 },
        data: { label: claim.text.slice(0, 50) + (claim.text.length > 50 ? '...' : '') },
        style: { background: '#27272a', color: '#f4f4f5', border: '1px solid #52525b', width: 220, fontSize: 12 }
      });
      edges.push({
        id: `e-entity-${claimId}`,
        source: 'entity',
        target: claimId,
        markerEnd: { type: MarkerType.ArrowClosed, color: '#71717a' },
        style: { stroke: '#71717a' }
      });

      (claim.evidence || []).slice(0, 2).forEach((ev, j) => {
        const evId = `ev-${claim.id}-${j}`;
        nodes.push({
          id: evId,
          position: { x: 560, y: i * 90 + j * 36 },
          data: { label: ev.summary || ev.text.slice(0, 40) },
          style: { background: '#0f172a', color: '#e2e8f0', border: '1px solid #334155', width: 220, fontSize: 11 }
        });
        edges.push({
          id: `e-${claimId}-${evId}`,
          source: claimId,
          target: evId,
          markerEnd: { type: MarkerType.ArrowClosed, color: '#475569' },
          style: { stroke: '#475569' }
        });
      });
    });

    return { nodes, edges };
  }, [entityName, claims]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initEdges);

  useEffect(() => {
    setNodes(initNodes);
    setEdges(initEdges);
  }, [initNodes, initEdges, setNodes, setEdges]);

  return (
    <div className="h-[540px] rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        fitView
      >
        <Background color="#27272a" />
        <Controls />
      </ReactFlow>
    </div>
  );
}
