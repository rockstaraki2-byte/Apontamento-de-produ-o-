import * as Firebird from "node-firebird";
import type { Database } from "node-firebird";
import type { TekSystemEntityType } from "../api/_lib/teksystemSync.js";

type Row = Record<string, any>;
export async function readOnlyRows(db: Database, sql: string, params: unknown[] = []): Promise<Row[]> {
  const tx = await db.transactionAsync(Firebird.ISOLATION_READ_COMMITTED_READ_ONLY);
  try {
    const rows = await tx.queryAsync<Row>(sql, params);
    for (const row of rows) for (const [field, entry] of Object.entries(row)) if (typeof entry === "function") {
      row[field] = await new Promise<string>((resolve, reject) => entry(tx, (error: any, _name: any, stream: any) => {
        if (error) return reject(error);
        if (!stream) return resolve("");
        const chunks: Buffer[] = []; let bytes = 0;
        stream.on("data", (chunk: Buffer) => { bytes += chunk.length; if (bytes <= 256_000) chunks.push(chunk); });
        stream.on("error", reject);
        stream.on("end", () => {
          const data = Buffer.concat(chunks);
          try { resolve(new TextDecoder("utf-8", { fatal: true }).decode(data)); }
          catch { resolve(new TextDecoder("windows-1252").decode(data)); }
        });
      }));
    }
    await tx.commitAsync(); return rows;
  } catch (error: any) {
    await tx.rollbackAsync().catch(() => undefined);
    throw new Error(`Leitura ${sql.match(/\bFROM\s+([A-Z_]\w*)/i)?.[1] || "Firebird"}: ${error.message}`);
  }
}
const batches = <T>(values: T[], size = 400): T[][] => Array.from({ length: Math.ceil(values.length / size) }, (_, i) => values.slice(i * size, (i + 1) * size));
const placeholders = (values: unknown[]) => values.map(() => "?").join(", ");
const key = (v: unknown) => String(v ?? "").trim();
const ids = (rows: Row[], field: string) => [...new Set(rows.map((r) => key(r[field])).filter(Boolean))];
const baseCode = (code: string) => code.replace(/\..*$/, "");

export async function readCompleteEntities(
  db: Database, entities: TekSystemEntityType[], companies: number[], since?: Date,
  businessDate?: { value: string }, catalogSnapshot = false, customerSnapshot = false,
) {
  const result: Record<TekSystemEntityType, Row[]> = { clientes: [], produtos: [], pedidos: [], faturamentos: [], romaneios: [] };
  let orderCodes: string[] = [];
  if (entities.includes("pedidos") || entities.includes("romaneios")) {
    const companyClause = `d.EMPRESA_DOCFAT IN (${placeholders(companies)})`;
    if (businessDate && !entities.includes("pedidos")) {
      orderCodes = ids(await readOnlyRows(db, `
        SELECT DISTINCT det.DOCUMENTO_DOCITEMDET AS codigopedido
          FROM CARGA c JOIN CARGA_DOCUMENTOS cd ON cd.CARGA_CARDOC = c.CODIGO_CARGA
          JOIN CARGA_ITENS ci ON ci.AUTOINCCARDOC_CARITE = cd.AUTOINC_CARDOC
          JOIN DOCUMENTO_ITEM_DETALHE det ON det.AUTOINC_DOCITEMDET = ci.AUTOINCITEMDETDOC_CARITE
          JOIN DOCUMENTO_FATURA d ON d.CODIGO_DOCFAT = det.DOCUMENTO_DOCITEMDET
         WHERE ${companyClause} AND c.EMPRESA_CARGA IN (${placeholders(companies)})
           AND CAST(c.DTEMISSAO_CARGA AS DATE) = CAST(? AS DATE)`, [...companies, ...companies, businessDate.value]), "codigopedido");
    } else if (businessDate || !since) {
      orderCodes = ids(await readOnlyRows(db, `SELECT d.CODIGO_DOCFAT AS codigopedido
        FROM DOCUMENTO_FATURA d JOIN DOCUMENTO_PEDIDO p ON p.DOCUMENTO_DOCPED = d.CODIGO_DOCFAT
        WHERE ${companyClause}${businessDate ? " AND CAST(d.DTEMISSAO_DOCFAT AS DATE) = CAST(? AS DATE)" : ""}`,
      [...companies, ...(businessDate ? [businessDate.value] : [])]), "codigopedido");
    } else {
      // Candidate queries scan the changed tables once, then fetch every line of each affected order.
      const fragments = [
        { join: "", condition: "d.DATAHORAALTERACAO_DOCFAT >= ? OR d.DATAHORAINCLUSAO_DOCFAT >= ?", params: [since, since] },
        { join: "JOIN DOCUMENTO_PEDIDO p ON p.DOCUMENTO_DOCPED = d.CODIGO_DOCFAT", condition: "p.DATAHORAALTERACAO_DOCPED >= ?", params: [since] },
        { join: "JOIN DOCUMENTO_ITEM i ON i.DOCUMENTO_DOCITEM = d.CODIGO_DOCFAT", condition: "i.DATAHORAALTERACAO_DOCITEM >= ?", params: [since] },
        { join: "JOIN DOCUMENTO_ITEM_DETALHE det ON det.DOCUMENTO_DOCITEMDET = d.CODIGO_DOCFAT", condition: "det.DATAHORAALTERACAO_DOCITEMDET >= ?", params: [since] },
        { join: "JOIN DOCUMENTO_PRAZOS prazo ON prazo.DOCUMENTO_DOCPRAZO = d.CODIGO_DOCFAT", condition: "prazo.DATAHORAALTERACAO_DOCPRAZO >= ?", params: [since] },
        { join: "JOIN DOCUMENTO_PEDREPRESENTANTE rep ON rep.DOCUMENTO_DOCPEDREP = d.CODIGO_DOCFAT", condition: "rep.DATAHORAALTERACAO_DOCPEDREP >= ?", params: [since] },
        { join: `JOIN DOCUMENTO_ITEM_DETALHE det ON det.DOCUMENTO_DOCITEMDET = d.CODIGO_DOCFAT
                 JOIN CARGA_ITENS ci ON ci.AUTOINCITEMDETDOC_CARITE = det.AUTOINC_DOCITEMDET
                 JOIN CARGA_DOCUMENTOS cd ON cd.AUTOINC_CARDOC = ci.AUTOINCCARDOC_CARITE
                 JOIN CARGA c ON c.CODIGO_CARGA = cd.CARGA_CARDOC`,
          condition: `c.EMPRESA_CARGA IN (${placeholders(companies)}) AND (ci.DATAHORAALTERACAO_CARITE >= ? OR cd.DATAHORAALTERACAO_CARDOC >= ? OR c.DATAHORAALTERACAO_CARGA >= ? OR c.DATAHORALIB_FATURAMENTO_CARGA >= ?)`, params: [...companies, since, since, since, since] },
      ];
      orderCodes = ids(await readOnlyRows(db, fragments.map((f) => `SELECT d.CODIGO_DOCFAT AS codigopedido FROM DOCUMENTO_FATURA d ${f.join} WHERE ${companyClause} AND (${f.condition})`).join(" UNION "), fragments.flatMap((f) => [...companies, ...f.params])), "codigopedido");
    }
  }
  if (entities.includes("pedidos")) {
    const orderRows: Row[] = [];
    const paymentRows: Row[] = [];
    const representativeRows: Row[] = [];
    for (const codes of batches(orderCodes)) {
      orderRows.push(...await readOnlyRows(db, `
        SELECT d.CODIGO_DOCFAT AS codigopedido, d.EMPRESA_DOCFAT AS empresa,
          d.CLIENTE_DOCFAT AS cliente, cliente.RAZAOSOCIAL_PESSOA AS clientenome,
          cliente.NOMEFANTASIA_PESSOA AS clientenomefantasia, d.DTEMISSAO_DOCFAT AS emitidoem,
          d.STATUS_DOCFAT AS status, d.SITUACAO_DOCFAT AS situacao,
          sit.DESCRICAO_SITUACAO AS situacaodescricao, d.TRANSACAO_DOCFAT AS transacaovenda,
          d.OBSERVACAO_DOCFAT AS observacoes,
          p.TABELACONDICAO_DOCPED AS tabelacondicaopagamento,
          tc.DESCRICAO_TABELA_COND AS descricaocondicaopagamento,
          p.DTVENDA_DOCPED AS datavenda, p.DTPROMESSAENTREGA_DOCPED AS promessaentrega,
          p.DTPREVISAOFATURAMENTO_DOCPED AS previsaofaturamento,
          p.CONDICAOPRAZO_DOCPED AS condicaoprazo,
          p.MULTIPLASFORMASPAGTO_DOCPED AS multiplasformaspagamento,
          p.PAGAMENTOANTECIPADO_DOCPED AS pagamentoantecipado,
          i.AUTOINC_DOCITEM AS itemid, det.AUTOINC_DOCITEMDET AS detalheid,
          COALESCE(det.ITEM_DOCITEMDET, i.ITEM_DOCITEM) AS codigoitem,
          item.DESCRICAO_ITEM AS descricaoitem,
          COALESCE(det.COR_DOCITEMDET, i.COR_DOCITEM) AS cor,
          COALESCE(det.VARIACAO_DOCITEMDET, i.VARIACAO_DOCITEM) AS variacao,
          COALESCE(det.GRADE_DOCITEMDET, i.GRADE_DOCITEM) AS grade,
          cor.DESCRICAO_COR AS cordescricao, variacao.DESCRICAO_VARIACAO AS variacaodescricao,
          grade.GRADE_GRADE AS gradedescricao, acabamento.DESCRICAO_ACABAMENTO AS acabamentodescricao,
          COALESCE(det.QTDEPEDIDO_DOCITEMDET, i.QTDEPEDIDO_DOCITEM) AS quantidade,
          COALESCE(det.QTDEFATURADO_DOCITEMDET, i.QTDEFATURADO_DOCITEM) AS quantidadefaturada,
          COALESCE(det.QTDEABERTA_DOCITEMDET, i.QTDEABERTA_DOCITEM) AS quantidadeaberta,
          COALESCE(det.VLRUNITARIOBRUTO_DOCITEMDET, i.VLRUNITARIOBRUTO_DOCITEM) AS precounitariobruto,
          COALESCE(det.VLRUNITARIOLIQUIDO_DOCITEMDET, i.VLRUNITARIOLIQUIDO_DOCITEM) AS precounitario,
          COALESCE(det.VLRTOTALBRUTO_DOCITEMDET, i.VLRTOTALBRUTO_DOCITEM) AS valorbruto,
          COALESCE(det.VLRTOTALLIQUIDO_DOCITEMDET, i.VLRTOTALLIQUIDO_DOCITEM) AS valorliquido,
          i.FAMILIA_DOCITEM AS familiacodigo, familia.DESCRICAO_FAMILIA AS familiadescricao,
          det.NUMITEMPED_DOCITEMDET AS numeroitempedido,
          det.OBSERVACAO_DOCITEMDET AS observacoesitem, i.LOTEFABRICACAO_DOCITEM AS lotefabricacao,
          i.DATAHORAALTERACAO_DOCITEM AS itematualizadoem, det.DATAHORAALTERACAO_DOCITEMDET AS detalheatualizadoem,
          d.DATAHORAINCLUSAO_DOCFAT AS cadastradoem, d.DATAHORAALTERACAO_DOCFAT AS atualizadoem
        FROM DOCUMENTO_FATURA d JOIN DOCUMENTO_PEDIDO p ON p.DOCUMENTO_DOCPED = d.CODIGO_DOCFAT
        LEFT JOIN DOCUMENTO_ITEM i ON i.DOCUMENTO_DOCITEM = d.CODIGO_DOCFAT
        LEFT JOIN DOCUMENTO_ITEM_DETALHE det ON det.DOCUMENTO_DOCITEMDET = d.CODIGO_DOCFAT AND det.AUTOINCITEM_DOCITEMDET = i.AUTOINC_DOCITEM
        LEFT JOIN PESSOA cliente ON cliente.CODIGO_PESSOA = d.CLIENTE_DOCFAT
        LEFT JOIN SITUACAO sit ON sit.CODIGO_SITUACAO = d.SITUACAO_DOCFAT
        LEFT JOIN TABELA_CONDICAO tc ON tc.CODIGO_TABELA_COND = p.TABELACONDICAO_DOCPED
        LEFT JOIN ITEM item ON item.CODIGO_ITEM = COALESCE(det.ITEM_DOCITEMDET, i.ITEM_DOCITEM)
        LEFT JOIN FAMILIA familia ON familia.CODIGO_FAMILIA = i.FAMILIA_DOCITEM
        LEFT JOIN COR cor ON cor.CODIGO_COR = COALESCE(det.COR_DOCITEMDET, i.COR_DOCITEM)
        LEFT JOIN VARIACAO variacao ON variacao.CODIGO_VARIACAO = COALESCE(det.VARIACAO_DOCITEMDET, i.VARIACAO_DOCITEM)
        LEFT JOIN GRADE grade ON grade.AUTOINC_GRADE = COALESCE(det.GRADE_DOCITEMDET, i.GRADE_DOCITEM)
        LEFT JOIN ACABAMENTO acabamento ON acabamento.CODIGO_ACABAMENTO = COALESCE(det.ACABAMENTO_DOCITEMDET, i.ACABAMENTO_DOCITEM)
        WHERE d.EMPRESA_DOCFAT IN (${placeholders(companies)}) AND d.CODIGO_DOCFAT IN (${placeholders(codes)})
        ORDER BY d.CODIGO_DOCFAT, i.AUTOINC_DOCITEM, det.AUTOINC_DOCITEMDET`, [...companies, ...codes]));
      paymentRows.push(...await readOnlyRows(db, `SELECT prazo.DOCUMENTO_DOCPRAZO AS codigopedido,
        prazo.FORMAPAGTO_DOCPRAZO AS formapagamento, fp.DESCRICAO_FPAG AS formapagamentodescricao,
        prazo.PRAZODIAS_DOCPRAZO AS dias, prazo.VENCIMENTO_DOCPRAZO AS vencimento,
        prazo.VALOR_DOCPRAZO AS valor, prazo.PRINCIPAL_DOCPRAZO AS principal
        FROM DOCUMENTO_PRAZOS prazo LEFT JOIN FORMA_PAGAMENTO fp ON fp.CODIGO_FPAG = prazo.FORMAPAGTO_DOCPRAZO
        WHERE prazo.DOCUMENTO_DOCPRAZO IN (${placeholders(codes)})`, codes));
      representativeRows.push(...await readOnlyRows(db, `SELECT r.DOCUMENTO_DOCPEDREP AS codigopedido,
        r.PEDIDOREPRESENTANTE_DOCPEDREP AS codigo, p.RAZAOSOCIAL_PESSOA AS nome
        FROM DOCUMENTO_PEDREPRESENTANTE r LEFT JOIN PESSOA p ON p.CODIGO_PESSOA = r.PEDIDOREPRESENTANTE_DOCPEDREP
        WHERE r.DOCUMENTO_DOCPEDREP IN (${placeholders(codes)})`, codes));
    }
    result.pedidos = orderRows.map((r) => ({ ...r,
      prazos: paymentRows.filter((p) => key(p.codigopedido) === key(r.codigopedido)),
      representantes: representativeRows.filter((p) => key(p.codigopedido) === key(r.codigopedido)),
      externalId: `pedido:${r.codigopedido}:${r.detalheid || r.itemid || "cabecalho"}`,
    }));
  }
  if (entities.includes("romaneios")) {
    for (const codes of batches(orderCodes)) result.romaneios.push(...await readOnlyRows(db, `
      SELECT c.CODIGO_CARGA AS cargaid, c.EMPRESA_CARGA AS empresa, c.DESCRICAO_CARGA AS cargadescricao,
        c.DTEMISSAO_CARGA AS emitidoem, c.DATAHORALIB_FATURAMENTO_CARGA AS liberadofaturamentoem,
        c.USUARIOLIB_FATURAMENTO_CARGA AS liberadofaturamentopor, cd.AUTOINC_CARDOC AS cargadocumentoid,
        d.CODIGO_DOCFAT AS codigopedido, d.CLIENTE_DOCFAT AS clientecodigo,
        di.AUTOINC_DOCITEM AS itemid, det.AUTOINC_DOCITEMDET AS detalheid, ci.AUTOINC_CARITE AS cargaitemid,
        COALESCE(det.ITEM_DOCITEMDET, di.ITEM_DOCITEM) AS codigoitem, item.DESCRICAO_ITEM AS descricaoitem,
        COALESCE(det.COR_DOCITEMDET, di.COR_DOCITEM) AS cor,
        COALESCE(det.VARIACAO_DOCITEMDET, di.VARIACAO_DOCITEM) AS variacao,
        COALESCE(det.GRADE_DOCITEMDET, di.GRADE_DOCITEM) AS grade,
        COALESCE(det.QTDEPEDIDO_DOCITEMDET, di.QTDEPEDIDO_DOCITEM) AS quantidadepedido,
        ci.QTDECHAPAS_CARITE AS quantidadenoromaneio, ci.QTDEFATURADO_CARITE AS quantidadefaturada,
        ci.QTDEABERTA_CARITE AS quantidadeaberta, ci.FAMILIA_CARITE AS familiacodigo,
        familia.DESCRICAO_FAMILIA AS familia, ci.DATAHORAALTERACAO_CARITE AS atualizadoem
      FROM CARGA_ITENS ci JOIN CARGA_DOCUMENTOS cd ON cd.AUTOINC_CARDOC = ci.AUTOINCCARDOC_CARITE
      JOIN CARGA c ON c.CODIGO_CARGA = cd.CARGA_CARDOC
      JOIN DOCUMENTO_ITEM_DETALHE det ON det.AUTOINC_DOCITEMDET = ci.AUTOINCITEMDETDOC_CARITE
      JOIN DOCUMENTO_ITEM di ON di.AUTOINC_DOCITEM = det.AUTOINCITEM_DOCITEMDET
      JOIN DOCUMENTO_FATURA d ON d.CODIGO_DOCFAT = di.DOCUMENTO_DOCITEM
      LEFT JOIN ITEM item ON item.CODIGO_ITEM = COALESCE(det.ITEM_DOCITEMDET, di.ITEM_DOCITEM)
      LEFT JOIN FAMILIA familia ON familia.CODIGO_FAMILIA = ci.FAMILIA_CARITE
      WHERE c.EMPRESA_CARGA IN (${placeholders(companies)}) AND d.EMPRESA_DOCFAT IN (${placeholders(companies)})
        AND d.CODIGO_DOCFAT IN (${placeholders(codes)})`, [...companies, ...companies, ...codes]));
    result.romaneios = result.romaneios.map((r) => ({ ...r, externalId: `romaneio:${r.cargaid}:${r.cargaitemid}` }));
  }
  if (entities.includes("clientes")) {
    const dependencies = ids(result.pedidos, "cliente");
    const changed = since && !catalogSnapshot && !customerSnapshot ? ` AND (p.DATAHORAALTERACAO_PESSOA >= ? OR c.DATAHORAALTERACAO_PESSOA_CLI >= ? OR e.DATAHORAALTERACAO_PESSOA_END >= ?
      OR EXISTS (SELECT 1 FROM PESSOA_TELEFONE t WHERE t.PESSOA_PESSOA_TEL = p.CODIGO_PESSOA AND t.DATAHORAALTERACAO_PESSOA_TEL >= ?)
      OR EXISTS (SELECT 1 FROM PESSOA_EMAIL mail WHERE mail.PESSOA_PESSOA_EMAIL = p.CODIGO_PESSOA AND mail.DATAHORAALTERACAO_PESSOA_EMAIL >= ?)
      OR EXISTS (SELECT 1 FROM PESSOA_PRAZOS pp WHERE pp.PESSOA_PESSOAPRAZO = p.CODIGO_PESSOA AND pp.DATAHORAALTERACAO_PESSOAPRAZO >= ?)
      ${dependencies.length ? `OR p.CODIGO_PESSOA IN (${placeholders(dependencies)})` : ""})` : "";
    const customerRows = await readOnlyRows(db, `SELECT p.CODIGO_PESSOA AS codigo,
      p.RAZAOSOCIAL_PESSOA AS nome, p.NOMEFANTASIA_PESSOA AS nomefantasia, p.DOCUMENTO_PESSOA AS documento,
      c.CONDPAGTO_PESSOA_CLI AS condicaopagamento,
      c.OBSERVACAOVENDA_PESSOA_CLI AS observacoescompravenda,
      e.ENDERECO_PESSOA_END AS endereco, e.NUMERO_PESSOA_END AS numero, e.COMPLEMENTO_PESSOA_END AS complemento,
      e.BAIRRO_PESSOA_END AS bairro, ci.DESCRICAO_CIDADE AS cidade, uf.SIGLA_UF AS estado,
      (SELECT FIRST 1 tel.TELEFONE_PESSOA_TEL FROM PESSOA_TELEFONE tel WHERE tel.PESSOA_PESSOA_TEL = p.CODIGO_PESSOA
       ORDER BY CASE WHEN tel.AUTOINC_PESSOA_TEL = e.TELEFONEPADRAO_PESSOA_END THEN 0 ELSE 1 END,
                tel.TELEFONEPADRAO_PESSOA_TEL DESC, tel.AUTOINC_PESSOA_TEL) AS telefone,
      COALESCE((SELECT FIRST 1 mail.EMAIL_PESSOA_EMAIL FROM PESSOA_EMAIL mail WHERE mail.PESSOA_PESSOA_EMAIL = p.CODIGO_PESSOA
       ORDER BY CASE WHEN mail.AUTOINC_PESSOA_EMAIL = p.EMAILPADRAO_PESSOA THEN 0 ELSE 1 END,
                mail.PADRAO_PESSOA_EMAIL DESC, mail.AUTOINC_PESSOA_EMAIL), e.EMAIL_PESSOA_END) AS email,
      p.DATAHORAALTERACAO_PESSOA AS atualizadoem, c.DATAHORAALTERACAO_PESSOA_CLI AS clienteatualizadoem,
      e.DATAHORAALTERACAO_PESSOA_END AS enderecoatualizadoem
      FROM PESSOA p JOIN PESSOA_CLIENTE c ON c.PESSOA_PESSOA_CLI = p.CODIGO_PESSOA
      LEFT JOIN PESSOA_ENDERECO e ON e.PESSOA_PESSOA_END = p.CODIGO_PESSOA AND e.AUTOINC_PESSOA_END = p.ENDERECO_PESSOA
      LEFT JOIN CIDADE ci ON ci.CODIGO_CIDADE = e.CIDADE_PESSOA_END LEFT JOIN UF uf ON uf.CODIGO_UF = ci.UF_CIDADE
      WHERE p.CLIENTE_PESSOA = 'S'${changed}`, changed ? [since, since, since, since, since, since, ...dependencies] : []);
    const terms: Row[] = [];
    for (const codes of batches(ids(customerRows, "codigo"))) terms.push(...await readOnlyRows(db, `SELECT PESSOA_PESSOAPRAZO AS codigo, PRAZODIAS_PESSOAPRAZO AS dias FROM PESSOA_PRAZOS WHERE TIPO_PESSOAPRAZO = 1 AND PESSOA_PESSOAPRAZO IN (${placeholders(codes)})`, codes));
    result.clientes = customerRows.map((r) => ({ ...r, prazosPadrao: terms.filter((t) => key(t.codigo) === key(r.codigo)).map((t) => t.dias), externalId: `cliente:${r.codigo}` }));
  }
  if (entities.includes("produtos")) {
    const dependencies = ids(result.pedidos, "codigoitem");
    const select = `SELECT i.CODIGO_ITEM AS codigo, i.DESCRICAO_ITEM AS descricao, i.REFERENCIA_ITEM AS referencia,
      i.UNIDADEMEDIDA_ITEM AS unidade, i.UNIDADEMEDIDA_ITEM AS unidadesigla,
      i.CONTROLAESTOQUE_ITEM AS controlaestoque, i.FABRICACAO_PROPRIA_ITEM AS fabricacaopropria,
      i.RASTREIOPRODUCAO_ITEM AS rastreioproducao, i.GRUPO_ITEM AS grupo, i.SUBGRUPO_ITEM AS subgrupo,
      i.TIPOPRODUTO_ITEM AS tipoproduto, tp.DESCRICAO_TIPOPROD AS tipoprodutodescricao,
      CASE WHEN ip.CODIGOITEM_ITEM_PECA IS NULL THEN 0 ELSE 1 END AS epeca,
      ip.MATERIAPRIMAPADRAO_ITEM_PECA AS materiaprimacodigo, i.EMPRESA_ITEM AS empresa,
      i.DATAHORAALTERACAO_ITEM AS atualizadoem FROM ITEM i
      LEFT JOIN TIPOPRODUTO tp ON tp.CODIGO_TIPOPROD = i.TIPOPRODUTO_ITEM
      LEFT JOIN ITEM_PECA ip ON ip.CODIGOITEM_ITEM_PECA = i.CODIGO_ITEM
      WHERE (i.EMPRESA_ITEM IS NULL OR i.EMPRESA_ITEM IN (${placeholders(companies)}))`;
    let products: Row[];
    if (!since || catalogSnapshot) products = await readOnlyRows(db, select, companies);
    else {
      const changed = await readOnlyRows(db, `${select} AND (i.DATAHORAALTERACAO_ITEM >= ? OR ip.DATAHORAALTERACAO_ITEM_PECA >= ? ${dependencies.length ? `OR i.CODIGO_ITEM IN (${placeholders(dependencies)})` : ""})`, [...companies, since, since, ...dependencies]);
      const bases = [...new Set(ids(changed, "codigo").map(baseCode))];
      products = [];
      for (const codes of batches(bases, 100)) products.push(...await readOnlyRows(db, `${select} AND (${codes.map(() => "i.CODIGO_ITEM = ? OR i.CODIGO_ITEM STARTING WITH ?").join(" OR ")})`, [...companies, ...codes.flatMap((c) => [c, `${c}.`])]));
    }
    result.produtos = products.map((r) => ({ ...r, externalId: `produto:${r.codigo}` }));
  }
  if (entities.includes("faturamentos")) {
    result.faturamentos = (await readOnlyRows(db, `SELECT nf.AUTOINC_NF AS id, nf.EMPRESA_NF AS empresa,
      nf.NUMERO_NF AS numeronota, nf.SERIE_NF AS serie, nf.PESSOA_NF AS cliente, nf.DATAEMISSAO_NF AS emitidoem,
      nf.SITUACAO_NF AS situacao, nf.STATUS_NF AS status, nf.VALORTOTAL_NF AS valortotal, nf.NFE_CHAVE_NF AS chavenfe,
      nfi.AUTOINC_NFITEM AS itemid, nfi.ITEM_NFITEM AS codigoitem, nfi.QUANTIDADE_NFITEM AS quantidade,
      nfi.VLRTOTALBRUTO_NFITEM AS valorbruto, nfi.VLRTOTALLIQUIDO_NFITEM AS valorliquido, nf.DATAHORAALTERACAO_NF AS atualizadoem
      FROM NOTA_FISCAL nf LEFT JOIN NOTA_FISCAL_ITEM nfi ON nfi.AUTOINCNF_NFITEM = nf.AUTOINC_NF
      WHERE nf.EMPRESA_NF IN (${placeholders(companies)})${since ? " AND nf.DATAHORAALTERACAO_NF >= ?" : ""}`, [...companies, ...(since ? [since] : [])]))
      .map((r) => ({ ...r, externalId: `faturamento:${r.empresa}:${r.id}:${r.itemid || "cabecalho"}` }));
  }
  return result;
}
