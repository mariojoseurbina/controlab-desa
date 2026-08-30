using System;
using System.Collections;
using System.ComponentModel;
using System.Configuration.Install;
using System.ServiceProcess;

namespace InventarioAutoProcessor
{
    [RunInstaller(true)]
    public partial class ProjectInstaller : Installer
    {
        private ServiceProcessInstaller serviceProcessInstaller;
        private ServiceInstaller serviceInstaller;

        public ProjectInstaller()
        {
            InitializeComponent();
        }

        private void InitializeComponent()
        {
            this.serviceProcessInstaller = new ServiceProcessInstaller();
            this.serviceInstaller = new ServiceInstaller();

            // ServiceProcessInstaller
            this.serviceProcessInstaller.Account = ServiceAccount.LocalSystem;

            // ServiceInstaller
            this.serviceInstaller.ServiceName = "InventarioAutoProcessor";
            this.serviceInstaller.DisplayName = "Inventario Auto Processor";
            this.serviceInstaller.Description = "Servicio para procesar archivos PDF y Excel de inventario automáticamente";
            this.serviceInstaller.StartType = ServiceStartMode.Automatic;

            // Agregar instaladores
            this.Installers.AddRange(new Installer[] {
                this.serviceProcessInstaller,
                this.serviceInstaller});
        }
    }
}