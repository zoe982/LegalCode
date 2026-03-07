import { useState } from 'react';

export function useRegisterSW() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [offlineReady, setOfflineReady] = useState(false);
  return {
    needRefresh: [needRefresh, setNeedRefresh] as [boolean, (val: boolean) => void],
    offlineReady: [offlineReady, setOfflineReady] as [boolean, (val: boolean) => void],
    updateServiceWorker: () => Promise.resolve(),
  };
}
