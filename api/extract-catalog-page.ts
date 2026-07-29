import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

export const config = {
  maxDuration: 60,
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
    const { fileBase64, mimeType } = req.body;

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
- 'box2d': As coordenadas da caixa delimitadora APENAS DA IMAGEM/FOTO espacial do produto correspondente.
 O formato deve ser um array com 4 números inteiros entre 0 e 1000 na seguinte ordem: [ymin, xmin, ymax, xmax].
 0,0 é o canto superior esquerdo e 1000,1000 é o canto inferior direito.
 Exemplo de box2d: [120, 300, 250, 450].
 Se o produto não possuir imagem/foto ilustrativa na página, omita este campo ou retorne nulo.

Atenção: A caixa delimitadora (box2d) deve englobar RIGOROSAMENTE apenas a foto ilustrativa do produto, e NÃO o texto da descrição ou o código.

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
