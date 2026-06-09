import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "./ui";
import CookieIcon from "./icons/CookieIcon";

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
          {/* Cookie illustration */}
          <div className="cookie-icon-wrap">
            <CookieIcon />
          </div>

          <div className="cookie-content">
            <h5 className="cookie-title">Your privacy is important to us</h5>
            <p className="cookie-text">
              We process your personal information to measure and improve our sites and services, to assist our
              campaigns and to provide personalised content.
              <br />
              For more information see our{" "}
              <Link to="/privacy" className="cookie-link">
                Privacy Policy
              </Link>
            </p>
          </div>

          <div className="cookie-actions">
            <Button variant="primary" size="sm" onClick={accept}>
              Accept
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
