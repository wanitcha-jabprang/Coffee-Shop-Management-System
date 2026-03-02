import React, { useState, useEffect } from 'react';

const Shop = ({ currentUser }) => {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);

  // 1. ดึงข้อมูลเมนูน้ำจาก Database (API 1)
  useEffect(() => {
    fetch('http://localhost:3000/api/products')
      .then(res => res.json())
      .then(data => setProducts(data))
      .catch(err => console.error('Error fetching products:', err));
  }, []);

  // 2. ฟังก์ชันกดเพิ่มน้ำลงตะกร้า
  const addToCart = (product) => {
    const existingItem = cart.find(item => item.product_id === product.product_id);
    if (existingItem) {
      setCart(cart.map(item => 
        item.product_id === product.product_id 
        ? { ...item, quantity: item.quantity + 1 } 
        : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  // 3. คำนวณยอดเงินรวมในตะกร้า
  const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // 4. ฟังก์ชันกด "ชำระเงิน" (ยิงเข้า API 3 และ API 14)
  const handleCheckout = async () => {
    if (cart.length === 0) {
      return alert('ตะกร้าว่างเปล่า! กรุณาเลือกเครื่องดื่มก่อนครับ ☕');
    }

    try {
      // สเต็ป 1: บันทึกออเดอร์ลงระบบก่อน (API 3)
      const orderResponse = await fetch('http://localhost:3000/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cart, total_amount: totalAmount })
      });
      const orderData = await orderResponse.json();

      if (!orderResponse.ok) throw new Error(orderData.error);

      // สเต็ป 2: ชำระเงินและคำนวณแต้มสะสม (API 14 ที่เพิ่งเพิ่มไป)
      const customerId = currentUser ? currentUser.customer_id : null; 

      const checkoutResponse = await fetch('http://localhost:3000/api/orders/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderData.orderId,
          customer_id: customerId,
          total_amount: totalAmount
        })
      });
      const checkoutData = await checkoutResponse.json();

      if (checkoutResponse.ok) {
        // แจ้งเตือนเมื่อสำเร็จ และบอกว่าได้แต้มเท่าไหร่
        let successMessage = '✅ สั่งซื้อและชำระเงินสำเร็จ! บาริสต้ากำลังเตรียมเครื่องดื่มครับ\n';
        if (checkoutData.earned_points > 0) {
          successMessage += `🎉 คุณได้รับแต้มสะสมเพิ่ม ${checkoutData.earned_points} แต้ม!`;
        }
        alert(successMessage);
        
        setCart([]); // สั่งเสร็จแล้ว เคลียร์ตะกร้าให้ว่าง
      } else {
        alert(`❌ เกิดข้อผิดพลาดตอนชำระเงิน: ${checkoutData.error}`);
      }

    } catch (error) {
      console.error('Checkout error:', error);
      alert('เกิดข้อผิดพลาดในการทำรายการ กรุณาลองใหม่ครับ');
    }
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>☕ สั่งเครื่องดื่ม (Shop)</h1>
      
      {/* ส่วนแสดงข้อมูลลูกค้าที่ล็อกอิน */}
      {currentUser && (
        <div style={{ background: '#e3f2fd', padding: '10px', borderRadius: '8px', marginBottom: '20px' }}>
          <strong>ยินดีต้อนรับคุณ:</strong> {currentUser.first_name} {currentUser.last_name} | 
          <strong> แต้มสะสมปัจจุบัน:</strong> {currentUser.total_points} แต้ม
        </div>
      )}

      <div style={{ display: 'flex', gap: '20px' }}>
        {/* ฝั่งซ้าย: รายการเมนูน้ำ */}
        <div style={{ flex: 2 }}>
          <h2>เมนูของเรา</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '15px' }}>
            {products.map(product => (
              <div key={product.product_id} style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px', textAlign: 'center' }}>
                <h3>{product.name}</h3>
                <p style={{ color: 'gray' }}>{product.description}</p>
                <p style={{ fontSize: '1.2em', fontWeight: 'bold', color: '#d35400' }}>฿{product.price}</p>
                <button 
                  onClick={() => addToCart(product)}
                  style={{ background: '#27ae60', color: 'white', border: 'none', padding: '10px 15px', borderRadius: '5px', cursor: 'pointer' }}
                >
                  + ใส่ตะกร้า
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* ฝั่งขวา: ตะกร้าสินค้า */}
        <div style={{ flex: 1, borderLeft: '2px solid #eee', paddingLeft: '20px' }}>
          <h2>🛒 ตะกร้าของคุณ</h2>
          {cart.length === 0 ? (
            <p>ยังไม่มีสินค้าในตะกร้า</p>
          ) : (
            <div>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {cart.map((item, index) => (
                  <li key={index} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', borderBottom: '1px dashed #ccc', paddingBottom: '10px' }}>
                    <span>{item.name} (x{item.quantity})</span>
                    <span>฿{item.price * item.quantity}</span>
                  </li>
                ))}
              </ul>
              <h3 style={{ textAlign: 'right', color: '#c0392b' }}>ยอดรวม: ฿{totalAmount}</h3>
              <button 
                onClick={handleCheckout}
                style={{ width: '100%', background: '#2980b9', color: 'white', border: 'none', padding: '15px', borderRadius: '8px', fontSize: '1.1em', cursor: 'pointer', marginTop: '10px' }}
              >
                💳 ชำระเงินเลย
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Shop;