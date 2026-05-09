const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const api = require('./routes/api');
const { requireAuth } = require('./middleware/auth');

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(morgan('dev'));
app.use(bodyParser.json({ limit: '1mb' }));

// Attach a small health route
app.get('/_health', (req, res) => res.json({ status: 'ok' }));

// All API routes require Firebase auth
app.use('/api', requireAuth, api);

app.use((err, req, res, next) => {
  console.error('Unhandled server error:', err);
  if (res.headersSent) return next(err);
  return res.status(500).json({ error: { code: 'internal_error', message: 'Unexpected server error' } });
});

const port = process.env.PORT || 8080;
app.listen(port, () => {
  console.log(`ContextLens backend listening on port ${port}`);
});
