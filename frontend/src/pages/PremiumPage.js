import React from 'react';
import { Container, Typography, Paper } from '@mui/material';

const PremiumPage = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Premium Features
      </Typography>
      
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1">
          Premium features and pricing information will be shown here.
        </Typography>
      </Paper>
    </Container>
  );
};

export default PremiumPage;