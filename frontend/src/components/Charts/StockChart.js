// import React from 'react';
// import {
//   Chart as ChartJS,
//   CategoryScale,
//   LinearScale,
//   BarElement,
//   Title,
//   Tooltip,
//   Legend,
// } from 'chart.js';
// import { Bar } from 'react-chartjs-2';
// import { Paper, Typography } from '@mui/material';

// ChartJS.register(
//   CategoryScale,
//   LinearScale,
//   BarElement,
//   Title,
//   Tooltip,
//   Legend
// );

// const StockChart = () => {
//   const data = {
//     labels: ['Reactivos', 'Materiales', 'Equipos', 'Consumibles'],
//     datasets: [
//       {
//         label: 'Stock Normal',
//         data: [65, 59, 80, 81],
//         backgroundColor: '#4caf50',
//       },
//       {
//         label: 'Stock Bajo',
//         data: [28, 48, 40, 19],
//         backgroundColor: '#ff9800',
//       },
//       {
//         label: 'Stock Crítico',
//         data: [12, 15, 8, 7],
//         backgroundColor: '#f44336',
//       },
//     ],
//   };

//   const options = {
//     responsive: true,
//     plugins: {
//       legend: {
//         position: 'top',
//       },
//       title: {
//         display: true,
//         text: 'Distribución de Stock por Categoría',
//       },
//     },
//     scales: {
//       x: {
//         stacked: false,
//       },
//       y: {
//         stacked: false,
//         beginAtZero: true,
//       },
//     },
//   };

//   return (
//     <Paper sx={{ p: 2 }}>
//       <Typography variant="h6" gutterBottom>
//         Estado del Stock
//       </Typography>
//       <Bar data={data} options={options} />
//     </Paper>
//   );
// };

// export default StockChart;

// frontend/src/components/Charts/StockChart.jsx

import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Typography, Box, CircularProgress, useTheme, Alert } from '@mui/material';
import { dashboardService } from '../../services/dashboardService';

// Colores profesionales para cada categoría
const COLORS = {
  Reactivos: '#E63946',
  Materiales: '#F4A261',
  Equipos: '#2A9D8F',
  Consumibles: '#F4ACB7'
};

const StockChart = () => {
  const theme = useTheme();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const stock = await dashboardService.getStockByCategory();
        // stock es un array del tipo: [{ categoria: 'Reactivo', stock_total: X }, ...]
        if (Array.isArray(stock)) {
          const formatted = stock.map((item, index) => {
            const catName = item.categoria || 'Sin Categoría';
            let color = COLORS[catName];
            if (!color) {
              const lower = catName.toLowerCase();
              if (lower.startsWith('reactiv')) color = COLORS.Reactivos;
              else if (lower.startsWith('material')) color = COLORS.Materiales;
              else if (lower.startsWith('equip')) color = COLORS.Equipos;
              else if (lower.startsWith('consumib')) color = COLORS.Consumibles;
              else {
                const palette = ['#457B9D', '#1D3557', '#A8DADC', '#E9C46A', '#F4A261', '#E76F51'];
                color = palette[index % palette.length];
              }
            }
            return {
              name: catName,
              value: item.stock_total || 0,
              color: color
            };
          }).filter(item => item.value > 0);
          setData(formatted);
        } else {
          setData([]);
        }
      } catch (err) {
        console.error('Error cargando stock por categoría:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height={300}>
        <CircularProgress size={40} />
      </Box>
    );
  }

  if (error || data.length === 0) {
    return (
      <Alert severity="warning" sx={{ m: 2 }}>
        No se pudo cargar la distribución de stock o no hay datos.
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', fontSize: '0.95rem', mb: 1 }}>
        📊 Distribución de Stock por Categoría
      </Typography>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, value, percent }) => `${name}: ${value} u. (${(percent * 100).toFixed(0)}%)`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            animationDuration={800}
            animationBegin={0}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} stroke={theme.palette.background.paper} strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => `${value} unidades`} />
          <Legend verticalAlign="bottom" height={36} iconType="circle" />
        </PieChart>
      </ResponsiveContainer>
    </Box>
  );
};

export default StockChart;