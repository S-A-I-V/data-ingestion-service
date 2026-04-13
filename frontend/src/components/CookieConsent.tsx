import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import CookieIcon from "@mui/icons-material/Cookie";
import { Link } from "react-router-dom";

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem("cookie_consent")) {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    localStorage.setItem("cookie_consent", "accepted");
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="cookie-banner"
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
        >
          <div className="cookie-content">
            <CookieIcon sx={{ fontSize: 20, color: "var(--accent)", flexShrink: 0 }} />
            <p>
              We use essential cookies for authentication. No tracking or advertising cookies.
              See our <Link to="/privacy">Privacy Policy</Link>.
            </p>
          </div>
          <button type="button" className="cookie-accept" onClick={accept}>
            Got it
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
