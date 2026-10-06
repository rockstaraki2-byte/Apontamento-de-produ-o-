param([switch]$Prepare, [switch]$CopySecret, [string]$Endpoint)
$ErrorActionPreference = 'Stop'
$agentDir = Join-Path $env:LOCALAPPDATA 'ApontaPRO\TekSystem'
$credentialFile = Join-Path $agentDir 'drive-report-secrets.xml'
New-Item -ItemType Directory -Path $agentDir -Force | Out-Null
if (-not (Test-Path -LiteralPath $credentialFile)) {
  if (-not $Prepare) { throw 'Execute primeiro com -Prepare para gerar o segredo protegido pelo Windows.' }
  $bytes = New-Object byte[] 32
  $rng = [Security.Cryptography.RandomNumberGenerator]::Create()
  try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
  $plain = -join ($bytes | ForEach-Object { $_.ToString('x2') })
  $secure = ConvertTo-SecureString $plain -AsPlainText -Force
  $plain = $null
  $config = [pscustomobject]@{ Endpoint = ''; RootFolderId = '19BxckmRHkPs0C4V1rLHCZ2OgQb0xhhQE';
    Credential = [Management.Automation.PSCredential]::new('TekSystem Drive reports', $secure) }
  $config | Export-Clixml -LiteralPath $credentialFile -Depth 4
} else { $config = Import-Clixml -LiteralPath $credentialFile }
if ($Endpoint) {
  $url = [Uri]$Endpoint
  if ($url.Scheme -ne 'https' -or $url.Host -ne 'script.google.com' -or $url.AbsolutePath -notmatch '^/macros/s/[\w-]+/exec$' -or $url.Query -or $url.UserInfo) { throw 'Informe a URL /exec de um Web App publicado no Google Apps Script.' }
  $config.Endpoint = $url.AbsoluteUri
  $config | Export-Clixml -LiteralPath $credentialFile -Depth 4
  Write-Host 'URL de envio salva. Reinicie a tarefa Imperio PDF Agent para carregar a configuracao.'
}
if ($CopySecret) {
  # Only on explicit local request. Never print a secret or put it in command arguments.
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($config.Credential.Password)
  try { Set-Clipboard -Value ([Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)) }
  finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer) }
  Write-Host 'Segredo copiado para colar em TEKSYSTEM_REPORT_SECRET nas propriedades do script Google. Limpe a area de transferencia apos colar.'
}
Write-Host ('Estado do envio ao Drive: ' + $(if ($config.Endpoint) { 'configurado; validar primeiro envio' } else { 'aguardando publicacao/autorizacao Google' }))
