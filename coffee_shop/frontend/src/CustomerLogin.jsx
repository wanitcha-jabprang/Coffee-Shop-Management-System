import React, { useState } from 'react';

function CustomerLogin({ onLoginSuccess }) {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [message, setMessage] = useState({ type: '', text: '' });
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:3000/api/customers/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: `✅ ยินดีต้อนรับคุณ ${data.customer.first_name}` });
        
        // ส่งข้อมูลลูกค้าที่ Login ผ่านแล้ว กลับไปให้ไฟล์หลัก (main.jsx)
        if (onLoginSuccess) {
          setTimeout(() => {
             onLoginSuccess(data.customer);
          }, 1500); // ดีเลย์ 1.5 วินาทีให้ลูกค้าอ่านข้อความต้อนรับก่อน
        }
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: '❌ ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '400px', margin: '40px auto', backgroundColor: '#FFFaf0', borderRadius: '15px', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}>
      <h2 style={{ textAlign: 'center', color: '#4A3B32' }}>☕ เข้าสู่ระบบสมาชิก</h2>
      
      {message.text && (
        <div style={{ 
          padding: '10px', marginBottom: '15px', borderRadius: '5px', textAlign: 'center', fontWeight: 'bold',
          backgroundColor: message.type === 'success' ? '#D4EDDA' : '#F8D7DA',
          color: message.type === 'success' ? '#155724' : '#721C24'
        }}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <input type="email" name="email" placeholder="อีเมลของคุณ" value={formData.email} onChange={handleChange} required style={inputStyle} />
        <input type="password" name="password" placeholder="รหัสผ่าน" value={formData.password} onChange={handleChange} required style={inputStyle} />
        
        <button 
          type="submit" disabled={isLoading}
          style={{
            backgroundColor: isLoading ? '#ccc' : '#8B5A2B', color: 'white', border: 'none', padding: '12px',
            borderRadius: '8px', fontSize: '16px', fontWeight: 'bold', cursor: isLoading ? 'not-allowed' : 'pointer'
          }}
        >
          {isLoading ? '⏳ กำลังตรวจสอบ...' : '🔑 เข้าสู่ระบบ'}
        </button>
      </form>
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ccc', fontSize: '14px', boxSizing: 'border-box'
};

export default CustomerLogin;