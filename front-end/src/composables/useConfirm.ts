import { ref } from 'vue'

export type ConfirmOptions = {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  isDestructive?: boolean
  requireTypedText?: string
}

const isOpen = ref(false)
const options = ref<ConfirmOptions>({
  title: '',
  message: ''
})

let resolvePromise: ((value: boolean) => void) | null = null

export function useConfirm() {
  const confirm = (opts: ConfirmOptions): Promise<boolean> => {
    if (isOpen.value && resolvePromise) {
      resolvePromise(false)
    }
    options.value = {
      confirmText: 'Confirm',
      cancelText: 'Cancel',
      isDestructive: false,
      ...opts
    }
    isOpen.value = true
    return new Promise((resolve) => {
      resolvePromise = resolve
    })
  }

  const cancel = () => {
    isOpen.value = false
    if (resolvePromise) {
      resolvePromise(false)
      resolvePromise = null
    }
  }

  const accept = () => {
    isOpen.value = false
    if (resolvePromise) {
      resolvePromise(true)
      resolvePromise = null
    }
  }

  return {
    confirm,
    cancel,
    accept,
    isOpen,
    options
  }
}
