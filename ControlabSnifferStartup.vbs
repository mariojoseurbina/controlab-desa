Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\controlab-desa"
WshShell.Run """C:\controlab-desa\wpcap_sniffer_final_loopback.exe"" --url ""http://192.168.40.251:5000/api/sniffer/webhook""", 0, False
