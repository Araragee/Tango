import { ref } from 'vue';

let activeModals = 0;

export function useScrollLock() {
  const isLocked = ref(false);

  const lock = () => {
    if (isLocked.value) return;
    isLocked.value = true;
    if (activeModals === 0) {
      document.body.style.overflow = 'hidden';
    }
    activeModals++;
  };

  const unlock = () => {
    if (!isLocked.value) return;
    isLocked.value = false;
    activeModals--;
    if (activeModals <= 0) {
      activeModals = 0;
      document.body.style.overflow = '';
    }
  };

  return { lock, unlock };
}
