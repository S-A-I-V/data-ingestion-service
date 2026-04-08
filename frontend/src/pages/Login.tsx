import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import IconButton from "@mui/material/IconButton";
import Checkbox from "@mui/material/Checkbox";
import EmailIcon from "@mui/icons-material/Email";
import LockIcon from "@mui/icons-material/Lock";
import PersonIcon from "@mui/icons-material/Person";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import StorageIcon from "@mui/icons-material/Storage";
import api from "../api";

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    color: "#fff", fontSize: "0.9rem", fontFamily: "inherit",
    borderRadius: "10px", background: "rgba(255,255,255,0.06)",
    "& fieldset": { borderColor: "rgba(255,255,255,0.1)" },
    "&:hover fieldset": { borderColor: "rgba(255,255,255,0.2)" },
    "&.Mui-focused fieldset": { borderColor: "#0fb1b2" },
  },
  "& .MuiInputLabel-root": {
    color: "rgba(255,255,255,0.4)", fontSize: "0.9rem", fontFamily: "inherit",
    "&.Mui-focused": { color: "#0fb1b2" },
  },
};

interface Props { onLogin: () => void; }

export default function Login({ onLogin }: Props) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError("");
    if (mode === "register" && !agreed) { setError("Please agree to the Terms & Conditions"); return; }
    if (!email || !password) { setError("Email and password are required"); return; }
    if (mode === "register" && (!firstName || !lastName)) { setError("Name is required"); return; }
    setLoading(true);
    try {
      if (mode === "register") {
        const r = await api.post("/auth/register", { first_name: firstName, last_name: lastName, email, password });
        localStorage.setItem("token", r.data.token);
      } else {
        const r = await api.post("/auth/login/email", { email, password });
        localStorage.setItem("token", r.data.token);
      }
      onLogin();
    } catch (err: any) { setError(err.response?.data?.detail || "Something went wrong"); }
    setLoading(false);
  };

  return (
    <div className="auth-bg">
      <div className="auth-bg-overlay" />

      {/* Brand */}
      <div className="auth-floating-brand">
        <StorageIcon sx={{ fontSize: 22 }} />
        <span>NFC DATA INGESTION</span>
      </div>

      {/* Glass Card */}
      <motion.div
        className="auth-glass-card"
        initial={{ opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
      >
        <AnimatePresence mode="wait">
          <motion.div key={mode} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.25 }}>

            <h1 className="auth-title">
              {mode === "register" ? "Create an account" : "Welcome back"}
            </h1>
            <p className="auth-subtitle">
              {mode === "register"
                ? <>Already have an account? <button type="button" className="auth-link" onClick={() => { setMode("login"); setError(""); }}>Log in</button></>
                : <>Don't have an account? <button type="button" className="auth-link" onClick={() => { setMode("register"); setError(""); }}>Sign up</button></>}
            </p>

            <form className="auth-form" onSubmit={handleSubmit}>
              {mode === "register" && (
                <div className="auth-row">
                  <TextField label="First name" variant="outlined" size="small" fullWidth value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    InputProps={{ startAdornment: <InputAdornment position="start"><PersonIcon sx={{ fontSize: 18, color: "rgba(255,255,255,0.25)" }} /></InputAdornment> }}
                    sx={fieldSx} />
                  <TextField label="Last name" variant="outlined" size="small" fullWidth value={lastName}
                    onChange={(e) => setLastName(e.target.value)} sx={fieldSx} />
                </div>
              )}

              <TextField label="Email" variant="outlined" size="small" fullWidth type="email" value={email}
                onChange={(e) => setEmail(e.target.value)}
                InputProps={{ startAdornment: <InputAdornment position="start"><EmailIcon sx={{ fontSize: 18, color: "rgba(255,255,255,0.25)" }} /></InputAdornment> }}
                sx={fieldSx} />

              <TextField label="Enter your password" variant="outlined" size="small" fullWidth
                type={showPw ? "text" : "password"} value={password}
                onChange={(e) => setPassword(e.target.value)}
                InputProps={{
                  startAdornment: <InputAdornment position="start"><LockIcon sx={{ fontSize: 18, color: "rgba(255,255,255,0.25)" }} /></InputAdornment>,
                  endAdornment: <InputAdornment position="end">
                    <IconButton size="small" onClick={() => setShowPw(!showPw)} sx={{ color: "rgba(255,255,255,0.25)" }}>
                      {showPw ? <VisibilityOffIcon sx={{ fontSize: 18 }} /> : <VisibilityIcon sx={{ fontSize: 18 }} />}
                    </IconButton>
                  </InputAdornment>,
                }}
                sx={fieldSx} />

              {mode === "register" && (
                <label className="auth-checkbox">
                  <Checkbox checked={agreed} onChange={(e) => setAgreed(e.target.checked)} size="small"
                    sx={{ color: "rgba(255,255,255,0.25)", "&.Mui-checked": { color: "#0fb1b2" }, p: 0, mr: 1 }} />
                  <span>I agree to the <a href="#" className="auth-link">Terms & Conditions</a></span>
                </label>
              )}

              {error && <div className="auth-error">{error}</div>}

              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? "Please wait..." : mode === "register" ? "Create account" : "Sign in"}
              </button>
            </form>

            <div className="auth-divider"><span>Or continue with</span></div>

            <div className="auth-social">
              <a href="/api/auth/login" className="auth-social-btn">
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                  <path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24.0 24.0 0 0 0 0 21.56l7.98-6.19z" />
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                </svg>
                Google
              </a>
            </div>
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* Bottom tagline */}
      <div className="auth-bottom-tagline">
        Ingest with confidence. Transfer with ease.
      </div>
    </div>
  );
}
