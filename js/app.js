// Main Application - Clean Version
const App = {
    refreshInterval: 30000,
    autoRefreshTimer: null,
    disasters: [],
    safeZones: [],

    async init() {
        try {
            // Initialize map
            MapHandler.init('map');

            // Load initial data
            await this.loadData();

            // Setup event listeners
            this.setupEventListeners();

            // Start auto-refresh
            if (this.isAutoRefreshEnabled()) {
                this.startAutoRefresh();
            }

            // Hide loading
            setTimeout(() => {
                UI.hideLoading();
                UI.showToast('Dashboard loaded', 'success');
            }, 800);

        } catch (error) {
            console.error('Init error:', error);
            UI.hideLoading();
            UI.showToast('Error loading dashboard', 'error');
        }
    },

    async loadData() {
        try {
            UI.setRefreshSpinning(true);

            const data = await API.fetchData();
            this.disasters = data.disasters || [];
            this.safeZones = data.safeZones || [];

            // Apply filters and update map
            this.applyFilters();

            // Update UI components
            UI.updateStats(this.disasters, this.safeZones);
            UI.updateLocationList(this.disasters);
            UI.updateTicker(this.disasters);

        } catch (error) {
            console.error('Load error:', error);
            UI.showToast('Error loading data', 'error');
        } finally {
            UI.setRefreshSpinning(false);
        }
    },

    applyFilters() {
        const filters = UI.getActiveFilters();
        const minSeverity = UI.getMinSeverity();
        const showDangerZones = this.isSettingEnabled('danger-zones-toggle');
        const showSafeZones = this.isSettingEnabled('safe-zones-toggle');

        // Filter disasters
        let filtered = this.disasters;
        if (!filters.includes('all')) {
            filtered = this.disasters.filter(d =>
                filters.includes(d.type.toLowerCase())
            );
        }
        filtered = filtered.filter(d => d.severity >= minSeverity);

        // Update map
        MapHandler.addDisasters(filtered);
        MapHandler.addSafeZones(this.safeZones, showSafeZones);

        if (!showDangerZones) {
            MapHandler.toggleDangerZones(false);
        }

        // Update location list with filtered data
        UI.updateLocationList(filtered);
        UI.updateStats(filtered, this.safeZones);
    },

    setupEventListeners() {
        // Refresh button
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', async () => {
                await this.loadData();
                UI.showToast('Data refreshed', 'success');
            });
        }

        // Auto-refresh toggle
        const autoRefresh = document.getElementById('auto-refresh-toggle');
        if (autoRefresh) {
            autoRefresh.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.startAutoRefresh();
                    UI.showToast('Auto-refresh on', 'info');
                } else {
                    this.stopAutoRefresh();
                    UI.showToast('Auto-refresh off', 'info');
                }
            });
        }

        // Search
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            let timeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    this.searchLocations(e.target.value);
                }, 300);
            });
        }

        // Severity filter
        const severityFilter = document.getElementById('severity-filter');
        if (severityFilter) {
            severityFilter.addEventListener('change', () => {
                this.applyFilters();
            });
        }

        // Disaster type filters
        const disasterFilters = document.getElementById('disaster-filters');
        if (disasterFilters) {
            disasterFilters.addEventListener('click', () => {
                setTimeout(() => this.applyFilters(), 50);
            });
        }

        // Toggle settings
        ['danger-zones-toggle', 'safe-zones-toggle'].forEach(id => {
            const toggle = document.getElementById(id);
            if (toggle) {
                toggle.addEventListener('change', () => {
                    this.applyFilters();
                });
            }
        });

        // Locate user
        const locateBtn = document.getElementById('locate-btn');
        if (locateBtn) {
            locateBtn.addEventListener('click', () => {
                MapHandler.getUserLocation(true);
            });
        }
    },

    searchLocations(query) {
        if (!query.trim()) {
            this.applyFilters();
            return;
        }

        const q = query.toLowerCase();
        const filtered = this.disasters.filter(d =>
            d.location.toLowerCase().includes(q) ||
            d.type.toLowerCase().includes(q)
        );

        MapHandler.clearDisasterMarkers();
        MapHandler.addDisasters(filtered);
        UI.updateLocationList(filtered);

        if (filtered.length > 0) {
            MapHandler.centerMap(filtered[0].lat, filtered[0].lng, 6);
        }
    },

    isSettingEnabled(id) {
        const el = document.getElementById(id);
        return el ? el.checked : true;
    },

    isAutoRefreshEnabled() {
        return this.isSettingEnabled('auto-refresh-toggle');
    },

    startAutoRefresh() {
        if (this.autoRefreshTimer) return;
        this.autoRefreshTimer = setInterval(() => {
            this.loadData();
        }, this.refreshInterval);
    },

    stopAutoRefresh() {
        if (this.autoRefreshTimer) {
            clearInterval(this.autoRefreshTimer);
            this.autoRefreshTimer = null;
        }
    }
};

// Start app
document.addEventListener('DOMContentLoaded', () => App.init());
