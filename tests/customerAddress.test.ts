import assert from "node:assert/strict";
import test from "node:test";
import {
  formatCustomerFullAddress,
  formatPostalCodeInput,
  lookupAddressByPostalCode,
  normalizePostalCode,
  parseCustomerCityState,
} from "../src/utils/customerAddress";

test("legacy city and state addresses remain readable", () => {
  assert.deepEqual(parseCustomerCityState({ address: "Ubá - MG" }), {
    city: "Ubá",
    state: "MG",
  });
  assert.equal(formatCustomerFullAddress({ address: "Ubá - MG" }), "Ubá/MG");
});

test("full customer address includes street, number, neighborhood, city, state and CEP", () => {
  assert.equal(
    formatCustomerFullAddress({
      street: "Rua XV de Novembro",
      number: "123",
      complement: "Sala 2",
      neighborhood: "Centro",
      city: "Ubá",
      state: "MG",
      postalCode: "36500000",
      address: "Ubá - MG",
    }),
    "Rua XV de Novembro, 123 — Sala 2 | Centro · Ubá/MG | CEP 36500-000",
  );
});

test("CEP input formatting strips non-digits and keeps at most eight digits", () => {
  assert.equal(normalizePostalCode("36.500-000"), "36500000");
  assert.equal(formatPostalCodeInput("3650000099"), "36500-000");
});

test("CEP lookup rejects values that do not contain eight digits", async () => {
  await assert.rejects(lookupAddressByPostalCode("36500"), /CEP válido com 8 dígitos/);
});
