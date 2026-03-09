/**
 * BLIP - Gestión de Series y Estadísticas
 * Optimizado para rendimiento y limpieza de código
 */

const API_KEY = 'e8b61af0cf42a633e3aa581bb73127f8';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w200';

let coleccionSeries = JSON.parse(localStorage.getItem('mis_series_data')) || [];
let chartG;

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    const btnMenu = document.getElementById('sidebarCollapse');
    const side = document.getElementById('sidebar');
    
    // Toggle Menu con Delegación de Eventos
    btnMenu?.addEventListener('click', (e) => {
        e.stopPropagation();
        side.classList.toggle('active');
    });

    // Cerrar sidebar al hacer clic fuera
    document.addEventListener('click', () => side?.classList.remove('active'));

    if (coleccionSeries.length > 0) renderizarTodo();
});

// --- NAVEGACIÓN ---
function showSection(id) {
    // Ocultar todo y resetear estados
    document.querySelectorAll('.section-content, #welcome-screen, #main-app')
            .forEach(el => el.classList.add('hidden'));

    if (id === 'welcome') {
        document.getElementById('welcome-screen').classList.remove('hidden');
    } else {
        document.getElementById('main-app').classList.remove('hidden');
        document.getElementById(`sec-${id}`)?.classList.remove('hidden');
        if (id === 'stats') setTimeout(generarStats, 150);
    }
}

// --- API Y DATOS ---
async function buscarSeries() {
    const query = document.getElementById('initialInput').value.trim();
    if (!query) return;

    try {
        const url = `${BASE_URL}/search/tv?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=es-ES`;
        const resp = await fetch(url);
        const { results } = await resp.json();
        
        const resultsDiv = document.getElementById('search-results-main');
        resultsDiv.innerHTML = results.map(s => `
            <div class="work-card-mini" onclick="confirmar(${s.id})">
                <img src="${s.poster_path ? IMG_URL + s.poster_path : 'https://via.placeholder.com/85x125'}" alt="${s.name}">
                <p>${s.name}</p>
            </div>
        `).join('');
        resultsDiv.classList.remove('hidden');
    } catch (err) {
        console.error("Error buscando series:", err);
    }
}

async function confirmar(id) {
    if (coleccionSeries.find(s => s.id === id)) return alert("Esta serie ya está en tu colección");

    try {
        const url = `${BASE_URL}/tv/${id}?api_key=${API_KEY}&language=es-ES&append_to_response=credits`;
        const serie = await fetch(url).then(r => r.json());
        
        coleccionSeries.push(serie);
        saveData();
        alert(`${serie.name} añadida con éxito`);
        renderizarTodo();
    } catch (err) {
        console.error("Error al añadir serie:", err);
    }
}

const saveData = () => localStorage.setItem('mis_series_data', JSON.stringify(coleccionSeries));

// --- ESTADÍSTICAS ---
function generarStats() {
    const summary = document.getElementById('stats-summary');
    if (!coleccionSeries.length) return summary.innerHTML = "<p>No hay datos suficientes.</p>";

    const dataSet = coleccionSeries.reduce((acc, s) => {
        s.genres?.forEach(g => acc.gen[g.name] = (acc.gen[g.name] || 0) + 1);
        const anio = s.first_air_date?.split('-')[0] || 'N/A';
        acc.ani[anio] = (acc.ani[anio] || 0) + 1;
        return acc;
    }, { gen: {}, ani: {} });

    summary.innerHTML = `
        <div class="stats-dashboard">
            <div class="stat-pill">
                <span class="stat-number">${coleccionSeries.length}</span>
                <span class="stat-label">Series</span>
            </div>
            <div class="stat-pill">
                <span class="stat-number">${Object.keys(dataSet.gen).length}</span>
                <span class="stat-label">Géneros</span>
            </div>
        </div>
    `;

    renderChart(dataSet.gen);
}

function renderChart(generos) {
    const ctx = document.getElementById('chartGeneros')?.getContext('2d');
    if (!ctx) return;
    if (chartG) chartG.destroy();
    
    chartG = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(generos),
            datasets: [{ 
                data: Object.values(generos), 
                backgroundColor: ['#e50914', '#564d4d', '#111', '#831010', '#ff3d3d'],
                borderWidth: 0
            }]
        },
        options: { 
            responsive: true, 
            maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#fff', font: { size: 10 } } } } 
        }
    });
}

// --- RENDERIZADO DE GRIDS ---
function renderizarTodo() {
    // 1. Mi Colección
    document.getElementById('series-grid').innerHTML = coleccionSeries.map(s => `
        <div class="row-item">
            <h4>${s.name}</h4>
            <div class="seasons-carousel">
                ${s.seasons.map(t => `
                    <div class="card">
                        <img src="${t.poster_path ? IMG_URL + t.poster_path : IMG_URL + s.poster_path}" alt="${t.name}">
                        <p>${t.name}</p>
                    </div>`).join('')}
            </div>
        </div>`).join('');

    // 2. Mapeo de Personas (Actores y Creadores)
    const actorsMap = new Map();
    const creatorsMap = new Map();

    coleccionSeries.forEach(s => {
        s.credits?.cast?.forEach(a => processPerson(actorsMap, a, s.poster_path));
        s.created_by?.forEach(c => processPerson(creatorsMap, c, s.poster_path));
    });

    dibujarGrid('actors-grid', actorsMap);
    dibujarGrid('directors-grid', creatorsMap);
}

function processPerson(map, person, poster) {
    if (!map.has(person.id)) {
        map.set(person.id, { 
            name: person.name, 
            img: person.profile_path, 
            works: [], 
            count: 0 
        });
    }
    const ref = map.get(person.id);
    ref.count++;
    if (ref.works.length < 10) ref.works.push(poster);
}

function dibujarGrid(containerId, dataMap) {
    const grid = document.getElementById(containerId);
    if (!grid) return;

    const sorted = [...dataMap.values()]
        .sort((a, b) => b.count - a.count)
        .filter(p => p.img);

    grid.innerHTML = sorted.map(p => `
        <div class="actor-row-container">
            <div class="actor-profile">
                <img class="actor-photo" src="${IMG_URL + p.img}" alt="${p.name}">
                <div class="actor-name-label">${p.name.replace(' ', '<br>')}</div>
            </div>
            <div class="actor-works-carousel">
                ${p.works.map(w => `<div class="work-card-mini"><img src="${IMG_URL + w}"></div>`).join('')}
            </div>
        </div>`).join('');
}
