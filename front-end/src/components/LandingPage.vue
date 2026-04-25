<script setup lang="ts">
import TangoButton from './TangoButton.vue';
import TangoCard from './TangoCard.vue';
</script>

<template>
  <div class="bg-dither min-h-screen flex flex-col selection:bg-primary-container selection:text-on-primary-container">
    <!-- Main Content -->
    <main class="flex-grow flex flex-col items-center justify-center p-gutter md:p-xl w-full max-w-5xl mx-auto space-y-xl">
      <!-- Hero Section -->
      <section class="w-full flex flex-col items-center text-center space-y-lg pixel-border bg-surface p-xl relative mt-8 hard-shadow">
        <div class="absolute -top-4 -left-4 w-10 h-10 bg-primary pixel-border hard-shadow-dark flex items-center justify-center">
          <span class="material-symbols-outlined text-on-primary font-bold text-[20px]" style="font-variation-settings: 'FILL' 1;">favorite</span>
        </div>
        <div class="absolute -bottom-4 -right-4 w-10 h-10 bg-secondary pixel-border hard-shadow-dark flex items-center justify-center">
          <span class="material-symbols-outlined text-on-secondary font-bold text-[20px]" style="font-variation-settings: 'FILL' 1;">star</span>
        </div>
        <div class="w-32 h-32 mb-md bg-inverse-surface pixel-border p-4 flex items-center justify-center hard-shadow-dark">
          <img 
            alt="Pixel art heart logo" 
            class="w-full h-full object-contain" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuCXMeis2x07XcmMrmbOrUiWItb2qDv-knp15g3phlyOfMqszjAOFKh4d72WeDsfYpRXvrkxEyp0Gb0Qp80fSRZRLJ-Lf4feWaSfXJOoz_lZdjtPJVCU9USFK7PjMECMCu0XxoWQ9zsVBpqW6lfB2r50aoriuDG_5zI_IMiBNvGTmemI198u5U2N1q5fl7im-f6Ysp7pGttdr8m6hP4VuOjWrkzhB7aUBuZPxMPld_gfJDpkTzpIZbj_F6Lysop1fCeA7FkZhIY-V6E" 
            style="image-rendering: pixelated;"
          />
        </div>
        <h1 class="text-headline-xl text-primary tracking-tighter italic">Tango</h1>
        <p class="text-body-lg text-on-surface-variant max-w-md">Your shared life, pixel perfectly organized.</p>
        <div class="pt-md">
          <TangoButton size="lg" variant="outline">
            Start Your Journey
          </TangoButton>
        </div>
      </section>

      <!-- Features Bento Grid -->
      <section class="w-full grid grid-cols-1 md:grid-cols-2 gap-md md:gap-xl pb-12">
        <!-- Feature 1: Shared Calendar -->
        <TangoCard padding="none" shadow="default" class="flex flex-col h-full">
          <div class="bg-secondary text-on-secondary p-4 border-b-2 border-on-background text-label-sm uppercase flex items-center gap-3">
            <span class="material-symbols-outlined text-[18px]" style="font-variation-settings: 'FILL' 1;">event_note</span>
            Shared Calendar
          </div>
          <div class="p-8 flex-grow bg-dither flex flex-col items-center justify-center text-center">
            <p class="text-body-lg text-on-background bg-surface pixel-border p-4 shadow-[4px_4px_0px_0px_#506354]">Never double-book date night again.</p>
          </div>
        </TangoCard>

        <!-- Feature 2: Budgeting -->
        <TangoCard padding="none" shadow="dark" class="flex flex-col h-full">
          <div class="bg-primary text-on-primary p-4 border-b-2 border-on-background text-label-sm uppercase flex items-center gap-3">
            <span class="material-symbols-outlined text-[18px]" style="font-variation-settings: 'FILL' 1;">payments</span>
            Budgeting
          </div>
          <div class="p-8 flex-grow flex flex-col justify-center space-y-6 bg-surface-container-low">
            <div class="w-full h-8 pixel-border bg-surface relative overflow-hidden">
              <div class="absolute top-0 left-0 h-full w-[60%] bg-primary border-r-2 border-on-background flex justify-end">
                <div class="w-6 h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPjxyZWN0IHdpZHRoPSIyIiBoZWlnaHQ9IjIiIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC41Ii8+PHJlY3QgeD0iMiIgeT0iMiIgd2lkdGg9IjIiIGhlaWdodD0iMiIgZmlsbD0iI2ZmZiIgZmlsbC1vcGFjaXR5PSIwLjUiLz48L3N2Zz4=')] opacity-50"></div>
              </div>
            </div>
            <p class="text-body-md text-on-surface-variant text-center">Shared goals, tracked together.</p>
          </div>
        </TangoCard>

        <!-- Feature 3: To-Dos -->
        <TangoCard padding="none" shadow="default" class="flex flex-col h-full md:col-span-2">
          <div class="bg-secondary text-on-secondary p-4 border-b-2 border-on-background text-label-sm uppercase flex items-center gap-3">
            <span class="material-symbols-outlined text-[18px]" style="font-variation-settings: 'FILL' 1;">check_box</span>
            To-Dos
          </div>
          <div class="p-8 flex-grow flex flex-col sm:flex-row gap-8 items-center justify-between bg-surface-container-low">
            <div class="space-y-4 w-full sm:w-1/2">
              <label class="flex items-center gap-4 cursor-pointer p-2 border-b-2 border-on-background border-dashed">
                <div class="w-6 h-6 sunken-input bg-surface border border-on-background"></div>
                <span class="text-body-lg text-on-background">Groceries</span>
              </label>
              <label class="flex items-center gap-4 cursor-pointer p-2 border-b-2 border-on-background border-dashed opacity-50">
                <div class="w-6 h-6 sunken-input flex items-center justify-center bg-primary text-on-primary border border-on-background">
                  <span class="material-symbols-outlined text-[16px] font-bold">check</span>
                </div>
                <span class="text-body-lg text-on-background line-through">Walk the dog</span>
              </label>
            </div>
            <div class="w-full sm:w-1/2 bg-surface-variant p-6 pixel-border text-body-lg text-center shadow-[4px_4px_0px_0px_#506354]">
              Keep track of the little things.
            </div>
          </div>
        </TangoCard>
      </section>
    </main>
  </div>
</template>
