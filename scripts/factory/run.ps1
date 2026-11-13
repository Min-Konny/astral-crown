param(
    [Parameter(Mandatory=$true)][int]$Issue,
    [Parameter(Mandatory=$true)][string]$Screen,
    [ValidateRange(1,5)][int]$MaxRounds = 3,
    [string]$Base = 'codex/visual-redesign-baseline',
    [string]$ResumeFrom,
    [switch]$DryRun,
    [switch]$Publish
)
$ErrorActionPreference = 'Stop'
$factoryRoot = Split-Path (Split-Path $PSScriptRoot -Parent) -Parent
$runtimeModules = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'
$previous = @{}
foreach ($key in @('ASTRAL_PLAYWRIGHT','ASTRAL_PLAYWRIGHT_CLI','ASTRAL_CHROME')) {
    $previous[$key] = [Environment]::GetEnvironmentVariable($key, 'Process')
}
try {
    if (-not $env:ASTRAL_PLAYWRIGHT) {
        $testCandidates = @((Join-Path $factoryRoot 'node_modules/@playwright/test/index.js'), (Join-Path $runtimeModules 'playwright/test.js'))
        $env:ASTRAL_PLAYWRIGHT = $testCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
    }
    if (-not $env:ASTRAL_PLAYWRIGHT_CLI) {
        $cliCandidates = @((Join-Path $factoryRoot 'node_modules/playwright/cli.js'), (Join-Path $runtimeModules 'playwright/cli.js'))
        $env:ASTRAL_PLAYWRIGHT_CLI = $cliCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
    }
    if (-not $env:ASTRAL_CHROME) {
        $chromeCandidates = @((Join-Path $env:ProgramFiles 'Google/Chrome/Application/chrome.exe'), (Join-Path $env:ProgramFiles 'BraveSoftware/Brave-Browser/Application/brave.exe'))
        $env:ASTRAL_CHROME = $chromeCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
    }
    $factoryArgs = @((Join-Path $PSScriptRoot 'local-loop.mjs'), '--issue', $Issue, '--screen', $Screen, '--max-rounds', $MaxRounds, '--base', $Base)
    if ($DryRun) { $factoryArgs += '--dry-run' }
    if ($ResumeFrom) { $factoryArgs += @('--resume-from', $ResumeFrom) }
    if ($Publish) { $factoryArgs += '--publish' }
    & node @factoryArgs
    $factoryExitCode = $LASTEXITCODE
} finally {
    foreach ($key in $previous.Keys) { [Environment]::SetEnvironmentVariable($key, $previous[$key], 'Process') }
}
exit $factoryExitCode
