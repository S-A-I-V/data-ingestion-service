/**
 * MAF API helper — provides registerModule, useMAFContext, and API utilities.
 *
 * In the MAF shell (IFL2), `window.maf` provides the real implementations.
 */

import axios from "axios";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const maf = (window as any).maf;

/**
 * useMAFContext — access MAF shell context (navigation, app state, user info).
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
        useUserData: () => ({ email: "saideep.verma01@gmail.com", firstName: "Saideep", lastName: "Verma" }),
        useAppState: () => ({}),
        useUIToggles: () => ({}),
      },
    });

/**
 * registerModule — registers a React component as a MAF screen module.
 * Uses maf.getRegisterAppModule() as maf.registerModule is deprecated.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const registerModule = maf
  ? maf.getRegisterAppModule({})
  : // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (_Component: React.FC<any>, _options?: any) => {};

export { useMAFContext, registerModule };

/**
 * Axios instance configured for MAF environment.
 */
export const mafApi = axios.create({
  baseURL: "/api/v3/nfc-admin/api",
  withCredentials: true,
});
