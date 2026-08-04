/**
 * ExecutionPlanPanel — Shows the two-table execution plan and column mapping
 * displayed in Step 2 (Execute) of the data transfer wizard.
 */

interface ExecutionPlanRow {
  Property: string;
  Value: string;
}

interface ColumnMappingRow {
  csv: string;
  db: string;
}

interface ExecutionPlanPanelProps {
  planRows: ExecutionPlanRow[];
  mappingRows: ColumnMappingRow[];
  tableName: string;
}

export function ExecutionPlanPanel({ planRows, mappingRows, tableName }: ExecutionPlanPanelProps) {
  return (
    <div className="ingest-execute-grid">
      {/* Execution Plan */}
      <div className="panel csv-preview-panel">
        <div className="panel-header">Execution Plan</div>
        <div className="csv-preview-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>Property</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {planRows.map((row) => (
                <tr key={row.Property}>
                  <td>{row.Property}</td>
                  <td>
                    <strong>{row.Value}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Column Mapping */}
      <div className="panel csv-preview-panel">
        <div className="panel-header">Column Mapping — CSV → {tableName}</div>
        <div className="csv-preview-scroll">
          <table className="data-table">
            <thead>
              <tr>
                <th>CSV Column</th>
                <th>→</th>
                <th>Database Column ({tableName})</th>
              </tr>
            </thead>
            <tbody>
              {mappingRows.map((row) => (
                <tr key={row.csv}>
                  <td>{row.csv}</td>
                  <td>→</td>
                  <td>
                    <strong>{row.db}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
