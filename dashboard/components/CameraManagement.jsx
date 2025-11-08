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

const fetcher = async (url) => {
  const token = localStorage.getItem('authToken');
  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  if (!res.ok) throw new Error('Failed to fetch');
  return res.json();
};

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

  const { data: cameras = [], error } = useSWR('/api/cameras', fetcher);

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

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Error loading cameras: {error.message}
      </Alert>
    );
  }

  return (
    <Box>
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Camera Management
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<CameraIcon />}
          onClick={handleClickOpen}
        >
          Add Camera
        </Button>
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