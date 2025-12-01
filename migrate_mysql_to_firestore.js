// migrate_mysql_to_firestore.js
// Template for migrating MySQL data to Firestore
// Fill in your MySQL and Firebase credentials in .env

const mysql = require('mysql2/promise');
const admin = require('firebase-admin');
const dotenv = require('dotenv');
dotenv.config();

const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE
  });

  // Example: migrate posts
  const [rows] = await connection.execute('SELECT * FROM posts');
  for (const row of rows) {
    await db.collection('posts').doc(String(row.id)).set(row);
  }
  console.log('Migration complete.');
  await connection.end();
}

migrate().catch(console.error);
