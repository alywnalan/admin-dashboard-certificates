// register.js - handles admin registration with backend integration
const API_HOST = (window.location.port === '5500') ? 'http://localhost:5000' : '';
const API_BASE = `${API_HOST}/api`;
document.getElementById('registerForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const name = document.getElementById('name').value.trim();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value.trim();
  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: name, email, password })
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.message || 'Registration failed');
      return;
    }
    alert('Registered successfully!');
    window.location.href = '/auth.html';
  } catch (err) {
    alert('Network error');
  }
});
