import test from "node:test";
import assert from "node:assert/strict";
import { inferMerchant, parseFeeAmount } from "./manualTransactionParser.js";

test("keeps the full merchant name after an Indonesian location preposition", () => {
  assert.equal(inferMerchant("makan di sarune cafe 230rb cash", "230rb", "Tunai"), "Sarune Cafe");
});

test("keeps the salary period as the complete income source", () => {
  assert.equal(inferMerchant("Gaji bulan juli 10jt bca", "10jt", "BCA"), "Gaji Bulan Juli");
});

test("reads admin shorthand as a separate fee", () => {
  assert.equal(parseFeeAmount("beli kopi 25k admin 2k")?.amount, "2000.00");
});

test("reads an Indonesian administration fee", () => {
  assert.equal(parseFeeAmount("bayar tagihan 100rb biaya administrasi Rp 2.500")?.amount, "2500.00");
});
