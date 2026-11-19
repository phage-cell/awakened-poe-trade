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

### Trade validation and additional Covens coverage

- Added The Covetous Dark (Eye Gouger) to the English unique catalog.
  Name and base match GGG's item list. The icon is from
  https://poedb.tw/us/The_Covetous_Dark. Existing data already contains
  Hide of the Vendigo, The Sword of Ages, Putrid Seed, Mycelium Core,
  Cursed Poppet and Fireball of Radiation.
- Exact Viscera searches show the canonical base on the filter button.
  Click it to broaden the search to the same body slot.
- A public Covens search for Flaming Goat Hoof and viscera.leg returned
  1,345 listings at verification time. Saved the first listing's decoded
  extended.text as a regression fixture, excluding seller and listing data.
  Its item level 47, 12% fire damage and implicit.stat_3962278098 agree
  with GGG's structured listing. Tests also exercise actual request
  serialization for exact types, relaxed slots and the unique claw.
- GGG exposes fated and unidentified_tier. A tier-filtered listing's
  exported clipboard showed only Unidentified. A fated-only search returned
  no listing. Neither property is inferred from an ordinary unidentified
  clipboard. Other tier-specific and fated searches remain open.
- Fork configuration and Electron profile use the phage-cell-poe-trade directory under the OS app-data root, selected before the single-instance lock.

- Retained public listing clipboard fixtures for all four body slots.
  Removed seller notes. Live searches returned examples for Al-Hezmin's
  Head, Smuggler's Hand and Golemic Stone in addition to the hoof.
- The Windows workflow now starts the actual portable artifact, waits for
  the packaged application's loopback API, checks its reported version
  and checks the dedicated profile before uploading.

## Cached price checks and shortcut settings

The quick and locked price checks now open with cached estimates by default.
Use **Check live listings** to submit the selected trade filters. Price Check
settings can restore automatic searches and edit either shortcut using the
same recorder and stored settings as the Hotkeys page.

Viscera estimates use the public poe.ninja stash overview, by active popular
PC league. Match the full printed tier name and the complete set of parsed
implicit trade IDs to a unique overview row. Ambiguous or unmatched variants
show no estimate. Estimates summarize a variant across numeric rolls. Fetch
once per league per session, reuse for 30 minutes, share pending downloads,
and retain the original fetch time after a failed refresh. Other supported
items use the existing poe.ninja price database with a visible cache age.
Refreshes share in-flight requests. Live trade results remain available for
rare gear, private leagues, and custom roll or listing filters.

## Configurable price refresh and portable ZIP

Settings → Price Check now includes a refresh interval slider with stops at
1, 3, 5, 10, 15, 30, 45 and 60 minutes. Existing profiles and new profiles
default to 15 minutes. Save applies the interval to general and Viscera
overviews. Checks run on use and while the price panel is open. Live listing
searches remain manual in cached-first mode.

Both price caches share pending requests per league, honor server max-age
and Retry-After, and send If-None-Match when an ETag is available. A 304
retains the rows and updates the checked time. An error retains the last
successful data and backs off. A shorter interval can still return the
same data.

After the Windows launch test, CI creates a single ZIP containing the
portable executable, extracts it, compares the executable's SHA-256 with
the tested original, and uploads that ZIP directly.

## Viscera exact-roll asking prices

Check exact rolls submits an on-demand price-sorted trade query with equal
minimum and maximum values for every supported numeric implicit. The overlay
shows the rolls used. Existing Check live listings still uses the editable
filters. The separate poe.ninja estimate now says "all rolls".

Quotes are cached in memory by trade site, realm, league, full tiered name,
implicit IDs and rolls, and serialized search filters. Reopening a matching
item displays its previous asking price and check time. The refresh slider
controls when a manual refresh becomes available. Zero matches are cached.
Errors remain retryable. Exact lookups do not run in the background.

For a nonempty search, fetch up to ten price-sorted listings. Verify the
listing clipboard's tier, modifiers and values before using the first
verified asking price. The count shown is the trade API's search count.
If no fetched listing verifies, display that limitation. Exact lookup is
available for recognized PC Viscera with supported single-value numeric
implicits. Multivalue averages, ambiguous IDs and unrecognized modifiers are
excluded. Variants with a fixed additional implicit can still be checked.

Added a Covens listing clipboard for a 4% cold / 5% lightning King Crab's
Claw. Regression tests distinguish 4/5 from 5/5, leagues and seller settings,
and reject a cheaper listing with the wrong rolls. A live merchant-only
query returned 45 matches and the first verified 4/5 listing asked 21 chaos
at development time.
