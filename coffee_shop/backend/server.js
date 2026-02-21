const express = require('express');
const { Pool } = require('pg'); // เรียกใช้ตัวเชื่อมต่อ PostgreSQL

const app = express();
const port = 3000;

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'coffee_shop', 
  password: 'aczd6068', 
  port: 5432,
});

// 🚀 API ดึงข้อมูลเมนูจาก Database
app.get('/api/menus', async (req, res) => {
  try {
    // สั่งให้เดินไปเปิดตู้เย็น (Query ข้อมูล)
    const result = await pool.query('SELECT * FROM menus ORDER BY id ASC');
    // ส่งข้อมูลที่ได้กลับไปให้หน้าบ้าน
    res.json(result.rows);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

app.get('/', (req, res) => {
  res.send('Backend is running with PostgreSQL!');
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});