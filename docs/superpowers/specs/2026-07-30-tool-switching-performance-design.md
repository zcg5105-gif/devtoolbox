# Tool Switching Performance Design

## Context

After adding Excel comparison and ten additional tools, switching between tools can feel blocked, especially the first time a large tool is opened. The current app uses Vue 2, Vue Router, Element UI, and route-level lazy loading. Production `dist/index.html` does not include async chunk prefetch/preload hints, so first navigation to a lazy route downloads and evaluates that route chunk on demand.

## Goals

- Make tool switching feel responsive when users click cards or sidebar menu items.
- Reduce first-entry delay for large tools without increasing initial app boot unnecessarily.
- Keep implementation local to routing/layout/tool pages and avoid a broad redesign.
- Preserve existing URLs, menu structure, and tool behavior.

## Root Cause Summary

- Route components are lazy-loaded, but no prefetch/preload hints are emitted in the current build output.
- Several tool chunks are large, notably Excel comparison, code obfuscation, and SQL formatting.
- `router-view` renders direct route components without an explicit loading state, so network and parsing time reads as a visible pause.

## Proposed Approach

Use a two-layer fix:

1. Add a small route preloading registry.
   - Keep route definitions and preload functions in one module.
   - Allow the layout and home cards to preload a target route on hover/focus before click.
   - Preload a conservative set of common small tools after browser idle time.

2. Defer heavy third-party libraries inside the largest tools.
   - Load `xlsx` only when Excel files are parsed or comparison results are exported.
   - Load `javascript-obfuscator` only when the user clicks the obfuscate action.
   - Keep SQL page imports unchanged in this pass unless verification shows it still dominates switching.

3. Add a route-level loading indicator.
   - Show a slim top progress bar while route chunks are resolving.
   - Avoid large skeletons or layout shifts.

## Non-Goals

- Do not replace Vue Router or Element UI.
- Do not rewrite the homepage or sidebar information architecture.
- Do not remove lazy loading globally.
- Do not implement browser performance tracing UI.

## Acceptance Criteria

- Hovering/focusing a tool card or sidebar item calls the same lazy import function used by the router.
- App startup schedules idle preloading for selected small/common tool routes.
- Navigation displays a lightweight loading state during async route resolution.
- Excel comparison no longer imports `xlsx` at module evaluation time.
- Code obfuscator no longer imports `javascript-obfuscator` at module evaluation time.
- `npm run lint` passes.
- `npm run build` passes.
- A small Node verification script proves the route preload registry exposes all configured route preloaders and supports idempotent preloading.

## Risks

- Aggressive preloading can compete with the initial page load. Mitigation: only preload a short allowlist after `requestIdleCallback` or a timeout fallback.
- Deferring heavy imports changes methods from sync to async. Mitigation: add loading state around the specific actions and keep existing output/error paths.
- Large libraries will still cost time on first actual use. Mitigation: route hover/idle preloading can fetch chunks earlier, and deferred imports avoid penalizing page entry.
