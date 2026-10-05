param([switch]$InstallTask)

$ErrorActionPreference = "Stop"
$projectRoot = Split-Path -Parent $PSScriptRoot
$agentDirectory = Join-Path $env:LOCALAPPDATA "ApontaPRO\TekSystem"
$secretsPath = Join-Path $agentDirectory "secrets.xml"
$configPath = Join-Path $agentDirectory "agent-config.json"
$taskName = "ApontaPRO TekSystem staging sync"

function Read-SecretCredential([string]$Name, [string]$SecretName) {
  $secure = Read-Host $SecretName -AsSecureString
  if ($secure.Length -lt 16) { throw "$SecretName precisa ter pelo menos 16 caracteres." }
  return [System.Management.Automation.PSCredential]::new($Name, $secure)
}

if (-not $env:LOCALAPPDATA) { throw "LOCALAPPDATA não está definido para este usuário Windows." }
New-Item -ItemType Directory -Path $agentDirectory -Force | Out-Null

if (Test-Path -LiteralPath $secretsPath) {
  $replace = Read-Host "Já existe configuração DPAPI para este usuário. Substituir? (s/N)"
  if ($replace -notin @("s", "S", "sim", "SIM")) { throw "Configuração cancelada sem alterar os segredos existentes." }
}

$firebirdUser = Read-Host "Usuário Firebird dedicado, somente leitura"
if ([string]::IsNullOrWhiteSpace($firebirdUser)) { throw "Informe o usuário Firebird." }
if ($firebirdUser.Trim().ToUpperInvariant() -eq "SYSDBA") {
  Write-Warning "SYSDBA tem privilégios amplos. O leitor abre todas as consultas em transações Firebird READ ONLY, mas uma conta de leitura dedicada ainda é preferível."
}
$firebirdPassword = Read-Host "Senha Firebird (somente leitura)" -AsSecureString
if ($firebirdPassword.Length -eq 0) { throw "A senha Firebird não pode ficar vazia." }
$firebird = [System.Management.Automation.PSCredential]::new(
  $firebirdUser.Trim(),
  $firebirdPassword
)

$apiToken = if ($env:ORDER_IMPORT_API_TOKEN) {
  [System.Management.Automation.PSCredential]::new(
    "ApontaPRO API",
    (ConvertTo-SecureString $env:ORDER_IMPORT_API_TOKEN -AsPlainText -Force)
  )
} else {
  Read-SecretCredential "ApontaPRO API" "Token Bearer da API do ApontaPRO"
}
$vercelBypass = Read-SecretCredential "Vercel protection bypass" "Segredo de bypass do Vercel"

$apiUrlDefault = "https://apontamento-de-producao.vercel.app/api/integration/teksystem/sync"
$apiUrlInput = Read-Host "URL HTTPS do endpoint de staging [$apiUrlDefault]"
$apiUrl = if ([string]::IsNullOrWhiteSpace($apiUrlInput)) { $apiUrlDefault } else { $apiUrlInput.Trim() }
$parsedUrl = $null
if (-not [Uri]::TryCreate($apiUrl, [UriKind]::Absolute, [ref]$parsedUrl) -or $parsedUrl.Scheme -ne "https") {
  throw "Informe uma URL absoluta HTTPS para o endpoint de staging."
}
if ($parsedUrl.AbsolutePath -ne "/api/integration/teksystem/sync") {
  throw "A rota configurada precisa terminar exatamente em /api/integration/teksystem/sync."
}

$secrets = [pscustomobject]@{
  Firebird = $firebird
  Api = $apiToken
  VercelBypass = $vercelBypass
}
$secrets | Export-Clixml -LiteralPath $secretsPath -Depth 5 -Force

$config = [pscustomobject]@{
  ApiUrl = $apiUrl
  Host = "SERVIDOR"
  ServerPort = 5700
  DatabasePort = 3055
  DatabasePath = "C:\Tek-System\Dados\DadosMC.fdb"
  CompanyIds = @(0, 1)
  TenantId = "imperio"
}
$config | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $configPath -Encoding UTF8
Write-Host "Segredos protegidos pelo Windows (DPAPI) para este usuário e configuração local gravados."

if ($InstallTask) {
  $existingTask = Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
  if ($existingTask) { throw "A tarefa '$taskName' já existe; não a substituí. Revise-a manualmente antes de repetir." }

  $runner = Join-Path $PSScriptRoot "teksystem-sync-run.ps1"
  $powershellPath = (Get-Process -Id $PID).Path
  $taskAction = New-ScheduledTaskAction -Execute $powershellPath `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$runner`"" `
    -WorkingDirectory $projectRoot

  Write-Host "Validando Firebird e endpoint em dry-run; nenhuma informação será gravada no ApontaPRO nesta prova..."
  & $powershellPath -NoProfile -ExecutionPolicy Bypass -File $runner -DryRun
  if ($LASTEXITCODE -ne 0) { throw "A validação não passou. A tarefa horária não foi criada." }

  $trigger = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(5) `
    -RepetitionInterval (New-TimeSpan -Hours 1) `
    -RepetitionDuration (New-TimeSpan -Days 3650)
  $principal = New-ScheduledTaskPrincipal `
    -UserId ([Security.Principal.WindowsIdentity]::GetCurrent().Name) `
    -LogonType Interactive -RunLevel Limited
  $settings = New-ScheduledTaskSettingsSet `
    -MultipleInstances IgnoreNew -StartWhenAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 30)
  $scheduledTask = New-ScheduledTask -Action $taskAction -Trigger $trigger -Principal $principal -Settings $settings
  Register-ScheduledTask -TaskName $taskName -InputObject $scheduledTask | Out-Null
  Write-Host "Tarefa criada: executa a cada hora enquanto este usuário estiver conectado ao Windows."
} else {
  Write-Host "Para validar e instalar a tarefa horária após a rota estar publicada, execute:"
  Write-Host "  powershell -ExecutionPolicy Bypass -File `"$PSScriptRoot\teksystem-sync-setup.ps1`" -InstallTask"
}
