import type { CustomerAddressDraft } from "../utils/customerAddress";
import { formatPostalCodeInput, normalizePostalCode } from "../utils/customerAddress";

interface CustomerAddressFieldsProps {
  draft: CustomerAddressDraft;
  onChange: (field: keyof CustomerAddressDraft, value: string) => void;
  onLookup: () => void;
  isLookingUp: boolean;
  isDisabled: boolean;
  lookupMessage: { text: string; success: boolean } | null;
  compact?: boolean;
}

export function CustomerAddressFields({
  draft,
  onChange,
  onLookup,
  isLookingUp,
  isDisabled,
  lookupMessage,
  compact = false,
}: CustomerAddressFieldsProps) {
  const inputClass = compact
    ? "w-full border border-blue-400 rounded px-2 py-1 text-[11px] outline-none focus:ring-1 focus:ring-blue-500"
    : "w-full border p-2 rounded text-sm focus:ring-1 focus:ring-indigo-500 outline-none";
  const labelClass = compact
    ? "text-[10px] font-semibold text-gray-700 block mb-0.5"
    : "text-xs font-semibold text-gray-700 block mb-1";
  const gapClass = compact ? "gap-1.5" : "gap-2";

  return (
    <div className={`flex flex-col ${compact ? "gap-2" : "gap-3 border-t border-gray-100 pt-3"}`}>
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <label className={labelClass}>CEP</label>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="postal-code"
            maxLength={9}
            placeholder="36500-000"
            value={draft.postalCode}
            onChange={(event) => onChange("postalCode", formatPostalCodeInput(event.target.value))}
            className={inputClass}
          />
        </div>
        <button
          type="button"
          onClick={onLookup}
          disabled={isDisabled || normalizePostalCode(draft.postalCode).length !== 8}
          className={`shrink-0 rounded border border-indigo-200 bg-indigo-50 font-bold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50 ${compact ? "px-2 py-1.5 text-[10px]" : "px-3 py-2 text-xs"}`}
        >
          {isLookingUp ? "Buscando…" : "Buscar CEP"}
        </button>
      </div>

      {lookupMessage && (
        <p className={`${compact ? "text-[10px]" : "text-[11px]"} ${lookupMessage.success ? "text-emerald-700" : "text-rose-600"}`}>
          {lookupMessage.text}
        </p>
      )}

      <div className={`grid grid-cols-3 ${gapClass}`}>
        <div className="col-span-2">
          <label className={labelClass}>Rua / Logradouro</label>
          <input
            type="text"
            autoComplete="address-line1"
            placeholder="Rua, avenida, estrada..."
            value={draft.street}
            onChange={(event) => onChange("street", event.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Número</label>
          <input
            type="text"
            autoComplete="address-line2"
            placeholder="Nº"
            value={draft.number}
            onChange={(event) => onChange("number", event.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className={`grid grid-cols-2 ${gapClass}`}>
        <div>
          <label className={labelClass}>Complemento</label>
          <input
            type="text"
            placeholder="Sala, bloco, referência..."
            value={draft.complement}
            onChange={(event) => onChange("complement", event.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Bairro</label>
          <input
            type="text"
            autoComplete="address-level3"
            placeholder="Bairro"
            value={draft.neighborhood}
            onChange={(event) => onChange("neighborhood", event.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className={`grid grid-cols-3 ${gapClass}`}>
        <div className="col-span-2">
          <label className={labelClass}>Cidade</label>
          <input
            type="text"
            autoComplete="address-level2"
            placeholder="Ex: Ubá"
            value={draft.city}
            onChange={(event) => onChange("city", event.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>UF</label>
          <input
            type="text"
            autoComplete="address-level1"
            maxLength={2}
            placeholder="MG"
            value={draft.state}
            onChange={(event) => onChange("state", event.target.value.toUpperCase())}
            className={`${inputClass} text-center uppercase`}
          />
        </div>
      </div>

      {!compact && (
        <p className="-mt-2 text-[10px] text-gray-400">
          A busca preenche rua, bairro, cidade e UF. O número deve ser informado manualmente.
        </p>
      )}
    </div>
  );
}
