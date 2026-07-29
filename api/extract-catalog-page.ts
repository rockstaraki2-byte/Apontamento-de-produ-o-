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
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      code: { type: Type.STRING },
      name: { type: Type.STRING },
      box2d: {
        type: Type.ARRAY,
        items: { type: Type.INTEGER },
      },
    },
    required: ['code', 'name'],
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body ?? {};
    const { fileBase64, mimeType } = body;

    if (!fileBase64) {
      return res.status(400).json({ error: 'fileBase64 é obrigatório' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY não configurada nas variáveis de ambiente da Vercel' });
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `Você é um assistente de extração de catálogos de produtos. O usuário forneceu uma página de um catálogo em formato de imagem.
Sua tarefa é identificar todos os produtos apresentados nesta página.
Para cada produto, extraia:
- 'code': O código do produto (SKU/referência).
- 'name': O nome ou descrição do produto.
- 'box2d': Coordenadas da caixa delimitadora APENAS DA IMAGEM/FOTO do produto: array [ymin, xmin, ymax, xmax] com valores inteiros entre 0 e 1000. Omita se não houver foto.

A caixa delimitadora deve englobar RIGOROSAMENTE apenas a foto ilustrativa, NÃO o texto ou código.

Retorne obrigatoriamente um array de produtos no formato JSON.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{
        role: 'user',
        parts: [
          { inlineData: { data: fileBase64, mimeType: mimeType || 'image/jpeg' } },
          { text: prompt },
        ],
      }],
      config: {
        responseMimeType: 'application/json',
        responseSchema,
      },
    });

    const text = response.text ?? '';
    const data = JSON.parse(text);
    return res.status(200).json(data);

  } catch (error: any) {
    console.error('[extract-catalog-page] Erro:', error);
    return res.status(500).json({
      error: 'Erro ao processar página de catálogo',
      details: error.message,
    });
  }
}
