import { useState } from "react";
import { motion, AnimatePresence } from "../Motion";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import { Button } from "../ui";

interface Props {
  detailText: string | null;
  onClose: () => void;
}

export default function AuditDetailModal({ detailText, onClose }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (detailText) {
      navigator.clipboard.writeText(detailText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <AnimatePresence>
      {detailText !== null && (
        <div className="audit-modal-overlay" onClick={onClose}>
          <motion.div
            className="audit-modal"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="audit-modal-header">
              <span>Details</span>
              <div className="audit-modal-actions">
                <Button size="sm" title="Copy to clipboard" onClick={handleCopy}>
                  {copied ? (
                    <>
                      <CheckIcon sx={{ fontSize: 14 }} /> Copied
                    </>
                  ) : (
                    <>
                      <ContentCopyIcon sx={{ fontSize: 14 }} /> Copy
                    </>
                  )}
                </Button>
                <button type="button" className="close-btn" title="Close" onClick={onClose}>
                  <CloseIcon sx={{ fontSize: 18 }} />
                </button>
              </div>
            </div>
            <div className="audit-modal-body">{detailText}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
