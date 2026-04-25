<script setup lang="ts">
interface Props {
  modelValue?: string | number;
  label?: string;
  type?: string;
  placeholder?: string;
}

defineProps<Props>();
defineEmits(['update:modelValue']);
</script>

<template>
  <div class="flex flex-col gap-2">
    <label v-if="label" class="text-label-sm uppercase text-on-surface-variant font-bold">
      {{ label }}
    </label>
    <input
      :type="type || 'text'"
      :value="modelValue"
      :placeholder="placeholder"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      class="sunken-input px-4 py-2 text-body-md focus:outline-none focus:ring-1 focus:ring-primary pixel-border-sm"
    />
  </div>
</template>
