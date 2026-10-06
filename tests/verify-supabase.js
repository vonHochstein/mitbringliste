// Live smoke test: creates only uniquely marked test rows and removes them afterwards.
import assert from "node:assert/strict";
import { config } from "../config.js";
import { createApi } from "../core.js";
import { randomUUID } from "node:crypto";

const api = createApi(config);
if (!api.configured) throw new Error("Set up config.js before running the live smoke test.");
const marker = `TEST-${randomUUID()}`;
const rows = [
  { id: randomUUID(), nutzer: marker, mitbringsel: "Test Wasser", anzahl: "2 Flaschen" },
  { id: randomUUID(), nutzer: marker, mitbringsel: "Test Brot", anzahl: "1 Laib" },
];
const invalidRows = [
  { id: randomUUID(), nutzer: marker, mitbringsel: "Atomic test", anzahl: "1" },
  { id: randomUUID(), nutzer: marker, mitbringsel: "Invalid test", anzahl: "\t" },
];
try {
  await api.list();
  console.log("PASS: public read");
  const inserted = await api.insert(rows);
  assert.equal(inserted.length, 2);
  assert.equal((await api.list()).filter(row => rows.some(testRow => testRow.id === row.id)).length, 2);
  console.log("PASS: batch insert and independently read persisted rows");
  await api.update(rows[0].id, { ...rows[0], anzahl: "3 Flaschen" });
  assert.equal((await api.list()).find(row => row.id === rows[0].id).anzahl, "3 Flaschen");
  console.log("PASS: public update by UUID");
  await assert.rejects(api.insert(invalidRows));
  assert.equal((await api.list()).filter(row => invalidRows.some(testRow => testRow.id === row.id)).length, 0);
  console.log("PASS: database validation and atomic insert failure");
  await api.remove(rows[0].id);
  assert.equal((await api.list()).some(row => row.id === rows[0].id), false);
  console.log("PASS: public delete by UUID");
} finally {
  for (const row of [...rows, ...invalidRows]) await api.remove(row.id);
  assert.equal((await api.list()).some(row => row.nutzer === marker), false);
  console.log("PASS: disposable test data removed");
}
