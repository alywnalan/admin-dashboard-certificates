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
function logout() {
  localStorage.removeItem('jwtToken');
  localStorage.removeItem('adminLoggedIn');
  window.location.href = 'admin-login.html';
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
  const recentActivity = [
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
function renderStudentsTable() {
  const tbody = document.querySelector('#studentsTable tbody');
  const search = document.getElementById('searchStudent').value.toLowerCase();
  tbody.innerHTML = '';
  students
    .filter(stu =>
      stu.name.toLowerCase().includes(search) ||
      stu.email.toLowerCase().includes(search) ||
      stu.course.toLowerCase().includes(search) ||
      stu.institute.toLowerCase().includes(search)
    )
    .forEach((stu, idx) => {
      tbody.innerHTML += `
        <tr>
          <td>${stu.name}</td>
          <td>${stu.email}</td>
          <td>${stu.course}</td>
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
  const course = document.getElementById('studentCourse').value.trim();
  const institute = document.getElementById('studentInstitute').value.trim();
  students.push({ name, email, course, institute });
  localStorage.setItem('students', JSON.stringify(students));
  renderStudentsTable();
  this.reset();
  populateGenerateCertificateDropdowns();
};
window.editStudent = function(idx) {
  const stu = students[idx];
  document.getElementById('studentFullName').value = stu.name;
  document.getElementById('studentEmail').value = stu.email;
  document.getElementById('studentCourse').value = stu.course;
  document.getElementById('studentInstitute').value = stu.institute;
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

  // Certificate preview HTML
  const certHTML = `
    <div id="certTheme" style="width:900px;height:600px;background:${bgColor};border:12px solid #ffd700;border-radius:32px;box-shadow:0 8px 32px #23234a22;position:relative;overflow:hidden;padding:0;margin:auto;font-family:'Georgia',serif;">
      ${logo ? `<img src="${logo}" alt="Logo" style="position:absolute;top:32px;left:32px;height:64px;">` : ''}
      <div style="text-align:center;padding-top:60px;">
        <h1 style="font-size:2.8em;color:#23234a;font-weight:800;letter-spacing:2px;margin-bottom:12px;">Certificate of Achievement</h1>
        <div style="font-size:1.3em;color:#23234a;margin-bottom:18px;">This is to certify that</div>
        <div style="font-size:2.1em;color:#10b981;font-weight:700;margin-bottom:10px;">${stu ? stu.name : ''}</div>
        <div style="font-size:1.2em;color:#23234a;">has successfully completed <b>${stu ? stu.course : ''}</b></div>
        <div style="font-size:1.1em;color:#23234a;margin-top:10px;">Issued by: <b>${inst ? inst.name : ''}</b></div>
        <div style="font-size:1em;color:#23234a;margin-top:10px;">Date: <b>${date}</b></div>
        <div style="font-size:1em;color:#23234a;margin-top:10px;">Certificate ID: <b>${uuid}</b></div>
      </div>
      <div style="position:absolute;bottom:32px;left:32px;text-align:center;">
        ${sign1 ? `<img src="${sign1}" alt="Signature 1" style="height:48px;"><br>` : ''}
        <span style="font-size:1em;color:#23234a;">Signature 1</span>
      </div>
      <div style="position:absolute;bottom:32px;right:32px;text-align:center;">
        ${sign2 ? `<img src="${sign2}" alt="Signature 2" style="height:48px;"><br>` : ''}
        <span style="font-size:1em;color:#23234a;">Signature 2</span>
      </div>
      <div style="position:absolute;bottom:32px;left:50%;transform:translateX(-50%);">
        <span style="font-size:1.2em;color:#ffd700;font-weight:700;">Seal</span>
      </div>
      <div style="position:absolute;top:16px;right:32px;opacity:0.15;font-size:4em;font-weight:900;color:#ffd700;pointer-events:none;">ACADEMIC</div>
      <div id="qrCode" style="position:absolute;bottom:32px;right:50%;transform:translateX(50%);"></div>
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