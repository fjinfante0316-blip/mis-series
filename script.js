const API_KEY = 'e8b61af0cf42a633e3aa581bb73127f8';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_URL = 'https://image.tmdb.org/t/p/w200';

let coleccionSeries = JSON.parse(localStorage.getItem('mis_series_data')) || [];
let misNotas = JSON.parse(localStorage.getItem('mis_notas_blip')) || {};

document.addEventListener('DOMContentLoaded', () => {
    const btnMenu = document.getElementById('sidebarCollapse');
    const side = document.getElementById('sidebar');
    
    if(btnMenu) {
        btnMenu.onclick = (e) => {
            e.stopPropagation();
            side.classList.toggle('active');
        };
    }

    document.addEventListener('click', () => side?.classList.remove('active'));
    
    // Ejecutamos el renderizado inicial
    renderizarTodo();
});

// --- BUSCADOR ---
async function buscarSeries() {
    const input = document.getElementById('initialInput');
    if (!input) return;
    
    const query = input.value.trim();
    if (!query) return;

    try {
        const url = `${BASE_URL}/search/tv?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=es-ES`;
        const resp = await fetch(url);
        const data = await resp.json();

        const resultsDiv = document.getElementById('search-results-main');
        if (resultsDiv && data.results) {
            resultsDiv.innerHTML = data.results.map(s => `
                <div class="work-card-mini" onclick="agregarALaColeccion(${s.id})" style="cursor:pointer;">
                    <img src="${s.poster_path ? IMG_URL + s.poster_path : 'https://via.placeholder.com/85x125'}" style="border-radius:5px;">
                    <p style="font-size:0.6rem; margin-top:5px; color:white;">${s.name}</p>
                </div>
            `).join('');
            resultsDiv.classList.remove('hidden');
        }
    } catch (err) {
        console.error("Error en la búsqueda:", err);
    }
}

// --- AÑADIR SERIE (Nombre cambiado para evitar conflictos) ---
async function agregarALaColeccion(id) {
    if (coleccionSeries.some(s => s.id === id)) {
        return alert("Esta serie ya está en tu colección.");
    }

    try {
        const url = `${BASE_URL}/tv/${id}?api_key=${API_KEY}&language=es-ES&append_to_response=credits`;
        const resp = await fetch(url);
        const serie = await resp.json();

        if (serie.id) {
            coleccionSeries.push(serie);
            localStorage.setItem('mis_series_data', JSON.stringify(coleccionSeries));
            alert(`¡${serie.name} añadida!`);
            renderizarTodo(); 
        }
    } catch (err) {
        console.error("Error al añadir:", err);
    }
}

// --- UTILIDADES ---
function obtenerMediaSerie(serieId) {
    const notas = Object.keys(misNotas).filter(k => k.startsWith(`${serieId}_`)).map(k => misNotas[k]);
    return notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : 0;
}

function guardarNota(serieId, tempNum, valor) {
    const key = `${serieId}_${tempNum}`;
    valor ? misNotas[key] = parseInt(valor) : delete misNotas[key];
    localStorage.setItem('mis_notas_blip', JSON.stringify(misNotas));
    renderizarTodo();
}

function eliminarSerie(id) {
    if (confirm("¿Eliminar serie y sus notas?")) {
        coleccionSeries = coleccionSeries.filter(s => s.id !== id);
        Object.keys(misNotas).forEach(k => { if(k.startsWith(`${id}_`)) delete misNotas[k]; });
        localStorage.setItem('mis_series_data', JSON.stringify(coleccionSeries));
        localStorage.setItem('mis_notas_blip', JSON.stringify(misNotas));
        renderizarTodo();
    }
}

// --- RENDERIZADO ---
async function renderizarTodo() {
    const gridS = document.getElementById('series-grid');
    if (gridS) {
        const ordenada = [...coleccionSeries].sort((a,b) => obtenerMediaSerie(b.id) - obtenerMediaSerie(a.id));
        gridS.innerHTML = ordenada.map(s => {
            const media = obtenerMediaSerie(s.id);
            return `
            <div class="row-item">
                <div style="display:flex; justify-content:space-between; align-items:center; padding: 10px 15px;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <h4>${s.name}</h4>
                        <span class="serie-media-badge">⭐ ${media > 0 ? media.toFixed(1) : '---'}</span>
                    </div>
                    <span onclick="eliminarSerie(${s.id})" style="cursor:pointer">🗑️</span>
                </div>
                <div class="seasons-carousel">
                    ${s.seasons.map(t => `
                        <div class="card">
                            <div class="img-container"><img src="${IMG_URL+(t.poster_path || s.poster_path)}"></div>
                            <p class="season-title">${t.name}</p>
                            <select class="nota-selector" onchange="guardarNota('${s.id}','${t.season_number}',this.value)">
                                <option value="">⭐</option>
                                ${[1,2,3,4,5,6,7,8,9,10].map(n => `<option value="${n}" ${misNotas[s.id+'_'+t.season_number]==n?'selected':''}>${n}</option>`).join('')}
                            </select>
                        </div>`).join('')}
                </div>
            </div>`;
        }).join('');
    }

    // Actualización de mapas de personas
    const actorsMap = new Map(), cameosMap = new Map(), creatorsMap = new Map();

    for (const s of coleccionSeries) {
        s.created_by?.forEach(c => processP(creatorsMap, c, s.poster_path, s.id));
        const puntuadas = s.seasons.filter(t => misNotas[`${s.id}_${t.season_number}`]);
        
        for (const t of puntuadas) {
            try {
                const data = await fetch(`${BASE_URL}/tv/${s.id}/season/${t.season_number}/credits?api_key=${API_KEY}&language=es-ES`).then(r=>r.json());
                data.cast?.forEach(a => {
                    const map = (a.episode_count || 1) >= 5 ? actorsMap : cameosMap;
                    processP(map, a, s.poster_path, s.id, a.episode_count || 1);
                });
            } catch(e) { console.error(e); }
        }
    }
    dibujarGrid('actors-grid', actorsMap);
    dibujarGrid('cameos-grid', cameosMap);
    dibujarGrid('directors-grid', creatorsMap);
}

function processP(map, p, post, sid, caps = 0) {
    if (!map.has(p.id)) map.set(p.id, { name: p.name, img: p.profile_path, works: [], ids: new Set(), caps: 0 });
    const ref = map.get(p.id);
    ref.ids.add(sid);
    ref.caps += caps;
    if (ref.works.length < 5 && !ref.works.includes(post)) ref.works.push(post);
}

function dibujarGrid(id, mapa) {
    const el = document.getElementById(id);
    if (!el) return;
    const lista = [...mapa.values()].map(p => {
        let suma = 0, conta = 0;
        p.ids.forEach(sid => { const m = obtenerMediaSerie(sid); if(m>0){ suma+=m; conta++; }});
        p.media = conta > 0 ? suma/conta : 0;
        return p;
    }).filter(p => p.img).sort((a,b) => b.media - a.media);

    el.innerHTML = lista.map(p => `
        <div class="actor-row-container">
            <div class="actor-profile">
                <img class="actor-photo" src="${IMG_URL+p.img}">
                <div class="actor-name-label">${p.name}</div>
                <div class="actor-score">⭐ ${p.media > 0 ? p.media.toFixed(1) : 'N/A'}</div>
                ${p.caps > 0 ? `<div style="font-size:0.6rem; color:gray">${p.caps} caps</div>` : ''}
            </div>
            <div class="actor-works-carousel">${p.works.map(w => `<div class="work-card-mini"><img src="${IMG_URL+w}"></div>`).join('')}</div>
        </div>`).join('');
}
