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

interface TopAppBarContextValue {
  config: TopAppBarConfig;
  setConfig: (config: TopAppBarConfig) => void;
  clearConfig: () => void;
}

const TopAppBarContext = createContext<TopAppBarContextValue | null>(null);

export function TopAppBarProvider({ children }: { children: ReactNode }) {
  const [config, setConfigState] = useState<TopAppBarConfig>({});

  const setConfig = useCallback((newConfig: TopAppBarConfig) => {
    setConfigState(newConfig);
  }, []);

  const clearConfig = useCallback(() => {
    setConfigState({});
  }, []);

  const value = useMemo(
    () => ({ config, setConfig, clearConfig }),
    [config, setConfig, clearConfig],
  );

  return <TopAppBarContext.Provider value={value}>{children}</TopAppBarContext.Provider>;
}

export function useTopAppBarConfig(): TopAppBarContextValue {
  const ctx = useContext(TopAppBarContext);
  if (!ctx) {
    return {
      config: {},
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
