# =========================================================
# CONTROLAB IA - INSTALADOR DE INTERFAZ PASIVA DE EQUIPOS
# =========================================================
# Este script registra el capturador de tramas como una Tarea Programada
# de Windows para que corra en segundo plano a nivel de SYSTEM
# y se inicie automáticamente al encender el PC sin intervención.

$InstallDir = "C:\Controlab\Sniffer"
$ScriptPath = "$InstallDir\wpcap_sniffer_final_loopback.exe"
$TaskName = "Controlab_IA_Sniffer"

Write-Host "=============================================="
Write-Host " INSTALADOR DE INTERFAZ UNICA - CONTROLAB IA"
Write-Host "=============================================="

# 1. Crear carpeta destino local en el PC
if (!(Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
    Write-Host "[✔] Carpeta creada: $InstallDir"
}

# 2. Copiar script principal a la ubicación final
$SourceScript = Join-Path $PSScriptRoot "wpcap_sniffer_final_loopback.exe"
if (Test-Path $SourceScript) {
    Copy-Item -Path $SourceScript -Destination $ScriptPath -Force
    Write-Host "[✔] Copiado capturador a: $ScriptPath"
} else {
    Write-Host "[❌ ERROR] No se encontró el archivo wpcap_sniffer_final_loopback.exe en el origen."
    exit
}

# 3. Crear y registrar la Tarea Programada en Windows
Write-Host "[*] Registrando Tarea Programada en Windows..."

# Configurar el comando para que corra PowerShell en modo oculto e ignore políticas
$Action = New-ScheduledTaskAction -Execute "$ScriptPath"

# Disparador: Al iniciar el sistema (Boot) para que no requiera inicio de sesión
$Trigger = New-ScheduledTaskTrigger -AtStartup

# Configuración: Permitir ejecución indefinida, reiniciar si falla, y prioridad alta
$Settings = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)

# Registrar la tarea como SYSTEM (nivel más alto de privilegios y oculta)
try {
    # Eliminar tarea vieja si existe
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue

    Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -User "NT AUTHORITY\SYSTEM" -RunLevel Highest | Out-Null
    
    # Iniciar la tarea de inmediato
    Start-ScheduledTask -TaskName $TaskName
    
    Write-Host "`n=============================================="
    Write-Host "  ¡INSTALACIÓN COMPLETADA CON ÉXITO!"
    Write-Host "=============================================="
    Write-Host "1. La interfaz ya está ejecutándose de fondo."
    Write-Host "2. Iniciará sola cada vez que se encienda el PC."
    Write-Host "3. El operador no verá ninguna ventana abierta."
    Write-Host "=============================================="
} catch {
    Write-Host "[❌ ERROR] No se pudo registrar la tarea. Asegúrate de correr este script como Administrador: $_"
}

Read-Host "Presiona Enter para finalizar"
