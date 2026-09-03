import assert from "node:assert/strict";
import test from "node:test";
import { getBuyUrl } from "./useProjectConfig";

test("getBuyUrl points at the PONS launchpad for the configured CA", () => {
  assert.equal(getBuyUrl(null), null);
  assert.equal(getBuyUrl({ contract_address: "" }), null);
  assert.equal(getBuyUrl({ contract_address: "abc" }), "https://ponsfamily.com/launchpad/abc");
});

test("dexEmbedUrl only embeds dexscreener pair urls", async () => {
  const { dexEmbedUrl } = await import("./useProjectConfig");
  assert.equal(dexEmbedUrl(undefined), null);
  assert.equal(dexEmbedUrl("https://evil.example/x"), null);
  assert.equal(dexEmbedUrl("not a url"), null);
  assert.equal(
    dexEmbedUrl("https://dexscreener.com/solana/abc?utm=x"),
    "https://dexscreener.com/solana/abc?embed=1&theme=dark&info=0",
  );
});
