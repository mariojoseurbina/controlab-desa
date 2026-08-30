# -*- coding: utf-8 -*-
"""
CONTROLAB IA - Universal Automated Network Sniffer (CANS-PCAP)
Versión v15 - Auto-detección de interfaces y puertos
"""

import sys
import os
import json
import socket
import requests
from datetime import datetime

# Importación segura de Scapy
try:
    from scapy.all import sniff, TCP, IP, Raw
except ImportError:
    print("❌ Error: Se requiere la librería 'scapy'. Instálala con: pip install scapy")
    sys.exit(1)

# ─── Configuración Automática ──────────────────────────────────────────────
API_URL = "http://localhost:5000/api/sniffer/webhook"

# Lista de puertos LIS más comunes usados por los analizadores en el mercado
COMMON_LIS_PORTS = [5000, 5001, 5002, 5003, 5004, 5005, 5100, 6001, 9100, 12000]

# Palabras clave para auto-detección de Controles de Calidad (QC)
QC_KEYWORDS = ["qc", "ctrl", "control", "clim", "norm", "abnorm", "path", "e-check", "xn-check", "precinorm", "precipath", "standard"]
CAL_KEYWORDS = ["cal", "calib", "std", "estandar", "standard", "cfas"]

# ─── Reconstrucción de Tramas por Conexión ──────────────────────────────────
# Mantiene los fragmentos TCP de cada conexión para reensamblar tramas ASTM completas
connections_buffer = {}

def get_connection_key(packet):
    """Genera una clave única para la conexión TCP"""
    ip_src = packet[IP].src
    ip_dst = packet[IP].dst
    sport = packet[TCP].sport
    dport = packet[TCP].dport
    # Ordenar para emparejar ida y vuelta
    if ip_src < ip_dst:
        return f"{ip_src}:{sport}->{ip_dst}:{dport}"
    else:
        return f"{ip_dst}:{dport}->{ip_src}:{sport}"

def clean_astm_text(text):
    """Limpia caracteres de control de la trama ASTM"""
    # STX=0x02, ETX=0x03, EOT=0x04, ENQ=0x05, ACK=0x06
    for char in ['\x02', '\x03', '\x04', '\x05', '\x06']:
        text = text.replace(char, '')
    return text

def parse_astm_fields(raw_text):
    """Extrae código de prueba, ID de paciente y tipo de orden de la trama ASTM"""
    lines = raw_text.replace('\r\n', '\n').replace('\r', '\n').split('\n')
    
    patient_id = "UNKNOWN"
    patient_name = ""
    test_name = None
    test_id = None
    order_type = "NORMAL"

    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        # Quitar número de frame ASTM si existe al inicio
        if line[0].isdigit():
            line = line[1:]
            
        parts = line.split('|')
        if len(parts) < 2:
            continue
            
        record_type = parts[0].upper()
        
        if record_type == 'P':
            patient_id = parts[2].strip() if len(parts) > 2 else "UNKNOWN"
            patient_name = parts[5].strip().replace('^', ' ') if len(parts) > 5 else ""
            if not patient_id:
                patient_id = "UNKNOWN"
                
        elif record_type == 'O':
            priority = parts[5].upper() if len(parts) > 5 else ""
            if priority == 'Q':
                order_type = "QC"
            elif priority == 'C':
                order_type = "CALIBRACION"
                
        elif record_type == 'R':
            test_code_raw = parts[2].strip() if len(parts) > 2 else ""
            test_parts = test_code_raw.split('^')
            test_id = test_parts[0].replace(' ', '').upper()
            test_name = test_parts[3].strip() if len(test_parts) > 3 else test_parts[0].strip()
            
            # Si encontramos un resultado válido, salimos del parseo
            if test_name:
                break
                
    return patient_id, patient_name, test_name or test_id, test_id, order_type

def process_full_frame(raw_text, equipo_ip):
    """Analiza la trama reensamblada y envía el webhook al backend"""
    raw_clean = clean_astm_text(raw_text)
    if len(raw_clean.strip()) < 5:
        return

    patient_id, patient_name, test_name, test_id, order_type = parse_astm_fields(raw_clean)

    if not test_name:
        return

    # Clasificación Automática de Tipo de Corrida
    pid_lower = patient_id.lower()
    name_lower = patient_name.lower()
    raw_lower = raw_clean.lower()

    is_qc = order_type == "QC" or any(k in pid_lower or k in name_lower for k in QC_KEYWORDS)
    is_cal = order_type == "CALIBRACION" or any(k in pid_lower or k in name_lower for k in CAL_KEYWORDS)

    # Si es numérico simple de 1 a 6 dígitos, evitamos falsos positivos del texto completo
    if not pid_lower.isdigit() or len(pid_lower) > 6:
        if not is_qc and any(k in raw_lower for k in QC_KEYWORDS):
            is_qc = True
        if not is_cal and any(k in raw_lower for k in CAL_KEYWORDS):
            is_cal = True

    payload = {
        "raw_frame": raw_clean[:2000],
        "test_name": test_name,
        "test_id_equipo": test_id,
        "patient_id": patient_id,
        "is_qc": is_qc,
        "is_calibracion": is_cal,
        "is_repeticion": False, # Se auto-detecta en el backend
        "equipo_origen": equipo_ip,
        "timestamp": datetime.now().isoformat()
    }

    icon = "🔵" if is_cal else "🟡" if is_qc else "🟢"
    tipo = "CALIBRACION" if is_cal else "QC" if is_qc else "NORMAL"
    print(f"{icon} [{tipo}] Capturada prueba '{test_name}' desde IP: {equipo_ip}")

    try:
        res = requests.post(API_URL, json=payload, timeout=2)
        print(f"   ↳ Backend: {res.status_code} - {res.json().get('message')}")
    except Exception as e:
        print(f"   ↳ ❌ Error de conexión al backend: {e}")

def packet_callback(packet):
    """Callback ejecutado por Scapy para cada paquete TCP interceptado"""
    if not packet.haslayer(Raw):
        return

    try:
        payload = packet[Raw].load.decode('latin1')
        conn_key = get_connection_key(packet)
        equipo_ip = packet[IP].src

        if conn_key not in connections_buffer:
            connections_buffer[conn_key] = ""

        connections_buffer[conn_key] += payload

        # Si detectamos el carácter de fin de trama ASTM (EOT = 0x04) o fin de log L|
        if '\x04' in payload or '\nL|' in payload or '\rL|' in payload:
            full_frame = connections_buffer[conn_key]
            connections_buffer[conn_key] = "" # Limpiar buffer
            process_full_frame(full_frame, equipo_ip)

    except Exception as e:
        pass

# ─── Inicialización del Sniffer ─────────────────────────────────────────────
if __name__ == "__main__":
    print("="*60)
    print("🤖 CONTROLAB IA - SNIFFER AUTO-CONFIGURABLE v15")
    print("="*60)
    print("► Escuchando en TODAS las tarjetas de red de la PC...")
    
    # Generar el filtro PCAP dinámicamente con los puertos comunes
    ports_filter = " or ".join([f"port {p}" for p in COMMON_LIS_PORTS])
    pcap_filter = f"tcp and ({ports_filter})"
    
    print(f"► Filtro de Puertos Activo: {ports_filter}")
    print("─"*60)

    try:
        # Al no especificar 'iface', Scapy escucha en TODAS las interfaces automáticamente
        sniff(filter=pcap_filter, prn=packet_callback, store=0)
    except KeyboardInterrupt:
        print("\n👋 Sniffer detenido por el usuario.")
        sys.exit(0)
    except Exception as e:
        print(f"\n❌ Error fatal al iniciar la captura: {e}")
        print("Asegúrate de ejecutar el programa como ADMINISTRADOR y tener Npcap instalado.")
        sys.exit(1)
