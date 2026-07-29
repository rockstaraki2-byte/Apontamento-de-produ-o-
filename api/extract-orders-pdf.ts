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
      orderCode:         { type: Type.STRING },
      customerCode:      { type: Type.STRING },
      customerName:      { type: Type.STRING },
      representativeName:{ type: Type.STRING },
      paymentCondition:  { type: Type.STRING },
      paymentTerm:       { type: Type.STRING },
      emissionDate:      { type: Type.STRING },
      deliveryDate:      { type: Type.STRING },
      totalValue:        { type: Type.NUMBER },
      totalGrossValue:   { type: Type.NUMBER },
      orderStatus: {
        type: Type.STRING,
        enum: ['AGUARDANDO_APROVACAO', 'PENDENTE', 'EM_PRODUCAO'],
      },
      statusOriginalPdf: { type: Type.STRING },
      items: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            itemCode:  { type: Type.STRING },
            itemName:  { type: Type.STRING },
            unit:      { type: Type.STRING },
            quantity:  { type: Type.NUMBER },
            unitPrice: { type: Type.NUMBER },
            totalPrice:{ type: Type.NUMBER },
            color:     { type: Type.STRING },
            size:      { type: Type.STRING },
          },
          required: ['itemCode', 'itemName', 'quantity', 'unitPrice', 'totalPrice'],
        },
      },
    },
    required: ['orderCode', 'customerName', 'items'],
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { pdfText, fileBase64, mimeType } = req.body;

    if (!pdfText && !fileBase64) {
      return res.status(400).json({ error: 'pdfText ou fileBase64 é obrigatório' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY não configurada nas variáveis de ambiente da Vercel' });
    }

    const ai = new GoogleGenAI({ apiKey });

    const prompt = `Você é um assistente de PCP/Vendas especializado em extração de dados de pedidos de venda e orçamentos em formato PDF.
Interprete o texto bruto abaixo, que pode ser o conteúdo de um ou múltiplos documentos juntos, e extraia todas as informações dos pedidos contidos neles.

Texto extraído:
"""
${pdfText || '[Arquivo PDF enviado diretamente]'}
"""

Instruções cruciais de Extração e Regras de Negócio:
1. NÚMERO DO PEDIDO: Extraia e guarde em 'orderCode'. Se não houver, gere um padrão com base na data atual ou sequencial.
2. CLIENTE:
   - Extraia o código do cliente (se houver) e guarde em 'customerCode'.
   - Extraia a razão social completa do cliente comprador e guarde em 'customerName'.
3. REPRESENTANTE: O campo "Consultor" ou vendedor no PDF equivale ao representante. Extraia seu nome e guarde em 'representativeName'.
4. SITUAÇÃO / FORMA DE PAGAMENTO: O campo "SITUAÇÃO" ou "situação" ou "Forma de Pagamento" equivale à condição de pagamento do pedido. Mapeie este valor para 'paymentCondition'.
5. PRAZOS DE PAGAMENTO: Extraia do campo "Prazos" ou "Condição de Pgto" de faturamento e guarde em 'paymentTerm'.
6. DATA DE EMISSÃO: Extraia a data de emissão do pedido e guarde em 'emissionDate' no formato YYYY-MM-DD.
7. DATA DE ENTREGA: Analise os campos "Prom.Ent." (Promessa de Entrega) e "Previsão" no PDF. A regra consistente adotada é: prefira a data de "Prom.Ent." por ser uma promessa firme; caso esteja em branco ou inválida, use a data de "Previsão". Preencha 'deliveryDate' no formato YYYY-MM-DD.
8. VALOR TOTAL DO PEDIDO: Use a regra consistente de preferir o "Total Líquido" ou "Total Geral" (valor final descontado que o cliente paga) e guarde em 'totalValue'. Guarde também o "Total Bruto" em 'totalGrossValue'.
9. STATUS DO PEDIDO: Mapeie o status do pedido obtido do texto para uma das seguintes chaves padrão:
   - "AGUARDANDO_APROVACAO" (caso seja orçamento, rascunho ou aguardando aprovação financeira/comercial)
   - "PENDENTE" (pedido firme, aprovado, pronto para faturamento, programado ou pendente de produção)
   - "EM_PRODUCAO" (se indicar explicitamente estar em andamento produtivo ou corte)
   Como padrão geral caso não esteja especificado, utilize "AGUARDANDO_APROVACAO".
10. STATUS ORIGINAL NO PDF: Procure e extraia o campo bruto que indica o status ou situação do documento. Guarde esse texto original EXATAMENTE como encontrado no campo "statusOriginalPdf".
11. ITENS DO PEDIDO: Para cada item listado no pedido extraia: itemCode, itemName, unit, quantity, unitPrice, totalPrice, color, size.

Retorne obrigatoriamente um array de pedidos de acordo com o esquema JSON especificado.`;

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
    console.error('[extract-orders-pdf] Erro:', error);
    return res.status(500).json({
      error: 'Erro ao processar PDF de pedidos',
      details: error.message,
    });
  }
}
