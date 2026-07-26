import assert from "node:assert/strict";
import test from "node:test";
import { simplifyDebts } from "./debt.js";

test("simplifies group balances into fewer transfers", () => {
  const result = simplifyDebts([
    { userId: "andi", name: "Andi", balance: -120000 },
    { userId: "budi", name: "Budi", balance: -50000 },
    { userId: "rey", name: "Rey", balance: 170000 }
  ]);
  assert.deepEqual(result, [
    { fromUserId: "andi", fromName: "Andi", toUserId: "rey", toName: "Rey", amount: "120000.00" },
    { fromUserId: "budi", fromName: "Budi", toUserId: "rey", toName: "Rey", amount: "50000.00" }
  ]);
});
