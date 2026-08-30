namespace InventarioAutoProcessor
{
    public interface ILoggerService
    {
        void Log(string message);
        void LogError(string message);
    }
}
