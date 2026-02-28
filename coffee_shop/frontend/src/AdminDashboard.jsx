import { useState, useEffect } from 'react';
// 🌟 1. นำเข้า Recharts สำหรับวาดกราฟ
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

function AdminDashboard({ user }) {
  const [activeTab, setActiveTab] = useState('menu'); 
  
  const [products, setProducts] = useState([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const [inventory, setInventory] = useState([]);
  
  const [salesReport, setSalesReport] = useState({ summary: {}, topProducts: [] });

  const fetchProducts = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/products');
      setProducts(await response.json());
    } catch (error) { console.error(error); }
  };

  const fetchInventory = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/inventory');
      setInventory(await response.json());
    } catch (error) { console.error(error); }
  };

  const fetchSalesReport = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/reports/sales');
      const data = await response.json();
      if (data.success) {
        setSalesReport(data);
      }
    } catch (error) { console.error(error); }
  };

  useEffect(() => {
    fetchProducts();
    fetchInventory();
    fetchSalesReport();
  }, []);

  const handleAddProduct = async (e) => { 
    e.preventDefault(); 
    try { 
      const response = await fetch('http://localhost:3000/api/products', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ name, price, description, image_url: imageUrl }) 
      }); 
      if ((await response.json()).success) { 
        alert('✅ เพิ่มเมนูสำเร็จ'); 
        setName(''); setPrice(''); setDescription(''); setImageUrl(''); 
        fetchProducts(); 
      } 
    } catch (error) { console.error(error); } 
  };

  const handleDelete = async (id, productName) => { 
    if (!window.confirm(`⚠️ ลบเมนู ${productName}?`)) return; 
    try { 
      const response = await fetch(`http://localhost:3000/api/products/${id}`, { method: 'DELETE' }); 
      if ((await response.json()).success) { 
        alert('🗑️ ลบสำเร็จ'); 
        fetchProducts(); 
      } 
    } catch (error) { console.error(error); } 
  };

  const handleRefill = async (ingredient) => { 
    const qtyStr = window.prompt(`📦 ระบุจำนวนที่ต้องการเติมให้ "${ingredient.name}":`); 
    if (!qtyStr) return; 
    const quantity = parseFloat(qtyStr); 
    if (isNaN(quantity) || quantity <= 0) { alert('❌ ตัวเลขไม่ถูกต้อง'); return; } 
    const note = window.prompt(`📝 ระบุหมายเหตุ:`) || 'เติมผ่านระบบ Admin'; 
    try { 
      const response = await fetch('http://localhost:3000/api/inventory/refill', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ ingredient_id: ingredient.ingredient_id, employee_id: user?.employee_id, quantity, note }) 
      }); 
      if ((await response.json()).success) { 
        alert(`✅ เติมสต็อกสำเร็จ!`); 
        fetchInventory(); 
      } 
    } catch (error) { console.error(error); } 
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ color: '#4A3B32' }}>👨‍💼 ระบบจัดการหลังร้าน (Admin Dashboard)</h2>
        <span style={{ backgroundColor: '#E8D5C4', padding: '5px 15px', borderRadius: '20px', color: '#4A3B32', fontWeight: 'bold' }}>
          👤 Admin: {user?.name || 'Unknown'}
        </span>
      </div>

      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #E8D5C4', paddingBottom: '10px' }}>
        <button onClick={() => setActiveTab('menu')} style={{ padding: '10px 20px', borderRadius: '8px 8px 0 0', border: 'none', fontWeight: 'bold', cursor: 'pointer', backgroundColor: activeTab === 'menu' ? '#4A3B32' : '#eee', color: activeTab === 'menu' ? 'white' : '#333' }}>☕ จัดการเมนู</button>
        <button onClick={() => setActiveTab('inventory')} style={{ padding: '10px 20px', borderRadius: '8px 8px 0 0', border: 'none', fontWeight: 'bold', cursor: 'pointer', backgroundColor: activeTab === 'inventory' ? '#4A3B32' : '#eee', color: activeTab === 'inventory' ? 'white' : '#333' }}>📦 ดูสต็อก</button>
        <button onClick={() => { setActiveTab('reports'); fetchSalesReport(); }} style={{ padding: '10px 20px', borderRadius: '8px 8px 0 0', border: 'none', fontWeight: 'bold', cursor: 'pointer', backgroundColor: activeTab === 'reports' ? '#4A3B32' : '#eee', color: activeTab === 'reports' ? 'white' : '#333' }}>📈 รายงานยอดขาย</button>
      </div>

      {activeTab === 'menu' && (
        <div>
          <div style={{ backgroundColor: '#FFFaf0', padding: '20px', borderRadius: '10px', marginBottom: '30px', border: '1px solid #E8D5C4' }}>
            <h3 style={{ marginTop: 0, color: '#E67E22' }}>+ เพิ่มเมนูใหม่</h3>
            <form onSubmit={handleAddProduct} style={{ display: 'grid', gap: '10px' }}>
              <input type="text" placeholder="ชื่อเมนู" value={name} onChange={(e) => setName(e.target.value)} required style={{ padding: '8px' }} />
              <input type="number" placeholder="ราคา" value={price} onChange={(e) => setPrice(e.target.value)} required style={{ padding: '8px' }} />
              <button type="submit" style={{ padding: '10px', backgroundColor: '#4CAF50', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}>บันทึกเมนู</button>
            </form>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
            <thead>
              <tr style={{ backgroundColor: '#4A3B32', color: 'white', textAlign: 'left' }}><th style={{ padding: '12px' }}>ชื่อเมนู</th><th style={{ padding: '12px' }}>ราคา</th><th style={{ padding: '12px' }}>จัดการ</th></tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.product_id} style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: '10px', fontWeight: 'bold' }}>{p.name}</td><td style={{ padding: '10px', color: '#E67E22' }}>฿{p.price}</td><td style={{ padding: '10px' }}><button onClick={() => handleDelete(p.product_id, p.name)} style={{ backgroundColor: '#e74c3c', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer' }}>ลบ</button></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'inventory' && (
        <div>
          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
            <thead>
              <tr style={{ backgroundColor: '#4A3B32', color: 'white', textAlign: 'left' }}><th style={{ padding: '12px' }}>ชื่อวัตถุดิบ</th><th style={{ padding: '12px' }}>คงเหลือ</th><th style={{ padding: '12px' }}>จัดการ</th></tr>
            </thead>
            <tbody>
              {inventory.map((item) => (
                <tr key={item.ingredient_id} style={{ borderBottom: '1px solid #eee' }}><td style={{ padding: '10px', fontWeight: 'bold' }}>{item.name}</td><td style={{ padding: '10px' }}>{item.current_stock} {item.unit}</td><td style={{ padding: '10px' }}><button onClick={() => handleRefill(item)} style={{ backgroundColor: '#f39c12', color: 'white', border: 'none', padding: '6px 15px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>➕ เติมของ</button></td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'reports' && (
        <div>
          <div style={{ display: 'flex', gap: '20px', marginBottom: '30px' }}>
            <div style={{ flex: 1, backgroundColor: '#2ecc71', color: 'white', padding: '20px', borderRadius: '10px', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
              <h3 style={{ margin: '0 0 10px 0' }}>💰 ยอดขายรวม (บาท)</h3>
              <p style={{ fontSize: '32px', margin: 0, fontWeight: 'bold' }}>฿{parseFloat(salesReport.summary.total_revenue || 0).toLocaleString()}</p>
            </div>
            <div style={{ flex: 1, backgroundColor: '#3498db', color: 'white', padding: '20px', borderRadius: '10px', textAlign: 'center', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
              <h3 style={{ margin: '0 0 10px 0' }}>🧾 จำนวนออเดอร์</h3>
              <p style={{ fontSize: '32px', margin: 0, fontWeight: 'bold' }}>{salesReport.summary.total_orders || 0} รายการ</p>
            </div>
          </div>

          <h3 style={{ color: '#4A3B32', borderBottom: '2px solid #E8D5C4', paddingBottom: '10px' }}>🏆 5 อันดับเมนูขายดี</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}>
            <thead>
              <tr style={{ backgroundColor: '#4A3B32', color: 'white', textAlign: 'left' }}>
                <th style={{ padding: '12px' }}>อันดับ</th>
                <th style={{ padding: '12px' }}>ชื่อเมนู</th>
                <th style={{ padding: '12px' }}>จำนวนแก้วที่ขายได้</th>
                <th style={{ padding: '12px' }}>สร้างรายได้ (บาท)</th>
              </tr>
            </thead>
            <tbody>
              {salesReport.topProducts.length > 0 ? (
                salesReport.topProducts.map((product, index) => (
                  <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px', fontWeight: 'bold', color: '#E67E22' }}>#{index + 1}</td>
                    <td style={{ padding: '10px', fontWeight: 'bold' }}>{product.name}</td>
                    <td style={{ padding: '10px' }}>{product.total_sold} แก้ว</td>
                    <td style={{ padding: '10px', color: '#27ae60', fontWeight: 'bold' }}>฿{parseFloat(product.total_revenue).toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#999' }}>ยังไม่มีข้อมูลการขายในระบบ</td>
                </tr>
              )}
            </tbody>
          </table>

          {/* 🌟 2. เพิ่มส่วนของกราฟด้านล่างตาราง */}
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', marginTop: '30px' }}>
            <h3 style={{ color: '#4A3B32', marginBottom: '20px', borderBottom: '2px solid #E8D5C4', paddingBottom: '10px' }}>📊 กราฟแสดงจำนวนแก้วที่ขายได้</h3>
            
            <div style={{ width: '100%', height: 350 }}>
              {salesReport.topProducts.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesReport.topProducts} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{fill: '#4A3B32'}} />
                    <YAxis tick={{fill: '#4A3B32'}} />
                    <Tooltip 
                      formatter={(value) => [`${value} แก้ว`, 'จำนวนที่ขายได้']}
                      contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.1)' }}
                    />
                    <Legend />
                    <Bar dataKey="total_sold" fill="#E67E22" name="จำนวนแก้ว" radius={[5, 5, 0, 0]} barSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: '#999' }}>
                  ยังไม่มีข้อมูลเพียงพอสำหรับแสดงกราฟ
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

export default AdminDashboard;