const API_KEY = 'e8b61af0cf42a633e3aa581bb73127f8';
let seriesAgregadas = [];

document.getElementById('sidebarCollapse').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('active');
});

function showSection(id) {
    document.querySelectorAll('.section').forEach(s => {
        s.classList.add('hidden');
        s.classList.remove('active');
    });
    document.getElementById(`sec-${id}`).classList.remove('hidden');
    document.getElementById(`sec-${id}`).classList.add('active');
    document.getElementById('sidebar').classList.remove('active'); // Cerrar menú al elegir
}

async function buscarYAñadir() {
    const query = document.getElementById('serieInput').value;
    if (!query) return;
    const resp = await fetch(`https://api.themoviedb.org/3/search/tv?api_key=${API_KEY}&query=${query}&language=es-ES`);
    const data = await resp.json();
    if (data.results.length > 0) {
        const detail = await fetch(`https://api.themoviedb.org/3/tv/${data.results[0].id}?api_key=${API_KEY}&append_to_response=credits&language=es-ES`);
        const serie = await detail.json();
        seriesAgregadas.push(serie);
        dibujarTodo();
    }
    document.getElementById('serieInput').value = "";
}

// ... (resto del código igual arriba)

function dibujarTodo() {
    // 1. Dibujar Portadas de Series (Sin overlays de guionistas/productores)
    document.getElementById('series-grid').innerHTML = coleccionSeries.map(s => `
        <div class="card">
            <img src="https://image.tmdb.org/t/p/w500${s.poster_path}">
        </div>
    `).join('');

    let actHTML = "";
    let creHTML = "";

    coleccionSeries.forEach(s => {
        // 2. Actores (Top 10)
        s.credits.cast.slice(0, 10).forEach(a => {
            actHTML += crearFichaPersona(a, s.poster_path);
        });

        // 3. Creadores (Buscamos específicamente 'Created By')
        // TMDB tiene una propiedad directa llamada 'created_by' en las series
        if (s.created_by && s.created_by.length > 0) {
            s.created_by.forEach(c => {
                creHTML += crearFichaPersona(c, s.poster_path);
            });
        } else {
            // Si no hay 'created_by' definido, buscamos productores ejecutivos/directores destacados
            s.credits.crew.filter(c => c.job === 'Executive Producer' || c.job === 'Director').slice(0, 1).forEach(d => {
                creHTML += crearFichaPersona(d, s.poster_path);
            });
        }
    });

    document.getElementById('actors-grid').innerHTML = actHTML;
    document.getElementById('directors-grid').innerHTML = creHTML; // Ahora se llena con creadores
}

function crearFichaPersona(p, posterSerie) {
    // Usamos profile_path si existe, si no una imagen genérica
    const foto = p.profile_path ? `https://image.tmdb.org/t/p/w200${p.profile_path}` : 'https://via.placeholder.com/200x200?text=Sin+Foto';
    
    return `
        <div class="person-card">
            <img class="photo-circle" src="${foto}">
            <span class="person-name">${p.name}</span>
            <img class="mini-serie-poster" src="https://image.tmdb.org/t/p/w200${posterSerie}">
        </div>
    `;
}

