export const ROLES = {
  ADMIN: 'administrador',
  BIOANALISTA: 'bioanalista',
};

// Rutas permitidas para Bioanalista
export const BIOANALISTA_ALLOWED_ROUTES = [
  '/dashboard',
  '/live-reagents',
  '/reports',
  '/sniffer',
  '/audit-log',
  '/cajas-frascos',
  '/brain-agent',
  '/solicitudes',
];

// Opciones de men� a ocultar para Bioanalista
export const BIOANALISTA_HIDDEN_MENU_PATHS = [
  '/inventory',
  '/reagents',
  '/reagents/reception',
  '/warehouses',
  '/compras',
  '/costos',
  '/users'
];

// Funci�n Helper para validar permisos
export const hasAccess = (user, path) => {
  if (!user) return false;
  const userRole = (user.rol || user.role || '').toLowerCase();
  if (userRole === ROLES.ADMIN) return true;
  if (userRole === ROLES.BIOANALISTA) {
    return BIOANALISTA_ALLOWED_ROUTES.some(allowedPath => path.startsWith(allowedPath));
  }
  return true;
};
