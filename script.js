/**
 * BLIP - JS Final Optimizado con Sistema de Notas y Medias
 */

const API_KEY = 'e8b61af0cf42a633e3aa581bb73127f8';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w200';

// Carga de datos
let coleccionSeries = JSON.parse(localStorage.getItem('mis_series_data')) || [];
let misNotas = JSON.parse(localStorage.getItem('mis_notas_blip')) || {}; 
let chartG;

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    const btnMenu = document.getElementById('sidebarCollapse');
    const side = document.getElementById('sidebar');
    
    btnMenu?.addEventListener('click', (e) => {
        e.stopPropagation();
        side.classList.toggle('active');
    });

    document.addEventListener('click', () => side?.classList.remove('active'));
    if (coleccionSeries.length > 0) renderizarTodo();
});

// --- NAVEGACIÓN ---
function showSection(id) {
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

// --- GESTIÓN DE NOTAS ---
function guardarNota(serieId, temporadaN, valor) {
    const notaKey = `${serieId}_${temporadaN}`;
    if (valor) {
        misNotas[notaKey] = parseInt(valor);
    } else {
        delete misNotas[notaKey];
    }
    localStorage.setItem('mis_notas_blip', JSON.stringify(misNotas));
    renderizarTodo(); // Recalcula todo al cambiar una nota
}

function obtenerMediaSerie(serieId) {
    const notasSerie = Object.keys(misNotas)
        .filter(key => key.startsWith(`${serieId}_`))
        .map(key => misNotas[key]);
    
    if (notasSerie.length === 0) return 0;
    const suma = notasSerie.reduce((a, b) => a + b, 0);
    return suma / notasSerie.length;
}

// --- BUSCADOR ---
async function buscarSeries() {
    const query = document.getElementById('initialInput').value.trim();
    if (!query) return;

    try {
        const resp = await fetch(`${BASE_URL}/search/tv?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=es-ES`);
        const { results } = await resp.json();
        
        const resultsDiv = document.getElementById('search-results-main');
        resultsDiv.innerHTML = results.map(s => `
            <div class="work-card-mini" onclick="confirmar(${s.id})">
                <img src="${s.poster_path ? IMG_URL + s.poster_path : 'https://via.placeholder.com/85x125'}">
                <p>${s.name}</p>
            </div>
        `).join('');
        resultsDiv.classList.remove('hidden');
    } catch (err) { console.error(err); }
}

async function confirmar(id) {
    if (coleccionSeries.find(s => s.id === id)) return alert("Ya la tienes");
    try {
        const serie = await fetch(`${BASE_URL}/tv/${id}?api_key=${API_KEY}&language=es-ES&append_to_response=credits`).then(r => r.json());
        coleccionSeries.push(serie);
        localStorage.setItem('mis_series_data', JSON.stringify(coleccionSeries));
        renderizarTodo();
        alert(serie.name + " añadida");
    } catch (err) { console.error(err); }
}

// --- ESTADÍSTICAS ---
function generarStats() {
    const summary = document.getElementById('stats-summary');
    const generos = {};
    coleccionSeries.forEach(s => s.genres?.forEach(g => generos[g.name] = (generos[g.name] || 0) + 1));

    summary.innerHTML = `
        <div class="stats-dashboard">
            <div class="stat-pill">
                <span class="stat-number">${coleccionSeries.length}</span>
                <span class="stat-label">Series</span>
            </div>
            <div class="stat-pill">
                <span class="stat-number">${Object.keys(generos).length}</span>
                <span class="stat-label">Géneros</span>
            </div>
        </div>
    `;

    const ctx = document.getElementById('chartGeneros')?.getContext('2d');
    if (!ctx) return;
    if (chartG) chartG.destroy();
    chartG = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(generos),
            datasets: [{ data: Object.values(generos), backgroundColor: ['#e50914', '#564d4d', '#111', '#831010', '#ff3d3d'], borderWidth: 0 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#fff' } } } }
    });
}

// --- RENDERIZADO GENERAL ---
function renderizarTodo() {
    // 1. Colección con Notas
    document.getElementById('series-grid').innerHTML = coleccionSeries.map(s => `
        <div class="row-item">
            <h4>${s.name}</h4>
            <div class="seasons-carousel">
                ${s.seasons.map(t => {
                    const notaKey = `${s.id}_${t.season_number}`;
                    return `
                    <div class="card">
                        <img src="${IMG_URL + (t.poster_path || s.poster_path)}">
                        <p>${t.name}</p>
                        <select class="nota-selector" onchange="guardarNota('${s.id}', '${t.season_number}', this.value)">
                            <option value="">⭐</option>
                            ${[1,2,3,4,5,6,7,8,9,10].map(n => `<option value="${n}" ${misNotas[notaKey] == n ? 'selected' : ''}>${n}</option>`).join('')}
                        </select>
                    </div>`;
                }).join('')}
            </div>
        </div>`).join('');

    // 2. Mapeo de Actores y Creadores
    const actorsMap = new Map();
    const creatorsMap = new Map();

    coleccionSeries.forEach(s => {
        s.credits?.cast?.forEach(a => processPerson(actorsMap, a, s.poster_path, s.id));
        s.created_by?.forEach(c => processPerson(creatorsMap, c, s.poster_path, s.id));
    });

    dibujarGrid('actors-grid', actorsMap);
    dibujarGrid('directors-grid', creatorsMap);
}

function processPerson(map, person, poster, serieId) {
    if (!map.has(person.id)) {
        map.set(person.id, { name: person.name, img: person.profile_path, works: [], idsSeries: new Set() });
    }
    const ref = map.get(person.id);
    ref.idsSeries.add(serieId);
    if (ref.works.length < 8) ref.works.push(poster);
}

function dibujarGrid(id, mapa) {
    const grid = document.getElementById(id);
    if (!grid) return;

    const sorted = [...mapa.values()].filter(p => p.img);

    grid.innerHTML = sorted.map(p => {
        // Cálculo de media del actor basada en tus notas
        let sumaMedias = 0;
        let seriesConNota = 0;
        p.idsSeries.forEach(sId => {
            const mediaS = obtenerMediaSerie(sId);
            if (mediaS > 0) { sumaMedias += mediaS; seriesConNota++; }
        });
        const mediaFinal = seriesConNota > 0 ? (sumaMedias / seriesConNota).toFixed(1) : "N/A";

        return `
        <div class="actor-row-container">
            <div class="actor-profile">
                <img class="actor-photo" src="${IMG_URL + p.img}">
                <div class="actor-name-label">${p.name.replace(' ', '<br>')}</div>
                <div class="actor-score">⭐ ${mediaFinal}</div>
            </div>
            <div class="actor-works-carousel">
                ${p.works.map(w => `<div class="work-card-mini"><img src="${IMG_URL + w}"></div>`).join('')}
            </div>
        </div>`;
    }).join('');
}
