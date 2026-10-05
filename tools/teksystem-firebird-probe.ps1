$ErrorActionPreference = "Stop"

$env:TEKSYSTEM_DB_USER = Read-Host "Usuário Firebird"
$securePassword = Read-Host "Senha Firebird" -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)

try {
  $env:TEKSYSTEM_DB_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
  npm.cmd run teksystem:firebird -- probe
  exit $LASTEXITCODE
}
finally {
  [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
  Remove-Item Env:TEKSYSTEM_DB_USER -ErrorAction SilentlyContinue
  Remove-Item Env:TEKSYSTEM_DB_PASSWORD -ErrorAction SilentlyContinue
}
