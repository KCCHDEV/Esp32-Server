import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Container,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableRow,
  TableHead,
  Chip,
  Box,
  Skeleton,
  Alert,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import VisibilityIcon from '@mui/icons-material/Visibility';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

const DevicesPage = () => {
  const [devices, setDevices] = useState([]);
  const [pagination, setPagination] = useState({ limit: 50, offset: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState('');
  const [addDesc, setAddDesc] = useState('');
  const [addPlatform, setAddPlatform] = useState('ESP32');
  const [addSubmitting, setAddSubmitting] = useState(false);
  const navigate = useNavigate();

  const fetchDevices = (offset = 0) => {
    setLoading(true);
    axios
      .get('/api/devices', { params: { limit: 50, offset } })
      .then((res) => {
        setDevices(res.data.devices || []);
        setPagination(res.data.pagination || { limit: 50, offset: 0, total: 0 });
      })
      .catch((err) => setError(err.response?.data?.message || 'โหลดไม่สำเร็จ'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDevices(0);
  }, []);

  const handleAddDevice = () => {
    if (!addName.trim()) {
      toast.error('กรอกชื่ออุปกรณ์');
      return;
    }
    setAddSubmitting(true);
    axios
      .post('/api/devices', { name: addName.trim(), description: addDesc.trim() || undefined, platform: addPlatform })
      .then((res) => {
        toast.success('เพิ่มอุปกรณ์แล้ว — เก็บ API Key ไว้ใช้ใน firmware');
        setAddOpen(false);
        setAddName('');
        setAddDesc('');
        setAddPlatform('ESP32');
        fetchDevices(0);
        const newId = res.data.device?.id;
        if (newId) navigate(`/devices/${newId}`);
      })
      .catch((err) => toast.error(err.response?.data?.message || 'สร้างไม่สำเร็จ'))
      .finally(() => setAddSubmitting(false));
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          อุปกรณ์
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddOpen(true)}>
          เพิ่มอุปกรณ์
        </Button>
      </Box>

      <Dialog open={addOpen} onClose={() => !addSubmitting && setAddOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>เพิ่มอุปกรณ์</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="ชื่ออุปกรณ์"
            fullWidth
            value={addName}
            onChange={(e) => setAddName(e.target.value)}
          />
          <TextField
            margin="dense"
            label="คำอธิบาย (ไม่บังคับ)"
            fullWidth
            multiline
            value={addDesc}
            onChange={(e) => setAddDesc(e.target.value)}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>Platform</InputLabel>
            <Select value={addPlatform} label="Platform" onChange={(e) => setAddPlatform(e.target.value)}>
              <MenuItem value="ESP32">ESP32</MenuItem>
              <MenuItem value="RASPBERRY_PI">Raspberry Pi</MenuItem>
              <MenuItem value="OTHER">อื่นๆ</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddOpen(false)} disabled={addSubmitting}>ยกเลิก</Button>
          <Button variant="contained" onClick={handleAddDevice} disabled={addSubmitting}>
            {addSubmitting ? 'กำลังสร้าง...' : 'สร้าง'}
          </Button>
        </DialogActions>
      </Dialog>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ overflow: 'auto' }}>
        {loading ? (
          <Box sx={{ p: 2 }}>
            <Skeleton variant="rectangular" height={200} />
          </Box>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>ชื่อ</TableCell>
                <TableCell>Platform</TableCell>
                <TableCell>สถานะ</TableCell>
                <TableCell>เฟิร์มแวร์</TableCell>
                <TableCell>ล่าสุด</TableCell>
                <TableCell align="right">การดำเนินการ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {devices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                    ยังไม่มีอุปกรณ์ — กด «เพิ่มอุปกรณ์» เพื่อสร้าง
                  </TableCell>
                </TableRow>
              ) : (
                devices.map((d) => (
                  <TableRow key={d.id} hover>
                    <TableCell>{d.name}</TableCell>
                    <TableCell><Chip size="small" label={d.platform || 'ESP32'} variant="outlined" /></TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={d.isOnline ? 'ออนไลน์' : 'ออฟไลน์'}
                        color={d.isOnline ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell>{d.firmwareVersion || '-'}</TableCell>
                    <TableCell>
                      {d.lastSeen ? formatDistanceToNow(new Date(d.lastSeen), { addSuffix: true }) : '-'}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/devices/${d.id}`)}
                        title="ดูรายละเอียด"
                      >
                        <VisibilityIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        )}
        {pagination.total > devices.length && (
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="body2" color="text.secondary">
              แสดง {devices.length} / {pagination.total}
            </Typography>
            <Button
              size="small"
              disabled={pagination.offset + pagination.limit >= pagination.total}
              onClick={() => fetchDevices(pagination.offset + pagination.limit)}
            >
              ถัดไป
            </Button>
          </Box>
        )}
      </Paper>
    </Container>
  );
};

export default DevicesPage;
