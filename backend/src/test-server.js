// backend/test-with-customers.js
const express = require('express');
const cors = require('cors');
const customersRoutes = require('./routes/customers'); // ← Solo customers

const app = express();

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());

app.use('/api/customers', customersRoutes); // ← Solo esta ruta

app.listen(3000, () => {
  console.log('🚀 Test server with customers on port 3000');
});