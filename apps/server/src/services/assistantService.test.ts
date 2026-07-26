import assert from "node:assert/strict";
import test from "node:test";
import { isSpendingDecisionQuestion, parseAssistantAmount } from "./assistantService.js";

test("reads informal Indonesian amounts in affordability questions", () => {
  assert.equal(parseAssistantAmount("Boleh beli sepatu 1 juta?"), 1_000_000);
  assert.equal(parseAssistantAmount("aman gak kalau nonton konser 750rb"), 750_000);
  assert.equal(parseAssistantAmount("bisa beli laptop Rp 12,5 jt?"), 12_500_000);
});

test("reads English million and billion units", () => {
  assert.equal(parseAssistantAmount("Can I afford shoes for 1 million?"), 1_000_000);
  assert.equal(parseAssistantAmount("Can I buy a house for 1.5 billion?"), 1_500_000_000);
});

test("reads grouped rupiah amounts without multiplying them again", () => {
  assert.equal(parseAssistantAmount("boleh belanja 1.250.000?"), 1_250_000);
  assert.equal(parseAssistantAmount("can I afford shoes for 850,000"), 850_000);
});

test("does not invent an amount when the user did not provide one", () => {
  assert.equal(parseAssistantAmount("boleh beli sepatu?"), null);
});

test("recognizes flexible Indonesian spending-decision sentences", () => {
  assert.equal(isSpendingDecisionQuestion("boleh nonton konser 250rb?"), true);
  assert.equal(isSpendingDecisionQuestion("boleh pesan tiket pesawa 1jt"), true);
  assert.equal(isSpendingDecisionQuestion("saya ingin beli tas 2jt"), true);
  assert.equal(isSpendingDecisionQuestion("aku mau booking hotel 750rb"), true);
});

test("does not confuse financial information requests with purchase plans", () => {
  assert.equal(isSpendingDecisionQuestion("saya ingin tahu pengeluaran bulan ini"), false);
  assert.equal(isSpendingDecisionQuestion("berapa pengeluaran saya 2 bulan terakhir?"), false);
});
