<div align="center">
  <h1>🌍 GeoSafe</h1>
  <h3>Live Disaster Management Dashboard</h3>

  <p>
    <b>Real-time global disaster monitoring with live data from USGS, NASA, GDACS & more</b>
  </p>

  <p>
    <img src="https://img.shields.io/badge/version-2.0.0-blue?style=flat-square" alt="Version">
    <img src="https://img.shields.io/badge/node-%3E%3D14.0.0-green?style=flat-square" alt="Node">
    <img src="https://img.shields.io/badge/license-MIT-orange?style=flat-square" alt="License">
  </p>
</div>

---

## Overview

GeoSafe is a real-time disaster monitoring dashboard that aggregates live data from multiple global sources to display earthquakes, wildfires, floods, hurricanes, and other disasters on an interactive map. Users can track disaster locations, filter by type and severity, and identify nearby safe zones.

### Live Data Sources

| Source | Data Types | Coverage |
|--------|-----------|----------|
| **USGS** | Earthquakes | Worldwide |
| **NASA EONET** | Wildfires, Volcanoes, Storms | Worldwide |
| **GDACS** | All major disasters | Worldwide |
| **ReliefWeb** | Humanitarian crises, Conflicts | Worldwide |
| **NWS** | Severe weather alerts | United States |

---

## Features

### Core Features
- **Live Data** - Real-time disaster data from 5+ global APIs
- **Interactive Map** - Leaflet.js powered map with dark/light themes
- **Location Tracking** - See exactly where disasters are happening
- **Smart Filtering** - Filter by disaster type and severity level
- **Auto Refresh** - Updates every 30 seconds automatically
- **Responsive Design** - Works on desktop, tablet, and mobile

### UI Features
- **Collapsible Sidebar** - Toggle for more map space
- **Active Locations List** - Click to zoom to any disaster
- **Info Cards** - Detailed disaster information on click
- **Live Ticker** - Scrolling alerts at bottom of screen
- **Dark/Light Mode** - Toggle theme with one click
- **Toast Notifications** - Non-intrusive status updates

---

## Tech Stack

<p>
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/Express.js-000000?style=for-the-badge&logo=express&logoColor=white" alt="Express">
  <img src="https://img.shields.io/badge/Leaflet-199900?style=for-the-badge&logo=leaflet&logoColor=white" alt="Leaflet.js">
  <img src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="JavaScript">
  <img src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white" alt="CSS3">
</p>

| Layer | Technology |
|-------|------------|
| Frontend | Vanilla JS, Leaflet.js, CSS3 |
| Backend | Node.js, Express.js |
| APIs | USGS, NASA EONET, GDACS, ReliefWeb, NWS |
| Map Tiles | CartoDB (Dark/Light) |

---

## Quick Start

### Prerequisites

- Node.js 14+ and npm installed

```bash
node -v  # Should be 14.0.0 or higher
npm -v
```

### Installation

```bash
# Clone the repository
git clone https://github.com/Emp1500/GeoSafe.git

# Navigate to project directory
cd disaster-management-dashboard

# Install dependencies
npm install

# Start the server
npm start
```

Open **http://localhost:3000** in your browser.

---

## Usage

### Navigation

| Action | How To |
|--------|--------|
| Toggle Sidebar | Click `☰` hamburger menu |
| View Location | Click any item in "Active Locations" list |
| Filter Disasters | Click filter chips (earthquake, fire, etc.) |
| Adjust Severity | Drag the severity slider |
| Toggle Theme | Click moon/sun icon |
| Refresh Data | Click refresh icon |
| Find My Location | Click crosshairs icon |

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Esc` | Close info card |
| `+` / `-` | Zoom in/out (when map focused) |

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/disasters` | GET | All disasters + safe zones |
| `/api/disasters/earthquakes` | GET | Earthquakes only |
| `/api/disasters/weather` | GET | Weather-related events |
| `/api/disasters/stats` | GET | Statistics summary |
| `/api/safe-zones` | GET | Safe zones only |
| `/api/sources` | GET | List data sources |
| `/api/cache/clear` | POST | Force refresh data |
| `/health` | GET | Server health check |

### Example Response

```json
{
  "disasters": [
    {
      "id": 1,
      "type": "earthquake",
      "severity": 9,
      "lat": 41.0027,
      "lng": 142.1714,
      "location": "Aomori Prefecture, Japan",
      "description": "Magnitude 7.6 earthquake. Depth: 45km",
      "radius": 242515,
      "timestamp": "2025-12-08T14:15:10.460Z",
      "source": "USGS"
    }
  ],
  "safeZones": [...],
  "meta": {
    "totalDisasters": 191,
    "sources": ["USGS", "NASA EONET", "GDACS", "ReliefWeb", "NWS"]
  }
}
```

---

## Project Structure

```
disaster-management-dashboard/
├── index.html              # Main HTML file
├── server.js               # Express server
├── package.json            # Dependencies
├── css/
│   ├── style.css           # Main styles (dark theme)
│   └── responsive.css      # Mobile responsiveness
├── js/
│   ├── api.js              # API client
│   ├── app.js              # Main application logic
│   ├── map.js              # Leaflet map handler
│   ├── ui.js               # UI components & interactions
│   └── utils.js            # Utility functions
├── services/
│   └── disasterService.js  # External API aggregation
└── data/
    └── sample-data.json    # Fallback/safe zones data
```

---

## Configuration

Create a `.env` file (optional):

```env
PORT=3000
NODE_ENV=development
```

---

## Disaster Types Supported

| Type | Icon | Color |
|------|------|-------|
| Earthquake | 🏚️ | Orange |
| Wildfire | 🔥 | Red |
| Flood | 💧 | Blue |
| Hurricane | 🌀 | Purple |
| Tornado | 🌪️ | Yellow |
| Volcano | 🌋 | Red-Orange |
| Drought | ☀️ | Brown |
| Thunderstorm | ⛈️ | Purple |

---

## Roadmap

- [x] Live API integration (USGS, NASA, GDACS)
- [x] Real-time earthquake monitoring
- [x] Wildfire tracking
- [x] Clean, minimal UI redesign
- [x] Location list with click-to-zoom
- [x] Dark/Light theme toggle
- [ ] Push notifications for nearby disasters
- [ ] Sound alerts for critical events
- [ ] User location-based filtering
- [ ] Historical disaster data view
- [ ] Export data to CSV/PDF

---

## Contributing

Contributions are welcome!

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/NewFeature`)
3. Commit your changes (`git commit -m 'Add NewFeature'`)
4. Push to the branch (`git push origin feature/NewFeature`)
5. Open a Pull Request

---

## License

Distributed under the MIT License. See `LICENSE` for more information.

---

## Contact

**Vedant Wagh** - vedantwagh539@gmail.com

Project Link: [https://github.com/Emp1500/GeoSafe](https://github.com/Emp1500/GeoSafe)

---

<div align="center">
  <p>Built with ❤️ for disaster awareness and safety</p>
</div>
