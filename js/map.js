// Map Handler using Leaflet
const MapHandler = {
    map: null,
    markers: {
        disasters: [],
        safeZones: [],
        userLocation: null
    },
    circles: [],
    userCoords: null,
    disasterTypeColors: {
        earthquake: '#ff7f00',
        fire: '#e41a1c',
        wildfire: '#e41a1c',
        flood: '#377eb8',
        hurricane: '#984ea3',
        tornado: '#ffff33',
        epidemic: '#4daf4a',
        war: '#a65628',
        thunderstorm: '#6a5acd',
        tsunami: '#00ced1',
        volcano: '#ff4500',
        drought: '#8B4513',
        snow: '#87CEEB',
        heat: '#FF6347',
        wind: '#708090',
        landslide: '#8B7355',
        dustHaze: '#D2B48C',
        seaLakeIce: '#B0E0E6',
        temperature: '#FF8C00',
        other: '#a65628'
    },

    /**
     * Initialize the map
     */
    init(containerId = 'map') {
        // Create map centered on USA
        this.map = L.map(containerId, {
            zoomControl: false,
            attributionControl: true
        }).setView([39.8283, -98.5795], 4);

        // Add dark theme tiles
        this.addTileLayer();

        // Get user location
        this.getUserLocation();

        // Setup custom controls
        this.setupControls();

        return this.map;
    },

    /**
     * Add tile layer based on theme
     */
    addTileLayer(dark = true) {
        // Remove existing tile layers
        this.map.eachLayer(layer => {
            if (layer instanceof L.TileLayer) {
                this.map.removeLayer(layer);
            }
        });

        if (dark) {
            // Dark theme tiles (CartoDB Dark Matter)
            L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                subdomains: 'abcd',
                maxZoom: 19
            }).addTo(this.map);
        } else {
            // Light theme tiles (CartoDB Positron)
            L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
                attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
                subdomains: 'abcd',
                maxZoom: 19
            }).addTo(this.map);
        }
    },

    /**
     * Setup map controls
     */
    setupControls() {
        // Zoom in
        const zoomIn = document.getElementById('zoom-in');
        if (zoomIn) {
            zoomIn.addEventListener('click', () => {
                this.map.zoomIn();
            });
        }

        // Zoom out
        const zoomOut = document.getElementById('zoom-out');
        if (zoomOut) {
            zoomOut.addEventListener('click', () => {
                this.map.zoomOut();
            });
        }

        // Reset view
        const resetView = document.getElementById('reset-view');
        if (resetView) {
            resetView.addEventListener('click', () => {
                this.map.setView([39.8283, -98.5795], 4);
            });
        }

        // Locate user
        const locateBtn = document.getElementById('locate-btn');
        if (locateBtn) {
            locateBtn.addEventListener('click', () => {
                this.getUserLocation(true);
            });
        }

        // Theme toggle listener
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('change', (e) => {
                this.addTileLayer(e.target.checked);
            });
        }
    },

    /**
     * Get user's current location
     */
    getUserLocation(centerMap = false) {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    this.userCoords = { lat: latitude, lng: longitude };
                    this.addUserMarker(latitude, longitude);

                    if (centerMap) {
                        this.centerMap(latitude, longitude, 12);
                        if (typeof UI !== 'undefined') {
                            UI.showNotification('Location found!', 'success');
                        }
                    }
                },
                (error) => {
                    console.log('Geolocation error:', error);
                    // Default to center of USA if geolocation fails
                    this.userCoords = { lat: 39.8283, lng: -98.5795 };
                    this.addUserMarker(39.8283, -98.5795);

                    if (centerMap && typeof UI !== 'undefined') {
                        UI.showNotification('Could not get your location', 'warning');
                    }
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
            .bindPopup(`
                <div class="popup-content">
                    <h4 class="popup-title"><i class="fas fa-user"></i> Your Location</h4>
                    <p><strong>Latitude:</strong> ${lat.toFixed(4)}</p>
                    <p><strong>Longitude:</strong> ${lng.toFixed(4)}</p>
                </div>
            `);

        this.markers.userLocation = marker;
    },

    /**
     * Add disaster markers to map
     */
    addDisasters(disasters, filters = null, minSeverity = 1) {
        // Clear existing disaster markers
        this.clearDisasterMarkers();

        // Filter disasters if filters provided
        let filteredDisasters = disasters;
        if (filters && filters.length > 0) {
            filteredDisasters = disasters.filter(d =>
                filters.includes(d.type.toLowerCase()) || filters.includes('all')
            );
        }

        // Filter by severity
        filteredDisasters = filteredDisasters.filter(d => d.severity >= minSeverity);

        filteredDisasters.forEach(disaster => {
            const color = this.getDisasterColor(disaster.type);
            const isCritical = disaster.severity >= 8;

            const icon = L.divIcon({
                html: `<div class="marker-disaster ${isCritical ? 'critical' : ''}" style="background-color: ${color};"></div>`,
                iconSize: [28, 28],
                className: 'disaster-marker-wrapper'
            });

            const marker = L.marker([disaster.lat, disaster.lng], { icon: icon })
                .addTo(this.map)
                .bindPopup(this.createDisasterPopup(disaster));

            // Add danger zone circle
            const circle = L.circle([disaster.lat, disaster.lng], {
                color: color,
                fillColor: color,
                fillOpacity: 0.15,
                radius: disaster.radius,
                weight: 2,
                dashArray: isCritical ? '5, 5' : null
            }).addTo(this.map);

            this.markers.disasters.push({ marker, circle, disaster });
        });

        return filteredDisasters.length;
    },

    /**
     * Create disaster popup content
     */
    createDisasterPopup(disaster) {
        const icon = this.getDisasterIcon(disaster.type);
        const severityClass = disaster.severity >= 8 ? 'critical' :
                              disaster.severity >= 5 ? 'warning' : 'normal';
        const severityColor = disaster.severity >= 8 ? '#ef4444' :
                              disaster.severity >= 5 ? '#f59e0b' : '#10b981';

        return `
            <div class="popup-content">
                <h4 class="popup-title">
                    <i class="fas ${icon}" style="color: ${this.getDisasterColor(disaster.type)}"></i>
                    ${this.formatType(disaster.type)}
                </h4>
                <p><strong>Location:</strong> ${disaster.location}</p>
                <p><strong>Severity:</strong> <span style="color: ${severityColor}; font-weight: bold;">${disaster.severity}/10</span></p>
                <p><strong>Radius:</strong> ${(disaster.radius / 1000).toFixed(1)} km</p>
                <p><strong>Description:</strong> ${disaster.description || 'No description available'}</p>
                <p><small>${new Date(disaster.timestamp).toLocaleString()}</small></p>
            </div>
        `;
    },

    /**
     * Get disaster icon
     */
    getDisasterIcon(type) {
        const icons = {
            earthquake: 'fa-house-crack',
            flood: 'fa-water',
            wildfire: 'fa-fire',
            fire: 'fa-fire',
            hurricane: 'fa-wind',
            tornado: 'fa-tornado',
            epidemic: 'fa-virus',
            war: 'fa-bomb',
            thunderstorm: 'fa-cloud-bolt',
            tsunami: 'fa-water',
            volcano: 'fa-volcano',
            drought: 'fa-sun',
            snow: 'fa-snowflake',
            heat: 'fa-temperature-high',
            wind: 'fa-wind',
            landslide: 'fa-mountain',
            dustHaze: 'fa-smog',
            seaLakeIce: 'fa-icicles',
            temperature: 'fa-thermometer-half'
        };
        return icons[type.toLowerCase()] || 'fa-exclamation-triangle';
    },

    /**
     * Clear disaster markers
     */
    clearDisasterMarkers() {
        this.markers.disasters.forEach(item => {
            this.map.removeLayer(item.marker);
            if (item.circle) {
                this.map.removeLayer(item.circle);
            }
        });
        this.markers.disasters = [];
    },

    /**
     * Add safe zone markers to map
     */
    addSafeZones(safeZones, show = true) {
        // Clear existing safe zone markers
        this.clearSafeZoneMarkers();

        if (!show) return;

        safeZones.forEach(zone => {
            const color = this.getSafeZoneColor(zone.type);
            const icon = L.divIcon({
                html: `<div class="marker-safe" style="background-color: ${color};"></div>`,
                iconSize: [26, 26],
                className: 'safe-marker-wrapper'
            });

            const marker = L.marker([zone.lat, zone.lng], { icon: icon })
                .addTo(this.map)
                .bindPopup(this.createSafeZonePopup(zone));

            this.markers.safeZones.push({ marker, zone });
        });
    },

    /**
     * Create safe zone popup content
     */
    createSafeZonePopup(zone) {
        const icon = zone.type === 'hospital' ? 'fa-hospital' :
                     zone.type === 'fire_station' ? 'fa-fire-extinguisher' : 'fa-shield-alt';
        const availability = zone.available > 0 ?
            `<span style="color: #10b981;">${zone.available} spots available</span>` :
            '<span style="color: #ef4444;">Full capacity</span>';

        return `
            <div class="popup-content">
                <h4 class="popup-title">
                    <i class="fas ${icon}" style="color: ${this.getSafeZoneColor(zone.type)}"></i>
                    ${zone.name}
                </h4>
                <p><strong>Type:</strong> ${this.formatType(zone.type)}</p>
                <p><strong>Address:</strong> ${zone.address}</p>
                <p><strong>Capacity:</strong> ${zone.capacity}</p>
                <p><strong>Status:</strong> ${availability}</p>
            </div>
        `;
    },

    /**
     * Clear safe zone markers
     */
    clearSafeZoneMarkers() {
        this.markers.safeZones.forEach(item => {
            this.map.removeLayer(item.marker);
        });
        this.markers.safeZones = [];
    },

    /**
     * Toggle danger zone circles visibility
     */
    toggleDangerZones(show) {
        this.markers.disasters.forEach(item => {
            if (item.circle) {
                if (show) {
                    item.circle.addTo(this.map);
                } else {
                    this.map.removeLayer(item.circle);
                }
            }
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
        const colors = {
            hospital: '#3b82f6',
            shelter: '#10b981',
            fire_station: '#ef4444'
        };
        return colors[type.toLowerCase()] || '#10b981';
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
        this.map.setView([lat, lng], zoom, {
            animate: true,
            duration: 0.5
        });
    },

    /**
     * Filter markers by type and severity
     */
    filterMarkers(typeFilter, severityFilter) {
        this.markers.disasters.forEach(item => {
            const typeMatch = typeFilter === 'all' || item.disaster.type.toLowerCase() === typeFilter.toLowerCase();
            const severityMatch = item.disaster.severity >= severityFilter;
            const isVisible = typeMatch && severityMatch;

            item.marker.setOpacity(isVisible ? 1 : 0.2);
            if (item.circle) {
                item.circle.setStyle({
                    opacity: isVisible ? 0.5 : 0,
                    fillOpacity: isVisible ? 0.15 : 0
                });
            }
        });
    },

    /**
     * Get nearby disasters
     */
    getNearbyDisasters(radiusKm = 500) {
        if (!this.userCoords) return [];

        return this.markers.disasters
            .map(item => ({
                ...item.disaster,
                distance: this.calculateDistance(
                    this.userCoords.lat,
                    this.userCoords.lng,
                    item.disaster.lat,
                    item.disaster.lng
                )
            }))
            .filter(d => d.distance <= radiusKm)
            .sort((a, b) => a.distance - b.distance);
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
     * Get map instance
     */
    getMap() {
        return this.map;
    },

    /**
     * Fit map to show all markers
     */
    fitBounds() {
        const allMarkers = [
            ...this.markers.disasters.map(m => m.marker),
            ...this.markers.safeZones.map(m => m.marker)
        ];

        if (allMarkers.length > 0) {
            const group = new L.featureGroup(allMarkers);
            this.map.fitBounds(group.getBounds().pad(0.1));
        }
    }
};
