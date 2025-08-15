import React from 'react';
import { Container, Typography, Paper } from '@mui/material';
import { useParams } from 'react-router-dom';

const ProjectEditorPage = () => {
  const { id } = useParams();

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Project Editor
      </Typography>
      
      <Paper sx={{ p: 3, minHeight: '60vh' }}>
        <Typography variant="body1">
          Visual editor for project {id} will be implemented here.
        </Typography>
      </Paper>
    </Container>
  );
};

export default ProjectEditorPage;