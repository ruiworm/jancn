#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Verifies that the configured HuggingFace mirror serves the URLs Jan generates.

.DESCRIPTION
    Jan rewrites HuggingFace download URLs through a mirror prefix before
    fetching them (see `src-tauri/src/core/downloads/helpers.rs`). Reverse
    proxies differ in whether they expect the original host as a path segment:

      * upstream apps.jan.ai  -> expects  /{host}/{path}
      * hf-mirror.com         -> expects  /{path}          (404s on /{host}/{path})

    This script rebuilds the URL the Rust code produces for the given layout and
    checks that the mirror answers it. It validates the *mirror*, so it catches a
    wrong host-strip setting before a multi-gigabyte download is attempted.

    Run this before building a localized fork, and after changing the mirror.

.PARAMETER MirrorPrefix
    Mirror base URL including trailing slash. Default https://hf-mirror.com/

.PARAMETER StripHost
    Omit the `huggingface.co` host segment. Required for hf-mirror.com.
    Omit for the upstream Jan mirror layout.

.PARAMETER Proxy
    Optional HTTP proxy, e.g. http://127.0.0.1:7890. hf-mirror.com is reachable
    from mainland China without a proxy; a proxy is only needed elsewhere.

.EXAMPLE
    ./scripts/verify-hf-mirror.ps1
    ./scripts/verify-hf-mirror.ps1 -MirrorPrefix https://hf-mirror.com/ -StripHost
#>
[CmdletBinding()]
param(
    [string]$MirrorPrefix = 'https://hf-mirror.com/',
    [switch]$StripHost,
    [string]$Proxy
)

$ErrorActionPreference = 'Stop'

if (-not $MirrorPrefix.EndsWith('/')) { $MirrorPrefix = "$MirrorPrefix/" }
if ($Proxy) {
    $env:HTTPS_PROXY = $Proxy
    $env:HTTP_PROXY = $Proxy
}

# Real, small, publicly downloadable artifacts so the check exercises the same
# code path a model download uses (resolve/main + Range) rather than a landing page.
$checks = @(
    @{
        Name      = 'model file (Range request, drives resume support)'
        Url       = 'https://huggingface.co/second-state/All-MiniLM-L6-v2-Embedding-GGUF/resolve/main/all-MiniLM-L6-v2-ggml-model-f16.gguf'
        Range     = '0-1023'
        # 206 = partial content served, so resumable downloads work.
        Expect    = @(200, 206)
    }
    @{
        Name      = 'HF API metadata (blobs=true, drives model listing)'
        Url       = 'https://huggingface.co/api/models/microsoft/DialoGPT-medium?blobs=true&files_metadata=true'
        Range     = $null
        Expect    = @(200)
    }
    @{
        Name      = 'non-mirrored host must NOT be rewritten'
        Url       = 'https://example.com/file.bin'
        Range     = $null
        Expect    = @(404, 403)
        Skip      = $true
    }
)

function Convert-ToMirrorUrl {
    param([string]$Url, [string]$Prefix, [bool]$Strip)

    $parsed = [uri]$Url
    $host_ = $parsed.Host
    $withoutScheme = $Url -replace '^https?://', ''

    $path = if ($Strip) {
        if ($withoutScheme.StartsWith($host_)) {
            $withoutScheme.Substring($host_.Length).TrimStart('/')
        } else {
            $withoutScheme
        }
    } else {
        $withoutScheme
    }
    return "$Prefix$path"
}

Write-Host "Mirror prefix : $MirrorPrefix"
Write-Host "Strip host    : $([bool]$StripHost)"
Write-Host "Proxy         : $(if ($Proxy) { $Proxy } else { '(none)' })"
Write-Host ''

$failures = 0
foreach ($c in $checks) {
    if ($c.Skip) { continue }

    $target = Convert-ToMirrorUrl -Url $c.Url -Prefix $MirrorPrefix -Strip ([bool]$StripHost)
    Write-Host "-- $($c.Name)"
    Write-Host "   $target"

    $args = @('-sS', '-o', 'NUL', '-w', '%{http_code}', '--max-time', '45', '-L')
    if ($c.Range) { $args += @('--range', $c.Range) }
    $args += $target

    $code = & curl.exe @args 2>&1
    $code = "$code".Trim()

    if ($c.Expect -contains [int]$code) {
        Write-Host "   OK   HTTP $code" -ForegroundColor Green
    } else {
        Write-Host "   FAIL HTTP $code (expected $($c.Expect -join ' or '))" -ForegroundColor Red
        $failures++
    }
    Write-Host ''
}

if ($failures -gt 0) {
    Write-Host "RESULT: $failures check(s) failed." -ForegroundColor Red
    if (-not $StripHost) {
        Write-Host "Hint: hf-mirror.com requires -StripHost (build with JAN_HF_MIRROR_STRIP_HOST=1)." -ForegroundColor Yellow
    } else {
        Write-Host "Hint: try without -StripHost if targeting apps.jan.ai." -ForegroundColor Yellow
    }
    exit 1
}

Write-Host 'RESULT: all checks passed.' -ForegroundColor Green
Write-Host ''
Write-Host 'Build the localized fork with:'
if ($StripHost) {
    Write-Host "  `$env:JAN_HF_MIRROR_PREFIX = '$($MirrorPrefix.TrimEnd('/'))'"
    Write-Host "  `$env:JAN_HF_MIRROR_STRIP_HOST = '1'"
}
exit 0
