import { useState, useEffect } from 'react';
import './App.css'; 

function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]); 

  // ดึงข้อมูลเมนู
  useEffect(() => {
    fetch('http://localhost:3000/api/products')
      .then(res => res.json())
      .then(data => setProducts(data))
      .catch(err => console.error(err));
  }, []);

  // ฟังก์ชันเพิ่มลงตะกร้า
  const addToCart = (product) => {
    setCart([...cart, product]); 
  };

  // คำนวณราคารวม
  const totalPrice = cart.reduce((sum, item) => sum + Number(item.base_price), 0);

  // ฟังก์ชันกดยืนยันสั่งซื้อ (Checkout)
  const handleCheckout = async () => {
    if (cart.length === 0) return alert('ตะกร้าว่างเปล่าครับ!');

    // จัดกลุ่มสินค้านับจำนวนแก้ว
    const orderItems = [];
    cart.forEach(item => {
      const existingItem = orderItems.find(i => i.product_id === item.product_id);
      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        orderItems.push({ ...item, quantity: 1 });
      }
    });

    try {
      // ส่งข้อมูลไปหลังบ้าน
      const response = await fetch('http://localhost:3000/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          items: orderItems, 
          totalAmount: totalPrice 
        })
      });

      if (response.ok) {
        alert('🎉 สั่งซื้อสำเร็จ! ออเดอร์ของคุณกำลังเตรียมการ');
        setCart([]); // ล้างตะกร้า
      } else {
        alert('เกิดข้อผิดพลาดในการสั่งซื้อ');
      }
    } catch (err) {
      console.error(err);
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    }
  };

  return (
    <div className="container">
      <h1>☕ Coffee Shop</h1>
      
      {/* โซนเมนู */}
      <div className="menu-grid">
        {products.map(product => (
          <div key={product.product_id} className="card">
            <h2>{product.name}</h2>
            <p className="desc">{product.description}</p>
            <p className="price">฿{product.base_price}</p>
            <button onClick={() => addToCart(product)}>สั่งซื้อเลย</button>
          </div>
        ))}
      </div>

      <hr style={{ margin: '40px 0', border: '1px solid #ddd' }} />

      {/* โซนตะกร้า */}
      <div className="cart-section" style={{ backgroundColor: '#f0f4f8', padding: '20px', borderRadius: '10px', marginTop: '20px' }}>
        <h2 style={{ textAlign: 'center' }}>🛒 ตะกร้าของคุณ</h2>
        
        {cart.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#666' }}>ยังไม่มีกาแฟในตะกร้าเลยจ้า</p>
        ) : (
          <div style={{ maxWidth: '400px', margin: '0 auto' }}>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {cart.map((item, index) => (
                <li key={index} style={{ fontSize: '1.2rem', margin: '10px 0', display: 'flex', justifyContent: 'space-between' }}>
                  <span>☕ {item.name}</span>
                  <span>฿{item.base_price}</span>
                </li>
              ))}
            </ul>
            <hr />
            <h3 style={{ color: '#d35400', textAlign: 'right' }}>
              💰 ยอดรวม: ฿{totalPrice.toFixed(2)}
            </h3>
            
            <button 
              onClick={handleCheckout} 
              style={{ width: '100%', padding: '15px', backgroundColor: '#27ae60', color: 'white', fontSize: '1.2rem', border: 'none', borderRadius: '5px', cursor: 'pointer', marginTop: '15px' }}
            >
              ✅ ยืนยันสั่งซื้อ (Checkout)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

