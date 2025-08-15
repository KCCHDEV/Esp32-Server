import React from 'react';
import { Box, Typography, Button, Paper, Alert } from '@mui/material';
import { ErrorOutline, Refresh, Home } from '@mui/icons-material';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null 
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Generate error ID for tracking
    const errorId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    
    // Log error details
    console.error('Error Boundary caught an error:', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorId
    });

    this.setState({
      error,
      errorInfo,
      errorId
    });

    // Report to error tracking service (if configured)
    if (window.reportError) {
      window.reportError({
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        errorId,
        url: window.location.href,
        userAgent: navigator.userAgent
      });
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null 
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <Box
          display="flex"
          justifyContent="center"
          alignItems="center"
          minHeight="100vh"
          bgcolor="#f5f5f5"
          padding={3}
        >
          <Paper 
            elevation={3} 
            sx={{ 
              maxWidth: 600, 
              padding: 4, 
              textAlign: 'center',
              borderRadius: 2
            }}
          >
            <ErrorOutline 
              sx={{ 
                fontSize: 64, 
                color: 'error.main', 
                marginBottom: 2 
              }} 
            />
            
            <Typography variant="h4" gutterBottom color="error">
              Something went wrong
            </Typography>
            
            <Typography variant="body1" color="text.secondary" paragraph>
              We're sorry, but something unexpected happened. Our team has been notified.
            </Typography>

            {this.state.errorId && (
              <Alert severity="info" sx={{ marginBottom: 3 }}>
                <Typography variant="body2">
                  Error ID: <code>{this.state.errorId}</code>
                  <br />
                  Please include this ID when reporting the issue.
                </Typography>
              </Alert>
            )}

            <Box display="flex" gap={2} justifyContent="center" flexWrap="wrap">
              <Button
                variant="contained"
                startIcon={<Refresh />}
                onClick={this.handleRetry}
                color="primary"
              >
                Try Again
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={this.handleReload}
              >
                Reload Page
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<Home />}
                onClick={this.handleGoHome}
              >
                Go Home
              </Button>
            </Box>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <Box mt={4} textAlign="left">
                <Typography variant="h6" color="error" gutterBottom>
                  Development Error Details:
                </Typography>
                <Paper 
                  sx={{ 
                    padding: 2, 
                    backgroundColor: '#f5f5f5',
                    maxHeight: 300,
                    overflow: 'auto'
                  }}
                >
                  <Typography variant="body2" component="pre" sx={{ whiteSpace: 'pre-wrap' }}>
                    {this.state.error.toString()}
                    {this.state.errorInfo.componentStack}
                  </Typography>
                </Paper>
              </Box>
            )}
          </Paper>
        </Box>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;