// Sidebar navigation
function showSection(sectionId) {
  document.querySelectorAll('.section').forEach(sec => sec.classList.add('hidden'));
  document.getElementById(sectionId).classList.remove('hidden');
  document.querySelectorAll('.sidebar-menu li').forEach(li => li.classList.remove('active'));
  const btn = document.getElementById('btn' + sectionId.replace('Section',''));
  if (btn) btn.classList.add('active');
}
document.addEventListener('DOMContentLoaded', () => showSection('dashboardSection'));

// Logout function
async function logout() {
  try {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' });
  } catch (e) { /* ignore */ }
  localStorage.removeItem('jwtToken');
  localStorage.removeItem('adminLoggedIn');
  // clear other admin-related localStorage keys
  localStorage.removeItem('adminToken');
  window.location.href = '/auth.html';
}
window.logout = logout;

// Unified API base for both same-origin and Live Server (port 5500)
const API_HOST = (window.location.port === '5500') ? 'http://localhost:5000' : '';
const API_BASE = `${API_HOST}/api`;
window.API_BASE = API_BASE;
window.API_HOST = API_HOST;

// Debug API configuration
console.log('🔧 API Configuration:');
console.log('🔧 Window location port:', window.location.port);
console.log('🔧 API_HOST:', API_HOST);
console.log('🔧 API_BASE:', API_BASE);

async function authFetch(url, options = {}) {
  const token = localStorage.getItem('jwtToken');
  const headers = Object.assign({ 'Content-Type': 'application/json' }, options.headers || {});
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { ...options, headers });
  if (res.status === 401) {
    logout();
    return Promise.reject(new Error('Unauthorized'));
  }
  return res;
}

// Advanced Reporting Functions
function setupReportFilters() {
  const dateRange = document.getElementById('dateRange');
  const customDateRange = document.getElementById('customDateRange');
  
  if (dateRange) {
    dateRange.addEventListener('change', function() {
      if (this.value === 'custom') {
        customDateRange.style.display = 'flex';
        customDateRange.style.gap = '10px';
        customDateRange.style.alignItems = 'center';
      } else {
        customDateRange.style.display = 'none';
        generateReport();
      }
    });
  }
}

async function generateReport() {
  try {
    const dateRange = document.getElementById('dateRange')?.value;
    const startDate = document.getElementById('startDate')?.value;
    const endDate = document.getElementById('endDate')?.value;
    const institute = document.getElementById('instituteFilter')?.value;

    let queryParams = new URLSearchParams();
    
    if (dateRange === 'custom' && startDate && endDate) {
      queryParams.append('startDate', startDate);
      queryParams.append('endDate', endDate);
    } else if (dateRange && dateRange !== 'custom') {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - parseInt(dateRange));
      queryParams.append('startDate', start.toISOString().split('T')[0]);
      queryParams.append('endDate', end.toISOString().split('T')[0]);
    }
    
    if (institute) {
      queryParams.append('institute', institute);
    }

    // Fetch analytics data
    const analyticsRes = await authFetch(`${API_BASE}/stats/analytics?${queryParams}`);
    const analytics = await analyticsRes.json();
    
    // Fetch institute performance
    const performanceRes = await authFetch(`${API_BASE}/stats/institutes/performance?${queryParams}`);
    const performance = await performanceRes.json();
    
    // Fetch geographic data
    const geoRes = await authFetch(`${API_BASE}/stats/geographic`);
    const geoData = await geoRes.json();
    
    // Fetch AI insights
    const insightsRes = await authFetch(`${API_BASE}/stats/insights`);
    const insights = await insightsRes.json();

    // Update metrics
    updateMetrics(analytics);
    
    // Update charts
    updateCharts(analytics, performance, geoData);
    
    // Update tables
    updateTables(analytics, performance);
    
    // Update AI insights
    updateInsights(insights);

  } catch (error) {
    console.error('Error generating report:', error);
  }
}

function updateMetrics(analytics) {
  const totalCertificates = document.getElementById('totalCertificates');
  const totalInstitutes = document.getElementById('totalInstitutes');
  const totalStudents = document.getElementById('totalStudents');
  const growthRate = document.getElementById('growthRate');
  
  if (totalCertificates) {
    totalCertificates.textContent = analytics.currentPeriod?.totalCertificates || 0;
    const certChange = document.getElementById('certChange');
    if (certChange) {
      const change = analytics.currentPeriod?.growthRate || 0;
      certChange.textContent = `${change >= 0 ? '+' : ''}${change}%`;
      certChange.className = `metric-change ${change >= 0 ? 'positive' : 'negative'}`;
    }
  }
  
  if (totalInstitutes) {
    totalInstitutes.textContent = analytics.topInstitutes?.length || 0;
  }
  
  if (totalStudents) {
    // Calculate unique students from analytics
    const uniqueStudents = new Set();
    analytics.topInstitutes?.forEach(inst => {
      inst.courses?.forEach(course => uniqueStudents.add(course));
    });
    totalStudents.textContent = uniqueStudents.size;
  }
  
  if (growthRate) {
    const growth = analytics.currentPeriod?.growthRate || 0;
    growthRate.textContent = `${growth}%`;
    const growthChange = document.getElementById('growthChange');
    if (growthChange) {
      growthChange.textContent = `${growth >= 0 ? '+' : ''}${growth}%`;
      growthChange.className = `metric-change ${growth >= 0 ? 'positive' : 'negative'}`;
    }
  }
}

function updateCharts(analytics, performance, geoData) {
  // Certificate Trends Chart
  updateCertificateChart(analytics);
  
  // Institute Performance Chart
  updateInstituteChart(performance);
  
  // Course Distribution Chart
  updateCourseChart(analytics);
  
  // Geographic Distribution Chart
  updateGeoChart(geoData);
}

function updateCertificateChart(analytics) {
  const ctx = document.getElementById('certChart');
  if (!ctx || !window.Chart) return;

  const labels = [];
  const dataPoints = [];
  
  if (analytics.dailyTrends) {
    analytics.dailyTrends.forEach(item => {
      const date = `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`;
      labels.push(date);
      dataPoints.push(item.count);
    });
  }

  if (window.certChart) {
    window.certChart.destroy();
  }

  window.certChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: 'Daily Certificates',
        data: dataPoints,
        borderColor: '#667eea',
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.1)' } },
        x: { grid: { color: 'rgba(0,0,0,0.1)' } }
      }
    }
  });
}

function updateInstituteChart(performance) {
  const ctx = document.getElementById('instituteChart');
  if (!ctx || !window.Chart) return;

  const labels = [];
  const dataPoints = [];
  
  if (performance.institutePerformance) {
    performance.institutePerformance.slice(0, 8).forEach(inst => {
      labels.push(inst._id);
      dataPoints.push(inst.totalCertificates);
    });
  }

  if (window.instituteChart) {
    window.instituteChart.destroy();
  }

  window.instituteChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Certificates Issued',
        data: dataPoints,
        backgroundColor: 'rgba(102, 126, 234, 0.8)',
        borderColor: '#667eea',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.1)' } },
        x: { grid: { display: false } }
      }
    }
  });
}

function updateCourseChart(analytics) {
  const ctx = document.getElementById('courseChart');
  if (!ctx || !window.Chart) return;

  const labels = [];
  const dataPoints = [];
  
  if (analytics.courseDistribution) {
    analytics.courseDistribution.slice(0, 6).forEach(course => {
      labels.push(course._id);
      dataPoints.push(course.count);
    });
  }

  if (window.courseChart) {
    window.courseChart.destroy();
  }

  window.courseChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{
        data: dataPoints,
        backgroundColor: [
          '#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe'
        ],
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'bottom' }
      }
    }
  });
}

function updateGeoChart(geoData) {
  const ctx = document.getElementById('geoChart');
  if (!ctx || !window.Chart) return;

  const labels = [];
  const dataPoints = [];
  
  if (geoData.geoData) {
    geoData.geoData.slice(0, 8).forEach(location => {
      labels.push(location._id);
      dataPoints.push(location.totalCertificates);
    });
  }

  if (window.geoChart) {
    window.geoChart.destroy();
  }

  window.geoChart = new Chart(ctx, {
    type: 'polarArea',
    data: {
      labels,
      datasets: [{
        data: dataPoints,
        backgroundColor: [
          'rgba(102, 126, 234, 0.7)',
          'rgba(118, 75, 162, 0.7)',
          'rgba(240, 147, 251, 0.7)',
          'rgba(245, 87, 108, 0.7)',
          'rgba(79, 172, 254, 0.7)',
          'rgba(0, 242, 254, 0.7)'
        ],
        borderWidth: 2,
        borderColor: '#fff'
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: 'right' }
      }
    }
  });
}

function updateTables(analytics, performance) {
  // Recent Activity Table
  updateRecentActivityTable(analytics);
  
  // Top Institutes Table
  updateTopInstitutesTable(performance);
}

function updateRecentActivityTable(analytics) {
  const tbody = document.querySelector('#recentActivityTable tbody');
  if (!tbody) return;

  tbody.innerHTML = '';
  
  // For demo purposes, create sample recent activity
  const recentActivity = analytics.recentActivity || [
    { date: '2024-01-15', student: 'John Doe', course: 'Web Development', institute: 'Tech Academy', status: 'Issued' },
    { date: '2024-01-14', student: 'Jane Smith', course: 'Data Science', institute: 'Data Institute', status: 'Issued' },
    { date: '2024-01-13', student: 'Mike Johnson', course: 'AI & ML', institute: 'AI University', status: 'Pending' }
  ];

  recentActivity.forEach(activity => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${activity.date}</td>
      <td>${activity.student}</td>
      <td>${activity.course}</td>
      <td>${activity.institute}</td>
      <td><span class="status-${activity.status.toLowerCase()}">${activity.status}</span></td>
      <td>
        <button onclick="viewCertificate('${activity.student}')" class="btn-small">View</button>
        <button onclick="downloadCertificate('${activity.student}')" class="btn-small">Download</button>
      </td>
    `;
    tbody.appendChild(row);
  });
}

// Recent enrollments helper
function appendRecentEnrollment(payload) {
  const container = document.getElementById('recentEnrollments');
  if (!container) return;
  const entry = document.createElement('div');
  entry.style.padding = '8px';
  entry.style.borderBottom = '1px solid #f1f5f9';
  entry.innerHTML = `
    <strong>${payload.studentName || payload.studentEmail}</strong>
    <div style="font-size:13px;color:#475569">${payload.course?.name || payload.course?.name || payload.course?.id || ''} &middot; ${new Date(payload.timestamp || Date.now()).toLocaleString()}</div>
  `;
  if (container.innerText === 'No recent enrollments.') container.innerHTML = '';
  container.prepend(entry);
}

async function refreshEnrollmentList() {
  try {
    // Admin endpoint to fetch recent enrollments
    const res = await authFetch(`${API_BASE}/courses?limit=6`);
    const data = await res.json();
    const container = document.getElementById('recentEnrollments');
    if (!container) return;
    if (!data.courses || data.courses.length === 0) { container.innerHTML = 'No recent enrollments.'; return; }
    container.innerHTML = data.courses.slice(0,6).map(c => `
      <div style="padding:8px;border-bottom:1px solid #f1f5f9;">
        <strong>${c.courseName}</strong>
        <div style="font-size:13px;color:#475569">${c.studentEmail || c.studentEmail || ''} &middot; ${c.status || 'pending'}</div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Failed to refresh enrollment list:', err);
  }
}

function updateTopInstitutesTable(performance) {
  const tbody = document.querySelector('#topInstitutesTable tbody');
  if (!tbody) return;

  tbody.innerHTML = '';
  
  if (performance.institutePerformance) {
    performance.institutePerformance.slice(0, 10).forEach((inst, index) => {
      const row = document.createElement('tr');
      const successRate = Math.min(100, Math.round((inst.totalCertificates / Math.max(inst.totalCertificates, 1)) * 100));
      const performanceScore = Math.round(inst.performanceScore || 0);
      
      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${inst._id}</td>
        <td>${inst.totalCertificates}</td>
        <td>${successRate}%</td>
        <td>${performanceScore}</td>
      `;
      tbody.appendChild(row);
    });
  }
}

function updateInsights(insights) {
  const insightsContainer = document.getElementById('aiInsights');
  if (!insightsContainer) return;

  const insightCards = insightsContainer.querySelectorAll('.insight-card');
  
  if (insightCards.length >= 3) {
    // Update trend analysis
    const trendCard = insightCards[0];
    const trendText = trendCard.querySelector('p');
    if (trendText) {
      trendText.textContent = `Certificate generation shows a ${insights.trends?.monthOverMonthGrowth || 0}% change this month compared to last month.`;
    }
    
    // Update recommendations
    const recCard = insightCards[1];
    const recText = recCard.querySelector('p');
    if (recText) {
      const suggestedCourses = insights.recommendations?.suggestedExpansion?.join(', ') || 'technology and healthcare';
      recText.textContent = `Consider expanding course offerings in ${suggestedCourses} sectors.`;
    }
    
    // Update alerts
    const alertCard = insightCards[2];
    const alertText = alertCard.querySelector('p');
    if (alertText) {
      alertText.textContent = `${insights.alerts?.lowPerformingInstitutes || 0} institutes have low certificate generation rates this quarter.`;
    }
  }
}

// Export functions
function exportReport() {
  // Implementation for PDF export
  alert('PDF export functionality will be implemented here');
}

function exportExcel() {
  // Implementation for Excel export
  alert('Excel export functionality will be implemented here');
}

// Utility functions
function viewCertificate(studentName) {
  alert(`Viewing certificate for ${studentName}`);
}

function downloadCertificate(studentName) {
  alert(`Downloading certificate for ${studentName}`);
}

async function clearCertificatesStore() {
  if (!confirm('This will delete all certificates from the database. Continue?')) return;
  try {
    const res = await authFetch(`${API_BASE}/certificates/clear`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok && data.success) {
      alert(`Cleared ${data.deletedCount || 0} certificates.`);
      loadIssuedCertificates(1);
    } else {
      alert(data.message || 'Failed to clear');
    }
  } catch (e) {
    alert('Failed to clear certificates');
  }
}

window.clearCertificatesStore = clearCertificatesStore;

async function loadRecentCertificates() {
  try {
    const res = await authFetch(`${API_BASE}/certificates/database?limit=5&sortBy=createdAt&sortOrder=desc`);
    const data = await res.json();
    const list = document.getElementById('recentGeneratedList');
    if (!list) return;
    
    list.innerHTML = '';
    (data.certificates || []).forEach(cert => {
      const item = document.createElement('div');
      item.style.cssText = 'padding:12px;border:1px solid #ddd;border-radius:8px;background:white;margin-bottom:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);';
      
      const createdDate = new Date(cert.createdAt).toLocaleString();
      const blockchainStatus = cert.blockchain?.txId ? 'Anchored' : 'Pending';
      const statusColor = cert.blockchain?.txId ? '#28a745' : '#ffc107';
      
      item.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
          <div style="flex:1;">
            <div style="font-weight:bold;color:#333;font-size:14px;margin-bottom:4px;">${cert.student}</div>
            <div style="color:#667eea;font-size:13px;font-weight:600;">${cert.course}</div>
          </div>
          <div style="text-align:right;color:#666;font-size:11px;">
            ${createdDate}
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;color:#666;margin-bottom:8px;">
          <div><strong>Institute:</strong> ${cert.institute}</div>
          <div><strong>ID:</strong> ${cert.uuid}</div>
        </div>
        ${cert.metadata?.department ? `<div style="font-size:12px;color:#666;margin-bottom:4px;"><strong>Department:</strong> ${cert.metadata.department}</div>` : ''}
        ${cert.metadata?.branch ? `<div style="font-size:12px;color:#666;margin-bottom:4px;"><strong>Branch:</strong> ${cert.metadata.branch}</div>` : ''}
        <div style="margin-top:8px;padding:6px 8px;background:#f8f9fa;border-radius:4px;font-size:11px;color:#555;display:flex;justify-content:space-between;align-items:center;">
          <span><strong>Status:</strong> Generated successfully</span>
          <span style="color:${statusColor};font-weight:bold;">🔗 ${blockchainStatus}</span>
        </div>
      `;
      list.appendChild(item);
    });
  } catch (e) {
    console.error('Failed to load recent certificates', e);
  }
}

window.loadRecentCertificates = loadRecentCertificates;

function appendRecentGenerated(data) {
  const list = document.getElementById('recentGeneratedList');
  if (!list) return;
  const item = document.createElement('div');
  item.style.cssText = 'padding:12px;border:1px solid #ddd;border-radius:8px;background:white;margin-bottom:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);';
  
  // Format timestamp
  const timestamp = new Date().toLocaleString();
  
  item.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
      <div style="flex:1;">
        <div style="font-weight:bold;color:#333;font-size:14px;margin-bottom:4px;">${data.student}</div>
        <div style="color:#667eea;font-size:13px;font-weight:600;">${data.course}</div>
      </div>
      <div style="text-align:right;color:#666;font-size:11px;">
        ${timestamp}
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px;color:#666;">
      <div><strong>Institute:</strong> ${data.institute}</div>
      <div><strong>ID:</strong> ${data.uuid}</div>
    </div>
    <div style="margin-top:8px;padding:6px 8px;background:#f8f9fa;border-radius:4px;font-size:11px;color:#555;">
      <strong>Status:</strong> Generated successfully
    </div>
  `;
  list.prepend(item);
  while (list.children.length > 5) list.removeChild(list.lastChild);
}

function updateBlockchainStatus(data) {
  const list = document.getElementById('blockchainStatusList');
  if (!list) return;
  
  const existingItem = document.querySelector(`[data-uuid="${data.uuid}"]`);
  if (existingItem) {
    existingItem.remove();
  }
  
  const item = document.createElement('div');
  item.setAttribute('data-uuid', data.uuid);
  
  let statusColor = '#666';
  let statusIcon = '⏳';
  if (data.status === 'success') {
    statusColor = '#28a745';
    statusIcon = '✅';
  } else if (data.status === 'error') {
    statusColor = '#dc3545';
    statusIcon = '❌';
  } else if (data.status === 'processing') {
    statusColor = '#ffc107';
    statusIcon = '🔄';
  }
  
  item.style.cssText = 'padding:8px 12px;border:1px solid #ddd;border-radius:6px;background:white;display:flex;justify-content:space-between;align-items:center;';
  item.innerHTML = `
    <div>
      <span style="font-weight:bold;">${data.student}</span>
      <span style="color:#666;margin-left:8px;">${data.message}</span>
    </div>
    <div style="display:flex;align-items:center;gap:8px;">
      <span style="color:${statusColor};">${statusIcon}</span>
      <span style="color:#666;font-size:12px;">${new Date().toLocaleTimeString()}</span>
    </div>
  `;
  
  list.prepend(item);
  while (list.children.length > 5) list.removeChild(list.lastChild);
}

// Load dashboard stats and chart
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Setup report filters
    setupReportFilters();
    
    // Load initial dashboard data
    const countsRes = await authFetch(`${API_BASE}/stats/counts`);
    const counts = await countsRes.json();
    
    // Update basic stats
    const certCountEl = document.getElementById('certCount');
    const instCountEl = document.getElementById('instCount');
    if (certCountEl) certCountEl.textContent = counts.totalCertificates || 0;
    if (instCountEl) instCountEl.textContent = counts.totalInstitutes || 0;

    // Generate initial report
    await generateReport();

    // Initialize issued list if section is visible
    const issuedSection = document.getElementById('issuedCertificatesSection');
    if (issuedSection && !issuedSection.classList.contains('hidden')) {
      loadIssuedCertificates(1);
    }

    // Real-time refresh for issued certificates when new ones are created
    if (window.io) {
      const socket = window.io(window.API_HOST || undefined);
      socket.on('certificate:created', (data) => {
        const section = document.getElementById('issuedCertificatesSection');
        if (section && !section.classList.contains('hidden')) {
          loadIssuedCertificates(1);
        }
        appendRecentGenerated(data);
      });
      socket.on('certificates:cleared', () => {
        const recent = document.getElementById('recentGeneratedList');
        if (recent) recent.innerHTML = '';
        const blockchain = document.getElementById('blockchainStatusList');
        if (blockchain) blockchain.innerHTML = '';
      });
      socket.on('blockchain:anchoring', (data) => {
        updateBlockchainStatus(data);
      });
      socket.on('blockchain:anchored', (data) => {
        updateBlockchainStatus(data);
      });
    }

  } catch (e) {
    console.error('Dashboard loading error:', e);
  }
});

// Institution Management
let institutes = JSON.parse(localStorage.getItem('institutes') || '[]');
function renderInstitutesTable() {
  const tbody = document.querySelector('#institutesTable tbody');
  const search = document.getElementById('searchInstitute').value.toLowerCase();
  tbody.innerHTML = '';
  institutes
    .filter(inst => inst.name.toLowerCase().includes(search))
    .forEach((inst, idx) => {
      tbody.innerHTML += `
        <tr>
          <td>${inst.name}</td>
          <td>${inst.contact}</td>
          <td>${inst.email}</td>
          <td>${inst.location}</td>
          <td>
            <button onclick="editInstitute(${idx})">Edit</button>
            <button onclick="deleteInstitute(${idx})">Delete</button>
          </td>
        </tr>
      `;
    });
}
window.renderInstitutesTable = renderInstitutesTable;
document.getElementById('addInstituteForm').onsubmit = function(e) {
  e.preventDefault();
  const name = document.getElementById('instName').value.trim();
  const contact = document.getElementById('instContact').value.trim();
  const email = document.getElementById('instEmail').value.trim();
  const location = document.getElementById('instLocation').value.trim();
  const password = document.getElementById('instPassword').value.trim();
  institutes.push({ name, contact, email, location, password });
  localStorage.setItem('institutes', JSON.stringify(institutes));
  renderInstitutesTable();
  this.reset();
  populateGenerateCertificateDropdowns();
};
window.editInstitute = function(idx) {
  const inst = institutes[idx];
  document.getElementById('instName').value = inst.name;
  document.getElementById('instContact').value = inst.contact;
  document.getElementById('instEmail').value = inst.email;
  document.getElementById('instLocation').value = inst.location;
  document.getElementById('instPassword').value = inst.password;
  institutes.splice(idx, 1);
  renderInstitutesTable();
  populateGenerateCertificateDropdowns();
};
window.deleteInstitute = function(idx) {
  if (confirm('Delete this institute?')) {
    institutes.splice(idx, 1);
    localStorage.setItem('institutes', JSON.stringify(institutes));
    renderInstitutesTable();
    populateGenerateCertificateDropdowns();
  }
};
document.getElementById('searchInstitute').oninput = renderInstitutesTable;
document.addEventListener('DOMContentLoaded', renderInstitutesTable);

// Student Management
let students = JSON.parse(localStorage.getItem('students') || '[]');
let currentSubjects = [];

function addSubject() {
  const input = document.getElementById('newSubject');
  const subject = input.value.trim();
  if (subject && !currentSubjects.includes(subject)) {
    currentSubjects.push(subject);
    renderSubjectsList();
    input.value = '';
  }
}

function removeSubject(subject) {
  currentSubjects = currentSubjects.filter(s => s !== subject);
  renderSubjectsList();
}

function renderSubjectsList() {
  const container = document.getElementById('subjectsList');
  container.innerHTML = currentSubjects.map(subject => `
    <div style="display:flex;justify-content:space-between;align-items:center;padding:4px 8px;background:#f0f0f0;border-radius:4px;">
      <span>${subject}</span>
      <button type="button" onclick="removeSubject('${subject}')" style="background:red;color:white;border:none;border-radius:3px;padding:2px 6px;">×</button>
    </div>
  `).join('');
}

function renderStudentsTable() {
  const tbody = document.querySelector('#studentsTable tbody');
  const search = document.getElementById('searchStudent').value.toLowerCase();
  tbody.innerHTML = '';
  students
    .filter(stu =>
      stu.name.toLowerCase().includes(search) ||
      stu.email.toLowerCase().includes(search) ||
      (stu.subjects && stu.subjects.some(s => s.toLowerCase().includes(search))) ||
      stu.institute.toLowerCase().includes(search) ||
      stu.department.toLowerCase().includes(search) ||
      stu.branch.toLowerCase().includes(search)
    )
    .forEach((stu, idx) => {
      tbody.innerHTML += `
        <tr>
          <td>${stu.name}</td>
          <td>${stu.email}</td>
          <td>${stu.department || 'N/A'}</td>
          <td>${stu.branch || 'N/A'}</td>
          <td>${stu.year || 'N/A'}</td>
          <td>${(stu.subjects || []).join(', ')}</td>
          <td>${stu.institute}</td>
          <td>
            <button onclick="editStudent(${idx})">Edit</button>
            <button onclick="deleteStudent(${idx})">Delete</button>
          </td>
        </tr>
      `;
    });
}
window.renderStudentsTable = renderStudentsTable;
document.getElementById('addStudentForm').onsubmit = function(e) {
  e.preventDefault();
  const name = document.getElementById('studentFullName').value.trim();
  const email = document.getElementById('studentEmail').value.trim();
  const phone = document.getElementById('studentPhone').value.trim();
  const institute = document.getElementById('studentInstitute').value.trim();
  const department = document.getElementById('studentDepartment').value.trim();
  const branch = document.getElementById('studentBranch').value.trim();
  const year = document.getElementById('studentYear').value.trim();
  const semester = document.getElementById('studentSemester').value.trim();
  
  students.push({ 
    name, 
    email, 
    phone,
    institute, 
    department,
    branch,
    year,
    semester,
    subjects: [...currentSubjects]
  });
  localStorage.setItem('students', JSON.stringify(students));
  renderStudentsTable();
  this.reset();
  currentSubjects = [];
  renderSubjectsList();
  populateGenerateCertificateDropdowns();
};
window.editStudent = function(idx) {
  const stu = students[idx];
  document.getElementById('studentFullName').value = stu.name;
  document.getElementById('studentEmail').value = stu.email;
  document.getElementById('studentPhone').value = stu.phone || '';
  document.getElementById('studentInstitute').value = stu.institute;
  document.getElementById('studentDepartment').value = stu.department || '';
  document.getElementById('studentBranch').value = stu.branch || '';
  document.getElementById('studentYear').value = stu.year || '';
  document.getElementById('studentSemester').value = stu.semester || '';
  currentSubjects = [...(stu.subjects || [])];
  renderSubjectsList();
  students.splice(idx, 1);
  renderStudentsTable();
  populateGenerateCertificateDropdowns();
};
window.deleteStudent = function(idx) {
  if (confirm('Delete this student?')) {
    students.splice(idx, 1);
    localStorage.setItem('students', JSON.stringify(students));
    renderStudentsTable();
    populateGenerateCertificateDropdowns();
  }
};
document.getElementById('searchStudent').oninput = renderStudentsTable;
document.addEventListener('DOMContentLoaded', renderStudentsTable);

// Populate dropdowns in Generate Certificate
function populateGenerateCertificateDropdowns() {
  // Students
  const studentSelect = document.getElementById('studentNameSelect');
  studentSelect.innerHTML = '<option value="">Select Student</option>';
  students.forEach(stu => {
    studentSelect.innerHTML += `<option value="${stu.name}">${stu.name} (${stu.email})</option>`;
  });
  // Institutes
  const instituteSelect = document.getElementById('instituteSelect');
  instituteSelect.innerHTML = '<option value="">Select Institute</option>';
  institutes.forEach(inst => {
    instituteSelect.innerHTML += `<option value="${inst.name}">${inst.name}</option>`;
  });
}
document.getElementById('btnGenerate').addEventListener('click', populateGenerateCertificateDropdowns);
document.addEventListener('DOMContentLoaded', populateGenerateCertificateDropdowns);

// Auto-fill student/institute details in Generate Certificate
document.getElementById('studentNameSelect').addEventListener('change', function() {
  const selectedName = this.value;
  const stu = students.find(s => s.name === selectedName);
  document.getElementById('studentEmailDisplay').value = stu ? stu.email : '';
  document.getElementById('studentCourseDisplay').value = stu ? stu.course : '';
});
document.getElementById('instituteSelect').addEventListener('change', function() {
  const selectedName = this.value;
  const inst = institutes.find(i => i.name === selectedName);
  document.getElementById('instituteEmailDisplay').value = inst ? inst.email : '';
  document.getElementById('instituteLocationDisplay').value = inst ? inst.location : '';
});

// Certificate Generation
document.getElementById('generateCertForm').onsubmit = async function(e) {
  e.preventDefault();

  // Get selected student and institute
  const studentName = document.getElementById('studentNameSelect').value;
  const students = JSON.parse(localStorage.getItem('students') || '[]');
  const stu = students.find(s => s.name === studentName);

  const instituteName = document.getElementById('instituteSelect').value;
  const institutes = JSON.parse(localStorage.getItem('institutes') || '[]');
  const inst = institutes.find(i => i.name === instituteName);

  const date = document.getElementById('issueDate').value;
  const bgColor = document.getElementById('bgColor').value;
  const uuid = ([1e7]+-1e3+-4e3+-8e3+-1e11)
    .replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );

  // Logo/signature uploads
  const logoFile = document.getElementById('logoUpload').files[0];
  const sign1File = document.getElementById('signUpload1').files[0];
  const sign2File = document.getElementById('signUpload2').files[0];

  // Convert images to base64
  const toBase64 = file => new Promise((resolve, reject) => {
    if (!file) return resolve('');
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const logo = await toBase64(logoFile);
  const sign1 = await toBase64(sign1File);
  const sign2 = await toBase64(sign2File);

  // Modern Certificate preview HTML
  const certHTML = `
    <div id="certTheme" style="width:1000px;height:700px;background:linear-gradient(135deg, #667eea 0%, #764ba2 100%);position:relative;overflow:hidden;padding:0;margin:auto;font-family:'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
      <!-- Decorative border -->
      <div style="position:absolute;top:20px;left:20px;right:20px;bottom:20px;border:3px solid #fff;border-radius:15px;background:rgba(255,255,255,0.95);backdrop-filter:blur(10px);"></div>
      
      <!-- UUID Top Left -->
      <div style="position:absolute;top:40px;left:40px;z-index:10;text-align:left;">
        <div style="font-size:0.9em;font-weight:600;color:#667eea;">Certificate ID</div>
        <div style="font-size:1.1em;font-family:monospace;color:#23234a;">${uuid}</div>
      </div>
      
      <!-- QR Code Top Right -->
      <div id="qrCode" style="position:absolute;top:40px;right:40px;z-index:10;background:white;padding:10px;border-radius:10px;box-shadow:0 4px 8px rgba(0,0,0,0.1);"></div>
      
      <!-- Header with logo -->
      <div style="position:absolute;top:40px;left:160px;right:160px;display:flex;justify-content:center;align-items:center;">
        ${logo ? `<img src="${logo}" alt="Logo" style="height:80px;border-radius:10px;">` : ''}
      </div>
      
      <!-- Main content -->
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);text-align:center;width:80%;">
        <div style="font-size:3.5em;color:#667eea;font-weight:800;letter-spacing:3px;margin-bottom:20px;text-shadow:2px 2px 4px rgba(0,0,0,0.1);">CERTIFICATE</div>
        <div style="font-size:1.8em;color:#333;font-weight:600;margin-bottom:30px;">OF COMPLETION</div>
        
        <div style="font-size:1.4em;color:#555;margin-bottom:25px;line-height:1.6;">This is to certify that</div>
        
        <div style="font-size:2.8em;color:#667eea;font-weight:700;margin-bottom:20px;text-shadow:1px 1px 2px rgba(0,0,0,0.1);">${stu ? stu.name : ''}</div>
        
        <div style="font-size:1.3em;color:#555;margin-bottom:15px;">has successfully completed the program</div>
        <div style="font-size:1.6em;color:#333;font-weight:600;margin-bottom:20px;padding:10px 20px;background:linear-gradient(45deg, #667eea, #764ba2);color:white;border-radius:25px;display:inline-block;">${stu ? stu.course : ''}</div>
        
        <!-- Student Details Section -->
        <div style="background:rgba(102, 126, 234, 0.1);border-radius:15px;padding:20px;margin:20px 0;border:2px solid rgba(102, 126, 234, 0.2);">
          ${stu && stu.department ? `<div style="font-size:1.1em;color:#555;margin-bottom:8px;"><strong style="color:#667eea;">Department:</strong> ${stu.department}</div>` : ''}
          ${stu && stu.branch ? `<div style="font-size:1.1em;color:#555;margin-bottom:8px;"><strong style="color:#667eea;">Branch:</strong> ${stu.branch}</div>` : ''}
          ${stu && stu.year ? `<div style="font-size:1.1em;color:#555;margin-bottom:8px;"><strong style="color:#667eea;">Academic Year:</strong> ${stu.year}</div>` : ''}
          ${stu && stu.semester ? `<div style="font-size:1.1em;color:#555;margin-bottom:8px;"><strong style="color:#667eea;">Semester:</strong> ${stu.semester}</div>` : ''}
        </div>
        
        <div style="font-size:1.2em;color:#555;margin-bottom:10px;">Issued by: <strong style="color:#667eea;">${inst ? inst.name : ''}</strong></div>
        <div style="font-size:1.1em;color:#555;margin-bottom:10px;">Date of Issue: <strong style="color:#667eea;">${date}</strong></div>
      </div>
      
      <!-- Signatures -->
      <div style="position:absolute;bottom:60px;left:60px;text-align:center;">
        ${sign1 ? `<img src="${sign1}" alt="Signature 1" style="height:60px;margin-bottom:5px;"><br>` : ''}
        <div style="width:150px;height:2px;background:#667eea;margin:5px auto;"></div>
        <div style="font-size:0.9em;color:#555;font-weight:600;">Authorized Signature</div>
      </div>
      
      <div style="position:absolute;bottom:60px;right:60px;text-align:center;">
        ${sign2 ? `<img src="${sign2}" alt="Signature 2" style="height:60px;margin-bottom:5px;"><br>` : ''}
        <div style="width:150px;height:2px;background:#667eea;margin:5px auto;"></div>
        <div style="font-size:0.9em;color:#555;font-weight:600;">Director Signature</div>
      </div>
      
      <!-- Decorative elements -->
      <div style="position:absolute;top:30%;left:20px;width:40px;height:40px;border:3px solid #667eea;border-radius:50%;opacity:0.3;"></div>
      <div style="position:absolute;top:60%;right:20px;width:30px;height:30px;border:3px solid #764ba2;border-radius:50%;opacity:0.3;"></div>
      <div style="position:absolute;bottom:30%;left:30px;width:25px;height:25px;border:3px solid #667eea;border-radius:50%;opacity:0.3;"></div>
    </div>
  `;

  // Show preview
  const preview = document.getElementById('certificatePreview');
  preview.innerHTML = certHTML;
  preview.classList.remove('hidden');

  // Generate QR code (UUID only)
  setTimeout(() => {
    const qrDiv = document.getElementById('qrCode');
    qrDiv.innerHTML = '';
    if (window.QRCode) {
      new QRCode(qrDiv, {
        text: uuid,
        width: 80,
        height: 80,
        colorDark: "#23234a",
        colorLight: "#fff",
        correctLevel: QRCode.CorrectLevel.H
      });
    }
  }, 100);

  // Show download button
  document.getElementById('downloadCertBtn').style.display = 'inline-block';
  document.getElementById('downloadCertBtn').onclick = function() {
    if (window.html2canvas && window.jspdf) {
      html2canvas(document.getElementById('certTheme')).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new window.jspdf.jsPDF({orientation:'landscape',unit:'px',format:[900,600]});
        pdf.addImage(imgData, 'PNG', 0, 0, 900, 600);
        pdf.save(`certificate_${uuid}.pdf`);
      });
    } else {
      alert('PDF libraries not loaded!');
    }
  };

  // Save certificate to localStorage for validation
  let certificates = JSON.parse(localStorage.getItem('certificates') || '[]');
  certificates.push({
    uuid,
    student: stu ? stu.name : '',
    course: stu ? stu.course : '',
    institute: inst ? inst.name : '',
    date,
    issued: true
  });
  localStorage.setItem('certificates', JSON.stringify(certificates));

  // Save certificate to backend
  const certData = {
    uuid,
    student: stu ? stu.name : '',
    course: stu ? stu.course : '',
    institute: inst ? inst.name : '',
    date,
    issued: true,
    generatedByAdmin: true
  };
  
  console.log('📝 Saving certificate to backend:', certData);
  console.log('📝 Using API_BASE:', API_BASE);
  
  try {
    const response = await fetch(`${API_BASE}/certificates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(certData)
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log('✅ Certificate saved successfully:', result);
    } else {
      console.error('❌ Failed to save certificate:', response.status, response.statusText);
      const errorData = await response.json();
      console.error('❌ Error details:', errorData);
    }
  } catch (error) {
    console.error('❌ Error saving certificate:', error);
  }
};

async function validateCertificate() {
  const uuid = document.getElementById('validateUUID').value.trim();
  const resultDiv = document.getElementById('validateResult');
  if (!uuid) {
    resultDiv.innerHTML = '<span style="color:red;">Please enter a Certificate UUID.</span>';
    return;
  }
  resultDiv.innerHTML = 'Validating...';

  try {
    console.log('🔍 Validating certificate with UUID:', uuid);
    console.log('🔍 Using API_BASE:', API_BASE);
    console.log('🔍 Full validation URL:', `${API_BASE}/certificates/validate/${uuid}`);
    
    const res = await fetch(`${API_BASE}/certificates/validate/${uuid}`);
    console.log('🔍 Validation response status:', res.status);
    
    const data = await res.json();
    console.log('🔍 Validation response data:', data);
    if (data.valid) {
      resultDiv.innerHTML = `
        <div style="padding:16px;border-radius:12px;background:#e6ffe6;color:#23234a;">
          <b>✅ Certificate Valid!</b><br>
          <strong>Student:</strong> ${data.certificate?.student}<br>
          <strong>Course:</strong> ${data.certificate?.course}<br>
          <strong>Institute:</strong> ${data.certificate?.institute}<br>
          <strong>Date:</strong> ${data.certificate?.date}<br>
          <strong>UUID:</strong> ${data.certificate?.uuid}<br>
          <strong>Generated by Admin:</strong> ${data.certificate?.generatedByAdmin ? 'Yes' : 'No'}<br>
          <span style="color:green;">Status: Verified</span>
        </div>
      `;
    } else {
      resultDiv.innerHTML = `
        <div style="padding:16px;border-radius:12px;background:#ffe6e6;color:#23234a;">
          <b>❌ Certificate Invalid!</b><br>
          <span style="color:red;">${data.message || 'No certificate found for this UUID.'}</span><br>
          <strong>Error:</strong> ${data.error || 'Unknown error'}
        </div>
      `;
    }
  } catch (err) {
    console.error('Validation error:', err);
    resultDiv.innerHTML = `
      <div style="padding:16px;border-radius:12px;background:#ffe6e6;color:#23234a;">
        <b>Server Error!</b><br>
        <span style="color:red;">Could not validate certificate: ${err.message}</span>
      </div>
    `;
  }
}

// Add missing validation method functions
function switchValidationMethod(method) {
  // Hide all validation panels
  document.querySelectorAll('.validation-panel').forEach(panel => {
    panel.classList.remove('active');
  });
  
  // Remove active class from all tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Show selected panel and activate button
  const panel = document.getElementById(method + 'Validation');
  const button = document.querySelector(`[onclick="switchValidationMethod('${method}')"]`);
  
  if (panel) panel.classList.add('active');
  if (button) button.classList.add('active');
}

function startQRScan() {
  const resultDiv = document.getElementById('validateResult');
  resultDiv.innerHTML = `
    <div style="padding:16px;border-radius:12px;background:#fff3cd;color:#856404;">
      <b>📱 QR Scanner</b><br>
      <span>QR scanning functionality will be implemented here.</span>
    </div>
  `;
}

function bulkValidate() {
  const resultDiv = document.getElementById('validateResult');
  resultDiv.innerHTML = `
    <div style="padding:16px;border-radius:12px;background:#d1ecf1;color:#0c5460;">
      <b>📋 Bulk Validation</b><br>
      <span>Bulk validation functionality will be implemented here.</span>
    </div>
  `;
}

function validateHistory() {
  const resultDiv = document.getElementById('validateResult');
  resultDiv.innerHTML = `
    <div style="padding:16px;border-radius:12px;background:#d1ecf1;color:#0c5460;">
      <b>📜 Validation History</b><br>
      <span>Validation history functionality will be implemented here.</span>
    </div>
  `;
}

// ================= Issued Certificates (List with filters, pagination) =================
async function loadIssuedCertificates(page = 1) {
  try {
    const wrapper = document.getElementById('issuedTableWrapper');
    const empty = document.getElementById('issuedEmpty');
    const content = document.getElementById('issuedTableContent');
    const pagination = document.getElementById('issuedPagination');
    if (!content) return;

    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', '10');

    const search = document.getElementById('issuedSearch')?.value.trim();
    const startDate = document.getElementById('issuedStartDate')?.value;
    const endDate = document.getElementById('issuedEndDate')?.value;
    const sortBy = document.getElementById('issuedSortBy')?.value || 'createdAt';
    const sortOrder = document.getElementById('issuedSortOrder')?.value || 'desc';

    if (search) params.set('search', search);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (sortBy) params.set('sortBy', sortBy);
    if (sortOrder) params.set('sortOrder', sortOrder);

    const res = await authFetch(`${API_BASE}/certificates/database?${params.toString()}`);
    const data = await res.json();

    const rows = (data.certificates || []).map((c) => {
      return `
        <tr>
          <td>${new Date(c.createdAt).toLocaleString()}</td>
          <td>${c.student}</td>
          <td>${c.course}</td>
          <td>${c.institute}</td>
          <td><span class="status-${(c.status||'issued').toLowerCase()}">${c.status || 'issued'}</span></td>
          <td>
            <button class="btn-small" onclick="downloadIssuedJSON('${c.uuid}')">JSON</button>
            <button class="btn-small" onclick="downloadIssuedPDF('${c.uuid}')">PDF</button>
          </td>
        </tr>
      `;
    }).join('');

    const tableHtml = `
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Student</th>
            <th>Course</th>
            <th>Institute</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    `;

    content.innerHTML = tableHtml;
    if (data.total > 0) {
      if (wrapper) wrapper.style.display = '';
      if (empty) empty.style.display = 'none';
    } else {
      if (wrapper) wrapper.style.display = 'none';
      if (empty) empty.style.display = '';
    }

    renderIssuedPagination(data.page || 1, data.totalPages || 1);
  } catch (e) {
    console.error('Failed to load issued certificates', e);
  }
}

function renderIssuedPagination(currentPage, totalPages) {
  const pagination = document.getElementById('issuedPagination');
  if (!pagination) return;
  let html = '';
  if (totalPages <= 1) {
    pagination.innerHTML = '';
    return;
  }
  const prev = Math.max(1, currentPage - 1);
  const next = Math.min(totalPages, currentPage + 1);
  html += `<button class="btn-small" ${currentPage===1?'disabled':''} onclick="loadIssuedCertificates(${prev})">Prev</button>`;
  html += `<span style="margin:0 8px;">Page ${currentPage} / ${totalPages}</span>`;
  html += `<button class="btn-small" ${currentPage===totalPages?'disabled':''} onclick="loadIssuedCertificates(${next})">Next</button>`;
  pagination.innerHTML = html;
}

async function downloadIssuedJSON(uuid) {
  try {
    const res = await authFetch(`${API_BASE}/certificates?uuid=${encodeURIComponent(uuid)}`);
    const data = await res.json();
    const cert = (data.certificates || []).find(c => c.uuid === uuid) || data.certificate || null;
    if (!cert) return alert('Certificate not found');
    const blob = new Blob([JSON.stringify(cert, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `certificate_${uuid}.json`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    alert('Failed to download JSON');
  }
}

async function downloadIssuedPDF(uuid) {
  try {
    const res = await authFetch(`${API_BASE}/certificates?uuid=${encodeURIComponent(uuid)}`);
    const data = await res.json();
    const cert = (data.certificates || []).find(c => c.uuid === uuid) || data.certificate || null;
    if (!cert) return alert('Certificate not found');
    if (!window.jspdf) return alert('PDF library not loaded');
    const doc = new window.jspdf.jsPDF();
    doc.setFontSize(14);
    doc.text('Certificate', 14, 20);
    doc.setFontSize(11);
    doc.text(`UUID: ${cert.uuid}`, 14, 32);
    doc.text(`Student: ${cert.student}`, 14, 40);
    doc.text(`Course: ${cert.course}`, 14, 48);
    doc.text(`Institute: ${cert.institute}`, 14, 56);
    doc.text(`Date: ${cert.date}`, 14, 64);
    doc.text(`Status: ${cert.status || 'issued'}`, 14, 72);
    doc.save(`certificate_${uuid}.pdf`);
  } catch (e) {
    alert('Failed to generate PDF');
  }
}

async function exportIssuedCSV() {
  try {
    const params = {};
    const search = document.getElementById('issuedSearch')?.value.trim();
    const startDate = document.getElementById('issuedStartDate')?.value;
    const endDate = document.getElementById('issuedEndDate')?.value;
    const sortBy = document.getElementById('issuedSortBy')?.value || 'createdAt';
    const sortOrder = document.getElementById('issuedSortOrder')?.value || 'desc';
    if (search) params.search = search;
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;
    if (sortBy) params.sortBy = sortBy;
    if (sortOrder) params.sortOrder = sortOrder;

    const res = await authFetch(`${API_BASE}/certificates/export`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ format: 'csv', filters: params })
    });
    const text = await res.text();
    const blob = new Blob([text], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'issued_certificates.csv';
    a.click();
    URL.revokeObjectURL(url);
  } catch (e) {
    alert('Failed to export CSV');
  }
}

// Bind issued filters
document.getElementById('issuedSearch')?.addEventListener('input', () => loadIssuedCertificates(1));
document.getElementById('issuedStartDate')?.addEventListener('change', () => loadIssuedCertificates(1));
document.getElementById('issuedEndDate')?.addEventListener('change', () => loadIssuedCertificates(1));
document.getElementById('issuedSortBy')?.addEventListener('change', () => loadIssuedCertificates(1));
document.getElementById('issuedSortOrder')?.addEventListener('change', () => loadIssuedCertificates(1));

// Expose functions globally
window.loadIssuedCertificates = loadIssuedCertificates;
window.exportIssuedCSV = exportIssuedCSV;
window.downloadIssuedJSON = downloadIssuedJSON;
window.downloadIssuedPDF = downloadIssuedPDF;
window.addSubject = addSubject;
window.removeSubject = removeSubject;

//# sourceMappingURL=admin-dashboard.js.map