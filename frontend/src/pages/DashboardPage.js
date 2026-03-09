import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Box,
  Chip,
  Button,
  Table,
  TableBody,
  TableCell,
  TableRow,
  TableHead,
  Skeleton,
  Alert,
} from '@mui/material';
import DevicesIcon from '@mui/icons-material/Devices';
import FolderIcon from '@mui/icons-material/Folder';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import { formatDistanceToNow } from 'date-fns';

const DashboardPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    axios
      .get('/api/dashboard/stats')
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.response?.data?.message || 'โหลดไม่สำเร็จ');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Typography variant="h4" sx={{ mb: 3 }}>Dashboard</Typography>
        <Grid container spacing={3}>
          {[1, 2, 3].map((i) => (
            <Grid item xs={12} sm={4} key={i}>
              <Skeleton variant="rectangular" height={120} />
            </Grid>
          ))}
          <Grid item xs={12} md={6}>
            <Skeleton variant="rectangular" height={280} />
          </Grid>
          <Grid item xs={12} md={6}>
            <Skeleton variant="rectangular" height={280} />
          </Grid>
        </Grid>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>
      </Container>
    );
  }

  const { stats = {}, recentDevices = [], recentProjects = [] } = data || {};

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" component="h1" gutterBottom>
        Dashboard
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        สรุปสถานะและรายการล่าสุด — กดไปหน้ารายละเอียดหรือจัดการได้
      </Typography>

      <Grid container spacing={3}>
        {/* การ์ดสถิติ */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'primary.main', color: 'primary.contrastText' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <DevicesIcon /> <Typography variant="h6">อุปกรณ์ทั้งหมด</Typography>
              </Box>
              <Typography variant="h4">{stats.devicesTotal ?? 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'success.main', color: 'success.contrastText' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <DevicesIcon /> <Typography variant="h6">ออนไลน์</Typography>
              </Box>
              <Typography variant="h4">{stats.devicesOnline ?? 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'grey.700', color: 'grey.100' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <DevicesIcon /> <Typography variant="h6">ออฟไลน์</Typography>
              </Box>
              <Typography variant="h4">{stats.devicesOffline ?? 0}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ bgcolor: 'info.main', color: 'info.contrastText' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <FolderIcon /> <Typography variant="h6">โปรเจกต์</Typography>
              </Box>
              <Typography variant="h4">{stats.projectsTotal ?? 0}</Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* ตารางอุปกรณ์ล่าสุด — กดตอบโต้ */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">อุปกรณ์ล่าสุด</Typography>
              <Button size="small" onClick={() => navigate('/devices')}>
                ดูทั้งหมด
              </Button>
            </Box>
            {recentDevices.length === 0 ? (
              <Typography variant="body2" color="text.secondary">ยังไม่มีอุปกรณ์ — เพิ่มจากเมนู อุปกรณ์</Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>ชื่อ</TableCell>
                    <TableCell>สถานะ</TableCell>
                    <TableCell>ล่าสุด</TableCell>
                    <TableCell align="right">การดำเนินการ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentDevices.map((d) => (
                    <TableRow key={d.id} hover>
                      <TableCell>{d.name}</TableCell>
                      <TableCell>
                        <Chip
                          label={d.isOnline ? 'ออนไลน์' : 'ออฟไลน์'}
                          size="small"
                          color={d.isOnline ? 'success' : 'default'}
                        />
                      </TableCell>
                      <TableCell>
                        {d.lastSeen
                          ? formatDistanceToNow(new Date(d.lastSeen), { addSuffix: true })
                          : '-'}
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          startIcon={<VisibilityIcon />}
                          onClick={() => navigate(`/devices/${d.id}`)}
                        >
                          ดู
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        </Grid>

        {/* โปรเจกต์ล่าสุด — กดตอบโต้ */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">โปรเจกต์ล่าสุด</Typography>
              <Button size="small" onClick={() => navigate('/projects')}>
                ดูทั้งหมด
              </Button>
            </Box>
            {recentProjects.length === 0 ? (
              <Typography variant="body2" color="text.secondary">ยังไม่มีโปรเจกต์</Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>ชื่อ</TableCell>
                    <TableCell>สถานะ</TableCell>
                    <TableCell>อัปเดต</TableCell>
                    <TableCell align="right">การดำเนินการ</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {recentProjects.map((p) => (
                    <TableRow key={p.id} hover>
                      <TableCell>{p.name}</TableCell>
                      <TableCell>
                        <Chip
                          label={p.deploymentStatus || (p.isActive ? 'ใช้งาน' : 'ปิด')}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell>
                        {p.updatedAt
                          ? formatDistanceToNow(new Date(p.updatedAt), { addSuffix: true })
                          : '-'}
                      </TableCell>
                      <TableCell align="right">
                        <Button
                          size="small"
                          startIcon={<EditIcon />}
                          onClick={() => navigate(`/projects/${p.id}/editor`)}
                        >
                          เปิด
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default DashboardPage;
