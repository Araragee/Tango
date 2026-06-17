
## Priority 3: Design Findings

1.  **Hardcoded Transitions & Overuse of Slide-Fade:**
    *   **Finding:** `<transition name="slide-fade" mode="out-in">` is used broadly in `App.vue`. While visually pleasing, this can cause jank on lower-end devices if not carefully managed.
    *   **Recommendation:** Use `@media (prefers-reduced-motion: reduce)` to disable animations for users who prefer it.

2.  **Responsiveness of Fixed Header:**
    *   **Finding:** The fixed header (`header class="fixed top-0 left-0 w-full z-40...``) uses `hidden md:flex` for the main navigation. On smaller screens, users rely on `<BottomNav />`.
    *   **Recommendation:** Verify that the touch targets on the `<BottomNav>` are adequately sized (at least 48x48px) for mobile usability.

3.  **Contrast Issues with Dither Background:**
    *   **Finding:** The `bg-dither` utility might interfere with legibility of text depending on the underlying theme (`selection:bg-primary-container`).
    *   **Recommendation:** Ensure contrast ratios meet WCAG AA standards (4.5:1) for all primary text on top of the `bg-dither` or surface colors.

4.  **"Pixel-Border" Styling Inconsistencies:**
    *   **Finding:** Several interactive elements use `pixel-border-sm` and `pixel-border`.
    *   **Recommendation:** Audit the design system to ensure buttons, inputs, and cards have consistent border radii/pixel styles across all states (hover, focus, active).
