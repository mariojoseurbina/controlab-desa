using System;
using System.IO;
using System.Collections.Generic;
using System.Linq;

namespace InventarioAutoProcessor
{
    public class FileProcessor
    {
        private readonly IInventoryRepository _dbHelper;
        private readonly IEnumerable<IFileParser> _parsers;
        private readonly ILoggerService _logger;

        public FileProcessor(
            IInventoryRepository dbHelper, 
            IEnumerable<IFileParser> parsers,
            ILoggerService logger)
        {
            _dbHelper = dbHelper;
            _parsers = parsers;
            _logger = logger;
        }

        // Constructor por defecto para mantener retrocompatibilidad (e.g. instanciado desde el Service1)
        public FileProcessor()
        {
            _logger = new FileLoggerService();
            _dbHelper = new DatabaseHelper();
            _parsers = new List<IFileParser>
            {
                new ExcelParser(_logger),
                new PdfParser(_logger)
            };
        }

        public void ProcessFile(string filePath)
        {
            string fileName = Path.GetFileName(filePath);
            try
            {
                _logger.Log("INICIANDO: " + fileName);
                string extension = Path.GetExtension(filePath).ToLower();

                var parser = _parsers.FirstOrDefault(p => p.SupportsExtension(extension));
                
                if (parser == null)
                    throw new Exception("Formato no soportado: " + extension);

                var results = parser.Parse(filePath);
                
                int successCount = 0;
                foreach (var result in results)
                {
                    try
                    {
                        string nombrePrueba = result.Item1;
                        int cantidad = result.Item2;
                        _dbHelper.InsertInventoryItem(nombrePrueba, cantidad);
                        successCount++;
                        _logger.Log("PROCESADO: " + nombrePrueba + " = " + cantidad);
                    }
                    catch (Exception ex)
                    {
                        string nombrePrueba = result.Item1;
                        _logger.LogError("ERROR " + nombrePrueba + ": " + ex.Message);
                    }
                }

                // If it parsed items but failed to insert any, we treat it as an error
                if (successCount == 0 && results.Any())
                    throw new Exception("No se pudo insertar ningún registro");

                _logger.Log("EXITOSO: " + fileName);
                MoveToProcessedFolder(filePath);
            }
            catch (Exception ex)
            {
                _logger.LogError("ERROR: " + fileName + " - " + ex.Message);
                MoveToErrorFolder(filePath, ex.Message);
            }
        }

        private void MoveToProcessedFolder(string filePath)
        {
            string baseDir = Path.GetDirectoryName(filePath);
            string processedDir = Path.Combine(baseDir, "Procesados");
            Directory.CreateDirectory(processedDir);

            string newPath = GetUniqueFilePath(processedDir, Path.GetFileName(filePath));
            File.Move(filePath, newPath);
        }

        private void MoveToErrorFolder(string filePath, string errorMessage)
        {
            string baseDir = Path.GetDirectoryName(filePath);
            string errorDir = Path.Combine(baseDir, "Errores");
            Directory.CreateDirectory(errorDir);

            string newPath = GetUniqueFilePath(errorDir, Path.GetFileName(filePath));
            File.Move(filePath, newPath);

            string errorLogPath = Path.ChangeExtension(newPath, ".error.txt");
            File.WriteAllText(errorLogPath, "ERROR: " + errorMessage + "\nFECHA: " + DateTime.Now.ToString());
        }

        private string GetUniqueFilePath(string directory, string fileName)
        {
            string newPath = Path.Combine(directory, fileName);

            if (!File.Exists(newPath))
                return newPath;

            string nameWithoutExt = Path.GetFileNameWithoutExtension(fileName);
            string extension = Path.GetExtension(fileName);
            string timestamp = DateTime.Now.ToString("yyyyMMdd_HHmmss");

            return Path.Combine(directory, nameWithoutExt + "_" + timestamp + extension);
        }

        /* 
        ========================================================
        CÓDIGO ORIGINAL MIGRADO A CLASES INDEPENDIENTES (SOLID)
        ========================================================
        
        // El siguiente código fue refactorizado y separado en:
        // - IInventoryRepository / DatabaseHelper
        // - IFileParser / ExcelParser / PdfParser
        // - ILoggerService / FileLoggerService
        // Se mantiene comentado a petición del usuario.
        
        // using System.Data;
        // using ClosedXML.Excel;
        // using UglyToad.PdfPig;
        // using System.Text.RegularExpressions;
        // 
        // public class FileProcessor
        // {
        //     private readonly DatabaseHelper _dbHelper;
        // 
        //     public FileProcessor()
        //     {
        //         _dbHelper = new DatabaseHelper();
        //     }
        // 
        //     public void ProcessFile(string filePath)
        //     {
        //         // ... old ProcessFile logic
        //     }
        // 
        //     private void ProcessExcelFile(string filePath)
        //     {
        //         // ... old ProcessExcelFile logic
        //     }
        // 
        //     private void ProcessPdfFile(string filePath)
        //     {
        //         // ... old ProcessPdfFile logic
        //     }
        // 
        //     private void ProcesarTextoPagina(string pageText, List<(string, int)> pruebasEncontradas)
        //     {
        //         // ... old logic
        //     }
        // 
        //     private (string nombrePrueba, int cantidad)? ProcesarLineaPrueba(string linea)
        //     {
        //         // ... old logic
        //     }
        // 
        //     private void WriteLog(string message)
        //     {
        //         // ... old logic
        //     }
        // }
        */
    }

}