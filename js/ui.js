// UI Handler - Clean Minimal Version
const UI = {
    elements: {},
    activeFilters: ['all'],

    init() {
        this.cacheElements();
        this.bindEvents();
    },

    cacheElements() {
        this.elements = {
            // Core
            loadingOverlay: document.getElementById('loading-overlay'),
            sidebar: document.getElementById('sidebar'),
            sidebarToggle: document.getElementById('sidebar-toggle'),

            // Header
            liveCount: document.getElementById('live-count'),
            searchInput: document.getElementById('search-input'),
            refreshBtn: document.getElementById('refresh-btn'),
            locateBtn: document.getElementById('locate-btn'),
            themeBtn: document.getElementById('theme-btn'),

            // Stats
            statCritical: document.getElementById('stat-critical'),
            statWarning: document.getElementById('stat-warning'),
            statSafe: document.getElementById('stat-safe'),

            // Filters
            disasterFilters: document.getElementById('disaster-filters'),
            severityFilter: document.getElementById('severity-filter'),
            severityValue: document.getElementById('severity-value'),

            // Locations
            locationList: document.getElementById('location-list'),

            // Settings
            autoRefreshToggle: document.getElementById('auto-refresh-toggle'),
            dangerZonesToggle: document.getElementById('danger-zones-toggle'),
            safeZonesToggle: document.getElementById('safe-zones-toggle'),

            // Map controls
            zoomIn: document.getElementById('zoom-in'),
            zoomOut: document.getElementById('zoom-out'),
            resetView: document.getElementById('reset-view'),

            // Info card
            infoCard: document.getElementById('info-card'),
            infoType: document.getElementById('info-type'),
            infoLocation: document.getElementById('info-location'),
            infoSeverity: document.getElementById('info-severity'),
            infoTime: document.getElementById('info-time'),
            infoSource: document.getElementById('info-source'),
            infoDescription: document.getElementById('info-description'),

            // Ticker
            tickerText: document.getElementById('ticker-text'),

            // Toast
            toastContainer: document.getElementById('toast-container')
        };
    },

    bindEvents() {
        // Sidebar toggle
        if (this.elements.sidebarToggle) {
            this.elements.sidebarToggle.addEventListener('click', () => {
                this.elements.sidebar.classList.toggle('collapsed');
            });
        }

        // Theme toggle
        if (this.elements.themeBtn) {
            this.elements.themeBtn.addEventListener('click', () => {
                document.body.classList.toggle('light');
                const isLight = document.body.classList.contains('light');
                this.elements.themeBtn.innerHTML = isLight ?
                    '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';

                // Update map tiles
                if (typeof MapHandler !== 'undefined') {
                    MapHandler.addTileLayer(!isLight);
                }
            });
        }

        // Severity slider
        if (this.elements.severityFilter) {
            this.elements.severityFilter.addEventListener('input', (e) => {
                this.elements.severityValue.textContent = e.target.value;
            });
        }

        // Filter chips
        if (this.elements.disasterFilters) {
            this.elements.disasterFilters.addEventListener('click', (e) => {
                const chip = e.target.closest('.chip');
                if (!chip) return;

                const type = chip.dataset.type;

                if (type === 'all') {
                    // Clear all and activate only "All"
                    this.elements.disasterFilters.querySelectorAll('.chip').forEach(c => {
                        c.classList.remove('active');
                    });
                    chip.classList.add('active');
                    this.activeFilters = ['all'];
                } else {
                    // Remove "All" if individual filter clicked
                    const allChip = this.elements.disasterFilters.querySelector('[data-type="all"]');
                    allChip?.classList.remove('active');

                    chip.classList.toggle('active');

                    // Update active filters
                    this.activeFilters = Array.from(
                        this.elements.disasterFilters.querySelectorAll('.chip.active')
                    ).map(c => c.dataset.type).filter(t => t !== 'all');

                    // If none selected, select "All"
                    if (this.activeFilters.length === 0) {
                        allChip?.classList.add('active');
                        this.activeFilters = ['all'];
                    }
                }
            });
        }
    },

    // Toggle sidebar sections
    toggleSection(sectionName) {
        const section = document.querySelector(`[data-section="${sectionName}"]`);
        if (section) {
            section.classList.toggle('expanded');
        }
    },

    // Show/hide loading
    showLoading() {
        this.elements.loadingOverlay?.classList.remove('hidden');
    },

    hideLoading() {
        this.elements.loadingOverlay?.classList.add('hidden');
    },

    // Toast notifications
    showToast(message, type = 'info') {
        const container = this.elements.toastContainer;
        if (!container) return;

        const icons = {
            success: 'fa-check-circle',
            error: 'fa-times-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.innerHTML = `<i class="fas ${icons[type]}"></i><span>${message}</span>`;

        container.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('hiding');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    // Update stats
    updateStats(disasters, safeZones) {
        const critical = disasters.filter(d => d.severity >= 8).length;
        const warning = disasters.filter(d => d.severity >= 5 && d.severity < 8).length;

        if (this.elements.liveCount) {
            this.elements.liveCount.textContent = disasters.length;
        }
        if (this.elements.statCritical) {
            this.elements.statCritical.textContent = critical;
        }
        if (this.elements.statWarning) {
            this.elements.statWarning.textContent = warning;
        }
        if (this.elements.statSafe) {
            this.elements.statSafe.textContent = safeZones.length;
        }
    },

    // Update location list
    updateLocationList(disasters) {
        const list = this.elements.locationList;
        if (!list) return;

        // Sort by severity and take top 20
        const sorted = [...disasters]
            .sort((a, b) => b.severity - a.severity)
            .slice(0, 20);

        if (sorted.length === 0) {
            list.innerHTML = '<div class="location-item"><div class="location-info"><span class="location-name" style="color: var(--text-muted);">No active disasters</span></div></div>';
            return;
        }

        list.innerHTML = sorted.map(d => {
            const severityClass = d.severity >= 8 ? 'critical' : d.severity >= 5 ? 'warning' : 'minor';
            const severityLabel = d.severity >= 8 ? 'high' : d.severity >= 5 ? 'medium' : 'low';
            const icon = this.getDisasterIcon(d.type);
            const timeAgo = this.getTimeAgo(d.timestamp);

            return `
                <div class="location-item" data-lat="${d.lat}" data-lng="${d.lng}" data-id="${d.id}">
                    <div class="location-icon ${severityClass}">
                        <i class="fas ${icon}"></i>
                    </div>
                    <div class="location-info">
                        <div class="location-name">${d.location}</div>
                        <div class="location-meta">
                            <span>${this.formatType(d.type)}</span>
                            <span>${timeAgo}</span>
                        </div>
                    </div>
                    <span class="location-severity ${severityLabel}">${d.severity}/10</span>
                </div>
            `;
        }).join('');

        // Add click handlers
        list.querySelectorAll('.location-item').forEach(item => {
            item.addEventListener('click', () => {
                const lat = parseFloat(item.dataset.lat);
                const lng = parseFloat(item.dataset.lng);
                const id = parseInt(item.dataset.id);

                if (typeof MapHandler !== 'undefined') {
                    MapHandler.centerMap(lat, lng, 8);
                }

                // Show info card
                const disaster = disasters.find(d => d.id === id);
                if (disaster) {
                    this.showInfoCard(disaster);
                }
            });
        });
    },

    // Show info card
    showInfoCard(disaster) {
        const card = this.elements.infoCard;
        if (!card) return;

        this.elements.infoType.textContent = this.formatType(disaster.type);
        this.elements.infoType.style.background = this.getTypeColor(disaster.type);
        this.elements.infoLocation.textContent = disaster.location;
        this.elements.infoSeverity.textContent = `${disaster.severity}/10`;
        this.elements.infoTime.textContent = this.getTimeAgo(disaster.timestamp);
        this.elements.infoSource.textContent = disaster.source || 'Unknown';
        this.elements.infoDescription.textContent = disaster.description || '';

        card.classList.remove('hidden');
    },

    hideInfoCard() {
        this.elements.infoCard?.classList.add('hidden');
    },

    // Update ticker
    updateTicker(disasters) {
        const ticker = this.elements.tickerText;
        if (!ticker) return;

        if (disasters.length === 0) {
            ticker.textContent = 'No active disasters reported. Stay safe!';
            return;
        }

        const items = disasters
            .sort((a, b) => b.severity - a.severity)
            .slice(0, 10)
            .map(d => {
                const icon = this.getDisasterIcon(d.type);
                return `<i class="fas ${icon}"></i> ${d.location} (${d.severity}/10)`;
            });

        ticker.innerHTML = items.join(' &nbsp;&nbsp;•&nbsp;&nbsp; ');
    },

    // Set refresh button spinning
    setRefreshSpinning(spinning) {
        this.elements.refreshBtn?.classList.toggle('spinning', spinning);
    },

    // Get active filters
    getActiveFilters() {
        return this.activeFilters;
    },

    // Get min severity
    getMinSeverity() {
        return parseInt(this.elements.severityFilter?.value || 1);
    },

    // Helper: Get disaster icon
    getDisasterIcon(type) {
        const icons = {
            earthquake: 'fa-house-crack',
            flood: 'fa-water',
            wildfire: 'fa-fire',
            fire: 'fa-fire',
            hurricane: 'fa-wind',
            tornado: 'fa-tornado',
            volcano: 'fa-volcano',
            thunderstorm: 'fa-cloud-bolt',
            drought: 'fa-sun',
            snow: 'fa-snowflake',
            heat: 'fa-temperature-high',
            epidemic: 'fa-virus',
            war: 'fa-bomb'
        };
        return icons[type?.toLowerCase()] || 'fa-exclamation-triangle';
    },

    // Helper: Get type color
    getTypeColor(type) {
        const colors = {
            earthquake: '#ff7f00',
            flood: '#377eb8',
            wildfire: '#e41a1c',
            fire: '#e41a1c',
            hurricane: '#984ea3',
            tornado: '#d29922',
            volcano: '#ff4500',
            thunderstorm: '#6a5acd',
            drought: '#8B4513'
        };
        return colors[type?.toLowerCase()] || '#f85149';
    },

    // Helper: Format type
    formatType(type) {
        if (!type) return 'Unknown';
        return type.charAt(0).toUpperCase() + type.slice(1).replace(/_/g, ' ');
    },

    // Helper: Time ago
    getTimeAgo(timestamp) {
        if (!timestamp) return '';
        const now = new Date();
        const date = new Date(timestamp);
        const seconds = Math.floor((now - date) / 1000);

        if (seconds < 60) return 'Just now';
        if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
        if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
        return `${Math.floor(seconds / 86400)}d ago`;
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => UI.init());
