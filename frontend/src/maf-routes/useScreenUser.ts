/**
 * Shared hook for MAF screen entry points — fetches the current user + permissions.
 * Each MAF screen is independent (no shared parent state), so each must fetch its own user data.
 */
import { useState, useEffect } from "react";

interface ScreenUser {
  id: string;
  email: string;
  name: string;
  picture: string;
  permissions: string[];
}

const DEFAULT_USER: ScreenUser = {
  id: "",
  email: "",
  name: "",
  picture: "",
  permissions: [],
};

export function useScreenUser(): { user: ScreenUser; loading: boolean } {
  const [user, setUser] = useState<ScreenUser>(DEFAULT_USER);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Inject Google Fonts for Inter + Fira Code
    const fontId = "nfc-google-fonts";
    if (!document.getElementById(fontId)) {
      // Preconnect for faster font loading
      if (!document.querySelector('link[href="https://fonts.googleapis.com"]')) {
        const preconnect1 = document.createElement("link");
        preconnect1.rel = "preconnect";
        preconnect1.href = "https://fonts.googleapis.com";
        document.head.appendChild(preconnect1);

        const preconnect2 = document.createElement("link");
        preconnect2.rel = "preconnect";
        preconnect2.href = "https://fonts.gstatic.com";
        preconnect2.crossOrigin = "anonymous";
        document.head.appendChild(preconnect2);
      }

      const link = document.createElement("link");
      link.id = fontId;
      link.rel = "stylesheet";
      link.href =
        "https://fonts.googleapis.com/css2?family=Fira+Code:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&display=block";
      document.head.appendChild(link);
    }
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      // Try MAF gateway first
      let res = await fetch("/api/v3/nfc-admin/api/auth/me", { credentials: "include" }).catch(() => null);

      if (res && res.ok) {
        const ct = res.headers.get("content-type") || "";
        if (ct.includes("application/json")) {
          const data = await res.json();
          setUser(data);
          setLoading(false);
          return;
        }
      }

      // Fallback: direct to local backend
      res = await fetch("http://localhost:8000/api/auth/me", {
        headers: { "X-User-Email": "saideep.verma01@gmail.com" },
      }).catch(() => null);

      if (res && res.ok) {
        const data = await res.json();
        setUser(data);
      }
      setLoading(false);
    };

    fetchUser();
  }, []);

  return { user, loading };
}
