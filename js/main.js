document.addEventListener('DOMContentLoaded', () => {
  const map = MapHandler.init('map');

  fetch('/api/disasters')
    .then(response => response.json())
    .then(data => {
      MapHandler.addDisasters(data.disasters);
      MapHandler.addSafeZones(data.safeZones);
    });
});