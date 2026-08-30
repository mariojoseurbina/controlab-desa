import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { SnackbarProvider } from 'notistack';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout/Layout';
import Login from './pages/Auth/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import Inventory from './features/inventory/pages/Inventory';
import Reagents from './pages/Reagents/Reagents';
import ImportacionMasivaPruebas from './pages/Reagents/ImportacionMasivaPruebas';
import GestionKitsPrueba from './pages/Reagents/GestionKitsPrueba/GestionKitsPrueba';
import TransformarReporteDiario from './pages/Reagents/TransformarReporteDiario';
import DescuentoAutomatico from './pages/Reagents/DescuentoAutomatico';
import Movements from './pages/Movements/Movements';
import Reports from './pages/Reports/Reports';
import Users from './pages/Users/Users';

// Importaciones del módulo Compras
import ListaCompras from './pages/Compras/ListaCompras';
import FormularioCompra from './pages/Compras/FormularioCompra';
import DetalleCompra from './pages/Compras/DetalleCompra';

import DescuentosPorPruebas from './pages/DescuentosPorPruebas/descuentosporpruebas';
import Costos from './pages/Costos/Costos';
import AgentChat from './pages/AgentChat/AgentChat';
import SnifferDashboard from './pages/Sniffer/SnifferDashboard';
import TraceabilityView from './pages/Traceability/TraceabilityView';
import LiveReagentsMonitor from './pages/LiveReagents/LiveReagentsMonitor';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976D2', // Terracota suave y cálida
      light: '#42A5F5',
      dark: '#1565C0',
    },
    secondary: {
      main: '#0052CC', // Melocotón cálido
    },
    background: {
      default: '#FCFAF7', // Crema suave
      paper: '#FFFFFF',
    },
    text: {
      primary: '#3D405B', // Gris cálido oscuro profesional
      secondary: '#70748E',
    }
  },
  typography: {
    fontFamily: '"Outfit", "Inter", "Roboto", sans-serif',
    button: {
      textTransform: 'none',
      fontWeight: 600
    }
  },
  shape: {
    borderRadius: 12
  }
});

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div>Cargando...</div>;
  }
  
  return user ? children : <Navigate to="/login" />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div>Cargando...</div>;
  }
  
  return !user ? children : <Navigate to="/dashboard" />;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <SnackbarProvider maxSnack={3}>
        <AuthProvider>
          <Router>
            <Routes>
              <Route path="/login" element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              } />
              <Route path="/*" element={
                <ProtectedRoute>
                  <Layout>
                    <Routes>
                      <Route path="/dashboard" element={<Dashboard />} />
                      
                      {/* Agente IA */}
                      <Route path="/brain-agent" element={<AgentChat />} />

                      {/* Rutas de Inventario e IA (originales) */}
                      <Route path="/inventory" element={<Inventory />} />
                      <Route path="/reagents" element={<Reagents />} />
                      <Route path="/reagents/massive-import" element={<ImportacionMasivaPruebas />} />
                      <Route path="/reagents/test-kits" element={<GestionKitsPrueba />} />
                      <Route path="/reagents/transform-daily" element={<TransformarReporteDiario />} />
                      <Route path="/reagents/auto-discount" element={<DescuentoAutomatico />} />
                      <Route path="/movements" element={<Movements />} />
                      <Route path="/compras" element={<ListaCompras />} />
                      <Route path="/compras/nueva" element={<FormularioCompra />} />
                      <Route path="/compras/editar/:id" element={<FormularioCompra />} />
                      <Route path="/compras/:id" element={<DetalleCompra />} />
                      <Route path="/descuentos" element={<DescuentosPorPruebas />} />
                      <Route path="/costos" element={<Costos />} />
                      <Route path="/sniffer" element={<SnifferDashboard />} />
                      <Route path="/live-reagents" element={<LiveReagentsMonitor />} />
                      <Route path="/audit-log" element={<TraceabilityView />} />
                      
                      {/* Otras rutas */}
                      <Route path="/reports" element={<Reports />} />
                      <Route path="/users" element={<Users />} />
                      <Route path="/" element={<Navigate to="/dashboard" />} />
                    </Routes>
                  </Layout>
                </ProtectedRoute>
              } />
            </Routes>
          </Router>
        </AuthProvider>
      </SnackbarProvider>
    </ThemeProvider>
  );
}

export default App;
