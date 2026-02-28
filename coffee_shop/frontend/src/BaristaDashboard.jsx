import { useState, useEffect } from 'react';

function BaristaDashboard() {
  const [orders, setOrders] = useState([]);

  // ฟังก์ชันดึงรายการออเดอร์ที่สถานะ pending
  const fetchOrders = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/orders/pending');
      const data = await response.json();
      setOrders(data); // 🌟 ยัดใส่ State ได้เลยเพราะหลังบ้านกรองมาให้แล้ว
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการดึงออเดอร์:', error);
    }
  };

  // ดึงข้อมูลครั้งแรกเมื่อเปิดหน้าเว็บ และตั้งเวลารีเฟรชทุกๆ 5 วินาที
  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 5000); 
    return () => clearInterval(interval);
  }, []);

  // ฟังก์ชันเมื่อบาริสต้ากดปุ่ม "ทำเสร็จแล้ว"
  const handleCompleteOrder = async (orderId) => {
    if (!window.confirm(`ยืนยันว่าออเดอร์ #${orderId} ทำเสร็จแล้ว และต้องการส่งมอบใช่ไหม?`)) {
      return; 
    }

    try {
      const response = await fetch(`http://localhost:3000/api/orders/${orderId}/complete`, {
        method: 'PUT',
      });

      if (response.ok) {
        alert(`✅ ส่งมอบออเดอร์ #${orderId} สำเร็จ!`);
        fetchOrders(); // รีเฟรชหน้าจอคิวทันที
      } else {
        alert('❌ เกิดข้อผิดพลาดในการอัปเดตสถานะ');
      }
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h2 style={{ textAlign: 'center', color: '#4A3B32' }}>👨‍🍳 หน้าจอคิวบาริสต้า (Barista Dashboard)</h2>
      
      {orders.length === 0 ? (
        <p style={{ textAlign: 'center', fontSize: '18px', color: '#888' }}>🎉 ตอนนี้ไม่มีคิวออเดอร์ค้างอยู่ครับ!</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          {orders.map((order) => (
            <div key={order.order_id} style={{
              border: '2px solid #E8D5C4', 
              borderRadius: '10px', 
              padding: '15px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#FFFaf0'
            }}>
              <div>
                <h3 style={{ margin: '0 0 10px 0', color: '#4A3B32' }}>บิลออเดอร์ #{order.order_id}</h3>
                
                {/* 🌟 แสดงรายการเครื่องดื่ม */}
                <div style={{ marginBottom: '10px', padding: '10px', backgroundColor: '#fff', borderRadius: '5px', border: '1px dashed #ccc' }}>
                  <strong>รายการเครื่องดื่ม:</strong>
                  <ul style={{ margin: '5px 0 0 0', paddingLeft: '20px', color: '#333' }}>
                    {order.items && order.items.map((item, index) => (
                      <li key={index}>
                        {item.product_name} x {item.quantity} แก้ว
                      </li>
                    ))}
                  </ul>
                </div>

                <p style={{ margin: '0', color: '#666' }}>ยอดรวม: ฿{order.total_amount}</p>
                <p style={{ margin: '5px 0 0 0', fontWeight: 'bold', color: '#E67E22' }}>
                  สถานะ: ⏳ กำลังเตรียม (Pending)
                </p>
              </div>
              
              <button 
                onClick={() => handleCompleteOrder(order.order_id)}
                style={{
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  padding: '12px 20px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}
              >
                ✅ ทำเสร็จแล้ว (ส่งมอบ)
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default BaristaDashboard;