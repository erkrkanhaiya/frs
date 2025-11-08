import { useState, useEffect } from 'react';
import { Box, Button, TextField, List, ListItem, ListItemText, ListItemSecondaryAction, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

export default function UserManagement() {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    role: 'USER',
    is_active: true,
    password: '' // Only required for new users
  });

  const fetchUsers = async () => {
    try {
      const response = await fetch('http://localhost:8000/users/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const handleOpen = (user = null) => {
    if (user) {
      setFormData({
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        is_active: user.is_active,
        password: '' // Don't show existing password
      });
      setEditingUser(user);
    } else {
      setFormData({
        email: '',
        full_name: '',
        role: 'USER',
        is_active: true,
        password: ''
      });
      setEditingUser(null);
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingUser(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingUser
        ? `http://localhost:8000/users/${editingUser.id}`
        : 'http://localhost:8000/users/';
      
      // Remove password if editing and password is empty
      const submitData = editingUser && !formData.password
        ? { ...formData, password: undefined }
        : formData;

      const response = await fetch(url, {
        method: editingUser ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(submitData)
      });

      if (response.ok) {
        fetchUsers();
        handleClose();
      }
    } catch (error) {
      console.error('Error saving user:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        const response = await fetch(`http://localhost:8000/users/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          fetchUsers();
        }
      } catch (error) {
        console.error('Error deleting user:', error);
      }
    }
  };

  return (
    <Box sx={{ maxWidth: 800, margin: '0 auto', p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <h2>User Management</h2>
        <Button variant="contained" color="primary" onClick={() => handleOpen()}>
          Add User
        </Button>
      </Box>

      <List>
        {users.map((user) => (
          <ListItem key={user.id} divider>
            <ListItemText
              primary={user.full_name}
              secondary={`${user.email} • Role: ${user.role} • ${user.is_active ? 'Active' : 'Inactive'}`}
            />
            <ListItemSecondaryAction>
              <IconButton edge="end" onClick={() => handleOpen(user)} sx={{ mr: 1 }}>
                <EditIcon />
              </IconButton>
              <IconButton edge="end" onClick={() => handleDelete(user.id)}>
                <DeleteIcon />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>

      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>{editingUser ? 'Edit User' : 'Add User'}</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Email"
              type="email"
              fullWidth
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              disabled={editingUser}
            />
            <TextField
              margin="dense"
              label="Full Name"
              type="text"
              fullWidth
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              required
            />
            <FormControl fullWidth margin="dense">
              <InputLabel>Role</InputLabel>
              <Select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                required
              >
                <MenuItem value="ADMIN">Admin</MenuItem>
                <MenuItem value="USER">User</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth margin="dense">
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.value })}
                required
              >
                <MenuItem value={true}>Active</MenuItem>
                <MenuItem value={false}>Inactive</MenuItem>
              </Select>
            </FormControl>
            <TextField
              margin="dense"
              label={editingUser ? "New Password (leave blank to keep current)" : "Password"}
              type="password"
              fullWidth
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required={!editingUser}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary">
              {editingUser ? 'Update' : 'Add'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}