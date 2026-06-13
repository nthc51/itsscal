const mysql = require('mysql2/promise');

async function run() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'Vanthe@12345',
    database: 'itss'
  });

  console.log('Connected to MySQL...');

  await conn.execute(
    "ALTER TABLE events MODIFY COLUMN type ENUM('hoc','deadline','lam_them','holiday') NOT NULL"
  );
  console.log('ALTER TABLE executed successfully!');

  const [rows] = await conn.execute(
    "SELECT COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA='itss' AND TABLE_NAME='events' AND COLUMN_NAME='type'"
  );
  console.log('New ENUM:', rows[0]?.COLUMN_TYPE);

  await conn.end();
  console.log('Done!');
}

run().catch(e => {
  console.error('Migration failed:', e.message);
  process.exit(1);
});
