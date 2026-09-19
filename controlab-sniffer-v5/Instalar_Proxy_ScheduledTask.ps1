$TaskName = "Controlab_Proxy_V5"
$AppDir = "C:\controlab-desa\controlab-sniffer-v5"
$NodeExe = "C:\Program Files\nodejs\node.exe"
$ScriptPath = "C:\controlab-desa\controlab-sniffer-v5\server.js"

# Create a VBS script to run it hidden
$VbsPath = "$AppDir\RunProxyHidden.vbs"
$VbsCode = "Set WshShell = CreateObject(""WScript.Shell"")`r`n"
$VbsCode += "WshShell.Run chr(34) & ""$NodeExe"" & chr(34) & "" "" & chr(34) & ""$ScriptPath"" & chr(34), 0`r`n"
$VbsCode += "Set WshShell = Nothing"
Set-Content -Path $VbsPath -Value $VbsCode -Encoding UTF8

$Action = New-ScheduledTaskAction -Execute "wscript.exe" -Argument "`"$VbsPath`"" -WorkingDirectory $AppDir
$Trigger = New-ScheduledTaskTrigger -AtStartup
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -User "NT AUTHORITY\SYSTEM" -RunLevel Highest | Out-Null

Write-Host "Proxy Service successfully registered as Scheduled Task!"
