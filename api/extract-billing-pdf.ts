import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

export const config = {
  maxDuration: 60,
  api: {
    bodyParser: {
      sizeLimit: '20mb',
    },
  },
};

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    items: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          orderCode:    { type: Type.STRING },
          customerName: { type: Type.STRING },
          partName:     { type: Type.STRING },
          quantity:     { type: Type.NUMBER },
          billingDate:  { type: Type.STRING },
        },
        required: ['partName', 'quantity'],
      },
    },
  },
  required: ['items'],
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body ?? {};
    const { pdfText, fileBase64, mimeType } = body;

    if (!pdfText && !fileBase64) {
      return res.status(400).json({ error: 'pdfText ou fileBase64 é obrigatório' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY não configurada nas variáveis de ambiente da Vercel' });
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `Você é um assistente de PCP/Vendas especializado em extração de dados de faturamento/notas fiscais em formato PDF.
Interprete o texto bruto abaixo, que contém um ou múltiplos relatórios de faturamento, e extraia os itens que foram faturados.

Texto extraído:
"""
${pdfText || '[Arquivo PDF enviado diretamente]'}
"""

Instruções cruciais de Extração e Regras de Negócio:
Para cada item / produto faturado encontrado, extraia:
1. 'orderCode' (NÚMERO DO PEDIDO de venda associado a esse faturamento). OBRIGATÓRIO se houver.
2. 'customerName' (Nome / Razão Social do cliente). OBRIGATÓRIO se houver.
3. 'partName' (Código ou Descrição do produto faturado).
4. 'quantity' (Quantidade faturada do produto).
5. 'billingDate' (Data de faturamento em YYYY-MM-DD, se referenciada).

Retorne SOMENTE um OBJETO JSON estritamente dentro do request Schema. Não retorne mais nada além do JSON.`;

    const parts: any[] = [{ text: prompt }];

    if (fileBase64) {
      parts.unshift({
        inlineData: {
          data: fileBase64,
          mimeType: mimeType || 'application/pdf',
        },
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ role: 'user', parts }],
      config: {
        responseMimeType: 'application/json',
        responseSchema,
      },
    });

    const text = response.text ?? '';
    const data = JSON.parse(text);
    return res.status(200).json(data);

  } catch (error: any) {
    console.error('[extract-billing-pdf] Erro:', error);
    return res.status(500).json({
      error: 'Erro ao processar PDF de faturamento',
      details: error.message,
    });
  }
}
