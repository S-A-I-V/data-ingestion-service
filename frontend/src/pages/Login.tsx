import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import InfoSidebar from "../components/InfoSidebar";
import CornerBox from "../components/ui/CornerBox";
import api from "../api";

interface Props {
  onLogin: () => void;
}

export default function Login({ onLogin }: Props) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Email and password are required");
      return;
    }
    if (mode === "register" && (!firstName || !lastName)) {
      setError("Name is required");
      return;
    }
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
    } catch (err: any) {
      setError(err.response?.data?.detail || "Something went wrong");
    }
    setLoading(false);
  };

  return (
    <div className="home-page" style={{ minHeight: "100vh" }}>
      <div className="lf-layout">
        {/* LEFT SIDEBAR */}
        <aside className="lf-sidebar-left">
          <InfoSidebar />
        </aside>

        {/* CENTER — login form */}
        <main className="lf-main" style={{ justifyContent: "center", minHeight: "calc(100vh - 48px)" }}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            style={{ width: "100%", maxWidth: "440px" }}
          >
            <CornerBox className="p-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* Header */}
                  <h1
                    style={{
                      fontSize: "24px",
                      fontWeight: "bold",
                      color: "#20201D",
                      textAlign: "center",
                      marginBottom: "12px",
                      letterSpacing: "-0.5px",
                    }}
                  >
                    {mode === "register" ? "Create an account" : "Welcome back"}
                  </h1>
                  <p
                    style={{
                      textAlign: "center",
                      fontSize: "13px",
                      color: "#6B6B66",
                      marginBottom: "28px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "8px",
                    }}
                  >
                    {mode === "register" ? (
                      <>
                        Already have an account?{" "}
                        <button
                          type="button"
                          onClick={() => {
                            setMode("login");
                            setError("");
                          }}
                          className="btn btn-sm no-underline ml-1"
                        >
                          Log in
                        </button>
                      </>
                    ) : (
                      <>
                        Don't have an account?{" "}
                        <button
                          type="button"
                          onClick={() => {
                            setMode("register");
                            setError("");
                          }}
                          className="btn btn-sm no-underline ml-1"
                        >
                          Sign up
                        </button>
                      </>
                    )}
                  </p>

                  {/* Form */}
                  <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {mode === "register" && (
                      <div className="flex gap-3">
                        <div className="flex-1">
                          <label className="block text-[11px] font-semibold text-[#6B6B66] mb-1 uppercase tracking-wider">
                            First name
                          </label>
                          <input
                            type="text"
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            placeholder="John"
                            className="w-full px-3 py-2 text-[13px] bg-[#F6F6F3] border border-[var(--border)] rounded-[var(--sidebar-card-radius)] text-[#20201D] placeholder-[#A0A09A] outline-none focus:border-[#20201D] transition-colors font-mono"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-[11px] font-semibold text-[#6B6B66] mb-1 uppercase tracking-wider">
                            Last name
                          </label>
                          <input
                            type="text"
                            value={lastName}
                            onChange={(e) => setLastName(e.target.value)}
                            placeholder="Doe"
                            className="w-full px-3 py-2 text-[13px] bg-[#F6F6F3] border border-[var(--border)] rounded-[var(--sidebar-card-radius)] text-[#20201D] placeholder-[#A0A09A] outline-none focus:border-[#20201D] transition-colors font-mono"
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "11px",
                          fontWeight: "600",
                          color: "#6B6B66",
                          marginBottom: "6px",
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                        }}
                      >
                        Email
                      </label>
                      <CornerBox className="!border-[var(--border)]" style={{ background: "#ffffff", padding: 0 }}>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@company.com"
                          style={{
                            width: "100%",
                            padding: "10px 12px",
                            fontSize: "13px",
                            background: "transparent",
                            border: "none",
                            outline: "none",
                            color: "#20201D",
                            fontFamily: "var(--font)",
                          }}
                        />
                      </CornerBox>
                    </div>

                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "11px",
                          fontWeight: "600",
                          color: "#6B6B66",
                          marginBottom: "6px",
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                        }}
                      >
                        Password
                      </label>
                      <CornerBox className="!border-[var(--border)]" style={{ background: "#ffffff", padding: 0 }}>
                        <div style={{ display: "flex", alignItems: "center" }}>
                          <input
                            type={showPw ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            style={{
                              flex: 1,
                              padding: "10px 12px",
                              fontSize: "13px",
                              background: "transparent",
                              border: "none",
                              outline: "none",
                              color: "#20201D",
                              fontFamily: "var(--font)",
                            }}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPw(!showPw)}
                            style={{
                              paddingRight: "12px",
                              fontSize: "11px",
                              color: "#A0A09A",
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                            }}
                          >
                            {showPw ? "hide" : "show"}
                          </button>
                        </div>
                      </CornerBox>
                    </div>

                    {error && (
                      <div className="text-[12px] text-red-500 bg-red-50 border border-red-100 rounded-[var(--sidebar-card-radius)] px-3 py-2">
                        {error}
                      </div>
                    )}

                    <button type="submit" disabled={loading} className="btn btn-primary w-full justify-center mt-1">
                      {loading ? "Please wait..." : mode === "register" ? "Create account" : "Sign in"}
                    </button>
                  </form>

                  {/* Social */}
                  <div style={{ marginTop: "32px", marginBottom: "16px" }} className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-[var(--border)]" />
                    <span className="text-[11px] text-[#A0A09A] font-mono">Or continue with</span>
                    <div className="flex-1 h-px bg-[var(--border)]" />
                  </div>

                  <div className="flex gap-3">
                    <a href="/api/auth/login" className="btn flex-1 justify-center gap-2 no-underline">
                      <svg width="16" height="16" viewBox="0 0 48 48">
                        <path
                          fill="#EA4335"
                          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                        />
                        <path
                          fill="#4285F4"
                          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M10.53 28.59a14.5 14.5 0 0 1 0-9.18l-7.98-6.19a24 24 0 0 0 0 21.56l7.98-6.19z"
                        />
                        <path
                          fill="#34A853"
                          d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                        />
                      </svg>
                      Google
                    </a>
                    <a href="/api/auth/github/login" className="btn flex-1 justify-center gap-2 no-underline">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
                      </svg>
                      GitHub
                    </a>
                  </div>
                </motion.div>
              </AnimatePresence>
            </CornerBox>
          </motion.div>
        </main>

        {/* RIGHT SIDEBAR — empty matching layout */}
        <aside className="lf-sidebar-right" />
      </div>
    </div>
  );
}
