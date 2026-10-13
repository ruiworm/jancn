#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Runs the extracted-logic verification suites for the localized fork.

.DESCRIPTION
    Why these exist separately from the real crate tests:

    `cargo test` inside `src-tauri/` cannot complete in every environment
    because transitive TLS crates (`ring`, `aws-lc-sys`) compile C sources via
    cc-rs and fail under some MSVC setups — with `error D8050` when the cl.exe
    invocation is very long, or `C1083: stdint.h not found` when the MSVC
    environment (`vcvars64.bat`) was never initialized. Neither failure has
    anything to do with the changes here, but both block `cargo test` entirely.

    So the pure logic units are extracted verbatim into small dependency-light
    crates under `verify/`, which the compiler can build and execute anywhere.
    They assert the same behaviours the in-repo unit tests do, and additionally
    cover the compile-time env-var permutations (`option_env!` values can only be
    exercised by recompiling, which is exactly what this script does).

    The scripts in `scripts/` cover the remaining layers:
      * verify-hf-mirror.ps1   - live network check against the real mirror
      * check-zh-coverage.ps1  - locale key coverage
      * build-zh-cn.ps1        - wired build that runs the mirror check first

.EXAMPLE
    ./verify/run.ps1
    ./verify/run.ps1 -Proxy http://127.0.0.1:7890
#>
[CmdletBinding()]
param(
    [string]$Proxy,
    [switch]$SkipNetwork
)

$ErrorActionPreference = 'Stop'
$verify = $PSScriptRoot
$repo = Split-Path -Parent $verify

if ($Proxy) {
    $env:HTTPS_PROXY = $Proxy
    $env:HTTP_PROXY = $Proxy
}

$failed = 0
$totalPassed = 0

function Section($title) {
    Write-Host ''
    Write-Host "=== $title ===" -ForegroundColor Cyan
}

function RunCrate {
    param([string]$Dir, [string]$Label, [hashtable]$EnvVars)

    Section $Label
    Push-Location $Dir
    try {
        foreach ($k in $EnvVars.Keys) {
            if ($null -eq $EnvVars[$k]) {
                Remove-Item "Env:$k" -ErrorAction SilentlyContinue
            } else {
                Set-Item -Path "Env:$k" -Value $EnvVars[$k]
            }
        }
        # option_env!/env! are read at COMPILE time, so the crate must be
        # recompiled for each configuration; cargo's cache would otherwise
        # silently reuse the previous build and report "0 tests".
        $out = cargo test --quiet 2>&1 | Out-String

        # Judge only on the "test result:" lines. Matching loosely on the word
        # "error" or on stderr text produces false failures: cargo prints a
        # harmless "running 0 tests" doc-test section, and PowerShell renders
        # cargo's stderr as ErrorRecord text even for successful runs.
        $results = @($out -split "`r?`n" | Select-String 'test result:' | ForEach-Object { $_.Line.Trim() })
        $passed = 0
        $failedCount = 0
        foreach ($r in $results) {
            if ($r -match '(\d+) passed') { $passed += [int]$Matches[1] }
            if ($r -match '(\d+) failed') { $failedCount += [int]$Matches[1] }
        }

        foreach ($r in $results) { Write-Host "  $r" }

        if ($failedCount -gt 0) {
            Write-Host $out
            $script:failed++
        }
        elseif ($passed -eq 0) {
            Write-Host '  NO TESTS RAN — this configuration was not actually exercised.' -ForegroundColor Red
            $script:failed++
        }
        else {
            $script:totalPassed += $passed
        }
    }
    finally {
        Pop-Location
    }
}

RunCrate -Dir (Join-Path $verify 'mirror') -Label 'mirror rewrite — upstream default (no env vars)' -EnvVars @{
    JAN_HF_MIRROR_PREFIX    = $null
    JAN_HF_MIRROR_STRIP_HOST = $null
}

RunCrate -Dir (Join-Path $verify 'mirror') -Label 'mirror rewrite — hf-mirror, prefix WITHOUT trailing slash' -EnvVars @{
    JAN_HF_MIRROR_PREFIX    = 'https://hf-mirror.com'
    JAN_HF_MIRROR_STRIP_HOST = '1'
}

RunCrate -Dir (Join-Path $verify 'mirror') -Label 'mirror rewrite — hf-mirror, prefix WITH trailing slash' -EnvVars @{
    JAN_HF_MIRROR_PREFIX    = 'https://hf-mirror.com/'
    JAN_HF_MIRROR_STRIP_HOST = '1'
}

# The case that a blank GitHub Actions input actually produces. The empty
# variant cannot be exported as "" (that is the bug being guarded against), so
# the run below leaves both unset and relies on the same assertion; the guard
# inside the test fails loudly if the harness ever does export an empty string.
RunCrate -Dir (Join-Path $verify 'mirror') -Label 'mirror rewrite — blank inputs (no mirror configured)' -EnvVars @{
    JAN_HF_MIRROR_PREFIX    = $null
    JAN_HF_MIRROR_STRIP_HOST = $null
}

RunCrate -Dir (Join-Path $verify 'tray') -Label 'tray language mapping' -EnvVars @{}

Section 'HF API base resolution (node)'
$js = Join-Path $verify 'hf-endpoint/verify.js'
& node $js
if ($LASTEXITCODE -ne 0) { $failed++ }

if (-not $SkipNetwork) {
    Section 'live mirror reachability'
    $vm = Join-Path $repo 'scripts/verify-hf-mirror.ps1'
    if (Test-Path $vm) {
        $a = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $vm, '-MirrorPrefix', 'https://hf-mirror.com/', '-StripHost')
        if ($Proxy) { $a += @('-Proxy', $Proxy) }
        & powershell @a
        if ($LASTEXITCODE -ne 0) {
            Write-Host '  (network check failed — mirror may be unreachable from here)' -ForegroundColor Yellow
        }
    }
}

Section 'result'
if ($failed -gt 0) {
    Write-Host "$failed suite(s) FAILED" -ForegroundColor Red
    exit 1
}
Write-Host "All extracted-logic suites passed ($totalPassed assertions)." -ForegroundColor Green
exit 0
