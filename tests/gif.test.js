import test from "node:test";
import assert from "node:assert/strict";
import { prepareSinglePlayGif } from "../gif.js";

// Three 2 × 2 colour frames with 100, 200 and 300 ms delays; endless repeat.
const fixture = Buffer.from("R0lGODlhAgACAIEAAP///wAAAAAAAAAAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQACgAAACwAAAAAAgACAAAIBgABCAQQEAAh+QQBFAABACwAAAAAAgACAIGAgIAAAAAAAAAAAAAIBgABCAQQEAAh+QQBHgABACwAAAAAAgACAIEAgAAAAAAAAAAAAAAIBgABCAQQEAA7", "base64");

test("single playback keeps all frames and delays and removes repeat metadata", async () => {
  const { blob, duration } = prepareSinglePlayGif(fixture);
  assert.equal(duration, 600);
  const result = Buffer.from(await blob.arrayBuffer());
  const marker = fixture.indexOf("NETSCAPE2.0") - 3;
  assert.notEqual(marker, -4);
  assert.deepEqual(result, Buffer.concat([fixture.subarray(0, marker), fixture.subarray(marker + 19)]));
});

test("invalid and truncated GIFs fail safely", () => {
  assert.throws(() => prepareSinglePlayGif(new Uint8Array(15)));
  assert.throws(() => prepareSinglePlayGif(fixture.subarray(0, fixture.length - 1)));
});
