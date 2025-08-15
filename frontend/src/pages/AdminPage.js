import React from 'react';
import { Container, Typography, Paper } from '@mui/material';

const AdminPage = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Admin Panel
      </Typography>
      
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1">
          Administrative functions will be available here.
        </Typography>
      </Paper>
    </Container>
  );
};

export default AdminPage;