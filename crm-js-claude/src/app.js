const express = require('express');

const app = express();
app.use(express.json());

app.use('/api/companies', require('./routes/companies'));
app.use('/api/contacts', require('./routes/contacts'));
app.use('/api/deals', require('./routes/deals'));
app.use('/api/tasks', require('./routes/tasks'));
app.use('/api/notes', require('./routes/notes'));

app.get('/', (req, res) => res.json({
  name: 'CRM API',
  version: '1.0.0',
  endpoints: {
    health:    'GET  /health',
    companies: ['GET /api/companies', 'POST /api/companies', 'GET /api/companies/:id', 'PUT /api/companies/:id', 'DELETE /api/companies/:id'],
    contacts:  ['GET /api/contacts', 'POST /api/contacts', 'GET /api/contacts/:id', 'PUT /api/contacts/:id', 'DELETE /api/contacts/:id'],
    deals:     ['GET /api/deals', 'POST /api/deals', 'GET /api/deals/:id', 'PUT /api/deals/:id', 'DELETE /api/deals/:id'],
    tasks:     ['GET /api/tasks', 'POST /api/tasks', 'GET /api/tasks/:id', 'PUT /api/tasks/:id', 'DELETE /api/tasks/:id'],
    notes:     ['GET /api/notes', 'POST /api/notes', 'GET /api/notes/:id', 'PUT /api/notes/:id', 'DELETE /api/notes/:id'],
  },
}));

app.get('/health', (req, res) => res.json({ status: 'ok' }));

module.exports = app;
