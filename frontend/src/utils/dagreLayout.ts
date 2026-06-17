/**
 * Dagre Sugiyama layout utility for positioning nodes in a directed graph.
 * Used by ReportMappingEditor and ReportMappingLiveEdit.
 */
import dagre from "@dagrejs/dagre";
import { Position, type Node, type Edge } from "@xyflow/react";
import {
  JOB_NODE_WIDTH_PX,
  JOB_NODE_HEIGHT_PX,
  DAGRE_NODE_SEPARATION_PX,
  DAGRE_RANK_SEPARATION_PX,
  DAGRE_MARGIN_PX,
} from "../constants/reportMapping";

/**
 * Applies a Dagre Sugiyama hierarchical layout to position nodes.
 *
 * @param nodes - Array of React Flow nodes to position
 * @param edges - Array of React Flow edges defining the graph structure
 * @param direction - Layout direction: "LR" (left-to-right) or "TB" (top-to-bottom)
 * @returns Nodes with updated positions and source/target handles
 */
export function applyDagreLayout(nodes: Node[], edges: Edge[], direction = "LR"): Node[] {
  if (nodes.length === 0) return nodes;

  const dagreGraph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
  const isHorizontal = direction === "LR";

  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: DAGRE_NODE_SEPARATION_PX,
    ranksep: DAGRE_RANK_SEPARATION_PX,
    marginx: DAGRE_MARGIN_PX,
    marginy: DAGRE_MARGIN_PX,
  });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: JOB_NODE_WIDTH_PX, height: JOB_NODE_HEIGHT_PX });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  return nodes.map((node) => {
    const pos = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: pos.x - JOB_NODE_WIDTH_PX / 2,
        y: pos.y - JOB_NODE_HEIGHT_PX / 2,
      },
      targetPosition: isHorizontal ? Position.Left : Position.Top,
      sourcePosition: isHorizontal ? Position.Right : Position.Bottom,
    } as Node;
  });
}
