namespace InventarioAutoProcessor
{
    partial class Service1
    {
        private System.ComponentModel.IContainer components = null;
        private System.IO.FileSystemWatcher fileSystemWatcher1;
        private System.Diagnostics.EventLog eventLog1;

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
            this.components = new System.ComponentModel.Container();
            this.fileSystemWatcher1 = new System.IO.FileSystemWatcher();
            this.eventLog1 = new System.Diagnostics.EventLog();
            ((System.ComponentModel.ISupportInitialize)(this.fileSystemWatcher1)).BeginInit();
            ((System.ComponentModel.ISupportInitialize)(this.eventLog1)).BeginInit();

            // fileSystemWatcher1
            this.fileSystemWatcher1.EnableRaisingEvents = true;

            // eventLog1
            this.eventLog1.Log = "Application";
            this.eventLog1.Source = "InventarioAutoProcessor";

            // FileWatcherService
            this.ServiceName = "InventarioAutoProcessor";

            ((System.ComponentModel.ISupportInitialize)(this.fileSystemWatcher1)).EndInit();
            ((System.ComponentModel.ISupportInitialize)(this.eventLog1)).EndInit();
        }
    }
}