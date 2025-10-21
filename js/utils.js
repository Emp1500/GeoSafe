
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}


function getSeverityClass(severity) {
    const severityMap = {
        'low': 'severity-low',
        'medium': 'severity-medium',
        'high': 'severity-high',
        'critical': 'severity-critical'
    };
    return severityMap[severity.toLowerCase()] || 'severity-medium';
}


function getDisasterClass(disasterType) {
    const typeMap = {
        'earthquake': 'earthquake',
        'flood': 'flood',
        'wildfire': 'wildfire',
        'storm': 'storm'
    };
    return typeMap[disasterType.toLowerCase()] || '';
}


function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

function isValidCoordinate(lat, lng) {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}


if (typeof module !== 'undefined' && module.exports) {
    module.exports = { formatDate, getSeverityClass, getDisasterClass, debounce, isValidCoordinate };
}