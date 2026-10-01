import assert from "node:assert/strict";
import test from "node:test";
import {
  buildLabelPackagePlans,
  getRegisteredPackageType,
  PACKAGE_TYPE_OPTIONS,
} from "../src/utils/labelPackagingUtils";

test("etiquetas usam saco em volumes regulares e irregulares sem alterar as quantidades", () => {
  const plans = buildLabelPackagePlans({
    packageType: "Saco",
    packagesConfig: [{ boxes: 2, itemsPerBox: 100 }, { boxes: 1, itemsPerBox: 25 }],
  }, 225);

  assert.deepEqual(plans.map((plan) => plan.packageType), ["Saco", "Saco", "Saco"]);
  assert.deepEqual(plans.map((plan) => plan.quantity), [100, 100, 25]);
  assert.deepEqual(plans.map((plan) => plan.boxIndexOverride), [1, 2, 3]);
  assert.deepEqual(plans.map((plan) => plan.totalBoxesOverride), [3, 3, 3]);
  assert.equal(plans.every((plan) => plan.splitQuantityMode === "fixed"), true);
});

test("todos os tipos do lançamento são reconhecidos pela prévia de etiquetas", () => {
  for (const packageType of PACKAGE_TYPE_OPTIONS) {
    const plans = buildLabelPackagePlans({ packageType }, 80);
    assert.deepEqual(plans, [{ quantity: 80, packageType, splitQuantityMode: "divide" }]);
  }
});

test("produto em embalagem própria continua avulso mesmo com configuração de volumes", () => {
  const plans = buildLabelPackagePlans({
    packageType: "Avulso",
    packagesConfig: [{ boxes: 1, itemsPerBox: 80 }],
  }, 80);
  assert.equal(plans[0].packageType, "Avulso");
  assert.equal(plans[0].quantity, 80);
});

test("unidades antigas de sacos e caixas permitem recuperar o tipo registrado", () => {
  assert.equal(getRegisteredPackageType({ measurementUnit: "SACOS" }), "Saco");
  assert.equal(getRegisteredPackageType({ measurementUnit: "CAIXAS" }), "Caixa");
  assert.equal(getRegisteredPackageType({ packageType: "Rolo", measurementUnit: "CAIXAS" }), "Rolo");
});

test("registros antigos sem tipo não recebem caixa por suposição", () => {
  for (const measurementUnit of [undefined, "PÇS", "KG"] as const) {
    const plans = buildLabelPackagePlans({
      measurementUnit,
      packagesConfig: [{ boxes: 1, itemsPerBox: 50 }],
    }, 50);
    assert.equal(plans[0].packageType, "Não informado");
  }
  assert.equal(buildLabelPackagePlans({}, 50)[0].packageType, "Não informado");
});
