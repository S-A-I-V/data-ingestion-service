/**
 * ColumnOrderStrip — Drag-to-reorder strip showing visible columns as chips.
 * Users can drag chips to reorder them and click × to remove.
 */
import { useRef, useState } from "react";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import { Button } from "../ui";
import { getColumnLabel } from "../../utils/columnHelpers";

interface ColumnOrderStripProps {
  columnOrder: string[];
  onReorder: (newOrder: string[]) => void;
  onRemove: (col: string) => void;
}

export default function ColumnOrderStrip({ columnOrder, onReorder, onRemove }: ColumnOrderStripProps) {
  const dragIdx = useRef<number | null>(null);
  const [dropTarget, setDropTarget] = useState<{ idx: number; side: "left" | "right" } | null>(null);

  const handleDragStart = (e: React.DragEvent, idx: number) => {
    dragIdx.current = idx;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", String(idx));
    const el = e.currentTarget as HTMLElement;
    requestAnimationFrame(() => el.classList.add("dragging"));
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragIdx.current === idx) {
      setDropTarget(null);
      return;
    }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midX = rect.left + rect.width / 2;
    const side = e.clientX < midX ? "left" : "right";
    setDropTarget({ idx, side });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const fromIdx = dragIdx.current;
    if (fromIdx === null || !dropTarget) {
      if (fromIdx !== null) {
        const updated = [...columnOrder];
        const [dragged] = updated.splice(fromIdx, 1);
        updated.push(dragged);
        onReorder(updated);
      }
      dragIdx.current = null;
      setDropTarget(null);
      return;
    }
    const { idx: targetIdx, side } = dropTarget;
    let insertAt = side === "left" ? targetIdx : targetIdx + 1;
    if (fromIdx < insertAt) insertAt -= 1;
    if (fromIdx === insertAt) {
      dragIdx.current = null;
      setDropTarget(null);
      return;
    }
    const updated = [...columnOrder];
    const [dragged] = updated.splice(fromIdx, 1);
    updated.splice(insertAt, 0, dragged);
    onReorder(updated);
    dragIdx.current = null;
    setDropTarget(null);
  };

  const handleDropEnd = (e: React.DragEvent) => {
    e.preventDefault();
    const fromIdx = dragIdx.current;
    if (fromIdx === null) return;
    const updated = [...columnOrder];
    const [dragged] = updated.splice(fromIdx, 1);
    updated.push(dragged);
    onReorder(updated);
    dragIdx.current = null;
    setDropTarget(null);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.currentTarget as HTMLElement).classList.remove("dragging");
    dragIdx.current = null;
    setDropTarget(null);
  };

  return (
    <div className="lookup-order-strip">
      <span className="lookup-order-label">Column order:</span>
      <div className="lookup-order-chips">
        {columnOrder.map((col, idx) => (
          <div
            key={col}
            className={`lookup-order-chip${dragIdx.current === idx ? " dragging" : ""}${dropTarget?.idx === idx && dropTarget.side === "left" ? " drop-left" : ""}${dropTarget?.idx === idx && dropTarget.side === "right" ? " drop-right" : ""}`}
            draggable
            onDragStart={(e) => handleDragStart(e, idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDrop={handleDrop}
            onDragEnd={(e) => handleDragEnd(e)}
          >
            <DragIndicatorIcon className="lookup-order-grip" sx={{ fontSize: 12 }} />
            <span>{getColumnLabel(col)}</span>
            <Button
              size="icon"
              variant="ghost"
              className="lookup-order-remove"
              onClick={() => onRemove(col)}
              aria-label={`Remove ${getColumnLabel(col)}`}
            >
              ×
            </Button>
          </div>
        ))}
        {/* Trailing drop zone for end-drop */}
        <div
          className="lookup-order-end-zone"
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
            setDropTarget(null);
          }}
          onDrop={handleDropEnd}
        />
      </div>
    </div>
  );
}
