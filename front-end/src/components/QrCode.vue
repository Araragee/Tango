<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import QRCode from 'qrcode';

interface Props {
    value: string;
    size?: number;
}
const props = withDefaults(defineProps<Props>(), { size: 192 });

const dataUrl = ref('');
const error = ref('');

const render = async () => {
    error.value = '';
    if (!props.value) {
        dataUrl.value = '';
        return;
    }
    try {
        dataUrl.value = await QRCode.toDataURL(props.value, {
            margin: 1,
            width: props.size,
            errorCorrectionLevel: 'M',
            color: { dark: '#000000', light: '#ffffff' },
        });
    } catch (e: any) {
        error.value = e.message ?? 'Failed to render QR.';
    }
};

watch(() => [props.value, props.size], render);
onMounted(render);
</script>

<template>
  <div class="inline-flex items-center justify-center pixel-border-sm bg-white p-2">
    <img v-if="dataUrl" :src="dataUrl" :width="size" :height="size" alt="QR code" class="block" />
    <div v-else-if="error" class="text-error text-label-sm p-4">{{ error }}</div>
    <div v-else class="text-on-surface-variant text-label-sm p-4">…</div>
  </div>
</template>
