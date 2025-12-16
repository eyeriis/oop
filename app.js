/* ============================================
   Baghdad Streets - Main Application
   ============================================ */

// ============================================
// Map Initialization
// ============================================
const map = L.map('map').setView([33.3152, 44.3661], 12);

// Map Layers
const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
});

const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: '© Esri'
});

const darkLayer = L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png', {
    maxZoom: 19
});

const darkLightLayer = L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png', {
    maxZoom: 19
});

// State
let currentRoute = null;
let currentMapLayer = osmLayer;
let pickMode = null;
let currentSlide = 0;
const totalSlides = 9;

// Add default layer
osmLayer.addTo(map);

// ============================================
// Map Layer Functions
// ============================================
function setMapLayer(layer) {
    if (currentMapLayer) map.removeLayer(currentMapLayer);
    currentMapLayer = layer;
    layer.addTo(map);
}

// ============================================
// Dark Mode
// ============================================
document.getElementById('darkToggle').onclick = () => {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    document.getElementById('darkToggle').textContent = isDark ? '☀️' : '🌙';
    localStorage.setItem('darkMode', isDark);
    setMapLayer(isDark ? darkLightLayer : osmLayer);
};

// Load dark mode preference
if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark');
    document.getElementById('darkToggle').textContent = '☀️';
    setMapLayer(darkLightLayer);
}

// ============================================
// Tabs
// ============================================
document.querySelectorAll('.tab-btn:not(#oopTabBtn)').forEach(btn => {
    btn.onclick = () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
        if (btn.dataset.tab === 'history') loadHistory();
        if (btn.dataset.tab === 'favorites') loadFavorites();
    };
});

// ============================================
// OOP Presentation
// ============================================
const dotsContainer = document.getElementById('oopDots');

// Create dots
for (let i = 0; i < totalSlides; i++) {
    const dot = document.createElement('div');
    dot.className = 'oop-dot' + (i === 0 ? ' active' : '');
    dot.onclick = () => goToSlide(i);
    dotsContainer.appendChild(dot);
}

function goToSlide(n) {
    currentSlide = n;
    document.getElementById('oopSlider').style.transform = `translateX(-${n * 100}%)`;
    document.querySelectorAll('.oop-dot').forEach((d, i) => d.classList.toggle('active', i === n));
}

document.getElementById('oopTabBtn').onclick = () => {
    document.getElementById('oopOverlay').classList.add('active');
    goToSlide(0);
};

document.getElementById('oopClose').onclick = () => {
    document.getElementById('oopOverlay').classList.remove('active');
};

document.getElementById('oopPrev').onclick = () => {
    if (currentSlide > 0) goToSlide(currentSlide - 1);
};

document.getElementById('oopNext').onclick = () => {
    if (currentSlide < totalSlides - 1) goToSlide(currentSlide + 1);
};

// Keyboard navigation
document.addEventListener('keydown', (e) => {
    if (!document.getElementById('oopOverlay').classList.contains('active')) return;
    if (e.key === 'ArrowLeft') document.getElementById('oopPrev').click();
    if (e.key === 'ArrowRight') document.getElementById('oopNext').click();
    if (e.key === 'Escape') document.getElementById('oopClose').click();
});

// ============================================
// Sidebar Toggle
// ============================================
document.getElementById('sidebarToggle').onclick = () => {
    const sidebar = document.getElementById('sidebar');
    const btn = document.getElementById('sidebarToggle');
    document.body.classList.toggle('sidebar-collapsed');
    sidebar.classList.toggle('hidden');
    btn.textContent = sidebar.classList.contains('hidden') ? '▶' : '◀';
    setTimeout(() => map.invalidateSize(), 350);
};

// ============================================
// Helper Functions
// ============================================
function showError(msg) {
    const el = document.getElementById('error');
    el.textContent = '❌ ' + msg;
    el.style.display = 'block';
    setTimeout(() => el.style.display = 'none', 5000);
}

function showSuccess(msg) {
    const el = document.getElementById('success');
    el.textContent = '✅ ' + msg;
    el.style.display = 'block';
    setTimeout(() => el.style.display = 'none', 3000);
}

function clearMap() {
    map.eachLayer(layer => {
        if (layer instanceof L.CircleMarker || layer instanceof L.Polyline || layer instanceof L.Circle) {
            map.removeLayer(layer);
        }
    });
}

// ============================================
// GPS Location
// ============================================
document.getElementById('myLocationBtn').onclick = (e) => {
    e.preventDefault();
    if (!navigator.geolocation) {
        showError('GPS not supported');
        return;
    }
    
    if (location.protocol !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
        showError('⚠️ GPS requires HTTPS. Using IP-based location (less accurate).');
    }
    
    showSuccess('📡 Requesting GPS... Please wait');
    
    let bestAccuracy = Infinity;
    let bestPosition = null;
    let attempts = 0;
    let watchId = null;
    
    const updateUI = (pos, final = false) => {
        document.getElementById('origin').value = `${pos.latitude.toFixed(6)},${pos.longitude.toFixed(6)}`;
        
        map.eachLayer(layer => {
            if (layer._myLocationMarker) map.removeLayer(layer);
        });
        
        const accCircle = L.circle([pos.latitude, pos.longitude], {
            radius: pos.accuracy,
            color: pos.accuracy > 500 ? '#ff6b6b' : '#0066ff',
            fillOpacity: 0.1,
            weight: 1
        }).addTo(map);
        accCircle._myLocationMarker = true;
        
        const locMarker = L.circleMarker([pos.latitude, pos.longitude], {
            radius: 8,
            fillColor: pos.accuracy > 500 ? '#ff6b6b' : '#0066ff',
            color: '#fff',
            weight: 3,
            fillOpacity: 1
        }).addTo(map);
        locMarker._myLocationMarker = true;
        
        if (pos.accuracy > 500) {
            locMarker.bindPopup(`⚠️ Low Accuracy Location<br><small>±${Math.round(pos.accuracy)}m (IP-based)</small><br><small style="color:#ff6b6b;">Use phone with GPS for better accuracy</small>`).openPopup();
        } else {
            locMarker.bindPopup(`📍 Your Location<br><small>Accuracy: ±${Math.round(pos.accuracy)}m</small>`).openPopup();
        }
        
        map.setView([pos.latitude, pos.longitude], pos.accuracy > 500 ? 14 : 17);
        
        if (final) {
            if (pos.accuracy > 500) {
                showError(`⚠️ Low accuracy (±${Math.round(pos.accuracy)}m). This is IP-based, not GPS. Try on a phone with GPS enabled.`);
            } else if (pos.accuracy > 100) {
                showSuccess(`📍 Location found (±${Math.round(pos.accuracy)}m) - Move outside for better GPS`);
            } else {
                showSuccess(`✅ GPS Location found! (±${Math.round(pos.accuracy)}m)`);
            }
        }
    };
    
    watchId = navigator.geolocation.watchPosition(
        (pos) => {
            attempts++;
            const { latitude, longitude, accuracy } = pos.coords;
            
            console.log(`GPS attempt ${attempts}: accuracy=${accuracy}m`);
            
            if (accuracy < bestAccuracy) {
                bestAccuracy = accuracy;
                bestPosition = { latitude, longitude, accuracy };
                updateUI(bestPosition, false);
                showSuccess(`📡 GPS accuracy: ±${Math.round(accuracy)}m${accuracy > 100 ? ' (improving...)' : ''}`);
            }
            
            if (accuracy < 30 || attempts >= 8) {
                navigator.geolocation.clearWatch(watchId);
                updateUI(bestPosition, true);
            }
        },
        (err) => {
            console.error('GPS error:', err);
            if (err.code === 1) {
                showError('❌ Location permission denied. Please allow location access.');
            } else if (err.code === 2) {
                showError('❌ GPS unavailable. Make sure location services are enabled.');
            } else if (err.code === 3) {
                showError('❌ GPS timeout. Try again outside with clear sky view.');
            } else {
                showError(`❌ GPS error: ${err.message}`);
            }
        },
        {
            enableHighAccuracy: true,
            timeout: 60000,
            maximumAge: 0
        }
    );
    
    setTimeout(() => {
        if (watchId) {
            navigator.geolocation.clearWatch(watchId);
            if (bestPosition) {
                updateUI(bestPosition, true);
            } else {
                showError('❌ Could not get GPS location. Try again outside.');
            }
        }
    }, 15000);
};

// Favorites GPS
document.getElementById('favGpsBtn').onclick = (e) => {
    e.preventDefault();
    if (!navigator.geolocation) {
        showError('GPS not supported');
        return;
    }
    showSuccess('Getting precise location...');
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            document.getElementById('favCoords').value = `${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)}`;
            showSuccess(`Coordinates set! (±${Math.round(pos.coords.accuracy)}m)`);
        },
        (err) => showError(`GPS error: ${err.message}`),
        { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 }
    );
};

// ============================================
// Pick on Map
// ============================================
document.getElementById('pickOriginBtn').onclick = () => {
    pickMode = 'origin';
    showSuccess('🗺️ Click on the map to set your ORIGIN location');
    document.getElementById('map').style.cursor = 'crosshair';
};

document.getElementById('pickDestBtn').onclick = () => {
    pickMode = 'destination';
    showSuccess('🗺️ Click on the map to set your DESTINATION location');
    document.getElementById('map').style.cursor = 'crosshair';
};

map.on('click', (e) => {
    if (!pickMode) return;
    
    const { lat, lng } = e.latlng;
    const coords = `${lat.toFixed(6)},${lng.toFixed(6)}`;
    
    if (pickMode === 'origin') {
        document.getElementById('origin').value = coords;
        
        map.eachLayer(layer => { if (layer._pickOrigin) map.removeLayer(layer); });
        const marker = L.circleMarker([lat, lng], {
            radius: 10, fillColor: '#16a34a', color: '#fff', weight: 3, fillOpacity: 1
        }).addTo(map);
        marker._pickOrigin = true;
        marker.bindPopup('🟢 Origin: Your location').openPopup();
        
        showSuccess('✅ Origin set! Now pick destination or click Find Route');
    } else {
        document.getElementById('destination').value = coords;
        
        map.eachLayer(layer => { if (layer._pickDest) map.removeLayer(layer); });
        const marker = L.circleMarker([lat, lng], {
            radius: 10, fillColor: '#dc2626', color: '#fff', weight: 3, fillOpacity: 1
        }).addTo(map);
        marker._pickDest = true;
        marker.bindPopup('🔴 Destination').openPopup();
        
        showSuccess('✅ Destination set! Click Find Route');
    }
    
    pickMode = null;
    document.getElementById('map').style.cursor = '';
});

// ============================================
// Geocoding
// ============================================
async function geocode(addr) {
    if (/^[-\d.,\s]+$/.test(addr)) {
        const p = addr.split(',').map(x => parseFloat(x.trim()));
        if (p.length === 2 && !isNaN(p[0]) && !isNaN(p[1])) return [p[1], p[0]];
    }
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addr + ', Baghdad, Iraq')}&limit=1`);
    const data = await res.json();
    return data.length ? [parseFloat(data[0].lon), parseFloat(data[0].lat)] : null;
}

// ============================================
// Route Form
// ============================================
document.getElementById('routeForm').onsubmit = async (e) => {
    e.preventDefault();
    const origin = document.getElementById('origin').value.trim();
    const dest = document.getElementById('destination').value.trim();
    
    if (!origin || !dest) {
        showError('Enter origin and destination');
        return;
    }
    
    const waypoints = Array.from(document.querySelectorAll('.waypoint-input'))
        .map(i => i.value.trim())
        .filter(v => v);
    
    document.getElementById('loading').style.display = 'block';
    document.getElementById('findBtn').disabled = true;
    
    try {
        const coords = [];
        for (let addr of [origin, ...waypoints, dest]) {
            const c = await geocode(addr);
            if (!c) throw new Error(`Not found: "${addr}"`);
            coords.push(c);
        }
        
        const url = `https://router.project-osrm.org/route/v1/driving/${coords.map(c => c.join(',')).join(';')}?overview=full&geometries=geojson&steps=true`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (data.code !== 'Ok') throw new Error('Route not found');
        
        const route = data.routes[0];
        const routeCoords = route.geometry.coordinates.map(c => [c[1], c[0]]);
        
        const directions = [];
        route.legs?.forEach(leg => leg.steps?.forEach(step => {
            if (step.maneuver) {
                directions.push({
                    instruction: `${step.maneuver.type} ${step.maneuver.modifier || ''} on ${step.name || 'road'}`,
                    distance: (step.distance / 1000).toFixed(2)
                });
            }
        }));
        
        currentRoute = {
            coordinates: routeCoords,
            distance: route.distance / 1000,
            time: Math.round(route.duration / 60),
            originInput: origin,
            destInput: dest,
            directions
        };
        
        clearMap();
        
        L.circleMarker([coords[0][1], coords[0][0]], {
            radius: 10, fillColor: '#4CAF50', color: '#fff', weight: 3, fillOpacity: 0.9
        }).addTo(map).bindPopup('🟢 Origin');
        
        L.circleMarker([coords[coords.length-1][1], coords[coords.length-1][0]], {
            radius: 10, fillColor: '#f44336', color: '#fff', weight: 3, fillOpacity: 0.9
        }).addTo(map).bindPopup('🔴 Destination');
        
        L.polyline(routeCoords, { color: '#2196F3', weight: 5 }).addTo(map);
        map.fitBounds(L.latLngBounds(routeCoords), { padding: [50, 50] });
        
        document.getElementById('distance').textContent = currentRoute.distance.toFixed(1);
        document.getElementById('time').textContent = currentRoute.time;
        document.getElementById('routeStats').style.display = 'grid';
        
        showSuccess(`Route: ${currentRoute.distance.toFixed(1)} km, ${currentRoute.time} min`);
        saveHistory(origin, dest, currentRoute.distance, currentRoute.time);
        
        document.getElementById('directionsList').innerHTML = directions.slice(0, 15)
            .map((d, i) => `<div class="item-card" style="cursor:default;"><b>${i+1}.</b> ${d.instruction} (${d.distance} km)</div>`)
            .join('') || '<p style="color:#888;">No directions</p>';
            
    } catch (err) {
        showError(err.message);
    } finally {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('findBtn').disabled = false;
    }
};

// ============================================
// Waypoints
// ============================================
document.getElementById('addWaypointBtn').onclick = () => {
    const div = document.createElement('div');
    div.className = 'waypoint-row';
    div.innerHTML = '<input type="text" class="waypoint-input" placeholder="Stop"><button type="button" class="small-btn danger-btn">✕</button>';
    div.querySelector('button').onclick = () => div.remove();
    document.getElementById('waypointsContainer').appendChild(div);
};

// ============================================
// Clear Route
// ============================================
document.getElementById('clearBtn').onclick = () => {
    clearMap();
    document.getElementById('origin').value = '';
    document.getElementById('destination').value = '';
    document.getElementById('waypointsContainer').innerHTML = '';
    document.getElementById('routeStats').style.display = 'none';
    currentRoute = null;
};

// ============================================
// History
// ============================================
function saveHistory(o, d, dist, t) {
    let h = JSON.parse(localStorage.getItem('routeHistory') || '[]');
    h.unshift({
        origin: o,
        dest: d,
        distance: dist.toFixed(1),
        time: t,
        date: new Date().toLocaleString()
    });
    localStorage.setItem('routeHistory', JSON.stringify(h.slice(0, 20)));
}

function loadHistory() {
    const h = JSON.parse(localStorage.getItem('routeHistory') || '[]');
    document.getElementById('historyList').innerHTML = h.length
        ? h.map(r => `<div class="item-card" onclick="document.getElementById('origin').value='${r.origin}';document.getElementById('destination').value='${r.dest}';document.querySelector('[data-tab=route]').click();"><b>${r.origin}</b> → <b>${r.dest}</b><br><small>${r.distance} km • ${r.time} min</small></div>`).join('')
        : '<p style="color:#888;">No routes</p>';
}

document.getElementById('clearHistoryBtn').onclick = () => {
    localStorage.removeItem('routeHistory');
    loadHistory();
    showSuccess('Cleared');
};

// ============================================
// Favorites
// ============================================
document.getElementById('saveFavBtn').onclick = () => {
    const n = document.getElementById('favName').value.trim();
    const c = document.getElementById('favCoords').value.trim();
    
    if (!n || !c) {
        showError('Enter name and coords');
        return;
    }
    
    let f = JSON.parse(localStorage.getItem('favorites') || '[]');
    f.push({ name: n, coords: c });
    localStorage.setItem('favorites', JSON.stringify(f));
    
    document.getElementById('favName').value = '';
    document.getElementById('favCoords').value = '';
    showSuccess('Saved!');
    loadFavorites();
};

function loadFavorites() {
    const f = JSON.parse(localStorage.getItem('favorites') || '[]');
    document.getElementById('favList').innerHTML = f.length
        ? f.map((x, i) => `<div class="item-card" onclick="document.getElementById('origin').value='${x.coords}';document.querySelector('[data-tab=route]').click();">📍 <b>${x.name}</b><br><small>${x.coords}</small><button class="small-btn danger-btn" style="float:right;margin-top:-18px;" onclick="event.stopPropagation();deleteFav(${i});">✕</button></div>`).join('')
        : '<p style="color:#888;">No favorites</p>';
}

function deleteFav(i) {
    let f = JSON.parse(localStorage.getItem('favorites') || '[]');
    f.splice(i, 1);
    localStorage.setItem('favorites', JSON.stringify(f));
    loadFavorites();
}

// ============================================
// Export
// ============================================
document.getElementById('exportGeoJSON').onclick = () => exportRoute('geojson');
document.getElementById('exportGPX').onclick = () => exportRoute('gpx');
document.getElementById('exportCSV').onclick = () => exportRoute('csv');

function exportRoute(fmt) {
    if (!currentRoute) {
        showError('Find route first');
        return;
    }
    
    let data, fn, type;
    
    if (fmt === 'geojson') {
        data = JSON.stringify({
            type: 'FeatureCollection',
            features: [{
                type: 'Feature',
                geometry: {
                    type: 'LineString',
                    coordinates: currentRoute.coordinates.map(c => [c[1], c[0]])
                },
                properties: {
                    distance: currentRoute.distance,
                    time: currentRoute.time
                }
            }]
        }, null, 2);
        fn = 'route.geojson';
        type = 'application/json';
    } else if (fmt === 'gpx') {
        data = `<?xml version="1.0"?><gpx version="1.1"><trk><name>Route</name><trkseg>${currentRoute.coordinates.map(c => `<trkpt lat="${c[0]}" lon="${c[1]}"></trkpt>`).join('')}</trkseg></trk></gpx>`;
        fn = 'route.gpx';
        type = 'application/gpx+xml';
    } else {
        data = 'lat,lon\n' + currentRoute.coordinates.map(c => `${c[0]},${c[1]}`).join('\n');
        fn = 'route.csv';
        type = 'text/csv';
    }
    
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([data], { type }));
    a.download = fn;
    a.click();
    showSuccess(`Exported ${fmt.toUpperCase()}`);
}

// ============================================
// Map Style
// ============================================
document.getElementById('mapStyle').onchange = (e) => {
    [osmLayer, satelliteLayer, darkLayer].forEach(l => map.removeLayer(l));
    const layers = { osm: osmLayer, satellite: satelliteLayer, dark: darkLayer };
    layers[e.target.value].addTo(map);
};

// ============================================
// Share
// ============================================
document.getElementById('shareBtn').onclick = () => {
    if (!currentRoute) {
        showError('Find route first');
        return;
    }
    
    const url = `${location.origin}${location.pathname}?origin=${encodeURIComponent(currentRoute.originInput)}&dest=${encodeURIComponent(currentRoute.destInput)}`;
    navigator.clipboard.writeText(url).then(() => showSuccess('Link copied!')).catch(() => {});
    document.getElementById('shareLink').textContent = url;
};

// ============================================
// URL Parameters
// ============================================
window.onload = () => {
    const p = new URLSearchParams(location.search);
    if (p.get('origin')) document.getElementById('origin').value = p.get('origin');
    if (p.get('dest')) document.getElementById('destination').value = p.get('dest');
    if (p.get('origin') && p.get('dest')) {
        setTimeout(() => document.getElementById('routeForm').dispatchEvent(new Event('submit')), 500);
    }
};
