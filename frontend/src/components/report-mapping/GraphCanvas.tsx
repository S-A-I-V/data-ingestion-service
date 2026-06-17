/**
 * GraphCanvas — Reusable React Flow graph canvas for report mapping editors.
 * Wraps ReactFlow with standard configuration (background, controls, extent).
 */
import { useMemo } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  ConnectionLineType,
  BackgroundVariant,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { computeGraphExtent } from "../../utils/graphHelpers";
import {
  FIT_VIEW_PADDING,
  GRAPH_MIN_ZOOM,
  GRAPH_MAX_ZOOM,
  BACKGROUND_DOT_GAP_PX,
  BACKGROUND_DOT_SIZE_PX,
  BACKGROUND_DOT_COLOR,
} from "../../constants/reportMapping";

interface GraphCanvasProps {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  nodeTypes: NodeTypes;
}

export default function GraphCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  nodeTypes,
}: GraphCanvasProps) {
  const graphExtent = useMemo(() => computeGraphExtent(nodes), [nodes]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: FIT_VIEW_PADDING }}
      minZoom={GRAPH_MIN_ZOOM}
      maxZoom={GRAPH_MAX_ZOOM}
      translateExtent={graphExtent}
      deleteKeyCode="Delete"
      connectionLineType={ConnectionLineType.SmoothStep}
      proOptions={{ hideAttribution: true }}
      className="report-flow-graph"
    >
      <Controls showInteractive={false} />
      <Background
        variant={BackgroundVariant.Dots}
        gap={BACKGROUND_DOT_GAP_PX}
        size={BACKGROUND_DOT_SIZE_PX}
        color={BACKGROUND_DOT_COLOR}
      />
    </ReactFlow>
  );
}
