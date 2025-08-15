import React from 'react';
import { Container, Typography, Paper } from '@mui/material';

const ProjectsPage = () => {
  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Projects
      </Typography>
      
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1">
          Your ESP32 projects will be listed here.
        </Typography>
      </Paper>
    </Container>
  );
};

export default ProjectsPage;