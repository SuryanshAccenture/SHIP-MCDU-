let map;
let routeLine;
let shipMarker;
let shipTimer;
let routeMarkers;
let waypoints = [];
let waypointNames = [];

const singaporeMumbaiRoute = [
    { name: 'Singapore', point: [1.2644, 103.8223] },
    { name: 'Singapore Strait', point: [1.15, 103.45] },
    { name: 'Malacca Strait', point: [2.35, 101.25] },
    { name: 'Malacca Strait (NW)', point: [4.1, 98.75] },
    { name: 'Andaman Sea', point: [6.2, 95.5] },
    { name: 'Bay of Bengal', point: [6.5, 91.5] },
    { name: 'Bay of Bengal (W)', point: [6.0, 87.0] },
    { name: 'South of Sri Lanka', point: [5.4, 81.5] },
    { name: 'West of Sri Lanka', point: [5.8, 78.0] },
    { name: 'South of India', point: [7.0, 75.5] },
    { name: 'Arabian Sea (S)', point: [10.0, 72.5] },
    { name: 'Arabian Sea', point: [14.0, 69.5] },
    { name: 'Mumbai Approach', point: [18.2, 70.0] },
    { name: 'Mumbai', point: [18.94, 72.84] }
];

initMap();
loadSingaporeMumbaiRoute();
attachPageSwitching();
updateAllDisplays();

function initMap() {
    map = L.map('map').setView([10, 82], 4);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    routeMarkers = L.layerGroup().addTo(map);
}

function showPage(pageName) {
    document.querySelectorAll('.menu-btn').forEach((button) => {
        button.classList.toggle('active', button.dataset.page === pageName);
    });

    document.querySelectorAll('.page').forEach((page) => {
        page.classList.toggle('active', page.id === pageName);
    });
}

function attachPageSwitching() {
    document.querySelectorAll('.menu-btn').forEach((button) => {
        button.addEventListener('click', () => showPage(button.dataset.page));
    });

    document.querySelectorAll('input').forEach((input) => {
        input.addEventListener('input', () => {
            const linkedFields = {
                fuelFlow: 'burnRate',
                burnRate: 'fuelFlow',
                reserveFuel: 'reserveFuelPage',
                reserveFuelPage: 'reserveFuel',
                alternateFuel: 'alternateFuelPage',
                alternateFuelPage: 'alternateFuel',
                fuelRemaining: 'fuelOnboard',
                fuelOnboard: 'fuelRemaining'
            };
            const linkedId = linkedFields[input.id];
            if (linkedId) {
                const linkedInput = document.getElementById(linkedId);
                linkedInput.value = input.id === 'fuelOnboard'
                    ? String(Number(input.value) * 1000)
                    : input.id === 'fuelRemaining'
                        ? String(Number(input.value) / 1000)
                        : input.value;
            }
            updateAllDisplays();
        });
    });
}

function loadSingaporeMumbaiRoute() {
    waypoints = singaporeMumbaiRoute.map((entry) => entry.point);
    waypointNames = singaporeMumbaiRoute.map((entry) => entry.name);
    renderWaypointList();
    drawRoute(true);
    updateAllDisplays();
}

function getFlightInputs() {
    const cruiseSpeed = Number(document.getElementById('cruiseSpeed').value);
    const fuelFlow = Number(document.getElementById('fuelFlow').value);
    const reserveFuel = Number(document.getElementById('reserveFuel').value);
    const alternateFuel = Number(document.getElementById('alternateFuel').value);
    const fuelRemaining = Number(document.getElementById('fuelRemaining').value);

    return {
        cruiseSpeed: cruiseSpeed > 0 ? cruiseSpeed : 14,
        fuelFlow: fuelFlow >= 0 ? fuelFlow : 1500,
        reserveFuel: reserveFuel >= 0 ? reserveFuel : 30000,
        alternateFuel: alternateFuel >= 0 ? alternateFuel : 10000,
        reserveFuelPage: Number(document.getElementById('reserveFuelPage').value) || 0,
        alternateFuelPage: Number(document.getElementById('alternateFuelPage').value) || 0,
        fuelRemaining: fuelRemaining >= 0 ? fuelRemaining : 450000
    };
}

function getRouteDistance() {
    let distance = 0;
    for (let index = 0; index < waypoints.length - 1; index += 1) {
        distance += haversine(waypoints[index], waypoints[index + 1]);
    }
    return distance;
}

function updateAllDisplays() {
    const {
        cruiseSpeed,
        fuelFlow,
        reserveFuel,
        alternateFuel,
        reserveFuelPage,
        alternateFuelPage,
        fuelRemaining
    } = getFlightInputs();
    const distance = getRouteDistance();
    const voyageHours = distance / cruiseSpeed;
    const tripFuel = voyageHours * fuelFlow;
    const totalRouteFuel = tripFuel + reserveFuel + alternateFuel;
    const enduranceHours = fuelFlow > 0 ? fuelRemaining / fuelFlow : 0;

    const lightShip = Number(document.getElementById('lightShip').value) || 0;
    const cargoWeight = Number(document.getElementById('cargoWeight').value) || 0;
    const ballast = Number(document.getElementById('ballast').value) || 0;
    const fuelOnboard = Number(document.getElementById('fuelOnboard').value) || 0;
    const displacement = lightShip + cargoWeight + ballast + fuelOnboard;
    const draft = displacement > 0 ? 10 * Math.cbrt(displacement / 56000) : 0;
    const loadPercent = Math.min(100, Math.max(0, (displacement / 65000) * 100));

    const fromText = (document.getElementById('fromPort').value || 'SIN').trim().slice(0, 3).toUpperCase();
    const toText = (document.getElementById('toPort').value || 'MUM').trim().slice(0, 3).toUpperCase();
    document.getElementById('routeName').textContent = `${fromText}-${toText}`;
    document.getElementById('speedValue').textContent = `${cruiseSpeed.toFixed(1)} KT`;
    document.getElementById('etaValue').textContent = formatDuration(voyageHours);
    document.getElementById('rangeValue').textContent = `${distance.toFixed(0)} NM`;

    document.getElementById('displacementValue').textContent = `${displacement.toFixed(0)} T`;
    document.getElementById('draftValue').textContent = `${draft.toFixed(1)} M`;
    document.getElementById('loadValue').textContent = `${loadPercent.toFixed(0)}%`;
    document.getElementById('stabilityValue').textContent = displacement > 65000 ? 'OVERLOAD' : 'WITHIN LIMIT';

    document.getElementById('tripFuelValue').textContent = `${tripFuel.toFixed(0)} KG`;
    document.getElementById('routeFuelValue').textContent = `${(tripFuel + reserveFuelPage + alternateFuelPage).toFixed(0)} KG`;
    document.getElementById('enduranceValue').textContent = formatDuration(enduranceHours);
    document.getElementById('residualValue').textContent = `${(fuelRemaining - totalRouteFuel).toFixed(0)} KG`;

    document.getElementById('statsTrip').textContent = `${distance.toFixed(1)} NM`;
    document.getElementById('statsTime').textContent = formatDuration(voyageHours);
    document.getElementById('statsFuel').textContent = `${totalRouteFuel.toFixed(0)} KG`;
    document.getElementById('statsSpeed').textContent = `${cruiseSpeed.toFixed(1)} KT`;
    document.getElementById('statsHeading').textContent = `${Math.round(initialBearing(waypoints[0], waypoints[1]))}°`;
    document.getElementById('statsDraft').textContent = `${draft.toFixed(1)} M`;
}

function formatDuration(hours) {
    const days = Math.floor(hours / 24);
    const remainingHours = Math.floor(hours % 24);
    return days > 0 ? `${days}D ${remainingHours}H` : `${hours.toFixed(1)} HRS`;
}

function addWaypoint() {
    const input = document.getElementById('waypointInput');
    const parts = input.value.trim().split(',');
    const lat = Number(parts[0]);
    const lng = Number(parts[1]);

    if (parts.length !== 2 || !Number.isFinite(lat) || !Number.isFinite(lng) ||
        lat < -90 || lat > 90 || lng < -180 || lng > 180) {
        alert('Enter coordinates as latitude,longitude (for example 6.0,87.0).');
        return;
    }

    const insertIndex = Math.max(1, waypoints.length - 1);
    const customNumber = waypointNames.filter((name) => name.startsWith('CUSTOM')).length + 1;
    waypoints.splice(insertIndex, 0, [lat, lng]);
    waypointNames.splice(insertIndex, 0, `CUSTOM ${customNumber}`);
    input.value = '';
    renderWaypointList();
    drawRoute(false);
    updateAllDisplays();
}

function renderWaypointList() {
    const list = document.getElementById('waypointList');
    document.getElementById('waypointCount').textContent = String(waypoints.length);
    list.replaceChildren();

    waypoints.forEach((point, index) => {
        const row = document.createElement('div');
        row.className = 'waypoint';
        const name = document.createElement('span');
        const coords = document.createElement('span');
        name.textContent = `${String(index + 1).padStart(2, '0')} ${waypointNames[index]}`;
        coords.textContent = `${point[0].toFixed(2)}, ${point[1].toFixed(2)}`;
        row.append(name, coords);
        list.appendChild(row);
    });
}

function executeRoute() {
    if (waypoints.length < 2) {
        alert('Add at least two sea waypoints to execute a route.');
        return;
    }

    drawRoute(true);
    updateAllDisplays();
    startShip();
}

function drawRoute(fitBounds) {
    const sampledRoute = sampleRoute(waypoints);
    if (routeLine) {
        map.removeLayer(routeLine);
    }
    routeMarkers.clearLayers();

    if (sampledRoute.length < 2) {
        return;
    }

    routeLine = L.polyline(sampledRoute, {
        color: '#f0b84b',
        weight: 4,
        opacity: 0.95,
        dashArray: '9 5'
    }).addTo(map);

    waypoints.forEach((point, index) => {
        if (index === 0 || index === waypoints.length - 1) {
            L.circleMarker(point, {
                radius: 6,
                color: '#f7da91',
                weight: 2,
                fillColor: '#112d29',
                fillOpacity: 1
            }).bindTooltip(waypointNames[index]).addTo(routeMarkers);
        }
    });

    if (fitBounds) {
        map.fitBounds(routeLine.getBounds(), { padding: [35, 35] });
    }
}

function sampleRoute(route) {
    const sampledPoints = [];
    for (let index = 0; index < route.length - 1; index += 1) {
        const start = route[index];
        const end = route[index + 1];
        const segmentDistance = haversine(start, end);
        const steps = Math.max(1, Math.ceil(segmentDistance / 20));

        for (let step = 0; step < steps; step += 1) {
            sampledPoints.push(interpolateGreatCircle(start, end, step / steps));
        }
    }
    if (route.length > 0) {
        sampledPoints.push(route[route.length - 1]);
    }
    return sampledPoints;
}

function interpolateGreatCircle(start, end, fraction) {
    const radians = Math.PI / 180;
    const degrees = 180 / Math.PI;
    const lat1 = start[0] * radians;
    const lon1 = start[1] * radians;
    const lat2 = end[0] * radians;
    const lon2 = end[1] * radians;
    const distance = 2 * Math.asin(Math.sqrt(
        Math.sin((lat2 - lat1) / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin((lon2 - lon1) / 2) ** 2
    ));

    if (distance === 0) {
        return start;
    }

    const a = Math.sin((1 - fraction) * distance) / Math.sin(distance);
    const b = Math.sin(fraction * distance) / Math.sin(distance);
    const x = a * Math.cos(lat1) * Math.cos(lon1) + b * Math.cos(lat2) * Math.cos(lon2);
    const y = a * Math.cos(lat1) * Math.sin(lon1) + b * Math.cos(lat2) * Math.sin(lon2);
    const z = a * Math.sin(lat1) + b * Math.sin(lat2);
    return [Math.atan2(z, Math.sqrt(x * x + y * y)) * degrees, Math.atan2(y, x) * degrees];
}

function initialBearing(start, end) {
    if (!start || !end) {
        return 0;
    }
    const radians = Math.PI / 180;
    const lat1 = start[0] * radians;
    const lat2 = end[0] * radians;
    const deltaLon = (end[1] - start[1]) * radians;
    const y = Math.sin(deltaLon) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) -
        Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
    return (Math.atan2(y, x) / radians + 360) % 360;
}

function haversine(start, end) {
    const earthRadiusNm = 3440.065;
    const radians = Math.PI / 180;
    const lat1 = start[0] * radians;
    const lat2 = end[0] * radians;
    const deltaLat = (end[0] - start[0]) * radians;
    const deltaLon = (end[1] - start[1]) * radians;
    const a = Math.sin(deltaLat / 2) ** 2 +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
    return earthRadiusNm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function startShip() {
    if (shipTimer) {
        clearInterval(shipTimer);
    }
    if (shipMarker) {
        map.removeLayer(shipMarker);
    }

    const sampledRoute = sampleRoute(waypoints);
    if (sampledRoute.length < 2) {
        return;
    }

    shipMarker = L.marker(sampledRoute[0]).addTo(map);
    let index = 0;
    shipTimer = setInterval(() => {
        index += 1;
        if (index >= sampledRoute.length) {
            clearInterval(shipTimer);
            shipTimer = undefined;
            return;
        }
        shipMarker.setLatLng(sampledRoute[index]);
    }, 300);
}
