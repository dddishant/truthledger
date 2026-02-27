'use client';

import * as React from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { GraphData, GraphNode } from '@/lib/types';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d').then((m) => m.default), { ssr: false });

const nodeColors: Record<GraphNode['type'], string> = {
  company: '#2563eb',
  person: '#0ea5e9',
  claim: '#f59e0b',
  evidence: '#10b981'
};

export function EntityForceGraph({ data }: { data: GraphData }) {
  const [selectedNode, setSelectedNode] = React.useState<GraphNode | null>(null);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>Knowledge Graph</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[480px] overflow-hidden rounded-xl border bg-background/70">
            <ForceGraph2D
              graphData={data}
              nodeLabel={(node: any) => `${node.label} (${node.type})`}
              nodeColor={(node: any) => nodeColors[node.type as GraphNode['type']] ?? '#94a3b8'}
              nodeCanvasObject={(node: any, ctx, globalScale) => {
                const label = node.label as string;
                const fontSize = 12 / globalScale;
                ctx.font = `${fontSize}px sans-serif`;
                const textWidth = ctx.measureText(label).width;
                const bckgDimensions = [textWidth + 10, fontSize + 6];

                ctx.fillStyle = nodeColors[node.type as GraphNode['type']] ?? '#64748b';
                ctx.beginPath();
                ctx.arc(node.x, node.y, 6, 0, 2 * Math.PI, false);
                ctx.fill();

                ctx.fillStyle = 'rgba(15,23,42,0.75)';
                ctx.fillRect(node.x + 8, node.y - bckgDimensions[1] / 2, bckgDimensions[0], bckgDimensions[1]);
                ctx.fillStyle = '#fff';
                ctx.fillText(label, node.x + 13, node.y + fontSize / 3);
              }}
              linkLabel={(link: any) => link.label}
              linkDirectionalParticles={1}
              linkDirectionalParticleWidth={1.2}
              onNodeClick={(node: any) => setSelectedNode(node as GraphNode)}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="glass-panel">
        <CardHeader>
          <CardTitle>Inspector</CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedNode ? (
            <p className="text-sm text-muted-foreground">Click any node to inspect details and relationship context.</p>
          ) : (
            <div className="space-y-3">
              <Badge variant="outline">{selectedNode.type}</Badge>
              <div className="text-lg font-semibold">{selectedNode.label}</div>
              <p className="text-sm text-muted-foreground">Node ID: {selectedNode.id}</p>
              <div className="rounded-lg border bg-background/60 p-3 text-sm text-muted-foreground">
                Relationship edges and provenance are mock-linked for demo. Replace with graph backend (Neo4j / Postgres graph extension / custom service) later.
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
