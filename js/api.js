

class DisasterAPI {
    constructor() {
        this.baseURL = ''; 
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; 
    }

    async fetchDisasters() {
        try {
            console.log('📡 Fetching disaster data from server...');
            
            const response = await fetch('/api/disasters');
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('✅ Disaster data loaded successfully:', data.disasters.length, 'events');
            
            return data.disasters;
        } catch (error) {
            console.error('❌ Error fetching disaster data:', error);
            
            
            console.log('🔄 Using sample data as fallback...');
            return this.getSampleData();
        }
    }

    getSampleData() {
      
        return [
            {
                id: "1",
                title: "Earthquake - California",
                type: "earthquake",
                severity: "high",
                magnitude: 5.8,
                location: { lat: 34.0522, lng: -118.2437 },
                description: "Moderate earthquake reported in Los Angeles area",
                timestamp: new Date().toISOString(),
                affectedAreas: ["Los Angeles", "Santa Monica"],
                source: "USGS"
            },
            {
                id: "2",
                title: "Wildfire - Australia",
                type: "wildfire",
                severity: "critical",
                area: "1500 hectares",
                location: { lat: -33.8688, lng: 151.2093 },
                description: "Large bushfire spreading rapidly in Sydney outskirts",
                timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
                affectedAreas: ["Sydney", "Blue Mountains"],
                source: "NASA EONET"
            }
        ];
    }

  
    async fetchFromUSGS() {
        
        return [];
    }

    async fetchFromEONET() {
       
        return [];
    }
}


const disasterAPI = new DisasterAPI();