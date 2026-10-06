param()
$ErrorActionPreference = "Stop"
$agentDirectory = Join-Path $env:LOCALAPPDATA "ApontaPRO\TekSystem"
$secretsPath = Join-Path $agentDirectory "secrets.xml"
if (-not (Test-Path -LiteralPath $secretsPath)) { throw "Configure o leitor primeiro com teksystem-sync-setup.ps1." }
$secrets = Import-Clixml -LiteralPath $secretsPath
$token = Read-Host "Token dedicado do agente escritor (entrada oculta)" -AsSecureString
if ($token.Length -lt 32) { throw "Use um token aleatório com pelo menos 32 caracteres." }
$writer = [PSCredential]::new("teksystem-writer-agent", $token)
$secrets | Add-Member -MemberType NoteProperty -Name Writer -Value $writer -Force
$backup = Join-Path $agentDirectory ("secrets-backup-{0}.xml" -f (Get-Date -Format yyyyMMddHHmmss))
Copy-Item -LiteralPath $secretsPath -Destination $backup
$secrets | Export-Clixml -LiteralPath $secretsPath -Depth 5
Write-Output "Token protegido por DPAPI salvo para este usuário Windows."
