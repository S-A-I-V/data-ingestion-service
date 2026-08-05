/**
 * MAF API helper — provides registerModule and useMAFContext.
 *
 * In local development (Vite), these are no-ops / pass-throughs.
 * In the MAF shell, the global `window.__MAF__` object provides the real implementations.
 */

type MAFContext = {
  actions: {
    navigate: (opts: { screenId?: string; appState?: Record<string, any> }) => void;
  };
  selectors: {
    useAppState: () => Record<string, any>;
  };
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const globalMAF = (window as any).__MAF__;

/**
 * Register a React component as a MAF screen module.
 * In standalone mode (Vite dev), this is a no-op — the component renders via React Router.
 * In MAF shell, this wires the component into the framework's screen lifecycle.
 */
export function registerModule(Component: React.FC<any>, options?: { routeOverrides?: Record<string, any> }): void {
  if (globalMAF && globalMAF.registerModule) {
    globalMAF.registerModule(Component, options);
  }
}

/**
 * Access MAF shell context (navigation, app state, user info).
 * Falls back to no-op defaults when running standalone.
 */
export function useMAFContext(): MAFContext {
  if (globalMAF && globalMAF.useContext) {
    return globalMAF.useContext();
  }

  // Standalone fallback
  return {
    actions: {
      navigate: ({ screenId }) => {
        if (screenId) {
          window.location.hash = `#/${screenId}`;
        }
      },
    },
    selectors: {
      useAppState: () => ({}),
    },
  };
}
