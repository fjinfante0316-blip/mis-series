// 1. CONFIGURACIÓN Y VARIABLES GLOBALES
const API_KEY = 'e8b61af0cf42a633e3aa581bb73127f8';
He vuelto a revisar tu enlace. El problema principal es que tu archivo script.js tiene errores de sintaxis (le faltan llaves de cierre } y tiene funciones duplicadas) lo que hace que el navegador "aborte" la ejecución y ningún botón responda.

Aquí tienes la versión final corregida. Por favor, borra todo tu script.js y pega este. He integrado todo: el menú, los creadores y las estadísticas con el diseño centrado que pediste.

1. JavaScript Totalmente Corregido (script.js)
JavaScript
const API_KEY = 'TU_API_KEY_AQUI'; // Asegúrate de que esta sea tu clave real de TMDB
let coleccionSeries = JSON.parse(localStorage.getItem('mis_series_data')) || [];
let chartG, chartA;

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    const btnMenu = document.getElementById('sidebarCollapse');
    const side = document.getElementById('sidebar');
    
    if (btnMenu && side) {
        btnMenu.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            side.classList.toggle('active');
        };
    }

    if (coleccionSeries.length > 0) renderizarTodo();
});

// --- NAVEGACIÓN ---
function showSection(id) {
    const side = document.getElementById('sidebar');
    if (side) side.classList.remove('active');

    document.getElementById('welcome-screen').classList.add('hidden');
    document.getElementById('main-app').classList.add('hidden');
    document.querySelectorAll('.section-content').forEach(s => s.classList.add('hidden'));

    if (id === 'welcome') {
        document.getElementById('welcome-screen').classList.remove('hidden');
    } else {
        document.getElementById('main-app').classList.remove('hidden');
        const sec = document.getElementById(`sec-${id}`);
        if (sec) sec.classList.remove('hidden');
        if (id === 'stats') setTimeout(generarStats, 100);
    }
}

// --- BUSCADOR Y AÑADIR ---
async function buscarSeries() {
    const input = document.getElementById('initialInput');
    const query = input.value;
    if (!query) return;

    try {
        const resp = await fetch(`https://api.themoviedb.org/3/search/tv?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=es-ES`);
        const data = await resp.json();
        const resultsDiv = document.getElementById('search-results-main');
        
        resultsDiv.innerHTML = data.results.map(s => `
            <div class="work-card-mini" onclick="confirmar(${s.id})">
                <img src="https://image.tmdb.org/t/p/w200${s.poster_path}" onerror="this.src='https://via.placeholder.com/85x125'">
                <p style="font-size:0.6rem; margin-top:5px;">${s.name}</p>
            </div>
        `).join('');
        resultsDiv.classList.remove('hidden');
    } catch (err) { console.error(err); }
}

async function confirmar(id) {
    if (coleccionSeries.some(s => s.id === id)) return alert("Ya la tienes");
    const resp = await fetch(`https://api.themoviedb.org/3/tv/${id}?api_key=${API_KEY}&language=es-ES&append_to_response=credits`);
    const serie = await resp.json();
    coleccionSeries.push(serie);
    localStorage.setItem('mis_series_data', JSON.stringify(coleccionSeries));
    alert(serie.name + " añadida");
    renderizarTodo();
}

// --- ESTADÍSTICAS ---
function generarStats() {
    const summary = document.getElementById('stats-summary');
    if (coleccionSeries.length === 0) {
        summary.innerHTML = "<p>Añade series para ver datos.</p>";
        return;
    }

    const generos = {};
    const anios = {};
    coleccionSeries.forEach(s => {
        s.genres?.forEach(g => generos[g.name] = (generos[g.name] || 0) + 1);
        const año = s.first_air_date ? s.first_air_date.split('-')[0] : 'N/A';
        anios[año] = (anios[año] || 0) + 1;
    });

    // Diseño centrado pedido
    summary.innerHTML = `
        <div class="stats-dashboard" style="display:flex; justify-content:center; gap:15px; padding:10px;">
            <div class="stat-pill" style="background:#0f0f0f; border:1px solid #222; padding:15px; border-radius:12px; text-align:center; flex:1; max-width:140px;">
                <span style="color:#e50914; font-size:2rem; font-weight:bold; display:block;">${coleccionSeries.length}</span>
                <span style="color:#888; font-size:0.65rem; text-transform:uppercase;">Series</span>
            </div>
            <div class="stat-pill" style="background:#0f0f0f; border:1px solid #222; padding:15px; border-radius:12px; text-align:center; flex:1; max-width:140px;">
                <span style="color:#e50914; font-size:2rem; font-weight:bold; display:block;">${Object.keys(generos).length}</span>
                <span style="color:#888; font-size:0.65rem; text-transform:uppercase;">Géneros</span>
            </div>
        </div>
    `;

    const ctxG = document.getElementById('chartGeneros').getContext('2d');
    if (chartG) chartG.destroy();
    chartG = new Chart(ctxG, {
        type: 'doughnut',
        data: {
            labels: Object.keys(generos),
            datasets: [{ data: Object.values(generos), backgroundColor: ['#e50914', '#564d4d', '#111', '#831010', '#ff3d3d'] }]
        },
        options: { responsive: true, plugins: { legend: { labels: { color: '#fff' } } } }
    });
}

// --- RENDERIZADO GENERAL ---
function renderizarTodo() {
    // 1. MI COLECCIÓN
    document.getElementById('series-grid').innerHTML = coleccionSeries.map(s => `
        <div class="row-item">
            <h4 style="margin-left:15px">${s.name}</h4>
            <div class="seasons-carousel">
                ${s.seasons.map(t => `<div class="card"><img src="https://image.tmdb.org/t/p/w200${t.poster_path || s.poster_path}"><p>${t.name}</p></div>`).join('')}
            </div>
        </div>`).join('');

    // 2. ACTORES
    const actorsMap = new Map();
    coleccionSeries.forEach(s => {
        s.credits?.cast?.forEach(a => {
            if (!actorsMap.has(a.id)) actorsMap.set(a.id, { name: a.name, img: a.profile_path, works: [], count: 0 });
            const act = actorsMap.get(a.id);
            act.count++;
            act.works.push({ poster: s.poster_path });
        });
    });
    dibujarGrid('actors-grid', actorsMap);

    // 3. CREADORES (Arreglado)
    const creatorsMap = new Map();
    coleccionSeries.forEach(s => {
        s.created_by?.forEach(c => {
            if (!creatorsMap.has(c.id)) creatorsMap.set(c.id, { name: c.name, img: c.profile_path, works: [], count: 0 });
            const cre = creatorsMap.get(c.id);
            cre.count++;
            cre.works.push({ poster: s.poster_path });
        });
    });
    dibujarGrid('directors-grid', creatorsMap);
}

function dibujarGrid(id, mapa) {
    const grid = document.getElementById(id);
    if (!grid) return;
    const sorted = Array.from(mapa.values()).sort((a,b) => b.count - a.count).filter(x => x.img);
    grid.innerHTML = sorted.map(i => `
        <div class="actor-row-container">
            <div class="actor-profile">
                <img class="actor-photo" src="https://image.tmdb.org/t/p/w200${i.img}">
                <div class="actor-name-label">${i.name.replace(' ', '<br>')}</div>
            </div>
            <div class="actor-works-carousel">
                ${i.works.map(w => `<div class="work-card-mini"><img src="https://image.tmdb.org/t/p/w200${w.poster}"></div>`).join('')}
            </div>
        </div>`).join('');
}
