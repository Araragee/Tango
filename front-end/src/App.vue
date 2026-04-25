<script setup lang="ts">
import HelloWorld from './components/HelloWorld.vue'
</script>

<template>
  <main class="min-h-screen w-full overflow-x-hidden">
    <!-- Navbar -->
    <nav class="fixed top-0 left-0 right-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div class="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div class="flex items-center gap-2">
          <div class="h-8 w-8 rounded-lg bg-gradient-to-br from-brand-primary to-brand-secondary"></div>
          <span class="text-xl font-black tracking-tight text-white uppercase">Tango</span>
        </div>
        <div class="hidden items-center gap-8 md:flex">
          <a href="#" class="text-sm font-medium text-slate-400 hover:text-white transition-colors">Documentation</a>
          <a href="#" class="text-sm font-medium text-slate-400 hover:text-white transition-colors">Components</a>
          <a href="#" class="text-sm font-medium text-slate-400 hover:text-white transition-colors">Showcase</a>
          <button class="rounded-full bg-white px-5 py-2 text-sm font-bold text-slate-950 hover:bg-slate-200 transition-all shadow-xl shadow-white/5">
            Get Started
          </button>
        </div>
      </div>
    </nav>

    <!-- Hero Section -->
    <section class="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
      <!-- Background Blobs -->
      <div class="absolute top-0 left-1/2 -z-10 h-[800px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-primary/10 blur-[120px]"></div>
      <div class="absolute bottom-0 right-0 -z-10 h-[600px] w-[600px] translate-x-1/3 translate-y-1/3 rounded-full bg-brand-secondary/5 blur-[100px]"></div>

      <div class="mx-auto max-w-7xl px-6">
        <div class="flex flex-col items-center text-center">
          <div class="mb-6 inline-flex items-center rounded-full border border-brand-primary/20 bg-brand-primary/5 px-3 py-1 text-xs font-semibold text-brand-primary backdrop-blur-sm">
            🚀 New features are live!
          </div>
          
          <HelloWorld msg="Beautiful by Default." />
          
          <div class="mt-16 flex flex-wrap justify-center gap-4">
            <div class="flex h-12 items-center gap-2 rounded-xl bg-slate-900 border border-slate-800 px-4">
              <span class="text-slate-500 font-mono text-sm">$</span>
              <code class="text-slate-300 font-mono text-sm">npm install tango-ui</code>
              <button class="ml-2 text-slate-500 hover:text-white transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="border-t border-slate-900 bg-slate-950/50 py-12">
      <div class="mx-auto max-w-7xl px-6 text-center">
        <p class="text-sm text-slate-500">
          Built with ❤️ for the modern web. © 2024 Tango Project.
        </p>
      </div>
    </footer>
  </main>
</template>

<style>
/* Custom animations can go here if needed */
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
</style>
