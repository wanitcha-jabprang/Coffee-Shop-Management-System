import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

function AdminDashboard({ user }) {
  const [activeTab, setActiveTab] = useState('menu'); 
  
  // ☕ States: จัดการเมนู
  const [products, setProducts] = useState([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  // 📦 States: สต็อก
  const [inventory, setInventory] = useState([]);

  // 📖 States: จัดการสูตรชง
  const [recipes, setRecipes] = useState([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedIngredientId, setSelectedIngredientId] = useState('');
  const [quantityUsed, setQuantityUsed] = useState('');

  // 📈 States: รายงานยอดขาย
  const [salesReport, setSalesReport] = useState({ summary: {}, topProducts: [] });

  // 👥 States: พนักงาน
  const [employees, setEmployees] = useState([]);
  const [empName, setEmpName] = useState('');
  const [empRole, setEmpRole] = useState('barista');
  const [empEmail, setEmpEmail] = useState('');
  const [empPassword, setEmpPassword] = useState('');

  // ==========================================
  // 📥 ฟังก์ชัน Fetch ข้อมูลทั้งหมด
  // ==========================================
  const fetchProducts = async () => {
    try { const res = await fetch('http://localhost:3000/api/products'); setProducts(await res.json()); } catch (err) { console.error(err); }
  };
  
  const fetchInventory = async () => {
    try { const res = await fetch('http://localhost:3000/api/inventory'); setInventory(await res.json()); } catch (err) { console.error(err); }
  };

  const fetchSalesReport = async () => {
    try { const res = await fetch('http://localhost:3000/api/reports/sales'); const data = await res.json(); if (data.success) setSalesReport(data); } catch (err) { console.error(err); }
  };

  const fetchRecipes = async (productId) => {
    if (!productId) { setRecipes([]); return; }
    try { const res = await fetch(`http://localhost:3000/api/recipes/${productId}`); setRecipes(await res.json()); } catch (err) { console.error(err); }
  };

  const fetchEmployees = async () => {
    try { const res = await fetch('http://localhost:3000/api/employees'); setEmployees(await res.json()); } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchProducts();
    fetchInventory();
    fetchSalesReport();
    fetchEmployees();
  }, []);

  useEffect(() => { 
    fetchRecipes(selectedProductId); 
  }, [selectedProductId]);

  // ==========================================
  // 📝 ฟังก์ชันจัดการข้อมูล (เพิ่ม/ลบ)
  // ==========================================
  
  // -- เมนู --
  const handleAddProduct = async (e) => { 
    e.preventDefault(); 
    try { 
      const res = await fetch('http://localhost:3000/api/products', { 
        method: 'POST', headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ name, price, description, image_url: imageUrl }) 
      }); 
      if ((await res.json()).success) { alert('✅ เพิ่มเมนูสำเร็จ'); setName(''); setPrice(''); setDescription(''); setImageUrl(''); fetchProducts(); } 
    } catch (err) { console.error(err); } 
  };

  const handleDeleteProduct = async (id, productName) => { 
    if (!window.confirm(`⚠️ ลบเมนู ${productName}?`)) return; 
    try { const res = await fetch(`http://localhost:3000/api/products/${id}`, { method: 'DELETE' }); if ((await res.json()).success) { alert('🗑️ ลบเมนูสำเร็จ'); fetchProducts(); if (selectedProductId === id) setSelectedProductId(''); } } catch (err) { console.error(err); } 
  };

  // -- สต็อก --
  const handleRefill = async (ingredient) => { 
    const qtyStr = window.prompt(`📦 ระบุจำนวนที่ต้องการเติมให้ "${ingredient.name}":`); 
    if (!qtyStr) return; 
    const quantity = parseFloat(qtyStr);
    if (isNaN(quantity) || quantity <= 0) { alert('❌ ตัวเลขไม่ถูกต้อง'); return; }
    try { const res = await fetch('http://localhost:3000/api/inventory/refill', { 
      method: 'POST', headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ ingredient_id: ingredient.ingredient_id, employee_id: user?.employee_id, quantity, note: 'เติมผ่านระบบ Admin' }) 
    }); if ((await res.json()).success) { alert(`✅ เติมสต็อกสำเร็จ!`); fetchInventory(); } } catch (err) { console.error(err); } 
  };

  // -- สูตรชง --
  const handleAddRecipe = async (e) => {
    e.preventDefault();
    if (!selectedProductId || !selectedIngredientId || !quantityUsed) return alert('กรุณากรอกข้อมูลให้ครบ');
    try { const res = await fetch('http://localhost:3000/api/recipes', { 
      method: 'POST', headers: { 'Content-Type': 'application/json' }, 
      body: JSON.stringify({ product_id: selectedProductId, ingredient_id: selectedIngredientId, quantity_used: quantityUsed }) 
    }); if ((await res.json()).success) { setSelectedIngredientId(''); setQuantityUsed(''); fetchRecipes(selectedProductId); } } catch (err) { console.error(err); }
  };

  const handleDeleteRecipe = async (recipeId) => {
    if (!window.confirm('ลบวัตถุดิบนี้ออกจากสูตร?')) return;
    try { const res = await fetch(`http://localhost:3000/api/recipes/${recipeId}`, { method: 'DELETE' }); if ((await res.json()).success) fetchRecipes(selectedProductId); } catch (err) { console.error(err); }
  };

  // -- พนักงาน --
  const handleAddEmployee = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:3000/api/employees', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: empName, role: empRole, email: empEmail, password: empPassword })
      });
      if ((await response.json()).success) { alert('✅ เพิ่มพนักงานสำเร็จ'); setEmpName(''); setEmpEmail(''); setEmpPassword(''); setEmpRole('barista'); fetchEmployees(); }
    } catch (err) { console.error(err); }
  };

  const handleDeleteEmployee = async (id, name) => {
    if (!window.confirm(`⚠️ ลบพนักงาน: ${name}?`)) return;
    try { const response = await fetch(`http://localhost:3000/api/employees/${id}`, { method: 'DELETE' }); if ((await response.json()).success) fetchEmployees(); } catch (err) { console.error(err); }
  };

  // ==========================================
  // 🎨 UI Style
  // ==========================================
  const tabStyle = (tabName) => ({
    padding: '10px 20px', borderRadius: '8px 8px 0 0', border: 'none', fontWeight: 'bold', cursor: 'pointer',
    backgroundColor: activeTab === tabName ? '#4A3B32' : '#eee', color: activeTab === tabName ? 'white' : '#333'
  });

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ color: '#4A3B32' }}>👨‍💼 ระบบจัดการหลังร้าน (Admin Dashboard)</h2>
        <span style={{ backgroundColor: '#E8D5C4', padding: '5px 15px', borderRadius: '20px', color: '#4A3B32', fontWeight: 'bold' }}>👤 Admin: {user?.name || 'Unknown'}</span>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #E8D5C4', paddingBottom: '10px', flexWrap: 'wrap' }}>
        <button onClick={() => setActiveTab('menu')} style={tabStyle('menu')}>☕ จัดการเมนู</button>
        <button onClick={() => setActiveTab('recipes')} style={tabStyle('recipes')}>📖 จัดการสูตรชง</button>
        <button onClick={() => setActiveTab('inventory')} style={tabStyle('inventory')}>📦 ดูสต็อก</button>
        <button onClick={() => setActiveTab('employees')} style={tabStyle('employees')}>👥 จัดการพนักงาน</button>
        <button onClick={() => { setActiveTab('reports'); fetchSalesReport(); }} style={tabStyle('reports')}>📈 รายงานยอดขาย</button>
      </div>

      {/* ==================== แท็บ 1: จัดการเมนู ==================== */}
      {activeTab === 'menu' && (
        <div>
          <div style={{ backgroundColor: '#FFFaf0', padding: '20px', borderRadius: '10px', marginBottom: '30px', border: '1px solid #E8D5C4' }}>
            <h3 style={{ marginTop: 0, color: '#d35400' }}>+ เพิ่มเมนูใหม่</h3>
            <form onSubmit={handleAddProduct} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <input type="text" placeholder="ชื่อเมนู" value={name} onChange={(e) => setName(e.target.value)} required style={{ padding: '10px' }} />
              <input type="number" placeholder="ราคา (บาท)" value={price} onChange={(e) => setPrice(e.target.value)} required style={{ padding: '10px' }} />
              <input type="text" placeholder="รายละเอียด (ถ้ามี)" value={description} onChange={(e) => setDescription(e.target.value)} style={{ padding: '10px' }} />
              <input type="text" placeholder="URL รูปภาพ (ถ้ามี)" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} style={{ padding: '10px' }} />
              <button type="submit" style={{ gridColumn: 'span 2', padding: '12px', backgroundColor: '#27ae60', color: 'white', fontWeight: 'bold', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>บันทึกเมนู</button>
            </form>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
            <thead>
              <tr style={{ backgroundColor: '#4A3B32', color: 'white', textAlign: 'left' }}>
                <th style={{ padding: '12px' }}>รูป</th><th style={{ padding: '12px' }}>ชื่อเมนู</th><th style={{ padding: '12px' }}>ราคา</th><th style={{ padding: '12px' }}>รายละเอียด</th><th style={{ padding: '12px' }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.product_id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px' }}>
                    {p.image_url ? <img src={p.image_url} alt={p.name} style={{ width: '50px', height: '50px', objectFit: 'cover', borderRadius: '5px' }}/> : '🚫'}
                  </td>
                  <td style={{ padding: '10px', fontWeight: 'bold' }}>{p.name}</td>
                  <td style={{ padding: '10px', color: '#d35400' }}>฿{p.price}</td>
                  <td style={{ padding: '10px', color: '#666' }}>{p.description || '-'}</td>
                  <td style={{ padding: '10px' }}><button onClick={() => handleDeleteProduct(p.product_id, p.name)} style={{ backgroundColor: '#e74c3c', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>ลบ</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ==================== แท็บ 2: จัดการสูตรชง ==================== */}
      {activeTab === 'recipes' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginTop: 0 }}>1. เลือกเมนูที่ต้องการผูกสูตร</h3>
            <select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)} style={{ width: '100%', padding: '10px', fontSize: '16px' }}>
              <option value="">-- กรุณาเลือกเมนู --</option>
              {products.map(p => <option key={p.product_id} value={p.product_id}>{p.name}</option>)}
            </select>
          </div>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginTop: 0 }}>2. วัตถุดิบที่ใช้ในเมนูนี้</h3>
            {!selectedProductId ? (<p style={{ color: '#888' }}>กรุณาเลือกเมนูก่อนครับ</p>) : (
              <>
                <form onSubmit={handleAddRecipe} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                  <select value={selectedIngredientId} onChange={(e) => setSelectedIngredientId(e.target.value)} required style={{ flex: 2, padding: '8px' }}>
                    <option value="">-- เลือกวัตถุดิบ --</option>
                    {inventory.map(inv => <option key={inv.ingredient_id} value={inv.ingredient_id}>{inv.name} ({inv.unit})</option>)}
                  </select>
                  <input type="number" placeholder="ปริมาณที่ใช้" value={quantityUsed} onChange={(e) => setQuantityUsed(e.target.value)} required step="0.01" style={{ flex: 1, padding: '8px' }} />
                  <button type="submit" style={{ flex: 1, backgroundColor: '#2ecc71', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer' }}>+ เพิ่ม</button>
                </form>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr style={{ backgroundColor: '#f9f9f9' }}><th style={{ padding: '8px', textAlign: 'left' }}>วัตถุดิบ</th><th style={{ padding: '8px', textAlign: 'left' }}>ปริมาณที่ใช้</th><th style={{ padding: '8px' }}>ลบ</th></tr></thead>
                  <tbody>
                    {recipes.map(r => (
                      <tr key={r.recipe_id} style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '8px' }}>{r.ingredient_name}</td>
                        <td style={{ padding: '8px' }}>{r.quantity_used} {r.unit}</td>
                        <td style={{ padding: '8px', textAlign: 'center' }}><button onClick={() => handleDeleteRecipe(r.recipe_id)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>❌</button></td>
                      </tr>
                    ))}
                    {recipes.length === 0 && <tr><td colSpan="3" style={{ padding: '10px', textAlign: 'center', color: '#999' }}>ยังไม่ได้เพิ่มสูตรชง</td></tr>}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>
      )}

      {/* ==================== แท็บ 3: ดูสต็อก ==================== */}
      {activeTab === 'inventory' && (
        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
          <thead><tr style={{ backgroundColor: '#4A3B32', color: 'white', textAlign: 'left' }}><th style={{ padding: '12px' }}>วัตถุดิบ</th><th style={{ padding: '12px' }}>คงเหลือ</th><th style={{ padding: '12px' }}>จัดการ</th></tr></thead>
          <tbody>
            {inventory.map((inv) => (
              <tr key={inv.ingredient_id} style={{ borderBottom: '1px solid #eee' }}>
                <td style={{ padding: '10px', fontWeight: 'bold' }}>{inv.name}</td>
                <td style={{ padding: '10px', color: inv.current_stock < 50 ? 'red' : 'inherit' }}>{inv.current_stock} {inv.unit}</td>
                <td style={{ padding: '10px' }}><button onClick={() => handleRefill(inv)} style={{ backgroundColor: '#f39c12', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>+ เติมของ</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* ==================== แท็บ 4: จัดการพนักงาน ==================== */}
      {activeTab === 'employees' && (
        <div>
          <div style={{ backgroundColor: '#FFFaf0', padding: '20px', borderRadius: '10px', marginBottom: '30px', border: '1px solid #E8D5C4' }}>
            <h3 style={{ marginTop: 0, color: '#3498db' }}>+ เพิ่มพนักงานใหม่</h3>
            <form onSubmit={handleAddEmployee} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
              <input type="text" placeholder="ชื่อ-นามสกุล" value={empName} onChange={(e) => setEmpName(e.target.value)} required style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }} />
              <select value={empRole} onChange={(e) => setEmpRole(e.target.value)} style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }}>
                <option value="barista">บาริสต้า (Barista)</option>
                <option value="cashier">แคชเชียร์ (Cashier)</option>
                <option value="admin">แอดมิน (Admin)</option>
              </select>
              <input type="email" placeholder="Email (สำหรับ Login)" value={empEmail} onChange={(e) => setEmpEmail(e.target.value)} required style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }} />
              <input type="password" placeholder="Password (รหัสผ่าน)" value={empPassword} onChange={(e) => setEmpPassword(e.target.value)} required style={{ padding: '10px', border: '1px solid #ccc', borderRadius: '5px' }} />
              <button type="submit" style={{ gridColumn: 'span 2', padding: '12px', backgroundColor: '#3498db', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>บันทึกพนักงาน</button>
            </form>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white' }}>
            <thead><tr style={{ backgroundColor: '#4A3B32', color: 'white', textAlign: 'left' }}><th style={{ padding: '12px' }}>รหัส (ย่อ)</th><th style={{ padding: '12px' }}>ชื่อ</th><th style={{ padding: '12px' }}>ตำแหน่ง</th><th style={{ padding: '12px' }}>Email</th><th style={{ padding: '12px' }}>จัดการ</th></tr></thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.employee_id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ padding: '10px', color: '#888' }}>#{String(emp.employee_id).substring(0, 8)}</td>
                  <td style={{ padding: '10px', fontWeight: 'bold' }}>{emp.name}</td>
                  <td style={{ padding: '10px' }}>
                    <span style={{ backgroundColor: emp.role === 'admin' ? '#e74c3c' : emp.role === 'barista' ? '#f39c12' : '#2ecc71', color: 'white', padding: '4px 10px', borderRadius: '15px', fontSize: '12px', fontWeight: 'bold', textTransform: 'capitalize' }}>{emp.role}</span>
                  </td>
                  <td style={{ padding: '10px' }}>{emp.email}</td>
                  <td style={{ padding: '10px' }}><button onClick={() => handleDeleteEmployee(emp.employee_id, emp.name)} style={{ backgroundColor: '#e74c3c', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>ลบ</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ==================== แท็บ 5: รายงานยอดขาย (แก้ตรงนี้แล้ว 📈) ==================== */}
      {activeTab === 'reports' && (
        <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px' }}>
          <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
            <div style={{ flex: 1, backgroundColor: '#f1c40f', padding: '20px', borderRadius: '10px', textAlign: 'center' }}>
              <h3 style={{ margin: 0, color: '#fff' }}>ยอดขายรวมทั้งหมด</h3>
              {/* เปลี่ยนค่าให้โชว์เป็นตัวเลขและใส่ลูกน้ำ (,) */}
              <h1 style={{ margin: '10px 0 0 0', color: '#fff', fontSize: '36px' }}>฿{Number(salesReport.summary.total_sales || 0).toLocaleString()}</h1>
            </div>
            <div style={{ flex: 1, backgroundColor: '#3498db', padding: '20px', borderRadius: '10px', textAlign: 'center' }}>
              <h3 style={{ margin: 0, color: '#fff' }}>จำนวนออเดอร์</h3>
              <h1 style={{ margin: '10px 0 0 0', color: '#fff', fontSize: '36px' }}>{salesReport.summary.total_orders || 0} บิล</h1>
            </div>
          </div>
          <h3>🏆 Top 5 เมนูขายดี</h3>
          {salesReport.topProducts.length > 0 ? (
            <div style={{ height: '300px', width: '100%' }}>
              <ResponsiveContainer>
                {/* เพิ่ม .map เพื่อแปลงค่า total_qty ให้เป็น Number() กราฟจะได้วาดแท่งถูก */}
                <BarChart data={salesReport.topProducts.map(item => ({ ...item, total_qty: Number(item.total_qty || 0) }))} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total_qty" name="จำนวนแก้วที่ขายได้" fill="#8e44ad" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (<p style={{ textAlign: 'center', color: '#888' }}>ยังไม่มีข้อมูลยอดขาย</p>)}
        </div>
      )}

    </div>
  );
}

export default AdminDashboard;