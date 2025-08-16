import React, { useEffect, useState } from 'react';
import { Box, Typography, CircularProgress, Button } from '@mui/material';
import { Settings } from '@mui/icons-material';

const SetupRedirect = ({ children }) => {
  const [setupStatus, setSetupStatus] = useState('checking');
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    checkSetupAndRedirect();
  }, []);

  const checkSetupAndRedirect = async () => {
    try {
      // Check if we're in Netlify environment
      const isNetlify = window.location.hostname.includes('netlify.app') || 
                       window.location.hostname.includes('netlify.com');
      
      if (!isNetlify) {
        setSetupStatus('ready');
        return; // Local development
      }

      const response = await fetch('/api/auth/database-status');
      
      if (response.status === 503) {
        setSetupStatus('needs_setup');
        startCountdown();
      } else {
        setSetupStatus('ready');
      }
    } catch (error) {
      console.log('Setup check failed:', error);
      setSetupStatus('needs_setup');
      startCountdown();
    }
  };

  const startCountdown = () => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          window.location.href = '/status';
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const redirectNow = () => {
    window.location.href = '/status';
  };

  if (setupStatus === 'checking') {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        flexDirection="column"
      >
        <CircularProgress />
        <Typography variant="body2" sx={{ mt: 2 }}>
          Checking setup status...
        </Typography>
      </Box>
    );
  }

  if (setupStatus === 'needs_setup') {
    return (
      <Box 
        display="flex" 
        justifyContent="center" 
        alignItems="center" 
        minHeight="100vh"
        flexDirection="column"
        sx={{ p: 3, textAlign: 'center' }}
      >
        <Settings sx={{ fontSize: 60, color: 'warning.main', mb: 2 }} />
        
        <Typography variant="h4" gutterBottom>
          Setup Required
        </Typography>
        
        <Typography variant="body1" sx={{ mb: 3, maxWidth: 500 }}>
          This deployment needs environment variables to function properly. 
          You will be redirected to the setup page automatically.
        </Typography>
        
        <Typography variant="h6" sx={{ mb: 3, color: 'warning.main' }}>
          Redirecting in {countdown} seconds...
        </Typography>
        
        <Button 
          variant="contained" 
          size="large"
          startIcon={<Settings />}
          onClick={redirectNow}
        >
          Go to Setup Page Now
        </Button>
      </Box>
    );
  }

  return children;
};

export default SetupRedirect;