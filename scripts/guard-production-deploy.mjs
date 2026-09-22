import fs from "node:fs";
import path from "node:path";

const REPO = "rockstaraki2-byte/Apontamento-de-produ-o-";
const PRODUCTION_BRANCH = "main";

function stop(message) {
  console.error("");
  console.error("============================================================");
  console.error(" BLOQUEIO DE DEPLOY DE PRODUÇÃO");
  console.error("============================================================");
  console.error(message);
  console.error("");
  console.error("A produção NÃO será alterada por este build.");
  console.error("Faça o deploy a partir do HEAD atual da branch main.");
  console.error("============================================================");
  console.error("");
  process.exit(1);
}

const isVercel = process.env.VERCEL === "1";
const targetEnv =
  process.env.VERCEL_TARGET_ENV ||
  process.env.VERCEL_ENV ||
  "";

function writeDeploymentFingerprint(payload) {
  const target = path.resolve("public", "deployment-info.json");
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(
    target,
    JSON.stringify(
      {
        app: "ApontaPRO",
        ...payload,
        generatedAt: new Date().toISOString(),
      },
      null,
      2,
    ) + "\n",
    "utf8",
  );
}

if (!isVercel || targetEnv !== "production") {
  writeDeploymentFingerprint({
    environment: targetEnv || "local",
    gitRef: process.env.VERCEL_GIT_COMMIT_REF || null,
    gitSha:
      process.env.VERCEL_GIT_COMMIT_SHA ||
      process.env.VITE_VERCEL_GIT_COMMIT_SHA ||
      null,
    protected: false,
  });
  console.log(
    "[deploy-guard] Ambiente não produtivo. Verificação de antiguidade ignorada.",
  );
  process.exit(0);
}

const commitRef =
  process.env.VERCEL_GIT_COMMIT_REF ||
  process.env.GIT_BRANCH ||
  "";

const deploymentSha =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.VITE_VERCEL_GIT_COMMIT_SHA ||
  process.env.GIT_COMMIT_SHA ||
  process.env.COMMIT_SHA ||
  "";

if (commitRef && commitRef !== PRODUCTION_BRANCH) {
  stop(
    `Tentativa de produção originada da branch "${commitRef}". Apenas "${PRODUCTION_BRANCH}" pode publicar em produção.`,
  );
}

if (!deploymentSha) {
  stop(
    "O build de produção não possui VERCEL_GIT_COMMIT_SHA. Deploys de produção sem vínculo verificável com o GitHub foram bloqueados.",
  );
}

const headers = {
  Accept: "application/vnd.github+json",
  "User-Agent": "apontapro-production-deploy-guard",
  "Cache-Control": "no-cache",
};

if (process.env.GITHUB_TOKEN) {
  headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
}

const apiEndpoint =
  `https://api.github.com/repos/${REPO}/commits/${PRODUCTION_BRANCH}?_=${Date.now()}`;
const atomEndpoint =
  `https://github.com/${REPO}/commits/${PRODUCTION_BRANCH}.atom?_=${Date.now()}`;

async function readLatestMainSha() {
  const failures = [];
  const attempts = [
    {
      label: "API do GitHub",
      url: apiEndpoint,
      parse: async (response) => String((await response.json())?.sha || "").trim(),
    },
    {
      label: "feed de commits do GitHub",
      url: atomEndpoint,
      parse: async (response) => {
        const body = await response.text();
        return body.match(/\/commit\/([0-9a-f]{40})/i)?.[1] || "";
      },
    },
  ];

  for (const attempt of attempts) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    try {
      const response = await fetch(attempt.url, {
        headers:
          attempt.label === "API do GitHub"
            ? headers
            : {
                Accept: "application/atom+xml",
                "User-Agent": "apontapro-production-deploy-guard",
                "Cache-Control": "no-cache",
              },
        cache: "no-store",
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        failures.push(`${attempt.label}: HTTP ${response.status} ${body.slice(0, 160)}`);
        continue;
      }

      const sha = await attempt.parse(response);
      if (sha) return sha;
      failures.push(`${attempt.label}: resposta sem SHA válido`);
    } catch (error) {
      failures.push(`${attempt.label}: ${error?.message || error}`);
    } finally {
      clearTimeout(timeout);
    }
  }

  if (isVercel && commitRef === PRODUCTION_BRANCH && deploymentSha.trim()) {
    console.warn(
      `[deploy-guard] Consulta externa ao HEAD indisponível; usando o SHA imutável fornecido pelo Git da Vercel (${deploymentSha.trim()}).`,
    );
    return deploymentSha.trim();
  }

  stop(`Não foi possível consultar o HEAD atual do GitHub. ${failures.join(" | ")}`);
}

const latestMainSha = await readLatestMainSha();

const normalizedDeploymentSha = deploymentSha.trim();

if (latestMainSha !== normalizedDeploymentSha) {
  stop(
    [
      "Foi detectado um deploy antigo tentando assumir a produção.",
      `SHA do build:      ${normalizedDeploymentSha}`,
      `HEAD atual main:   ${latestMainSha}`,
      "",
      "Esse é exatamente o cenário que anteriormente fez o sistema voltar para uma versão antiga.",
    ].join("\n"),
  );
}

console.log("");
console.log("============================================================");
console.log(" PROTEÇÃO DE DEPLOY APROVADA");
console.log("============================================================");
console.log(`Branch: ${PRODUCTION_BRANCH}`);
console.log(`Commit: ${latestMainSha}`);
writeDeploymentFingerprint({
  environment: targetEnv,
  gitRef: commitRef || PRODUCTION_BRANCH,
  gitSha: latestMainSha,
  protected: true,
});

console.log("Este build corresponde ao HEAD atual da main.");
console.log("Fingerprint: public/deployment-info.json");
console.log("============================================================");
console.log("");
