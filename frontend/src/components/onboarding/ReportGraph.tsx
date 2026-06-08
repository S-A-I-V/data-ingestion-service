/**
 * ReportGraph — React Flow + dagre layout (matching the reference example).
 * Uses FIXED node widths for clean, uniform alignment.
 * LR (left-to-right) direction with smoothstep animated edges.
 */

import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  ConnectionLineType,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  type Node,
  type Edge,
} from "@xyflow/react";
import dagre from "@dagrejs/dagre";
import "@xyflow/react/dist/style.css";
import type { ReportDef } from "./StepReportMapping";

interface Props {
  clientName: string;
  reports: ReportDef[];
}

// Fixed node dimensions — same for all nodes (clean grid alignment)
const NODE_WIDTH = 220;
const NODE_HEIGHT = 40;

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = "LR") => {
  const dagreGraph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  const isHorizontal = direction === "LR";

  dagreGraph.setGraph({ rankdir: direction, nodesep: 50, ranksep: 180 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: NODE_WIDTH, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const newNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      targetPosition: (isHorizontal ? "left" : "top") as "left" | "top",
      sourcePosition: (isHorizontal ? "right" : "bottom") as "right" | "bottom",
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - NODE_HEIGHT / 2,
      },
    };
  });

  return { nodes: newNodes, edges };
};

function FlowInner({ clientName, reports }: Props) {
  const { layoutedNodes, layoutedEdges, graphExtent } = useMemo(() => {
    const nodes: Node[] = [
      {
        id: "client",
        type: "input",
        data: { label: clientName || "Client" },
        position: { x: 0, y: 0 },
      },
    ];

    const edges: Edge[] = [];

    // Group reports by application name
    const appGroups = new Map<string, ReportDef[]>();
    for (const r of reports) {
      const app = r.application_name || "Unknown";
      if (!appGroups.has(app)) appGroups.set(app, []);
      appGroups.get(app)!.push(r);
    }

    // Create application nodes (middle tier) and connect client → app
    for (const [app] of appGroups) {
      const appNodeId = `app-${app}`;
      nodes.push({
        id: appNodeId,
        data: { label: app },
        position: { x: 0, y: 0 },
      });
      edges.push({
        id: `e-client-${app}`,
        source: "client",
        target: appNodeId,
        type: "smoothstep",
        animated: true,
      });
    }

    // Create report nodes and connect app → report
    for (const [app, reps] of appGroups) {
      const appNodeId = `app-${app}`;
      for (const r of reps) {
        const reportNodeId = `report-${r.report_id}`;
        nodes.push({
          id: reportNodeId,
          type: "output",
          data: { label: r.report_name },
          position: { x: 0, y: 0 },
        });
        edges.push({
          id: `e-${app}-${r.report_id}`,
          source: appNodeId,
          target: reportNodeId,
          type: "smoothstep",
          animated: true,
        });
      }
    }

    const { nodes: ln, edges: le } = getLayoutedElements(nodes, edges, "LR");

    // Calculate dynamic extent from actual node positions + margin
    const MARGIN = 300;
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const node of ln) {
      minX = Math.min(minX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxX = Math.max(maxX, node.position.x + NODE_WIDTH);
      maxY = Math.max(maxY, node.position.y + NODE_HEIGHT);
    }

    const extent: [[number, number], [number, number]] = [
      [minX - MARGIN, minY - MARGIN],
      [maxX + MARGIN, maxY + MARGIN],
    ];

    return { layoutedNodes: ln, layoutedEdges: le, graphExtent: extent };
  }, [clientName, reports]);

  const [nodes, , onNodesChange] = useNodesState(layoutedNodes as Node[]);
  const [edges, , onEdgesChange] = useEdgesState(layoutedEdges as Edge[]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      connectionLineType={ConnectionLineType.SmoothStep}
      fitView
      fitViewOptions={{ padding: 0.3 }}
      minZoom={0.4}
      maxZoom={2}
      translateExtent={graphExtent}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      proOptions={{ hideAttribution: true }}
      className="report-flow-graph"
    >
      <Background color="rgba(255,255,255,0.03)" gap={20} />
      <Controls showInteractive={false} />
    </ReactFlow>
  );
}

export default function ReportGraph({ clientName, reports }: Props) {
  return (
    <ReactFlowProvider>
      <FlowInner clientName={clientName} reports={reports} />
    </ReactFlowProvider>
  );
}
