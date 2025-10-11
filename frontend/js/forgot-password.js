// forgot-password.js - handles password reset requests
// Dynamic API base to support Live Server (5500) and same-origin
const API_HOST = (window.location.port === '5500') ? 'http://localhost:5000' : '';
const API_BASE = `${API_HOST}/api`;

document.getElementById('forgotPasswordForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  
  const email = document.getElementById('email').value.trim();
  const messageDiv = document.getElementById('message');
  const submitBtn = document.querySelector('button[type="submit"]');
  
  if (!email) {
    showMessage('Please enter your email address.', 'error');
    return;
  }
  
  try {
    // Disable button and show loading
    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';
    
    const res = await fetch(`${API_BASE}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    
    const data = await res.json();
    
    if (res.ok) {
      showMessage(data.message || 'Password reset link sent to your email!', 'success');
      document.getElementById('forgotPasswordForm').reset();

      // For local testing: if resetToken provided by backend, auto-redirect to reset page
      if (data.resetToken) {
        setTimeout(() => {
          window.location.href = `admin-reset-password.html?token=${encodeURIComponent(data.resetToken)}`;
        }, 800);
      }
    } else {
      showMessage(data.message || 'Failed to send reset link. Please try again.', 'error');
    }
  } catch (err) {
    showMessage('Network error. Please check your connection.', 'error');
  } finally {
    // Re-enable button
    submitBtn.disabled = false;
    submitBtn.textContent = 'Send Reset Link';
  }
});

function showMessage(message, type) {
  const messageDiv = document.getElementById('message');
  messageDiv.style.display = 'block';
  messageDiv.style.padding = '12px';
  messageDiv.style.borderRadius = '6px';
  messageDiv.style.marginTop = '16px';
  
  if (type === 'success') {
    messageDiv.style.background = '#d4edda';
    messageDiv.style.color = '#155724';
    messageDiv.style.border = '1px solid #c3e6cb';
  } else {
    messageDiv.style.background = '#f8d7da';
    messageDiv.style.color = '#721c24';
    messageDiv.style.border = '1px solid #f5c6cb';
  }
  
  messageDiv.textContent = message;
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    messageDiv.style.display = 'none';
  }, 5000);
}
