// 1. CONFIGURACIÓN Y VARIABLES GLOBALES
const API_KEY = 'e8b61af0cf42a633e3aa581bb73127f8';
let coleccionSeries = JSON.parse(localStorage.getItem('mis_series_data')) || [];

document.addEventListener('DOMContentLoaded', () => {
    initMenu();
    if (coleccionSeries.length > 0) renderizarTodo();
});

function initMenu() {
    const btn = document.getElementById('sidebarCollapse');
    const side = document.getElementById('sidebar');
    if (btn && side) {
        btn.onclick = (e) => { e.stopPropagation(); side.classList.toggle('active'); };
        document.onclick = (e) => { if (side.classList.contains('active') && !side.contains(e.target)) side.classList.remove('active'); };
    }
}

// Función para blindar el menú
function setupMenu() {
    const btn = document.getElementById('sidebarCollapse');
    const side = document.getElementById('sidebar');

    if (btn && side) {
        // Quitamos cualquier evento previo para no duplicar
        btn.onclick = null; 
        
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            side.classList.toggle('active');
            console.log("Menú toggle");
        });

        // Cerrar al tocar fuera (muy importante en móvil)
        document.addEventListener('click', (e) => {
            if (side.classList.contains('active') && !side.contains(e.target) && e.target !== btn) {
                side.classList.remove('active');
            }
        });
    } else {
        // Si no lo encuentra, reintenta en 500ms
        setTimeout(setupMenu, 500);
    }
}

// Ejecutar al cargar
document.addEventListener('DOMContentLoaded', setupMenu);

function showSection(id) {
    document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));
    document.getElementById('welcome-screen').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
    
    const target = document.getElementById(`sec-${id}`);
    if (target) target.classList.remove('hidden');
    else if (id === 'welcome') document.getElementById('welcome-screen').classList.remove('hidden');

    if (id === 'stats') generarStats();
    if (id === 'timeline') generarCronologia();
    document.getElementById('sidebar').classList.remove('active');
}

function renderizarTodo() {
    // 1. Series
    const seriesGrid = document.getElementById('series-grid');
    if (seriesGrid) {
        seriesGrid.innerHTML = coleccionSeries.map(s => `
    <div class="serie-group" style="width: 100%; margin-bottom: 30px;">
        <div class="serie-header" style="padding: 0 20px; display:flex; justify-content:space-between;">
            <h4>${s.name}</h4>
            <button onclick="eliminarSerie(${s.id})"><i class="fas fa-trash"></i></button>
        </div>
        <div class="seasons-carousel">
            ${s.seasons.map(t => `
                <div class="season-card">
                    <img src="https://image.tmdb.org/t/p/w200${t.poster_path || s.poster_path}" onclick="ampliarTemporada(${s.id}, ${t.season_number})">
                    <p>${t.name}</p>
                </div>
            `).join('')}
        </div>
        </div>
`).join('');

    // 2. Actores (5 por serie) y Creadores
    const actoresData = {};
    const idsVistos = new Set();
    const creadoresData = {};

    coleccionSeries.forEach(s => {
        if (s.credits?.cast) {
            let count = 0;
            s.credits.cast.forEach(a => {
                if (count < 5 && !idsVistos.has(a.id)) {
                    idsVistos.add(a.id);
                    actoresData[a.id] = { info: a, t: { p: s.poster_path, c: a.character, id: s.id } };
                    count++;
                }
            });
        }
        s.created_by?.forEach(c => {
            if (!creadoresData[c.name]) creadoresData[c.name] = { info: c, trabajos: [] };
            creadoresData[c.name].trabajos.push({ p: s.poster_path, n: s.name, id: s.id });
        });
    });

    // Inyectar Actores
    const actGrid = document.getElementById('actors-grid');
    if (actGrid) {
        actGrid.innerHTML = Object.values(actoresData).map(a => `
            <div class="actor-row">
                <img src="${a.info.profile_path ? 'https://image.tmdb.org/t/p/w200'+a.info.profile_path : 'https://via.placeholder.com/200'}" class="photo-circle">
                <div style="flex:1"><strong>${a.info.name}</strong></div>
                <div class="actor-series-carousel">
                    <div class="work-item" onclick="ampliarSerie(${a.t.id})"><img src="https://image.tmdb.org/t/p/w200${a.t.p}"><p style="font-size:0.6rem; margin:0;">${a.t.c}</p></div>
                </div>
            </div>`).join('');
    }

    // Inyectar Creadores
    const dirGrid = document.getElementById('directors-grid');
    if (dirGrid) {
        dirGrid.innerHTML = Object.values(creadoresData).map(c => `
            <div class="actor-row">
                <img src="${c.info.profile_path ? 'https://image.tmdb.org/t/p/w200'+c.info.profile_path : 'https://via.placeholder.com/200?text=Logo'}" class="photo-circle">
                <div style="flex:1"><strong>${c.info.name}</strong></div>
                <div class="actor-series-carousel">
                    ${c.trabajos.map(t => `<div class="work-item" onclick="ampliarSerie(${t.id})"><img src="https://image.tmdb.org/t/p/w200${t.p}"><p style="font-size:0.6rem; margin:0;">${t.n}</p></div>`).join('')}
                </div>
            </div>`).join('');
    }
}

async function buscarSeries() {
    const q = document.getElementById('initialInput').value;
    if (!q) return;
    const r = await fetch(`https://api.themoviedb.org/3/search/tv?api_key=${API_KEY}&query=${encodeURIComponent(q)}&language=es-ES`);
    const d = await r.json();
    window.ultimos = d.results;
    const resDiv = document.getElementById('search-results-main');
    resDiv.innerHTML = d.results.slice(0, 8).map(s => `
        <div class="search-card" onclick="verSinopsis(${s.id})" style="cursor:pointer">
            <img src="https://image.tmdb.org/t/p/w200${s.poster_path}" style="width:100px; border-radius:5px;">
            <p style="font-size:0.7rem;">${s.name}</p>
        </div>`).join('');
    resDiv.classList.remove('hidden');
}

function verSinopsis(id) {
    const s = window.ultimos.find(x => x.id == id);
    document.getElementById('img-ampliada').src = `https://image.tmdb.org/t/p/w500${s.poster_path}`;
    document.getElementById('modal-caption').innerHTML = `<h3>${s.name}</h3><p>${s.overview}</p><button onclick="confirmar(${s.id})" style="background:red; color:white; border:none; padding:10px; border-radius:5px; width:100%;">Añadir</button>`;
    document.getElementById('photo-modal').classList.remove('hidden');
}

async function confirmar(id) {
    const r = await fetch(`https://api.themoviedb.org/3/tv/${id}?api_key=${API_KEY}&language=es-ES&append_to_response=credits`);
    const serie = await r.json();
    coleccionSeries.push(serie);
    localStorage.setItem('mis_series_data', JSON.stringify(coleccionSeries));
    document.getElementById('photo-modal').classList.add('hidden');
    renderizarTodo();
    showSection('series');
}

function generarStats() {
    const area = document.getElementById('stats-area');
    const generos = {};
    coleccionSeries.forEach(s => s.genres?.forEach(g => generos[g.name] = (generos[g.name] || 0) + 1));
    area.innerHTML = `<div class="stat-card"><h3>${coleccionSeries.length}</h3><p>Series</p></div>` + 
        Object.entries(generos).map(([n, c]) => `<p>${n}: ${c}</p>`).join('');
}

function generarCronologia() {
    const grid = document.getElementById('sec-timeline-grid');
    const orden = [...coleccionSeries].sort((a,b) => new Date(b.first_air_date) - new Date(a.first_air_date));
    grid.innerHTML = orden.map(s => `<div class="timeline-item"><strong>${s.first_air_date?.split('-')[0]}</strong> - ${s.name}</div>`).join('');
}

function eliminarSerie(id) {
    if(confirm("¿Eliminar?")) {
        coleccionSeries = coleccionSeries.filter(s => s.id !== id);
        localStorage.setItem('mis_series_data', JSON.stringify(coleccionSeries));
        renderizarTodo();
    }
}

function ampliarTemporada(sId, tNum) {
    const s = coleccionSeries.find(x => x.id == sId);
    const t = s.seasons.find(x => x.season_number == tNum);
    document.getElementById('img-ampliada').src = `https://image.tmdb.org/t/p/w500${t.poster_path || s.poster_path}`;
    document.getElementById('modal-caption').innerHTML = `<h3>${t.name}</h3><p>${t.overview || 'Sin descripción'}</p>`;
    document.getElementById('photo-modal').classList.remove('hidden');
}

function ampliarSerie(id) {
    const s = coleccionSeries.find(x => x.id == id);
    document.getElementById('img-ampliada').src = `https://image.tmdb.org/t/p/w500${s.poster_path}`;
    document.getElementById('modal-caption').innerHTML = `<h3>${s.name}</h3><p>${s.overview}</p>`;
    document.getElementById('photo-modal').classList.remove('hidden');
}

document.getElementById('modalCloseBtn').onclick = () => document.getElementById('photo-modal').classList.add('hidden');
