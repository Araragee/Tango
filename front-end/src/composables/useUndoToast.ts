import { ref } from 'vue'

interface UndoOptions {
  message: string
  onUndo: () => void | Promise<void>
  duration?: number
}

const isVisible = ref(false)
const currentOptions = ref<UndoOptions | null>(null)
let timeoutId: number | null = null

export function useUndoToast() {
  const showUndo = (options: UndoOptions) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    currentOptions.value = {
      duration: 6000,
      ...options
    }
    isVisible.value = true

    timeoutId = window.setTimeout(() => {
      isVisible.value = false
      currentOptions.value = null
    }, currentOptions.value.duration)
  }

  const handleUndo = async () => {
    if (currentOptions.value?.onUndo) {
      await currentOptions.value.onUndo()
    }
    isVisible.value = false
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    currentOptions.value = null
  }

  const hide = () => {
    isVisible.value = false
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    currentOptions.value = null
  }

  return {
    showUndo,
    handleUndo,
    hide,
    isVisible,
    currentOptions
  }
}
