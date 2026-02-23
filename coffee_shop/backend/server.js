const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// ตั้งค่าการเชื่อมต่อฐานข้อมูล
const pool = new Pool({
  user: 'postgres',
  password: 'aczd6068',     // รหัสผ่านของคุณ
  host: 'localhost',
  port: 5432,               
  database: 'coffee_shop'   
});

// ==========================================
// 1. API: ดึงข้อมูลเมนูกาแฟไปโชว์หน้าเว็บ
// ==========================================
app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY base_price ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('เกิดข้อผิดพลาดในการดึงข้อมูล:', err.message);
    res.status(500).send('Server Error');
  }
});

// ==========================================
// 2. API: รับคำสั่งซื้อจากตะกร้า แล้วบันทึกลง Database
// ==========================================
app.post('/api/orders', async (req, res) => {
  const { items, totalAmount } = req.body;

  try {
    // เริ่ม Transaction
    await pool.query('BEGIN');

    // สเต็ป 1: สร้างบิลหลักในตาราง orders
    const orderResult = await pool.query(
      `INSERT INTO orders (order_type, status, total_amount) 
       VALUES ('online', 'pending', $1) RETURNING order_id`,
      [totalAmount]
    );
    const orderId = orderResult.rows[0].order_id;

    // สเต็ป 2: นำสินค้าในตะกร้ามาวนลูปใส่ตาราง order_items
    for (let item of items) {
      await pool.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price) 
         VALUES ($1, $2, $3, $4)`,
        [orderId, item.product_id, item.quantity, item.base_price]
      );
    }

    // เซฟลงฐานข้อมูลจริง
    await pool.query('COMMIT');
    res.status(201).json({ message: 'สั่งซื้อสำเร็จ!', orderId: orderId });
    
  } catch (err) {
    await pool.query('ROLLBACK'); // ถ้ายกเลิกให้ถอยกลับทั้งหมด
    console.error('เกิดข้อผิดพลาดในการสร้างออเดอร์:', err.message);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการสร้างออเดอร์' });
  }
});

// เส้นทางหน้าแรก
app.get('/', (req, res) => {
  res.send('Backend is running with PostgreSQL! ☕');
});

app.listen(port, () => {
  console.log(`Server running on port ${port} 🚀`);
});