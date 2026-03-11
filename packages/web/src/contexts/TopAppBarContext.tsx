import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';

interface TopAppBarConfig {
  breadcrumbTemplateName?: string | undefined;
  breadcrumbPageName?: string | undefined;
  panelToggles?: ReactNode | undefined;
  statusBadge?: ReactNode | undefined;
  rightSlot?: ReactNode | undefined;
  documentHeader?: ReactNode | undefined;
}

interface TopAppBarConfigContextValue {
  config: TopAppBarConfig;
}

interface TopAppBarSetterContextValue {
  setConfig: (config: TopAppBarConfig) => void;
  clearConfig: () => void;
}

interface TopAppBarContextValue extends TopAppBarConfigContextValue, TopAppBarSetterContextValue {}

const TopAppBarConfigContext = createContext<TopAppBarConfigContextValue | null>(null);
const TopAppBarSetterContext = createContext<TopAppBarSetterContextValue | null>(null);

export function TopAppBarProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<TopAppBarConfig>({});

  const setConfig = useCallback((newConfig: TopAppBarConfig) => {
    setConfigState(newConfig);
  }, []);

  const clearConfig = useCallback(() => {
    setConfigState({});
  }, []);

  const setterValue = useMemo(() => ({ setConfig, clearConfig }), [setConfig, clearConfig]);

  const configValue = useMemo(() => ({ config }), [config]);

  return (
    <TopAppBarSetterContext.Provider value={setterValue}>
      <TopAppBarConfigContext.Provider value={configValue}>
        {children}
      </TopAppBarConfigContext.Provider>
    </TopAppBarSetterContext.Provider>
  );
}

export function useTopAppBarSetters(): TopAppBarSetterContextValue {
  const ctx = useContext(TopAppBarSetterContext);
  if (!ctx) {
    return {
      setConfig: () => {
        /* noop */
      },
      clearConfig: () => {
        /* noop */
      },
    };
  }
  return ctx;
}

export function useTopAppBarConfig(): TopAppBarContextValue {
  const configCtx = useContext(TopAppBarConfigContext);
  const setterCtx = useContext(TopAppBarSetterContext);

  const config = configCtx?.config ?? {};
  const setConfig =
    setterCtx?.setConfig ??
    (() => {
      /* noop */
    });
  const clearConfig =
    setterCtx?.clearConfig ??
    (() => {
      /* noop */
    });

  return { config, setConfig, clearConfig };
}
