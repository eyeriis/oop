// Baghdad Route Finder - Application Logic

// MAP SETUP
const map = L.map('map').setView([33.3128, 44.3615], 12);
let osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 });
let satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 });
let darkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', { maxZoom: 19 });
// Alternative lighter dark map
let darkLightLayer = L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png', { maxZoom: 19 });
let currentRoute = null;
let currentMapLayer = osmLayer;

// Add default layer
osmLayer.addTo(map);

// Function to switch map layer
function setMapLayer(layer) {
    if (currentMapLayer) map.removeLayer(currentMapLayer);
    currentMapLayer = layer;
    layer.addTo(map);
}

// DARK MODE
document.getElementById('darkToggle').onclick = () => {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    document.getElementById('darkToggle').textContent = isDark ? '☀️' : '🌙';
    localStorage.setItem('darkMode', isDark);
    
    // Switch map to dark/light layer (using lighter dark style)
    setMapLayer(isDark ? darkLightLayer : osmLayer);
};
if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark');
    document.getElementById('darkToggle').textContent = '☀️';
    setMapLayer(darkLightLayer);
}

// TABS
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

// OOP PRESENTATION
let currentSlide = 0;
const totalSlides = 9;

const dotsContainer = document.getElementById('oopDots');
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

document.getElementById('sidebarToggle').onclick = () => {
    const sidebar = document.getElementById('sidebar');
    const btn = document.getElementById('sidebarToggle');
    document.body.classList.toggle('sidebar-collapsed');
    sidebar.classList.toggle('hidden');
    btn.textContent = sidebar.classList.contains('hidden') ? '▶' : '◀';
    // Invalidate map size after transition
    setTimeout(() => map.invalidateSize(), 350);
};

document.addEventListener('keydown', (e) => {
    if (!document.getElementById('oopOverlay').classList.contains('active')) return;
    if (e.key === 'ArrowLeft') document.getElementById('oopPrev').click();
    if (e.key === 'ArrowRight') document.getElementById('oopNext').click();
    if (e.key === 'Escape') document.getElementById('oopClose').click();
});

// HELPERS
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
        if (layer instanceof L.CircleMarker || layer instanceof L.Polyline || layer instanceof L.Circle) map.removeLayer(layer);
    });
}

// MY LOCATION - with high accuracy GPS
document.getElementById('myLocationBtn').onclick = (e) => {
    e.preventDefault();
    if (!navigator.geolocation) { showError('GPS not supported'); return; }
    
    // Check if on HTTPS (required for accurate GPS on mobile)  
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
        
        // Clear previous location markers
        map.eachLayer(layer => {
            if (layer._myLocationMarker) map.removeLayer(layer);
        });
        
        // Add accuracy circle
        const accCircle = L.circle([pos.latitude, pos.longitude], { 
            radius: pos.accuracy, 
            color: pos.accuracy > 500 ? '#ff6b6b' : '#0066ff', 
            fillOpacity: 0.1,
            weight: 1
        }).addTo(map);
        accCircle._myLocationMarker = true;
        
        // Add location marker
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
            
            // Keep the most accurate position
            if (accuracy < bestAccuracy) {
                bestAccuracy = accuracy;
                bestPosition = { latitude, longitude, accuracy };
                updateUI(bestPosition, false);
                showSuccess(`📡 GPS accuracy: ±${Math.round(accuracy)}m${accuracy > 100 ? ' (improving...)' : ''}`);
            }
            
            // Accept if accuracy is good enough (<30m) or after 8 attempts
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
    
    // Timeout fallback - use best position after 15 seconds
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

document.getElementById('favGpsBtn').onclick = (e) => {
    e.preventDefault();
    if (!navigator.geolocation) { showError('GPS not supported'); return; }
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

// PICK ON MAP - More reliable than GPS!
let pickMode = null; // 'origin' or 'destination'

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
        
        // Add marker
        map.eachLayer(layer => { if (layer._pickOrigin) map.removeLayer(layer); });
        const marker = L.circleMarker([lat, lng], { 
            radius: 10, fillColor: '#16a34a', color: '#fff', weight: 3, fillOpacity: 1 
        }).addTo(map);
        marker._pickOrigin = true;
        marker.bindPopup('🟢 Origin: Your location').openPopup();
        
        showSuccess('✅ Origin set! Now pick destination or click Find Route');
    } else {
        document.getElementById('destination').value = coords;
        
        // Add marker
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

// GEOCODING
async function geocode(addr) {
    if (/^[-\d.,\s]+$/.test(addr)) {
        const p = addr.split(',').map(x => parseFloat(x.trim()));
        if (p.length === 2 && !isNaN(p[0]) && !isNaN(p[1])) return [p[1], p[0]];
    }
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addr + ', Baghdad, Iraq')}&limit=1`);
    const data = await res.json();
    return data.length ? [parseFloat(data[0].lon), parseFloat(data[0].lat)] : null;
}

// ROUTE FORM
document.getElementById('routeForm').onsubmit = async (e) => {
    e.preventDefault();
    const origin = document.getElementById('origin').value.trim();
    const dest = document.getElementById('destination').value.trim();
    if (!origin || !dest) { showError('Enter origin and destination'); return; }
    
    const waypoints = Array.from(document.querySelectorAll('.waypoint-input')).map(i => i.value.trim()).filter(v => v);
    
    document.getElementById('loading').style.display = 'block';
    document.getElementById('findBtn').disabled = true;
    
    // Show loading skeleton
    showLoadingSkeleton();
    
    try {
        const coords = [];
        for (let addr of [origin, ...waypoints, dest]) {
            const c = await geocode(addr);
            if (!c) throw new Error(`Not found: "${addr}"`);
            coords.push(c);
        }
        
        // Request alternatives with alternatives=true
        const url = `https://router.project-osrm.org/route/v1/driving/${coords.map(c => c.join(',')).join(';')}?overview=full&geometries=geojson&steps=true&alternatives=true`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.code !== 'Ok') throw new Error('Route not found');
        
        // Restore stats UI before updating
        restoreStatsUI();
        
        const route = data.routes[0];
        const routeCoords = route.geometry.coordinates.map(c => [c[1], c[0]]);
        
        const directions = [];
        route.legs?.forEach(leg => leg.steps?.forEach(step => {
            if (step.maneuver) directions.push({ instruction: `${step.maneuver.type} ${step.maneuver.modifier || ''} on ${step.name || 'road'}`, distance: (step.distance / 1000).toFixed(2) });
        }));
        
        currentRoute = { coordinates: routeCoords, distance: route.distance / 1000, time: Math.round(route.duration / 60), originInput: origin, destInput: dest, directions };
        
        clearMap();
        L.circleMarker([coords[0][1], coords[0][0]], { radius: 10, fillColor: '#4CAF50', color: '#fff', weight: 3, fillOpacity: 0.9 }).addTo(map).bindPopup('🟢 Origin');
        L.circleMarker([coords[coords.length-1][1], coords[coords.length-1][0]], { radius: 10, fillColor: '#f44336', color: '#fff', weight: 3, fillOpacity: 0.9 }).addTo(map).bindPopup('🔴 Destination');
        L.polyline(routeCoords, { color: '#2196F3', weight: 5 }).addTo(map);
        map.fitBounds(L.latLngBounds(routeCoords), { padding: [50, 50] });
        
        document.getElementById('distance').textContent = currentRoute.distance.toFixed(1);
        document.getElementById('time').textContent = currentRoute.time;
        document.getElementById('routeStats').style.display = 'grid';
        showSuccess(`Route: ${currentRoute.distance.toFixed(1)} km, ${currentRoute.time} min`);
        
        // Show route alternatives if available
        showRouteAlternatives(data.routes, coords);
        
        // Fetch POIs if enabled
        if (poiEnabled) {
            fetchPOIsAlongRoute();
        }
        
        saveHistory(origin, dest, currentRoute.distance, currentRoute.time);
        document.getElementById('directionsList').innerHTML = directions.slice(0, 15).map((d, i) => `<div class="item-card" style="cursor:default;"><b>${i+1}.</b> ${d.instruction} (${d.distance} km)</div>`).join('') || '<p style="color:#888;">No directions</p>';
    } catch (err) { showError(err.message); }
    finally {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('findBtn').disabled = false;
    }
};

// WAYPOINTS
document.getElementById('addWaypointBtn').onclick = () => {
    const div = document.createElement('div');
    div.className = 'waypoint-row';
    div.innerHTML = '<input type="text" class="waypoint-input" placeholder="Stop"><button type="button" class="small-btn danger-btn">✕</button>';
    div.querySelector('button').onclick = () => div.remove();
    document.getElementById('waypointsContainer').appendChild(div);
};

// CLEAR
document.getElementById('clearBtn').onclick = () => {
    clearMap();
    document.getElementById('origin').value = '';
    document.getElementById('destination').value = '';
    document.getElementById('waypointsContainer').innerHTML = '';
    document.getElementById('routeStats').style.display = 'none';
    document.getElementById('routeAlternatives').classList.remove('active');
    currentRoute = null;
    
    // Clear alternative route polylines
    altRoutePolylines.forEach(p => map.removeLayer(p));
    altRoutePolylines = [];
    
    // Clear POI markers
    clearPOIMarkers();
};

// HISTORY
function saveHistory(o, d, dist, t) {
    let h = JSON.parse(localStorage.getItem('routeHistory') || '[]');
    h.unshift({ origin: o, dest: d, distance: dist.toFixed(1), time: t, date: new Date().toLocaleString() });
    localStorage.setItem('routeHistory', JSON.stringify(h.slice(0, 20)));
}

function loadHistory() {
    const h = JSON.parse(localStorage.getItem('routeHistory') || '[]');
    document.getElementById('historyList').innerHTML = h.length ? h.map(r => `<div class="item-card" onclick="document.getElementById('origin').value='${r.origin}';document.getElementById('destination').value='${r.dest}';document.querySelector('[data-tab=route]').click();"><b>${r.origin}</b> → <b>${r.dest}</b><br><small>${r.distance} km • ${r.time} min</small></div>`).join('') : '<p style="color:#888;">No routes</p>';
}

document.getElementById('clearHistoryBtn').onclick = () => { localStorage.removeItem('routeHistory'); loadHistory(); showSuccess('Cleared'); };

// FAVORITES
document.getElementById('saveFavBtn').onclick = () => {
    const n = document.getElementById('favName').value.trim();
    const c = document.getElementById('favCoords').value.trim();
    if (!n || !c) { showError('Enter name and coords'); return; }
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
    document.getElementById('favList').innerHTML = f.length ? f.map((x, i) => `<div class="item-card" onclick="document.getElementById('origin').value='${x.coords}';document.querySelector('[data-tab=route]').click();">📍 <b>${x.name}</b><br><small>${x.coords}</small><button class="small-btn danger-btn" style="float:right;margin-top:-18px;" onclick="event.stopPropagation();deleteFav(${i});">✕</button></div>`).join('') : '<p style="color:#888;">No favorites</p>';
}

function deleteFav(i) { let f = JSON.parse(localStorage.getItem('favorites') || '[]'); f.splice(i, 1); localStorage.setItem('favorites', JSON.stringify(f)); loadFavorites(); }

// EXPORT
document.getElementById('exportGeoJSON').onclick = () => exp('geojson');
document.getElementById('exportGPX').onclick = () => exp('gpx');
document.getElementById('exportCSV').onclick = () => exp('csv');

function exp(fmt) {
    if (!currentRoute) { showError('Find route first'); return; }
    let data, fn, type;
    if (fmt === 'geojson') { data = JSON.stringify({ type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'LineString', coordinates: currentRoute.coordinates.map(c => [c[1], c[0]]) }, properties: { distance: currentRoute.distance, time: currentRoute.time } }] }, null, 2); fn = 'route.geojson'; type = 'application/json'; }
    else if (fmt === 'gpx') { data = `<?xml version="1.0"?><gpx version="1.1"><trk><name>Route</name><trkseg>${currentRoute.coordinates.map(c => `<trkpt lat="${c[0]}" lon="${c[1]}"></trkpt>`).join('')}</trkseg></trk></gpx>`; fn = 'route.gpx'; type = 'application/gpx+xml'; }
    else { data = 'lat,lon\n' + currentRoute.coordinates.map(c => `${c[0]},${c[1]}`).join('\n'); fn = 'route.csv'; type = 'text/csv'; }
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([data], { type })); a.download = fn; a.click();
    showSuccess(`Exported ${fmt.toUpperCase()}`);
}

// MAP STYLE
document.getElementById('mapStyle').onchange = (e) => {
    [osmLayer, satelliteLayer, darkLayer].forEach(l => map.removeLayer(l));
    ({ osm: osmLayer, satellite: satelliteLayer, dark: darkLayer })[e.target.value].addTo(map);
};

// SHARE
document.getElementById('shareBtn').onclick = () => {
    if (!currentRoute) { showError('Find route first'); return; }
    const url = `${location.origin}${location.pathname}?origin=${encodeURIComponent(currentRoute.originInput)}&dest=${encodeURIComponent(currentRoute.destInput)}`;
    navigator.clipboard.writeText(url).then(() => showSuccess('Link copied!')).catch(() => {});
    document.getElementById('shareLink').textContent = url;
};

// URL PARAMS
window.onload = () => {
    const p = new URLSearchParams(location.search);
    if (p.get('origin')) document.getElementById('origin').value = p.get('origin');
    if (p.get('dest')) document.getElementById('destination').value = p.get('dest');
    if (p.get('origin') && p.get('dest')) setTimeout(() => document.getElementById('routeForm').dispatchEvent(new Event('submit')), 500);
};

// ========================================
// FEATURE: AUTOCOMPLETE SEARCH
// ========================================
let autocompleteTimeout = null;
const AUTOCOMPLETE_DELAY = 300; // ms debounce

function setupAutocomplete(inputId, dropdownId) {
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);
    
    input.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        
        // Clear previous timeout
        if (autocompleteTimeout) clearTimeout(autocompleteTimeout);
        
        // Hide dropdown if query is too short or looks like coordinates
        if (query.length < 3 || /^[-\d.,\s]+$/.test(query)) {
            dropdown.classList.remove('active');
            return;
        }
        
        // Debounce the API call
        autocompleteTimeout = setTimeout(async () => {
            try {
                const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', Baghdad, Iraq')}&limit=5&addressdetails=1`);
                const data = await res.json();
                
                if (data.length === 0) {
                    dropdown.classList.remove('active');
                    return;
                }
                
                dropdown.innerHTML = data.map(item => `
                    <div class="autocomplete-item" data-lat="${item.lat}" data-lon="${item.lon}">
                        <strong>${item.display_name.split(',')[0]}</strong>
                        <small>${item.display_name.split(',').slice(1, 3).join(',')}</small>
                    </div>
                `).join('');
                
                dropdown.classList.add('active');
                
                // Add click handlers
                dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const lat = item.dataset.lat;
                        const lon = item.dataset.lon;
                        input.value = `${parseFloat(lat).toFixed(6)},${parseFloat(lon).toFixed(6)}`;
                        dropdown.classList.remove('active');
                        
                        // Show marker on map
                        const markerColor = inputId === 'origin' ? '#16a34a' : '#dc2626';
                        const markerProp = inputId === 'origin' ? '_autoOrigin' : '_autoDest';
                        
                        map.eachLayer(layer => { if (layer[markerProp]) map.removeLayer(layer); });
                        const marker = L.circleMarker([lat, lon], { 
                            radius: 8, fillColor: markerColor, color: '#fff', weight: 2, fillOpacity: 1 
                        }).addTo(map);
                        marker[markerProp] = true;
                        map.setView([lat, lon], 15);
                    });
                });
            } catch (err) {
                console.error('Autocomplete error:', err);
            }
        }, AUTOCOMPLETE_DELAY);
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove('active');
        }
    });
}

// Initialize autocomplete for both inputs
setupAutocomplete('origin', 'originDropdown');
setupAutocomplete('destination', 'destDropdown');

// ========================================
// FEATURE: LOADING SKELETON
// ========================================
function showLoadingSkeleton() {
    document.getElementById('routeStats').style.display = 'grid';
    document.getElementById('routeStats').innerHTML = `
        <div class="stat skeleton-loading skeleton-stat"></div>
        <div class="stat skeleton-loading skeleton-stat"></div>
    `;
    
    document.getElementById('directionsList').innerHTML = `
        <div class="skeleton-directions skeleton-loading">
            <div class="skeleton-line"></div>
            <div class="skeleton-line"></div>
            <div class="skeleton-line"></div>
        </div>
    `;
}

function restoreStatsUI() {
    document.getElementById('routeStats').innerHTML = `
        <div class="stat"><div class="stat-value" id="distance">0</div><div class="stat-label">Distance (km)</div></div>
        <div class="stat"><div class="stat-value" id="time">0</div><div class="stat-label">Time (min)</div></div>
    `;
}

// ========================================
// FEATURE: ROUTE ALTERNATIVES
// ========================================
let allRoutes = [];
let altRoutePolylines = [];

function showRouteAlternatives(routes, coords) {
    if (routes.length <= 1) {
        document.getElementById('routeAlternatives').classList.remove('active');
        return;
    }
    
    allRoutes = routes;
    const container = document.getElementById('altRoutesList');
    
    container.innerHTML = routes.map((route, i) => {
        const dist = (route.distance / 1000).toFixed(1);
        const time = Math.round(route.duration / 60);
        const isFastest = i === 0;
        return `
            <div class="alt-route-card ${i === 0 ? 'selected' : ''}" data-index="${i}">
                <div class="alt-label">${isFastest ? '⚡ Fastest' : `Alternative ${i}`}</div>
                <div class="alt-stats">${dist} km • ${time} min</div>
            </div>
        `;
    }).join('');
    
    document.getElementById('routeAlternatives').classList.add('active');
    
    // Draw all routes
    drawAlternativeRoutes(routes, coords, 0);
    
    // Add click handlers
    container.querySelectorAll('.alt-route-card').forEach(card => {
        card.addEventListener('click', () => {
            const idx = parseInt(card.dataset.index);
            container.querySelectorAll('.alt-route-card').forEach(c => c.classList.remove('selected'));
            card.classList.add('selected');
            
            selectRoute(routes[idx], idx, coords);
            drawAlternativeRoutes(routes, coords, idx);
        });
    });
}

function drawAlternativeRoutes(routes, coords, selectedIndex) {
    // Clear previous alt route polylines
    altRoutePolylines.forEach(p => map.removeLayer(p));
    altRoutePolylines = [];
    
    // Draw alternatives first (behind)
    routes.forEach((route, i) => {
        if (i === selectedIndex) return;
        const routeCoords = route.geometry.coordinates.map(c => [c[1], c[0]]);
        const polyline = L.polyline(routeCoords, { 
            color: '#9ca3af', weight: 4, opacity: 0.5, dashArray: '10, 10' 
        }).addTo(map);
        altRoutePolylines.push(polyline);
    });
    
    // Draw selected route on top
    const selectedRoute = routes[selectedIndex];
    const routeCoords = selectedRoute.geometry.coordinates.map(c => [c[1], c[0]]);
    const polyline = L.polyline(routeCoords, { color: '#2196F3', weight: 5 }).addTo(map);
    altRoutePolylines.push(polyline);
}

function selectRoute(route, index, coords) {
    const routeCoords = route.geometry.coordinates.map(c => [c[1], c[0]]);
    currentRoute = {
        coordinates: routeCoords,
        distance: route.distance / 1000,
        time: Math.round(route.duration / 60),
        originInput: document.getElementById('origin').value,
        destInput: document.getElementById('destination').value,
        directions: []
    };
    
    // Update stats
    document.getElementById('distance').textContent = currentRoute.distance.toFixed(1);
    document.getElementById('time').textContent = currentRoute.time;
    
    // Update directions
    const directions = [];
    route.legs?.forEach(leg => leg.steps?.forEach(step => {
        if (step.maneuver) directions.push({
            instruction: `${step.maneuver.type} ${step.maneuver.modifier || ''} on ${step.name || 'road'}`,
            distance: (step.distance / 1000).toFixed(2)
        });
    }));
    currentRoute.directions = directions;
    document.getElementById('directionsList').innerHTML = directions.slice(0, 15).map((d, i) => 
        `<div class="item-card" style="cursor:default;"><b>${i+1}.</b> ${d.instruction} (${d.distance} km)</div>`
    ).join('') || '<p style="color:#888;">No directions</p>';
}

// ========================================
// FEATURE: TRAFFIC LAYER (Simulated)
// ========================================
let trafficLayer = null;
let trafficEnabled = false;

document.getElementById('trafficToggle').addEventListener('change', (e) => {
    trafficEnabled = e.target.checked;
    document.getElementById('trafficLegend').style.display = trafficEnabled ? 'flex' : 'none';
    
    if (trafficEnabled) {
        showTrafficLayer();
    } else {
        if (trafficLayer) {
            map.removeLayer(trafficLayer);
            trafficLayer = null;
        }
    }
});

function showTrafficLayer() {
    if (trafficLayer) map.removeLayer(trafficLayer);
    
    // Simulated traffic data for Baghdad
    const trafficSegments = [
        // Tahrir Square area - usually heavy
        { coords: [[33.3400, 44.3850], [33.3380, 44.3920], [33.3350, 44.4000]], level: 'heavy' },
        // Karrada - moderate
        { coords: [[33.3100, 44.4000], [33.3050, 44.4100], [33.3000, 44.4200]], level: 'moderate' },
        // Palestine Street - heavy
        { coords: [[33.3500, 44.4100], [33.3550, 44.4200], [33.3600, 44.4300]], level: 'heavy' },
        // Airport Road - light
        { coords: [[33.2800, 44.2500], [33.2700, 44.2300], [33.2600, 44.2100]], level: 'light' },
        // Mansour - moderate
        { coords: [[33.3200, 44.3600], [33.3150, 44.3500], [33.3100, 44.3400]], level: 'moderate' },
        // Sadr City - heavy
        { coords: [[33.4000, 44.4300], [33.4050, 44.4400], [33.4100, 44.4500]], level: 'heavy' },
        // Jadiriya - light
        { coords: [[33.2800, 44.3900], [33.2850, 44.4000], [33.2900, 44.4100]], level: 'light' }
    ];
    
    const colors = { light: '#16a34a', moderate: '#f59e0b', heavy: '#dc2626' };
    
    trafficLayer = L.layerGroup();
    trafficSegments.forEach(seg => {
        L.polyline(seg.coords, {
            color: colors[seg.level],
            weight: 6,
            opacity: 0.7
        }).addTo(trafficLayer);
    });
    trafficLayer.addTo(map);
}

// ========================================
// FEATURE: POI MARKERS ALONG ROUTE
// ========================================
let poiMarkers = [];
let poiEnabled = false;
let activeCategories = ['fuel', 'restaurant'];

document.getElementById('poiToggle').addEventListener('change', (e) => {
    poiEnabled = e.target.checked;
    document.getElementById('poiCategories').style.display = poiEnabled ? 'flex' : 'none';
    
    if (poiEnabled && currentRoute) {
        fetchPOIsAlongRoute();
    } else {
        clearPOIMarkers();
    }
});

// POI category toggle
document.querySelectorAll('.poi-chip').forEach(chip => {
    chip.addEventListener('click', () => {
        chip.classList.toggle('active');
        const category = chip.dataset.category;
        
        if (chip.classList.contains('active')) {
            if (!activeCategories.includes(category)) activeCategories.push(category);
        } else {
            activeCategories = activeCategories.filter(c => c !== category);
        }
        
        if (poiEnabled && currentRoute) {
            fetchPOIsAlongRoute();
        }
    });
});

function clearPOIMarkers() {
    poiMarkers.forEach(m => map.removeLayer(m));
    poiMarkers = [];
}

async function fetchPOIsAlongRoute() {
    if (!currentRoute || activeCategories.length === 0) {
        clearPOIMarkers();
        return;
    }
    
    clearPOIMarkers();
    
    // Sample points along the route
    const routeCoords = currentRoute.coordinates;
    const samplePoints = [];
    const step = Math.max(1, Math.floor(routeCoords.length / 5));
    for (let i = 0; i < routeCoords.length; i += step) {
        samplePoints.push(routeCoords[i]);
    }
    
    const categoryMapping = {
        fuel: 'amenity=fuel',
        restaurant: 'amenity=restaurant|amenity=fast_food|amenity=cafe',
        hospital: 'amenity=hospital|amenity=clinic|amenity=pharmacy',
        atm: 'amenity=atm|amenity=bank',
        parking: 'amenity=parking'
    };
    
    const icons = {
        fuel: '⛽',
        restaurant: '🍽️',
        hospital: '🏥',
        atm: '🏧',
        parking: '🅿️'
    };
    
    // Query Overpass for POIs near route
    for (const category of activeCategories) {
        const queries = categoryMapping[category].split('|');
        
        for (const point of samplePoints.slice(0, 3)) { // Limit queries
            try {
                const lat = point[0];
                const lon = point[1];
                const radius = 500; // 500m radius
                
                // Use Nominatim for POI search (simpler than Overpass)
                const query = category === 'fuel' ? 'gas station' : 
                              category === 'restaurant' ? 'restaurant' :
                              category === 'hospital' ? 'hospital' :
                              category === 'atm' ? 'atm bank' : 'parking';
                
                const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=3&bounded=1&viewbox=${lon-0.01},${lat+0.01},${lon+0.01},${lat-0.01}`);
                const data = await res.json();
                
                data.forEach(poi => {
                    // Check if already added (avoid duplicates)
                    const exists = poiMarkers.some(m => 
                        Math.abs(m.getLatLng().lat - poi.lat) < 0.0001 && 
                        Math.abs(m.getLatLng().lng - poi.lon) < 0.0001
                    );
                    if (exists) return;
                    
                    const marker = L.marker([poi.lat, poi.lon], {
                        icon: L.divIcon({
                            html: `<div style="font-size:20px;text-align:center;">${icons[category]}</div>`,
                            className: 'poi-icon',
                            iconSize: [30, 30]
                        })
                    }).addTo(map);
                    
                    marker.bindPopup(`<b>${icons[category]} ${poi.display_name.split(',')[0]}</b><br><small>${category}</small>`);
                    poiMarkers.push(marker);
                });
            } catch (err) {
                console.error('POI fetch error:', err);
            }
        }
    }
}
