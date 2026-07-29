/**
 * Utilitário para converter um File em base64 e enviar
 * para a API /api/extract-orders-pdf como JSON.
 *
 * A API espera: { fileBase64: string, mimeType: string }
 * NÃO use FormData — o bodyParser da Vercel não lê multipart/form-data.
 */
export async function uploadPdfAsBase64(
  file: File,
  apiUrl = "/api/extract-orders-pdf"
): Promise<any> {
  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove o prefixo data:<mime>;base64,
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileBase64: base64,
      mimeType: file.type || "application/pdf",
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(
      err?.error || `Erro ${response.status} ao processar o PDF`
    );
  }

  return response.json();
}
