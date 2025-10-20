// UI Handler for dynamic updates
const UI = {
  /**
   * Display alerts panel
   */
  displayAlerts(disasters) {
    const alertsContainer = document.getElementById('alerts-container');
    if (!alertsContainer) return;

    if (disasters.length === 0) {
      alertsContainer.innerHTML = '<p class="no-alerts">✓ No active disasters</p>';
      return;
    }

    alertsContainer.innerHTML = disasters.map(disaster => `
      <div class="alert alert-${disaster.type}">
        <div class="alert-header">
          <span class="alert-icon">⚠</span>
          <h4 class="alert-title">${this.formatType(disaster.type)}</h4>
          <span class="alert-severity">Severity: ${disaster.severity}/10</span>
        </div>
        <div class="alert-body">
          <p><strong>${disaster.location}</strong></p>
          <p>${disaster.description}</p>
          <small>${new Date(disaster.timestamp).toLocaleString()}</small>
        </div>
        <div class="alert-footer">
          <button class="btn-small" onclick="MapHandler.centerMap(${disaster.lat}, ${disaster.lng})">
            View on Map
          </button>
        </div>
      </div>
    `).join('');
  },

  /**
   * Display safe zones list
   */
  displaySafeZones(safeZones) {
    const zonesContainer = document.getElementById('safe-zones-container');
    if (!zonesContainer) return;

    if (safeZones.length === 0) {
      zonesContainer.innerHTML = '<p class="no-zones">No safe zones available</p>';
      return;
    }

    zonesContainer.innerHTML = safeZones.map(zone => `
      <div class="safe-zone-card">
        <div class="zone-header">
          <h4 class="zone-name">${zone.name}</h4>
          <span class="zone-type">${this.formatType(zone.type)}</span>
        </div>
        <div class="zone-info">
          <p><strong>Address:</strong> ${zone.address}</p>
          <p><strong>Capacity:</strong> ${zone.capacity}</p>
          <p class="zone-availability">
            Available: <span class="availability-badge">${zone.available}</span>
          </p>
        </div>
        <button class="btn-small" onclick="MapHandler.centerMap(${zone.lat}, ${zone.lng})">
          View on Map
        </button>
      </div>
    `).join('');
  },

  /**
   * Display statistics
   */
  displayStats(disasters, safeZones) {
    const statsContainer = document.getElementById('stats-container');
    if (!statsContainer) return;

    const disastersByType = {};
    disasters.forEach(d => {
      disastersByType[d.type] = (disastersByType[d.type] || 0) + 1;
    });

    const avgSeverity = disasters.length > 0
      ? (disasters.reduce((sum, d) => sum + d.severity, 0) / disasters.length).toFixed(1)
      : 0;

    const totalCapacity = safeZones.reduce((sum, z) => sum + z.capacity, 0);
    const totalAvailable = safeZones.reduce((sum, z) => sum + z.available, 0);

    statsContainer.innerHTML = `
      <div class="stat-card">
        <h5>Active Disasters</h5>
        <p class="stat-number">${disasters.length}</p>
      </div>
      <div class="stat-card">
        <h5>Safe Zones</h5>
        <p class="stat-number">${safeZones.length}</p>
      </div>
      <div class="stat-card">
        <h5>Avg Severity</h5>
        <p class="stat-number">${avgSeverity}</p>
      </div>
      <div class="stat-card">
        <h5>Capacity Available</h5>
        <p class="stat-number">${totalAvailable}/${totalCapacity}</p>
      </div>
    `;
  },

  /**
   * Display disaster types filter
   */
  displayFilters(disasters) {
    const filterContainer = document.getElementById('filters-container');
    if (!filterContainer) return;

    const types = [...new Set(disasters.map(d => d.type))];

    filterContainer.innerHTML = `
      <button class="filter-btn active" onclick="UI.applyFilter('all')">All</button>
      ${types.map(type => `
        <button class="filter-btn" onclick="UI.applyFilter('${type}')">
          ${this.formatType(type)}
        </button>
      `).join('')}
    `;
  },

  /**
   * Apply filter to map
   */
  applyFilter(type) {
    // Update button states
    document.querySelectorAll('.filter-btn').forEach(btn => {
      btn.classList.remove('active');
    });
    event.target.classList.add('active');

    // Filter map
    MapHandler.filterByType(type);
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
   * Show notification
   */
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => notification.remove(), 4000);
  },

  /**
   * Show loading state
   */
  showLoading() {
    const containers = [
      'alerts-container',
      'safe-zones-container',
      'stats-container'
    ];
    containers.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = '<p class="loading">Loading...</p>';
    });
  }
};