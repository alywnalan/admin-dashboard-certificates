@echo off
echo Starting Certificate Management System...
echo.

echo 1. Starting MongoDB (if not already running)...
echo    Please ensure MongoDB is installed and running on your system
echo    If MongoDB is not running, start it manually or install it from https://www.mongodb.com/try/download/community
echo.

echo 2. Installing backend dependencies...
cd backend
npm install
echo.

echo 3. Starting backend server...
echo    Backend will run on http://localhost:5000
echo    Make sure to create a .env file in the backend directory with:
echo    MONGO_URI=mongodb://localhost:27017/certificate_system
echo    JWT_SECRET=your_jwt_secret_key_here
echo    PORT=5000
echo.
npm start
