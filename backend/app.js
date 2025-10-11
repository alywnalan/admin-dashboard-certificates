import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import certificateRoutes from './routes/certificates.js';
import templateRoutes from './routes/templates.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Register the certificate routes!
app.use('/api/certificates', certificateRoutes);
app.use('/api/templates', templateRoutes);

export default app;
