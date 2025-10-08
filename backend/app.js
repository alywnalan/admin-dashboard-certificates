import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import certificateRoutes from './routes/certificates.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Register the certificate routes!
app.use('/api/certificates', certificateRoutes);

export default app;
