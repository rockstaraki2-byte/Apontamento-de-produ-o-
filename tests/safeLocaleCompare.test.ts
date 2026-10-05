import assert from "node:assert/strict";
import test from "node:test";
import { compareSafeLocaleText } from "../src/utils/safeLocaleCompare";

test("compareSafeLocaleText handles missing and non-string legacy values", () => {
  assert.ok(compareSafeLocaleText(undefined, "Azul") < 0);
  assert.ok(compareSafeLocaleText(null, "Azul") < 0);
  assert.ok(compareSafeLocaleText(12, "2", { numeric: true }) > 0);
  assert.equal(compareSafeLocaleText("", undefined), 0);
});

test("compareSafeLocaleText keeps numeric code ordering", () => {
  assert.ok(compareSafeLocaleText("2", "10", { numeric: true }) < 0);
});
