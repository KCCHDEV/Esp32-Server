import React from 'react';
import { Container, Typography, Paper } from '@mui/material';
import { useParams } from 'react-router-dom';

const DeviceDetailPage = () => {
  const { id } = useParams();

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Device Details
      </Typography>
      
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1">
          Details for device {id} will be shown here.
        </Typography>
      </Paper>
    </Container>
  );
};

export default DeviceDetailPage;