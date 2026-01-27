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

function dibujarTodo() {
    // Dibujar Series
    document.getElementById('series-grid').innerHTML = seriesAgregadas.map(s => `
        <div class="card"><img src="https://image.tmdb.org/t/p/w500${s.poster_path}"></div>
    `).join('');

    // Dibujar Actores con mini póster
    let htmlActores = "";
    seriesAgregadas.forEach(s => {
        s.credits.cast.slice(0, 10).forEach(actor => {
            htmlActores += `
                <div class="actor-card">
                    <img class="actor-photo" src="https://image.tmdb.org/t/p/w200${actor.profile_path}" onerror="this.src='https://via.placeholder.com/200'">
                    <span class="actor-name">${actor.name}</span>
                    <img class="mini-poster" src="https://image.tmdb.org/t/p/w200${s.poster_path}">
                </div>
            `;
        });
    });
    document.getElementById('actors-grid').innerHTML = htmlActores;

    // Directores (similar)
    let htmlDirs = "";
    seriesAgregadas.forEach(s => {
        s.credits.crew.filter(c => c.job === 'Director').forEach(dir => {
            htmlDirs += `
                <div class="actor-card">
                    <img class="actor-photo" src="https://image.tmdb.org/t/p/w200${dir.profile_path}" onerror="this.src='https://via.placeholder.com/200'">
                    <span class="actor-name">${dir.name}</span>
                    <img class="mini-poster" src="https://image.tmdb.org/t/p/w200${s.poster_path}">
                </div>
            `;
        });
    });
    document.getElementById('directors-grid').innerHTML = htmlDirs;
}
