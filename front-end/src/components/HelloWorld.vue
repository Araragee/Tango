<script setup lang="ts">
import { ref } from 'vue'

defineProps<{ msg: string }>()

const count = ref(0)
</script>

<template>
  <div class="flex flex-col items-center justify-center space-y-8 p-8">
    <h1 class="bg-gradient-to-r from-brand-primary to-brand-secondary bg-clip-text text-6xl font-black tracking-tighter text-transparent">
      {{ msg }}
    </h1>

    <div class="group relative">
      <div class="absolute -inset-1 rounded-lg bg-gradient-to-r from-brand-primary to-brand-secondary opacity-25 blur transition duration-1000 group-hover:opacity-100 group-hover:duration-200"></div>
      <button 
        type="button" 
        @click="count++"
        class="relative flex items-center justify-center rounded-lg bg-slate-900 px-8 py-4 font-bold text-white transition-all hover:bg-slate-800"
      >
        Count is {{ count }}
      </button>
    </div>

    <p class="text-slate-400">
      Edit
      <code class="rounded bg-slate-800 px-2 py-1 text-brand-primary font-mono text-sm">components/HelloWorld.vue</code> to test HMR
    </p>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl pt-12">
      <div class="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-brand-primary/50 transition-colors">
        <h3 class="text-brand-primary font-bold mb-2">Composition API</h3>
        <p class="text-sm text-slate-400 leading-relaxed">Built with the modern script setup syntax for better performance and DX.</p>
      </div>
      <div class="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-brand-primary/50 transition-colors">
        <h3 class="text-brand-primary font-bold mb-2">TypeScript</h3>
        <p class="text-sm text-slate-400 leading-relaxed">Fully typed props, state, and events for enterprise-grade reliability.</p>
      </div>
      <div class="p-6 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-brand-primary/50 transition-colors">
        <h3 class="text-brand-primary font-bold mb-2">Tailwind v4</h3>
        <p class="text-sm text-slate-400 leading-relaxed">Leveraging the latest styling engine for lightning-fast development.</p>
      </div>
    </div>
  </div>
</template>
