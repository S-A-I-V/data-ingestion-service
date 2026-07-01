/**
 * useGraphEditor — Shared hook encapsulating React Flow graph editing logic
 * for the report mapping editors. Manages nodes, edges, undo/redo, and
 * exposes node operations via window globals (React Flow constraint for JobNode).
 */
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  Position,
  type Node,
  type Edge,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type NodeTypes,
} from "@xyflow/react";
import { useUndoRedo } from "./useUndoRedo";
import { createStyledEdge } from "../utils/graphHelpers";
import { applyDagreLayout } from "../utils/dagreLayout";
import {
  NEW_NODE_RANDOM_X_RANGE,
  NEW_NODE_X_OFFSET,
  NEW_NODE_RANDOM_Y_RANGE,
  NEW_NODE_Y_OFFSET,
  EDGE_STROKE_COLOR,
} from "../constants/reportMapping";
import JobNode from "../components/report-mapping/JobNode";

interface Job {
  job_id: number;
  job_name: string;
  category: string | null;
}

interface UseGraphEditorOptions {
  jobs: Job[];
}

export function useGraphEditor({ jobs }: UseGraphEditorOptions) {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [dirty, setDirty] = useState(false);

  const graph = useUndoRedo<{ nodes: Node[]; edges: Edge[] }>({ nodes: [], edges: [] });
  const nodeTypes: NodeTypes = useMemo(() => ({ jobNode: JobNode }), []);

  // Sync undo/redo state → local state
  useEffect(() => {
    setNodes(graph.state.nodes);
    setEdges(graph.state.edges);
  }, [graph.state]);

  // Commit change to undo/redo stack
  const commitChange = useCallback(
    (newNodes: Node[], newEdges: Edge[]) => {
      graph.set({ nodes: newNodes, edges: newEdges });
      setDirty(true);
    },
    [graph],
  );

  // Keyboard shortcuts (Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "z") {
        e.preventDefault();
        if (e.shiftKey) graph.redo();
        else graph.undo();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "y") {
        e.preventDefault();
        graph.redo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [graph]);

  // React Flow callbacks
  const onNodesChange: OnNodesChange = useCallback(
    (changes) => {
      setNodes((nds) => {
        const updated = applyNodeChanges(changes, nds);
        if (changes.some((c) => c.type === "remove")) commitChange(updated, edges);
        return updated;
      });
    },
    [edges, commitChange],
  );

  const onEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      setEdges((eds) => {
        const updated = applyEdgeChanges(changes, eds);
        if (changes.some((c) => c.type === "remove")) commitChange(nodes, updated);
        return updated;
      });
    },
    [nodes, commitChange],
  );

  const onConnect: OnConnect = useCallback(
    (connection) => {
      setEdges((eds) => {
        const updated = addEdge(
          { ...connection, type: "smoothstep", animated: true, style: { stroke: EDGE_STROKE_COLOR } },
          eds,
        );
        commitChange(nodes, updated);
        return updated;
      });
    },
    [nodes, commitChange],
  );

  // Add a new empty node at a random position
  const addNode = useCallback(() => {
    const id = `n${Date.now()}`;
    const newNode: Node = {
      id,
      type: "jobNode",
      position: {
        x: Math.random() * NEW_NODE_RANDOM_X_RANGE + NEW_NODE_X_OFFSET,
        y: Math.random() * NEW_NODE_RANDOM_Y_RANGE + NEW_NODE_Y_OFFSET,
      },
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
      data: { job_id: null, job_name: "" },
    };
    const newNodes = [...nodes, newNode];
    setNodes(newNodes);
    commitChange(newNodes, edges);
  }, [nodes, edges, commitChange]);

  // Update a node's job assignment
  const updateNodeJob = useCallback((nodeId: string, jobId: number, jobName: string, category?: string) => {
    setNodes((prev) =>
      prev.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, job_id: jobId, job_name: jobName, category: category || "" } } : n,
      ),
    );
    setDirty(true);
  }, []);

  // Delete a node and its connected edges
  const deleteNode = useCallback(
    (nodeId: string) => {
      setNodes((prev) => {
        const updated = prev.filter((n) => n.id !== nodeId);
        setEdges((prevEdges) => {
          const updatedEdges = prevEdges.filter((e) => e.source !== nodeId && e.target !== nodeId);
          commitChange(updated, updatedEdges);
          return updatedEdges;
        });
        return updated;
      });
    },
    [commitChange],
  );

  // Disconnect only outgoing edges from a node
  const disconnectRight = useCallback(
    (nodeId: string) => {
      setEdges((prev) => {
        const updated = prev.filter((e) => e.source !== nodeId);
        setNodes((curNodes) => {
          commitChange(curNodes, updated);
          return curNodes;
        });
        return updated;
      });
    },
    [commitChange],
  );

  // Remove a node but connect its incoming sources to its outgoing targets
  const bypassDelete = useCallback(
    (nodeId: string) => {
      const incoming = edges.filter((e) => e.target === nodeId);
      const outgoing = edges.filter((e) => e.source === nodeId);
      const bypassEdges: Edge[] = [];
      for (const src of incoming.map((e) => e.source)) {
        for (const tgt of outgoing.map((e) => e.target)) {
          bypassEdges.push(createStyledEdge(src, tgt));
        }
      }
      const updatedNodes = nodes.filter((n) => n.id !== nodeId);
      const updatedEdges = [...edges.filter((e) => e.source !== nodeId && e.target !== nodeId), ...bypassEdges];
      setNodes(updatedNodes);
      setEdges(updatedEdges);
      commitChange(updatedNodes, updatedEdges);
    },
    [nodes, edges, commitChange],
  );

  // Expose callbacks to JobNode via window (React Flow constraint)
  useEffect(() => {
    window.__REPORT_MAPPING_JOBS__ = jobs;
    window.__REPORT_MAPPING_UPDATE_NODE__ = updateNodeJob;
    window.__REPORT_MAPPING_DELETE_NODE__ = deleteNode;
    window.__REPORT_MAPPING_DISCONNECT_RIGHT__ = disconnectRight;
    window.__REPORT_MAPPING_BYPASS_DELETE__ = bypassDelete;
    return () => {
      delete window.__REPORT_MAPPING_JOBS__;
      delete window.__REPORT_MAPPING_UPDATE_NODE__;
      delete window.__REPORT_MAPPING_DELETE_NODE__;
      delete window.__REPORT_MAPPING_DISCONNECT_RIGHT__;
      delete window.__REPORT_MAPPING_BYPASS_DELETE__;
    };
  }, [jobs, updateNodeJob, deleteNode, disconnectRight, bypassDelete]);

  // Re-layout nodes using Dagre algorithm
  const handleRelayout = useCallback(() => {
    setNodes((cur) => applyDagreLayout(cur, edges));
  }, [edges]);

  return {
    nodes,
    setNodes,
    edges,
    setEdges,
    dirty,
    setDirty,
    graph,
    nodeTypes,
    commitChange,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    updateNodeJob,
    handleRelayout,
  };
}
