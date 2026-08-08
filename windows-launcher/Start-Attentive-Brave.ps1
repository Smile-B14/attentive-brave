$ErrorActionPreference = 'Stop'

$packageRoot = Split-Path -Parent $PSScriptRoot
$extensionPath = Join-Path $packageRoot 'standalone-extension'
$profilePath = Join-Path $env:LOCALAPPDATA 'Attentive Brave\User Data'

$candidatePaths = @(
    (Join-Path $env:ProgramFiles 'BraveSoftware\Brave-Browser\Application\brave.exe'),
    (Join-Path ${env:ProgramFiles(x86)} 'BraveSoftware\Brave-Browser\Application\brave.exe'),
    (Join-Path $env:LOCALAPPDATA 'BraveSoftware\Brave-Browser\Application\brave.exe')
)

$bravePath = $candidatePaths |
    Where-Object { $_ -and (Test-Path $_) } |
    Select-Object -First 1

if (-not $bravePath) {
    throw 'Brave Browser was not found. Install Brave first, then run this launcher again.'
}

if (-not (Test-Path $extensionPath)) {
    throw "The Attentive Brave extension was not found at $extensionPath"
}

$arguments = @(
    "--user-data-dir=$profilePath",
    "--disable-extensions-except=$extensionPath",
    "--load-extension=$extensionPath"
)

Start-Process -FilePath $bravePath -ArgumentList $arguments
