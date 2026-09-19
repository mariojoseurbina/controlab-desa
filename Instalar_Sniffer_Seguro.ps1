$TaskName = "Controlab_IA_Sniffer_Original"
$AppDir = "C:\controlab-desa"
$ExePath = "C:\controlab-desa\wpcap_sniffer_final_loopback.exe"
$Args = "--url `"http://192.168.40.251:5000/api/sniffer/webhook`""

$Action = New-ScheduledTaskAction -Execute $ExePath -Argument $Args -WorkingDirectory $AppDir
$Trigger = New-ScheduledTaskTrigger -AtStartup
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -User "NT AUTHORITY\SYSTEM" -RunLevel Highest | Out-Null

Write-Host "Instalado correctamente."
