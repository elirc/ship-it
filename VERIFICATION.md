# Verification

Verified locally on September 7, 2026 with Node 24 and Chromium. This file records that run; it is not regenerated automatically.

The test counts below match the current sources: the Vitest files declare 32 cases in `tests/content.test.ts` (one integrity check, 25 reference checks generated per seeded ticket, six buggy-starter checks per lab), 8 in `tests/harness.test.ts`, 9 in `tests/learning.test.ts` and 12 in `tests/store.test.ts` (61 total); the Playwright files declare 3 + 7 = 10 tests.

- Production build: passed, including strict TypeScript and reference validation.
- Vitest: **61 tests passed** across the store, reward logic, sandbox harness, curriculum, recall scheduling, learning evidence, and backup compatibility. Each new lab's buggy starter is checked to fail its suite.
- Playwright: **10 browser checks verified**. Nine passed in the full run; the reference-review test then passed on its targeted rerun after correcting a selector that matched Monaco's hidden gutter. Coverage includes growth-plan navigation on mobile, notes and export, recall across reloads, preservation of original drafts, the learning loop, formatting, network restrictions, and editor loading without losing typing.
- All **25 reference solutions passed their 95 learner test cases** in both the reference validator and the actual browser sandboxes.
- Browser tests now use a dedicated clean development server to avoid stale hot-reloaded store modules in test fixtures.
- Desktop Lighthouse on the updated production ticket screen: **100 performance, 100 accessibility**. First contentful paint and largest contentful paint: 0.4 seconds; total blocking time: 50 milliseconds; cumulative layout shift: 0. Scores depend on the machine and audit conditions; this audit does not measure learning effectiveness or the growth-plan screen.

The full Lighthouse report is saved in [artifacts/lighthouse.json](artifacts/lighthouse.json). Screenshots cover the [dark workspace](artifacts/workspace-desktop.png), [light workspace](artifacts/workspace-light.png), [mobile layout](artifacts/workspace-mobile.png), [sprint board](artifacts/sprint-board.png), [growth plan](artifacts/growth-desktop.png), and [mobile growth plan](artifacts/growth-mobile.png).

For repeatable checks, see the commands in [README.md](README.md). `scripts/capture-ui.mjs` captures the development server. `scripts/audit-performance.mjs` audits the production preview at port 4173 and requires Lighthouse to be installed, or `SHIP_IT_LIGHTHOUSE` set to the file URL of its `core/index.js`. Both scripts accept `SHIP_IT_BROWSER` as an optional Chromium executable path.

The curriculum contains 65 entries: 25 complete playable exercises and 40 clearly marked upcoming entries. See [LEARNING_REVIEW.md](LEARNING_REVIEW.md) for the learning-focused review, and [DECISIONS.md](DECISIONS.md) for runtime boundaries and trade-offs.
