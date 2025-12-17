// map init
const map = L.map('map').setView([33.3128, 44.3615], 12);
let osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 });
let satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19 });
let darkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png', { maxZoom: 19 });
let darkLightLayer = L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png', { maxZoom: 19 }); // this one looks nicer
let currentRoute = null;
let currentMapLayer = osmLayer;
osmLayer.addTo(map);

function setMapLayer(layer) {
    if (currentMapLayer) map.removeLayer(currentMapLayer);
    currentMapLayer = layer;
    layer.addTo(map);
}

document.getElementById('darkToggle').onclick = () => {
    document.body.classList.toggle('dark');
    const isDark = document.body.classList.contains('dark');
    document.getElementById('darkToggle').textContent = isDark ? '☀️' : '🌙';
    localStorage.setItem('darkMode', isDark);
    setMapLayer(isDark ? darkLightLayer : osmLayer);
};
if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark');
    document.getElementById('darkToggle').textContent = '☀️';
    setMapLayer(darkLightLayer);
}

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

// slides
let currentSlide = 0;
const totalSlides = 8;

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
    setTimeout(() => map.invalidateSize(), 350); // fix for map resize bug
};

document.addEventListener('keydown', (e) => {
    if (!document.getElementById('oopOverlay').classList.contains('active')) return;
    if (e.key === 'ArrowLeft') document.getElementById('oopPrev').click();
    if (e.key === 'ArrowRight') document.getElementById('oopNext').click();
    if (e.key === 'Escape') document.getElementById('oopClose').click();
});

// helper funcs
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

// gps button
document.getElementById('myLocationBtn').onclick = (e) => {
    e.preventDefault();
    if (!navigator.geolocation) { showError('GPS not supported'); return; }
    
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
            
            // good enough
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
    
    // fallback timeout
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

document.getElementById('favPickBtn').onclick = () => {
    pickMode = 'favorite';
    showSuccess('🗺️ Click on the map to pick a location for your favorite');
    document.getElementById('map').style.cursor = 'crosshair';
};

// pick mode for map clicks
let pickMode = null;

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
    } else if (pickMode === 'destination') {
        document.getElementById('destination').value = coords;
        
        map.eachLayer(layer => { if (layer._pickDest) map.removeLayer(layer); });
        const marker = L.circleMarker([lat, lng], { 
            radius: 10, fillColor: '#dc2626', color: '#fff', weight: 3, fillOpacity: 1 
        }).addTo(map);
        marker._pickDest = true;
        marker.bindPopup('🔴 Destination').openPopup();
        
        showSuccess('✅ Destination set! Click Find Route');
    } else if (pickMode === 'favorite') {
        document.getElementById('favCoords').value = coords;
        
        map.eachLayer(layer => { if (layer._pickFav) map.removeLayer(layer); });
        const marker = L.circleMarker([lat, lng], { 
            radius: 10, fillColor: '#f59e0b', color: '#fff', weight: 3, fillOpacity: 1 
        }).addTo(map);
        marker._pickFav = true;
        marker.bindPopup('⭐ Favorite location').openPopup();
        
        showSuccess('✅ Location picked! Enter a name and save.');
    }
    
    pickMode = null;
    document.getElementById('map').style.cursor = '';
});

async function geocode(addr, inputId = null) {
    // use stored coords from favorites if available
    if (inputId) {
        const input = document.getElementById(inputId);
        if (input && input.dataset.coords) {
            const storedCoords = input.dataset.coords;
            const p = storedCoords.split(',').map(x => parseFloat(x.trim()));
            if (p.length === 2 && !isNaN(p[0]) && !isNaN(p[1])) {
                input.dataset.coords = '';
                return [p[1], p[0]];
            }
        }
    }
    
    if (/^[-\d.,\s]+$/.test(addr)) {
        const p = addr.split(',').map(x => parseFloat(x.trim()));
        if (p.length === 2 && !isNaN(p[0]) && !isNaN(p[1])) return [p[1], p[0]];
    }
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addr + ', Baghdad, Iraq')}&limit=1`);
    const data = await res.json();
    return data.length ? [parseFloat(data[0].lon), parseFloat(data[0].lat)] : null;
}

// form submit
document.getElementById('routeForm').onsubmit = async (e) => {
    e.preventDefault();
    const origin = document.getElementById('origin').value.trim();
    const dest = document.getElementById('destination').value.trim();
    if (!origin || !dest) { showError('Enter origin and destination'); return; }
    
    const waypoints = Array.from(document.querySelectorAll('.waypoint-input')).map(i => i.value.trim()).filter(v => v);
    
    document.getElementById('loading').style.display = 'block';
    document.getElementById('findBtn').disabled = true;
    showLoadingSkeleton();
    
    try {
        const coords = [];
        const addresses = [origin, ...waypoints, dest];
        const inputIds = ['origin', ...waypoints.map(() => null), 'destination'];
        
        for (let i = 0; i < addresses.length; i++) {
            const c = await geocode(addresses[i], inputIds[i]);
            if (!c) throw new Error(`Not found: "${addresses[i]}"`);
            coords.push(c);
        }
        
        const url = `https://router.project-osrm.org/route/v1/driving/${coords.map(c => c.join(',')).join(';')}?overview=full&geometries=geojson&steps=true&alternatives=true`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.code !== 'Ok') throw new Error('Route not found');
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
        
        // main route line
        const initialPolyline = L.polyline(routeCoords, { color: '#2196F3', weight: 5 }).addTo(map);
        altRoutePolylines = [initialPolyline];
        
        map.fitBounds(L.latLngBounds(routeCoords), { padding: [50, 50] });
        
        document.getElementById('distance').textContent = currentRoute.distance.toFixed(1);
        document.getElementById('time').textContent = currentRoute.time;
        document.getElementById('routeStats').style.display = 'grid';
        showSuccess(`Route: ${currentRoute.distance.toFixed(1)} km, ${currentRoute.time} min`);
        
        showRouteAlternatives(data.routes, coords);
        
        if (poiEnabled) fetchPOIsAlongRoute();
        
        saveHistory(origin, dest, currentRoute.distance, currentRoute.time);
        document.getElementById('directionsList').innerHTML = directions.slice(0, 15).map((d, i) => `<div class="item-card" style="cursor:default;"><b>${i+1}.</b> ${d.instruction} (${d.distance} km)</div>`).join('') || '<p style="color:#888;">No directions</p>';
    } catch (err) { showError(err.message); }
    finally {
        document.getElementById('loading').style.display = 'none';
        document.getElementById('findBtn').disabled = false;
    }
};

document.getElementById('addWaypointBtn').onclick = () => {
    const div = document.createElement('div');
    div.className = 'waypoint-row';
    div.innerHTML = '<input type="text" class="waypoint-input" placeholder="Stop"><button type="button" class="small-btn danger-btn">✕</button>';
    div.querySelector('button').onclick = () => div.remove();
    document.getElementById('waypointsContainer').appendChild(div);
};

document.getElementById('clearBtn').onclick = () => {
    clearMap();
    document.getElementById('origin').value = '';
    document.getElementById('destination').value = '';
    document.getElementById('waypointsContainer').innerHTML = '';
    document.getElementById('routeStats').style.display = 'none';
    document.getElementById('routeAlternatives').classList.remove('active');
    currentRoute = null;
    
    altRoutePolylines.forEach(p => map.removeLayer(p));
    altRoutePolylines = [];
    clearPOIMarkers();
};

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

// favs
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
    document.getElementById('favList').innerHTML = f.length ? f.map((x, i) => `
        <div class="item-card" style="cursor:default;">
            <div style="display:flex;justify-content:space-between;align-items:start;">
                <div>
                    <b>📍 ${x.name}</b>
                </div>
                <button class="small-btn danger-btn" style="padding:4px 8px;font-size:10px;" onclick="event.stopPropagation();deleteFav(${i});">✕</button>
            </div>
            <div style="display:flex;gap:6px;margin-top:8px;">
                <button class="small-btn" style="flex:1;background:#3a7fff;font-size:11px;" onclick="showFavOnMap('${x.coords}', '${x.name}')">👁️ Show</button>
                <button class="small-btn" style="flex:1;background:#16a34a;font-size:11px;" onclick="useFavAsOrigin('${x.coords}', '${x.name}')">🟢 Origin</button>
                <button class="small-btn" style="flex:1;background:#dc2626;font-size:11px;" onclick="useFavAsDestination('${x.coords}', '${x.name}')">🔴 Destination</button>
            </div>
        </div>
    `).join('') : '<p style="color:#888;">No favorites</p>';
}

function showFavOnMap(coords, name) {
    const [lat, lon] = coords.split(',').map(c => parseFloat(c.trim()));
    
    // Remove previous favorite markers
    map.eachLayer(layer => { if (layer._showFav) map.removeLayer(layer); });
    
    // Add marker
    const marker = L.circleMarker([lat, lon], { 
        radius: 12, fillColor: '#f59e0b', color: '#fff', weight: 3, fillOpacity: 1 
    }).addTo(map);
    marker._showFav = true;
    marker.bindPopup(`⭐ <b>${name}</b><br><small>${coords}</small>`).openPopup();
    
    // Zoom to location
    map.setView([lat, lon], 16);
    showSuccess(`📍 Showing "${name}" on map`);
}

function useFavAsOrigin(coords, name) {
    document.getElementById('origin').value = name;
    document.getElementById('origin').dataset.coords = coords;
    document.querySelector('[data-tab=route]').click();
    showSuccess(`✅ Origin: ${name}`);
}

function useFavAsDestination(coords, name) {
    document.getElementById('destination').value = name;
    document.getElementById('destination').dataset.coords = coords;
    document.querySelector('[data-tab=route]').click();
    showSuccess(`✅ Destination: ${name}`);
}

function deleteFav(i) { let f = JSON.parse(localStorage.getItem('favorites') || '[]'); f.splice(i, 1); localStorage.setItem('favorites', JSON.stringify(f)); loadFavorites(); }

document.getElementById('mapStyle').onchange = (e) => {
    [osmLayer, satelliteLayer, darkLayer].forEach(l => map.removeLayer(l));
    ({ osm: osmLayer, satellite: satelliteLayer, dark: darkLayer })[e.target.value].addTo(map);
};

document.getElementById('shareBtn').onclick = () => {
    if (!currentRoute) { showError('Find route first'); return; }
    const url = `${location.origin}${location.pathname}?origin=${encodeURIComponent(currentRoute.originInput)}&dest=${encodeURIComponent(currentRoute.destInput)}`;
    navigator.clipboard.writeText(url).then(() => showSuccess('Link copied!')).catch(() => {});
    document.getElementById('shareLink').textContent = url;
};

// check url for shared routes
window.onload = () => {
    const p = new URLSearchParams(location.search);
    if (p.get('origin')) document.getElementById('origin').value = p.get('origin');
    if (p.get('dest')) document.getElementById('destination').value = p.get('dest');
    if (p.get('origin') && p.get('dest')) setTimeout(() => document.getElementById('routeForm').dispatchEvent(new Event('submit')), 500);
};

// autocomplete
let acTimeout = null;
const AC_DELAY = 300;

function setupAutocomplete(inputId, dropdownId) {
    const input = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);
    
    input.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        
        if (acTimeout) clearTimeout(acTimeout);
        
        if (query.length < 3 || /^[-\d.,\s]+$/.test(query)) {
            dropdown.classList.remove('active');
            return;
        }
        
        acTimeout = setTimeout(async () => {
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
                
                dropdown.querySelectorAll('.autocomplete-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const lat = item.dataset.lat;
                        const lon = item.dataset.lon;
                        input.value = `${parseFloat(lat).toFixed(6)},${parseFloat(lon).toFixed(6)}`;
                        dropdown.classList.remove('active');
                        
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
        }, AC_DELAY);
    });
    
    document.addEventListener('click', (e) => {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove('active');
        }
    });
}

setupAutocomplete('origin', 'originDropdown');
setupAutocomplete('destination', 'destDropdown');

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

// route alt stuff
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
    
    drawAlternativeRoutes(routes, coords, 0);
    
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
    altRoutePolylines.forEach(p => map.removeLayer(p));
    altRoutePolylines = [];
    
    // other routes (behind)
    routes.forEach((route, i) => {
        if (i === selectedIndex) return;
        const routeCoords = route.geometry.coordinates.map(c => [c[1], c[0]]);
        const polyline = L.polyline(routeCoords, { 
            color: '#9ca3af', weight: 4, opacity: 0.5, dashArray: '10, 10' 
        }).addTo(map);
        altRoutePolylines.push(polyline);
    });
    
    // main one on top
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
    
    document.getElementById('distance').textContent = currentRoute.distance.toFixed(1);
    document.getElementById('time').textContent = currentRoute.time;
    
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

// poi markers
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
    
    // grab some points along route
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
    
    for (const category of activeCategories) {
        const queries = categoryMapping[category].split('|');
        
        for (const point of samplePoints.slice(0, 3)) {
            try {
                const lat = point[0];
                const lon = point[1];
                const radius = 500;
                
                const query = category === 'fuel' ? 'gas station' : 
                              category === 'restaurant' ? 'restaurant' :
                              category === 'hospital' ? 'hospital' :
                              category === 'atm' ? 'atm bank' : 'parking';
                
                const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=3&bounded=1&viewbox=${lon-0.01},${lat+0.01},${lon+0.01},${lat-0.01}`);
                const data = await res.json();
                
                data.forEach(poi => {
                    // skip dupes
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
