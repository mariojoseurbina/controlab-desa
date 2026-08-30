using System;
using System.Diagnostics;
using System.IO;
using System.ServiceProcess;

namespace InventarioAutoProcessor
{
    public partial class FileWatcherService : ServiceBase
    {
        private FileProcessor _fileProcessor;
        private string _watchFolder;

        public FileWatcherService()
        {
            InitializeComponent();
            _fileProcessor = new FileProcessor();
            _watchFolder = @"C:\Controlab-ia\Inventario\Autoprocesar";
        }

        protected override void OnStart(string[] args)
        {
            WriteToEventLog("SERVICIO INICIADO - Monitoreando archivos...");

            // Configurar FileSystemWatcher
            fileSystemWatcher1.Path = _watchFolder;
            fileSystemWatcher1.Filter = "*.*";
            fileSystemWatcher1.NotifyFilter = NotifyFilters.FileName | NotifyFilters.CreationTime;
            fileSystemWatcher1.Created += OnFileCreated;
            fileSystemWatcher1.EnableRaisingEvents = true;

            // Crear directorios necesarios
            Directory.CreateDirectory(_watchFolder);
            Directory.CreateDirectory(Path.Combine(_watchFolder, "Procesados"));
            Directory.CreateDirectory(Path.Combine(_watchFolder, "Errores"));

            WriteToEventLog("Directorio monitoreado: " + _watchFolder);

            // Procesar archivos existentes al iniciar
            ProcessExistingFiles();
        }

        protected override void OnStop()
        {
            WriteToEventLog("SERVICIO DETENIDO");
        }

        private void OnFileCreated(object sender, FileSystemEventArgs e)
        {
            // Esperar a que el archivo esté completamente escrito
            System.Threading.Thread.Sleep(2000);

            try
            {
                if (File.Exists(e.FullPath))
                {
                    WriteToEventLog("Nuevo archivo detectado: " + e.Name);
                    _fileProcessor.ProcessFile(e.FullPath);
                }
            }
            catch (Exception ex)
            {
                WriteToEventLog("ERROR procesando " + e.Name + ": " + ex.Message);
            }
        }

        private void ProcessExistingFiles()
        {
            try
            {
                if (!Directory.Exists(_watchFolder))
                    return;

                var files = Directory.GetFiles(_watchFolder);
                foreach (var file in files)
                {
                    string extension = Path.GetExtension(file).ToLower();
                    if (extension == ".pdf" || extension == ".xlsx" || extension == ".xls")
                    {
                        WriteToEventLog("Procesando archivo existente: " + Path.GetFileName(file));
                        _fileProcessor.ProcessFile(file);
                    }
                }
            }
            catch (Exception ex)
            {
                WriteToEventLog("ERROR procesando archivos existentes: " + ex.Message);
            }
        }

        private void WriteToEventLog(string message)
        {
            try
            {
                string logMessage = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") + " - " + message;
                this.EventLog.WriteEntry(logMessage, System.Diagnostics.EventLogEntryType.Information);
            }
            catch (Exception ex)
            {
                // Fallback: escribir en archivo de log
                try
                {
                    string logPath = @"C:\Controlab-ia\Inventario\Logs\service_errors.log";
                    Directory.CreateDirectory(Path.GetDirectoryName(logPath));
                    File.AppendAllText(logPath, DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") + " - EventLog Error: " + ex.Message + Environment.NewLine);
                }
                catch { }
            }
        }
    }
}