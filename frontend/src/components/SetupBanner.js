import React, { useState, useEffect } from 'react';
import { Alert, AlertTitle, Button, Box, Typography, Link } from '@mui/material';
import { Settings, Warning } from '@mui/icons-material';

const SetupBanner = () => {
  const [setupStatus, setSetupStatus] = useState(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    checkSetupStatus();
  }, []);

  const checkSetupStatus = async () => {
    try {
      // Check if we're in Netlify environment
      const isNetlify = window.location.hostname.includes('netlify.app') || 
                       window.location.hostname.includes('netlify.com');
      
      if (!isNetlify) {
        setIsChecking(false);
        return; // Don't show banner for local development
      }

      const response = await fetch('/api/auth/database-status');
      const data = await response.json();
      
      if (response.status === 503) {
        setSetupStatus('needs_setup');
      } else if (response.ok && data.success) {
        setSetupStatus('ready');
      } else {
        setSetupStatus('error');
      }
    } catch (error) {
      console.log('Setup status check failed:', error);
      setSetupStatus('needs_setup');
    } finally {
      setIsChecking(false);
    }
  };

  const handleSetupClick = () => {
    window.open('/status', '_blank');
  };

  const handleDismiss = () => {
    setSetupStatus('dismissed');
    localStorage.setItem('setup-banner-dismissed', 'true');
  };

  // Don't show if checking, dismissed, or ready
  if (isChecking || 
      setupStatus === 'ready' || 
      setupStatus === 'dismissed' ||
      localStorage.getItem('setup-banner-dismissed') === 'true') {
    return null;
  }

  // Show setup needed banner
  if (setupStatus === 'needs_setup' || setupStatus === 'error') {
    return (
      <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 1300 }}>
        <Alert 
          severity="warning" 
          variant="filled"
          sx={{ 
            borderRadius: 0,
            display: 'flex',
            alignItems: 'center',
            minHeight: 60
          }}
          action={
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Button 
                color="inherit" 
                size="small" 
                variant="outlined"
                startIcon={<Settings />}
                onClick={handleSetupClick}
                sx={{ 
                  borderColor: 'rgba(255,255,255,0.5)',
                  color: 'white',
                  '&:hover': {
                    borderColor: 'white',
                    backgroundColor: 'rgba(255,255,255,0.1)'
                  }
                }}
              >
                Setup Required
              </Button>
              <Button 
                color="inherit" 
                size="small"
                onClick={handleDismiss}
                sx={{ 
                  color: 'rgba(255,255,255,0.8)',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.1)'
                  }
                }}
              >
                ×
              </Button>
            </Box>
          }
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Warning />
            <Box>
              <AlertTitle sx={{ mb: 0 }}>Environment Setup Required</AlertTitle>
              <Typography variant="body2">
                This deployment needs environment variables to function. 
                <Link 
                  href="/status" 
                  target="_blank" 
                  sx={{ 
                    color: 'white', 
                    textDecoration: 'underline',
                    ml: 0.5
                  }}
                >
                  Click here for setup instructions
                </Link>
              </Typography>
            </Box>
          </Box>
        </Alert>
      </Box>
    );
  }

  return null;
};

export default SetupBanner;