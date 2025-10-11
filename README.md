# 🎓 Advanced Certificate Management System

A comprehensive, real-time certificate generation and validation platform with blockchain integration, multi-format template support, and advanced analytics.

## ✨ Features

### 🚀 **Core Functionality**
- **Real-time Certificate Generation**: Instant certificate creation with live progress updates
- **Multi-Format Template Support**: Upload HTML, PDF, DOC, DOCX, and image templates
- **Dynamic Subject Management**: Add/remove multiple subjects per student
- **Enhanced Student Profiles**: Department, branch, year, semester, and contact details
- **Batch Processing**: Generate multiple certificates from Excel/CSV files
- **Real-time Blockchain Anchoring**: Live blockchain integration with progress tracking

### 🔐 **Security & Validation**
- **Blockchain Integration**: Immutable certificate anchoring on blockchain
- **QR Code Generation**: Unique verification codes for each certificate
- **Real-time Validation**: Instant certificate verification system
- **Secure Authentication**: Admin and super-admin role management

### 📊 **Analytics & Monitoring**
- **Real-time Dashboard**: Live analytics and metrics
- **Certificate Tracking**: Comprehensive certificate lifecycle management
- **Blockchain Status**: Real-time anchoring progress and status
- **Advanced Filtering**: Search and filter certificates by multiple criteria

### 🎨 **Modern Design**
- **Professional Templates**: Beautiful, modern certificate designs
- **Responsive UI**: Mobile-friendly admin dashboard
- **Real-time Updates**: Live notifications and status updates
- **Enhanced UX**: Intuitive user interface with smooth interactions

## 🛠️ **Technology Stack**

### **Backend**
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **Socket.IO** for real-time communication
- **Multer** for file uploads
- **XLSX** for Excel processing
- **Handlebars** for template rendering
- **QR Code** generation
- **Blockchain** integration

### **Frontend**
- **Vanilla JavaScript** with modern ES6+
- **HTML5** with semantic markup
- **CSS3** with modern styling
- **Socket.IO Client** for real-time updates
- **Chart.js** for analytics visualization

## 📁 **Project Structure**

```
Admin/
├── backend/
│   ├── controllers/          # Business logic controllers
│   ├── models/              # Database models
│   ├── routes/              # API routes
│   ├── middleware/          # Authentication middleware
│   ├── services/            # External services
│   └── server.js            # Main server file
├── frontend/
│   ├── admin-dashboard.html  # Main admin interface
│   ├── admin-dashboard.js    # Dashboard logic
│   ├── super-admin.js        # Super admin functions
│   ├── css/                  # Stylesheets
│   ├── js/                   # JavaScript modules
│   └── assets/               # Images and resources
├── public/                   # Static files
└── data/                     # Data storage
```

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js (v14 or higher)
- MongoDB
- Git

### **Installation**

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Admin
   ```

2. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```

3. **Start MongoDB**
   ```bash
   # Make sure MongoDB is running on your system
   mongod
   ```

4. **Start the server**
   ```bash
   npm start
   ```

5. **Access the application**
   - Open `frontend/admin-dashboard.html` in your browser
   - Or use the batch file: `start-project.bat`

## 📋 **API Endpoints**

### **Authentication**
- `POST /api/auth/login` - Admin login
- `POST /api/auth/register` - Admin registration
- `POST /api/auth/logout` - Logout

### **Certificates**
- `POST /api/certificates/generate` - Generate single certificate
- `POST /api/certificates/batch-generate` - Batch certificate generation
- `GET /api/certificates/validate/:uuid` - Validate certificate
- `GET /api/certificates/database` - Get certificates with filters
- `DELETE /api/certificates/clear` - Clear all certificates

### **Templates**
- `POST /api/templates/upload` - Upload template
- `GET /api/templates` - List templates

### **Institutes**
- `GET /api/institutes` - List institutes
- `POST /api/institutes` - Create institute

## 🔧 **Configuration**

### **Environment Variables**
Create a `.env` file in the backend directory:
```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/certificate_system
JWT_SECRET=your_jwt_secret
BLOCKCHAIN_NETWORK=testnet
```

### **Database Setup**
The system automatically creates the following collections:
- `admins` - Admin user accounts
- `certificates` - Certificate records
- `templates` - Template files
- `institutes` - Institute information

## 📱 **Usage Guide**

### **Admin Dashboard**
1. **Login** with your admin credentials
2. **Generate Certificates** - Single or batch generation
3. **Upload Templates** - Support multiple formats
4. **Manage Students** - Add/edit student information
5. **Monitor Analytics** - Real-time dashboard metrics
6. **Validate Certificates** - QR code verification

### **Batch Generation**
1. Upload Excel/CSV file with student data
2. Select template from available options
3. Configure generation settings
4. Monitor real-time progress
5. Download generated certificates

### **Template Management**
- Upload templates in HTML, PDF, DOC, DOCX, or image formats
- Configure template fields and positioning
- Preview templates before use
- Manage template assets (logos, signatures)

## 🔒 **Security Features**

- **JWT Authentication** for secure API access
- **Role-based Access Control** (Admin/Super Admin)
- **Blockchain Anchoring** for certificate immutability
- **Input Validation** and sanitization
- **File Upload Security** with type validation
- **Rate Limiting** for API endpoints

## 📊 **Real-time Features**

- **Live Progress Updates** during batch generation
- **Blockchain Status Monitoring** with real-time updates
- **Certificate Creation Notifications**
- **Dashboard Analytics** with live data
- **Socket.IO Integration** for instant updates

## 🚀 **Deployment**

### **Local Development**
```bash
npm run dev
```

### **Production Deployment**
1. Set production environment variables
2. Build and optimize assets
3. Deploy to your preferred hosting platform
4. Configure MongoDB Atlas or local MongoDB
5. Set up SSL certificates for HTTPS

### **Docker Deployment**
```bash
docker build -t certificate-system .
docker run -p 3000:3000 certificate-system
```

## 🤝 **Contributing**

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 **License**

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 **Support**

For support and questions:
- Create an issue in the repository
- Check the documentation
- Review the API endpoints

## 🔄 **Changelog**

### **Latest Updates**
- ✅ Multi-format template support (HTML, PDF, DOC, images)
- ✅ Dynamic subject management
- ✅ Enhanced student profiles with academic details
- ✅ Real-time blockchain anchoring with progress updates
- ✅ Modern certificate design with professional styling
- ✅ Real-time analytics and dashboard updates
- ✅ Comprehensive certificate management system

---

**Built with ❤️ for modern certificate management**