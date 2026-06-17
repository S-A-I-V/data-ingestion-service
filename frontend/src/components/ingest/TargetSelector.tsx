/**
 * TargetSelector — Step 1 of the ingestion flow.
 * Allows users to pick a connection, table, and operation.
 */
import { Panel, PanelHeader, PanelBody, FormRow, Spinner } from "../ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import { SELECT_NONE_VALUE, INGESTION_OPERATIONS, OPERATION_LABELS } from "../../constants/ingest";
import type { Connection } from "../../types";

interface TargetSelectorProps {
  connections: Connection[];
  connectionsLoading: boolean;
  selectedConnectionId: number | null;
  onConnectionChange: (id: number | null) => void;
  tables: string[];
  tablesLoading: boolean;
  selectedTable: string;
  onTableChange: (table: string) => void;
  operation: string;
  onOperationChange: (op: string) => void;
}

export default function TargetSelector({
  connections,
  connectionsLoading,
  selectedConnectionId,
  onConnectionChange,
  tables,
  tablesLoading,
  selectedTable,
  onTableChange,
  operation,
  onOperationChange,
}: TargetSelectorProps) {
  return (
    <Panel>
      <PanelHeader>
        <span className="step-num">1</span> Select Target
      </PanelHeader>
      {connectionsLoading ? (
        <Spinner size="lg" label="Loading connections..." />
      ) : (
        <PanelBody>
          <FormRow label="Connection:">
            <Select
              value={selectedConnectionId ? String(selectedConnectionId) : SELECT_NONE_VALUE}
              onValueChange={(v) => onConnectionChange(v === SELECT_NONE_VALUE ? null : +v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a connection..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SELECT_NONE_VALUE}>Choose a connection...</SelectItem>
                {connections.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name} ({c.db_type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormRow>
          <FormRow label="Table:">
            <Select
              value={selectedTable || SELECT_NONE_VALUE}
              onValueChange={(v) => onTableChange(v === SELECT_NONE_VALUE ? "" : v)}
              disabled={!selectedConnectionId || tablesLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder={tablesLoading ? "Loading tables..." : "Choose a table..."} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SELECT_NONE_VALUE}>
                  {tablesLoading ? "Loading tables..." : "Choose a table..."}
                </SelectItem>
                {tables.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {tablesLoading && <span className="field-spinner" />}
          </FormRow>
          <FormRow label="Operation:">
            <Select value={operation} onValueChange={onOperationChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(OPERATION_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormRow>
        </PanelBody>
      )}
    </Panel>
  );
}
