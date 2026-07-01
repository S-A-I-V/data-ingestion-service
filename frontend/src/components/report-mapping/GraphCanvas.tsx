/**
 * GraphCanvas — Reusable React Flow graph canvas for report mapping editors.
 * Wraps ReactFlow with standard configuration (background, controls, extent).
 */
import { useMemo, useEffect } from "react";
import {
  ReactFlow,
  Controls,
  Background,
  ConnectionLineType,
  BackgroundVariant,
  useReactFlow,
  ReactFlowProvider,
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
  /** When set, pan to this node ID then clear it */
  panToNodeId?: string | null;
  onPanComplete?: () => void;
}

function GraphCanvasInner({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  nodeTypes,
  panToNodeId,
  onPanComplete,
}: GraphCanvasProps) {
  const graphExtent = useMemo(() => computeGraphExtent(nodes), [nodes]);
  const { setCenter } = useReactFlow();

  // Pan to newly added node
  useEffect(() => {
    if (!panToNodeId) return;
    const node = nodes.find((n) => n.id === panToNodeId);
    if (node) {
      // Small delay to let the node render first
      setTimeout(() => {
        setCenter(node.position.x + 80, node.position.y + 30, { zoom: 1, duration: 400 });
        onPanComplete?.();
      }, 50);
    }
  }, [panToNodeId, nodes, setCenter, onPanComplete]);

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

export default function GraphCanvas(props: GraphCanvasProps) {
  return (
    <ReactFlowProvider>
      <GraphCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
