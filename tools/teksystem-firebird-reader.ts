import fs from "node:fs/promises";
import process from "node:process";
import * as Firebird from "node-firebird";
import type { Database, Options } from "node-firebird";
import { validateAndNormalizeTekSystemSync, type TekSystemSyncPayload } from "../api/_lib/teksystemSync.js";

type EntityName = "clientes" | "produtos" | "pedidos" | "faturamentos" | "romaneios";

const ALL_ENTITIES: EntityName[] = ["clientes", "produtos", "pedidos", "faturamentos", "romaneios"];

function envNumber(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isInteger(value) && value > 0 ? value : fallback;
}

function argumentValue(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index >= 0) return args[index + 1];
  const prefix = `${name}=`;
  return args.find((arg) => arg.startsWith(prefix))?.slice(prefix.length);
}

function sourceDefaults() {
  const companyIds = (process.env.TEKSYSTEM_COMPANY_IDS || "0,1")
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isInteger(value) && value >= 0);
  return {
    host: process.env.TEKSYSTEM_HOST || "SERVIDOR",
    databasePort: envNumber("TEKSYSTEM_DATABASE_PORT", 3055),
    databasePath: process.env.TEKSYSTEM_DATABASE_PATH || "C:\\Tek-System\\Dados\\DadosMC.fdb",
    companyId: envNumber("TEKSYSTEM_COMPANY_ID", 1),
    companyIds: companyIds.length ? [...new Set(companyIds)] : [0, 1],
    protocol: process.env.TEKSYSTEM_PROTOCOL || "tcp/ip",
  };
}

function databaseOptions(): Options {
  const source = sourceDefaults();
  const user = process.env.TEKSYSTEM_DB_USER;
  const password = process.env.TEKSYSTEM_DB_PASSWORD;
  if (!user || !password) {
    throw new Error(
      "Configure TEKSYSTEM_DB_USER e TEKSYSTEM_DB_PASSWORD localmente. " +
        "Use uma credencial Firebird somente leitura; não envie a senha pelo chat.",
    );
  }

  return {
    host: source.host,
    port: source.databasePort,
    database: source.databasePath,
    user,
    password,
    lowercase_keys: true,
    encoding: "WIN1252",
    connectTimeout: 10000,
  };
}

function sinceValue(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error(`--since inválido: ${value}`);
  return parsed;
}

function changedSince(alias: string, fields: string[], since: Date | undefined) {
  if (!since) return { clause: "", params: [] as unknown[] };
  return {
    clause: ` AND (${fields.map((field) => `${alias}.${field} >= ?`).join(" OR ")})`,
    params: fields.map(() => since),
  };
}

async function queryRows<T extends Record<string, unknown>>(
  db: Database,
  sql: string,
  params: unknown[] = [],
): Promise<T[]> {
  const transaction = await db.transactionAsync(Firebird.ISOLATION_READ_COMMITTED_READ_ONLY);
  try {
    const rows = await transaction.queryAsync<T>(sql, params);
    await transaction.commitAsync();
    return rows;
  } catch (error) {
    await transaction.rollbackAsync().catch(() => undefined);
    throw error;
  }
}

function rowValue(row: Record<string, unknown>, key: string) {
  return row[key] ?? row[key.toLowerCase()];
}

function withExternalIds(entity: EntityName, rows: Record<string, unknown>[]) {
  return rows.map((row) => {
    const codigo = String(rowValue(row, "codigo") ?? rowValue(row, "codigoPedido") ?? rowValue(row, "numeroNota") ?? rowValue(row, "id") ?? "");
    const item = entity === "pedidos"
      ? rowValue(row, "detalheId") ?? rowValue(row, "itemId")
      : entity === "romaneios"
        ? rowValue(row, "cargaItemId")
        : rowValue(row, "itemId") ?? rowValue(row, "item") ?? rowValue(row, "codigoItem") ?? rowValue(row, "item_id");
    const itemSuffix = item === undefined || item === null || item === "" ? "cabecalho" : String(item);
    const externalId =
      entity === "clientes"
        ? `cliente:${codigo}`
        : entity === "produtos"
          ? `produto:${codigo}`
        : entity === "pedidos"
            ? `pedido:${codigo}:${itemSuffix}`
            : entity === "faturamentos"
              ? `faturamento:${codigo}:${itemSuffix}`
              : `romaneio:${String(rowValue(row, "cargaId") ?? "")}:${itemSuffix}`;
    return { ...row, externalId };
  });
}

function dateRange(value: string | undefined): { value: string } | undefined {
  if (!value) return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`--date inválido: ${value}; use YYYY-MM-DD.`);
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new Error(`--date inválido: ${value}; use uma data real no formato YYYY-MM-DD.`);
  }
  return { value };
}

async function readEntities(
  db: Database,
  entities: EntityName[],
  since: Date | undefined,
  businessDate: { value: string } | undefined,
) {
  const source = sourceDefaults();
  const result: Record<EntityName, Record<string, unknown>[]> = {
    clientes: [],
    produtos: [],
    pedidos: [],
    faturamentos: [],
    romaneios: [],
  };

  if (entities.includes("clientes")) {
    const changed = since
      ? {
          clause:
            " AND (p.DATAHORAALTERACAO_PESSOA >= ? OR c.DATAHORAALTERACAO_PESSOA_CLI >= ? OR e.DATAHORAALTERACAO_PESSOA_END >= ?)",
          params: [since, since, since],
        }
      : { clause: "", params: [] as unknown[] };
    result.clientes = withExternalIds(
      "clientes",
      await queryRows(db, `
        SELECT
          p.CODIGO_PESSOA AS codigo,
          p.RAZAOSOCIAL_PESSOA AS nome,
          p.NOMEFANTASIA_PESSOA AS nomeFantasia,
          p.DOCUMENTO_PESSOA AS documento,
          c.CONDPAGTO_PESSOA_CLI AS condicaoPagamento,
          e.ENDERECO_PESSOA_END AS endereco,
          e.NUMERO_PESSOA_END AS numero,
          e.COMPLEMENTO_PESSOA_END AS complemento,
          e.BAIRRO_PESSOA_END AS bairro,
          ci.DESCRICAO_CIDADE AS cidade,
          uf.SIGLA_UF AS estado,
          p.DATAHORAALTERACAO_PESSOA AS atualizadoEm,
          c.DATAHORAALTERACAO_PESSOA_CLI AS clienteAtualizadoEm,
          e.DATAHORAALTERACAO_PESSOA_END AS enderecoAtualizadoEm
        FROM PESSOA p
        INNER JOIN PESSOA_CLIENTE c ON c.PESSOA_PESSOA_CLI = p.CODIGO_PESSOA
        LEFT JOIN PESSOA_ENDERECO e
          ON e.PESSOA_PESSOA_END = p.CODIGO_PESSOA
         AND e.AUTOINC_PESSOA_END = p.ENDERECO_PESSOA
        LEFT JOIN CIDADE ci ON ci.CODIGO_CIDADE = e.CIDADE_PESSOA_END
        LEFT JOIN UF uf ON uf.CODIGO_UF = ci.UF_CIDADE
        WHERE p.CLIENTE_PESSOA = 'S'${changed.clause}
      `, changed.params),
    );
  }

  if (entities.includes("produtos")) {
    const changed = changedSince("i", ["DATAHORAALTERACAO_ITEM"], since);
    result.produtos = withExternalIds(
      "produtos",
      await queryRows(db, `
        SELECT
          i.CODIGO_ITEM AS codigo,
          i.DESCRICAO_ITEM AS descricao,
          i.REFERENCIA_ITEM AS referencia,
          i.UNIDADEMEDIDA_ITEM AS unidade,
          i.CONTROLAESTOQUE_ITEM AS controlaEstoque,
          i.FABRICACAO_PROPRIA_ITEM AS fabricacaoPropria,
          i.RASTREIOPRODUCAO_ITEM AS rastreioProducao,
          i.GRUPO_ITEM AS grupo,
          i.SUBGRUPO_ITEM AS subgrupo,
          i.TIPOPRODUTO_ITEM AS tipoProduto,
          i.EMPRESA_ITEM AS empresa,
          i.DATAHORAALTERACAO_ITEM AS atualizadoEm
        FROM ITEM i
        WHERE (i.EMPRESA_ITEM IS NULL OR i.EMPRESA_ITEM IN (${source.companyIds.map(() => "?").join(", ")}))${changed.clause}
      `, [...source.companyIds, ...changed.params]),
    );
  }

  if (entities.includes("pedidos")) {
    const changed = since
      ? {
          clause: ` AND (
            d.DATAHORAALTERACAO_DOCFAT >= ? OR p.DATAHORAALTERACAO_DOCPED >= ?
            OR i.DATAHORAALTERACAO_DOCITEM >= ? OR det.DATAHORAALTERACAO_DOCITEMDET >= ?
            OR EXISTS (SELECT 1 FROM DOCUMENTO_PRAZOS prazo
                        WHERE prazo.DOCUMENTO_DOCPRAZO = d.CODIGO_DOCFAT
                          AND prazo.DATAHORAALTERACAO_DOCPRAZO >= ?)
            OR EXISTS (SELECT 1 FROM DOCUMENTO_PEDREPRESENTANTE rep
                        WHERE rep.DOCUMENTO_DOCPEDREP = d.CODIGO_DOCFAT
                          AND rep.DATAHORAALTERACAO_DOCPEDREP >= ?)
          )`,
          params: [since, since, since, since, since, since],
        }
      : { clause: "", params: [] as unknown[] };
    const businessDateFilter = businessDate
      ? " AND CAST(d.DTEMISSAO_DOCFAT AS DATE) = CAST(? AS DATE)"
      : "";
    const orderParams = [
      ...source.companyIds,
      ...(businessDate ? [businessDate.value] : []),
      ...changed.params,
    ];
    const orderRows = await queryRows(db, `
        SELECT
          d.CODIGO_DOCFAT AS codigoPedido,
          d.EMPRESA_DOCFAT AS empresa,
          d.CLIENTE_DOCFAT AS cliente,
          cliente.RAZAOSOCIAL_PESSOA AS clienteNome,
          cliente.NOMEFANTASIA_PESSOA AS clienteNomeFantasia,
          d.DTEMISSAO_DOCFAT AS emitidoEm,
          d.STATUS_DOCFAT AS status,
          d.SITUACAO_DOCFAT AS situacao,
          p.TABELACONDICAO_DOCPED AS tabelaCondicaoPagamento,
          tc.DESCRICAO_TABELA_COND AS descricaoCondicaoPagamento,
          p.DTVENDA_DOCPED AS dataVenda,
          p.DTPROMESSAENTREGA_DOCPED AS promessaEntrega,
          p.DTPREVISAOFATURAMENTO_DOCPED AS previsaoFaturamento,
          p.CONDICAOPRAZO_DOCPED AS condicaoPrazo,
          p.MULTIPLASFORMASPAGTO_DOCPED AS multiplasFormasPagamento,
          p.PAGAMENTOANTECIPADO_DOCPED AS pagamentoAntecipado,
          i.AUTOINC_DOCITEM AS itemId,
          det.AUTOINC_DOCITEMDET AS detalheId,
          COALESCE(det.ITEM_DOCITEMDET, i.ITEM_DOCITEM) AS codigoItem,
          item.DESCRICAO_ITEM AS descricaoItem,
          COALESCE(det.COR_DOCITEMDET, i.COR_DOCITEM) AS cor,
          COALESCE(det.VARIACAO_DOCITEMDET, i.VARIACAO_DOCITEM) AS variacao,
          COALESCE(det.GRADE_DOCITEMDET, i.GRADE_DOCITEM) AS grade,
          COALESCE(det.ACABAMENTO_DOCITEMDET, i.ACABAMENTO_DOCITEM) AS acabamento,
          cor.DESCRICAO_COR AS corDescricao,
          variacao.DESCRICAO_VARIACAO AS variacaoDescricao,
          acabamento.DESCRICAO_ACABAMENTO AS acabamentoDescricao,
          COALESCE(det.QTDEPEDIDO_DOCITEMDET, i.QTDEPEDIDO_DOCITEM) AS quantidade,
          COALESCE(det.QTDEFATURADO_DOCITEMDET, i.QTDEFATURADO_DOCITEM) AS quantidadeFaturada,
          COALESCE(det.QTDEABERTA_DOCITEMDET, i.QTDEABERTA_DOCITEM) AS quantidadeAberta,
          COALESCE(det.VLRUNITARIOBRUTO_DOCITEMDET, i.VLRUNITARIOBRUTO_DOCITEM) AS precoUnitarioBruto,
          COALESCE(det.VLRUNITARIOLIQUIDO_DOCITEMDET, i.VLRUNITARIOLIQUIDO_DOCITEM) AS precoUnitario,
          COALESCE(det.VLRTOTALBRUTO_DOCITEMDET, i.VLRTOTALBRUTO_DOCITEM) AS valorBruto,
          COALESCE(det.VLRTOTALLIQUIDO_DOCITEMDET, i.VLRTOTALLIQUIDO_DOCITEM) AS valorLiquido,
          i.FAMILIA_DOCITEM AS familiaCodigo,
          familia.DESCRICAO_FAMILIA AS familiaDescricao,
          det.NUMITEMPED_DOCITEMDET AS numeroItemPedido,
          det.OBSERVACAO_DOCITEMDET AS observacoesItem,
          i.LOTEFABRICACAO_DOCITEM AS loteFabricacao,
          i.DATAHORAALTERACAO_DOCITEM AS itemAtualizadoEm,
          det.DATAHORAALTERACAO_DOCITEMDET AS detalheAtualizadoEm,
          d.DATAHORAINCLUSAO_DOCFAT AS cadastradoEm,
          d.DATAHORAALTERACAO_DOCFAT AS atualizadoEm
        FROM DOCUMENTO_FATURA d
        INNER JOIN DOCUMENTO_PEDIDO p ON p.DOCUMENTO_DOCPED = d.CODIGO_DOCFAT
        LEFT JOIN DOCUMENTO_ITEM i ON i.DOCUMENTO_DOCITEM = d.CODIGO_DOCFAT
        LEFT JOIN DOCUMENTO_ITEM_DETALHE det
          ON det.DOCUMENTO_DOCITEMDET = d.CODIGO_DOCFAT
         AND det.AUTOINCITEM_DOCITEMDET = i.AUTOINC_DOCITEM
        LEFT JOIN PESSOA cliente ON cliente.CODIGO_PESSOA = d.CLIENTE_DOCFAT
        LEFT JOIN TABELA_CONDICAO tc ON tc.CODIGO_TABELA_COND = p.TABELACONDICAO_DOCPED
        LEFT JOIN ITEM item ON item.CODIGO_ITEM = COALESCE(det.ITEM_DOCITEMDET, i.ITEM_DOCITEM)
        LEFT JOIN FAMILIA familia ON familia.CODIGO_FAMILIA = i.FAMILIA_DOCITEM
        LEFT JOIN COR cor ON cor.CODIGO_COR = COALESCE(det.COR_DOCITEMDET, i.COR_DOCITEM)
        LEFT JOIN VARIACAO variacao ON variacao.CODIGO_VARIACAO = COALESCE(det.VARIACAO_DOCITEMDET, i.VARIACAO_DOCITEM)
        LEFT JOIN ACABAMENTO acabamento ON acabamento.CODIGO_ACABAMENTO = COALESCE(det.ACABAMENTO_DOCITEMDET, i.ACABAMENTO_DOCITEM)
        WHERE d.EMPRESA_DOCFAT IN (${source.companyIds.map(() => "?").join(", ")})${businessDateFilter}${changed.clause}
      `, orderParams);

    const orderCodes = [...new Set(orderRows.map((row) => String(rowValue(row, "codigoPedido") ?? "")).filter(Boolean))];
    const paymentRows: Record<string, unknown>[] = [];
    const representativeRows: Record<string, unknown>[] = [];
    for (let offset = 0; offset < orderCodes.length; offset += 500) {
      const codeBatch = orderCodes.slice(offset, offset + 500);
      const placeholders = codeBatch.map(() => "?").join(", ");
      paymentRows.push(...await queryRows(db, `
        SELECT DOCUMENTO_DOCPRAZO AS codigoPedido,
               FORMAPAGTO_DOCPRAZO AS formaPagamento,
               fp.DESCRICAO_FPAG AS formaPagamentoDescricao,
               QUALIFICACAO_DOCPRAZO AS qualificacao,
               PRAZODIAS_DOCPRAZO AS dias,
               VENCIMENTO_DOCPRAZO AS vencimento,
               VALOR_DOCPRAZO AS valor,
               PRINCIPAL_DOCPRAZO AS principal
          FROM DOCUMENTO_PRAZOS prazo
          LEFT JOIN FORMA_PAGAMENTO fp ON fp.CODIGO_FPAG = prazo.FORMAPAGTO_DOCPRAZO
         WHERE DOCUMENTO_DOCPRAZO IN (${placeholders})
      `, codeBatch));
      representativeRows.push(...await queryRows(db, `
        SELECT r.DOCUMENTO_DOCPEDREP AS codigoPedido,
               r.PEDIDOREPRESENTANTE_DOCPEDREP AS representanteCodigo,
               p.RAZAOSOCIAL_PESSOA AS representanteNome
          FROM DOCUMENTO_PEDREPRESENTANTE r
          LEFT JOIN PESSOA p ON p.CODIGO_PESSOA = r.PEDIDOREPRESENTANTE_DOCPEDREP
         WHERE r.DOCUMENTO_DOCPEDREP IN (${placeholders})
      `, codeBatch));
    }
    const paymentsByOrder = new Map<string, Record<string, unknown>[]>();
    for (const row of paymentRows) {
      const key = String(rowValue(row, "codigoPedido") ?? "");
      paymentsByOrder.set(key, [...(paymentsByOrder.get(key) || []), {
        formaPagamento: row.formapagamento,
        formaPagamentoDescricao: row.formapagamentodescricao,
        qualificacao: row.qualificacao,
        dias: row.dias,
        vencimento: row.vencimento,
        valor: row.valor,
        principal: row.principal,
      }]);
    }
    const representativesByOrder = new Map<string, Record<string, unknown>[]>();
    for (const row of representativeRows) {
      const key = String(rowValue(row, "codigoPedido") ?? "");
      representativesByOrder.set(key, [...(representativesByOrder.get(key) || []), {
        codigo: row.representantecodigo,
        nome: row.representantenome,
      }]);
    }
    result.pedidos = withExternalIds("pedidos", orderRows.map((row) => ({
      ...row,
      prazos: paymentsByOrder.get(String(rowValue(row, "codigoPedido") ?? "")) || [],
      representantes: representativesByOrder.get(String(rowValue(row, "codigoPedido") ?? "")) || [],
    })));
  }

  if (entities.includes("faturamentos")) {
    const changed = changedSince("nf", ["DATAHORAALTERACAO_NF"], since);
    result.faturamentos = withExternalIds(
      "faturamentos",
      await queryRows(db, `
        SELECT
          nf.AUTOINC_NF AS id,
          nf.EMPRESA_NF AS empresa,
          nf.NUMERO_NF AS numeroNota,
          nf.SERIE_NF AS serie,
          nf.PESSOA_NF AS cliente,
          nf.DATAEMISSAO_NF AS emitidoEm,
          nf.SITUACAO_NF AS situacao,
          nf.STATUS_NF AS status,
          nf.VALORTOTAL_NF AS valorTotal,
          nf.NFE_CHAVE_NF AS chaveNfe,
          nfi.AUTOINC_NFITEM AS itemId,
          nfi.ITEM_NFITEM AS codigoItem,
          nfi.QUANTIDADE_NFITEM AS quantidade,
          nfi.VLRTOTALBRUTO_NFITEM AS valorBruto,
          nfi.VLRTOTALLIQUIDO_NFITEM AS valorLiquido,
          nf.DATAHORAALTERACAO_NF AS atualizadoEm
        FROM NOTA_FISCAL nf
        LEFT JOIN NOTA_FISCAL_ITEM nfi ON nfi.AUTOINCNF_NFITEM = nf.AUTOINC_NF
        WHERE nf.EMPRESA_NF IN (${source.companyIds.map(() => "?").join(", ")})${changed.clause}
      `, [...source.companyIds, ...changed.params]),
    );
  }

  if (entities.includes("romaneios")) {
    const orderCodes = entities.includes("pedidos")
      ? [...new Set(result.pedidos.map((row) => String(rowValue(row, "codigoPedido") ?? "")).filter(Boolean))]
      : [];
    const changedLoad = since
      ? ` AND (ci.DATAHORAALTERACAO_CARITE >= ? OR cd.DATAHORAALTERACAO_CARDOC >= ?
          OR c.DATAHORAALTERACAO_CARGA >= ? OR c.DATAHORALIB_FATURAMENTO_CARGA >= ?)`
      : "";
    const paramsForBatch = (codes: string[]) => [
      ...source.companyIds,
      ...source.companyIds,
      ...codes,
      ...(since ? [since, since, since, since] : []),
    ];
    const loadQuery = (codeFilter: string) => `
      SELECT
        c.CODIGO_CARGA AS cargaId,
        c.EMPRESA_CARGA AS empresa,
        c.DESCRICAO_CARGA AS cargaDescricao,
        c.DTEMISSAO_CARGA AS emitidoEm,
        c.DATAHORALIB_FATURAMENTO_CARGA AS liberadoFaturamentoEm,
        c.USUARIOLIB_FATURAMENTO_CARGA AS liberadoFaturamentoPor,
        cd.AUTOINC_CARDOC AS cargaDocumentoId,
        d.CODIGO_DOCFAT AS codigoPedido,
        d.CLIENTE_DOCFAT AS clienteCodigo,
        cliente.RAZAOSOCIAL_PESSOA AS clienteNome,
        di.AUTOINC_DOCITEM AS itemId,
        det.AUTOINC_DOCITEMDET AS detalheId,
        ci.AUTOINC_CARITE AS cargaItemId,
        COALESCE(det.ITEM_DOCITEMDET, di.ITEM_DOCITEM) AS codigoItem,
        item.DESCRICAO_ITEM AS descricaoItem,
        COALESCE(det.COR_DOCITEMDET, di.COR_DOCITEM) AS cor,
        COALESCE(det.VARIACAO_DOCITEMDET, di.VARIACAO_DOCITEM) AS variacao,
        COALESCE(det.GRADE_DOCITEMDET, di.GRADE_DOCITEM) AS grade,
        COALESCE(det.QTDEPEDIDO_DOCITEMDET, di.QTDEPEDIDO_DOCITEM) AS quantidadePedido,
        ci.QTDECHAPAS_CARITE AS quantidadeNoRomaneio,
        ci.QTDEFATURADO_CARITE AS quantidadeFaturada,
        ci.QTDEABERTA_CARITE AS quantidadeAberta,
        ci.FAMILIA_CARITE AS familiaCodigo,
        familia.DESCRICAO_FAMILIA AS familia,
        ci.DATAHORAALTERACAO_CARITE AS atualizadoEm
      FROM CARGA_ITENS ci
      INNER JOIN CARGA_DOCUMENTOS cd ON cd.AUTOINC_CARDOC = ci.AUTOINCCARDOC_CARITE
      INNER JOIN CARGA c ON c.CODIGO_CARGA = cd.CARGA_CARDOC
      INNER JOIN DOCUMENTO_ITEM_DETALHE det ON det.AUTOINC_DOCITEMDET = ci.AUTOINCITEMDETDOC_CARITE
      INNER JOIN DOCUMENTO_ITEM di ON di.AUTOINC_DOCITEM = det.AUTOINCITEM_DOCITEMDET
      INNER JOIN DOCUMENTO_FATURA d ON d.CODIGO_DOCFAT = di.DOCUMENTO_DOCITEM
      LEFT JOIN PESSOA cliente ON cliente.CODIGO_PESSOA = d.CLIENTE_DOCFAT
      LEFT JOIN ITEM item ON item.CODIGO_ITEM = COALESCE(det.ITEM_DOCITEMDET, di.ITEM_DOCITEM)
      LEFT JOIN FAMILIA familia ON familia.CODIGO_FAMILIA = ci.FAMILIA_CARITE
      WHERE c.EMPRESA_CARGA IN (${source.companyIds.map(() => "?").join(", ")})
        AND d.EMPRESA_DOCFAT IN (${source.companyIds.map(() => "?").join(", ")})
        ${codeFilter}${changedLoad}
      ORDER BY c.DTEMISSAO_CARGA, c.CODIGO_CARGA, ci.AUTOINC_CARITE`;

    const rows: Record<string, unknown>[] = [];
    if (orderCodes.length) {
      for (let offset = 0; offset < orderCodes.length; offset += 500) {
        const batch = orderCodes.slice(offset, offset + 500);
        rows.push(...await queryRows(db, loadQuery(` AND d.CODIGO_DOCFAT IN (${batch.map(() => "?").join(", ")})`), paramsForBatch(batch)));
      }
    } else if (businessDate) {
      rows.push(...await queryRows(db, loadQuery(
        " AND CAST(c.DTEMISSAO_CARGA AS DATE) = CAST(? AS DATE)",
      ), [
        ...source.companyIds,
        ...source.companyIds,
        businessDate.value,
        ...(since ? [since, since, since, since] : []),
      ]));
    } else {
      rows.push(...await queryRows(db, loadQuery(""), [
        ...source.companyIds,
        ...source.companyIds,
        ...(since ? [since, since, since, since] : []),
      ]));
    }
    result.romaneios = withExternalIds("romaneios", rows);
  }

  return result;
}

function printHelp() {
  console.log(`Uso:
  npm run teksystem:firebird -- probe
  npm run teksystem:firebird -- export --output caminho/lote.json --since 2026-01-01T00:00:00.000Z
  npm run teksystem:firebird -- export --output caminho/lote.json --entities pedidos,romaneios --date 2026-10-05

Variáveis obrigatórias (somente locais):
  TEKSYSTEM_DB_USER, TEKSYSTEM_DB_PASSWORD

Variáveis de conexão:
  TEKSYSTEM_HOST, TEKSYSTEM_DATABASE_PORT, TEKSYSTEM_DATABASE_PATH
  TEKSYSTEM_COMPANY_ID, TEKSYSTEM_PROTOCOL
  TEKSYSTEM_COMPANY_IDS (padrão: 0,1)
`);
}

async function attach(): Promise<Database> {
  return Firebird.attachAsync(databaseOptions());
}

async function runProbe() {
  const db = await attach();
  try {
    const rows = await queryRows<{ ok: number }>(db, "SELECT 1 AS ok FROM RDB$DATABASE");
    console.log(JSON.stringify({ ok: rows[0]?.ok === 1, source: sourceDefaults() }, null, 2));
  } finally {
    await db.detachAsync();
  }
}

async function runExport(args: string[]) {
  const output = argumentValue(args, "--output");
  if (!output) throw new Error("Informe --output caminho/lote.json para evitar salvar dados reais por engano.");
  const requested = argumentValue(args, "--entities");
  const entities = (requested ? requested.split(",") : ALL_ENTITIES).map((name) => name.trim()) as EntityName[];
  const invalid = entities.filter((entity) => !ALL_ENTITIES.includes(entity));
  if (invalid.length) throw new Error(`Entidades inválidas: ${invalid.join(", ")}`);

  const db = await attach();
  try {
    const rows = await readEntities(
      db,
      entities,
      sinceValue(argumentValue(args, "--since")),
      dateRange(argumentValue(args, "--date")),
    );
    const payload: TekSystemSyncPayload = {
      syncId: `teksystem-firebird-${Date.now()}`,
      tenantId: process.env.TEKSYSTEM_ALLOWED_TENANT_ID || "imperio",
      generatedAt: new Date().toISOString(),
      source: sourceDefaults(),
      entities: rows,
    };
    const validation = validateAndNormalizeTekSystemSync(payload);
    if (!validation.ok || !validation.payload) {
      throw new Error(`Dados extraídos não passaram na validação: ${JSON.stringify(validation.issues)}`);
    }
    await fs.writeFile(output, `${JSON.stringify(validation.payload, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    console.log(JSON.stringify({ ok: true, output, counts: validation.counts, payloadHash: validation.payload.payloadHash }, null, 2));
  } finally {
    await db.detachAsync();
  }
}

async function main() {
  const [command = "help", ...args] = process.argv.slice(2);
  if (command === "help" || command === "--help") return printHelp();
  if (command === "probe") return runProbe();
  if (command === "export") return runExport(args);
  throw new Error(`Comando desconhecido: ${command}`);
}

main().catch((error: any) => {
  console.error(error?.message || error);
  process.exitCode = 1;
});
