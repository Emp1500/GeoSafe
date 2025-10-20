// API Handler for fetching disaster and safe zone data
const API = {
  baseURL: '/api',
  
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
      return data;
    } catch (error) {
      console.error('Error fetching data:', error);
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
   * Get disasters by type
   */
  async getDisastersByType(type) {
    const disasters = await this.fetchDisasters();
    return disasters.filter(d => d.type.toLowerCase() === type.toLowerCase());
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
  }
};