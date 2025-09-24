const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;


app.use(cors());
app.use(express.json());
app.use(express.static('.')); 


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});


app.get('/api/disasters', async (req, res) => {
    try {
      
        const sampleData = require('./data/sample-data.json');
        res.json(sampleData);
    } catch (error) {
        console.error('Error fetching disaster data:', error);
        res.status(500).json({ error: 'Failed to fetch disaster data' });
    }
});


app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});


app.listen(PORT, () => {
    console.log(`🚀 Disaster Management Dashboard running on http://localhost:${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});