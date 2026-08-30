# =========================================================
# CONTROLAB IA - CAPTURADOR LOCAL PASIVO (UNIVERSAL)
# =========================================================
# Este script se ejecuta en el PC del analizador (BS-230, BC-5300, etc.)
# Requisitos: Tener instalado Wireshark (Npcap) en el PC local.

# 1. CONFIGURACIÓN
$WebhookUrl = "http://192.168.40.251:5000/api/sniffer/webhook"
$NicIndex = 1  # Índice de la tarjeta de red (Ejecuta 'tshark -D' para ver el listado)
$FilterPorts = "5155 or port 5050" # Puertos a capturar

$TsharkPath = "C:\Program Files\Wireshark\tshark.exe"
if (!(Test-Path $TsharkPath)) {
    $TsharkPath = "tshark" # Probar en el PATH si no está en la ruta por defecto
}

Write-Host "=============================================="
Write-Host "   INICIANDO CAPTURA LOCAL CONTROLAB IA"
Write-Host "=============================================="
Write-Host "IP del Servidor Controlab: $WebhookUrl"
Write-Host "Puertos filtrados: $FilterPorts"
Write-Host "Usando Tshark en: $TsharkPath"
Write-Host "==============================================`n"

# Mostrar interfaces disponibles para ayudar en el diagnóstico
Write-Host "[*] Listando tarjetas de red disponibles (tshark -D):"
& $TsharkPath -D
Write-Host "`n[*] Iniciando captura en la tarjeta #$NicIndex..."

# Configurar el proceso tshark para transmitir la salida en tiempo real
$processInfo = New-Object System.Diagnostics.ProcessStartInfo
$processInfo.FileName = $TsharkPath
$processInfo.Arguments = "-i $NicIndex -f ""tcp port $FilterPorts"" -T fields -e tcp.payload -l"
$processInfo.RedirectStandardOutput = $true
$processInfo.UseShellExecute = $false
$processInfo.CreateNoWindow = $true

$process = New-Object System.Diagnostics.Process
$process.StartInfo = $processInfo

try {
    $process.Start() | Out-Null
} catch {
    Write-Host "[❌ ERROR] No se pudo iniciar tshark. Asegúrate de tener Wireshark instalado y ejecutando PowerShell como Administrador: $_"
    Read-Host "Presiona Enter para salir"
    exit
}

$buffer = ""

# Bucle infinito para leer en vivo
while (!$process.StandardOutput.EndOfStream) {
    $hexLine = $process.StandardOutput.ReadLine().Trim()
    if ($hexLine -ne "") {
        # Quitar dos puntos si vienen en la trama hex
        $hexLine = $hexLine -replace ":", ""
        
        # Convertir Hex a Texto ASCII
        try {
            $bytes = for ($i = 0; $i -lt $hexLine.Length; $i += 2) {
                [Convert]::ToByte($hexLine.Substring($i, 2), 16)
            }
            $asciiText = [System.Text.Encoding]::ASCII.GetString($bytes)
            $buffer += $asciiText
            
            # Si detectamos EOT (Fin de Transmisión, byte 0x04) procesamos la sesión completa
            if ($bytes -contains 4 -or $asciiText -like "*`u{0004}*") {
                $frameToSend = $buffer
                $buffer = "" # Limpiar buffer para la siguiente muestra
                
                # Análisis rápido
                $isQC = $frameToSend.Contains("QC") -or $frameToSend.Contains("|C|") -or $frameToSend.ToLower().Contains("control")
                
                $testName = "RAW_FRAME"
                if ($frameToSend -match "GLU") { $testName = "GLU" }
                elseif ($frameToSend -match "UREA") { $testName = "UREA" }
                elseif ($frameToSend -match "CREA") { $testName = "CREA" }
                elseif ($frameToSend -match "COL") { $testName = "COL" }
                
                $patientId = "UNKNOWN"
                if ($frameToSend -match "P\|.*?\|(.*?)\|") {
                    $patientId = $Matches[1].Trim()
                }
                
                # Construir el JSON
                $body = @{
                    raw_frame = $frameToSend
                    test_name = $testName
                    patient_id = if ($isQC) { "QC_CONTROL" } else { $patientId }
                    is_qc = $isQC
                    timestamp = (Get-Date -Format "yyyy-MM-ddTHH:mm:ss.fffZ")
                } | ConvertTo-Json -Compress
                
                # Enviar al Webhook de Controlab IA en srv-app-01
                try {
                    $response = Invoke-RestMethod -Uri $WebhookUrl -Method Post -Body $body -ContentType "application/json" -TimeoutSec 5
                    Write-Host "[IA] [$(Get-Date -Format 'HH:mm:ss')] ☑ Trama enviada: $testName (QC: $isQC, Paciente: $patientId)"
                } catch {
                    Write-Host "[❌ ERROR Webhook] No se pudo enviar al servidor: $_"
                }
            }
        } catch {
            # Evitar caídas por errores de conversión
            Write-Host "[!] Error decodificando hex local."
        }
    }
}
