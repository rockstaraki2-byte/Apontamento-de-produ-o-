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

if (!isVercel || targetEnv !== "production") {
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

const endpoint =
  `https://api.github.com/repos/${REPO}/commits/${PRODUCTION_BRANCH}?_=${Date.now()}`;

let response;
try {
  response = await fetch(endpoint, {
    headers,
    cache: "no-store",
  });
} catch (error) {
  stop(
    `Não foi possível consultar o HEAD atual do GitHub: ${error?.message || error}`,
  );
}

if (!response.ok) {
  const body = await response.text().catch(() => "");
  stop(
    `O GitHub respondeu HTTP ${response.status} durante a validação do deploy. ${body.slice(0, 300)}`,
  );
}

const data = await response.json();
const latestMainSha = String(data?.sha || "").trim();

if (!latestMainSha) {
  stop("Não foi possível determinar o SHA atual da branch main.");
}

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
console.log("Este build corresponde ao HEAD atual da main.");
console.log("============================================================");
console.log("");
