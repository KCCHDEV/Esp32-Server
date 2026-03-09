import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Container,
  Typography,
  Paper,
  Grid,
  Box,
  Chip,
  Button,
  Skeleton,
  Alert,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RefreshIcon from '@mui/icons-material/Refresh';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

const DeviceDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [device, setDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDevice = () => {
    if (!id) return;
    setLoading(true);
    axios
      .get(`/api/devices/${id}`)
      .then((res) => setDevice(res.data.device))
      .catch((err) => setError(err.response?.data?.message || 'โหลดไม่สำเร็จ'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDevice();
  }, [id]);

  const handleCopyApiKey = () => {
    if (device?.apiKey) {
      navigator.clipboard.writeText(device.apiKey);
      toast.success('คัดลอก API Key แล้ว');
    }
  };

  if (loading && !device) {
    return (
      <Container maxWidth="md">
        <Skeleton variant="text" width={200} height={40} />
        <Skeleton variant="rectangular" height={300} sx={{ mt: 2 }} />
      </Container>
    );
  }

  if (error && !device) {
    return (
      <Container maxWidth="md">
        <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/devices')} sx={{ mt: 2 }}>
          กลับไปรายการอุปกรณ์
        </Button>
      </Container>
    );
  }

  if (!device) return null;

  return (
    <Container maxWidth="md">
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <IconButton onClick={() => navigate('/devices')} size="small">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h4" component="h1">
          {device.name}
        </Typography>
        <Chip
          label={device.isOnline ? 'ออนไลน์' : 'ออฟไลน์'}
          color={device.isOnline ? 'success' : 'default'}
          size="small"
        />
        <Button size="small" startIcon={<RefreshIcon />} onClick={fetchDevice}>
          รีเฟรช
        </Button>
      </Box>

      <Paper sx={{ p: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">ชื่อ</Typography>
            <Typography variant="body1">{device.name}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">Platform</Typography>
            <Typography variant="body1">{device.platform || 'ESP32'}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">Device ID</Typography>
            <Typography variant="body2" fontFamily="monospace">{device.deviceId}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">เฟิร์มแวร์</Typography>
            <Typography variant="body1">{device.firmwareVersion || '-'}</Typography>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Typography variant="caption" color="text.secondary">ล่าสุด</Typography>
            <Typography variant="body1">
              {device.lastSeen
                ? formatDistanceToNow(new Date(device.lastSeen), { addSuffix: true })
                : '-'}
            </Typography>
          </Grid>
          {device.uptime != null && (
            <Grid item xs={12} sm={6}>
              <Typography variant="caption" color="text.secondary">Uptime (device)</Typography>
              <Typography variant="body1">{Math.round(device.uptime / 1000)}s</Typography>
            </Grid>
          )}
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Typography variant="subtitle2" gutterBottom>API Key (ใช้ใน firmware / Raspi)</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Paper variant="outlined" sx={{ p: 1.5, flex: 1, fontFamily: 'monospace', fontSize: '0.85rem', wordBreak: 'break-all' }}>
            {device.apiKey || '—'}
          </Paper>
          <Tooltip title="คัดลอก">
            <IconButton onClick={handleCopyApiKey} size="small">
              <ContentCopyIcon />
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ mt: 3 }}>
          <Button variant="outlined" onClick={() => navigate('/devices')}>
            กลับไปรายการ
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default DeviceDetailPage;
