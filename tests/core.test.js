import test from "node:test";
import assert from "node:assert/strict";
import { createApi, normalizeEntry, validateEntry, validateRows, sortEntries } from "../core.js";

const config = { supabaseUrl: "https://test.supabase.co", publishableKey: "sb_publishable_test" };
const id = "00000000-0000-4000-8000-000000000001";
const entry = { nutzer: "Alex", mitbringsel: "Bier", anzahl: "2 Kästen" };
const response = data => new Response(JSON.stringify(data), { status: 200 });

test("validates one, three and additional rows, ignoring fully empty rows", () => {
  for (const count of [1, 3, 7]) {
    const result = validateRows(" Alex ", [...Array.from({ length: count }, () => ({ mitbringsel: " Bier ", anzahl: " 2 Kästen " })), { mitbringsel: "  ", anzahl: "" }]);
    assert.equal(result.entries.length, count);
    assert.deepEqual(result.entries[0], entry);
    assert.deepEqual(result.invalidRows, []);
  }
});

test("partial rows and missing names block submission", () => {
  assert.deepEqual(validateRows("Alex", [{ mitbringsel: "Brot" }, { anzahl: "1 kg" }]).invalidRows, [0, 1]);
  assert.deepEqual(validateRows(" ", [entry]).invalidRows, [0]);
  assert.equal(validateRows("Alex", [{ mitbringsel: "", anzahl: "" }]).entries.length, 0);
  assert.deepEqual(validateEntry({ ...entry, anzahl: "   " }), ["anzahl"]);
  assert.deepEqual(validateEntry({ ...entry, nutzer: "x".repeat(81) }), ["nutzer"]);
  assert.deepEqual(normalizeEntry({ ...entry, id: "cannot overwrite id" }), entry);
});

test("sorts names in German and keeps same-name entries distinct", () => {
  const rows = [{ id: "3", nutzer: "Zoe", mitbringsel: "Brot" }, { id: "1", nutzer: "Änne", mitbringsel: "Wasser" }, { id: "2", nutzer: "Änne", mitbringsel: "Bier" }];
  assert.deepEqual(sortEntries(rows).map(row => row.id), ["2", "1", "3"]);
  assert.equal(rows[0].id, "3");
});

test("all rows are sent in one insert, using only publishable key", async () => {
  const calls = [];
  const api = createApi(config, async (...args) => { calls.push(args); return response([entry, entry]); });
  await api.insert([entry, entry]);
  assert.equal(calls.length, 1);
  assert.equal(calls[0][1].method, "POST");
  assert.deepEqual(JSON.parse(calls[0][1].body), [entry, entry]);
  assert.equal(calls[0][1].headers.apikey, config.publishableKey);
  assert.equal(calls[0][1].headers.Authorization, undefined);
});

test("updates and deletes target the UUID and never overwrite it", async () => {
  const calls = [];
  const api = createApi(config, async (...args) => { calls.push(args); return response([{ id, ...entry }]); });
  await api.update(id, { ...entry, id: "other" });
  await api.remove(id);
  assert.equal(calls[0][0], `https://test.supabase.co/rest/v1/mitbringsel?id=eq.${id}`);
  assert.equal(calls[0][1].method, "PATCH");
  assert.deepEqual(JSON.parse(calls[0][1].body), entry);
  assert.equal(calls[1][1].method, "DELETE");
  await assert.rejects(api.remove("bad&nutzer=eq.Alex"), /ungültig/);
});

test("configuration, network failures, server errors and removed rows do not report success", async () => {
  let calls = 0;
  await assert.rejects(createApi({ supabaseUrl: "", publishableKey: "" }, async () => { calls++; }).list(), /noch nicht eingerichtet/);
  await assert.rejects(createApi({ ...config, publishableKey: "sb_secret_test" }).list(), /noch nicht eingerichtet/);
  assert.equal(calls, 0);
  await assert.rejects(createApi(config, async () => { throw new TypeError("offline"); }).insert([entry]), /Eingaben bleiben erhalten/);
  await assert.rejects(createApi(config, async () => new Response("error", { status: 403 })).list(), /nicht abgeschlossen/);
  await assert.rejects(createApi(config, async () => response([])).update(id, entry), /inzwischen gelöscht/);
});
