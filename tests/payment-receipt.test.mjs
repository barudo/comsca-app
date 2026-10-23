import assert from "node:assert/strict";
import test from "node:test";
import { pesosInWords, receiptCents, receiptPayer, receiptParticular, voucherPayee } from "../src/lib/payment-receipt.ts";

test("receipt amounts preserve cents and spell out pesos", () => {
  assert.equal(pesosInWords(500000), "Five Thousand Pesos Only");
  assert.equal(pesosInWords(123456), "One Thousand Two Hundred Thirty Four Pesos and Fifty Six Centavos Only");
  assert.equal(pesosInWords(101), "One Peso and One Centavo Only");
  assert.equal(pesosInWords(0), "Zero Pesos Only");
  assert.equal(receiptCents("5000.25"), 500025);
  for (const value of [null, "", "invalid", -1, "1.234", Infinity]) assert.equal(receiptCents(value), null);
  assert.throws(() => pesosInWords(-1), /Invalid/);
});

test("receipt identifies payer without guessing when names are missing or ambiguous", () => {
  assert.equal(receiptPayer({ user: { first_name: "Ana", family_name: "Cruz" } }, []), "Ana Cruz");
  assert.equal(receiptPayer({}, [{ user_name: "Ana Cruz" }]), "Ana Cruz");
  assert.equal(receiptPayer({}, [{ user_name: "Ana" }, { user_name: "Juan" }]), "");
  assert.equal(receiptPayer({}, [{ user_id: 42 }]), "");
  assert.equal(receiptParticular({ description: "October shares", type: "BUY_SHARE" }), "October shares");
  assert.equal(receiptParticular({ type: "LOAN_PAYMENT" }), "Loan Payment");
});

test("vouchers use payee fields and never substitute the receipt payer", () => {
  assert.equal(voucherPayee({ payee_name: "Ana Cruz", payer_name: "Juan" }, []), "Ana Cruz");
  assert.equal(voucherPayee({ payee: { first_name: "Ana", family_name: "Cruz" } }, []), "Ana Cruz");
  assert.equal(voucherPayee({}, [{ user: { name: "Ana Cruz" } }]), "Ana Cruz");
  assert.equal(voucherPayee({}, [{ payee_name: "Ana" }, { payee_name: "Juan" }]), "");
  assert.equal(voucherPayee({ received_from: "Juan" }, []), "");
});
