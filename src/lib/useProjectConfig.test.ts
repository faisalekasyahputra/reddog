import assert from "node:assert/strict";
import test from "node:test";
import { getBuyUrl } from "./useProjectConfig";

test("getBuyUrl points at the PONS launchpad for the configured CA", () => {
  assert.equal(getBuyUrl(null), null);
  assert.equal(getBuyUrl({ contract_address: "" }), null);
  assert.equal(getBuyUrl({ contract_address: "abc" }), "https://ponsfamily.com/launchpad/abc");
});
