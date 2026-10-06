# Verification status

## Passed locally (6 October 2026)

- `npm test`: six tests passing (validation, one/three/additional rows, German sorting, single batch request, targeted update/delete, failure cases).
- Browser with disposable in-memory test server: three items saved together; double-click results in one batch, edit name and amount, sorting updated, cancel deletion retains row, confirm deletion removes row.
- Separate browser tab reads records created by the other tab after opening the overview.
- Added fourth form row, omitted empty second/third rows, saved the two complete rows.
- Failed save (HTTP 503) preserves values and re-enables controls. Missing configuration shows a truthful error without sample records.
- Whitespace-only name and partial rows block saving.
- Responsive layout inspected at 390 and 320 CSS pixels using a same-origin iframe fixture. No horizontal overflow; mobile form screenshot saved locally. This is layout testing, not testing on a physical phone.

## Pending

- Execute schema in the dedicated Supabase project and run `node tests/verify-supabase.js` after setting up `config.js`.
- Verify actual RLS/schema via administrative access when the Supabase connection can access Testprojekte.
- Enable GitHub Pages, verify final URL with the real database and test from a physical second device.

## Test fixture

`node tests/preview-server.js` starts a disposable local database at http://127.0.0.1:8001. The server rewrites the served config only; production config and Supabase are never used. `/mobile-preview` and `/mobile-preview?width=320` render narrow layout test frames. `/test-state` exposes fixture state. Restarting clears all data.

The live Supabase smoke test creates uniquely marked test rows, checks public read/insert/update/delete and rejection of a partially invalid batch, then deletes only those test UUIDs in a finally block.
