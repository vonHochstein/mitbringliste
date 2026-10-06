# Verification status

## Passed locally (6 October 2026)

- `npm test`: six tests passing (validation, one/three/additional rows, German sorting, single batch request, targeted update/delete, failure cases).
- Browser with disposable in-memory test server: three items saved together; double-click results in one batch, edit name and amount, sorting updated, cancel deletion retains row, confirm deletion removes row.
- Separate browser tab reads records created by the other tab after opening the overview.
- Added fourth form row, omitted empty second/third rows, saved the two complete rows.
- Failed save (HTTP 503) preserves values and re-enables controls. Missing configuration shows a truthful error without sample records.
- Whitespace-only name and partial rows block saving.
- Responsive layout inspected at 390 and 320 CSS pixels using a same-origin iframe fixture. No horizontal overflow; mobile form screenshot saved locally. This is layout testing, not testing on a physical phone.

## Passed against Supabase (6 October 2026)

- Project `mitbringliste` in `Testprojekte`, Frankfurt; organization uses Free tier.
- Existing schema matches schema.sql; RLS enabled, four policies for anon, only the three content columns allow UPDATE. No table grants to authenticated or PUBLIC.
- Security Advisor reports no findings.
- `node tests/verify-supabase.js`: public read, batch insert, independent read, targeted update, atomic rejection of an invalid batch, and targeted delete all passed.
- All uniquely marked test records were removed; zero TEST rows remain.
- GitHub Pages is enabled; the landing page is reachable at https://vonhochstein.github.io/mitbringliste/.

## Pending

- Verify the deployed database configuration and browser flow with the real database.
- Physical second-device testing is not available in this environment; separate browser clients are used instead.

## Test fixture

`node tests/preview-server.js` starts a disposable local database at http://127.0.0.1:8001. The server rewrites the served config only; production config and Supabase are never used. `/mobile-preview` and `/mobile-preview?width=320` render narrow layout test frames. `/test-state` exposes fixture state. Restarting clears all data.

The live Supabase smoke test creates uniquely marked test rows, checks public read/insert/update/delete and rejection of a partially invalid batch, then deletes only those test UUIDs in a finally block.
