Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\controlab-desa"
WshShell.Run """C:\controlab-desa\wpcap_sniffer_final_loopback.exe""", 0, False
