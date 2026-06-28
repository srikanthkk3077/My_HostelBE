const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const roomRoutes = require('./routes/roomRoutes');
const memberRoutes = require('./routes/memberRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const feeRoutes = require('./routes/feeRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const menuRoutes = require('./routes/menuRoutes');
const noticeRoutes = require('./routes/noticeRoutes');
const visitorRequestRoutes = require('./routes/visitorRequestRoutes');
const app = express();

// console.log('app.js loaded');

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/mess-menu', menuRoutes);
app.use('/api/notices', noticeRoutes);
app.use('/api/visitor-requests', visitorRequestRoutes);

module.exports = app;