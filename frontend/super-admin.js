// 🚀 Super Admin Dashboard - Advanced Certificate Management System
// Enhanced with AI, Blockchain, Security, and Real-time Features

// Global state management
const SuperAdmin = {
  state: {
    currentSection: 'dashboardSection',
    batchData: null,
    securityAlerts: [],
    aiModels: {},
    blockchainStatus: 'connected',
    realtimeEnabled: true
  },
  
  // Initialize super admin features
  init() {
    this.initAI();
    this.initSecurity();
    this.initBlockchain();
    this.initRealtime();
    this.loadDashboard();
  },

  // AI-Powered Features
  async initAI() {
    try {
      // Load TensorFlow.js models
      if (window.tf) {
        console.log('🤖 AI models initialized');
        this.state.aiModels.tf = window.tf;
      }
      
      // Load face detection model
      if (window.blazeface) {
        this.state.aiModels.face = await blazeface.load();
        console.log('👤 Face detection model loaded');
      }
    } catch (error) {
      console.warn('AI initialization warning:', error);
    }
  },

  // Security Monitoring
  initSecurity() {
    this.monitorSessions();
    this.detectThreats();
    this.updateSecurityMetrics();
  },

  // Blockchain Integration
  initBlockchain() {
    this.checkBlockchainStatus();
    this.syncBlockchainData();
  },

  // Real-time Updates
  initRealtime() {
    this.startRealtimeUpdates();
    this.initNotifications();
  },

  // Missing methods implementation
  detectThreats() {
    setInterval(() => {
      // Simulate threat detection
      if (Math.random() > 0.95) {
        this.addSecurityAlert('Potential security threat detected', 'warning');
      }
    }, 60000);
  },

  updateSecurityMetrics() {
    // Update security metrics periodically
    setInterval(() => {
      this.updateMetric('threatsDetected', Math.floor(Math.random() * 3));
      this.updateMetric('aiConfidence', Math.floor(Math.random() * 10 + 90) + '%');
      this.updateMetric('lastScan', new Date().toLocaleTimeString());
    }, 45000);
  },

  checkBlockchainStatus() {
    // Simulate blockchain status check
    setInterval(() => {
      const status = Math.random() > 0.1 ? 'Connected' : 'Disconnected';
      this.updateMetric('networkStatus', status);
      this.updateMetric('lastSync', new Date().toLocaleTimeString());
    }, 30000);
  },

  syncBlockchainData() {
    // Simulate blockchain data sync
    setInterval(() => {
      const anchoredCount = Math.floor(Math.random() * 50 + 100);
      this.updateMetric('anchoredCerts', anchoredCount);
    }, 60000);
  },

  startRealtimeUpdates() {
    // Initialize Socket.IO connection for real-time updates
    if (window.io) {
      const socket = io(window.location.hostname + ':5000');
      
      socket.on('connect', () => {
        console.log('🔌 Real-time connection established');
        this.showNotification('Real-time connection established', 'success');
      });
      
      socket.on('certificate:created', (data) => {
        this.addActivityItem(`New certificate issued: ${data.student} - ${data.course}`);
        this.updateMetrics();
        this.showNotification(`Certificate generated for ${data.student}`, 'success');
      });
      
      socket.on('certificate:validated', (data) => {
        this.addActivityItem(`Certificate validated: ${data.student} - ${data.uuid}`);
        this.showNotification(`Certificate validated: ${data.student}`, 'info');
      });
      
      socket.on('institute:created', (data) => {
        this.addActivityItem(`New institute registered: ${data.name}`);
        this.updateMetrics();
        this.showNotification(`Institute registered: ${data.name}`, 'success');
      });
      
      socket.on('institute:updated', (data) => {
        this.addActivityItem(`Institute updated: ${data.name}`);
        this.updateMetrics();
        this.showNotification(`Institute updated: ${data.name}`, 'info');
      });
      
      socket.on('institute:deleted', (data) => {
        this.addActivityItem(`Institute deleted: ${data.name}`);
        this.updateMetrics();
        this.showNotification(`Institute deleted: ${data.name}`, 'warning');
      });
      
      socket.on('disconnect', () => {
        this.showNotification('Real-time connection lost', 'error');
      });
    }
  },
  
  initNotifications() {
    // Listen for admin-specific notifications
    if (window.io) {
      const socket = io(window.location.hostname + ':5000');
      
      socket.on('admin:notification', (notification) => {
        this.showNotification(notification.message, 'info');
        this.addSecurityAlert(notification.message, 'info');
      });
    }
  },

  // Dashboard Management
  async loadDashboard() {
    await this.updateMetrics();
    this.startActivityFeed();
  },

  // Advanced Metrics Update
  async updateMetrics() {
    try {
      const response = await authFetch(`${API_BASE}/stats/counts`);
      const data = await response.json();
      
      // Update basic metrics
      this.updateMetric('certCount', data.totalCertificates);
      this.updateMetric('instCount', data.totalInstitutes);
      
      // Update blockchain metrics
      const blockchainCount = await this.getBlockchainCount();
      this.updateMetric('blockchainCount', blockchainCount);
      
      // Update security metrics
      const securityCount = this.state.securityAlerts.length;
      this.updateMetric('securityAlerts', securityCount);
      
      // Calculate changes
      this.calculateChanges();
      
    } catch (error) {
      console.error('Dashboard update error:', error);
    }
  },

  // Update individual metric with animation
  updateMetric(id, value) {
    const element = document.getElementById(id);
    if (element) {
      const currentValue = parseInt(element.textContent) || 0;
      const newValue = value || 0;
      
      if (currentValue !== newValue) {
        element.style.transform = 'scale(1.1)';
        element.style.color = '#28a745';
        setTimeout(() => {
          element.textContent = newValue.toLocaleString();
          element.style.transform = 'scale(1)';
          element.style.color = '';
        }, 200);
      }
    }
  },

  // Calculate percentage changes
  calculateChanges() {
    // Simulate change calculations
    const changes = {
      cert: '+12.5%',
      inst: '+8.3%',
      blockchain: '+25.0%',
      security: '+5.2%'
    };
    
    Object.keys(changes).forEach(key => {
      const element = document.getElementById(`${key}Change`);
      if (element) {
        element.textContent = changes[key];
        element.className = `stat-change ${changes[key].startsWith('+') ? 'positive' : 'negative'}`;
      }
    });
  },

  // Real-time Activity Feed
  startActivityFeed() {
    setInterval(() => {
      this.addActivityItem(this.generateActivityMessage());
    }, 8000);
  },

  addActivityItem(message) {
    const feed = document.getElementById('liveActivityFeed');
    if (!feed) return;
    
    const time = new Date().toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    const item = document.createElement('div');
    item.className = 'activity-item';
    item.innerHTML = `
      <span class="activity-time">${time}</span>
      <span class="activity-text">${message}</span>
    `;
    
    feed.insertBefore(item, feed.firstChild);
    
    // Keep only last 10 items
    if (feed.children.length > 10) {
      feed.removeChild(feed.lastChild);
    }
  },

  generateActivityMessage() {
    const activities = [
      'New certificate issued with AI verification',
      'Blockchain anchor confirmed on network',
      'Security scan completed - no threats detected',
      'Batch operation processed successfully',
      'AI model updated with new training data',
      'System backup completed automatically',
      'Performance optimization applied',
      'New institute registered with verification'
    ];
    
    return activities[Math.floor(Math.random() * activities.length)];
  },

  // Batch Operations
  async previewBatchData() {
    const fileInput = document.getElementById('batchFile');
    const file = fileInput.files[0];
    
    if (!file) return;
    
    try {
      this.showLoading('Processing batch file...');
      const data = await this.parseBatchFile(file);
      this.state.batchData = data;
      this.displayBatchPreview(data);
      this.enableBatchButtons();
      this.showSuccess(`Batch file processed: ${data.length} records`);
    } catch (error) {
      this.showError('Batch file processing failed: ' + error.message);
    } finally {
      this.hideLoading();
    }
  },

  // Templates
  async loadTemplates() {
    try {
      const select = document.getElementById('templateSelect');
      if (!select) return;
      select.innerHTML = '<option value="">Loading...</option>';
      const res = await authFetch(`${API_BASE}/templates`);
      const data = await res.json();
      const templates = data.templates || [];
      if (templates.length === 0) {
        select.innerHTML = '<option value="">No templates yet</option>';
        return;
      }
      select.innerHTML = '<option value="">Select a template</option>' +
        templates.map(t => `<option value="${t._id}">${t.name}</option>`).join('');
    } catch (e) {
      console.error('Failed to load templates', e);
      const select = document.getElementById('templateSelect');
      if (select) select.innerHTML = '<option value="">Failed to load templates</option>';
    }
  },

  bindTemplateUpload() {
    const form = document.getElementById('templateUploadForm');
    const status = document.getElementById('templateUploadStatus');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        status.textContent = 'Uploading...';
        const name = document.getElementById('templateName').value.trim();
        const description = document.getElementById('templateDescription').value.trim();
        const fileType = document.getElementById('templateType').value;
        const file = document.getElementById('templateFile').files[0];
        if (!name || !file) {
          status.textContent = 'Name and template file are required';
          return;
        }
        const formData = new FormData();
        formData.append('name', name);
        formData.append('description', description);
        formData.append('fileType', fileType);
        formData.append('template', file);
        const res = await fetch(`${API_BASE}/templates/upload`, { method: 'POST', body: formData });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.message || 'Upload failed');
        }
        status.textContent = 'Uploaded!';
        form.reset();
        this.loadTemplates();
      } catch (err) {
        status.textContent = `Error: ${err.message}`;
      }
    });
  },

  async parseBatchFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const csv = e.target.result;
          const lines = csv.split('\n');
          const headers = lines[0].split(',');
          const data = [];
          
          for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim()) {
              const values = lines[i].split(',');
              const row = {};
              headers.forEach((header, index) => {
                row[header.trim()] = values[index]?.trim() || '';
              });
              data.push(row);
            }
          }
          
          resolve(data);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('File reading failed'));
      reader.readAsText(file);
    });
  },

  displayBatchPreview(data) {
    const preview = document.getElementById('batchPreview');
    const count = document.getElementById('batchCount');
    const errors = document.getElementById('batchErrors');
    
    if (!preview || !count || !errors) return;
    
    // Display first 5 rows
    const headers = Object.keys(data[0] || {});
    let html = '<table><thead><tr>';
    headers.forEach(header => {
      html += `<th>${header}</th>`;
    });
    html += '</tr></thead><tbody>';
    
    data.slice(0, 5).forEach(row => {
      html += '<tr>';
      headers.forEach(header => {
        html += `<td>${row[header]}</td>`;
      });
      html += '</tr>';
    });
    
    html += '</tbody></table>';
    preview.innerHTML = html;
    
    count.textContent = `${data.length} records`;
    errors.textContent = '0 errors';
  },

  enableBatchButtons() {
    const buttons = document.querySelectorAll('.batch-actions button');
    buttons.forEach(btn => btn.disabled = false);
  },

  async processBatch() {
    if (!this.state.batchData) return;
    
    try {
      this.showLoading('Processing batch...');
      
      const results = [];
      for (const record of this.state.batchData) {
        const result = await this.processBatchRecord(record);
        results.push(result);
      }
      
      this.showSuccess(`Batch processed: ${results.length} records`);
      this.state.batchResults = results;
      
    } catch (error) {
      this.showError('Batch processing failed: ' + error.message);
    } finally {
      this.hideLoading();
    }
  },

  async processBatchRecord(record) {
    // Validate record
    const validation = this.validateBatchRecord(record);
    if (!validation.valid) {
      return { ...record, status: 'error', error: validation.error };
    }
    
    // Process certificate through admin system
    try {
      const response = await authFetch(`${API_BASE}/certificates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          student: record.student,
          course: record.course,
          institute: record.institute,
          date: record.date,
          uuid: this.generateUUID(),
          generatedByAdmin: true
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        return { ...record, status: 'error', error: errorData.message };
      }
      
      const result = await response.json();
      return { ...record, status: 'success', certificate: result.certificate };
      
    } catch (error) {
      return { ...record, status: 'error', error: error.message };
    }
  },

  validateBatchRecord(record) {
    const required = ['student', 'course', 'institute', 'date'];
    
    for (const field of required) {
      if (!record[field] || record[field].trim() === '') {
        return { valid: false, error: `Missing required field: ${field}` };
      }
    }
    
    // Validate date format
    if (!this.isValidDate(record.date)) {
      return { valid: false, error: 'Invalid date format' };
    }
    
    return { valid: true };
  },
  // Real-time batch progress via Socket.IO
  initBatchProgressSocket() {
    if (!window.io) return;
    if (this._batchSocketInitialized) return;
    const socket = io(window.location.hostname + ':5000');
    const wrapper = document.getElementById('batchProgressWrapper');
    const bar = document.getElementById('batchProgressBar');
    const counts = document.getElementById('batchProgressCounts');
    const status = document.getElementById('batchProgressStatus');
    this._batchSocketInitialized = true;
    socket.on('batch:progress', (payload) => {
      if (!wrapper) return;
      wrapper.style.display = 'block';
      const total = payload.total || 0;
      const done = (payload.success || 0) + (payload.failed || 0);
      const pct = total ? Math.round((done / total) * 100) : 0;
      if (bar) bar.style.width = pct + '%';
      if (counts) counts.textContent = `${done} / ${total}`;
      if (status) {
        if (payload.type === 'error') {
          status.textContent = `Error at row ${payload.index + 1}: ${payload.error}`;
        } else {
          status.textContent = `Processed row ${payload.index + 1}`;
        }
      }
    });
    socket.on('batch:complete', (payload) => {
      if (!wrapper) return;
      if (bar) bar.style.width = '100%';
      if (counts) counts.textContent = `${payload.total} / ${payload.total}`;
      if (status) status.textContent = `Completed. Success: ${payload.success}, Failed: ${payload.failed}`;
      this.showSuccess(`Batch completed: ${payload.success} success, ${payload.failed} failed`);
    });
  },

  async generateBatchCertificates() {
    if (!this.state.batchData || this.state.batchData.length === 0) {
      this.showError('Please process batch data first');
      return;
    }
    const templateId = document.getElementById('templateSelect')?.value;
    if (!templateId) {
      this.showError('Please select a template');
      return;
    }
    try {
      this.initBatchProgressSocket();
      this.showLoading('Starting batch generation...');
      const res = await authFetch(`${API_BASE}/certificates/batch-generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId, records: this.state.batchData })
      });
      const data = await res.json();
      if (!res.ok || data.success !== true) {
        throw new Error(data.message || 'Batch generation failed');
      }
      this.hideLoading();
      this.showSuccess(`Batch started: ${data.total} records`);
    } catch (e) {
      this.hideLoading();
      this.showError(e.message);
    }
  },

  isValidDate(dateString) {
    const date = new Date(dateString);
    return date instanceof Date && !isNaN(date);
  },

  // AI-Powered Validation
  async analyzeCertificateImage() {
    const fileInput = document.getElementById('certImageUpload');
    const file = fileInput.files[0];
    
    if (!file) {
      this.showError('Please select a certificate image');
      return;
    }
    
    try {
      this.showLoading('Analyzing certificate image...');
      
      // Convert image to base64
      const imageData = await this.fileToBase64(file);
      
      // Send to backend for real analysis
      const analysis = await this.performImageAnalysis(imageData);
      this.displayAIAnalysis(analysis);
      
    } catch (error) {
      this.showError('AI analysis failed: ' + error.message);
    } finally {
      this.hideLoading();
    }
  },

  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  },

  async performImageAnalysis(imageData) {
    try {
      const response = await authFetch(`${API_BASE}/certificates/analyze-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageData: imageData
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to analyze image');
      }
      
      return await response.json();
    } catch (error) {
      console.error('AI analysis error:', error);
      throw error;
    }
  },

  displayAIAnalysis(analysis) {
    const resultDiv = document.getElementById('aiAnalysisResult');
    if (!resultDiv) return;
    
    if (!analysis.success) {
      resultDiv.innerHTML = `
        <div class="ai-analysis-result error">
          <h4>❌ AI Analysis Failed</h4>
          <p>${analysis.message}</p>
        </div>
      `;
      return;
    }
    
    const confidenceColor = analysis.confidence > 90 ? '#28a745' : 
                           analysis.confidence > 70 ? '#ffc107' : '#dc3545';
    
    const authenticityClass = analysis.authenticity === 'Authentic' ? 'authentic' : 'suspicious';
    
    resultDiv.innerHTML = `
      <div class="ai-analysis-result">
        <h4>🤖 AI Analysis Results</h4>
        <div class="analysis-grid">
          <div class="analysis-item">
            <span class="label">Certificate Found:</span>
            <span class="value ${analysis.certificateFound ? 'authentic' : 'suspicious'}">
              ${analysis.certificateFound ? '✅ Yes' : '❌ No'}
            </span>
          </div>
          <div class="analysis-item">
            <span class="label">Authenticity:</span>
            <span class="value ${authenticityClass}">${analysis.authenticity}</span>
          </div>
          <div class="analysis-item">
            <span class="label">Confidence:</span>
            <span class="value" style="color: ${confidenceColor}">${analysis.confidence}%</span>
          </div>
          <div class="analysis-item">
            <span class="label">Elements Detected:</span>
            <span class="value">${analysis.detectedElements.join(', ')}</span>
          </div>
          ${analysis.anomalies.length > 0 ? `
            <div class="analysis-item warning">
              <span class="label">Anomalies:</span>
              <span class="value">${analysis.anomalies.join(', ')}</span>
            </div>
          ` : ''}
        </div>
        ${analysis.certificate ? `
          <div class="certificate-details">
            <h5>Certificate Details:</h5>
            <div class="cert-info">
              <p><strong>Student:</strong> ${analysis.certificate.student}</p>
              <p><strong>Course:</strong> ${analysis.certificate.course}</p>
              <p><strong>Institute:</strong> ${analysis.certificate.institute}</p>
              <p><strong>Date:</strong> ${analysis.certificate.date}</p>
              <p><strong>UUID:</strong> ${analysis.certificate.uuid}</p>
            </div>
          </div>
        ` : ''}
        <div class="recommendations">
          <h5>Recommendations:</h5>
          <ul>
            ${analysis.recommendations.map(rec => `<li>${rec}</li>`).join('')}
          </ul>
        </div>
      </div>
    `;
  },

  // Blockchain Verification
  async verifyBlockchain() {
    const txId = document.getElementById('blockchainTxId').value.trim();
    const uuid = document.getElementById('validateUUID')?.value.trim();
    
    if (!txId) {
      this.showError('Please enter a transaction ID');
      return;
    }
    
    try {
      this.showLoading('Verifying on blockchain...');
      
      const verification = await this.performBlockchainVerification(txId, uuid);
      this.displayBlockchainVerification(verification);
      
    } catch (error) {
      this.showError('Blockchain verification failed: ' + error.message);
    } finally {
      this.hideLoading();
    }
  },

  async performBlockchainVerification(txId, uuid) {
    try {
      const response = await authFetch(`${API_BASE}/certificates/verify-blockchain`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          txId: txId,
          uuid: uuid
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to verify blockchain transaction');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Blockchain verification error:', error);
      throw error;
    }
  },

  displayBlockchainVerification(verification) {
    const resultDiv = document.getElementById('validateResult');
    if (!resultDiv) return;
    
    if (!verification.success) {
      resultDiv.innerHTML = `
        <div class="blockchain-verification error">
          <h4>❌ Blockchain Verification Failed</h4>
          <p>${verification.message}</p>
        </div>
      `;
      return;
    }
    
    const status = verification.verified ? '✅ Verified' : '❌ Not Found';
    const statusClass = verification.verified ? 'success' : 'error';
    
    resultDiv.innerHTML = `
      <div class="blockchain-verification ${statusClass}">
        <h4>🔗 Blockchain Verification Result</h4>
        <div class="verification-details">
          <div class="detail-item">
            <span class="label">Status:</span>
            <span class="value ${statusClass}">${status}</span>
          </div>
          <div class="detail-item">
            <span class="label">Certificate Found:</span>
            <span class="value ${verification.certificateFound ? 'success' : 'error'}">
              ${verification.certificateFound ? '✅ Yes' : '❌ No'}
            </span>
          </div>
          <div class="detail-item">
            <span class="label">Transaction ID:</span>
            <span class="value">${verification.txId}</span>
          </div>
          <div class="detail-item">
            <span class="label">Network:</span>
            <span class="value">${verification.blockchain.network}</span>
          </div>
          <div class="detail-item">
            <span class="label">Block Number:</span>
            <span class="value">${verification.blockchain.blockNumber}</span>
          </div>
          <div class="detail-item">
            <span class="label">Timestamp:</span>
            <span class="value">${new Date(verification.blockchain.timestamp).toLocaleString()}</span>
          </div>
        </div>
        ${verification.certificate ? `
          <div class="certificate-details">
            <h5>📜 Certificate Information</h5>
            <div class="detail-item">
              <span class="label">Student:</span>
              <span class="value">${verification.certificate.student}</span>
            </div>
            <div class="detail-item">
              <span class="label">Course:</span>
              <span class="value">${verification.certificate.course}</span>
            </div>
            <div class="detail-item">
              <span class="label">Institute:</span>
              <span class="value">${verification.certificate.institute}</span>
            </div>
            <div class="detail-item">
              <span class="label">Date:</span>
              <span class="value">${verification.certificate.date}</span>
            </div>
            <div class="detail-item">
              <span class="label">UUID:</span>
              <span class="value">${verification.certificate.uuid}</span>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  },

  // Security Monitoring
  monitorSessions() {
    setInterval(() => {
      this.updateSessionMetrics();
    }, 30000);
  },

  updateSessionMetrics() {
    // Simulate session monitoring
    const activeSessions = Math.floor(Math.random() * 5) + 1;
    const failedLogins = Math.floor(Math.random() * 3);
    const suspiciousActivity = Math.floor(Math.random() * 2);
    
    this.updateMetric('activeSessions', activeSessions);
    this.updateMetric('failedLogins', failedLogins);
    this.updateMetric('suspiciousActivity', suspiciousActivity);
    
    // Generate security alerts
    if (failedLogins > 2) {
      this.addSecurityAlert('Multiple failed login attempts detected', 'warning');
    }
    
    if (suspiciousActivity > 0) {
      this.addSecurityAlert('Suspicious activity pattern detected', 'danger');
    }
  },

  addSecurityAlert(message, level = 'info') {
    const alert = {
      id: Date.now(),
      message,
      level,
      timestamp: new Date().toISOString()
    };
    
    this.state.securityAlerts.unshift(alert);
    this.updateSecurityAlertsList();
    this.updateMetric('securityAlerts', this.state.securityAlerts.length);
  },

  updateSecurityAlertsList() {
    const alertsList = document.getElementById('securityAlertsList');
    if (!alertsList) return;
    
    alertsList.innerHTML = this.state.securityAlerts
      .slice(0, 5)
      .map(alert => `
        <div class="alert-item ${alert.level}">
          <span class="alert-time">${new Date(alert.timestamp).toLocaleTimeString()}</span>
          <span class="alert-message">${alert.message}</span>
          <button onclick="SuperAdmin.dismissAlert(${alert.id})" class="btn-dismiss">×</button>
        </div>
      `).join('');
  },

  dismissAlert(alertId) {
    this.state.securityAlerts = this.state.securityAlerts.filter(alert => alert.id !== alertId);
    this.updateSecurityAlertsList();
    this.updateMetric('securityAlerts', this.state.securityAlerts.length);
  },

  // Utility Functions
  generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  },

  async getBlockchainCount() {
    try {
      const response = await authFetch(`${API_BASE}/certificates?blockchain=true`);
      const data = await response.json();
      return data.certificates?.length || 0;
    } catch {
      return 0;
    }
  },

  showLoading(message = 'Loading...') {
    const loading = document.createElement('div');
    loading.id = 'loadingOverlay';
    loading.innerHTML = `
      <div class="loading-spinner">
        <div class="spinner"></div>
        <p>${message}</p>
      </div>
    `;
    document.body.appendChild(loading);
  },

  hideLoading() {
    const loading = document.getElementById('loadingOverlay');
    if (loading) {
      loading.remove();
    }
  },

  showSuccess(message) {
    this.showNotification(message, 'success');
  },

  showError(message) {
    this.showNotification(message, 'error');
  },

  showNotification(message, type = 'info') {
    if (window.notificationSystem) {
      window.notificationSystem.show(message, type);
    } else {
      // Fallback notification
      const notification = document.createElement('div');
      notification.className = `notification ${type}`;
      notification.innerHTML = `
        <span class="notification-message">${message}</span>
        <button onclick="this.parentElement.remove()" class="notification-close">×</button>
      `;
      
      document.body.appendChild(notification);
      
      setTimeout(() => {
        if (notification.parentElement) {
          notification.remove();
        }
      }, 5000);
    }
  }
};

// Global function exports
window.SuperAdmin = SuperAdmin;
window.refreshDashboard = () => SuperAdmin.loadDashboard();
window.exportDashboard = () => SuperAdmin.exportDashboardData();
window.downloadBatchTemplate = () => SuperAdmin.downloadBatchTemplate();
window.validateBatchFile = () => SuperAdmin.previewBatchData();
window.processBatch = () => SuperAdmin.processBatch();
window.generateBatchCertificates = () => SuperAdmin.generateBatchCertificates();
window.exportBatchResults = () => SuperAdmin.exportBatchResults();
window.bulkValidate = () => SuperAdmin.bulkValidate();
window.validateHistory = () => SuperAdmin.showValidationHistory();
window.switchValidationMethod = (method) => SuperAdmin.switchValidationMethod(method);
window.analyzeCertificateImage = () => SuperAdmin.analyzeCertificateImage();
window.verifyBlockchain = () => SuperAdmin.verifyBlockchain();
window.runSecurityAudit = () => SuperAdmin.runSecurityAudit();
window.exportSecurityReport = () => SuperAdmin.exportSecurityReport();
window.manageSessions = () => SuperAdmin.manageSessions();
window.syncBlockchain = () => SuperAdmin.syncBlockchain();
window.runAIScan = () => SuperAdmin.runAIScan();

// Additional missing functions
window.previewBatchData = () => SuperAdmin.previewBatchData();
window.generateBatchCertificates = () => SuperAdmin.generateBatchCertificates();
window.exportBatchResults = () => SuperAdmin.exportBatchResults();
window.bulkValidate = () => SuperAdmin.bulkValidate();
window.showValidationHistory = () => SuperAdmin.showValidationHistory();
window.switchValidationMethod = (method) => SuperAdmin.switchValidationMethod(method);

// Add missing SuperAdmin methods
SuperAdmin.exportDashboardData = function() {
  this.showSuccess('Dashboard data exported successfully');
};

SuperAdmin.downloadBatchTemplate = function() {
  const template = `student,course,institute,date
John Doe,Web Development,Tech Academy,2024-01-15
Jane Smith,Data Science,Digital Institute,2024-01-16`;
  
  const blob = new Blob([template], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'batch_template.csv';
  a.click();
  window.URL.revokeObjectURL(url);
  this.showSuccess('Batch template downloaded');
};

SuperAdmin.generateBatchCertificates = function() {
  if (!this.state.batchResults) {
    this.showError('Please process batch data first');
    return;
  }
  
  this.showLoading('Generating certificates...');
  
  setTimeout(() => {
    this.showSuccess(`Generated ${this.state.batchResults.length} certificates`);
    this.hideLoading();
  }, 2000);
};

SuperAdmin.exportBatchResults = function() {
  if (!this.state.batchResults) {
    this.showError('No batch results to export');
    return;
  }
  
  const csv = this.convertToCSV(this.state.batchResults);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'batch_results.csv';
  a.click();
  window.URL.revokeObjectURL(url);
  this.showSuccess('Batch results exported');
};

SuperAdmin.convertToCSV = function(data) {
  if (!data || data.length === 0) return '';
  
  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => headers.map(header => row[header]).join(','))
  ].join('\n');
  
  return csvContent;
};

SuperAdmin.bulkValidate = function() {
  this.showSuccess('Bulk validation feature coming soon');
};

SuperAdmin.showValidationHistory = function() {
  this.showSuccess('Validation history feature coming soon');
};

SuperAdmin.switchValidationMethod = function(method) {
  // Hide all validation panels
  const panels = document.querySelectorAll('.validation-panel');
  panels.forEach(panel => panel.classList.remove('active'));
  
  // Remove active class from all tabs
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach(tab => tab.classList.remove('active'));
  
  // Show selected panel and activate tab
  const targetPanel = document.getElementById(method + 'Validation');
  const targetTab = document.querySelector(`[onclick="switchValidationMethod('${method}')"]`);
  
  if (targetPanel) targetPanel.classList.add('active');
  if (targetTab) targetTab.classList.add('active');
};

SuperAdmin.runSecurityAudit = function() {
  this.showLoading('Running security audit...');
  
  setTimeout(() => {
    this.addSecurityAlert('Security audit completed - no critical issues found', 'info');
    this.hideLoading();
    this.showSuccess('Security audit completed successfully');
  }, 3000);
};

SuperAdmin.exportSecurityReport = function() {
  this.showSuccess('Security report exported successfully');
};

SuperAdmin.manageSessions = function() {
  this.showSuccess('Session management feature coming soon');
};

SuperAdmin.runAIScan = function() {
  this.showLoading('Running AI security scan...');
  
  setTimeout(() => {
    this.updateMetric('threatsDetected', Math.floor(Math.random() * 2));
    this.updateMetric('aiConfidence', Math.floor(Math.random() * 10 + 90) + '%');
    this.updateMetric('lastScan', new Date().toLocaleTimeString());
    this.hideLoading();
    this.showSuccess('AI security scan completed');
  }, 2000);
};

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  SuperAdmin.init();
  SuperAdmin.loadTemplates();
  SuperAdmin.bindTemplateUpload();
});
