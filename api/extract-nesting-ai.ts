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
      partName:       { type: Type.STRING },
      size:           { type: Type.STRING },
      totalQuantity:  { type: Type.INTEGER },
      thumbnailBase64:{ type: Type.STRING },
    },
    required: ['partName', 'totalQuantity'],
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = req.body ?? {};
    const { fileBase64, mimeType, pdfText } = body;

    if (!fileBase64 && !pdfText) {
      return res.status(400).json({ error: 'fileBase64 ou pdfText é obrigatório' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY não configurada nas variáveis de ambiente da Vercel' });
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `Você é um leitor especialista em arquivos e planos de nesting de corte a laser (ex: SigmaNEST, Lantek, Pronest).
Analise o arquivo ou imagem enviado e extraia a tabela de peças (itens de nesting).
Ignore as chapas inteiras ("Plates", "Chapas", "Sobras de chapa") e extraia apenas as peças ("Parts", "Sub-peças", "Peças cortadas").
Para cada item do nesting, extraia:
1. "partName": nome do item ou código da peça.
2. "size": dimensões/tamanho da peça. Se não encontrar, retorne "-".
3. "totalQuantity": quantidade total de peças (inteiro maior que 0).
4. "thumbnailBase64" (Opcional): SVG simplificado da geometria da peça como Data URI. Retorne null se não conseguir.`;

    const parts: any[] = [{ text: prompt }];

    if (fileBase64) {
      parts.unshift({
        inlineData: {
          data: fileBase64,
          mimeType: mimeType || 'application/pdf',
        },
      });
    } else if (pdfText) {
      parts[0].text = `${prompt}\n\nTexto extraído do arquivo:\n"""\n${pdfText}\n"""`;
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
    console.error('[extract-nesting-ai] Erro:', error);
    return res.status(500).json({
      error: 'Erro ao processar plano de nesting',
      details: error.message,
    });
  }
}
