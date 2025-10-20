// Map Handler using Leaflet
const MapHandler = {
  map: null,
  markers: {
    disasters: [],
    safeZones: [],
    userLocation: null
  },

  /**
   * Initialize the map
   */
  init(containerId = 'map') {
    // Create map centered on USA
    this.map = L.map(containerId).setView([39.8283, -98.5795], 4);

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
      minZoom: 2
    }).addTo(this.map);

    // Get user location
    this.getUserLocation();
  },

  /**
   * Get user's current location
   */
  getUserLocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          this.addUserMarker(latitude, longitude);
        },
        (error) => {
          console.log('Geolocation error:', error);
          // Default to center of USA if geolocation fails
          this.addUserMarker(39.8283, -98.5795);
        }
      );
    }
  },

  /**
   * Add user location marker
   */
  addUserMarker(lat, lng) {
    // Remove existing user marker
    if (this.markers.userLocation) {
      this.map.removeLayer(this.markers.userLocation);
    }

    const userIcon = L.divIcon({
      html: '<div class="marker-user"></div>',
      iconSize: [30, 30],
      className: 'user-marker-wrapper'
    });

    const marker = L.marker([lat, lng], { icon: userIcon })
      .addTo(this.map)
      .bindPopup('Your Location');

    this.markers.userLocation = marker;
  },

  /**
   * Add disaster markers to map
   */
  addDisasters(disasters) {
    // Clear existing disaster markers
    this.markers.disasters.forEach(marker => {
      this.map.removeLayer(marker.marker);
    });
    this.markers.disasters = [];

    disasters.forEach(disaster => {
      const icon = L.divIcon({
        html: `<div class="marker-disaster marker-${disaster.type}"></div>`,
        iconSize: [28, 28],
        className: 'disaster-marker-wrapper'
      });

      const marker = L.marker([disaster.lat, disaster.lng], { icon: icon })
        .addTo(this.map)
        .bindPopup(`
          <div class="popup-content">
            <h4 class="popup-title">${this.formatType(disaster.type)}</h4>
            <p><strong>Location:</strong> ${disaster.location}</p>
            <p><strong>Severity:</strong> ${disaster.severity}/10</p>
            <p><strong>Radius:</strong> ${disaster.radius}m</p>
            <p><small>${new Date(disaster.timestamp).toLocaleString()}</small></p>
          </div>
        `);

      // Add danger radius circle
      L.circle([disaster.lat, disaster.lng], {
        color: this.getDisasterColor(disaster.type),
        fillColor: this.getDisasterColor(disaster.type),
        fillOpacity: 0.15,
        radius: disaster.radius,
        weight: 2
      }).addTo(this.map);

      this.markers.disasters.push({ marker, disaster });
    });
  },

  /**
   * Add safe zone markers to map
   */
  addSafeZones(safeZones) {
    // Clear existing safe zone markers
    this.markers.safeZones.forEach(marker => {
      this.map.removeLayer(marker.marker);
    });
    this.markers.safeZones = [];

    safeZones.forEach(zone => {
      const icon = L.divIcon({
        html: `<div class="marker-safe marker-${zone.type}"></div>`,
        iconSize: [26, 26],
        className: 'safe-marker-wrapper'
      });

      const marker = L.marker([zone.lat, zone.lng], { icon: icon })
        .addTo(this.map)
        .bindPopup(`
          <div class="popup-content">
            <h4 class="popup-title">${zone.name}</h4>
            <p><strong>Type:</strong> ${this.formatType(zone.type)}</p>
            <p><strong>Address:</strong> ${zone.address}</p>
            <p><strong>Capacity:</strong> ${zone.capacity}</p>
            <p><strong>Available:</strong> ${zone.available}</p>
          </div>
        `);

      this.markers.safeZones.push({ marker, zone });
    });
  },

  /**
   * Get color based on disaster type
   */
  getDisasterColor(type) {
    const colors = {
      earthquake: '#ff4444',
      flood: '#0066ff',
      thunderstorm: '#ffaa00',
      tornado: '#660000',
      wildfire: '#ff6600',
      tsunami: '#0099ff',
      hurricane: '#9933ff'
    };
    return colors[type.toLowerCase()] || '#ff0000';
  },

  /**
   * Format type string for display
   */
  formatType(type) {
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  },

  /**
   * Center map on coordinates
   */
  centerMap(lat, lng, zoom = 12) {
    this.map.setView([lat, lng], zoom);
  },

  /**
   * Filter markers by type
   */
  filterByType(type) {
    this.markers.disasters.forEach(item => {
      const isVisible = item.disaster.type.toLowerCase() === type.toLowerCase() || type === 'all';
      item.marker.setOpacity(isVisible ? 1 : 0.3);
    });
  },

  /**
   * Get map instance
   */
  getMap() {
    return this.map;
  }
};