import React from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';
import { Paper, Typography, Box } from '@mui/material';

ChartJS.register(ArcElement, Tooltip, Legend);

const MetricsChart = () => {
  const data = {
    labels: ['En Stock', 'Stock Bajo', 'Stock Crítico'],
    datasets: [
      {
        data: [75, 15, 10],
        backgroundColor: [
          '#4caf50',
          '#ff9800',
          '#f44336',
        ],
        borderColor: [
          '#388e3c',
          '#f57c00',
          '#d32f2f',
        ],
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
      },
    },
  };

  return (
    <Paper sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Distribución General
      </Typography>
      <Box sx={{ height: 300, display: 'flex', justifyContent: 'center' }}>
        <Doughnut data={data} options={options} />
      </Box>
    </Paper>
  );
};

export default MetricsChart;