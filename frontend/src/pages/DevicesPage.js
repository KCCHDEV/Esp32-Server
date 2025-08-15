import React from 'react';
import { Container, Typography, Paper } from '@mui/material';

const DevicesPage = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Devices
      </Typography>
      
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1">
          Manage your ESP32 devices here.
        </Typography>
      </Paper>
    </Container>
  );
};

export default DevicesPage;