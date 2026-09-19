Set WshShell = CreateObject("WScript.Shell")
WshShell.Run chr(34) & "C:\Program Files\nodejs\node.exe" & chr(34) & " " & chr(34) & "C:\controlab-desa\controlab-sniffer-v5\server.js" & chr(34), 0
Set WshShell = Nothing
