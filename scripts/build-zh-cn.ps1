#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Builds the localized Jan fork against a China-accessible HuggingFace mirror.

.DESCRIPTION
    Two compile-time env vars control the download mirror
    (see `src-tauri/src/core/downloads/helpers.rs`):

      JAN_HF_MIRROR_PREFIX      mirror base URL
      JAN_HF_MIRROR_STRIP_HOST  drop the `huggingface.co` path segment

    They must be set TOGETHER and correctly. Setting only the prefix produces
    URLs that hf-mirror.com answers with 404, and Jan then silently falls back
    to huggingface.co — so the failure looks like "slow downloads" rather than a
    misconfiguration. This script exists so the pair is applied consistently,
    and it refuses to build unless the mirror first passes a live check.

.PARAMETER VerifyOnly
    Run the mirror check and stop, without building.

.PARAMETER SkipVerify
    Build without the live mirror check. For offline/CI use only.

.PARAMETER Proxy
    Optional HTTP proxy for the verification request, e.g. http://127.0.0.1:7890.

.EXAMPLE
    ./scripts/build-zh-cn.ps1
    ./scripts/build-zh-cn.ps1 -VerifyOnly
#>
[CmdletBinding()]
param(
    [switch]$VerifyOnly,
    [switch]$SkipVerify,
    [string]$Proxy
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot

# hf-mirror.com: reachable from mainland China without a proxy, and serves the
# HuggingFace path layout directly (hence the host-strip flag).
$mirrorPrefix = 'https://hf-mirror.com'
$stripHost = $true

if (-not $SkipVerify) {
    Write-Host '==> Verifying the mirror before building' -ForegroundColor Cyan
    $verify = Join-Path $PSScriptRoot 'verify-hf-mirror.ps1'
    $verifyArgs = @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $verify, '-MirrorPrefix', "$mirrorPrefix/")
    if ($stripHost) { $verifyArgs += '-StripHost' }
    if ($Proxy) { $verifyArgs += @('-Proxy', $Proxy) }

    & powershell @verifyArgs
    if ($LASTEXITCODE -ne 0) {
        Write-Host ''
        Write-Host 'Mirror check failed; refusing to build a fork whose downloads would 404.' -ForegroundColor Red
        Write-Host 'Fix the mirror settings, or pass -SkipVerify to build anyway.' -ForegroundColor Red
        exit 1
    }
}

if ($VerifyOnly) {
    Write-Host 'VerifyOnly: mirror is reachable. Not building.' -ForegroundColor Green
    exit 0
}

$env:JAN_HF_MIRROR_PREFIX = $mirrorPrefix
if ($stripHost) { $env:JAN_HF_MIRROR_STRIP_HOST = '1' } else { Remove-Item Env:JAN_HF_MIRROR_STRIP_HOST -ErrorAction SilentlyContinue }

# The webview makes its own direct HuggingFace API calls (Hub search, token
# validation) that never reach the Rust download mirror, so it needs its own
# override. Vite injects this as HF_API_BASE_URL.
$env:HF_API_BASE_URL = $mirrorPrefix

# The model catalog itself is fetched from raw.githubusercontent.com, which is
# also unreachable in mainland China. Point it at a mirror or a self-hosted copy
# when you have one; otherwise the Hub list renders empty.
if (-not $env:MODEL_CATALOG_URL) {
    Write-Host 'NOTE: MODEL_CATALOG_URL is unset; the app will try raw.githubusercontent.com,' -ForegroundColor Yellow
    Write-Host '      which is unreachable in mainland China, so the model list may be empty.' -ForegroundColor Yellow
    Write-Host '      Set it to a mirror or self-hosted copy of model_catalog_v2.json.' -ForegroundColor Yellow
}

Write-Host ''
Write-Host '==> Building with:' -ForegroundColor Cyan
Write-Host "    JAN_HF_MIRROR_PREFIX     = $env:JAN_HF_MIRROR_PREFIX"
Write-Host "    JAN_HF_MIRROR_STRIP_HOST = $(if ($env:JAN_HF_MIRROR_STRIP_HOST) { $env:JAN_HF_MIRROR_STRIP_HOST } else { '(unset)' })"
Write-Host "    HF_API_BASE_URL          = $env:HF_API_BASE_URL"
Write-Host "    MODEL_CATALOG_URL        = $(if ($env:MODEL_CATALOG_URL) { $env:MODEL_CATALOG_URL } else { '(default: raw.githubusercontent.com)' })"
Write-Host ''

Push-Location $root
try {
    # `yarn` is this repo's package manager (see .yarnrc.yml / yarn.lock).
    & yarn install
    if ($LASTEXITCODE -ne 0) { throw "yarn install failed ($LASTEXITCODE)" }

    & yarn tauri build
    if ($LASTEXITCODE -ne 0) { throw "yarn tauri build failed ($LASTEXITCODE)" }
}
finally {
    Pop-Location
}

Write-Host ''
Write-Host 'Build finished. Artifacts are under src-tauri/target/release/bundle/.' -ForegroundColor Green
