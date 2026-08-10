/**
 * MAF API helper — provides registerModule, useMAFContext, and API utilities.
 *
 * In the MAF shell (IFL2), `window.maf` provides the real implementations.
 * Pattern copied from NFC repo: uses getRegisterAppModule() to create the register function.
 */

import axios from "axios";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const maf = (window as any).maf;

/**
 * useMAFContext — access MAF shell context (navigation, app state, user info).
 * In MAF shell, this is the real hook. In standalone Vite, it's a no-op fallback.
 */
const useMAFContext = maf
  ? maf.useMAFContext
  : () => ({
      actions: {
        navigate: ({ screenId }: { screenId?: string }) => {
          if (screenId) window.location.hash = `#/${screenId}`;
        },
        logout: () => {
          window.location.reload();
        },
      },
      selectors: {
        useUserData: () => ({ email: "mafadminuser.local@nielsen.com", firstName: "MAF", lastName: "Admin" }),
        useAppState: () => ({}),
        useUIToggles: () => ({}),
      },
    });

/**
 * registerModule — registers a React component as a MAF screen module.
 * Uses maf.getRegisterAppModule() which returns the actual register function.
 * This is the pattern NFC uses.
 */
const registerModule = maf
  ? maf.getRegisterAppModule({
      appStateScheme: {},
      routeOverrides: {},
    })
  : // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (_Component: React.FC<any>, _options?: any) => {};

export { useMAFContext, registerModule };

/**
 * Axios instance configured for MAF environment.
 * In MAF: API calls go through /nfc-admin/api/... (app prefix required by gateway)
 * In local dev (Vite standalone): goes through /api (Vite proxy to localhost:8000)
 */
export const mafApi = axios.create({
  baseURL: "/nfc-admin/api",
  withCredentials: true,
});

mafApi.interceptors.request.use((config) => {
  // In local dev (Vite), add the dev email header
  // In MAF shell, the gateway handles Authorization injection
  if (import.meta.env?.DEV) {
    config.headers["X-Auth-Email"] = "mafadminuser.local@nielsen.com";
  }
  return config;
});
