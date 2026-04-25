<script setup lang="ts">
import TangoButton from './TangoButton.vue';
import TangoCard from './TangoCard.vue';
import TangoInput from './TangoInput.vue';

const todos = [
  { id: 1, text: 'Groceries at Trader Joe\'s', assigned: 'Both', completed: true },
  { id: 2, text: 'Pay electric bill', assigned: 'Alex', completed: true },
  { id: 3, text: 'Walk the dog (long route)', assigned: 'Sam', completed: false, priority: 'High' },
  { id: 4, text: 'Call landlord about sink', assigned: 'Alex', completed: false },
  { id: 5, text: 'Plan weekend trip', assigned: 'Both', completed: false },
];
</script>

<template>
  <div class="max-w-2xl mx-auto w-full flex flex-col gap-8">
    <!-- Phrase of the Day Card -->
    <TangoCard padding="lg" shadow="none" class="w-full pixel-border bg-surface hard-shadow-green relative overflow-hidden">
      <div class="absolute top-0 right-0 w-24 h-24 bg-dither opacity-50 border-l-2 border-b-2 border-on-surface"></div>
      <div class="flex items-center gap-2 mb-4 relative z-10">
        <span class="material-symbols-outlined text-secondary" style="font-variation-settings: 'FILL' 1;">local_florist</span>
        <h2 class="text-label-sm text-secondary uppercase tracking-widest">Phrase of the Day</h2>
      </div>
      <p class="text-headline-md text-on-surface relative z-10">"Grow together, one pixel at a time."</p>
    </TangoCard>

    <!-- Task List Container -->
    <div class="flex flex-col gap-4 w-full">
      <div class="flex justify-between items-end mb-2 border-b-2 border-on-background pb-2 w-full">
        <h2 class="text-headline-lg text-on-surface">Shared To-Dos</h2>
        <span class="bg-primary-container text-on-primary-container pixel-border-sm text-label-sm px-3 py-1 uppercase whitespace-nowrap">2 / 5</span>
      </div>
      
      <!-- Task Items -->
      <label 
        v-for="todo in todos" 
        :key="todo.id"
        class="bg-surface pixel-border p-4 flex items-center gap-4 cursor-pointer hover:bg-surface-container-low transition-colors hard-shadow w-full"
      >
        <div 
          class="w-6 h-6 sunken-input flex items-center justify-center flex-shrink-0"
          :class="{ 'bg-primary text-on-primary': todo.completed }"
        >
          <span v-if="todo.completed" class="material-symbols-outlined text-[16px] font-bold">check</span>
        </div>
        <div class="flex flex-col flex-grow min-w-0">
          <span 
            class="text-body-lg text-on-surface break-words"
            :class="{ 'text-on-surface-variant line-through': todo.completed }"
          >
            {{ todo.text }}
          </span>
          <span class="text-label-sm text-outline uppercase mt-1">Assigned: {{ todo.assigned }}</span>
        </div>
        <span 
          v-if="todo.priority" 
          class="bg-primary-container text-on-primary-container pixel-border-sm text-label-sm px-3 py-1 uppercase flex-shrink-0"
        >
          {{ todo.priority }}
        </span>
      </label>
    </div>

    <!-- Add Task Area -->
    <TangoCard padding="lg" shadow="default" class="w-full">
      <TangoInput label="Add New Task" placeholder="What needs doing?" class="w-full" />
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-6 gap-4">
        <div class="flex gap-2 flex-wrap">
          <TangoButton variant="outline" size="sm" class="uppercase">Both</TangoButton>
          <TangoButton variant="outline" size="sm" class="uppercase">Alex</TangoButton>
          <TangoButton variant="outline" size="sm" class="uppercase">Sam</TangoButton>
        </div>
        <TangoButton shadow="dark" size="md" class="uppercase w-full sm:w-auto">Add</TangoButton>
      </div>
    </TangoCard>
  </div>
</template>
