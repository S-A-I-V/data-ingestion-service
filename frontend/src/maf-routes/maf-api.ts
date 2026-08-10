/**
 * MAF API helper — provides registerModule and useMAFContext.
 *
 * In the MAF shell (IFL2), `window.maf` provides the real implementations.
 * In local development (Vite standalone), these are no-ops / pass-throughs.
 */

/**
 * Register a React component as a MAF screen module.
 * Uses window.maf.registerModule — the IFL2 registration API.
 * Accesses window.maf at call time (not module load time) to ensure
 * the MAF shell has injected it before we read it.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function registerModule(Component: React.FC<any>, options?: { routeOverrides?: Record<string, any> }): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const maf = (window as any).maf;
  if (maf && maf.registerModule) {
    maf.registerModule(Component, options);
  }
}

/**
 * Access MAF shell context (navigation, app state, user info).
 * Falls back to no-op defaults when running standalone.
 */
export function useMAFContext() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const maf = (window as any).maf;
  if (maf && maf.useMAFContext) {
    return maf.useMAFContext();
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
