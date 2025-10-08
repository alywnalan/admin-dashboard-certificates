// login.js - handles admin login with backend integration
const API_HOST = (window.location.port === '5500') ? 'http://localhost:5000' : '';
const API_BASE = `${API_HOST}/api`;

document.getElementById('loginForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    if (!res.ok) {
      const err = await res.json();
      alert(err.message || 'Login failed');
      return;
    }
    const data = await res.json();
    localStorage.setItem('jwtToken', data.token);
    localStorage.setItem('adminLoggedIn', 'true');
    window.location.href = 'admin-dashboard.html';
  } catch (err) {
    alert('Network error');
  }
});
