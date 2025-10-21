// Map Handler using Leaflet
const MapHandler = {
  map: null,
  markers: {
    disasters: [],
    safeZones: [],
    userLocation: null
  },
  disasterTypeColors: {
    earthquake: '#ff7f00',
    fire: '#e41a1c',
    flood: '#377eb8',
    hurricane: '#984ea3',
    tornado: '#ffff33',
    other: '#a65628'
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

    // Add legend
    this.addLegend();

    return this.map;
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
      if (marker.circle) {
        this.map.removeLayer(marker.circle);
      }
    });
    this.markers.disasters = [];

    disasters.forEach(disaster => {
      const color = this.getDisasterColor(disaster.type);
      const icon = L.divIcon({
        html: `<div class="marker-disaster" style="background-color: ${color};"></div>`,
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

      const circle = L.circle([disaster.lat, disaster.lng], {
        color: color,
        fillColor: color,
        fillOpacity: 0.15,
        radius: disaster.radius,
        weight: 2
      }).addTo(this.map);

      this.markers.disasters.push({ marker, circle, disaster });
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
      const color = this.getSafeZoneColor(zone.type);
      const icon = L.divIcon({
        html: `<div class="marker-safe" style="background-color: ${color};"></div>`,
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
   * Get color for disaster types
   */
  getDisasterColor(type) {
    return this.disasterTypeColors[type.toLowerCase()] || this.disasterTypeColors.other;
  },

  /**
   * Get color for safe zones
   */
  getSafeZoneColor(type) {
    if (type.toLowerCase() === 'hospital') {
      return '#0000ff'; // Blue for hospitals
    }
    return '#00ff00'; // Green for other safe zones
  },

  /**
   * Add legend to the map
   */
  addLegend() {
    // This function is now handled by UI.js
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
   * Filter markers by type and severity
   */
  filterMarkers(typeFilter, severityFilter) {
    this.markers.disasters.forEach(item => {
      const typeMatch = typeFilter === 'all' || item.disaster.type === typeFilter;
      const severityMatch = item.disaster.severity >= severityFilter;
      const isVisible = typeMatch && severityMatch;

      item.marker.setOpacity(isVisible ? 1 : 0.2);
      if (item.circle) {
        item.circle.setStyle({ opacity: isVisible ? 0.5 : 0, fillOpacity: isVisible ? 0.1 : 0 });
      }
    });
  },

  /**
   * Get map instance
   */
  getMap() {
    return this.map;
  }
};