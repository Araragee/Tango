# Phase 1: Mobile-First PWA Foundation for Two

This document outlines the initial setup and architecture for the shared partner app.

## 1. Project Initialization

To set up the foundation using Vite, TypeScript, and Tailwind CSS, run the following commands:

```bash
# Initialize Vite project with React and TypeScript
npm create vite@latest partner-pwa -- --template react-ts
cd partner-pwa

# Install Tailwind CSS and its dependencies
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Install core libraries
npm install lucide-react framer-motion zustand clsx tailwind-merge
# (Optional) Install shadcn/ui components as needed
```

## 2. Core Architecture (Frontend)

- **State Management:** Zustand will be used for a lightweight, reactive state that easily persists to `localStorage`.
- **Styling:** Tailwind CSS for utility-first styling, ensuring a "mobile-first" approach.
- **Animations:** Framer Motion for smooth transitions between navigation tabs.
- **PWA:** Use `vite-plugin-pwa` for easy service worker and manifest generation.

## 3. Mock Data Structure (Initial State)

```typescript
// src/store/useStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AppState {
  budget: { transactions: any[], totalIncome: number, totalExpenses: number };
  plans: { goals: any[] };
  todos: { items: any[] };
  calendar: { events: any[] };
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      budget: { transactions: [], totalIncome: 5000, totalExpenses: 2800 },
      plans: { goals: [{ id: 1, title: 'Summer Vacation', progress: 65 }] },
      todos: { items: [{ id: 1, text: 'Buy groceries', completed: false }] },
      calendar: { events: [{ id: 1, title: 'Date Night', date: '2023-11-20' }] },
    }),
    { name: 'partner-app-storage' }
  )
);
```

## 4. Design Direction
- **Vibe:** Clean, minimalist, and "calm tech."
- **Navigation:** Sticky bottom bar for one-handed use.
- **Interactions:** Tactile feedback on checkboxes and list items.
