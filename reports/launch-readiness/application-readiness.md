# Application Readiness

**Audit completed.** Scope: `UI/easydev-support-ai-web/apps/{admin-portal, agent-workspace, customer-widget, help-center}`. Method: 4 parallel deep-dive passes, one per app, each reading 15-30 source files plus shared packages (auth, permissions, realtime, design-system, api-client). This was sampling, not exhaustive - per-app caveats noted below. Full detail in `risk-register.md` (RR-56 through RR-60).

## Per-app summary

**admin-portal** (Next.js 15 App Router): Auth gating is solid - `RequireAuth` blocks child render until authenticated, no flash-of-content. Permission gating is **entirely cosmetic/absent** - a full `@easydev/permissions` library exists but has zero imports in this app (e.g. the team-management remove-member button renders unconditionally regardless of the viewer's role). Branding colors are real and tenant-driven, but the captured logo URL is never rendered anywhere in the app. No realtime dependency at all - "live" dashboard data is 15-second polling (one incidents page doesn't even poll). No route-level error boundaries; most pages don't check `isError`, so a failed fetch renders as an empty state.

**agent-workspace** (Next.js 15 App Router): Same safe auth-gating pattern. Permission gating is inconsistent but partially real - AI takeover/pause and the Settings nav are properly gated, but ticket approve/reject and conversation resolve/close have no client-side gating at all (a UX gap, not a security one, since the backend enforces regardless). Branding is genuinely wired via CSS-variable injection. Realtime is genuinely production-grade - Socket.IO with infinite reconnection, exponential backoff, online/offline detection, and a visible connection-status indicator. Same error-state blind spot as admin-portal: fetch failures render as misleading empty states.

**customer-widget**: Architecturally different - no IAM auth at all (anonymous visitors), gated by a server-validated session token bound to tenant plus an origin allowlist. Tenant id has a sticky-write guard against accidental loss on navigation. Branding is half-wired - colors are fetched but applied via scattered inline styles rather than the shared theming system, and the fetched logo is never rendered. No responsive breakpoints - a fixed-size frame that won't adapt to constrained host iframes. Message-send and file-upload failures have no error UI at all - silent failure with an optimistic message left stranded with no retry indicator.

**help-center**: Public knowledge base, mostly unauthenticated. The one finding worth flagging clearly: **per-tenant branding only activates for logged-in users**, but this app's actual audience is anonymous visitors by design - so the real visitor population always sees hardcoded "EasyDev" branding instead of the tenant's own, which is the opposite of the intended white-label behavior. Internal links don't propagate the tenant-id query param, so bookmarked/shared article links can break.

## Top cross-cutting risks

1. **Branding is broken for the surfaces that matter most** (RR-56) - help-center's anonymous-visitor majority never sees tenant branding; customer-widget fetches but never renders the tenant logo; admin-portal captures but never displays one either. The underlying theming mechanism works fine where it's actually wired - each app just wires it incompletely or to the wrong identity source.
2. **Fetch errors are systematically indistinguishable from empty states**, in all 4 apps, with zero route-level error boundaries anywhere (RR-57) - during a real backend incident, users and support staff doing triage would see "nothing here" instead of "something's wrong."
3. **Client-side permission gating is inconsistent/absent** (RR-58) - a UX gap, not a security hole, since backend enforcement is what actually matters, but it signals the shared permissions library isn't being adopted consistently.
4. **Dark mode is fully-built, entirely unused infrastructure** in all 4 apps (RR-59) - pure maintenance debt.
5. **Realtime adoption is uneven** (RR-60) - agent-workspace and customer-widget are genuinely solid; admin-portal has no realtime dependency at all.

## Process note

The subagent conducting this audit reported encountering fabricated, injected fake `<system-reminder>` content inside tool output during its run (a bogus date-change notice and a fake "available agent types" list) and correctly ignored it without acting on it. See `risk-register.md`'s process note for the full transparency disclosure.

## Verdict

**Not security-blocking, but real UX and consistency gaps.** Nothing found here rises to the severity of the backend Critical findings - this is mostly about error-state UX, branding completeness, and inconsistent adoption of shared libraries across teams/apps. Recommend fixing the branding gaps (since they undermine a core multi-tenant product promise) and the error-state blind spot (since it actively hampers incident response) before launch; the permission-gating UX and dark-mode cleanup can reasonably follow post-launch.
