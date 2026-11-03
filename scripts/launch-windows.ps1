$ErrorActionPreference = 'Stop'
$source = Join-Path $PSScriptRoot '..\build\windows'
if (!(Test-Path (Join-Path $source 'electron.exe'))) {
    throw 'Build the Windows app first with npm run build:windows.'
}
$destination = Join-Path $env:LOCALAPPDATA 'ScreenBrush-Rebuild'
$executable = Join-Path $destination 'electron.exe'
$running = @(Get-Process -Name electron -ErrorAction SilentlyContinue | Where-Object { $_.Path -eq $executable })
$running | Stop-Process -Force
foreach ($item in $running) { if (!$item.WaitForExit(10000)) { throw 'ScreenBrush did not close in time.' } }
New-Item -ItemType Directory -Force -Path $destination | Out-Null
$sourceVersion = Get-Content (Join-Path $source 'version') -Raw
$installedVersionPath = Join-Path $destination 'version'
if ((Test-Path $executable) -and (Test-Path $installedVersionPath) -and ((Get-Content $installedVersionPath -Raw) -eq $sourceVersion)) {
    Copy-Item -Path (Join-Path $source 'resources\app') -Destination (Join-Path $destination 'resources') -Recurse -Force
} else {
    Copy-Item -Path (Join-Path $source '*') -Destination $destination -Recurse -Force
}
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut((Join-Path ([Environment]::GetFolderPath('Desktop')) 'ScreenBrush.lnk'))
$shortcut.TargetPath = $executable
$shortcut.WorkingDirectory = $destination
$shortcut.IconLocation = (Join-Path $destination 'resources\app\assets\icon.ico') + ',0'
$shortcut.Description = 'Dessiner et annoter sur votre ecran'
$shortcut.Save()
$process = Start-Process -FilePath $executable -WorkingDirectory $destination -PassThru
Start-Sleep -Seconds 3
if ($process.HasExited) { throw "ScreenBrush exited with code $($process.ExitCode)" }
Write-Output "ScreenBrush is running natively on Windows. PID: $($process.Id)"
