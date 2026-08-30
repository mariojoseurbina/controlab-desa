; Script de Inno Setup para el instalador único de Controlab-IA
; Autor: Antigravity IDE
; Versión: 1.0.0

[Setup]
AppName=Controlab-IA
AppVersion=1.0.0
AppPublisher=Controlab IA
DefaultDirName={commonpf}\Controlab-IA
DefaultGroupName=Controlab-IA
DisableProgramGroupPage=yes
UninstallDisplayIcon={app}\logo-controlab-ia.ico
OutputDir=c:\controlab-ia\dist
OutputBaseFilename=Setup_Controlab_IA
SetupIconFile=c:\controlab-ia\logo-controlab-ia.ico
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern

[Languages]
Name: "spanish"; MessagesFile: "compiler:Languages\Spanish.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
; Backend (Incluyendo node_modules para soporte 100% offline)
Source: "c:\controlab-ia\backend\*"; DestDir: "{app}\backend"; Flags: ignoreversion recursesubdirs createallsubdirs; Excludes: "backend\uploads\*, *.log, *.zip, .env.development"

; Frontend (Compilación estática de React)
Source: "c:\controlab-ia\frontend\build\*"; DestDir: "{app}\frontend\build"; Flags: ignoreversion recursesubdirs createallsubdirs

; Procesador en C# (Ejecutable compilado en Debug o Release)
; Nota: Asegúrate de compilar el proyecto en Visual Studio antes de generar el instalador
Source: "c:\controlab-ia\InventarioAutoProcessor\bin\Release\*"; DestDir: "{app}\processor"; Flags: ignoreversion recursesubdirs createallsubdirs

; Recursos del sistema
Source: "c:\controlab-ia\logo-controlab-ia.ico"; DestDir: "{app}"; Flags: ignoreversion
Source: "c:\controlab-ia\iniciar-produccion.bat"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\Controlab-IA"; Filename: "{app}\iniciar-produccion.bat"
Name: "{commondesktop}\Controlab-IA"; Filename: "{app}\iniciar-produccion.bat"; IconFilename: "{app}\logo-controlab-ia.ico"; Tasks: desktopicon

[Run]
; Iniciar la aplicación usando el lote de inicio rápido
Filename: "{app}\iniciar-produccion.bat"; Description: "Iniciar Controlab-IA"; Flags: nowait postinstall skipifsilent
