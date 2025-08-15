import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  Divider,
  InputAdornment,
  IconButton,
  CircularProgress,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  Person,
  Computer,
  CheckCircle,
} from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import axios from 'axios';

import { useAuth } from '../contexts/AuthContext';

// Validation schema
const schema = yup.object({
  username: yup
    .string()
    .required('Username is required')
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be at most 50 characters'),
  email: yup
    .string()
    .required('Email is required')
    .email('Email must be valid'),
  password: yup
    .string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters'),
  confirmPassword: yup
    .string()
    .required('Confirm password is required')
    .oneOf([yup.ref('password')], 'Passwords must match'),
});

const RegisterPage = () => {
  const navigate = useNavigate();
  const { register: registerUser, loading, error, clearError } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [databaseStatus, setDatabaseStatus] = useState('checking'); // checking, ready, needs-setup, setting-up
  const [setupMessage, setSetupMessage] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
  });

  // Check database status on component mount
  useEffect(() => {
    checkDatabaseStatus();
  }, []);

  const checkDatabaseStatus = async () => {
    try {
      const response = await axios.get('/api/auth/database-status');
      if (response.data.isSetup) {
        setDatabaseStatus('ready');
      } else {
        setDatabaseStatus('needs-setup');
        setSetupMessage('Database needs initialization');
      }
    } catch (error) {
      console.error('Database status check failed:', error);
      setDatabaseStatus('needs-setup');
      setSetupMessage('Database connection failed');
    }
  };

  const setupDatabase = async () => {
    try {
      setDatabaseStatus('setting-up');
      setSetupMessage('Setting up database...');
      
      const response = await axios.post('/api/auth/setup-database');
      
      if (response.data.setupComplete) {
        setDatabaseStatus('ready');
        setSetupMessage('Database setup completed! You can now register.');
      }
    } catch (error) {
      console.error('Database setup failed:', error);
      setDatabaseStatus('needs-setup');
      setSetupMessage(error.response?.data?.message || 'Database setup failed');
    }
  };

  const onSubmit = async (data) => {
    if (databaseStatus !== 'ready') {
      setSetupMessage('Please setup database first');
      return;
    }

    clearError();
    const { confirmPassword, ...userData } = data;
    const result = await registerUser(userData);
    if (result.success) {
      navigate('/dashboard');
    }
  };

  const handleClickShowPassword = () => {
    setShowPassword(!showPassword);
  };

  const handleClickShowConfirmPassword = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  // Database Status Indicator
  const DatabaseStatusIndicator = () => {
    switch (databaseStatus) {
      case 'checking':
        return (
          <Alert severity="info" sx={{ mb: 3 }}>
            <Box display="flex" alignItems="center" gap={1}>
              <CircularProgress size={16} />
              <Typography variant="body2">Checking database status...</Typography>
            </Box>
          </Alert>
        );
      
      case 'needs-setup':
        return (
          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="body2" gutterBottom>
              {setupMessage}
            </Typography>
            <Button
              variant="contained"
              size="small"
              onClick={setupDatabase}
              startIcon={<CheckCircle />}
              sx={{ mt: 1 }}
            >
              Setup Database
            </Button>
          </Alert>
        );
      
      case 'setting-up':
        return (
          <Alert severity="info" sx={{ mb: 3 }}>
            <Box display="flex" alignItems="center" gap={1}>
              <CircularProgress size={16} />
              <Typography variant="body2">{setupMessage}</Typography>
            </Box>
          </Alert>
        );
      
      case 'ready':
        return (
          <Alert severity="success" sx={{ mb: 3 }}>
            <Box display="flex" alignItems="center" gap={1}>
              <CheckCircle />
              <Typography variant="body2">
                Database is ready! {setupMessage && `${setupMessage}`}
              </Typography>
            </Box>
          </Alert>
        );
      
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="sm">
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          py: 3,
        }}
      >
        <Paper
          elevation={24}
          sx={{
            p: 4,
            width: '100%',
            maxWidth: 480,
            borderRadius: 2,
            backdropFilter: 'blur(10px)',
            background: 'rgba(255, 255, 255, 0.95)',
          }}
        >
          {/* Header */}
          <Box textAlign="center" mb={3}>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                mb: 2,
              }}
            >
              <Computer sx={{ fontSize: 32, color: 'white' }} />
            </Box>
            <Typography
              variant="h4"
              component="h1"
              fontWeight="bold"
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 1,
              }}
            >
              ESP32 Platform
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Create your account to start building
            </Typography>
          </Box>

          {/* Database Status */}
          <DatabaseStatusIndicator />

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Register Form */}
          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            {/* Username Field */}
            <TextField
              {...register('username')}
              margin="normal"
              required
              fullWidth
              label="Username"
              autoComplete="username"
              autoFocus
              error={!!errors.username}
              helperText={errors.username?.message}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Person color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
            />

            {/* Email Field */}
            <TextField
              {...register('email')}
              margin="normal"
              required
              fullWidth
              label="Email Address"
              type="email"
              autoComplete="email"
              error={!!errors.email}
              helperText={errors.email?.message}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Email color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
            />

            {/* Password Field */}
            <TextField
              {...register('password')}
              margin="normal"
              required
              fullWidth
              label="Password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              error={!!errors.password}
              helperText={errors.password?.message}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle password visibility"
                      onClick={handleClickShowPassword}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 2 }}
            />

            {/* Confirm Password Field */}
            <TextField
              {...register('confirmPassword')}
              margin="normal"
              required
              fullWidth
              label="Confirm Password"
              type={showConfirmPassword ? 'text' : 'password'}
              autoComplete="new-password"
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword?.message}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Lock color="action" />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      aria-label="toggle confirm password visibility"
                      onClick={handleClickShowConfirmPassword}
                      edge="end"
                    >
                      {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ mb: 3 }}
            />

            {/* Submit Button */}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              disabled={loading || databaseStatus !== 'ready'}
              sx={{
                mt: 1,
                mb: 2,
                py: 1.5,
                background: databaseStatus === 'ready' 
                  ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                  : 'rgba(0, 0, 0, 0.12)',
                '&:hover': {
                  background: databaseStatus === 'ready'
                    ? 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)'
                    : 'rgba(0, 0, 0, 0.12)',
                },
                '&:disabled': {
                  background: 'rgba(0, 0, 0, 0.12)',
                },
              }}
            >
              {loading ? 'Creating Account...' : 
               databaseStatus !== 'ready' ? 'Setup Database First' : 'Create Account'}
            </Button>

            <Divider sx={{ my: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Already have an account?
              </Typography>
            </Divider>

            <Button
              component={Link}
              to="/login"
              fullWidth
              variant="outlined"
              sx={{
                py: 1.5,
                borderColor: '#667eea',
                color: '#667eea',
                '&:hover': {
                  borderColor: '#5a6fd8',
                  backgroundColor: 'rgba(102, 126, 234, 0.04)',
                },
              }}
            >
              Sign In Instead
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default RegisterPage;