const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcrypt'); 

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

const pool = new Pool({
  user: 'postgres',
  password: 'aczd6068',     
  host: 'localhost',
  port: 5432,               
  database: 'coffee_shop'   
});


// 1. API: ดึงข้อมูลสินค้าทั้งหมด
app.get('/api/products', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT product_id, name, description, price, image_url 
      FROM products
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error Fetching Products:", err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// 2. API: เพิ่มเมนูใหม่
app.post('/api/products', async (req, res) => {
  const { name, price, description, image_url } = req.body; 
  try {
    const result = await pool.query(
      'INSERT INTO products (name, price, description, image_url) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, price, description || '', image_url || '']
    );
    res.json({ success: true, message: 'เพิ่มเมนูสำเร็จ!', product: result.rows[0] });
  } catch (err) {
    console.error("❌ Error adding product:", err.message); 
    res.status(500).json({ error: 'ไม่สามารถเพิ่มเมนูได้' });
  }
});

// 3. API: รับคำสั่งซื้อจากตะกร้า
app.post('/api/orders', async (req, res) => {
  const { items, totalAmount, total_amount } = req.body;
  const finalTotal = total_amount || totalAmount;

  try {
    if (finalTotal === undefined || finalTotal === null) {
      return res.status(400).json({ error: 'ไม่มียอดเงินรวมส่งมาจากหน้าบ้าน' });
    }

    await pool.query('BEGIN');

    const orderResult = await pool.query(
      `INSERT INTO orders (order_type, status, total_amount) 
       VALUES ('online', 'pending', $1) RETURNING order_id`,
      [finalTotal] 
    );
    const orderId = orderResult.rows[0].order_id;

    for (let item of items) {
      await pool.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price) 
         VALUES ($1, $2, $3, $4)`,
        // 🌟 แก้ไข: ดึงค่า price หรือ base_price ให้ชัวร์ ถ้าไม่มีให้เป็น 0
        [orderId, item.product_id, item.quantity, item.price || item.base_price || 0]
      );
    }

    await pool.query('COMMIT');
    res.status(201).json({ message: 'สั่งซื้อสำเร็จ!', order_id: orderId });
    
  } catch (err) {
    await pool.query('ROLLBACK'); 
    res.status(500).json({ error: 'เกิดข้อผิดพลาดในการสร้างออเดอร์' });
  }
});

// 4. API: ดึงรายการออเดอร์ทั้งหมด
app.get('/api/orders', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT o.order_id, o.status, o.total_amount, o.created_at,
      json_agg(json_build_object('product_name', p.name, 'quantity', oi.quantity)) as items
      FROM orders o
      JOIN order_items oi ON o.order_id = oi.order_id
      JOIN products p ON oi.product_id = p.product_id
      GROUP BY o.order_id ORDER BY o.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// 5. API: ดึงคิวออเดอร์ให้บาริสต้า
app.get('/api/orders/pending', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT o.order_id, o.status, o.total_amount, 
      json_agg(json_build_object('product_name', p.name, 'quantity', oi.quantity)) as items
      FROM orders o
      JOIN order_items oi ON o.order_id = oi.order_id
      JOIN products p ON oi.product_id = p.product_id
      WHERE o.status = 'pending'
      GROUP BY o.order_id ORDER BY o.order_id ASC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server Error' });
  }
});

// 6. API: อัปเดตสถานะออเดอร์
app.put('/api/orders/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    await pool.query('UPDATE orders SET status = $1 WHERE order_id = $2', [status, id]);
    res.json({ success: true, message: 'อัปเดตสถานะเรียบร้อย' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// 7. API: บาริสต้ากดชงเสร็จ + ตัดสต็อก
app.put('/api/orders/:id/complete', async (req, res) => {
  const orderId = req.params.id;
  const employee_id = (req.body && req.body.employee_id) ? req.body.employee_id : '970717fc-ec53-412a-970a-43d853016f7f';

  const client = await pool.connect(); 
  try {
    await client.query('BEGIN');
    await client.query("UPDATE orders SET status = 'completed' WHERE order_id = $1", [orderId]);

    const orderItems = await client.query("SELECT product_id, quantity FROM order_items WHERE order_id = $1", [orderId]);

    for (let item of orderItems.rows) {
      const recipe = await client.query("SELECT ingredient_id, quantity_used FROM product_recipes WHERE product_id = $1", [item.product_id]);
      for (let r of recipe.rows) {
        const totalUsed = r.quantity_used * item.quantity;
        await client.query("UPDATE ingredients SET current_stock = current_stock - $1 WHERE ingredient_id = $2", [totalUsed, r.ingredient_id]);
        await client.query(
          `INSERT INTO inventory_logs (ingredient_id, employee_id, action, quantity, note) VALUES ($1, $2, 'OUT', $3, $4)`,
          [r.ingredient_id, employee_id, totalUsed, `ตัดสต็อกอัตโนมัติ (Order ID: ${orderId.substring(0, 8)}...)`]
        );
      }
    }
    await client.query('COMMIT');
    res.json({ success: true, message: '✅ อัปเดตออเดอร์และหักสต็อกอัตโนมัติเรียบร้อย!' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'ไม่สามารถอัปเดตออเดอร์และตัดสต็อกได้' });
  } finally {
    client.release();
  }
});

// 8. API: ดึงข้อมูลสต็อก
app.get('/api/inventory', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM ingredients ORDER BY name ASC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Server Error' });
  }
});

// 9. API: เติมสต็อก
app.post('/api/inventory/refill', async (req, res) => {
  const { ingredient_id, employee_id, quantity, note } = req.body;
  try {
    await pool.query('BEGIN');
    await pool.query('UPDATE ingredients SET current_stock = current_stock + $1 WHERE ingredient_id = $2', [quantity, ingredient_id]);
    await pool.query(
      `INSERT INTO inventory_logs (ingredient_id, employee_id, action, quantity, note) VALUES ($1, $2, 'IN', $3, $4)`,
      [ingredient_id, employee_id, quantity, note]
    );
    await pool.query('COMMIT'); 
    res.json({ success: true, message: 'เติมสต็อกและบันทึกประวัติสำเร็จ!' });
  } catch (err) {
    await pool.query('ROLLBACK'); 
    res.status(500).json({ error: 'ไม่สามารถเติมสต็อกได้' });
  }
});

// 10. API: รายงานยอดขาย
app.get('/api/reports/sales', async (req, res) => {
  try {
    // 🌟 แก้ไข: ดึงยอดขายทั้งหมด ไม่ว่า status จะเป็นอะไรก็ตาม (เพื่อให้เห็นยอดรวมง่ายๆ)
    // 🌟 เปลี่ยนชื่อคอลัมน์ total_revenue กลับเป็น total_sales เพื่อให้ตรงกับฝั่ง React หน้าบ้าน 
    const summaryResult = await pool.query(`
      SELECT COALESCE(SUM(total_amount), 0) AS total_sales, COUNT(order_id) AS total_orders 
      FROM orders 
      -- เอา WHERE status = 'completed' ออกชั่วคราว เพื่อให้บิลที่กำลังทำ (pending) ก็นับยอดด้วย
    `);

    // 🌟 แก้ไข: ดึงยอดขายเมนูขายดี แบบไม่สน status
    const topProductsResult = await pool.query(`
      SELECT p.name, SUM(oi.quantity) AS total_qty, SUM(oi.quantity * oi.unit_price) AS total_revenue
      FROM order_items oi 
      JOIN orders o ON oi.order_id = o.order_id 
      JOIN products p ON oi.product_id = p.product_id
      GROUP BY p.product_id, p.name 
      ORDER BY total_qty DESC 
      LIMIT 5
    `);

    res.json({ success: true, summary: summaryResult.rows[0], topProducts: topProductsResult.rows });
  } catch (err) {
    console.error("Sales Report Error:", err.message);
    res.status(500).json({ error: 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์' });
  }
});

// 11. API: Login พนักงาน
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query(`SELECT employee_id, name, role FROM employees WHERE email = $1 AND password_hash = $2`, [email, password]);
    if (result.rows.length > 0) res.json({ success: true, message: 'เข้าสู่ระบบสำเร็จ', user: result.rows[0] });
    else res.status(401).json({ success: false, message: 'อีเมล หรือ รหัสผ่านไม่ถูกต้อง!' });
  } catch (err) {
    res.status(500).json({ error: 'Server Error' });
  }
});

// 12. API: สมัครสมาชิกลูกค้า
app.post('/api/customers/register', async (req, res) => {
  const { first_name, last_name, email, password, phone_number, address, birth_date } = req.body;
  try {
    if (!first_name || !last_name || !email || !password) return res.status(400).json({ error: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!passwordRegex.test(password)) return res.status(400).json({ error: 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร พิมพ์เล็ก พิมพ์ใหญ่ ตัวเลข และอักขระพิเศษ' });

    const checkEmail = await pool.query('SELECT email FROM customers WHERE email = $1', [email]);
    if (checkEmail.rows.length > 0) return res.status(400).json({ error: 'อีเมลนี้ถูกใช้งานแล้ว' });

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO customers (first_name, last_name, email, password_hash, phone_number, address, birth_date) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING customer_id, first_name, last_name, email, member_level`,
      [first_name, last_name, email, passwordHash, phone_number, address, birth_date]
    );
    res.status(201).json({ success: true, message: 'สมัครสมาชิกสำเร็จ!', customer: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'ไม่สามารถสมัครสมาชิกได้' });
  }
});

// 13. API: Login ลูกค้า
app.post('/api/customers/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    if (!email || !password) return res.status(400).json({ error: 'กรุณากรอกอีเมลและรหัสผ่าน' });
    const result = await pool.query('SELECT * FROM customers WHERE email = $1', [email]);
    if (result.rows.length === 0) return res.status(401).json({ error: '❌ อีเมลหรือรหัสผ่านไม่ถูกต้อง' });

    const customer = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, customer.password_hash);
    if (!isValidPassword) return res.status(401).json({ error: '❌ อีเมลหรือรหัสผ่านไม่ถูกต้อง' });

    res.status(200).json({
      success: true, message: '✅ เข้าสู่ระบบสำเร็จ',
      customer: { customer_id: customer.customer_id, first_name: customer.first_name, last_name: customer.last_name, email: customer.email, total_points: customer.total_points, member_level: customer.member_level }
    });
  } catch (err) {
    res.status(500).json({ error: 'ไม่สามารถเข้าสู่ระบบได้' });
  }
});

// 14. API: ชำระเงินและแจกแต้ม (เพิ่มบันทึกลงตาราง payments แล้ว)
app.post('/api/orders/checkout', async (req, res) => {
  // รับค่า payment_method เพิ่มเติม (ถ้าหน้าบ้านไม่ได้ส่งมา ให้ default เป็น 'CASH')
  const { order_id, customer_id, total_amount, payment_method = 'cash' } = req.body;
  
  try {
    await pool.query('BEGIN'); 
    
    // 🌟 1. บันทึกข้อมูลการชำระเงินลงตาราง payments ทันที!
    // สังเกตว่าผมใช้ชื่อคอลัมน์ payment_status, paid_at ตามในรูป pgAdmin ของคุณเลยครับ
    // 🌟 1. บันทึกข้อมูลการชำระเงินลงตาราง payments
   // 🌟 1. บันทึกข้อมูลการชำระเงินลงตาราง payments ทันที!
    if (order_id) {
      await pool.query(
        `INSERT INTO payments (order_id, payment_method, amount, payment_status, paid_at) 
         VALUES ($1, $2, $3, 'success', CURRENT_TIMESTAMP)`, // 🌟 เปลี่ยนตรงนี้เป็น 'success'
        [order_id, payment_method, total_amount]
      );
    }
    // 🌟 2. ระบบคำนวณและแจกแต้ม (อันเดิม)
    let earnedPoints = 0;
    if (customer_id) {
      const amountToCalc = parseFloat(total_amount) || 0;
      earnedPoints = Math.floor(amountToCalc / 50);

      if (earnedPoints > 0) {
        await pool.query(`UPDATE customers SET total_points = total_points + $1 WHERE customer_id = $2`, [earnedPoints, customer_id]);
        await pool.query(
          `INSERT INTO points_logs (customer_id, order_id, action, points_amount, description) VALUES ($1, $2, 'earn', $3, $4)`,
          [customer_id, order_id || null, earnedPoints, `ได้รับแต้มจากยอดสั่งซื้อ ${amountToCalc} บาท`]
        );
      }
    }
    
    await pool.query('COMMIT');
    res.status(200).json({ success: true, message: '✅ ชำระเงินและบันทึกข้อมูลสำเร็จ!', total_amount: total_amount, earned_points: earnedPoints });
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Checkout Error:', err.message);
    res.status(500).json({ error: 'ไม่สามารถทำรายการได้ในขณะนี้' });
  }
});

// 15. API: ดึงสูตรของเมนู
app.get('/api/recipes/:productId', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT r.recipe_id, i.name as ingredient_name, r.quantity_used, i.unit 
      FROM product_recipes r
      JOIN ingredients i ON r.ingredient_id = i.ingredient_id
      WHERE r.product_id = $1
    `, [req.params.productId]);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching recipes:", err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// 16. API: เพิ่มวัตถุดิบลงในสูตร
app.post('/api/recipes', async (req, res) => {
  const { product_id, ingredient_id, quantity_used } = req.body;
  try {
    await pool.query(
      'INSERT INTO product_recipes (product_id, ingredient_id, quantity_used) VALUES ($1, $2, $3)',
      [product_id, ingredient_id, quantity_used]
    );
    res.json({ success: true, message: 'เพิ่มสูตรสำเร็จ' });
  } catch (err) {
    console.error("Error adding recipe:", err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// 17. API: ลบวัตถุดิบออกจากสูตร
app.delete('/api/recipes/:recipeId', async (req, res) => {
  try {
    await pool.query('DELETE FROM product_recipes WHERE recipe_id = $1', [req.params.recipeId]);
    res.json({ success: true, message: 'ลบสูตรสำเร็จ' });
  } catch (err) {
    console.error("Error deleting recipe:", err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// ==========================================
// 🧑‍💼 API หมวดพนักงาน (Employees)
// ==========================================

// ==========================================
// 🧑‍💼 API หมวดพนักงาน (Employees) - อัปเดตใหม่ให้ตรง DB
// ==========================================

// 18. API: ดึงรายชื่อพนักงานทั้งหมด
app.get('/api/employees', async (req, res) => {
  try {
    // เปลี่ยนมาดึง email แทน username
    const result = await pool.query('SELECT employee_id, name, role, email FROM employees ORDER BY created_at ASC');
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching employees:", err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// 19. API: เพิ่มพนักงานใหม่
app.post('/api/employees', async (req, res) => {
  const { name, role, email, password } = req.body;
  try {
    // เปลี่ยนมาใช้ email และ password_hash
    await pool.query(
      'INSERT INTO employees (name, role, email, password_hash) VALUES ($1, $2, $3, $4)',
      [name, role, email, password]
    );
    res.json({ success: true, message: 'เพิ่มพนักงานสำเร็จ' });
  } catch (err) {
    console.error("Error adding employee:", err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});

// 20. API: ลบพนักงาน
app.delete('/api/employees/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM employees WHERE employee_id = $1', [req.params.id]);
    res.json({ success: true, message: 'ลบพนักงานสำเร็จ' });
  } catch (err) {
    console.error("Error deleting employee:", err.message);
    res.status(500).json({ error: 'Server Error' });
  }
});
app.get('/', (req, res) => res.send('Backend is running with PostgreSQL! ☕'));
app.listen(port, () => console.log(`Server running on port ${port} 🚀`));