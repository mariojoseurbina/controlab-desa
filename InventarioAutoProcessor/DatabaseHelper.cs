using System;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;

namespace InventarioAutoProcessor
{
    public class DatabaseHelper : IInventoryRepository
    {
        private string GetConnectionString()
        {
            return ConfigurationManager.AppSettings["ConnectionString"] ??
                   "Server=.;Database=ControlabIA;Integrated Security=true;";
        }

        public void InsertInventoryItem(string nombrePrueba, int cantidad)
        {
            using (SqlConnection conn = new SqlConnection(GetConnectionString()))
            {
                string query = @"INSERT INTO tmp_reactivos_auto 
                               (nombre_prueba, cantidad, archivo_origen, estado) 
                               VALUES (@prueba, @cantidad, @archivo, 'PROCESADO')";

                using (SqlCommand cmd = new SqlCommand(query, conn))
                {
                    cmd.Parameters.AddWithValue("@prueba", nombrePrueba);
                    cmd.Parameters.AddWithValue("@cantidad", cantidad);
                    cmd.Parameters.AddWithValue("@archivo", "AutoProcessor");

                    conn.Open();
                    cmd.ExecuteNonQuery();
                }
            }
        }
    }
}