import { useState, useEffect } from 'react';
import './App.css';

function App({ loggedInCustomer, onUpdatePoints }) {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [sweetness, setSweetness] = useState('100%');
  const [paymentMethod, setPaymentMethod] = useState('cash'); // 🌟 Default เป็นตัวเล็กตาม Enum

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('http://localhost:3000/api/products');
        setProducts(await response.json());
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    };
    fetchProducts();
  }, []);

  const handleProductClick = (product) => {
    setSelectedProduct(product);
    setSweetness('100%'); 
  };

  const handleAddToCart = () => {
    if (!selectedProduct) return;
    const itemPrice = parseFloat(selectedProduct.price) || 0; 

    setCart((prevCart) => {
      const existingItem = prevCart.find(item => item.product_id === selectedProduct.product_id && item.sweetness === sweetness);
      if (existingItem) {
        return prevCart.map(item => 
          (item.product_id === selectedProduct.product_id && item.sweetness === sweetness)
            ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        return [...prevCart, { ...selectedProduct, name: `${selectedProduct.name} (หวาน ${sweetness})`, sweetness, price: itemPrice, quantity: 1 }];
      }
    });
    setSelectedProduct(null);
  };

  const removeFromCart = (indexToRemove) => {
    setCart(cart.filter((_, index) => index !== indexToRemove));
  };

  const totalPrice = cart.reduce((total, item) => total + ((parseFloat(item.price) || 0) * item.quantity), 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return alert('ตะกร้าว่างเปล่าครับ!');
    
    try {
      // 1. สร้าง Order
      const orderResponse = await fetch('http://localhost:3000/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cart, total_amount: Number(totalPrice.toFixed(2)) })
      });
      
      const orderData = await orderResponse.json();
      if (!orderResponse.ok) return alert(`❌ Error: ${orderData.error}`);

      // 2. ชำระเงิน (ส่ง payment_method ที่เลือกจริงไป)
      const checkoutResponse = await fetch('http://localhost:3000/api/orders/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: orderData.order_id,
          customer_id: loggedInCustomer ? loggedInCustomer.customer_id : null,
          total_amount: Number(totalPrice.toFixed(2)),
          payment_method: paymentMethod 
        })
      });

      const checkoutData = await checkoutResponse.json();
      if (checkoutResponse.ok) {
        let msg = `🎉 ชำระเงินสำเร็จด้วย ${paymentMethod === 'cash' ? 'เงินสด' : 'QR Code'}!`;
        if (loggedInCustomer && checkoutData.earned_points > 0) {
          msg += `\n🎁 ได้รับแต้ม: +${checkoutData.earned_points} แต้ม!`;
          if (onUpdatePoints) onUpdatePoints(checkoutData.earned_points);
        }
        alert(msg);
        setCart([]); 
      } else {
        alert(`❌ ชำระเงินไม่สำเร็จ: ${checkoutData.error}`);
      }
    } catch (error) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
  };

 return (
    <div style={{ 
      padding: '10px', 
      maxWidth: '1200px', 
      margin: '0 auto', 
      fontFamily: 'sans-serif',
      backgroundColor: '#fdfaf8',
      minHeight: '100vh'
    }}>
      {/* ส่วนหัว Header */}
      <header style={{ textAlign: 'center', marginBottom: '20px' }}>
        <h1 style={{ color: '#4A3B32', fontSize: '24px' }}>☕ ร้านกาแฟของเรา</h1>
      </header>

      {/* Container หลัก: ใช้ flex-wrap เพื่อให้ของตกมาข้างล่างเมื่อจอแคบ */}
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap', // 🌟 หัวใจสำคัญ: ถ้าพื้นที่ไม่พอ จะเอาตะกร้าลงไปข้างล่างอัตโนมัติ
        gap: '20px',
        justifyContent: 'center'
      }}>
        
        {/* ฝั่งซ้าย: เมนูสินค้า (กว้างเต็มที่ในมือถือ / 2 ใน 3 ในจอคอม) */}
        <div style={{ 
          flex: '1 1 600px', // 🌟 ยืดหยุ่น: เล็กสุด 600px ถ้าจอเล็กกว่านั้นจะกว้าง 100%
          minWidth: '300px' 
        }}>
          <h2 style={{ color: '#4A3B32', borderBottom: '2px solid #E8D5C4', paddingBottom: '10px', fontSize: '18px' }}>
            📋 เมนูเครื่องดื่ม
          </h2>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', // 🌟 ปรับขนาด Card ตามจอ
            gap: '15px',
            marginTop: '15px'
          }}>
            {products.map(product => (
              <div key={product.product_id} style={{ 
                border: '1px solid #ddd', 
                borderRadius: '12px', 
                padding: '10px', 
                textAlign: 'center', 
                backgroundColor: 'white',
                boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
              }}>
                <h3 style={{ fontSize: '16px', margin: '5px 0' }}>{product.name}</h3>
                <p style={{ color: '#E67E22', fontWeight: 'bold', fontSize: '18px', margin: '5px 0' }}>
                  ฿{parseFloat(product.price).toFixed(2)}
                </p>
                <button onClick={() => handleProductClick(product)} style={{ 
                  width: '100%', 
                  padding: '8px', 
                  backgroundColor: '#4A3B32', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}>สั่งซื้อ</button>
              </div>
            ))}
          </div>
        </div>

        {/* ฝั่งขวา: ตะกร้าสินค้า (กว้างเต็มในมือถือ / 1 ใน 3 ในจอคอม) */}
        <div style={{ 
          flex: '1 1 300px', // 🌟 ปรับขนาดอัตโนมัติ
          maxWidth: '100%',
          minWidth: '300px'
        }}>
          <div style={{ 
            backgroundColor: '#FFFaf0', 
            padding: '20px', 
            borderRadius: '15px', 
            border: '1px solid #E8D5C4',
            position: 'sticky', // 🌟 จอคอมจะเลื่อนตาม แต่จอมือถือจะต่อท้าย
            top: '20px'
          }}>
            <h2 style={{ marginTop: 0, fontSize: '18px', color: '#4A3B32' }}>🛒 ตะกร้าสินค้า</h2>
            
            {cart.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#999' }}>ยังไม่มีสินค้า</p>
            ) : (
              <div>
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {cart.map((item, index) => (
                    <div key={index} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '10px', borderBottom: '1px dashed #eee', paddingBottom: '5px' }}>
                      <span>{item.name} (x{item.quantity})</span>
                      <button onClick={() => removeFromCart(index)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>ลบ</button>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: '15px', borderTop: '2px solid #E8D5C4', paddingTop: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                    <span>รวมทั้งสิ้น:</span>
                    <span style={{ color: '#E67E22', fontSize: '20px' }}>฿{totalPrice.toFixed(2)}</span>
                  </div>

                  {/* ส่วนเลือกชำระเงิน */}
                  <div style={{ backgroundColor: '#fdf2e9', padding: '10px', borderRadius: '8px', margin: '15px 0' }}>
                    <p style={{ fontWeight: 'bold', margin: '0 0 8px 0', fontSize: '14px' }}>วิธีชำระเงิน:</p>
                    <label style={{ display: 'block', marginBottom: '8px', cursor: 'pointer', fontSize: '14px' }}>
                      <input type="radio" value="cash" checked={paymentMethod === 'cash'} onChange={(e) => setPaymentMethod(e.target.value)} /> เงินสด
                    </label>
                    <label style={{ display: 'block', cursor: 'pointer', fontSize: '14px' }}>
                      <input type="radio" value="qr" checked={paymentMethod === 'qr'} onChange={(e) => setPaymentMethod(e.target.value)} /> QR Code
                    </label>
                  </div>

                  <button onClick={handleCheckout} style={{ 
                    width: '100%', 
                    padding: '15px', 
                    backgroundColor: '#27ae60', 
                    color: 'white', 
                    border: 'none', 
                    borderRadius: '8px', 
                    fontSize: '16px', 
                    fontWeight: 'bold', 
                    cursor: 'pointer' 
                  }}>ยืนยันการสั่งซื้อ</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal เลือกระดับความหวาน (Responsive) */}
      {selectedProduct && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ backgroundColor: 'white', padding: '20px', borderRadius: '15px', width: '100%', maxWidth: '350px' }}>
            <h3 style={{ textAlign: 'center' }}>ระดับความหวาน</h3>
            <div style={{ margin: '20px 0' }}>
              {['0%', '50%', '100%'].map(level => (
                <label key={level} style={{ display: 'block', padding: '10px', border: '1px solid #eee', marginBottom: '5px', borderRadius: '8px' }}>
                  <input type="radio" value={level} checked={sweetness === level} onChange={(e) => setSweetness(e.target.value)} /> {level}
                </label>
              ))}
            </div>
            <button onClick={handleAddToCart} style={{ width: '100%', padding: '12px', backgroundColor: '#E67E22', color: 'white', border: 'none', borderRadius: '8px', marginBottom: '10px' }}>เพิ่มลงตะกร้า</button>
            <button onClick={() => setSelectedProduct(null)} style={{ width: '100%', background: 'none', border: 'none', color: '#666' }}>ยกเลิก</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;