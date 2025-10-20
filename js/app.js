// Main Application Logic
const App = {
  refreshInterval: 30000, // Refresh every 30 seconds
  autoRefreshTimer: null,

  /**
   * Initialize the application
   */
  async init() {
    try {
      UI.showLoading();
      
      // Initialize map
      MapHandler.init('map');

      // Load initial data
      await this.loadData();

      // Setup event listeners
      this.setupEventListeners();

      // Start auto-refresh
      this.startAutoRefresh();

      UI.showNotification('Dashboard loaded successfully', 'success');
    } catch (error) {
      console.error('Error initializing app:', error);
      UI.showNotification('Error loading dashboard', 'error');
    }
  },

  /**
   * Load data from API
   */
  async loadData() {
    const data = await API.fetchData();
    
    const disasters = data.disasters || [];
    const safeZones = data.safeZones || [];

    // Update map
    MapHandler.addDisasters(disasters);
    MapHandler.addSafeZones(safeZones);

    // Update UI
    UI.displayAlerts(disasters);
    UI.displaySafeZones(safeZones);
    UI.displayStats(disasters, safeZones);
    UI.displayFilters(disasters);
  },

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Manual refresh button
    const refreshBtn = document.getElementById('refresh-btn');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.loadData();
        UI.showNotification('Data refreshed', 'info');
      });
    }

    // Auto-refresh toggle
    const autoRefreshToggle = document.getElementById('auto-refresh-toggle');
    if (autoRefreshToggle) {
      autoRefreshToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
          this.startAutoRefresh();
          UI.showNotification('Auto-refresh enabled', 'info');
        } else {
          this.stopAutoRefresh();
          UI.showNotification('Auto-refresh disabled', 'info');
        }
      });
    }

    // Search/filter by location
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchLocations(e.target.value);
      });
    }
  },

  /**
   * Start auto-refresh
   */
  startAutoRefresh() {
    if (this.autoRefreshTimer) return;
    
    this.autoRefreshTimer = setInterval(async () => {
      await this.loadData();
    }, this.refreshInterval);
  },

  /**
   * Stop auto-refresh
   */
  stopAutoRefresh() {
    if (this.autoRefreshTimer) {
      clearInterval(this.autoRefreshTimer);
      this.autoRefreshTimer = null;
    }
  },

  /**
   * Search locations
   */
  async searchLocations(query) {
    if (!query) {
      await this.loadData();
      return;
    }

    const data = await API.fetchData();
    const disasters = data.disasters || [];
    const safeZones = data.safeZones || [];

    const queryLower = query.toLowerCase();

    const filteredDisasters = disasters.filter(d =>
      d.location.toLowerCase().includes(queryLower) ||
      d.type.toLowerCase().includes(queryLower)
    );

    const filteredSafeZones = safeZones.filter(z =>
      z.name.toLowerCase().includes(queryLower) ||
      z.type.toLowerCase().includes(queryLower) ||
      z.address.toLowerCase().includes(queryLower)
    );

    // Update UI
    UI.displayAlerts(filteredDisasters);
    UI.displaySafeZones(filteredSafeZones);
  }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});