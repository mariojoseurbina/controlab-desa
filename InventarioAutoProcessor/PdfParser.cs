using System;
using System.Collections.Generic;
using System.IO;
using System.Text.RegularExpressions;
using UglyToad.PdfPig;

namespace InventarioAutoProcessor
{
    public class PdfParser : IFileParser
    {
        private readonly ILoggerService _logger;

        public PdfParser(ILoggerService logger)
        {
            _logger = logger;
        }

        public bool SupportsExtension(string extension)
        {
            return extension == ".pdf";
        }

        public IEnumerable<Tuple<string, int>> Parse(string filePath)
        {
            _logger.Log("PROCESANDO PDF: " + Path.GetFileName(filePath));
            var resultados = new List<Tuple<string, int>>();

            using (var pdf = PdfDocument.Open(filePath))
            {
                foreach (var page in pdf.GetPages())
                {
                    string pageText = page.Text;
                    ProcesarTextoPagina(pageText, resultados);
                }
            }

            return resultados;
        }

        private void ProcesarTextoPagina(string pageText, List<Tuple<string, int>> pruebasEncontradas)
        {
            var lineas = pageText.Split('\n');

            foreach (var linea in lineas)
            {
                var resultado = ProcesarLineaPrueba(linea.Trim());
                if (resultado != null)
                {
                    pruebasEncontradas.Add(resultado);
                }
            }
        }

        private Tuple<string, int> ProcesarLineaPrueba(string linea)
        {
            if (string.IsNullOrWhiteSpace(linea) ||
                linea.Contains("Sub-Total") || linea.Contains("Total") ||
                linea.Contains("Derecho de Copia") || linea.Contains("Clínica") ||
                linea.Contains("Rif.") || linea.Contains("Estadísticas") ||
                linea.Contains("Desde el") || linea.Contains("Hasta el") ||
                linea.Contains("Status:") || linea.Contains("Método:") ||
                linea.StartsWith("|") || linea.Contains("Pagina:") ||
                linea.Contains("onto Bs."))
                return null;

            var match = Regex.Match(linea, @"(.+?)\s+(\d+)$");
            if (match.Success)
            {
                string nombrePrueba = match.Groups[1].Value.Trim();
                string cantidadStr = match.Groups[2].Value.Trim();

                nombrePrueba = Regex.Replace(nombrePrueba, @"^\d+\.\d+\s+", "").Trim();

                int cantidad;
                if (!string.IsNullOrWhiteSpace(nombrePrueba) &&
                    int.TryParse(cantidadStr, out cantidad) &&
                    cantidad > 0)
                {
                    return new Tuple<string, int>(nombrePrueba, cantidad);
                }
            }

            return null;
        }
    }
}
