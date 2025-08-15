import React from 'react';
import { Container, Typography, Paper } from '@mui/material';

const ProfilePage = () => {
  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Profile
      </Typography>
      
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1">
          User profile settings will be available here.
        </Typography>
      </Paper>
    </Container>
  );
};

export default ProfilePage;