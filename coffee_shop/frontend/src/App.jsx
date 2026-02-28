import { useState, useEffect } from 'react';
import './App.css';

// 🌟 1. รับ Props loggedInCustomer และ onUpdatePoints ที่ส่งมาจาก main.jsx
function App({ loggedInCustomer, onUpdatePoints }) {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [sweetness, setSweetness] = useState('100%'); 

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

    const productNameWithOption = `${selectedProduct.name} (หวาน ${sweetness})`;
    const itemPrice = parseFloat(selectedProduct.price) || 0; 

    setCart((prevCart) => {
      const existingItem = prevCart.find(
        item => item.product_id === selectedProduct.product_id && item.sweetness === sweetness
      );

      if (existingItem) {
        return prevCart.map(item => 
          (item.product_id === selectedProduct.product_id && item.sweetness === sweetness)
            ? { ...item, quantity: item.quantity + 1 } 
            : item
        );
      } else {
        return [...prevCart, { 
          ...selectedProduct, 
          name: productNameWithOption, 
          sweetness: sweetness, 
          price: itemPrice, 
          quantity: 1 
        }];
      }
    });

    setSelectedProduct(null);
  };

  const removeFromCart = (indexToRemove) => {
    setCart(cart.filter((_, index) => index !== indexToRemove));
  };

  const totalPrice = cart.reduce((total, item) => {
    const price = parseFloat(item.price) || 0;
    return total + (price * item.quantity);
  }, 0);

  // 🌟 2. อัปเกรดฟังก์ชัน Checkout ให้ผูกกับระบบแต้ม
  const handleCheckout = async () => {
    if (cart.length === 0) return alert('ตะกร้าว่างเปล่าครับ!');
    
    try {
      // สเต็ป 1: ส่งออเดอร์ไปให้บาริสต้าทำ (API เดิม)
      const orderResponse = await fetch('http://localhost:3000/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          items: cart, 
          total_amount: Number(totalPrice.toFixed(2)) 
        })
      });
      
      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        return alert(`❌ เกิดข้อผิดพลาดในการสร้างออเดอร์: ${errorData.error}`);
      }

      const orderData = await orderResponse.json();
      // ดึง order_id ที่เพิ่งสร้างเสร็จมาใช้งาน
      const newOrderId = orderData.order_id || null; 

      // สเต็ป 2: ชำระเงินและแจกแต้ม (API ใหม่ที่เพิ่งเขียน)
      const checkoutResponse = await fetch('http://localhost:3000/api/orders/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: newOrderId,
          customer_id: loggedInCustomer ? loggedInCustomer.customer_id : null,
          total_amount: Number(totalPrice.toFixed(2))
        })
      });

      const checkoutData = await checkoutResponse.json();

      if (checkoutResponse.ok) {
        // สร้างข้อความแจ้งเตือนความสำเร็จ
        let successMessage = '🎉 ส่งออเดอร์ให้บาริสต้าและชำระเงินเรียบร้อยแล้ว!';
        
        // ถ้าล็อกอินอยู่ และได้แต้ม จะแสดงข้อความแจ้งด้วย
        if (loggedInCustomer && checkoutData.earned_points > 0) {
          successMessage += `\n\n🎁 คุณได้รับแต้มสะสมเพิ่ม: +${checkoutData.earned_points} แต้ม!`;
          
          // 🌟 สะกิดบอกให้อัปเดตแต้มที่หน้าจอแบบ Real-time ทันที!
          if (onUpdatePoints) {
             onUpdatePoints(checkoutData.earned_points);
          }
        }

        alert(successMessage);
        setCart([]); // ล้างตะกร้าเมื่อเสร็จสิ้น
      } else {
        alert(`❌ ชำระเงินไม่สำเร็จ: ${checkoutData.error}`);
      }

    } catch (error) {
      console.error('Checkout error:', error);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อกับเซิร์ฟเวอร์');
    }
  };

  return (
    <div style={{ display: 'flex', gap: '20px', padding: '20px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      
      {/* ฝั่งซ้าย: รายการสินค้า */}
      <div style={{ flex: 2 }}>
        <h2 style={{ color: '#4A3B32', borderBottom: '2px solid #E8D5C4', paddingBottom: '10px' }}>☕ เมนูเครื่องดื่มของเรา</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '20px' }}>
          {products.map(product => (
            <div 
              key={product.product_id} 
              style={{ border: '1px solid #ddd', borderRadius: '10px', padding: '15px', textAlign: 'center', backgroundColor: 'white', transition: '0.3s', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}
            >
              <div>
                <h3 style={{ margin: '10px 0 5px 0', color: '#333' }}>{product.name}</h3>
                <p style={{ fontSize: '12px', color: '#777', minHeight: '30px' }}>{product.description}</p>
                <p style={{ margin: '10px 0', color: '#E67E22', fontWeight: 'bold', fontSize: '20px' }}>
                  ฿{parseFloat(product.price || 0).toFixed(2)}
                </p>
              </div>
              <button 
                onClick={() => handleProductClick(product)}
                style={{ width: '100%', padding: '10px', backgroundColor: '#4A3B32', color: 'white', border: 'none', borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                สั่งซื้อเลย
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ฝั่งขวา: ตะกร้าสินค้า */}
      <div style={{ flex: 1, backgroundColor: '#FFFaf0', padding: '20px', borderRadius: '15px', border: '1px solid #E8D5C4', height: 'fit-content', position: 'sticky', top: '20px' }}>
        <h2 style={{ margin: '0 0 20px 0', color: '#4A3B32' }}>🛒 ตะกร้าของคุณ</h2>
        
        {cart.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#999' }}>ยังไม่มีรายการสินค้า</p>
        ) : (
          <div>
            {cart.map((item, index) => (
              <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px dashed #ccc' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 'bold', color: '#333' }}>{item.name}</div>
                  <div style={{ fontSize: '14px', color: '#666' }}>{item.quantity} x ฿{parseFloat(item.price).toFixed(2)}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ fontWeight: 'bold' }}>฿{(item.quantity * parseFloat(item.price)).toFixed(2)}</div>
                    <button onClick={() => removeFromCart(index)} style={{ backgroundColor: '#e74c3c', color: 'white', border: 'none', padding: '5px 10px', borderRadius: '5px', cursor: 'pointer' }}>ลบ</button>
                </div>
              </div>
            ))}
            
            <div style={{ marginTop: '20px', borderTop: '2px solid #E8D5C4', paddingTop: '15px' }}>
              <h3 style={{ display: 'flex', justifyContent: 'space-between', margin: 0 }}>
                <span>ยอดชำระ:</span>
                <span style={{ color: '#E67E22', fontSize: '24px' }}>฿{totalPrice.toFixed(2)}</span>
              </h3>

              {/* 🌟 3. แสดงสถานะว่าลูกค้าจะได้แต้มหรือไม่ */}
              <div style={{ marginTop: '10px', fontSize: '14px', textAlign: 'center', padding: '10px', borderRadius: '8px', backgroundColor: loggedInCustomer ? '#D4EDDA' : '#F8D7DA', color: loggedInCustomer ? '#155724' : '#721C24' }}>
                {loggedInCustomer ? (
                   <span>✅ สะสมแต้มได้ (บิลนี้ได้ประมาณ <strong>{Math.floor(totalPrice / 50)}</strong> แต้ม)</span>
                ) : (
                   <span>⚠️ สมัครสมาชิก/ล็อกอิน เพื่อสะสมแต้ม</span>
                )}
              </div>

              <button 
                onClick={handleCheckout} 
                style={{ width: '100%', padding: '15px', backgroundColor: '#27ae60', color: 'white', border: 'none', borderRadius: '8px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer', marginTop: '15px' }}
              >
                ยืนยันออเดอร์
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal เลือกระดับความหวาน */}
      {selectedProduct && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '15px', width: '400px', maxWidth: '90%', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }}>
            <h2 style={{ marginTop: 0, color: '#4A3B32', textAlign: 'center' }}>เลือกระดับความหวาน</h2>
            <p style={{ fontWeight: 'bold', fontSize: '18px', color: '#333', textAlign: 'center' }}>{selectedProduct.name}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', margin: '20px 0' }}>
              {['0%', '25%', '50%', '100%', '125%'].map(level => (
                <label key={level} style={{ display: 'flex', alignItems: 'center', padding: '12px', border: '2px solid', borderRadius: '8px', cursor: 'pointer', backgroundColor: sweetness === level ? '#FFFaf0' : 'white', borderColor: sweetness === level ? '#E67E22' : '#eee', transition: '0.2s' }}>
                  <input 
                    type="radio" 
                    name="sweetness" 
                    value={level} 
                    checked={sweetness === level} 
                    onChange={(e) => setSweetness(e.target.value)} 
                    style={{ marginRight: '15px', transform: 'scale(1.2)', accentColor: '#E67E22' }}
                  />
                  <span style={{ fontSize: '16px', fontWeight: sweetness === level ? 'bold' : 'normal', color: '#333' }}>
                    ความหวาน {level} 
                    {level === '100%' && ' (ปกติ)'} 
                    {level === '0%' && ' (ไม่หวาน)'}
                  </span>
                </label>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '30px' }}>
              <button onClick={() => setSelectedProduct(null)} style={{ flex: 1, padding: '12px', backgroundColor: '#ecf0f1', color: '#333', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}>ยกเลิก</button>
              <button onClick={handleAddToCart} style={{ flex: 2, padding: '12px', backgroundColor: '#E67E22', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer', fontSize: '16px' }}>➕ เพิ่มลงตะกร้า</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;