const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const disasterService = require('./services/disasterService');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Request logging
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// ==================== ROUTES ====================

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

/**
 * GET /api/disasters
 * Fetch all disasters from multiple APIs
 */
app.get('/api/disasters', async (req, res) => {
    try {
        res.setHeader('Cache-Control', 'public, max-age=60'); // 1 minute browser cache

        console.log('🔄 Fetching disasters...');
        const disasters = await disasterService.fetchAllDisasters();
        const safeZones = disasterService.getSafeZones();

        res.json({
            disasters,
            safeZones,
            meta: {
                timestamp: new Date().toISOString(),
                totalDisasters: disasters.length,
                totalSafeZones: safeZones.length,
                sources: ['USGS', 'NASA EONET', 'GDACS', 'ReliefWeb', 'NWS']
            }
        });
    } catch (error) {
        console.error('❌ Error fetching disaster data:', error);
        res.status(500).json({
            error: 'Failed to fetch disaster data',
            message: error.message
        });
    }
});

/**
 * GET /api/disasters/earthquakes
 * Fetch only earthquakes from USGS
 */
app.get('/api/disasters/earthquakes', async (req, res) => {
    try {
        const allDisasters = await disasterService.fetchAllDisasters();
        const earthquakes = allDisasters.filter(d => d.type === 'earthquake');

        res.json({
            earthquakes,
            count: earthquakes.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching earthquakes:', error);
        res.status(500).json({ error: 'Failed to fetch earthquake data' });
    }
});

/**
 * GET /api/disasters/weather
 * Fetch weather-related disasters
 */
app.get('/api/disasters/weather', async (req, res) => {
    try {
        const allDisasters = await disasterService.fetchAllDisasters();
        const weatherTypes = ['hurricane', 'tornado', 'thunderstorm', 'flood', 'snow', 'heat'];
        const weather = allDisasters.filter(d => weatherTypes.includes(d.type));

        res.json({
            weather,
            count: weather.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching weather data:', error);
        res.status(500).json({ error: 'Failed to fetch weather data' });
    }
});

/**
 * GET /api/disasters/stats
 * Get disaster statistics
 */
app.get('/api/disasters/stats', async (req, res) => {
    try {
        const disasters = await disasterService.fetchAllDisasters();

        // Count by type
        const byType = disasters.reduce((acc, d) => {
            acc[d.type] = (acc[d.type] || 0) + 1;
            return acc;
        }, {});

        // Count by severity
        const critical = disasters.filter(d => d.severity >= 8).length;
        const warning = disasters.filter(d => d.severity >= 5 && d.severity < 8).length;
        const minor = disasters.filter(d => d.severity < 5).length;

        // Count by source
        const bySource = disasters.reduce((acc, d) => {
            acc[d.source] = (acc[d.source] || 0) + 1;
            return acc;
        }, {});

        res.json({
            total: disasters.length,
            byType,
            bySeverity: { critical, warning, minor },
            bySource,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({ error: 'Failed to fetch statistics' });
    }
});

/**
 * GET /api/safe-zones
 * Fetch safe zones
 */
app.get('/api/safe-zones', (req, res) => {
    try {
        const safeZones = disasterService.getSafeZones();
        res.json({
            safeZones,
            count: safeZones.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        console.error('Error fetching safe zones:', error);
        res.status(500).json({ error: 'Failed to fetch safe zones' });
    }
});

/**
 * POST /api/cache/clear
 * Clear all caches
 */
app.post('/api/cache/clear', (req, res) => {
    disasterService.clearCache();
    res.json({
        message: 'All caches cleared successfully',
        timestamp: new Date().toISOString()
    });
});

/**
 * POST /api/cache/clear/:api
 * Clear cache for specific API
 */
app.post('/api/cache/clear/:api', (req, res) => {
    const { api } = req.params;
    const validApis = ['usgs', 'nasa', 'gdacs', 'reliefweb', 'nws'];

    if (!validApis.includes(api.toLowerCase())) {
        return res.status(400).json({
            error: 'Invalid API name',
            validApis
        });
    }

    disasterService.clearAPICache(api.toLowerCase());
    res.json({
        message: `${api} cache cleared successfully`,
        timestamp: new Date().toISOString()
    });
});

/**
 * GET /api/cache/status
 * Get cache status for all APIs
 */
app.get('/api/cache/status', (req, res) => {
    const status = disasterService.getCacheStatus();
    res.json({
        ...status,
        config: disasterService.CacheConfig,
        timestamp: new Date().toISOString()
    });
});

/**
 * GET /api/cache/stats
 * Get fetch statistics
 */
app.get('/api/cache/stats', (req, res) => {
    const stats = disasterService.getStats();
    res.json({
        ...stats,
        timestamp: new Date().toISOString()
    });
});

/**
 * POST /api/cache/stats/reset
 * Reset statistics
 */
app.post('/api/cache/stats/reset', (req, res) => {
    disasterService.resetStats();
    res.json({
        message: 'Statistics reset successfully',
        timestamp: new Date().toISOString()
    });
});

/**
 * POST /api/circuit-breaker/reset
 * Reset all circuit breakers
 */
app.post('/api/circuit-breaker/reset', (req, res) => {
    disasterService.resetAllCircuitBreakers();
    res.json({
        message: 'All circuit breakers reset successfully',
        timestamp: new Date().toISOString()
    });
});

/**
 * POST /api/circuit-breaker/reset/:api
 * Reset circuit breaker for specific API
 */
app.post('/api/circuit-breaker/reset/:api', (req, res) => {
    const { api } = req.params;
    const validApis = ['usgs', 'nasa', 'gdacs', 'reliefweb', 'nws'];

    if (!validApis.includes(api.toLowerCase())) {
        return res.status(400).json({
            error: 'Invalid API name',
            validApis
        });
    }

    disasterService.resetCircuitBreaker(api.toLowerCase());
    res.json({
        message: `${api} circuit breaker reset successfully`,
        timestamp: new Date().toISOString()
    });
});

/**
 * POST /api/disasters/refresh
 * Force refresh all disaster data (bypass cache)
 */
app.post('/api/disasters/refresh', async (req, res) => {
    try {
        console.log('🔄 Force refreshing disaster data...');
        const disasters = await disasterService.fetchAllDisasters(true);
        const safeZones = disasterService.getSafeZones();

        res.json({
            message: 'Data refreshed successfully',
            disasters,
            safeZones,
            meta: {
                timestamp: new Date().toISOString(),
                totalDisasters: disasters.length,
                totalSafeZones: safeZones.length,
                sources: ['USGS', 'NASA EONET', 'GDACS', 'ReliefWeb', 'NWS']
            }
        });
    } catch (error) {
        console.error('❌ Error force refreshing data:', error);
        res.status(500).json({
            error: 'Failed to refresh disaster data',
            message: error.message
        });
    }
});

/**
 * GET /health
 * Health check endpoint with cache status
 */
app.get('/health', (req, res) => {
    const cacheStatus = disasterService.getCacheStatus();
    const stats = disasterService.getStats();

    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cache: {
            hasCachedData: cacheStatus.combined.hasCachedData,
            itemCount: cacheStatus.combined.itemCount,
            isFresh: cacheStatus.combined.isFresh,
            age: cacheStatus.combined.age
        },
        circuitBreakers: Object.keys(cacheStatus.apis).reduce((acc, key) => {
            acc[key] = cacheStatus.apis[key].circuitBreaker.isOpen ? 'OPEN' : 'CLOSED';
            return acc;
        }, {}),
        stats: {
            cacheHitRate: stats.cacheHitRate,
            successRate: stats.successRate
        }
    });
});

/**
 * GET /api/sources
 * List available data sources
 */
app.get('/api/sources', (req, res) => {
    res.json({
        sources: [
            {
                name: 'USGS Earthquake Hazards Program',
                url: 'https://earthquake.usgs.gov/',
                types: ['earthquake'],
                updateFrequency: 'Real-time'
            },
            {
                name: 'NASA EONET (Earth Observatory Natural Event Tracker)',
                url: 'https://eonet.gsfc.nasa.gov/',
                types: ['wildfire', 'volcano', 'flood', 'hurricane', 'iceberg'],
                updateFrequency: 'Hourly'
            },
            {
                name: 'GDACS (Global Disaster Alert and Coordination System)',
                url: 'https://www.gdacs.org/',
                types: ['earthquake', 'flood', 'hurricane', 'volcano'],
                updateFrequency: 'Real-time'
            },
            {
                name: 'ReliefWeb',
                url: 'https://reliefweb.int/',
                types: ['all disaster types', 'humanitarian crises', 'conflicts'],
                updateFrequency: 'Daily'
            },
            {
                name: 'National Weather Service (NWS)',
                url: 'https://www.weather.gov/',
                types: ['severe weather', 'tornado', 'hurricane', 'flood'],
                updateFrequency: 'Real-time',
                region: 'United States'
            }
        ]
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Start server
app.listen(PORT, () => {
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════╗');
    console.log('║                                                           ║');
    console.log('║   🌍 GeoSafe Disaster Management Dashboard                ║');
    console.log('║                                                           ║');
    console.log(`║   🚀 Server running on http://localhost:${PORT}              ║`);
    console.log('║                                                           ║');
    console.log('║   📡 Live Data Sources:                                   ║');
    console.log('║      • USGS Earthquakes                                   ║');
    console.log('║      • NASA EONET Events                                  ║');
    console.log('║      • GDACS Global Alerts                                ║');
    console.log('║      • ReliefWeb Disasters                                ║');
    console.log('║      • NWS Weather Alerts (US)                            ║');
    console.log('║                                                           ║');
    console.log('╚═══════════════════════════════════════════════════════════╝');
    console.log('');
});
