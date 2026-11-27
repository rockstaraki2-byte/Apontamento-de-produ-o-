import React, { useState } from "react";
import { auth } from "./firebase";
import type { User } from "./types";

export default function TemporaryInvoiceApiScreen({ currentUser }: { currentUser: User }) {
  const [manifestText, setManifestText] = useState("");
  const [resultText, setResultText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (currentUser.tenantId !== "imperio" || currentUser.role !== "GERENCIA") {
    return <div className="p-6 text-red-700">Acesso restrito.</div>;
  }

  async function send(action: "inspect" | "apply") {
    setBusy(true);
    setError("");
    setResultText("");
    try {
      const manifest = JSON.parse(manifestText);
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Sessão autenticada indisponível.");
      const response = await fetch("/api/temp-invoice", {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action, manifest }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Falha na API.");
      setResultText(JSON.stringify(data, null, 2));
    } catch (cause: any) {
      setError(cause?.message || "Erro ao processar a requisição.");
    } finally {
      setBusy(false);
    }
  }

  async function loadFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setManifestText(await file.text());
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8 text-slate-900">
      <section className="mx-auto max-w-5xl space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h1 className="text-xl font-bold">Conciliação temporária de faturamento</h1>
          <p className="mt-1 text-sm text-slate-600">
            API autenticada; tenant imperio. O conteúdo enviado não fica no código da aplicação.
          </p>
        </div>
        <label className="block text-sm font-medium">
          Manifesto JSON do PDF
          <input
            className="mt-2 block w-full text-sm"
            type="file"
            accept=".json,application/json"
            onChange={loadFile}
          />
        </label>
        <textarea
          className="min-h-64 w-full rounded border border-slate-300 p-3 font-mono text-xs"
          value={manifestText}
          onChange={(event) => setManifestText(event.target.value)}
          placeholder="Selecione o manifesto JSON ou cole o conteúdo"
          aria-label="Manifesto JSON"
        />
        <div className="flex flex-wrap gap-3">
          <button
            className="rounded bg-slate-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            disabled={busy || !manifestText}
            onClick={() => send("inspect")}
          >
            Consultar pedidos, produtos e histórico
          </button>
          <button
            className="rounded bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            disabled={busy || !manifestText}
            onClick={() => send("apply")}
          >
            Gravar faturamentos no Firestore
          </button>
        </div>
        {busy && <p className="text-sm text-slate-600">Processando pela API autenticada…</p>}
        {error && <pre className="whitespace-pre-wrap rounded bg-red-50 p-3 text-sm text-red-700">{error}</pre>}
        {resultText && <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap rounded bg-slate-950 p-4 text-xs text-slate-100">{resultText}</pre>}
      </section>
    </main>
  );
}