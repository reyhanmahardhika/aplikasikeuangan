import assert from "node:assert/strict";
import test from "node:test";
import { answerProductKnowledge } from "./productKnowledgeService.js";

test("answers Indonesian product how-to questions with a relevant action", () => {
  const reply = answerProductKnowledge("Bagaimana cara tambah akun dengan saldo nol?", "id");
  assert.ok(reply);
  assert.match(reply.answer, /Buka Atur lalu pilih Akun/);
  assert.equal(reply.actions?.[0].view, "manage");
});

test("answers English feature troubleshooting in English", () => {
  const reply = answerProductKnowledge("Why are push notifications not appearing?", "en");
  assert.ok(reply);
  assert.match(reply.answer, /Enable notifications/);
  assert.doesNotMatch(reply.answer, /Pastikan|notifikasi tidak/i);
});

test("provides a product overview for general feature questions", () => {
  const reply = answerProductKnowledge("Bagaimana cara menggunakan fitur aplikasi?", "id");
  assert.ok(reply);
  assert.match(reply.answer, /pencatatan transaksi berbantuan AI/);
  assert.ok(reply.suggestions.length >= 3);
});

test("does not intercept financial analysis questions", () => {
  assert.equal(answerProductKnowledge("Budget mana yang hampir habis?", "id"), null);
  assert.equal(answerProductKnowledge("Can I afford shoes for 1 million?", "en"), null);
});
