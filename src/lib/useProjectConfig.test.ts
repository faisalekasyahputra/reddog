import assert from "node:assert/strict";
import test from "node:test";
import { getBuyUrl } from "./useProjectConfig";

test("getBuyUrl follows the buy_platform rules", () => {
  assert.equal(getBuyUrl(null), null);
  assert.equal(getBuyUrl({ buy_platform: "", contract_address: "abc" }), null);
  assert.equal(getBuyUrl({ buy_platform: "pumpfun", contract_address: "" }), null);
  assert.equal(getBuyUrl({ buy_platform: "pumpfun", contract_address: "abc" }), "https://pump.fun/coin/abc");
  assert.equal(getBuyUrl({ buy_platform: "jup", contract_address: "abc" }), "https://jup.ag/swap/SOL-abc");
  assert.equal(getBuyUrl({ buy_platform: "unknown", contract_address: "abc" }), null);
});
