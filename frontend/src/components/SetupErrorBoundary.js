import React from 'react';
import { Alert, AlertTitle, Button, Box, Typography, Card, CardContent } from '@mui/material';
import { Warning, Settings, Refresh } from '@mui/icons-material';

class SetupErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Setup Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box sx={{ p: 3, maxWidth: 600, mx: 'auto', mt: 4 }}>
          <Card>
            <CardContent>
              <Alert severity="error" sx={{ mb: 2 }}>
                <AlertTitle>Setup Configuration Required</AlertTitle>
                <Typography variant="body2">
                  The application encountered an error, likely due to missing environment configuration.
                </Typography>
              </Alert>

              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Quick Fix Steps:
                </Typography>
                <Typography variant="body2" component="ol" sx={{ pl: 2 }}>
                  <li>Visit the status page to check configuration</li>
                  <li>Set required environment variables in Netlify</li>
                  <li>Redeploy the application</li>
                  <li>Refresh this page</li>
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  startIcon={<Settings />}
                  href="/status"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Check Status & Setup
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={() => window.location.reload()}
                >
                  Refresh Page
                </Button>
              </Box>

              {process.env.NODE_ENV === 'development' && (
                <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                  <Typography variant="caption" component="pre" sx={{ fontSize: '0.75rem' }}>
                    {this.state.error?.toString()}
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default SetupErrorBoundary;