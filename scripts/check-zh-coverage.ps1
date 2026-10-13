#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Reports zh-CN localization coverage for every key the app actually renders.

.DESCRIPTION
    Why this script exists:

    i18n `t()` resolves a key against the selected language and then silently
    falls back to `en` (see `web-app/src/i18n/setup.ts`, the loop over
    `keysToTry`). A key that is missing from `zh-CN` therefore renders in
    ENGLISH with no error, no warning, and no failing test — the app's own
    `i18n/__tests__/keys.test.ts` only asserts that keys resolve in `en`.

    Consequence: grepping zh-CN for English text reports almost nothing, because
    the untranslated strings are not present in the file at all. They are absent.
    Coverage must be measured as a SET DIFFERENCE, which is what this does.

    Two categories are reported separately:

      * MISSING      - the key is absent from zh-CN, so English renders at runtime.
                       This is the real translation backlog.
      * ENGLISH-PROSE- a zh-CN value exists but still holds English sentences.
                       Usually a stale/partial translation.

    Plural `_one`/`_other` variants are excluded from MISSING: Chinese has no
    plural inflection, so zh-CN legitimately stores only the base key. Counting
    them would inflate the backlog with ~18 phantom entries.

    The audit is scoped to keys that appear in source as literal `t('ns:key')`
    calls, because those are provably user-visible. Pass -AllKeys to instead
    report the entire bundle difference.

.PARAMETER Locale
    Target locale directory name under web-app/src/locales. Default zh-CN.

.PARAMETER AllKeys
    Report every key missing from the bundle, not only statically-referenced ones.

.EXAMPLE
    ./scripts/check-zh-coverage.ps1
    ./scripts/check-zh-coverage.ps1 -Locale zh-TW
#>
[CmdletBinding()]
param(
    [string]$Locale = 'zh-CN',
    [switch]$AllKeys
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$localesDir = Join-Path $root 'web-app/src/locales'
$enDir = Join-Path $localesDir 'en'
$tgtDir = Join-Path $localesDir $Locale

if (-not (Test-Path $tgtDir)) { throw "Locale not found: $tgtDir" }

# ---- flatten a PSObject into dotted key paths -------------------------------
function Get-KeyPaths {
    param($Obj, [string]$Prefix)
    $out = New-Object System.Collections.Generic.List[string]
    if ($null -eq $Obj) { return $out }
    if ($Obj -is [string]) { $out.Add($Prefix); return $out }
    if ($Obj -is [System.Management.Automation.PSCustomObject]) {
        foreach ($p in $Obj.PSObject.Properties) {
            foreach ($k in (Get-KeyPaths -Obj $p.Value -Prefix "$Prefix.$($p.Name)")) { $out.Add($k) }
        }
        return $out
    }
    if ($Obj -is [System.Collections.IEnumerable]) {
        $i = 0
        foreach ($item in $Obj) {
            foreach ($k in (Get-KeyPaths -Obj $item -Prefix "$Prefix[$i]")) { $out.Add($k) }
            $i++
        }
        return $out
    }
    return $out
}

function Get-ValueAt {
    param($Obj, [string]$Path)
    $cur = $Obj
    foreach ($part in ($Path.TrimStart('.') -split '\.')) {
        if ($part -match '^\[(\d+)\]$') {
            $idx = [int]$Matches[1]
            if ($null -eq $cur -or $idx -ge $cur.Count) { return $null }
            $cur = $cur[$idx]
        }
        else {
            if ($null -eq $cur -or -not ($cur.PSObject.Properties.Name -contains $part)) { return $null }
            $cur = $cur.$part
        }
    }
    return $cur
}

# ---- keys literally referenced as t('ns:key') in source ---------------------
function Get-ReferencedKeys {
    $src = Join-Path $root 'web-app/src'
    $files = Get-ChildItem -Path $src -Recurse -Include *.ts, *.tsx -File |
        Where-Object { $_.FullName -notmatch '__tests__|node_modules|\.test\.' }
    $set = @{}
    foreach ($f in $files) {
        $text = Get-Content $f.FullName -Raw -Encoding UTF8
        foreach ($m in [regex]::Matches($text, "t\(\s*['""]([a-zA-Z0-9_-]+):([a-zA-Z0-9_.]+)['""]")) {
            $set["$($m.Groups[1].Value):$($m.Groups[2].Value)"] = $true
        }
    }
    return $set
}

$referenced = Get-ReferencedKeys
Write-Host "Locale under audit : $Locale"
Write-Host "Referenced keys    : $($referenced.Count) literal t('ns:key') call sites"
Write-Host ''

$enFiles = Get-ChildItem $enDir -Filter *.json | Select-Object -ExpandProperty Name
$rows = @()
$totalMissing = 0
$totalProse = 0

foreach ($fn in $enFiles) {
    $enJson = Get-Content (Join-Path $enDir $fn) -Raw -Encoding UTF8 | ConvertFrom-Json
    $tgtPath = Join-Path $tgtDir $fn
    if (-not (Test-Path $tgtPath)) {
        $rows += [pscustomobject]@{ File = $fn; Missing = (Get-KeyPaths $enJson '').Count; Prose = 0; Note = 'no zh file' }
        continue
    }
    $tgtJson = Get-Content $tgtPath -Raw -Encoding UTF8 | ConvertFrom-Json

    $ns = [System.IO.Path]::GetFileNameWithoutExtension($fn)
    $enKeys = Get-KeyPaths $enJson ''
    $tgtKeys = Get-KeyPaths $tgtJson ''
    $tgtSet = @{}; foreach ($k in $tgtKeys) { $tgtSet[$k] = $true }

    $missing = @()
    foreach ($k in $enKeys) {
        if ($tgtSet.ContainsKey($k)) { continue }
        # Chinese has no plural forms; base key suffices.
        if ($k -match '_(one|other|two|few|many|zero)$') { continue }
        if (-not $AllKeys) {
            $lookup = "$ns`:$($k.TrimStart('.'))"
            $singular = $lookup -replace '\.[^.]+$', ''
            if (-not $referenced.ContainsKey($lookup)) { continue }
        }
        $missing += $k
    }

    # zh-CN value exists but is still English prose.
    $prose = @()
    foreach ($k in $tgtKeys) {
        $v = Get-ValueAt $tgtJson $k
        if ($v -isnot [string]) { continue }
        if ($v.Length -lt 4) { continue }
        # A bare URL/endpoint/placeholder is not prose and needs no translation
        # (e.g. provider.baseUrlPlaceholder = "https://your-endpoint/v1").
        if ($v -match '^\s*(https?://|/|\.|[A-Za-z]:\\)') { continue }
        if ($v -match '^[\s\W\d]*$') { continue }
        if ($v -match '\{\{') { $v = $v -replace '\{\{[^}]*\}\}', '' }
        $cjk = ([regex]::Matches($v, '[\u4e00-\u9fff]')).Count
        if ($cjk -gt 0) { continue }
        if ($v -match '\b(the|and|to|of|is|are|you|your|for|with|this|that|will|can|not|from|when|only|have|has|been|available|failed|please|try|use|using)\b') {
            $prose += $k
        }
    }

    if ($missing.Count -gt 0 -or $prose.Count -gt 0) {
        $rows += [pscustomobject]@{
            File    = $fn
            Missing = $missing.Count
            Prose   = $prose.Count
            Note    = ''
        }
    }
    $totalMissing += $missing.Count
    $totalProse += $prose.Count
}

$rows | Sort-Object Missing -Descending | Format-Table -AutoSize

Write-Host ""
Write-Host "MISSING (render in English at runtime) : $totalMissing"
Write-Host "ENGLISH-PROSE (present but untranslated): $totalProse"
Write-Host "TOTAL backlog                          : $($totalMissing + $totalProse)"
Write-Host ""
if (-not $AllKeys) {
    Write-Host "Scope: only keys with a literal t('ns:key') call site. Use -AllKeys for the full bundle diff."
}
if ($totalMissing + $totalProse -gt 0) { exit 1 } else { Write-Host "Coverage complete." -ForegroundColor Green; exit 0 }
