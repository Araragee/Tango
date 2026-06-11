
## Priority 2: Code Integrity

1.  **RLS Vulnerabilities/Oversights:**
    *   **Finding:** `goals_update` and `events_update` policies check if the user is a household member: `using (public.is_household_member(household_id));` but do NOT have a `WITH CHECK` clause.
    *   **Risk:** This means a malicious user could potentially construct a payload to change the `household_id` of an existing goal/event to another household, effectively transferring or "stealing" the record.
    *   **Recommendation:** Add `with check (public.is_household_member(household_id))` to all `UPDATE` policies (transactions, goals, calendar_events, etc.).

2.  **Optimistic Updates Lacking Fallbacks:**
    *   **Finding:** While offline write queuing was implemented for many stores, there are still spots missing error handling. e.g. In `useContributionsStore.ts`, `removeContribution` handles offline queues, but there may be edge cases around realtime refetch limits if offline.
    *   **Recommendation:** Re-audit `useAppStore` vs `useContributionsStore` optimistic rollback code to verify they restore all properties properly.

3.  **Missing Error Boundaries in Vue components:**
    *   **Finding:** If an API call throws an unhandled error inside a setup block, it might tear down the component tree or unmount silently.
    *   **Recommendation:** Wrap complex `onMounted` fetches in `try/catch` or use Vue's `onErrorCaptured` boundary.

4.  **Inefficient / any Types:**
    *   **Finding:** Many mappers (e.g., `mapTransaction(r: any)` in `useStore.ts`) bypass TypeScript completely.
    *   **Recommendation:** Auto-generate Supabase types using the Supabase CLI (`supabase gen types typescript`) and type the `r` input properly instead of `any`.

5.  **Offline Queue Retry Logic Issue:**
    *   **Finding:** In `useOfflineQueue.ts`, `entry.attempts + 1 >= 5` drops items. However, if a permanent 400 error occurs and the device stays online, this drops the item immediately without notifying the user.
    *   **Recommendation:** Provide UI visibility for failed offline syncs so users know their data wasn't saved.
