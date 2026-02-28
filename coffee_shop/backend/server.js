const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt'); // 🌟 นำเข้า bcrypt สำหรับเข้ารหัสผ่าน

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
// 1. API: ดึงข้อมูลสินค้าทั้งหมดไปโชว์หน้าร้าน
// ==========================================
app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        product_id, 
        name, 
        description, 
        base_price AS price, 
        image_url 
      FROM products
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching products:', err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// ==========================================
// 2. API: เพิ่มเมนูใหม่ (Add New Product)
// ==========================================
app.post('/api/products', async (req, res) => {
  const { name, price, description, image_url } = req.body; 
  try {
    const result = await pool.query(
      'INSERT INTO products (name, base_price, description, image_url) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, price, description, image_url]
    );
    res.json({ success: true, message: 'เพิ่มเมนูสำเร็จ!', product: result.rows[0] });
  } catch (err) {
    console.error('เกิดข้อผิดพลาดในการเพิ่มเมนู:', err.message);
    res.status(500).json({ error: 'ไม่สามารถเพิ่มเมนูได้' });
  }
});

// ==========================================
// 3. API: รับคำสั่งซื้อจากตะกร้า แล้วบันทึกลง Database
// ==========================================
app.post('/api/orders', async (req, res) => {
  const { items, totalAmount, total_amount } = req.body;
  const finalTotal = total_amount || totalAmount;

  try {
    if (finalTotal === undefined || finalTotal === null) {
      return res.status(400).json({ error: 'ไม่มียอดเงินรวมส่งมาจากหน้าบ้าน' });
    }

    await pool.query('BEGIN');

    // 1. สร้างบิลหลัก
    const orderResult = await pool.query(
      `INSERT INTO orders (order_type, status, total_amount) 
       VALUES ('online', 'pending', $1) RETURNING order_id`,
      [finalTotal] 
    );
    const orderId = orderResult.rows[0].order_id;

    // 2. ลูปรายการสินค้า 
    for (let item of items) {
      await pool.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price) 
         VALUES ($1, $2, $3, $4)`,
        [orderId, item.product_id, item.quantity, item.price || item.base_price]
      );
    }

    await pool.query('COMMIT');
    res.status(201).json({ message: 'สั่งซื้อสำเร็จ รอพนักงานเตรียมออเดอร์!', orderId: orderId });
    
  } catch (err) {
    await pool.query('ROLLBACK'); 
    console.error('เกิดข้อผิดพลาดในการสร้างออเดอร์:', err.message);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการสร้างออเดอร์' });
  }
});

// ==========================================
// 4. API: ดึงรายการออเดอร์ทั้งหมด (ประวัติการสั่งซื้อ)
// ==========================================
app.get('/api/orders', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        o.order_id, 
        o.status, 
        o.total_amount, 
        o.created_at,
        json_agg(json_build_object('product_name', p.name, 'quantity', oi.quantity)) as items
      FROM orders o
      JOIN order_items oi ON o.order_id = oi.order_id
      JOIN products p ON oi.product_id = p.product_id
      GROUP BY o.order_id
      ORDER BY o.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('เกิดข้อผิดพลาดในการดึงออเดอร์:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==========================================
// 5. API: ดึงคิวออเดอร์ที่ "กำลังทำ" (Pending) ให้บาริสต้า
// ==========================================
app.get('/api/orders/pending', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        o.order_id, 
        o.status, 
        o.total_amount, 
        json_agg(json_build_object('product_name', p.name, 'quantity', oi.quantity)) as items
      FROM orders o
      JOIN order_items oi ON o.order_id = oi.order_id
      JOIN products p ON oi.product_id = p.product_id
      WHERE o.status = 'pending'
      GROUP BY o.order_id
      ORDER BY o.order_id ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('เกิดข้อผิดพลาดในการดึงคิวออเดอร์:', err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// ==========================================
// 6. API: อัปเดตสถานะออเดอร์ (แบบธรรมดา)
// ==========================================
app.put('/api/orders/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    await pool.query('UPDATE orders SET status = $1 WHERE order_id = $2', [status, id]);
    res.json({ success: true, message: 'อัปเดตสถานะเรียบร้อย' });
  } catch (err) {
    console.error('เกิดข้อผิดพลาดในการอัปเดตสถานะ:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ==========================================
// 7. API: บาริสต้ากดชงเสร็จ + ตัดสต็อกอัตโนมัติ (บอสใหญ่ 🚀)
// ==========================================
app.put('/api/orders/:id/complete', async (req, res) => {
  const orderId = req.params.id;
  const employee_id = (req.body && req.body.employee_id) ? req.body.employee_id : '970717fc-ec53-412a-970a-43d853016f7f';

  const client = await pool.connect(); 

  try {
    await client.query('BEGIN');

    // 1. อัปเดตสถานะออเดอร์เป็น 'completed'
    await client.query(
      "UPDATE orders SET status = 'completed' WHERE order_id = $1", 
      [orderId]
    );

    // 2. ดึงรายการสินค้าทั้งหมดที่อยู่ในออเดอร์นี้
    const orderItems = await client.query(
      "SELECT product_id, quantity FROM order_items WHERE order_id = $1", 
      [orderId]
    );

    // 3. วนลูปเช็คทีละเมนูเพื่อไปหักสต็อกตามสูตรชง
    for (let item of orderItems.rows) {
      const recipe = await client.query(
        "SELECT ingredient_id, quantity_used FROM product_recipes WHERE product_id = $1", 
        [item.product_id]
      );

      for (let r of recipe.rows) {
        const totalUsed = r.quantity_used * item.quantity;

        await client.query(
          "UPDATE ingredients SET current_stock = current_stock - $1 WHERE ingredient_id = $2", 
          [totalUsed, r.ingredient_id]
        );

        const logNote = `ตัดสต็อกอัตโนมัติ (Order ID: ${orderId.substring(0, 8)}...)`;
        await client.query(
          `INSERT INTO inventory_logs (ingredient_id, employee_id, action, quantity, note) 
           VALUES ($1, $2, 'OUT', $3, $4)`,
          [r.ingredient_id, employee_id, totalUsed, logNote]
        );
      }
    }

    await client.query('COMMIT');
    res.json({ success: true, message: '✅ อัปเดตออเดอร์และหักสต็อกอัตโนมัติเรียบร้อย!' });

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('เกิดข้อผิดพลาดในการตัดสต็อก:', err.message);
    res.status(500).json({ error: 'ไม่สามารถอัปเดตออเดอร์และตัดสต็อกได้' });
  } finally {
    client.release();
  }
});

// ==========================================
// 8. API: ดึงข้อมูลสต็อกวัตถุดิบ (Inventory)
// ==========================================
app.get('/api/inventory', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ingredients ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('เกิดข้อผิดพลาดในการดึงข้อมูลสต็อก:', err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// ==========================================
// 9. API: เติมสต็อกวัตถุดิบ (Refill Inventory)
// ==========================================
app.post('/api/inventory/refill', async (req, res) => {
  const { ingredient_id, employee_id, quantity, note } = req.body;
  try {
    await pool.query('BEGIN');

    await pool.query(
      'UPDATE ingredients SET current_stock = current_stock + $1 WHERE ingredient_id = $2',
      [quantity, ingredient_id]
    );

    await pool.query(
      `INSERT INTO inventory_logs (ingredient_id, employee_id, action, quantity, note) 
       VALUES ($1, $2, 'IN', $3, $4)`,
      [ingredient_id, employee_id, quantity, note]
    );

    await pool.query('COMMIT'); 
    res.json({ success: true, message: 'เติมสต็อกและบันทึกประวัติสำเร็จ!' });

  } catch (err) {
    await pool.query('ROLLBACK'); 
    console.error('เกิดข้อผิดพลาดในการเติมสต็อก:', err.message);
    res.status(500).json({ error: 'ไม่สามารถเติมสต็อกได้' });
  }
});

// ==========================================
// 10. API: ดึงรายงานยอดขายและเมนูขายดี (ส่วนนี้ส่งข้อมูลให้กราฟ!)
// ==========================================
app.get('/api/reports/sales', async (req, res) => {
  try {
    const summaryResult = await pool.query(`
      SELECT 
        COALESCE(SUM(total_amount), 0) AS total_revenue,
        COUNT(order_id) AS total_orders
      FROM orders
      WHERE status = 'completed'
    `);

    const topProductsResult = await pool.query(`
      SELECT 
        p.name,
        SUM(oi.quantity) AS total_sold,
        SUM(oi.quantity * oi.unit_price) AS total_revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.order_id
      JOIN products p ON oi.product_id = p.product_id
      WHERE o.status = 'completed'
      GROUP BY p.product_id, p.name
      ORDER BY total_sold DESC
      LIMIT 5
    `);

    res.json({ 
      success: true, 
      summary: summaryResult.rows[0], 
      topProducts: topProductsResult.rows 
    });

  } catch (err) {
    console.error('เกิดข้อผิดพลาดในการดึงยอดขาย:', err.message);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์' });
  }
});

// ==========================================
// 11. API: ระบบ Login พนักงาน
// ==========================================
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query(
      `SELECT employee_id, name, role FROM employees 
       WHERE email = $1 AND password_hash = $2`,
      [email, password]
    );

    if (result.rows.length > 0) {
      res.json({ success: true, message: 'เข้าสู่ระบบสำเร็จ', user: result.rows[0] });
    } else {
      res.status(401).json({ success: false, message: 'อีเมล หรือ รหัสผ่านไม่ถูกต้อง!' });
    }
  } catch (err) {
    res.status(500).json({ error: 'Server Error' });
  }
});

// ==========================================
// 12. API: สมัครสมาชิกลูกค้า (Customer Register)
// ==========================================
app.post('/api/customers/register', async (req, res) => {
  const { first_name, last_name, email, password, phone_number, address, birth_date } = req.body;

  try {
    if (!first_name || !last_name || !email || !password) {
      return res.status(400).json({ error: 'กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน (ชื่อ, นามสกุล, อีเมล, รหัสผ่าน)' });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) {
      return res.status(400).json({ 
        error: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร ประกอบด้วยอักษรพิมพ์เล็ก พิมพ์ใหญ่ ตัวเลข และอักขระพิเศษ (เช่น @$!%*?&)' 
      });
    }

    const checkEmail = await pool.query('SELECT email FROM customers WHERE email = $1', [email]);
    if (checkEmail.rows.length > 0) {
      return res.status(400).json({ error: 'อีเมลนี้ถูกใช้งานแล้ว กรุณาใช้อีเมลอื่น' });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const result = await pool.query(
      `INSERT INTO customers (first_name, last_name, email, password_hash, phone_number, address, birth_date) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING customer_id, first_name, last_name, email, member_level`,
      [first_name, last_name, email, passwordHash, phone_number, address, birth_date]
    );

    res.status(201).json({ 
      success: true, 
      message: 'สมัครสมาชิกสำเร็จ!', 
      customer: result.rows[0] 
    });

  } catch (err) {
    console.error('เกิดข้อผิดพลาดในการสมัครสมาชิก:', err.message);
    res.status(500).json({ error: 'ไม่สามารถสมัครสมาชิกได้ในขณะนี้' });
  }
});

// ==========================================
// 13. API: เข้าสู่ระบบสมาชิกลูกค้า (Customer Login)
// ==========================================
app.post('/api/customers/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    if (!email || !password) {
      return res.status(400).json({ error: 'กรุณากรอกอีเมลและรหัสผ่าน' });
    }

    const result = await pool.query('SELECT * FROM customers WHERE email = $1', [email]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: '❌ อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    }

    const customer = result.rows[0];

    const isValidPassword = await bcrypt.compare(password, customer.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: '❌ อีเมลหรือรหัสผ่านไม่ถูกต้อง' });
    }

    res.status(200).json({
      success: true,
      message: '✅ เข้าสู่ระบบสำเร็จ',
      customer: {
        customer_id: customer.customer_id,
        first_name: customer.first_name,
        last_name: customer.last_name,
        email: customer.email,
        total_points: customer.total_points,
        member_level: customer.member_level
      }
    });

  } catch (err) {
    console.error('เกิดข้อผิดพลาดในการเข้าสู่ระบบลูกค้า:', err.message);
    res.status(500).json({ error: 'ไม่สามารถเข้าสู่ระบบได้ในขณะนี้' });
  }
});


// ==========================================
// 14. API: ชำระเงินและคำนวณแต้มสะสม (Checkout & Earn Points)
// ==========================================
app.post('/api/orders/checkout', async (req, res) => {
  const { order_id, customer_id, total_amount } = req.body;

  try {
    await pool.query('BEGIN'); 

    let earnedPoints = 0;

    if (customer_id) {
      earnedPoints = Math.floor(total_amount / 50);

      if (earnedPoints > 0) {
        await pool.query(
          `UPDATE customers 
           SET total_points = total_points + $1 
           WHERE customer_id = $2`,
          [earnedPoints, customer_id]
        );

        await pool.query(
          `INSERT INTO points_logs (customer_id, order_id, action, points_amount, description) 
           VALUES ($1, $2, $3, $4, $5)`,
          [
            customer_id, 
            order_id || null, 
            'EARN', 
            earnedPoints, 
            `ได้รับแต้มจากยอดสั่งซื้อ ${total_amount} บาท`
          ]
        );
      }
    }

    await pool.query('COMMIT');

    res.status(200).json({ 
      success: true, 
      message: '✅ ชำระเงินสำเร็จ!', 
      total_amount: total_amount,
      earned_points: earnedPoints 
    });

  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('เกิดข้อผิดพลาดในการชำระเงิน/แจกแต้ม:', err.message);
    res.status(500).json({ error: 'ไม่สามารถทำรายการได้ในขณะนี้' });
  }
});

// เส้นทางหน้าแรก
app.get('/', (req, res) => {
  res.send('Backend is running with PostgreSQL! ☕');
});

app.listen(port, () => {
  console.log(`Server running on port ${port} 🚀`);
});