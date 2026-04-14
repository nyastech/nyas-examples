const fs = require('fs');
const path = require('path');
const pool = require('./index');

async function migrate() {
  const sql = fs.readFileSync(
    path.join(__dirname, '../migrations/001_schema.sql'),
    'utf8'
  );
  await pool.query(sql);
  console.log('Migrations applied');
}

module.exports = migrate;
