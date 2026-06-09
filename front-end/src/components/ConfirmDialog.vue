<script setup lang="ts">
import { ref, watch, nextTick } from 'vue';
import BaseModal from './BaseModal.vue';
import TangoButton from './TangoButton.vue';
import TangoInput from './TangoInput.vue';
import { useConfirm } from '../composables/useConfirm';

const { isOpen, options, accept, cancel } = useConfirm();
const typedText = ref('');
const inputRef = ref<InstanceType<typeof TangoInput> | null>(null);

watch(isOpen, async (newVal) => {
  if (newVal) {
    typedText.value = '';
    if (options.value.requireTypedText) {
      await nextTick();
      inputRef.value?.$el.querySelector('input')?.focus();
    }
  }
});

const handleAccept = () => {
  if (
    options.value.requireTypedText &&
    typedText.value !== options.value.requireTypedText
  ) {
    return;
  }
  accept();
};

const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
        handleAccept();
    }
}
</script>

<template>
  <BaseModal
    :show="isOpen"
    :title="options.title"
    @close="cancel"
  >
    <div class="space-y-4">
      <p class="text-on-surface-variant text-sm">{{ options.message }}</p>

      <div v-if="options.requireTypedText" class="space-y-2">
        <p class="text-xs font-semibold text-error">
          Type <strong>{{ options.requireTypedText }}</strong> below to confirm.
        </p>
        <TangoInput
          v-model="typedText"
          ref="inputRef"
          type="text"
          :placeholder="options.requireTypedText"
          class="w-full"
          @keydown="handleKeydown"
        />
      </div>

      <div class="flex justify-end gap-3 pt-4 border-t border-outline-variant mt-6">
        <TangoButton
          variant="secondary"
          @click="cancel"
        >
          {{ options.cancelText || 'Cancel' }}
        </TangoButton>
        <TangoButton
          :variant="options.isDestructive ? 'primary' : 'primary'"
          :class="options.isDestructive ? 'bg-error hover:bg-error/90 text-on-error' : ''"
          @click="handleAccept"
          :disabled="options.requireTypedText ? typedText !== options.requireTypedText : false"
        >
          {{ options.confirmText || 'Confirm' }}
        </TangoButton>
      </div>
    </div>
  </BaseModal>
</template>
