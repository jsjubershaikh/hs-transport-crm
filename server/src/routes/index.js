import { Router } from 'express';
import authRoutes from './authRoutes.js';
import studentRoutes from './studentRoutes.js';
import feeRoutes from './feeRoutes.js';
import routeRoutes from './routeRoutes.js';
import busRoutes from './busRoutes.js';
import userRoutes from './userRoutes.js';
import academicYearRoutes from './academicYearRoutes.js';
import receiptRoutes from './receiptRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import reportRoutes from './reportRoutes.js';
import archiveRoutes from './archiveRoutes.js';
import settingsRoutes from './settingsRoutes.js';
import dashboardRoutes from './dashboardRoutes.js';
import manualReceiptRoutes from './manualReceiptRoutes.js';

const api = Router();

// Health check (handy for uptime probes / deployment).
api.get('/health', (req, res) => res.json({ success: true, data: { status: 'ok' } }));

api.use('/auth', authRoutes);
api.use('/students', studentRoutes);
api.use('/fees', feeRoutes);
api.use('/routes', routeRoutes);
api.use('/buses', busRoutes);
api.use('/users', userRoutes);
api.use('/academic-years', academicYearRoutes);
api.use('/receipts', receiptRoutes);
api.use('/manual-receipts', manualReceiptRoutes);
api.use('/notifications', notificationRoutes);
api.use('/reports', reportRoutes);
api.use('/archive', archiveRoutes);
api.use('/settings', settingsRoutes);
api.use('/dashboard', dashboardRoutes);

export default api;
