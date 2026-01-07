// reset-password.js - handles password reset with token
// Dynamic API base to support Live Server (5500) and same-origin
const API_HOST = (window.location.port === '5500') ? 'http://localhost:5000' : '';
const API_BASE = `${API_HOST}/api`;

// Get token from URL parameters
function getTokenFromURL() {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get('token');
}

// Check if token exists
const resetToken = getTokenFromURL();
if (!resetToken) {
  showMessage('Invalid or missing reset token. Please request a new password reset.', 'error');
  const form = document.getElementById('resetPasswordForm');
  if (form) form.style.display = 'none';
}

document.getElementById('resetPasswordForm').addEventListener('submit', async function(e) {
  e.preventDefault();
  
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;
  const submitBtn = document.querySelector('button[type="submit"]');
  
  // Validation
  if (newPassword.length < 6) {
    showMessage('Password must be at least 6 characters long.', 'error');
    return;
  }
  
  if (newPassword !== confirmPassword) {
    showMessage('Passwords do not match.', 'error');
    return;
  }
  
  try {
    // Disable button and show loading
    submitBtn.disabled = true;
    submitBtn.textContent = 'Resetting...';
    
    const res = await fetch(`${API_BASE}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        token: resetToken, 
        newPassword: newPassword 
      })
    });
    
    const data = await res.json();
    
    if (res.ok) {
      showMessage((data.message || 'Password reset successful.') + ' Redirecting to login...', 'success');
      const form = document.getElementById('resetPasswordForm');
      if (form) form.reset();
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        window.location.href = '/auth.html';
      }, 2000);
    } else {
      showMessage(data.message || 'Failed to reset password. Please try again.', 'error');
    }
  } catch (err) {
    showMessage('Network error. Please check your connection.', 'error');
  } finally {
    // Re-enable button
    submitBtn.disabled = false;
    submitBtn.textContent = 'Reset Password';
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
  
  // Auto-hide after 5 seconds (except for success messages)
  if (type !== 'success') {
    setTimeout(() => {
      messageDiv.style.display = 'none';
    }, 5000);
  }
}
