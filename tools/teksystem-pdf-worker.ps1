$ErrorActionPreference = 'Continue'
[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding($false)
$OutputEncoding = [Console]::OutputEncoding
$env:Path = "C:\Program Files\GitHub CLI;C:\Program Files\nodejs;$env:Path"
$projectPath = Split-Path -Parent $PSScriptRoot
$agentDir = Join-Path $env:LOCALAPPDATA 'ApontaPRO\TekSystem'
$logPath = Join-Path $agentDir 'pdf-worker'
New-Item -ItemType Directory -Path $logPath -Force | Out-Null
Set-Location -LiteralPath $projectPath
# Preserve the old worker's command history and optional configuration; do not touch its checkout.
$legacyTools = Join-Path $env:LOCALAPPDATA 'ImperioPdfAgent\repo\tools'
$env:IMPERIO_PDF_AGENT_STATE_PATH = Join-Path $legacyTools '.order-pdf-agent-state.json'
$env:IMPERIO_PDF_AGENT_CONFIG_PATH = Join-Path $legacyTools 'order-pdf-agent.config.json'
$driveFile = Join-Path $agentDir 'drive-report-secrets.xml'
while ($true) {
  try {
    if (Test-Path -LiteralPath $driveFile) {
      $drive = Import-Clixml -LiteralPath $driveFile
      $env:TEKSYSTEM_REPORT_ENDPOINT = [string]$drive.Endpoint
      $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($drive.Credential.Password)
      try { $env:TEKSYSTEM_REPORT_SECRET = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer) }
      finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
    }
    & 'C:\Program Files\nodejs\node.exe' (Join-Path $PSScriptRoot 'order-pdf-agent.mjs') *>&1 |
      Out-File -LiteralPath (Join-Path $logPath 'worker.log') -Append -Encoding UTF8
  } finally {
    Remove-Item Env:TEKSYSTEM_REPORT_SECRET,Env:TEKSYSTEM_REPORT_ENDPOINT -ErrorAction SilentlyContinue
  }
  Add-Content -LiteralPath (Join-Path $logPath 'worker.log') -Encoding UTF8 -Value "[$(Get-Date -Format o)] Agente encerrado. Nova tentativa em 15 segundos."
  Start-Sleep -Seconds 15
}
