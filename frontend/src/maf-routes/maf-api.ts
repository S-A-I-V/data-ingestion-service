/**
 * MAF API helper — provides registerModule and useMAFContext.
 *
 * In the MAF shell (IFL2), `window.maf` provides the real implementations.
 * In local development (Vite standalone), these are no-ops / pass-throughs.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mafGlobal = (window as any).maf;

/**
 * Register a React component as a MAF screen module.
 * Uses window.maf.registerModule — the IFL2 registration API.
 */
export function registerModule(Component: React.FC<any>, options?: { routeOverrides?: Record<string, any> }): void {
  if (mafGlobal && mafGlobal.registerModule) {
    mafGlobal.registerModule(Component, options);
  }
}

/**
 * Access MAF shell context (navigation, app state, user info).
 * Falls back to no-op defaults when running standalone.
 */
export function useMAFContext() {
  if (mafGlobal && mafGlobal.useMAFContext) {
    return mafGlobal.useMAFContext();
  }

  // Standalone fallback
  return {
    actions: {
      navigate: ({ screenId }: { screenId?: string }) => {
        if (screenId) {
          window.location.hash = `#/${screenId}`;
        }
      },
    },
    selectors: {
      useAppState: () => ({}),
      useUIToggles: () => ({}),
    },
  };
}
