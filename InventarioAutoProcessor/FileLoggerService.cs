using System;
using System.IO;

namespace InventarioAutoProcessor
{
    public class FileLoggerService : ILoggerService
    {
        public void Log(string message)
        {
            WriteLog(message);
        }

        public void LogError(string message)
        {
            WriteLog("ERROR: " + message);
        }

        private void WriteLog(string message)
        {
            try
            {
                string logDir = @"C:\Controlab-ia\Inventario\Logs";
                string logFile = Path.Combine(logDir, "servicio_" + DateTime.Now.ToString("yyyyMMdd") + ".log");

                Directory.CreateDirectory(logDir);

                string logMessage = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") + " - " + message;
                File.AppendAllText(logFile, logMessage + Environment.NewLine);
            }
            catch (Exception)
            {
                // Fallback
                try
                {
                    string fallbackLog = @"C:\Windows\Temp\controlab_service.log";
                    File.AppendAllText(fallbackLog, DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss") + " - " + message + Environment.NewLine);
                }
                catch { }
            }
        }
    }
}
