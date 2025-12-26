// API Handler for fetching disaster and safe zone data
const API = {
    baseURL: '/api',
    lastFetchTime: null,
    cachedData: null,

    /**
     * Fetch all disasters and safe zones
     */
    async fetchData() {
        try {
            const response = await fetch(`${this.baseURL}/disasters`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();

            // Cache the data
            this.cachedData = data;
            this.lastFetchTime = Date.now();

            // Log metadata
            if (data.meta) {
                console.log(`📊 Fetched ${data.meta.totalDisasters} disasters from ${data.meta.sources.join(', ')}`);
            }

            return data;
        } catch (error) {
            console.error('Error fetching data:', error);

            // Return cached data if available
            if (this.cachedData) {
                console.log('📦 Returning cached data due to fetch error');
                return this.cachedData;
            }

            return { disasters: [], safeZones: [] };
        }
    },

    /**
     * Fetch only disasters
     */
    async fetchDisasters() {
        const data = await this.fetchData();
        return data.disasters || [];
    },

    /**
     * Fetch only safe zones
     */
    async fetchSafeZones() {
        const data = await this.fetchData();
        return data.safeZones || [];
    },

    /**
     * Fetch earthquake data specifically
     */
    async fetchEarthquakes() {
        try {
            const response = await fetch(`${this.baseURL}/disasters/earthquakes`);
            if (!response.ok) throw new Error('Failed to fetch earthquakes');
            const data = await response.json();
            return data.earthquakes || [];
        } catch (error) {
            console.error('Error fetching earthquakes:', error);
            return [];
        }
    },

    /**
     * Fetch weather-related disasters
     */
    async fetchWeatherDisasters() {
        try {
            const response = await fetch(`${this.baseURL}/disasters/weather`);
            if (!response.ok) throw new Error('Failed to fetch weather data');
            const data = await response.json();
            return data.weather || [];
        } catch (error) {
            console.error('Error fetching weather disasters:', error);
            return [];
        }
    },

    /**
     * Fetch disaster statistics
     */
    async fetchStats() {
        try {
            const response = await fetch(`${this.baseURL}/disasters/stats`);
            if (!response.ok) throw new Error('Failed to fetch stats');
            return await response.json();
        } catch (error) {
            console.error('Error fetching stats:', error);
            return null;
        }
    },

    /**
     * Get disasters by type
     */
    async getDisastersByType(type) {
        const disasters = await this.fetchDisasters();
        return disasters.filter(d => d.type.toLowerCase() === type.toLowerCase());
    },

    /**
     * Get disasters by severity
     */
    async getDisastersBySeverity(minSeverity) {
        const disasters = await this.fetchDisasters();
        return disasters.filter(d => d.severity >= minSeverity);
    },

    /**
     * Get safe zones by type
     */
    async getSafeZonesByType(type) {
        const safeZones = await this.fetchSafeZones();
        return safeZones.filter(sz => sz.type.toLowerCase() === type.toLowerCase());
    },

    /**
     * Get nearest safe zones to coordinates
     */
    async getNearestSafeZones(lat, lng, limit = 5) {
        const safeZones = await this.fetchSafeZones();

        // Calculate distance for each safe zone
        const withDistance = safeZones.map(zone => ({
            ...zone,
            distance: this.calculateDistance(lat, lng, zone.lat, zone.lng)
        }));

        // Sort by distance and return top results
        return withDistance
            .sort((a, b) => a.distance - b.distance)
            .slice(0, limit);
    },

    /**
     * Get nearest disasters to coordinates
     */
    async getNearestDisasters(lat, lng, limit = 10) {
        const disasters = await this.fetchDisasters();

        const withDistance = disasters.map(disaster => ({
            ...disaster,
            distance: this.calculateDistance(lat, lng, disaster.lat, disaster.lng)
        }));

        return withDistance
            .sort((a, b) => a.distance - b.distance)
            .slice(0, limit);
    },

    /**
     * Calculate distance between two coordinates (Haversine formula)
     */
    calculateDistance(lat1, lng1, lat2, lng2) {
        const R = 6371; // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    },

    /**
     * Clear server cache
     */
    async clearCache() {
        try {
            const response = await fetch(`${this.baseURL}/cache/clear`, {
                method: 'POST'
            });
            if (!response.ok) throw new Error('Failed to clear cache');
            console.log('🗑️ Server cache cleared');
            return true;
        } catch (error) {
            console.error('Error clearing cache:', error);
            return false;
        }
    },

    /**
     * Get data sources info
     */
    async getSources() {
        try {
            const response = await fetch(`${this.baseURL}/sources`);
            if (!response.ok) throw new Error('Failed to fetch sources');
            return await response.json();
        } catch (error) {
            console.error('Error fetching sources:', error);
            return null;
        }
    },

    /**
     * Health check
     */
    async healthCheck() {
        try {
            const response = await fetch('/health');
            if (!response.ok) throw new Error('Health check failed');
            return await response.json();
        } catch (error) {
            console.error('Health check error:', error);
            return { status: 'ERROR', error: error.message };
        }
    }
};
