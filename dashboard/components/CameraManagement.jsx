import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Card,
  CardContent,
  Typography,
  IconButton,
  Grid,
  Snackbar,
  Alert
} from '@mui/material';
import { Delete as DeleteIcon, Edit as EditIcon, Videocam as CameraIcon } from '@mui/icons-material';
import useSWR, { mutate } from 'swr';
import { apiFetcher } from '../lib/apiFetcher';

const fetcher = (url) => apiFetcher(url);

export default function CameraManagement() {
  const [open, setOpen] = useState(false);
  const [editingCamera, setEditingCamera] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    location: ''
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [watchStatus, setWatchStatus] = useState('stopped');

  const { data: cameras = [], error } = useSWR('/api/cameras', fetcher);
  const { data: incidents = { incidents: [] } } = useSWR('/api/incidents', fetcher);

  // Poll watch status every 5 seconds
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const token = localStorage.getItem('authToken');
        const res = await fetch('/api/watch/status', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        setWatchStatus(data.status || 'stopped');
      } catch (err) {
        console.error('Error checking watch status:', err);
      }
    };
    
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleClickOpen = () => {
    setFormData({
      name: '',
      url: '',
      location: ''
    });
    setEditingCamera(null);
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingCamera(null);
  };

  const handleEdit = (camera) => {
    setFormData({
      name: camera.name,
      url: camera.url,
      location: camera.location
    });
    setEditingCamera(camera);
    setOpen(true);
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({
      open: true,
      message,
      severity
    });
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const url = editingCamera ? `/api/cameras/${editingCamera.id}` : '/api/cameras';
      const method = editingCamera ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to save camera');
      }

      showSnackbar(editingCamera ? 'Camera updated successfully' : 'Camera added successfully');
      mutate('/api/cameras'); // Refresh the camera list
      handleClose();
    } catch (error) {
      console.error('Error saving camera:', error);
      showSnackbar('Failed to save camera', 'error');
    }
  };

  const handleDelete = async (cameraId) => {
    if (!confirm('Are you sure you want to delete this camera?')) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/cameras/${cameraId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to delete camera');
      }

      showSnackbar('Camera deleted successfully');
      mutate('/api/cameras'); // Refresh the camera list
    } catch (error) {
      console.error('Error deleting camera:', error);
      showSnackbar('Failed to delete camera', 'error');
    }
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error.status === 401 ? 'Session expired. Please log in again.' : `Error loading cameras: ${error.message}`}
          <Button size="small" variant="outlined" sx={{ ml: 2 }} onClick={() => mutate('/api/cameras')}>Retry</Button>
        </Alert>
      )}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Camera Management
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant={watchStatus === 'running' ? 'contained' : 'outlined'}
            color="success"
            onClick={async () => {
              try {
                const token = localStorage.getItem('authToken');
                const r = await fetch('/api/watch/start', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
                const data = await r.json();
                if (!r.ok) throw new Error('Failed to start watcher');
                showSnackbar(`Realtime watcher started (${data.cameras?.length || 0} cameras)`);
                setWatchStatus('running');
              } catch (e) {
                console.error(e);
                showSnackbar('Failed to start watcher', 'error');
              }
            }}
            disabled={watchStatus === 'running'}
          >
            {watchStatus === 'running' ? '✓ Watch Running' : 'Start Watch'}
          </Button>
          <Button
            variant="outlined"
            color="warning"
            onClick={async () => {
              try {
                const token = localStorage.getItem('authToken');
                const r = await fetch('/api/watch/stop', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
                if (!r.ok) throw new Error('Failed to stop watcher');
                showSnackbar('Realtime watcher stopped');
                setWatchStatus('stopped');
              } catch (e) {
                console.error(e);
                showSnackbar('Failed to stop watcher', 'error');
              }
            }}
            disabled={watchStatus !== 'running'}
          >
            Stop Watch
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<CameraIcon />}
            onClick={handleClickOpen}
          >
            Add Camera
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {cameras.map((camera) => (
          <Grid item xs={12} sm={6} md={4} key={camera.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                  <Box>
                    <Typography variant="h6" component="h2">
                      {camera.name}
                    </Typography>
                    <Typography color="textSecondary" gutterBottom>
                      {camera.location}
                    </Typography>
                    <Typography variant="body2" component="p" sx={{ mt: 1 }}>
                      URL: {camera.url}
                    </Typography>
                  </Box>
                  <Box>
                    <IconButton
                      size="small"
                      onClick={() => handleEdit(camera)}
                      sx={{ mr: 1 }}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDelete(camera.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Captured Incident Images Section */}
      <Box sx={{ mt: 6 }}>
        <Typography variant="h5" component="h2" sx={{ mb: 3 }}>
          Captured Incidents
        </Typography>
        {incidents.incidents && incidents.incidents.length > 0 ? (
          <Grid container spacing={2}>
            {incidents.incidents.slice(0, 12).map((incident) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={incident.filename}>
                <Card>
                  <Box
                    component="img"
                    src={`http://127.0.0.1:8000${incident.url}`}
                    alt={incident.filename}
                    sx={{
                      width: '100%',
                      height: 200,
                      objectFit: 'cover',
                      cursor: 'pointer'
                    }}
                    onClick={() => window.open(`http://127.0.0.1:8000${incident.url}`, '_blank')}
                  />
                  <CardContent>
                    <Typography variant="caption" display="block" noWrap>
                      {incident.filename}
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      {new Date(incident.created).toLocaleString()}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        ) : (
          <Typography color="textSecondary">
            No incidents captured yet. Start the camera watch to detect faces.
          </Typography>
        )}
      </Box>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editingCamera ? 'Edit Camera' : 'Add Camera'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Camera Name"
            type="text"
            fullWidth
            required
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Camera URL"
            type="text"
            fullWidth
            required
            helperText="RTSP URL or camera index (0 for default webcam)"
            value={formData.url}
            onChange={(e) => setFormData({ ...formData, url: e.target.value })}
          />
          <TextField
            margin="dense"
            label="Location"
            type="text"
            fullWidth
            required
            value={formData.location}
            onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {editingCamera ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}