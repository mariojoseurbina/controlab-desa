// import React from 'react';
// import {
//   Chart as ChartJS,
//   CategoryScale,
//   LinearScale,
//   PointElement,
//   LineElement,
//   Title,
//   Tooltip,
//   Legend,
// } from 'chart.js';
// import { Line } from 'react-chartjs-2';
// import { Paper, Typography } from '@mui/material';

// ChartJS.register(
//   CategoryScale,
//   LinearScale,
//   PointElement,
//   LineElement,
//   Title,
//   Tooltip,
//   Legend
// );

// const MovementChart = () => {
//   const data = {
//     labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
//     datasets: [
//       {
//         label: 'Entradas',
//         data: [12, 19, 8, 15, 22, 3, 7],
//         borderColor: 'rgb(75, 192, 192)',
//         backgroundColor: 'rgba(75, 192, 192, 0.2)',
//         tension: 0.1,
//       },
//       {
//         label: 'Salidas',
//         data: [8, 15, 12, 18, 10, 5, 9],
//         borderColor: 'rgb(255, 99, 132)',
//         backgroundColor: 'rgba(255, 99, 132, 0.2)',
//         tension: 0.1,
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
//         text: 'Movimientos de la Semana',
//       },
//     },
//   };

//   return (
//     <Paper sx={{ p: 2 }}>
//       <Typography variant="h6" gutterBottom>
//         Movimientos Semanales
//       </Typography>
//       <Line data={data} options={options} />
//     </Paper>
//   );
// };

// export default MovementChart;

// frontend/src/components/Charts/MovementChart.jsx

import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Typography, Box, CircularProgress, useTheme, Alert } from '@mui/material';
import { dashboardService } from '../../services/dashboardService';

const COLORS = {
  Entradas: '#2A9D8F',
  Salidas: '#E63946'
};

const MovementChart = () => {
  const theme = useTheme();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { entradasTotal, salidasTotal } = await dashboardService.getWeeklyMovementsSummary();
        setData([
          { name: 'Entradas', value: entradasTotal || 0, color: COLORS.Entradas },
          { name: 'Salidas', value: salidasTotal || 0, color: COLORS.Salidas }
        ]);
      } catch (err) {
        console.error('Error cargando resumen de movimientos:', err);
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
        No se pudieron cargar los movimientos semanales.
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold', fontSize: '0.95rem', mb: 1 }}>
        📈 Movimientos Semanales (Entradas vs Salidas)
      </Typography>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={55}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
            label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
            animationDuration={800}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} stroke={theme.palette.background.paper} strokeWidth={2} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => `${value} movimientos`} />
          <Legend verticalAlign="bottom" height={36} />
        </PieChart>
      </ResponsiveContainer>
      <Typography variant="caption" color="textSecondary" align="center" display="block" sx={{ mt: 1 }}>
        Total acumulado de la semana actual
      </Typography>
    </Box>
  );
};

export default MovementChart;