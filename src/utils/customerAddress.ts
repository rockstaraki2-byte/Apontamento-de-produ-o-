import type { Customer } from "../types";
import { findCustomerForOrder } from "../searchUtils";

export type CustomerAddressDraft = {
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  postalCode: string;
};

export type ViaCepAddress = {
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
};

export function emptyCustomerAddressDraft(): CustomerAddressDraft {
  return {
    street: "",
    number: "",
    complement: "",
    neighborhood: "",
    city: "",
    state: "",
    postalCode: "",
  };
}

export function normalizePostalCode(value: string): string {
  return String(value || "").replace(/\D/g, "").slice(0, 8);
}

export function formatPostalCodeInput(value: string): string {
  const digits = normalizePostalCode(value);
  return digits.length > 5 ? `${digits.slice(0, 5)}-${digits.slice(5)}` : digits;
}

function parseLegacyCityState(address: string) {
  const parts = address.split(" - ");
  if (parts.length !== 2 || !/^[A-Za-z]{2}$/.test(parts[1].trim())) return null;
  return { city: parts[0].trim(), state: parts[1].trim().toUpperCase() };
}

export function parseCustomerCityState(customer: Partial<Customer>) {
  const legacy = parseLegacyCityState(String(customer.address || "").trim());
  return {
    city: String(customer.city || legacy?.city || "").trim(),
    state: String(customer.state || customer.uf || legacy?.state || "").trim().toUpperCase(),
  };
}

export function formatCustomerFullAddress(customer: Partial<Customer>): string {
  const legacyAddress = String(customer.address || "").trim();
  const { city, state } = parseCustomerCityState(customer);
  const street = String(customer.street || "").trim();
  const number = String(customer.number || "").trim();
  const complement = String(customer.complement || "").trim();
  const neighborhood = String(customer.neighborhood || customer.bairro || "").trim();
  const postalCode = formatPostalCodeInput(String(customer.postalCode || "").trim());

  const streetLine = [street, number].filter(Boolean).join(", ");
  const addressLine = [streetLine, complement].filter(Boolean).join(" — ") ||
    (!parseLegacyCityState(legacyAddress) ? legacyAddress : "");
  const cityState = city && state ? `${city}/${state}` : city || state;
  const locality = [neighborhood, cityState].filter(Boolean).join(" · ");

  return [addressLine, locality, postalCode ? `CEP ${postalCode}` : ""]
    .filter(Boolean)
    .join(" | ");
}

export function getCustomerAddressForLabel(
  customerName: string,
  customers: Customer[],
): string {
  const normalizedName = String(customerName || "").trim();
  if (!normalizedName || normalizedName === "-" || normalizedName.includes(" / ")) {
    return "";
  }

  const customer = findCustomerForOrder(
    { customerName: normalizedName },
    customers,
  ) as Customer | null;

  return customer ? formatCustomerFullAddress(customer) : "";
}

export function lookupAddressByPostalCode(value: string): Promise<ViaCepAddress> {
  const postalCode = normalizePostalCode(value);
  if (postalCode.length !== 8) {
    return Promise.reject(new Error("Informe um CEP válido com 8 dígitos."));
  }

  return new Promise((resolve, reject) => {
    const callbackName = `__apontaproCep_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement("script");
    let timeoutId: number | undefined;
    let settled = false;
    const browserWindow = window as unknown as Record<string, unknown>;

    const cleanup = () => {
      if (timeoutId !== undefined) window.clearTimeout(timeoutId);
      delete browserWindow[callbackName];
      script.remove();
    };

    const fail = (message: string) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error(message));
    };

    browserWindow[callbackName] = (result: ViaCepAddress) => {
      if (settled) return;
      settled = true;
      cleanup();
      if (result?.erro) {
        reject(new Error("CEP não encontrado. Confira o número informado."));
        return;
      }
      resolve(result || {});
    };

    script.async = true;
    script.referrerPolicy = "no-referrer";
    script.onerror = () => fail("Não foi possível consultar o CEP agora. Preencha o endereço manualmente.");
    timeoutId = window.setTimeout(
      () => fail("A consulta do CEP demorou demais. Tente novamente ou preencha manualmente."),
      10000,
    );
    script.src = `https://viacep.com.br/ws/${postalCode}/json/?callback=${callbackName}`;
    document.head.appendChild(script);
  });
}
