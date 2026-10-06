param([switch]$DryRun)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
$OutputEncoding = [Console]::OutputEncoding
$projectRoot = Split-Path -Parent $PSScriptRoot
$agentDirectory = Join-Path $env:LOCALAPPDATA "ApontaPRO\TekSystem"
$secretsPath = Join-Path $agentDirectory "secrets.xml"
$configPath = Join-Path $agentDirectory "agent-config.json"
$logPath = Join-Path $agentDirectory ("task-v2-{0}.log" -f (Get-Date -Format "yyyy-MM-dd"))
New-Item -ItemType Directory -Path $agentDirectory -Force | Out-Null

function Convert-SecureStringToPlainText([System.Security.SecureString]$Value) {
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($Value)
  try { return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
}

try {
  if (-not (Test-Path -LiteralPath $secretsPath) -or -not (Test-Path -LiteralPath $configPath)) {
    throw "Configuracao local incompleta. Execute tools/teksystem-sync-setup.ps1 primeiro."
  }
  $secrets = Import-Clixml -LiteralPath $secretsPath
  $config = Get-Content -LiteralPath $configPath -Raw | ConvertFrom-Json

  $env:TEKSYSTEM_DB_USER = $secrets.Firebird.UserName
  $env:TEKSYSTEM_DB_PASSWORD = Convert-SecureStringToPlainText $secrets.Firebird.Password
  $env:TEKSYSTEM_SYNC_API_TOKEN = Convert-SecureStringToPlainText $secrets.Api.Password
  $env:TEKSYSTEM_VERCEL_BYPASS_SECRET = Convert-SecureStringToPlainText $secrets.VercelBypass.Password
  $env:TEKSYSTEM_SYNC_API_URL = [string]$config.ApiUrl
  if (-not $secrets.Writer) { throw "Token dedicado do escritor ausente. Execute teksystem-writer-setup.ps1." }
  $env:TEKSYSTEM_WRITER_API_TOKEN = Convert-SecureStringToPlainText $secrets.Writer.Password
  $env:TEKSYSTEM_WRITER_API_URL = ([string]$config.ApiUrl) -replace '/sync$', '/process'
  $env:TEKSYSTEM_HOST = [string]$config.Host
  $env:TEKSYSTEM_SERVER_PORT = [string]$config.ServerPort
  $env:TEKSYSTEM_DATABASE_PORT = [string]$config.DatabasePort
  $env:TEKSYSTEM_DATABASE_PATH = [string]$config.DatabasePath
  $env:TEKSYSTEM_COMPANY_IDS = "0,1"
  $env:TEKSYSTEM_ALLOWED_TENANT_ID = "imperio"

  $npm = (Get-Command npm.cmd -ErrorAction Stop).Source
  $npmArgs = @("run", "teksystem:sync")
  if ($DryRun) { $npmArgs += @("--", "--dry-run") }

  "[$(Get-Date -Format o)] Inicio da verificacao; dryRun=$DryRun" | Add-Content -LiteralPath $logPath -Encoding UTF8
  Push-Location $projectRoot
  try {
    & $npm @npmArgs *>&1 | Out-File -LiteralPath $logPath -Append -Encoding UTF8
    $runExitCode = $LASTEXITCODE
  }
  finally { Pop-Location }
  "[$(Get-Date -Format o)] Fim da verificacao; exitCode=$runExitCode" | Add-Content -LiteralPath $logPath -Encoding UTF8
  if ($runExitCode -ne 0) { exit $runExitCode }
}
catch {
  "[$(Get-Date -Format o)] Falha do agente: $($_.Exception.Message)" | Add-Content -LiteralPath $logPath -Encoding UTF8
  Write-Error "A rotina não concluiu. Consulte o log local em $logPath."
  exit 1
}
finally {
  @(
    "TEKSYSTEM_DB_USER", "TEKSYSTEM_DB_PASSWORD", "TEKSYSTEM_SYNC_API_TOKEN",
    "TEKSYSTEM_VERCEL_BYPASS_SECRET", "TEKSYSTEM_SYNC_API_URL", "TEKSYSTEM_HOST",
    "TEKSYSTEM_SERVER_PORT", "TEKSYSTEM_DATABASE_PORT", "TEKSYSTEM_DATABASE_PATH",
    "TEKSYSTEM_COMPANY_IDS", "TEKSYSTEM_ALLOWED_TENANT_ID"
    "TEKSYSTEM_WRITER_API_TOKEN", "TEKSYSTEM_WRITER_API_URL"
  ) | ForEach-Object { Remove-Item "Env:$_" -ErrorAction SilentlyContinue }
}
