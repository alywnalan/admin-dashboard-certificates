import fetch from 'node-fetch';

(async () => {
  try {
    const res = await fetch('http://localhost:5000/api/students/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test Student', email: 'student1@example.com', password: 'pass123' })
    });
    const data = await res.json();
    console.log('Status:', res.status);
    console.log('Body:', data);
  } catch (err) {
    console.error('Request error:', err.message);
  }
})();