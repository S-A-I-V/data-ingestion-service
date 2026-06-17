/**
 * FileUploader — Step 2 of the ingestion flow.
 * Provides a drag-and-drop / click-to-browse file upload area for CSV files.
 */
import { useRef } from "react";
import { Panel, PanelHeader, PanelBody } from "../ui";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { fmtBytes } from "./ExecStatsPanel";

interface FileUploaderProps {
  file: File | null;
  csvTotalRows: number;
  csvFileSize: number;
  disabled: boolean;
  onFileSelect: (file: File) => void;
}

export default function FileUploader({ file, csvTotalRows, csvFileSize, disabled, onFileSelect }: FileUploaderProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <Panel>
      <PanelHeader>
        <span className="step-num">2</span> Upload CSV
      </PanelHeader>
      <PanelBody>
        <div
          className="file-drop"
          onClick={() => !disabled && fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            if (!disabled && e.dataTransfer.files[0]) onFileSelect(e.dataTransfer.files[0]);
          }}
        >
          <span className="drop-icon">
            {file ? <InsertDriveFileIcon sx={{ fontSize: 32 }} /> : <CloudUploadIcon sx={{ fontSize: 32 }} />}
          </span>
          {file ? file.name : "Drop your CSV file here, or click to browse"}
          <span className="drop-hint">
            {file ? `${csvTotalRows.toLocaleString()} rows · ${fmtBytes(csvFileSize)}` : ".csv files"}
          </span>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".csv"
          hidden
          onChange={(e) => {
            if (e.target.files?.[0]) onFileSelect(e.target.files[0]);
          }}
        />
      </PanelBody>
    </Panel>
  );
}
