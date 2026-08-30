import React, { useState, useRef, useEffect } from 'react';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  CircularProgress,
  InputAdornment,
  IconButton,
  Fade
} from '@mui/material';
import { Visibility, VisibilityOff, Science } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const Login = () => {
  const [credentials, setCredentials] = useState({
    usuario: '',
    contraseña: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [buildingForm, setBuildingForm] = useState(true);
  const [fadeCubes, setFadeCubes] = useState(false);
  const [cubes, setCubes] = useState([]);
  const [revealBrand, setRevealBrand] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  // Efecto de construcción con segmentos profesionales
  useEffect(() => {
    const segments = [
      { id: 1, name: 'Gestión de Reactivos', image: '/images/reactivos.jpg', desc: 'Trazabilidad y Control de Lotes' },
      { id: 2, name: 'Descuentos Automáticos', image: '/images/descuentos.jpg', desc: 'Integración y Mermas' },
      { id: 3, name: 'Control Financiero', image: '/images/costos.jpg', desc: 'Análisis de Costos y Rentabilidad' },
      { id: 4, name: 'Controlab Brain', image: '/images/brain.jpg', desc: 'Asistente de Inteligencia Artificial' }
    ];
    
    setCubes(segments.map((seg, idx) => ({
      id: seg.id,
      name: seg.name,
      image: seg.image,
      desc: seg.desc,
      active: false,
      delay: idx * 180
    })));

    // Activar segmentos uno por uno
    const timers = segments.map((_, idx) => {
      return setTimeout(() => {
        setCubes(prev => prev.map(cube => 
          cube.id === idx + 1 ? { ...cube, active: true } : cube
        ));
      }, idx * 180);
    });

    // Iniciar desvanecimiento de paneles
    const fadeTimer = setTimeout(() => {
      setFadeCubes(true);
    }, segments.length * 180 + 1200); // ~1920ms

    // Mostrar formulario real
    const formTimer = setTimeout(() => {
      setBuildingForm(false);
    }, segments.length * 180 + 1850); // ~2570ms

    return () => {
      timers.forEach(timer => clearTimeout(timer));
      clearTimeout(fadeTimer);
      clearTimeout(formTimer);
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const result = await login(credentials);
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error || 'Error al iniciar sesión');
      }
    } catch (err) {
      setError(err.message || 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #0A1929 0%, #001E3C 100%)',
        p: 2
      }}
    >
      {/* Fondo con partículas veterinarias flotantes */}
      <Box sx={{ position: 'absolute', inset: 0, overflow: 'hidden', zIndex: 0 }}>
        {[...Array(30)].map((_, i) => (
          <Box
            key={i}
            sx={{
              position: 'absolute',
              width: `${20 + Math.random() * 40}px`,
              height: `${20 + Math.random() * 40}px`,
              background: `rgba(26, 115, 232, ${0.03 + Math.random() * 0.07})`,
              border: '1px solid rgba(26, 115, 232, 0.15)',
              transform: `translate(${Math.random() * 100}vw, ${Math.random() * 100}vh)`,
              animation: `floatCube ${8 + Math.random() * 7}s infinite ease-in-out`,
              animationDelay: `${Math.random() * 5}s`,
              borderRadius: '8px'
            }}
          />
        ))}
      </Box>

      {/* Animación Anidada Interactiva en la Parte Izquierda */}
      <Box
        onClick={() => setRevealBrand(prev => !prev)}
        sx={{
          position: 'absolute',
          left: { xs: '20px', md: '50px' },
          top: { xs: '20px', md: '50px' },
          zIndex: 100,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          cursor: 'pointer',
          userSelect: 'none',
          '&:hover .outer-ring': {
            borderColor: 'rgba(26, 115, 232, 0.8)',
            transform: 'scale(1.05) rotate(180deg)',
          },
          '&:hover .inner-core': {
            transform: 'scale(1.15)',
            boxShadow: '0 0 30px rgba(26, 115, 232, 1)',
          }
        }}
      >
        {/* Contenedor de Anillos Concentrados */}
        <Box
          sx={{
            position: 'relative',
            width: '64px',
            height: '64px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Anillo Exterior (Dashed) */}
          <Box
            className="outer-ring"
            sx={{
              position: 'absolute',
              inset: 0,
              border: '2px dashed rgba(26, 115, 232, 0.4)',
              borderRadius: '50%',
              transition: 'all 0.5s ease',
              animation: 'spinClockwise 20s linear infinite',
            }}
          />

          {/* Anillo Medio (Glow/Gradient) */}
          <Box
            sx={{
              position: 'absolute',
              inset: '6px',
              border: '2px solid transparent',
              borderTopColor: 'rgba(13, 71, 161, 0.6)',
              borderBottomColor: 'rgba(13, 71, 161, 0.6)',
              borderRadius: '50%',
              animation: 'spinCounterClockwise 10s linear infinite',
            }}
          />

          {/* Núcleo Central */}
          <Box
            className="inner-core"
            sx={{
              position: 'absolute',
              inset: '14px',
              background: 'radial-gradient(circle, rgba(26, 115, 232, 0.9) 0%, rgba(13, 71, 161, 0.9) 100%)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(26, 115, 232, 0.6)',
              transition: 'all 0.3s ease',
              animation: 'pulseCore 3s infinite ease-in-out',
            }}
          >
            <Science sx={{ fontSize: 18, color: '#ffffff' }} />
          </Box>

          {/* Efecto de Onda/Ripple cuando se hace click */}
          {revealBrand && (
            <Box
              sx={{
                position: 'absolute',
                inset: 0,
                border: '2px solid #1A73E8',
                borderRadius: '50%',
                animation: 'rippleEffect 0.8s ease-out',
                opacity: 0,
              }}
            />
          )}
        </Box>

        {/* Texto del nombre que se revela */}
        <Box
          sx={{
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            height: '40px',
          }}
        >
          <Box
            sx={{
              transform: revealBrand ? 'translateX(0)' : 'translateX(-120%)',
              opacity: revealBrand ? 1 : 0,
              transition: 'all 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
              whiteSpace: 'nowrap',
            }}
          >
            <Typography
              variant="h5"
              sx={{
                fontWeight: 900,
                letterSpacing: '2px',
                background: 'linear-gradient(135deg, #ffffff 0%, #a7f3d0 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                textShadow: '0 0 15px rgba(26, 115, 232, 0.3)',
                fontFamily: "'Inter', 'Segoe UI', sans-serif",
                textTransform: 'none',
              }}
            >
              Controlab IA
            </Typography>
          </Box>
        </Box>
      </Box>

      <Container maxWidth="md" sx={{ position: 'relative', zIndex: 10 }}>
        {/* Logo y título (siempre visibles) */}
        <Fade in timeout={500}>
          <Box textAlign="center" mb={4}>
            <Box sx={{ mb: 2 }}>
              <Science sx={{ fontSize: 64, color: '#1A73E8' }} />
            </Box>
            
            <Typography 
              variant="h3" 
              gutterBottom 
              sx={{ 
                fontWeight: 900,
                background: 'linear-gradient(135deg, #1A73E8 0%, #1565C0 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                color: 'transparent',
                letterSpacing: '-1.5px',
                mb: 1,
                fontFamily: "'Inter', 'Segoe UI', sans-serif"
              }}
            >
              Controlab IA
            </Typography>
            
            <Typography 
              variant="subtitle1" 
              sx={{ 
                color: 'rgba(255,255,255,0.7)',
                fontWeight: 500,
                letterSpacing: '0.5px',
                position: 'relative',
                display: 'inline-block'
              }}
            >
              Sistema de Gestión de Inventario con Inteligencia Artificial para Laboratorios Clínicos
            </Typography>
          </Box>
        </Fade>

        {/* Paneles del Formulario */}
        <Box sx={{ position: 'relative', minHeight: '380px' }}>
          {/* Paneles de especialidades clínicas */}
          {buildingForm && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' },
                gap: '20px',
                zIndex: 5,
                opacity: fadeCubes ? 0 : 1,
                transform: fadeCubes ? 'scale(0.98) translateY(-15px)' : 'scale(1) translateY(0)',
                transition: 'opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1), transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              {cubes.map((cube) => (
                <Box
                  key={cube.id}
                  sx={{
                    position: 'relative',
                    borderRadius: '24px',
                    overflow: 'hidden',
                    transform: cube.active 
                      ? 'translateY(0) scale(1)' 
                      : 'translateY(40px) scale(0.9)',
                    opacity: cube.active ? 1 : 0,
                    transition: `all 0.6s cubic-bezier(0.16, 1, 0.3, 1) ${cube.delay}ms`,
                    border: '1px solid rgba(255, 255, 255, 0.18)',
                    boxShadow: cube.active 
                      ? '0 20px 40px rgba(0,0,0,0.4)' 
                      : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'flex-end',
                    p: 3,
                    minHeight: { xs: '150px', md: '100%' }
                  }}
                >
                  {/* Background Image */}
                  <Box
                    sx={{
                      position: 'absolute',
                      inset: 0,
                      backgroundImage: `url(${cube.image})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      zIndex: 0,
                      '&::after': {
                        content: '""',
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(to top, rgba(6, 43, 34, 0.95) 20%, rgba(6, 43, 34, 0.4) 100%)'
                      }
                    }}
                  />
                  
                  {/* Content */}
                  <Box sx={{ position: 'relative', zIndex: 1 }}>
                    <Science sx={{ fontSize: 24, color: '#1A73E8', mb: 1 }} />
                    <Typography 
                      variant="h6" 
                      sx={{ 
                        color: '#ffffff', 
                        fontWeight: 900,
                        fontFamily: "'Inter', sans-serif",
                        lineHeight: 1.2,
                        mb: 0.5,
                        textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                      }}
                    >
                      {cube.name}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        display: 'block',
                        color: 'rgba(255,255,255,0.75)',
                        fontFamily: "'Inter', sans-serif",
                        lineHeight: 1.2,
                        textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                      }}
                    >
                      {cube.desc}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Box>
          )}

          {/* Formulario real que aparece después */}
          {!buildingForm && (
            <Fade in={!buildingForm} timeout={800}>
              <Paper 
                elevation={24} 
                sx={{ 
                  p: 4, 
                  borderRadius: 4, 
                  backgroundColor: 'rgba(255, 255, 255, 0.98)',
                  backdropFilter: 'blur(10px)',
                  transform: 'translateY(0)',
                  transition: 'transform 0.3s ease-in-out',
                  maxWidth: '440px',
                  mx: 'auto',
                  '&:hover': {
                    transform: 'translateY(-5px)'
                  },
                  animation: 'formAppear 0.5s ease-out'
                }}
              >
                {error && (
                  <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
                    {error}
                  </Alert>
                )}

                <form onSubmit={handleSubmit}>
                  <TextField
                    fullWidth
                    label="Usuario"
                    value={credentials.usuario}
                    onChange={(e) => setCredentials({...credentials, usuario: e.target.value})}
                    margin="normal"
                    required
                    autoFocus
                    disabled={loading}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        '&:hover fieldset': {
                          borderColor: '#1A73E8'
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#1A73E8'
                        }
                      },
                      '& .MuiInputLabel-root.Mui-focused': {
                        color: '#1A73E8'
                      }
                    }}
                  />

                  <TextField
                    fullWidth
                    label="Contraseña"
                    type={showPassword ? 'text' : 'password'}
                    value={credentials.contraseña}
                    onChange={(e) => setCredentials({...credentials, contraseña: e.target.value})}
                    margin="normal"
                    required
                    disabled={loading}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        '&:hover fieldset': {
                          borderColor: '#1A73E8'
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#1A73E8'
                        }
                      },
                      '& .MuiInputLabel-root.Mui-focused': {
                        color: '#1A73E8'
                      }
                    }}
                    InputProps={{
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowPassword(!showPassword)}
                            edge="end"
                          >
                            {showPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                  />

                  <Button
                    type="submit"
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={loading}
                    sx={{ 
                      mt: 3, 
                      mb: 2, 
                      py: 1.5,
                      borderRadius: 2,
                      background: 'linear-gradient(135deg, #1A73E8 0%, #1565C0 100%)',
                      '&:hover': {
                        background: 'linear-gradient(135deg, #1565C0 0%, #0D47A1 100%)',
                        transform: 'scale(1.02)',
                        transition: 'all 0.3s ease'
                      }
                    }}
                  >
                    {loading ? <CircularProgress size={24} color="inherit" /> : 'Iniciar Sesión'}
                  </Button>
                </form>

                <Typography 
                  variant="caption" 
                  sx={{ 
                    display: 'block', 
                    textAlign: 'center', 
                    mt: 2,
                    color: 'text.disabled'
                  }}
                >
                  v2.0 • Innovación en gestión de laboratorios
                </Typography>
              </Paper>
            </Fade>
          )}
        </Box>
      </Container>

      <style>
        {`
          @keyframes floatCube {
            0%, 100% {
              transform: translateY(0px) rotate(0deg);
            }
            50% {
              transform: translateY(-20px) rotate(90deg);
            }
          }

          @keyframes formAppear {
            0% {
              opacity: 0;
              transform: translateY(20px);
            }
            100% {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes spinClockwise {
            from {
              transform: rotate(0deg);
            }
            to {
              transform: rotate(360deg);
            }
          }

          @keyframes spinCounterClockwise {
            from {
              transform: rotate(360deg);
            }
            to {
              transform: rotate(0deg);
            }
          }

          @keyframes pulseCore {
            0%, 100% {
              transform: scale(1);
              box-shadow: 0 0 15px rgba(26, 115, 232, 0.6);
            }
            50% {
              transform: scale(1.08);
              box-shadow: 0 0 25px rgba(26, 115, 232, 0.9);
            }
          }

          @keyframes rippleEffect {
            0% {
              transform: scale(1);
              opacity: 1;
            }
            100% {
              transform: scale(1.8);
              opacity: 0;
            }
          }
        `}
      </style>
    </Box>
  );
};

export default Login;
