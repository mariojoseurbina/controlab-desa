import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const Login = () => {
  const { login, authLoading } = useAuth();
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    correo: '',
    contraseña: ''
  });
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setError('');
      
      // Validación básica
      if (!formData.correo || !formData.contraseña) {
        throw new Error('Por favor complete todos los campos');
      }

      await login({
        correo: formData.correo,
        contraseña: formData.contraseña
      });
      
      // Redirección después de login exitoso
      navigate('/dashboard');
      
    } catch (error) {
      setError(error.message || 'Error al iniciar sesión. Verifique sus credenciales.');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.loginBox}>
        <h2 style={styles.title}>ControlAB IA</h2>
        <p style={styles.subtitle}>Sistema de Gestión</p>
        
        <form onSubmit={handleSubmit} style={styles.form}>
          {error && (
            <div style={styles.error}>
              {error}
            </div>
          )}
          
          <div style={styles.formGroup}>
            <label style={styles.label}>Correo Electrónico:</label>
            <input
              type="email"
              name="correo"
              value={formData.correo}
              onChange={handleChange}
              required
              disabled={authLoading}
              style={styles.input}
              placeholder="usuario@controlab-ia.com"
            />
          </div>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>Contraseña:</label>
            <input
              type="password"
              name="contraseña"
              value={formData.contraseña}
              onChange={handleChange}
              required
              disabled={authLoading}
              style={styles.input}
              placeholder="Ingrese su contraseña"
            />
          </div>
          
          <button 
            type="submit" 
            disabled={authLoading}
            style={{
              ...styles.button,
              backgroundColor: authLoading ? '#95a5a6' : '#2c3e50',
              cursor: authLoading ? 'not-allowed' : 'pointer'
            }}
          >
            {authLoading ? '🔐 Iniciando sesión...' : '🚀 Iniciar Sesión'}
          </button>
        </form>

        {/* Sección de usuarios de prueba para la demostración */}
        <div style={styles.demoSection}>
          <h4 style={styles.demoTitle}>Credenciales de Prueba:</h4>
          <div style={styles.demoCredentials}>
            <div><strong>Administrador:</strong> admin@controlab-ia.com / test123</div>
            <div><strong>Técnico:</strong> test@controlab-ia.com / test123</div>
            <div><strong>Mario:</strong> mario@controlab-ia.com / test123</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Estilos en línea - 100% funcional sin CSS externo
const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#ecf0f1',
    fontFamily: 'Arial, sans-serif'
  },
  loginBox: {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '10px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '400px'
  },
  title: {
    textAlign: 'center',
    color: '#2c3e50',
    marginBottom: '5px',
    fontSize: '24px'
  },
  subtitle: {
    textAlign: 'center',
    color: '#7f8c8d',
    marginBottom: '30px',
    fontSize: '14px'
  },
  form: {
    width: '100%'
  },
  formGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    marginBottom: '5px',
    color: '#2c3e50',
    fontWeight: 'bold'
  },
  input: {
    width: '100%',
    padding: '12px',
    border: '1px solid #bdc3c7',
    borderRadius: '5px',
    fontSize: '16px',
    boxSizing: 'border-box'
  },
  button: {
    width: '100%',
    padding: '12px',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    fontSize: '16px',
    fontWeight: 'bold',
    marginTop: '10px'
  },
  error: {
    backgroundColor: '#e74c3c',
    color: 'white',
    padding: '10px',
    borderRadius: '5px',
    marginBottom: '20px',
    textAlign: 'center'
  },
  demoSection: {
    marginTop: '30px',
    padding: '15px',
    backgroundColor: '#f8f9fa',
    borderRadius: '5px',
    border: '1px dashed #bdc3c7'
  },
  demoTitle: {
    margin: '0 0 10px 0',
    color: '#2c3e50',
    fontSize: '14px'
  },
  demoCredentials: {
    fontSize: '12px',
    color: '#34495e',
    lineHeight: '1.5'
  }
};

export default Login;