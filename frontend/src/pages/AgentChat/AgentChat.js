import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, Typography, TextField, IconButton, Paper, 
  List, ListItem, Avatar, CircularProgress, Divider
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import axios from 'axios';

const AgentChat = () => {
  const [messages, setMessages] = useState([
    { 
      sender: 'agent', 
      text: `¡Hola! Soy Controlab Brain, tu asistente inteligente 🧠.

Estoy conectado directamente a tu base de datos. Puedes copiar y pegar cualquiera de estas preguntas de demostración para ver los resultados:

1. Consumo e Inventario
- ¿Cuáles son los ítems que más rápido se agotan?
- Calcula el ritmo de consumo y autonomía.
- Muestra el valor financiero inmovilizado.
- Reporte de sobrecompra o stock máximo.
- Dame todos los movimientos de salida del inventario de Julio.
- Dame los últimos movimientos de entrada y salida de Junio y quién los realizó.

2. Costos, Márgenes y Desperdicios
- Calcula los márgenes de ganancia y costos por prueba.
- Calcula el punto de equilibrio.
- Calcula la pérdida financiera por desperdicios.
- Simula el impacto en precio de los tubos.
- Compara el costo de mantenimiento de equipos.

3. Compras e Inflación
- Analiza la inflación y variaciones de precio.
- ¿Cuáles compras siguen en estado pendiente?
- Muestra las compras recientes.
- Evalúa el retraso de los proveedores.` 
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const enviarMensaje = async (textoMsg) => {
    if (!textoMsg.trim()) return;

    setMessages(prev => [...prev, { sender: 'user', text: textoMsg }]);
    setLoading(true);

    try {
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const response = await axios.post(`${API_BASE_URL}/agent/chat`, {
        message: textoMsg
      });

      setMessages(prev => [...prev, { 
        sender: 'agent', 
        text: response.data.respuesta 
      }]);
    } catch (error) {
      console.error('Error enviando mensaje al agente:', error);
      let errorText = 'Hubo un error al comunicarme con el cerebro. Por favor intenta de nuevo más tarde.';
      if (error.response?.data?.error) {
         errorText = `${error.response.data.error}: ${error.response.data.detalles || ''}`;
      }
      setMessages(prev => [...prev, { sender: 'agent', text: `❌ ${errorText}`, isError: true }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = (e) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;
    const msg = input;
    setInput('');
    enviarMensaje(msg);
  };

  return (
    <Box sx={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column', p: 2 }}>
      
      <Paper elevation={3} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 2 }}>
        
        {/* Encabezado */}
        <Box sx={{ p: 2, bgcolor: '#192a56', color: 'white', display: 'flex', alignItems: 'center' }}>
          <SmartToyIcon sx={{ mr: 1, fontSize: 30 }} />
          <Typography variant="h6" fontWeight="bold" sx={{ flexGrow: 1 }}>
            Controlab Brain
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.8 }}>
            Impulsado por Gemini AI
          </Typography>
        </Box>

        {/* Área de Mensajes */}
        <List sx={{ flexGrow: 1, overflow: 'auto', p: 2, bgcolor: '#f5f6fa' }}>
          {messages.map((msg, index) => (
            <React.Fragment key={index}>
              <ListItem 
                sx={{ 
                  display: 'flex', 
                  justifyContent: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  mb: 1,
                  alignItems: 'flex-start',
                  px: 0
                }}
              >
                {msg.sender === 'agent' && (
                  <Avatar sx={{ bgcolor: '#44bd32', mr: 1, width: 35, height: 35 }}>
                    <SmartToyIcon fontSize="small" />
                  </Avatar>
                )}
                
                <Paper 
                  elevation={1}
                  sx={{ 
                    p: 2, 
                    maxWidth: '85%', 
                    bgcolor: msg.sender === 'user' ? '#0097e6' : '#ffffff',
                    color: msg.sender === 'user' ? '#ffffff' : '#2f3640',
                    borderRadius: 2,
                    borderTopRightRadius: msg.sender === 'user' ? 0 : 16,
                    borderTopLeftRadius: msg.sender === 'agent' ? 0 : 16,
                    boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
                  }}
                >
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      lineHeight: 1.6,
                      fontSize: '0.95rem'
                    }}
                  >
                    {msg.text}
                  </Typography>
                </Paper>

                {msg.sender === 'user' && (
                  <Avatar sx={{ bgcolor: '#718093', ml: 1, width: 35, height: 35 }}>
                    <PersonIcon fontSize="small" />
                  </Avatar>
                )}
              </ListItem>
            </React.Fragment>
          ))}
          
          {loading && (
            <ListItem sx={{ display: 'flex', justifyContent: 'flex-start', mb: 2, px: 0 }}>
              <Avatar sx={{ bgcolor: '#44bd32', mr: 1, width: 35, height: 35 }}>
                <SmartToyIcon fontSize="small" />
              </Avatar>
              <Paper elevation={1} sx={{ p: 2, borderRadius: 2, borderTopLeftRadius: 0, display: 'flex', alignItems: 'center' }}>
                <CircularProgress size={20} sx={{ mr: 2, color: '#44bd32' }} />
                <Typography variant="body2" color="text.secondary">
                  El cerebro está pensando y consultando la base de datos...
                </Typography>
              </Paper>
            </ListItem>
          )}
          <div ref={messagesEndRef} />
        </List>

        <Divider />

        {/* Input Form */}
        <Box component="form" onSubmit={handleSend} sx={{ p: 2, backgroundColor: '#ffffff', display: 'flex', alignItems: 'center' }}>
          <TextField
            fullWidth
            inputRef={inputRef}
            variant="outlined"
            placeholder="Escribe o pega tu consulta aquí..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            sx={{ mr: 1 }}
          />
          <IconButton 
            type="submit" 
            disabled={!input.trim() || loading}
            sx={{ 
              bgcolor: input.trim() && !loading ? '#192a56' : '#dcdde1', 
              color: 'white', 
              width: 50,
              height: 50,
              '&:hover': { bgcolor: '#273c75' } 
            }}
          >
            <SendIcon />
          </IconButton>
        </Box>
      </Paper>
    </Box>
  );
};

export default AgentChat;
