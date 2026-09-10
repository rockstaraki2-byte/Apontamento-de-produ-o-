import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import puppeteer from "puppeteer";
import { jsPDF } from "jspdf";

const DEFAULTS = {
  appUrl: "https://apontamento-de-producao.vercel.app/",
  rootFolder: "C:\\Users\\Micro\\Documents\\Exports Faturamento TekSystem",
  githubRepo: "rockstaraki2-byte/Apontamento-de-produ-o-",
  githubOwner: "rockstaraki2-byte",
  pollSeconds: 20,
  headless: true,
  userDataDir: path.join(
    process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local"),
    "ImperioPdfAgent",
    "chrome-profile",
  ),
};

const CONFIG_PATH = path.resolve("tools", "order-pdf-agent.config.json");
const STATE_PATH = path.resolve("tools", ".order-pdf-agent-state.json");
const SETUP_MODE = process.argv.includes("--setup");
const ONCE_MODE = process.argv.includes("--once");

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) return { ...DEFAULTS };
  const parsed = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  return { ...DEFAULTS, ...parsed };
}

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
  } catch {
    return { processedIssueIds: [] };
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeForCompare(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/^pedidos\s+/, "")
    .replace(/\brepresentante\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function resolveExistingRepresentativeFolder(rootFolder, representative, suggestedFolder) {
  if (!fs.existsSync(rootFolder)) {
    throw new Error(`Pasta principal não encontrada: ${rootFolder}`);
  }

  const entries = fs
    .readdirSync(rootFolder, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  const exactCandidates = [suggestedFolder, `Pedidos ${representative}`, representative];
  for (const candidate of exactCandidates) {
    const exact = entries.find((entry) => entry.toLowerCase() === candidate.toLowerCase());
    if (exact) return path.join(rootFolder, exact);
  }

  const target = normalizeForCompare(representative);
  const fuzzy = entries.find((entry) => normalizeForCompare(entry) === target);
  if (fuzzy) return path.join(rootFolder, fuzzy);

  return null;
}

function parseCommand(body) {
  const raw = String(body || "").trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = fenced ? fenced[1] : raw;
  const parsed = JSON.parse(jsonText);

  const start = Number(parsed.pedidoInicial);
  const end = Number(parsed.pedidoFinal);
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    throw new Error("Comando sem pedidoInicial/pedidoFinal válidos.");
  }

  return {
    pedidoInicial: start,
    pedidoFinal: end,
    statusImpressao: parsed.statusImpressao || "Não Impresso",
    layoutPdf: "folha_inteira",
    umPedidoPorArquivo: true,
    imprimirFisicamente: false,
  };
}

function getGithubToken() {
  if (process.env.IMPERIO_PDF_AGENT_GITHUB_TOKEN) {
    return process.env.IMPERIO_PDF_AGENT_GITHUB_TOKEN.trim();
  }
  try {
    return execFileSync("gh", ["auth", "token"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

async function githubRequest(url, options = {}) {
  const token = options.token || "";
  const headers = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "imperio-order-pdf-agent",
    ...(options.headers || {}),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GitHub ${response.status}: ${text.slice(0, 500)}`);
  }
  if (response.status === 204) return null;
  return response.json();
}

async function listPendingIssues(config, state) {
  const [owner, repo] = config.githubRepo.split("/");
  const url = `https://api.github.com/repos/${owner}/${repo}/issues?state=open&creator=${encodeURIComponent(config.githubOwner)}&per_page=50`;
  const issues = await githubRequest(url, { token: getGithubToken() });
  const processed = new Set(state.processedIssueIds || []);

  return issues
    .filter((issue) => !issue.pull_request)
    .filter((issue) => issue.user?.login === config.githubOwner)
    .filter((issue) => String(issue.title || "").startsWith("[PDF-EXPORT]"))
    .filter((issue) => !processed.has(issue.id))
    .sort((a, b) => a.number - b.number);
}

async function commentAndCloseIssue(config, issue, result) {
  const token = getGithubToken();
  if (!token) {
    console.warn(
      "GitHub token não encontrado. O pedido foi processado, mas o agente não conseguirá comentar/fechar a tarefa no GitHub. Use `gh auth login` ou IMPERIO_PDF_AGENT_GITHUB_TOKEN.",
    );
    return;
  }

  const [owner, repo] = config.githubRepo.split("/");
  const base = `https://api.github.com/repos/${owner}/${repo}`;
  const commentBody = [
    "[PDF-EXPORT-RESULT]",
    "```json",
    JSON.stringify(result, null, 2),
    "```",
  ].join("\n");

  await githubRequest(`${base}/issues/${issue.number}/comments`, {
    method: "POST",
    token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body: commentBody }),
  });

  await githubRequest(`${base}/issues/${issue.number}`, {
    method: "PATCH",
    token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ state: "closed", state_reason: "completed" }),
  });
}

async function waitForAutomation(page, timeoutMs = 20000) {
  await page.waitForFunction(
    () => Boolean(window.__imperioPdfAutomation?.version >= 2),
    { timeout: timeoutMs },
  );
}

async function runSetup(config) {
  fs.mkdirSync(config.userDataDir, { recursive: true });
  const browser = await puppeteer.launch({
    headless: false,
    userDataDir: config.userDataDir,
    defaultViewport: { width: 1440, height: 1000 },
  });

  const pages = await browser.pages();
  const page = pages[0] || (await browser.newPage());
  await page.goto(config.appUrl, { waitUntil: "networkidle2" });

  console.log("\n=== CONFIGURAÇÃO DO AGENTE DE PDF ===");
  console.log("Faça login normalmente no Apontamento na janela aberta.");
  console.log("Quando a sessão estiver pronta, esta configuração será concluída automaticamente.\n");

  try {
    await waitForAutomation(page, 10 * 60 * 1000);
    console.log("Sessão do Apontamento detectada. Configuração concluída.");
  } finally {
    await browser.close();
  }
}

async function openAuthenticatedPage(browser, config) {
  const pages = await browser.pages();
  const page = pages[0] || (await browser.newPage());
  await page.goto(config.appUrl, { waitUntil: "networkidle2", timeout: 60000 });
  try {
    await waitForAutomation(page);
  } catch {
    throw new Error(
      "Sessão do Apontamento não está autenticada neste perfil. Execute: node tools/order-pdf-agent.mjs --setup",
    );
  }
  return page;
}

function pngToA4Pdf(pngBuffer) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });
  const dataUri = `data:image/png;base64,${pngBuffer.toString("base64")}`;
  const props = doc.getImageProperties(dataUri);
  const pageWidth = 210;
  const pageHeight = 297;
  let width = pageWidth;
  let height = (props.height * width) / props.width;
  if (height > pageHeight) {
    height = pageHeight;
    width = (props.width * height) / props.height;
  }
  const x = (pageWidth - width) / 2;
  doc.addImage(dataUri, "PNG", x, 0, width, height, undefined, "FAST");
  return Buffer.from(doc.output("arraybuffer"));
}

async function processIssue(page, config, issue) {
  const command = parseCommand(issue.body);
  const result = {
    sucesso: true,
    issue: issue.number,
    comando: command,
    processados: [],
    ignorados: [],
    erros: [],
  };

  const batch = await page.evaluate(
    (cmd) => window.__imperioPdfAutomation.getBatch(cmd),
    command,
  );
  result.ignorados.push(...(batch.ignored || []));

  for (const item of batch.eligible || []) {
    const code = String(item.pedido);
    try {
      const repFolder = resolveExistingRepresentativeFolder(
        config.rootFolder,
        item.representante,
        item.pastaRepresentante,
      );

      if (!repFolder) {
        throw new Error(
          `A pasta do representante já deveria existir, mas não foi localizada: ${item.pastaRepresentante}`,
        );
      }

      const metadata = await page.evaluate(
        (orderCode) => window.__imperioPdfAutomation.prepareOrder(orderCode),
        code,
      );

      await page.evaluate(
        (orderCode) => window.__imperioPdfAutomation.waitForOrder(orderCode, 12000),
        code,
      );

      await page.waitForSelector("#print-order-sheet .full-sheet-order-card", {
        timeout: 12000,
      });
      const card = await page.$("#print-order-sheet .full-sheet-order-card");
      if (!card) throw new Error("Espelho de Folha Inteira não encontrado no DOM.");

      const png = await card.screenshot({ type: "png" });
      const pdfBuffer = pngToA4Pdf(Buffer.from(png));
      const destination = path.join(repFolder, metadata.arquivo);

      // writeFileSync sobrescreve o arquivo existente, mas nunca cria a pasta.
      fs.writeFileSync(destination, pdfBuffer);

      // Só atualiza o status de impressão depois do arquivo estar efetivamente gravado.
      await page.evaluate(
        (orderCode) => window.__imperioPdfAutomation.markSaved(orderCode),
        code,
      );

      result.processados.push({
        pedido: code,
        representante: metadata.representante,
        arquivo: destination,
      });
    } catch (error) {
      result.sucesso = false;
      result.erros.push({
        pedido: code,
        erro: error?.message || String(error),
      });
    } finally {
      try {
        await page.evaluate(() => window.__imperioPdfAutomation.closePreview());
      } catch {}
      await sleep(250);
    }
  }

  return result;
}

async function runAgent(config) {
  fs.mkdirSync(config.userDataDir, { recursive: true });
  const state = loadState();
  const browser = await puppeteer.launch({
    headless: config.headless !== false,
    userDataDir: config.userDataDir,
    defaultViewport: { width: 1440, height: 1200 },
  });

  try {
    const page = await openAuthenticatedPage(browser, config);
    console.log("Agente de PDFs conectado ao Apontamento.");
    console.log(`Monitorando comandos [PDF-EXPORT] em ${config.githubRepo}.`);
    console.log(`Pasta principal: ${config.rootFolder}`);

    do {
      try {
        const issues = await listPendingIssues(config, state);
        for (const issue of issues) {
          console.log(`Processando tarefa #${issue.number}: ${issue.title}`);
          let result;
          try {
            result = await processIssue(page, config, issue);
          } catch (error) {
            result = {
              sucesso: false,
              issue: issue.number,
              processados: [],
              ignorados: [],
              erros: [{ pedido: "-", erro: error?.message || String(error) }],
            };
          }

          try {
            await commentAndCloseIssue(config, issue, result);
          } catch (error) {
            console.error(`Não foi possível publicar o resultado da tarefa #${issue.number}:`, error);
          }

          state.processedIssueIds = Array.from(
            new Set([...(state.processedIssueIds || []), issue.id]),
          ).slice(-500);
          saveState(state);
          console.log(
            `Tarefa #${issue.number} concluída: ${result.processados.length} processado(s), ${result.ignorados.length} ignorado(s), ${result.erros.length} erro(s).`,
          );
        }
      } catch (error) {
        console.error("Falha no ciclo de monitoramento:", error);
      }

      if (ONCE_MODE) break;
      await sleep(Math.max(5, Number(config.pollSeconds) || 20) * 1000);
    } while (true);
  } finally {
    await browser.close();
  }
}

const config = loadConfig();
if (SETUP_MODE) {
  await runSetup(config);
} else {
  await runAgent(config);
}
