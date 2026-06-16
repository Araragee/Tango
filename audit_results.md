# Tango App Audit Results

## 1. Stability Issues & Bugs
- **Failing Unit Test**: `front-end/src/App.test.ts` fails because it expects the text "PartnerSpace", but the application is branded as "TANGO".
- **Missing PWA Assets**: The `public/` directory is missing. As a result, the PWA manifest, favicons, and icons defined in `vite.config.ts` will fail to load, potentially causing browser errors or preventing PWA installation.

## 2. Incomplete Functions & Dashboards
- **Hardcoded Component Data**: The following components define their data locally instead of using the global state in `useStore.ts`:
  - `BudgetTracker.vue` (transactions, balance, breakdown)
  - `SharedCalendar.vue` (calendar grid logic, events)
  - `TangoPlans.vue` (long-term and short-term goals)
  - `TangoTodo.vue` (task list)
- **Non-Functional "Add" Actions**: Buttons like "ADD" in BudgetTracker, "New Goal" in TangoPlans, and the "Add" button in TangoTodo are not connected to any logic.
- **Missing State Persistence**: The Pinia store (`useStore.ts`) does not persist to `localStorage`. Refreshing the app resets all state.

## 3. Broken Links & UX Gaps
- **Landing Page CTA**: The "Start Your Journey" button on the `LandingPage.vue` has no `@click` handler and does nothing.
- **Navigation Inconsistency**: While the `BottomNav` works, some top-level interactions (like clicking the profile image or specific feature cards on the Landing Page) are not fully implemented or linked to their respective views.

## Remediation Plan
1. **Fix Tests**: Update `front-end/src/App.test.ts` to check for "TANGO" instead of "PartnerSpace".
2. **Centralize Data**: Move all mock data from `BudgetTracker.vue`, `SharedCalendar.vue`, `TangoPlans.vue`, and `TangoTodo.vue` into `useStore.ts`.
3. **Connect Components**: Refactor components to use computed properties from the Pinia store for their data displays.
4. **Implement Actions**: Add methods to `useStore.ts` for:
   - `addTransaction`
   - `addGoal`
   - `addTodo`
   - `addEvent`
5. **Persistence**: Add a Pinia plugin or a `watch` in `main.ts` to synchronize store state with `localStorage`.
6. **Assets**: Create the `front-end/public/` directory and add placeholder icons (`favicon.ico`, `pwa-192x192.png`, etc.) to satisfy Vite PWA requirements.
7. **UX Fixes**:
   - Add `setActiveView('To-Dos')` to the "Start Your Journey" button on the Landing Page.
   - Ensure the Top Bar "TANGO" logo always returns users to the Landing Page.

## Final Task Prompt
Refactor the Tango app to improve stability and complete its core features.
1. **Fix Tests**: Update `App.test.ts` to align with the "TANGO" branding.
2. **State Management**: Centralize all mock data from feature components (`Budget`, `Calendar`, `Plans`, `To-Dos`) into the Pinia store (`useStore.ts`). Implement CRUD actions (add/delete) for all features.
3. **Persistence**: Enable `localStorage` persistence for the Pinia store.
4. **PWA & Assets**: Create a `public/` folder with required PWA icons (`favicon.ico`, `pwa-192x192.png`, `pwa-512x512.png`, `mask-icon.svg`, `apple-touch-icon.png`).
5. **Interactive UI**: Connect the "Start Your Journey" button on the Landing Page to the To-Dos view and ensure all "Add" buttons in the app functional.
