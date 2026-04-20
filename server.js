require('dotenv').config();

const path    = require('path');
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models');
const routes = require('./routes');
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Serve the Cast receiver page and any future static assets
app.use('/cast', express.static(path.join(__dirname, 'public')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api', routes);

const start = async () => {
  if (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET) {
    console.error('FATAL: JWT_SECRET and JWT_REFRESH_SECRET must be set in .env');
    process.exit(1);
  }

  try {
    await sequelize.authenticate();
    console.log('Database connection established.');

    if (process.env.AUTO_MIGRATE === 'true') {
      const { execSync } = require('child_process');
      console.log('[Migrations] AUTO_MIGRATE enabled — running pending migrations...');
      execSync('npx sequelize-cli db:migrate', { stdio: 'inherit' });
    }

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Unable to connect to the database:', err.message);
    process.exit(1);
  }
};

start();
