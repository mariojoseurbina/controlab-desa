namespace InventarioAutoProcessor
{
    partial class FileWatcherService
    {
        private System.ComponentModel.IContainer components = null;
        private System.IO.FileSystemWatcher fileSystemWatcher1;

        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        private void InitializeComponent()
        {
            this.fileSystemWatcher1 = new System.IO.FileSystemWatcher();
            ((System.ComponentModel.ISupportInitialize)(this.fileSystemWatcher1)).BeginInit();
            // 
            // fileSystemWatcher1
            // 
            this.fileSystemWatcher1.EnableRaisingEvents = true;
            // 
            // FileWatcherService
            // 
            this.ServiceName = "InventarioAutoProcessor";
            ((System.ComponentModel.ISupportInitialize)(this.fileSystemWatcher1)).EndInit();
        }
    }
}