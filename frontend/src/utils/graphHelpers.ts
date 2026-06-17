/**
 * Shared helper utilities for React Flow graph operations.
 * Used by ReportMappingEditor and ReportMappingLiveEdit.
 */
import type { Node, Edge } from "@xyflow/react";
import {
  JOB_NODE_WIDTH_PX,
  JOB_NODE_HEIGHT_PX,
  GRAPH_EXTENT_MARGIN_PX,
  EMPTY_GRAPH_EXTENT,
  EDGE_STROKE_COLOR,
} from "../constants/reportMapping";

/** Creates a styled edge object with smoothstep type and accent stroke */
export function createStyledEdge(source: string, target: string, id?: string): Edge {
  return {
    id: id || `e${source}-${target}`,
    source,
    target,
    type: "smoothstep",
    animated: true,
    style: { stroke: EDGE_STROKE_COLOR },
  };
}

/**
 * Computes the translate extent (viewport bounds) from the current nodes.
 * Returns a bounding box with margin around all nodes.
 */
export function computeGraphExtent(nodes: Node[]): [[number, number], [number, number]] {
  if (nodes.length === 0) return EMPTY_GRAPH_EXTENT;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    minX = Math.min(minX, node.position.x);
    minY = Math.min(minY, node.position.y);
    maxX = Math.max(maxX, node.position.x + JOB_NODE_WIDTH_PX);
    maxY = Math.max(maxY, node.position.y + JOB_NODE_HEIGHT_PX);
  }

  return [
    [minX - GRAPH_EXTENT_MARGIN_PX, minY - GRAPH_EXTENT_MARGIN_PX],
    [maxX + GRAPH_EXTENT_MARGIN_PX, maxY + GRAPH_EXTENT_MARGIN_PX],
  ];
}
