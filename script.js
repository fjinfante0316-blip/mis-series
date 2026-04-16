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
    renderizarTodo();
});

function showSection(id) {
    document.querySelectorAll('.section-content, #welcome-screen, #main-app').forEach(el => el.classList.add('hidden'));
    
    if (id === 'welcome') {
        document.getElementById('welcome-screen').classList.remove('hidden');
    } else {
        document.getElementById('main-app').classList.remove('hidden');
        const target = document.getElementById(`sec-${id}`);
        if(target) target.classList.remove('hidden');
    }
}

async function buscarSeries() {
    const input = document.getElementById('initialInput');
    const query = input.value.trim();
    if (!query) return;

    try {
        const url = `${BASE_URL}/search/tv?api_key=${API_KEY}&query=${encodeURIComponent(query)}&language=es-ES`;
        const resp = await fetch(url);
        const data = await resp.json();
        const resultsDiv = document.getElementById('search-results-main');

        if (resultsDiv && data.results) {
            resultsDiv.innerHTML = data.results.map(s => `
                <div class="work-card-mini" onclick="agregarSerie(${s.id})" style="cursor:pointer;">
                    <img src="${s.poster_path ? IMG_URL + s.poster_path : 'https://via.placeholder.com/85x125'}">
                    <p>${s.name}</p>
                </div>
            `).join('');
            resultsDiv.classList.remove('hidden');
        }
    } catch (err) { console.error(err); }
}

async function agregarSerie(id) {
    if (coleccionSeries.some(s => s.id === id)) return alert("Ya la tienes.");
    try {
        const url = `${BASE_URL}/tv/${id}?api_key=${API_KEY}&language=es-ES&append_to_response=credits`;
        const resp = await fetch(url);
        const serie = await resp.json();
        coleccionSeries.push(serie);
        localStorage.setItem('mis_series_data', JSON.stringify(coleccionSeries));
        renderizarTodo();
        alert(`${serie.name} añadida`);
    } catch (err) { console.error(err); }
}

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

async function renderizarTodo() {
    const gridS = document.getElementById('series-grid');
    if (gridS) {
        const ordenada = [...coleccionSeries].sort((a,b) => obtenerMediaSerie(b.id) - obtenerMediaSerie(a.id));
        gridS.innerHTML = ordenada.map(s => {
            const media = obtenerMediaSerie(s.id);
            return `
            <div class="row-item">
                <div style="display:flex; justify-content:space-between; align-items:center; padding: 10px 15px;">
                    <h4>${s.name} <small style="color:gold; margin-left:10px;">⭐ ${media > 0 ? media.toFixed(1) : '-'}</small></h4>
                    <span onclick="eliminarSerie(${s.id})" style="cursor:pointer">🗑️</span>
                </div>
                <div class="seasons-carousel">
                    ${s.seasons.map(t => `
                        <div class="card">
                            <div class="img-container"><img src="${IMG_URL+(t.poster_path || s.poster_path)}"></div>
                            <p class="season-title">${t.name}</p>
                            <select onchange="guardarNota('${s.id}','${t.season_number}',this.value)">
                                <option value="">⭐</option>
                                ${[1,2,3,4,5,6,7,8,9,10].map(n => `<option value="${n}" ${misNotas[s.id+'_'+t.season_number]==n?'selected':''}>${n}</option>`).join('')}
                            </select>
                        </div>`).join('')}
                </div>
            </div>`;
        }).join('');
    }

    const actorsMap = new Map(), creatorsMap = new Map();
    
    for (const s of coleccionSeries) {
        // PROCESAR CREADORES 
        // (Usamos la media de la serie porque su impacto es en toda la obra)
        const mediaSerie = obtenerMediaSerie(s.id);
        s.created_by?.forEach(c => {
            processP(creatorsMap, c, s.poster_path, s.id, mediaSerie);
        });
        
        // PROCESAR ACTORES
        // Solo iteramos por las temporadas que tienen nota guardada
        const temporadasPuntuadas = s.seasons.filter(t => misNotas[`${s.id}_${t.season_number}`]);
        
        for (const t of temporadasPuntuadas) {
            try {
                // Obtenemos la nota específica de esta temporada
                const notaEstaTemporada = misNotas[`${s.id}_${t.season_number}`];
                
                const data = await fetch(`${BASE_URL}/tv/${s.id}/season/${t.season_number}/credits?api_key=${API_KEY}&language=es-ES`).then(r=>r.json());
                
                data.cast?.forEach(a => {
                    // Pasamos la nota de la temporada a la función processP
                    processP(actorsMap, a, s.poster_path, s.id, notaEstaTemporada);
                });
            } catch(e) { 
                console.error("Error cargando créditos de la temporada:", e); 
            }
        }
    }
    
    dibujarGrid('actors-grid', actorsMap);
    dibujarGrid('directors-grid', creatorsMap);
}

function processP(map, p, post, sid, notaTemporada) {
    if (!map.has(p.id)) {
        map.set(p.id, { 
            name: p.name, 
            img: p.profile_path, 
            works: [], 
            notasTemporadas: [] // Nueva lista para guardar notas individuales
        });
    }
    const ref = map.get(p.id);
    
    // Guardamos la nota si existe
    if (notaTemporada) {
        ref.notasTemporadas.push(notaTemporada);
    }
    
    if (ref.works.length < 5 && !ref.works.includes(post)) {
        ref.works.push(post);
    }
} // Llave cerrada correctamente ahora

function dibujarGrid(id, mapa) {
    const el = document.getElementById(id);
    if (!el) return;
    
    const lista = [...mapa.values()].map(p => {
        // Calculamos la media basada SOLO en las temporadas donde aparece
        const suma = p.notasTemporadas.reduce((a, b) => a + b, 0);
        p.media = p.notasTemporadas.length > 0 ? suma / p.notasTemporadas.length : 0;
        return p;
    }).filter(p => p.img).sort((a,b) => b.media - a.media);

    el.innerHTML = lista.map(p => `
        <div class="actor-row-container">
            <div class="actor-profile">
                <img class="actor-photo" src="${p.img ? IMG_URL+p.img : 'https://via.placeholder.com/60x90'}">
                <div class="actor-name-label">${p.name}</div>
                <div class="actor-score">⭐ ${p.media > 0 ? p.media.toFixed(1) : '---'}</div>
            </div>
            <div class="actor-works-carousel">
                ${p.works.map(w => `<div class="work-card-mini"><img src="${IMG_URL+w}"></div>`).join('')}
            </div>
        </div>`).join('');
}
    
function eliminarSerie(id) {
    if(confirm("¿Eliminar?")) {
        coleccionSeries = coleccionSeries.filter(s => s.id !== id);
        localStorage.setItem('mis_series_data', JSON.stringify(coleccionSeries));
        renderizarTodo();
    }
}
