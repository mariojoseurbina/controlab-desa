using System;
using System.Collections.Generic;
using ClosedXML.Excel;
using System.IO;

namespace InventarioAutoProcessor
{
    public class ExcelParser : IFileParser
    {
        private readonly ILoggerService _logger;

        public ExcelParser(ILoggerService logger)
        {
            _logger = logger;
        }

        public bool SupportsExtension(string extension)
        {
            return extension == ".xlsx" || extension == ".xls";
        }

        public IEnumerable<Tuple<string, int>> Parse(string filePath)
        {
            _logger.Log("PROCESANDO EXCEL: " + Path.GetFileName(filePath));
            var results = new List<Tuple<string, int>>();

            using (var workbook = new XLWorkbook(filePath))
            {
                var worksheet = workbook.Worksheet(1);
                var usedRange = worksheet.RangeUsed();

                if (usedRange == null)
                    throw new Exception("Archivo Excel vacío");

                foreach (var row in usedRange.RowsUsed())
                {
                    if (row.RowNumber() == 1) continue;

                    try
                    {
                        string nombrePrueba = row.Cell(1).GetString().Trim();
                        string cantidadStr = row.Cell(2).GetString().Trim();

                        if (string.IsNullOrEmpty(nombrePrueba))
                            continue;

                        int cantidad;
                        if (int.TryParse(cantidadStr, out cantidad) && cantidad > 0)
                        {
                            results.Add(new Tuple<string, int>(nombrePrueba, cantidad));
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError("Fila " + row.RowNumber() + ": " + ex.Message);
                    }
                }
            }
            return results;
        }
    }
}
