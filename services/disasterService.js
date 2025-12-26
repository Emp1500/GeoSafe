/**
 * Disaster API Service with Advanced Cache Management
 * Features: Retry logic, Circuit breaker, Per-API caching, Stale-while-revalidate
 */

// API Endpoints
const APIS = {
    USGS_EARTHQUAKES: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',
    USGS_SIGNIFICANT: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.geojson',
    NASA_EONET: 'https://eonet.gsfc.nasa.gov/api/v3/events?status=open&limit=50',
    GDACS_RSS: 'https://www.gdacs.org/xml/rss.xml',
    RELIEFWEB: 'https://api.reliefweb.int/v1/disasters?appname=geosafe&limit=20&preset=latest',
    NWS_ALERTS: 'https://api.weather.gov/alerts/active?status=actual&severity=severe,extreme'
};

// ==================== CACHE CONFIGURATION ====================

const CacheConfig = {
    TTL: 5 * 60 * 1000,           // 5 minutes normal TTL
    STALE_TTL: 30 * 60 * 1000,    // 30 minutes stale TTL (serve stale if fresh fails)
    RETRY_ATTEMPTS: 3,             // Number of retry attempts
    RETRY_BASE_DELAY: 1000,        // Base delay for exponential backoff (1 second)
    CIRCUIT_BREAKER_THRESHOLD: 5,  // Failures before circuit opens
    CIRCUIT_BREAKER_TIMEOUT: 60000 // 1 minute before trying again
};

// Per-API cache storage
const apiCache = {
    usgs: { data: null, lastFetch: null, lastSuccess: null },
    nasa: { data: null, lastFetch: null, lastSuccess: null },
    gdacs: { data: null, lastFetch: null, lastSuccess: null },
    reliefweb: { data: null, lastFetch: null, lastSuccess: null },
    nws: { data: null, lastFetch: null, lastSuccess: null }
};

// Combined cache
let combinedCache = {
    disasters: null,
    lastFetch: null
};

// Circuit breaker state for each API
const circuitBreaker = {
    usgs: { failures: 0, lastFailure: null, isOpen: false },
    nasa: { failures: 0, lastFailure: null, isOpen: false },
    gdacs: { failures: 0, lastFailure: null, isOpen: false },
    reliefweb: { failures: 0, lastFailure: null, isOpen: false },
    nws: { failures: 0, lastFailure: null, isOpen: false }
};

// Stats tracking
const stats = {
    totalFetches: 0,
    successfulFetches: 0,
    failedFetches: 0,
    cacheHits: 0,
    staleServes: 0,
    retrySuccesses: 0,
    apiStats: {
        usgs: { success: 0, failed: 0, lastError: null },
        nasa: { success: 0, failed: 0, lastError: null },
        gdacs: { success: 0, failed: 0, lastError: null },
        reliefweb: { success: 0, failed: 0, lastError: null },
        nws: { success: 0, failed: 0, lastError: null }
    }
};

// ==================== UTILITY FUNCTIONS ====================

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(url, options = {}, timeout = 10000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
}

/**
 * Retry wrapper with exponential backoff
 */
async function fetchWithRetry(url, options = {}, apiName) {
    let lastError;

    for (let attempt = 1; attempt <= CacheConfig.RETRY_ATTEMPTS; attempt++) {
        try {
            const response = await fetchWithTimeout(url, options);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            if (attempt > 1) {
                console.log(`✅ ${apiName}: Retry ${attempt} succeeded`);
                stats.retrySuccesses++;
            }

            return response;
        } catch (error) {
            lastError = error;

            if (attempt < CacheConfig.RETRY_ATTEMPTS) {
                const delay = CacheConfig.RETRY_BASE_DELAY * Math.pow(2, attempt - 1);
                console.log(`⚠️ ${apiName}: Attempt ${attempt} failed, retrying in ${delay}ms...`);
                await sleep(delay);
            }
        }
    }

    throw lastError;
}

/**
 * Check if circuit breaker should block request
 */
function isCircuitOpen(apiName) {
    const breaker = circuitBreaker[apiName];

    if (!breaker.isOpen) return false;

    // Check if timeout has passed
    if (Date.now() - breaker.lastFailure > CacheConfig.CIRCUIT_BREAKER_TIMEOUT) {
        console.log(`🔄 ${apiName}: Circuit breaker half-open, allowing test request`);
        return false; // Allow one test request
    }

    return true;
}

/**
 * Record API success (reset circuit breaker)
 */
function recordSuccess(apiName) {
    circuitBreaker[apiName].failures = 0;
    circuitBreaker[apiName].isOpen = false;
    stats.apiStats[apiName].success++;
}

/**
 * Record API failure (potentially open circuit breaker)
 */
function recordFailure(apiName, error) {
    const breaker = circuitBreaker[apiName];
    breaker.failures++;
    breaker.lastFailure = Date.now();
    stats.apiStats[apiName].failed++;
    stats.apiStats[apiName].lastError = error.message;

    if (breaker.failures >= CacheConfig.CIRCUIT_BREAKER_THRESHOLD) {
        breaker.isOpen = true;
        console.log(`🔴 ${apiName}: Circuit breaker OPEN after ${breaker.failures} failures`);
    }
}

/**
 * Check if cache is fresh
 */
function isCacheFresh(cache) {
    return cache.data && cache.lastFetch && (Date.now() - cache.lastFetch < CacheConfig.TTL);
}

/**
 * Check if cache is stale but usable
 */
function isCacheStale(cache) {
    return cache.data && cache.lastFetch && (Date.now() - cache.lastFetch < CacheConfig.STALE_TTL);
}

// ==================== MAIN FETCH FUNCTION ====================

/**
 * Main function to fetch all disaster data with advanced caching
 */
async function fetchAllDisasters(forceRefresh = false) {
    stats.totalFetches++;

    // Check combined cache first (unless force refresh)
    if (!forceRefresh && isCacheFresh(combinedCache)) {
        console.log('📦 Returning fresh cached disaster data');
        stats.cacheHits++;
        return combinedCache.disasters;
    }

    console.log('🌐 Fetching disaster data from APIs...');

    // Fetch from all APIs in parallel
    const results = await Promise.allSettled([
        fetchUSGSWithCache(forceRefresh),
        fetchNASAWithCache(forceRefresh),
        fetchGDACSWithCache(forceRefresh),
        fetchReliefWebWithCache(forceRefresh),
        fetchNWSWithCache(forceRefresh)
    ]);

    // Combine all disasters
    let allDisasters = [];
    const apiNames = ['USGS', 'NASA EONET', 'GDACS', 'ReliefWeb', 'NWS'];

    results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
            allDisasters = allDisasters.concat(result.value.data || []);
            const source = result.value.fromCache ? '(cached)' : '(fresh)';
            console.log(`✅ ${apiNames[index]}: ${(result.value.data || []).length} events ${source}`);
        } else {
            console.log(`❌ ${apiNames[index]}: Failed - ${result.reason?.message || 'Unknown error'}`);
        }
    });

    // If no new data but we have stale cache, use it
    if (allDisasters.length === 0 && isCacheStale(combinedCache)) {
        console.log('📦 Returning stale cached data (all APIs failed)');
        stats.staleServes++;
        return combinedCache.disasters;
    }

    // Process the data
    allDisasters = removeDuplicates(allDisasters);
    allDisasters.sort((a, b) => {
        if (b.severity !== a.severity) return b.severity - a.severity;
        return new Date(b.timestamp) - new Date(a.timestamp);
    });
    allDisasters = allDisasters.map((disaster, index) => ({
        ...disaster,
        id: index + 1
    }));

    // Update combined cache
    combinedCache.disasters = allDisasters;
    combinedCache.lastFetch = Date.now();

    console.log(`📊 Total disasters: ${allDisasters.length}`);
    stats.successfulFetches++;

    return allDisasters;
}

// ==================== PER-API FETCH WITH CACHE ====================

/**
 * Fetch USGS data with per-API caching
 */
async function fetchUSGSWithCache(forceRefresh) {
    const apiName = 'usgs';

    // Check cache
    if (!forceRefresh && isCacheFresh(apiCache.usgs)) {
        return { data: apiCache.usgs.data, fromCache: true };
    }

    // Check circuit breaker
    if (isCircuitOpen(apiName)) {
        console.log(`⏸️ USGS: Circuit open, using cached data`);
        if (apiCache.usgs.data) {
            return { data: apiCache.usgs.data, fromCache: true };
        }
        throw new Error('Circuit breaker open and no cached data');
    }

    try {
        const data = await fetchUSGSEarthquakes();

        // Update cache
        apiCache.usgs.data = data;
        apiCache.usgs.lastFetch = Date.now();
        apiCache.usgs.lastSuccess = Date.now();
        recordSuccess(apiName);

        return { data, fromCache: false };
    } catch (error) {
        recordFailure(apiName, error);

        // Return stale cache if available
        if (isCacheStale(apiCache.usgs)) {
            console.log(`📦 USGS: Returning stale cache after error`);
            stats.staleServes++;
            return { data: apiCache.usgs.data, fromCache: true };
        }

        throw error;
    }
}

/**
 * Fetch NASA data with per-API caching
 */
async function fetchNASAWithCache(forceRefresh) {
    const apiName = 'nasa';

    if (!forceRefresh && isCacheFresh(apiCache.nasa)) {
        return { data: apiCache.nasa.data, fromCache: true };
    }

    if (isCircuitOpen(apiName)) {
        if (apiCache.nasa.data) {
            return { data: apiCache.nasa.data, fromCache: true };
        }
        throw new Error('Circuit breaker open and no cached data');
    }

    try {
        const data = await fetchNASAEONET();
        apiCache.nasa.data = data;
        apiCache.nasa.lastFetch = Date.now();
        apiCache.nasa.lastSuccess = Date.now();
        recordSuccess(apiName);
        return { data, fromCache: false };
    } catch (error) {
        recordFailure(apiName, error);
        if (isCacheStale(apiCache.nasa)) {
            stats.staleServes++;
            return { data: apiCache.nasa.data, fromCache: true };
        }
        throw error;
    }
}

/**
 * Fetch GDACS data with per-API caching
 */
async function fetchGDACSWithCache(forceRefresh) {
    const apiName = 'gdacs';

    if (!forceRefresh && isCacheFresh(apiCache.gdacs)) {
        return { data: apiCache.gdacs.data, fromCache: true };
    }

    if (isCircuitOpen(apiName)) {
        if (apiCache.gdacs.data) {
            return { data: apiCache.gdacs.data, fromCache: true };
        }
        throw new Error('Circuit breaker open and no cached data');
    }

    try {
        const data = await fetchGDACS();
        apiCache.gdacs.data = data;
        apiCache.gdacs.lastFetch = Date.now();
        apiCache.gdacs.lastSuccess = Date.now();
        recordSuccess(apiName);
        return { data, fromCache: false };
    } catch (error) {
        recordFailure(apiName, error);
        if (isCacheStale(apiCache.gdacs)) {
            stats.staleServes++;
            return { data: apiCache.gdacs.data, fromCache: true };
        }
        throw error;
    }
}

/**
 * Fetch ReliefWeb data with per-API caching
 */
async function fetchReliefWebWithCache(forceRefresh) {
    const apiName = 'reliefweb';

    if (!forceRefresh && isCacheFresh(apiCache.reliefweb)) {
        return { data: apiCache.reliefweb.data, fromCache: true };
    }

    if (isCircuitOpen(apiName)) {
        if (apiCache.reliefweb.data) {
            return { data: apiCache.reliefweb.data, fromCache: true };
        }
        throw new Error('Circuit breaker open and no cached data');
    }

    try {
        const data = await fetchReliefWeb();
        apiCache.reliefweb.data = data;
        apiCache.reliefweb.lastFetch = Date.now();
        apiCache.reliefweb.lastSuccess = Date.now();
        recordSuccess(apiName);
        return { data, fromCache: false };
    } catch (error) {
        recordFailure(apiName, error);
        if (isCacheStale(apiCache.reliefweb)) {
            stats.staleServes++;
            return { data: apiCache.reliefweb.data, fromCache: true };
        }
        throw error;
    }
}

/**
 * Fetch NWS data with per-API caching
 */
async function fetchNWSWithCache(forceRefresh) {
    const apiName = 'nws';

    if (!forceRefresh && isCacheFresh(apiCache.nws)) {
        return { data: apiCache.nws.data, fromCache: true };
    }

    if (isCircuitOpen(apiName)) {
        if (apiCache.nws.data) {
            return { data: apiCache.nws.data, fromCache: true };
        }
        throw new Error('Circuit breaker open and no cached data');
    }

    try {
        const data = await fetchNWSAlerts();
        apiCache.nws.data = data;
        apiCache.nws.lastFetch = Date.now();
        apiCache.nws.lastSuccess = Date.now();
        recordSuccess(apiName);
        return { data, fromCache: false };
    } catch (error) {
        recordFailure(apiName, error);
        if (isCacheStale(apiCache.nws)) {
            stats.staleServes++;
            return { data: apiCache.nws.data, fromCache: true };
        }
        throw error;
    }
}

// ==================== API FETCHERS WITH RETRY ====================

/**
 * Fetch USGS Earthquake data with retry
 */
async function fetchUSGSEarthquakes() {
    const [dailyRes, significantRes] = await Promise.all([
        fetchWithRetry(APIS.USGS_EARTHQUAKES, {}, 'USGS Daily'),
        fetchWithRetry(APIS.USGS_SIGNIFICANT, {}, 'USGS Significant')
    ]);

    const dailyData = await dailyRes.json();
    const significantData = await significantRes.json();

    const allFeatures = [...dailyData.features, ...significantData.features];
    const uniqueFeatures = Array.from(
        new Map(allFeatures.map(f => [f.id, f])).values()
    );

    return uniqueFeatures
        .filter(feature => feature.properties.mag >= 2.5)
        .map(feature => ({
            type: 'earthquake',
            severity: mapMagnitudeToSeverity(feature.properties.mag),
            lat: feature.geometry.coordinates[1],
            lng: feature.geometry.coordinates[0],
            location: feature.properties.place || 'Unknown Location',
            description: `Magnitude ${feature.properties.mag} earthquake. Depth: ${feature.geometry.coordinates[2]}km`,
            radius: calculateEarthquakeRadius(feature.properties.mag),
            timestamp: new Date(feature.properties.time).toISOString(),
            source: 'USGS',
            sourceId: feature.id,
            magnitude: feature.properties.mag,
            url: feature.properties.url
        }));
}

/**
 * Fetch NASA EONET events with retry
 */
async function fetchNASAEONET() {
    const response = await fetchWithRetry(APIS.NASA_EONET, {}, 'NASA EONET');
    const data = await response.json();

    return data.events
        .filter(event => event.geometry && event.geometry.length > 0)
        .map(event => {
            const latestGeometry = event.geometry[event.geometry.length - 1];
            const coords = latestGeometry.coordinates;

            return {
                type: mapEONETCategory(event.categories[0]?.id),
                severity: mapEONETSeverity(event.categories[0]?.id),
                lat: Array.isArray(coords[0]) ? coords[0][1] : coords[1],
                lng: Array.isArray(coords[0]) ? coords[0][0] : coords[0],
                location: event.title,
                description: `${event.title}. Source: NASA EONET`,
                radius: getDefaultRadius(mapEONETCategory(event.categories[0]?.id)),
                timestamp: latestGeometry.date || new Date().toISOString(),
                source: 'NASA EONET',
                sourceId: event.id,
                url: event.sources?.[0]?.url
            };
        });
}

/**
 * Fetch GDACS alerts with retry
 */
async function fetchGDACS() {
    const response = await fetchWithRetry(APIS.GDACS_RSS, {}, 'GDACS');
    const xmlText = await response.text();

    const items = xmlText.match(/<item>[\s\S]*?<\/item>/g) || [];

    return items.map(item => {
        const title = extractXMLTag(item, 'title');
        const description = extractXMLTag(item, 'description');
        const pubDate = extractXMLTag(item, 'pubDate');
        const lat = parseFloat(extractXMLTag(item, 'geo:lat') || extractXMLTag(item, 'gdacs:lat')) || 0;
        const lng = parseFloat(extractXMLTag(item, 'geo:long') || extractXMLTag(item, 'gdacs:long')) || 0;
        const alertLevel = extractXMLTag(item, 'gdacs:alertlevel') || 'Green';
        const eventType = extractXMLTag(item, 'gdacs:eventtype') || '';
        const link = extractXMLTag(item, 'link');

        if (lat === 0 && lng === 0) return null;

        return {
            type: mapGDACSEventType(eventType),
            severity: mapGDACSAlertLevel(alertLevel),
            lat,
            lng,
            location: title,
            description: cleanHTML(description),
            radius: getDefaultRadius(mapGDACSEventType(eventType)),
            timestamp: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
            source: 'GDACS',
            sourceId: `gdacs-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            alertLevel,
            url: link
        };
    }).filter(Boolean);
}

/**
 * Fetch ReliefWeb disasters with retry
 */
async function fetchReliefWeb() {
    const response = await fetchWithRetry(APIS.RELIEFWEB, {}, 'ReliefWeb');
    const data = await response.json();

    if (!data.data || !Array.isArray(data.data)) {
        return [];
    }

    return data.data
        .filter(item => item.fields?.primary_country?.location)
        .map(item => {
            const fields = item.fields;
            const location = fields.primary_country?.location;

            return {
                type: mapReliefWebType(fields.primary_type?.name),
                severity: mapReliefWebSeverity(fields.status),
                lat: location?.lat || 0,
                lng: location?.lon || 0,
                location: `${fields.name} - ${fields.primary_country?.name || 'Unknown'}`,
                description: fields.description || fields.name,
                radius: getDefaultRadius(mapReliefWebType(fields.primary_type?.name)),
                timestamp: fields.date?.created || new Date().toISOString(),
                source: 'ReliefWeb',
                sourceId: `rw-${item.id}`,
                status: fields.status,
                url: fields.url_alias
            };
        })
        .filter(d => d.lat !== 0 && d.lng !== 0);
}

/**
 * Fetch NWS Weather Alerts with retry
 */
async function fetchNWSAlerts() {
    const response = await fetchWithRetry(APIS.NWS_ALERTS, {
        headers: {
            'User-Agent': 'GeoSafe Disaster Dashboard (contact@example.com)'
        }
    }, 'NWS');
    const data = await response.json();

    return (data.features || [])
        .filter(feature => {
            const geo = feature.geometry;
            return geo && (geo.type === 'Point' || (geo.type === 'Polygon' && geo.coordinates));
        })
        .slice(0, 30)
        .map(feature => {
            const props = feature.properties;
            let lat, lng;

            if (feature.geometry.type === 'Point') {
                [lng, lat] = feature.geometry.coordinates;
            } else if (feature.geometry.type === 'Polygon') {
                const coords = feature.geometry.coordinates[0];
                lat = coords.reduce((sum, c) => sum + c[1], 0) / coords.length;
                lng = coords.reduce((sum, c) => sum + c[0], 0) / coords.length;
            }

            return {
                type: mapNWSEventType(props.event),
                severity: mapNWSSeverity(props.severity),
                lat,
                lng,
                location: props.areaDesc || 'United States',
                description: props.headline || props.event,
                radius: getDefaultRadius(mapNWSEventType(props.event)),
                timestamp: props.effective || new Date().toISOString(),
                source: 'NWS',
                sourceId: props.id,
                expires: props.expires,
                url: `https://alerts.weather.gov`
            };
        })
        .filter(d => d.lat && d.lng);
}

// ==================== HELPER FUNCTIONS ====================

function mapMagnitudeToSeverity(magnitude) {
    if (magnitude >= 8) return 10;
    if (magnitude >= 7) return 9;
    if (magnitude >= 6) return 8;
    if (magnitude >= 5) return 7;
    if (magnitude >= 4) return 5;
    if (magnitude >= 3) return 3;
    return 2;
}

function calculateEarthquakeRadius(magnitude) {
    const baseRadius = 10000;
    return Math.round(baseRadius * Math.pow(2, magnitude - 3));
}

function mapEONETCategory(categoryId) {
    const categoryMap = {
        6: 'drought', 7: 'dustHaze', 8: 'wildfire', 9: 'flood',
        10: 'hurricane', 12: 'volcano', 13: 'flood', 14: 'landslide',
        15: 'seaLakeIce', 16: 'earthquake', 17: 'snow', 18: 'temperature'
    };
    return categoryMap[categoryId] || 'other';
}

function mapEONETSeverity(categoryId) {
    const severityMap = { 8: 8, 10: 9, 12: 8, 9: 6, 16: 7 };
    return severityMap[categoryId] || 5;
}

function mapGDACSEventType(eventType) {
    const typeMap = {
        'EQ': 'earthquake', 'TC': 'hurricane', 'FL': 'flood',
        'VO': 'volcano', 'DR': 'drought', 'WF': 'wildfire'
    };
    return typeMap[eventType] || 'other';
}

function mapGDACSAlertLevel(level) {
    const levelMap = { 'Red': 9, 'Orange': 7, 'Green': 4 };
    return levelMap[level] || 5;
}

function mapReliefWebType(typeName) {
    if (!typeName) return 'other';
    const name = typeName.toLowerCase();
    if (name.includes('earthquake')) return 'earthquake';
    if (name.includes('flood')) return 'flood';
    if (name.includes('cyclone') || name.includes('hurricane') || name.includes('typhoon')) return 'hurricane';
    if (name.includes('volcano')) return 'volcano';
    if (name.includes('drought')) return 'drought';
    if (name.includes('fire') || name.includes('wildfire')) return 'wildfire';
    if (name.includes('epidemic') || name.includes('outbreak')) return 'epidemic';
    if (name.includes('conflict') || name.includes('war')) return 'war';
    if (name.includes('tornado')) return 'tornado';
    return 'other';
}

function mapReliefWebSeverity(status) {
    if (status === 'alert') return 8;
    if (status === 'ongoing') return 6;
    if (status === 'past') return 3;
    return 5;
}

function mapNWSEventType(event) {
    if (!event) return 'other';
    const e = event.toLowerCase();
    if (e.includes('tornado')) return 'tornado';
    if (e.includes('hurricane') || e.includes('tropical')) return 'hurricane';
    if (e.includes('flood')) return 'flood';
    if (e.includes('fire')) return 'wildfire';
    if (e.includes('earthquake')) return 'earthquake';
    if (e.includes('tsunami')) return 'tsunami';
    if (e.includes('winter') || e.includes('blizzard') || e.includes('snow')) return 'snow';
    if (e.includes('thunder') || e.includes('storm')) return 'thunderstorm';
    if (e.includes('wind')) return 'wind';
    if (e.includes('heat')) return 'heat';
    return 'thunderstorm';
}

function mapNWSSeverity(severity) {
    const severityMap = {
        'Extreme': 10, 'Severe': 8, 'Moderate': 6, 'Minor': 4, 'Unknown': 5
    };
    return severityMap[severity] || 5;
}

function getDefaultRadius(type) {
    const radiusMap = {
        earthquake: 50000, hurricane: 200000, tornado: 15000, flood: 30000,
        wildfire: 25000, volcano: 40000, epidemic: 100000, war: 150000,
        tsunami: 100000, thunderstorm: 20000, drought: 200000, other: 20000
    };
    return radiusMap[type] || 20000;
}

function extractXMLTag(xml, tag) {
    const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const match = xml.match(regex);
    return match ? match[1].trim() : '';
}

function cleanHTML(html) {
    return html
        .replace(/<[^>]*>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 200);
}

function removeDuplicates(disasters) {
    const unique = [];
    const threshold = 0.1;

    for (const disaster of disasters) {
        const isDuplicate = unique.some(existing =>
            Math.abs(existing.lat - disaster.lat) < threshold &&
            Math.abs(existing.lng - disaster.lng) < threshold &&
            existing.type === disaster.type
        );

        if (!isDuplicate) {
            unique.push(disaster);
        }
    }

    return unique;
}

// ==================== CACHE MANAGEMENT ====================

/**
 * Get safe zones
 */
function getSafeZones() {
    try {
        return require('../data/sample-data.json').safeZones || [];
    } catch {
        return [];
    }
}

/**
 * Clear all caches
 */
function clearCache() {
    combinedCache.disasters = null;
    combinedCache.lastFetch = null;

    Object.keys(apiCache).forEach(key => {
        apiCache[key].data = null;
        apiCache[key].lastFetch = null;
    });

    console.log('🗑️ All caches cleared');
}

/**
 * Clear cache for specific API
 */
function clearAPICache(apiName) {
    if (apiCache[apiName]) {
        apiCache[apiName].data = null;
        apiCache[apiName].lastFetch = null;
        console.log(`🗑️ ${apiName} cache cleared`);
    }
}

/**
 * Reset circuit breaker for specific API
 */
function resetCircuitBreaker(apiName) {
    if (circuitBreaker[apiName]) {
        circuitBreaker[apiName].failures = 0;
        circuitBreaker[apiName].isOpen = false;
        circuitBreaker[apiName].lastFailure = null;
        console.log(`🔄 ${apiName} circuit breaker reset`);
    }
}

/**
 * Reset all circuit breakers
 */
function resetAllCircuitBreakers() {
    Object.keys(circuitBreaker).forEach(key => {
        circuitBreaker[key].failures = 0;
        circuitBreaker[key].isOpen = false;
        circuitBreaker[key].lastFailure = null;
    });
    console.log('🔄 All circuit breakers reset');
}

/**
 * Get cache status for all APIs
 */
function getCacheStatus() {
    const now = Date.now();

    return {
        combined: {
            hasCachedData: !!combinedCache.disasters,
            itemCount: combinedCache.disasters?.length || 0,
            lastFetch: combinedCache.lastFetch ? new Date(combinedCache.lastFetch).toISOString() : null,
            age: combinedCache.lastFetch ? Math.round((now - combinedCache.lastFetch) / 1000) + 's' : null,
            isFresh: isCacheFresh(combinedCache),
            isStale: !isCacheFresh(combinedCache) && isCacheStale(combinedCache)
        },
        apis: Object.keys(apiCache).reduce((acc, key) => {
            acc[key] = {
                hasCachedData: !!apiCache[key].data,
                itemCount: apiCache[key].data?.length || 0,
                lastFetch: apiCache[key].lastFetch ? new Date(apiCache[key].lastFetch).toISOString() : null,
                lastSuccess: apiCache[key].lastSuccess ? new Date(apiCache[key].lastSuccess).toISOString() : null,
                age: apiCache[key].lastFetch ? Math.round((now - apiCache[key].lastFetch) / 1000) + 's' : null,
                isFresh: isCacheFresh(apiCache[key]),
                circuitBreaker: {
                    isOpen: circuitBreaker[key].isOpen,
                    failures: circuitBreaker[key].failures,
                    lastFailure: circuitBreaker[key].lastFailure ? new Date(circuitBreaker[key].lastFailure).toISOString() : null
                }
            };
            return acc;
        }, {})
    };
}

/**
 * Get fetch statistics
 */
function getStats() {
    return {
        ...stats,
        cacheHitRate: stats.totalFetches > 0
            ? ((stats.cacheHits / stats.totalFetches) * 100).toFixed(1) + '%'
            : '0%',
        successRate: stats.totalFetches > 0
            ? ((stats.successfulFetches / stats.totalFetches) * 100).toFixed(1) + '%'
            : '0%'
    };
}

/**
 * Reset statistics
 */
function resetStats() {
    stats.totalFetches = 0;
    stats.successfulFetches = 0;
    stats.failedFetches = 0;
    stats.cacheHits = 0;
    stats.staleServes = 0;
    stats.retrySuccesses = 0;

    Object.keys(stats.apiStats).forEach(key => {
        stats.apiStats[key].success = 0;
        stats.apiStats[key].failed = 0;
        stats.apiStats[key].lastError = null;
    });

    console.log('📊 Stats reset');
}

// ==================== EXPORTS ====================

module.exports = {
    fetchAllDisasters,
    getSafeZones,
    clearCache,
    clearAPICache,
    resetCircuitBreaker,
    resetAllCircuitBreakers,
    getCacheStatus,
    getStats,
    resetStats,
    CacheConfig
};
