using System;
using System.Collections.Generic;

namespace InventarioAutoProcessor
{
    public interface IFileParser
    {
        IEnumerable<Tuple<string, int>> Parse(string filePath);
        bool SupportsExtension(string extension);
    }
}
