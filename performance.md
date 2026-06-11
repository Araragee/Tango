
## Priority 1: Performance

1.  **Dynamic Import Issue:** In `front-end/src/stores/useStore.ts` line 583, there is a dynamic import for `useContributionsStore` inside a tight loop or frequently executed block: `const { useContributionsStore } = await import('./useContributionsStore')`.
    *   **Finding:** As noted by Vite build output `(!) /app/front-end/src/stores/useContributionsStore.ts is dynamically imported by /app/front-end/src/stores/useStore.ts but also statically imported by ... dynamic import will not move module into another chunk.`
    *   **Recommendation:** Move to a static import at the top of the file to fix the Vite warning and avoid runtime overhead from dynamic `import()` evaluation during transaction processing.

2.  **Unnecessary Realtime Refetches:** In `front-end/src/stores/useContributionsStore.ts`, the `subscribe` handler scopes realtime updates by fetching the full `goals` list from `useAppStore()`.
    *   **Finding:** `appStore.plans.goals.some((g: any) => g.id === affectedGoalId)`. If an INSERT comes in and triggers a refetch via `fetchForHousehold()`, it fetches *all* contributions for all goals.
    *   **Recommendation:** The `fetchForHousehold` query is slightly inefficient if only one goal was affected. Consider fetching only the new contribution.

3.  **IndexedDB Loading Overhead:** `useOfflineQueue.ts` calls `await load()` on every `flush()`. `load()` fetches all items from IndexedDB via `d.getAll(STORE)`.
    *   **Recommendation:** Keep the `pending` state purely in memory and let it sync up on app load or push changes directly, instead of querying `getAll()` unconditionally.

4.  **Inefficient Event Listener Handlers:** In `useThemeStore.ts`, `_mqlHandler` updates the `systemDark.value` which triggers a `watch` loop calling `applyTheme()`. Although lightweight, this can be combined better for performance.

5.  **Global Resize/DOM Watchers:** Need to ensure that elements such as chart resizers do not run in non-passive event listener contexts or trigger excessive repaints.
