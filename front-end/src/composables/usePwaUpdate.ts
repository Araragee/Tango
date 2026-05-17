import { useRegisterSW } from 'virtual:pwa-register/vue'

export function usePwaUpdate() {
  const { needRefresh, offlineReady, updateServiceWorker } = useRegisterSW({
    immediate: true,
  })

  function applyUpdate() {
    updateServiceWorker(true)
  }

  function dismissOfflineReady() {
    offlineReady.value = false
  }

  function dismissNeedRefresh() {
    needRefresh.value = false
  }

  return {
    needRefresh,
    offlineReady,
    applyUpdate,
    dismissOfflineReady,
    dismissNeedRefresh,
  }
}
