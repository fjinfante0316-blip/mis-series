const API_KEY = 'e8b61af0cf42a633e3aa581bb73127f8';

// CONFIGURACIÓN INICIAL
let coleccionSeries = JSON.parse(localStorage.getItem('mis_series_data')) || [];

// 1. INICIO Y MENÚ (HAMBURGUESA)
window.onload = () => {
    const btn = document.getElementById('sidebarCollapse');
    const side = document.getElementById('sidebar');

    if (btn && side) {
        btn.onclick = (e) => {
            e.stopPropagation();
            side.classList.toggle('active');
        };
        document.onclick = (e) => {
            if (side.classList.contains('active') && !side.contains(e.target) && e.target !== btn) {
                side.classList.remove('active');
            }
        };
    }
    if (coleccionSeries.length > 0) renderizarTodo();
};

// 2. NAVEGACIÓN ENTRE SECCIONES
function showSection(id) {
    const welcome = document.getElementById('welcome-screen');
    const mainApp = document.getElementById('main-app');
    
    document.querySelectorAll('.section').forEach(s => s.classList.add('hidden'));

    if (id === 'welcome') {
        welcome.classList.remove('hidden');
        mainApp.classList.add('hidden');
    } else {
        welcome.classList.add('hidden');
        mainApp.classList.remove('hidden');
        const target = document.getElementById(`sec-${id}`);
        if (target) target.classList.remove('hidden');
    }

    if (id === 'stats') generarStats();
    if (id === 'timeline') generarCronologia();
    document.getElementById('sidebar').classList.remove('active');
}

// 3. BÚSQUEDA Y PORTADA
async function buscarSeries() {
    const query = document.getElementById('initialInput').value;
    const resultsCont = document.getElementById('search-results-main');
    if (!query) return;

    try {
        const r = await fetch(`https://api.themoviedb.org/3/search/tv?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=es-ES`);
        const d = await r.json();
        window.ultimosResultados = d.results;

        resultsCont.innerHTML = d.results.slice(0, 10).map(s => `
            <div class="search-card" onclick="verSinopsisAntesDeAñadir(${s.id})">
                <img src="${s.poster_path ? 'https://image.tmdb.org/t/p/w200'+s.poster_path : 'https://via.placeholder.com/200x300?text=Sin+Poster'}">
                <div class="search-card-info"><h4>${s.name}</h4></div>
            </div>`).join('');
        resultsCont.classList.remove('hidden');
    } catch (e) { console.error(e); }
}

function verSinopsisAntesDeAñadir(id) {
    const s = window.ultimosResultados.find(x => x.id == id);
    if(!s) return;
    const modal = document.getElementById('photo-modal');
    document.getElementById('img-ampliada').src = `https://image.tmdb.org/t/p/w500${s.poster_path}`;
    document.getElementById('modal-caption').innerHTML = `
        <h2>${s.name}</h2><p>${s.overview || 'Sin sinopsis disponible.'}</p>
        <button onclick="confirmarYVolver(${s.id})" class="btn-menu" style="position:static; width:100%; margin-top:10px; background:var(--rojo);">Añadir a mi Lista</button>`;
    modal.classList.remove('hidden');
}

async function confirmarYVolver(id) {
    if (coleccionSeries.some(s => s.id === id)) { alert("Ya la tienes."); return; }
    const r = await fetch(`https://api.themoviedb.org/3/tv/${id}?api_key=${API_KEY}&language=es-ES&append_to_response=credits`);
    const serie = await r.json();
    coleccionSeries.push(serie);
    localStorage.setItem('mis_series_data', JSON.stringify(coleccionSeries));
    document.getElementById('photo-modal').classList.add('hidden');
    document.getElementById('search-results-main').classList.add('hidden');
    document.getElementById('initialInput').value = "";
    renderizarTodo();
    showSection('series');
}

// 4. RENDERIZADO (SERIES, ACTORES, CREADORES)
function renderizarTodo() {
    // Render Series
    const seriesGrid = document.getElementById('series-grid');
    if(seriesGrid) {
        seriesGrid.innerHTML = coleccionSeries.map(s => `
            <div class="serie-group">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <h4>${s.name}</h4>
                    <button onclick="eliminarSerie(${s.id})" style="background:none; border:none; color:gray; cursor:pointer;"><i class="fas fa-trash"></i></button>
                </div>
                <div class="seasons-carousel">
                    ${s.seasons.map(t => `<div class="season-card" onclick="ampliarTemporada(${s.id}, ${t.season_number})"><img src="https://image.tmdb.org/t/p/w200${t.poster_path || s.poster_path}"><p>${t.name}</p></div>`).join('')}
                </div>
            </div>`).join('');
    }

    // Procesar Actores y Creadores
    const actoresData = {};
    const creadoresData = {};

    coleccionSeries.forEach(s => {
        s.credits?.cast?.slice(0, 8).forEach(a => {
            if(!actoresData[a.id]) actoresData[a.id] = { info: a, trabajos: [] };
            actoresData[a.id].trabajos.push({ poster: s.poster_path, char: a.character, id: s.id });
        });
        s.created_by?.forEach(c => {
            if(!creadoresData[c.name]) creadoresData[c.name] = { info: c, trabajos: [] };
            creadoresData[c.name].trabajos.push({ poster: s.poster_path, nombreSerie: s.name, id: s.id });
        });
    });

    const renderFilas = (data, esActor) => Object.values(data).sort((a,b) => b.trabajos.length - a.trabajos.length).map(p => `
        <div class="actor-row">
            <div class="actor-info-side">
                <img src="${p.info.profile_path ? 'https://image.tmdb.org/t/p/w200'+p.info.profile_path : 'https://via.placeholder.com/200'}" class="photo-circle">
                <span class="person-name">${p.info.name || p.info.info?.name}</span>
            </div>
            <div class="actor-series-carousel">
                ${p.trabajos.map(t => `<div class="work-item" onclick="ampliarSerie(${t.id})"><img src="https://image.tmdb.org/t/p/w200${t.poster}"><div class="character-name">${esActor ? t.char : t.nombreSerie}</div></div>`).join('')}
            </div>
        </div>`).join('');

    if(document.getElementById('actors-grid')) document.getElementById('actors-grid').innerHTML = renderFilas(actoresData, true);
    if(document.getElementById('directors-grid')) document.getElementById('directors-grid').innerHTML = renderFilas(creadoresData, false);
}

// 5. UTILIDADES (MODAL, ELIMINAR, FILTROS)
function ampliarSerie(id) {
    const s = coleccionSeries.find(x => x.id == id);
    if(!s) return;
    document.getElementById('img-ampliada').src = `https://image.tmdb.org/t/p/w500${s.poster_path}`;
    document.getElementById('modal-caption').innerHTML = `<h2>${s.name}</h2><p>${s.overview || 'Sin sinopsis.'}</p>`;
    document.getElementById('photo-modal').classList.remove('hidden');
}

function ampliarTemporada(serieId, tNum) {
    const s = coleccionSeries.find(x => x.id == serieId);
    const t = s.seasons.find(x => x.season_number == tNum);
    document.getElementById('img-ampliada').src = `https://image.tmdb.org/t/p/w500${t.poster_path || s.poster_path}`;
    document.getElementById('modal-caption').innerHTML = `<h2>${t.name}</h2><p>${t.overview || 'Sin sinopsis disponible.'}</p>`;
    document.getElementById('photo-modal').classList.remove('hidden');
}

document.getElementById('modalCloseBtn').onclick = () => document.getElementById('photo-modal').classList.add('hidden');

function eliminarSerie(id) {
    if(confirm("¿Eliminar serie?")) {
        coleccionSeries = coleccionSeries.filter(s => s.id !== id);
        localStorage.setItem('mis_series_data', JSON.stringify(coleccionSeries));
        renderizarTodo();
    }
}

function filtrarContenido(tipo) {
    const query = document.getElementById(`filter-${tipo}`).value.toLowerCase();
    if (tipo === 'series') {
        document.querySelectorAll('#series-grid .serie-group').forEach(el => {
            el.style.display = el.querySelector('h4').innerText.toLowerCase().includes(query) ? 'block' : 'none';
        });
    } else {
        const grid = tipo === 'actors' ? 'actors-grid' : 'directors-grid';
        document.querySelectorAll(`#${grid} .actor-row`).forEach(row => {
            row.style.display = row.innerText.toLowerCase().includes(query) ? 'flex' : 'none';
        });
    }
}

function exportarDatos() {
    const blob = new Blob([JSON.stringify(coleccionSeries)], {type: "application/json"});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = "mis_series.json"; a.click();
}

function importarDatos(e) {
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            coleccionSeries = JSON.parse(event.target.result);
            localStorage.setItem('mis_series_data', JSON.stringify(coleccionSeries));
            renderizarTodo();
            alert("¡Importado!");
        } catch(err) { alert("Error en el archivo."); }
    };
    reader.readAsText(e.target.files[0]);
}
