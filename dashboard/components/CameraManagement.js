import { useState, useEffect } from 'react';
import { Box, Button, TextField, List, ListItem, ListItemText, ListItemSecondaryAction, IconButton, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

export default function CameraManagement() {
  const { token } = useAuth();
  const [cameras, setCameras] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingCamera, setEditingCamera] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    location: ''
  });

  const fetchCameras = async () => {
    try {
      const response = await fetch('http://localhost:8000/cameras/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setCameras(data);
    } catch (error) {
      console.error('Error fetching cameras:', error);
    }
  };

  useEffect(() => {
    fetchCameras();
  }, [token]);

  const handleOpen = (camera = null) => {
    if (camera) {
      setFormData({
        name: camera.name,
        url: camera.url,
        location: camera.location
      });
      setEditingCamera(camera);
    } else {
      setFormData({
        name: '',
        url: '',
        location: ''
      });
      setEditingCamera(null);
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingCamera(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingCamera
        ? `http://localhost:8000/cameras/${editingCamera.id}`
        : 'http://localhost:8000/cameras/';
      
      const response = await fetch(url, {
        method: editingCamera ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        fetchCameras();
        handleClose();
      }
    } catch (error) {
      console.error('Error saving camera:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this camera?')) {
      try {
        const response = await fetch(`http://localhost:8000/cameras/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          fetchCameras();
        }
      } catch (error) {
        console.error('Error deleting camera:', error);
      }
    }
  };

  return (
    <Box sx={{ maxWidth: 800, margin: '0 auto', p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <h2>Camera Management</h2>
        <Button variant="contained" color="primary" onClick={() => handleOpen()}>
          Add Camera
        </Button>
      </Box>

      <List>
        {cameras.map((camera) => (
          <ListItem key={camera.id} divider>
            <ListItemText
              primary={camera.name}
              secondary={`Location: ${camera.location} • URL: ${camera.url}`}
            />
            <ListItemSecondaryAction>
              <IconButton edge="end" onClick={() => handleOpen(camera)} sx={{ mr: 1 }}>
                <EditIcon />
              </IconButton>
              <IconButton edge="end" onClick={() => handleDelete(camera.id)}>
                <DeleteIcon />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>

      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>{editingCamera ? 'Edit Camera' : 'Add Camera'}</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Camera Name"
              type="text"
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <TextField
              margin="dense"
              label="Camera URL"
              type="text"
              fullWidth
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              required
            />
            <TextField
              margin="dense"
              label="Location"
              type="text"
              fullWidth
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              required
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary">
              {editingCamera ? 'Update' : 'Add'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}