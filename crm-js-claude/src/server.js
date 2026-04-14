require('dotenv').config();
const app = require('./app');
const migrate = require('./db/migrate');

const PORT = process.env.PORT || 3000;

migrate()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`CRM server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Migration failed:', err.message);
    process.exit(1);
  });
