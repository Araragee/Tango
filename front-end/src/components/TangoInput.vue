<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  modelValue?: string | number;
  label?: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  id?: string;
}

const props = defineProps<Props>();
defineEmits(['update:modelValue']);

const inputId = computed(() => props.id || `input-${Math.random().toString(36).slice(2, 9)}`);
</script>

<template>
  <div class="flex flex-col gap-2">
    <label v-if="label" :for="inputId" class="text-label-sm uppercase text-on-surface-variant font-bold">
      {{ label }} <span v-if="required" class="text-error">*</span>
    </label>
    <input
      :id="inputId"
      :type="type || 'text'"
      :value="modelValue"
      :placeholder="placeholder"
      :required="required"
      @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      class="sunken-input px-4 py-2 text-body-md focus:outline-none focus:ring-1 focus:ring-primary pixel-border-sm w-full"
      :class="{ 'border-error ring-error': error }"
    />
    <span v-if="error" class="text-[10px] text-error font-bold uppercase">{{ error }}</span>
  </div>
</template>
