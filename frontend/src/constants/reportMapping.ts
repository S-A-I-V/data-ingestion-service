/**
 * Constants for Report Mapping Editor and Live Edit pages.
 */
import type { Step } from "../components/onboarding/StepProgress";

// ── Graph Layout Constants ───────────────────────────────────────────────────
/** Width of each job node in the DAG graph (pixels) */
export const JOB_NODE_WIDTH_PX = 220;

/** Height of each job node in the DAG graph (pixels) */
export const JOB_NODE_HEIGHT_PX = 160;

/** Vertical spacing between nodes in the same rank (pixels) */
export const DAGRE_NODE_SEPARATION_PX = 80;

/** Horizontal spacing between ranks in the layout (pixels) */
export const DAGRE_RANK_SEPARATION_PX = 250;

/** Margin around the graph layout (pixels) */
export const DAGRE_MARGIN_PX = 40;

// ── Graph Viewport Constants ─────────────────────────────────────────────────
/** Padding around nodes when fitting the view */
export const FIT_VIEW_PADDING = 0.3;

/** Minimum zoom level for the graph canvas */
export const GRAPH_MIN_ZOOM = 0.2;

/** Maximum zoom level for the graph canvas */
export const GRAPH_MAX_ZOOM = 2;

/** Margin around nodes for computing the translate extent (viewport bounds) */
export const GRAPH_EXTENT_MARGIN_PX = 500;

/** Default translate extent when graph is empty */
export const EMPTY_GRAPH_EXTENT: [[number, number], [number, number]] = [
  [-1000, -1000],
  [2000, 2000],
];

// ── Graph Background Constants ───────────────────────────────────────────────
/** Gap between background dots in the graph canvas */
export const BACKGROUND_DOT_GAP_PX = 20;

/** Size of background dots */
export const BACKGROUND_DOT_SIZE_PX = 1;

/** Color of background dots */
export const BACKGROUND_DOT_COLOR = "rgba(255,255,255,0.05)";

// ── Edge Styling ─────────────────────────────────────────────────────────────
/** Stroke color for edges connecting nodes */
export const EDGE_STROKE_COLOR = "var(--accent)";

// ── Node Placement (new node random offset) ──────────────────────────────────
/** Max random X offset when placing a new node */
export const NEW_NODE_RANDOM_X_RANGE = 400;

/** X offset base for new nodes */
export const NEW_NODE_X_OFFSET = 50;

/** Max random Y offset when placing a new node */
export const NEW_NODE_RANDOM_Y_RANGE = 300;

/** Y offset base for new nodes */
export const NEW_NODE_Y_OFFSET = 50;

// ── Toast Duration ───────────────────────────────────────────────────────────
/** Duration a toast message stays visible (milliseconds) */
export const TOAST_DISPLAY_DURATION_MS = 3000;

// ── Live Edit Steps ──────────────────────────────────────────────────────────
export const LIVE_EDIT_STEPS: Step[] = [
  { label: "Select", description: "Choose report" },
  { label: "Edit", description: "Modify mapping" },
  { label: "Preview", description: "Review changes" },
  { label: "Confirm", description: "Apply to Prod" },
];

// ── Icon Size Constants ──────────────────────────────────────────────────────
/** Icon size for toolbar buttons */
export const TOOLBAR_ICON_SIZE_PX = 14;

/** Icon size for success/result pages */
export const SUCCESS_ICON_SIZE_PX = 56;

/** Minimum width for the preview button in toolbar */
export const PREVIEW_BUTTON_MIN_WIDTH_PX = 150;

/** Size for the circular progress spinner in buttons */
export const BUTTON_SPINNER_SIZE_PX = 14;
