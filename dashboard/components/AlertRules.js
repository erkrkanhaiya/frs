import { useState, useEffect } from 'react';
import { Box, Button, TextField, List, ListItem, ListItemText, ListItemSecondaryAction, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

export default function AlertRules() {
  const { token } = useAuth();
  const [rules, setRules] = useState([]);
  const [open, setOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    condition: 'PRESENCE', // PRESENCE, ABSENCE, TIME_WINDOW
    person_name: '',
    time_window: 0,
    notification_type: 'EMAIL', // EMAIL, WEBHOOK, BOTH
    notification_target: ''
  });

  const fetchRules = async () => {
    try {
      const response = await fetch('http://localhost:8000/alert-rules/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      setRules(data);
    } catch (error) {
      console.error('Error fetching alert rules:', error);
    }
  };

  useEffect(() => {
    fetchRules();
  }, [token]);

  const handleOpen = (rule = null) => {
    if (rule) {
      setFormData({
        name: rule.name,
        description: rule.description,
        condition: rule.condition,
        person_name: rule.person_name,
        time_window: rule.time_window,
        notification_type: rule.notification_type,
        notification_target: rule.notification_target
      });
      setEditingRule(rule);
    } else {
      setFormData({
        name: '',
        description: '',
        condition: 'PRESENCE',
        person_name: '',
        time_window: 0,
        notification_type: 'EMAIL',
        notification_target: ''
      });
      setEditingRule(null);
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingRule(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = editingRule
        ? `http://localhost:8000/alert-rules/${editingRule.id}`
        : 'http://localhost:8000/alert-rules/';
      
      const response = await fetch(url, {
        method: editingRule ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        fetchRules();
        handleClose();
      }
    } catch (error) {
      console.error('Error saving alert rule:', error);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this alert rule?')) {
      try {
        const response = await fetch(`http://localhost:8000/alert-rules/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          fetchRules();
        }
      } catch (error) {
        console.error('Error deleting alert rule:', error);
      }
    }
  };

  return (
    <Box sx={{ maxWidth: 800, margin: '0 auto', p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <h2>Alert Rules</h2>
        <Button variant="contained" color="primary" onClick={() => handleOpen()}>
          Add Rule
        </Button>
      </Box>

      <List>
        {rules.map((rule) => (
          <ListItem key={rule.id} divider>
            <ListItemText
              primary={rule.name}
              secondary={`${rule.description} • Condition: ${rule.condition} • Person: ${rule.person_name}`}
            />
            <ListItemSecondaryAction>
              <IconButton edge="end" onClick={() => handleOpen(rule)} sx={{ mr: 1 }}>
                <EditIcon />
              </IconButton>
              <IconButton edge="end" onClick={() => handleDelete(rule.id)}>
                <DeleteIcon />
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editingRule ? 'Edit Alert Rule' : 'Add Alert Rule'}</DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Rule Name"
              type="text"
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <TextField
              margin="dense"
              label="Description"
              type="text"
              fullWidth
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
            <FormControl fullWidth margin="dense">
              <InputLabel>Condition</InputLabel>
              <Select
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                required
              >
                <MenuItem value="PRESENCE">Presence Detection</MenuItem>
                <MenuItem value="ABSENCE">Absence Detection</MenuItem>
                <MenuItem value="TIME_WINDOW">Time Window</MenuItem>
              </Select>
            </FormControl>
            <TextField
              margin="dense"
              label="Person Name"
              type="text"
              fullWidth
              value={formData.person_name}
              onChange={(e) => setFormData({ ...formData, person_name: e.target.value })}
              required
            />
            {formData.condition === 'TIME_WINDOW' && (
              <TextField
                margin="dense"
                label="Time Window (minutes)"
                type="number"
                fullWidth
                value={formData.time_window}
                onChange={(e) => setFormData({ ...formData, time_window: parseInt(e.target.value) })}
                required
              />
            )}
            <FormControl fullWidth margin="dense">
              <InputLabel>Notification Type</InputLabel>
              <Select
                value={formData.notification_type}
                onChange={(e) => setFormData({ ...formData, notification_type: e.target.value })}
                required
              >
                <MenuItem value="EMAIL">Email</MenuItem>
                <MenuItem value="WEBHOOK">Webhook</MenuItem>
                <MenuItem value="BOTH">Both</MenuItem>
              </Select>
            </FormControl>
            <TextField
              margin="dense"
              label="Notification Target"
              type="text"
              fullWidth
              value={formData.notification_target}
              onChange={(e) => setFormData({ ...formData, notification_target: e.target.value })}
              required
              helperText="Email address or webhook URL"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary">
              {editingRule ? 'Update' : 'Add'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}