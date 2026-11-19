# phage-cell fork of Awakened PoE Trade

## Covens development branch

Baseline: upstream and fork master at 35b967e5ae84ea84984928a2c8c1fed992088270,
package version 3.30.101. From a clean checkout with Node 24.22.3, run
`npm ci && npm run lint && npm run build` in renderer, then
`npm ci && npm run build` in main. Both builds passed on Linux before edits.
Renderer lint had four existing warnings. The main postinstall applied the
upstream app-builder-lib patch with a version mismatch warning.

### Clipboard and trade search

- The Wickerman help-text parser previously renamed the item to Viscera
  and attempted a database lookup. No generic record exists in the bundled
  item catalog. Preserve the printed name and assign internal Viscera metadata
  directly when the localized Wickerman attachment instruction is present.
- Snapshot 164 English trade types from GGG's items endpoint, group viscera.
  Exact searches use the API type, stripping Lesser or Greater when resolving
  the base. Unknown names with a recognized slot can still use a category
  search. Unknown names without a slot are rejected.
- Keep the existing category mappings: head, body, arm and leg. All four
  occur in GGG's category filter. Existing localized help and slot strings
  continue to apply. Exact names and new modifier data are English.
- Parse recognized plain Viscera stat lines as implicits using existing numeric
  and translation logic. Preserve advanced-description processing. Added 41
  English implicit definitions with previously absent references and matchers.
  Selected candidate definitions from Ex4amp1e's public patch and verified
  the identifier and canonical text for each against the official stats API.
  This is a targeted addition, not a complete catalog of Covens modifiers.
- Regression entry point after the renderer build: `node tests/viscera.mjs`
  in renderer. Fixtures reconstruct clipboard layout with bundled help and
  slot strings. They exercise all four slots, tier prefixes, unknown names,
  a numeric implicit and its trade ID. They are not live game captures.

### Packaging

- Added a Windows x64 portable-only workflow on dev/poe-3.30 with Node
  24.22.3, lockfile installs, lint, production builds and fixture tests.
  Download the commit-specific artifact from the successful Actions run.
- Explicit fork GitHub update provider, independent app ID, product name
  and executable filename. Workflow publishes no releases. Portable builds
  use upstream's manual-download behavior. The About link opens fork builds.
- Recheck upstream's parser, data and packaging changes when rebasing or
  merging future upstream commits into the development branch.

### Evidence and verification scope

- https://www.pathofexile.com/api/trade/data/items
- https://www.pathofexile.com/api/trade/data/filters
- https://www.pathofexile.com/api/trade/data/stats
- https://github.com/SnosMe/awakened-poe-trade/issues/1951
- https://github.com/Ex4amp1e/awakened-poe-trade/pull/2
  (candidate source f0b8f9ab6ecd74e58af872599a86a90ffc9680e1)

Live inventory copying, overlay interaction, listing matches, other 3.30
item families and localized stat coverage require further verification.
