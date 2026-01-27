const API_KEY = 'e8b61af0cf42a633e3aa581bb73127f8';
// Control del Menú Hamburguesa
document.getElementById('sidebarCollapse').addEventListener('click', function () {
    document.getElementById('sidebar').classList.toggle('active');
});

let seriesAgregadas = [];

// Cambiar entre secciones
function showSection(id) {
    document.querySelectorAll('.section').forEach(s => s.classList.replace('active', 'hidden'));
    document.getElementById(`sec-${id}`).classList.replace('hidden', 'active');
    if (id === 'stats') actualizarEstadisticas();
}

async function buscarYAñadir() {
    const query = document.getElementById('serieInput').value;
    if (!query) return;

    // 1. Buscar la serie
    const resp = await fetch(`https://api.themoviedb.org/3/search/tv?api_key=${API_KEY}&query=${query}&language=es-ES`);
    const data = await resp.json();
    if (data.results.length === 0) return alert("Serie no encontrada");

    const serieId = data.results[0].id;

    // 2. Obtener créditos (actores, directores, guionistas)
    const detalleResp = await fetch(`https://api.themoviedb.org/3/tv/${serieId}?api_key=${API_KEY}&append_to_response=credits&language=es-ES`);
    const serie = await detalleResp.json();

    seriesAgregadas.push(serie);
    dibujarSeries();
    dibujarPersonas();
    document.getElementById('serieInput').value = "";
}

function dibujarSeries() {
    const grid = document.getElementById('series-grid');
    grid.innerHTML = seriesAgregadas.map(s => {
        const guion = s.credits.crew.filter(c => c.job === 'Writer').map(c => c.name).slice(0, 2).join(', ');
        const prod = s.credits.crew.filter(c => c.job === 'Producer').map(c => c.name).slice(0, 2).join(', ');
        
        return `
            <div class="card">
                <img src="https://image.tmdb.org/t/p/w500${s.poster_path}" alt="${s.name}">
                <div class="overlay">
                    <p><strong>Guion:</strong> ${guion || 'N/A'}</p>
                    <p><strong>Productor:</strong> ${prod || 'N/A'}</p>
                </div>
            </div>
        `;
    }).join('');
}

function dibujarPersonas() {
    const actGrid = document.getElementById('actors-grid');
    const dirGrid = document.getElementById('directors-grid');

    let todosActores = [];
    let todosDirectores = [];

    seriesAgregadas.forEach(s => {
        todosActores.push(...s.credits.cast.slice(0, 10));
        todosDirectores.push(...s.credits.crew.filter(c => c.job === 'Director' || c.job === 'Executive Producer').slice(0, 2));
    });

    // Eliminar duplicados y dibujar
    const renderFicha = p => `
        <div class="card" style="text-align:center">
            <img src="https://image.tmdb.org/t/p/w200${p.profile_path}" onerror="this.src='https://via.placeholder.com/200x300?text=Sin+Foto'">
            <p style="padding:5px; font-size:12px">${p.name}</p>
        </div>
    `;

    actGrid.innerHTML = Array.from(new Set(todosActores.map(a => a.id))).map(id => renderFicha(todosActores.find(a => a.id === id))).join('');
    dirGrid.innerHTML = Array.from(new Set(todosDirectores.map(d => d.id))).map(id => renderFicha(todosDirectores.find(d => d.id === id))).join('');
}

function actualizarEstadisticas() {
    const container = document.getElementById('stats-area');
    const conteo = {};
    seriesAgregadas.forEach(s => s.genres.forEach(g => conteo[g.name] = (conteo[g.name] || 0) + 1));

    container.innerHTML = Object.keys(conteo).map(gen => {
        const porcentaje = (conteo[gen] / seriesAgregadas.length) * 100;
        return `
            <div style="margin-bottom:15px">
                <span>${gen}: ${conteo[gen]} series</span>
                <div style="background:#333; height:12px; border-radius:10px; overflow:hidden">
                    <div style="background:var(--rojo); width:${porcentaje}%; height:100%"></div>
                </div>
            </div>
        `;
    }).join('');
}
