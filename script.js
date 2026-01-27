const API_KEY = 'e8b61af0cf42a633e3aa581bb73127f8';
// Toggle Sidebar
document.getElementById('sidebarCollapse').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('active');
});

let seriesData = [];

function showSection(section) {
    document.querySelectorAll('main section').forEach(s => s.className = 'hidden');
    document.getElementById(`sec-${section}`).className = 'active';
    if(section === 'stats') renderStats();
}

async function addSerie() {
    const name = document.getElementById('searchInput').value;
    if(!name) return;

    // Buscar Serie
    const res = await fetch(`https://api.themoviedb.org/3/search/tv?api_key=${API_KEY}&query=${name}&language=es-ES`);
    const data = await res.json();
    if(data.results.length === 0) return alert("No encontrada");

    const serieId = data.results[0].id;

    // Obtener detalles completos + créditos
    const detailRes = await fetch(`https://api.themoviedb.org/3/tv/${serieId}?api_key=${API_KEY}&append_to_response=credits&language=es-ES`);
    const serie = await detailRes.json();

    seriesData.push(serie);
    renderSeries();
    renderPeople();
    document.getElementById('searchInput').value = "";
}

function renderSeries() {
    const grid = document.getElementById('series-grid');
    grid.innerHTML = seriesData.map(serie => `
        <div class="serie-card">
            <img src="https://image.tmdb.org/t/p/w500${serie.poster_path}" alt="${serie.name}">
            <div class="info-overlay">
                <h3>${serie.name}</h3>
                <p><strong>Guion:</strong> ${serie.credits.crew.filter(c => c.job === 'Writer').map(c => c.name).slice(0,2).join(', ')}</p>
                <p><strong>Productor:</strong> ${serie.credits.crew.filter(c => c.job === 'Producer').map(c => c.name).slice(0,2).join(', ')}</p>
            </div>
        </div>
    `).join('');
}

function renderPeople() {
    const actorsGrid = document.getElementById('actors-grid');
    const directorsGrid = document.getElementById('directors-grid');
    
    let allActors = [];
    let allDirectors = [];

    seriesData.forEach(serie => {
        allActors.push(...serie.credits.cast.slice(0, 10));
        allDirectors.push(...serie.credits.crew.filter(c => c.job === 'Director' || c.job === 'Executive Producer').slice(0, 2));
    });

    actorsGrid.innerHTML = [...new Set(allActors.map(a => JSON.stringify(a)))].map(str => {
        const a = JSON.parse(str);
        return `<div class="person-card">
            <img src="https://image.tmdb.org/t/p/w200${a.profile_path}" onerror="this.src='https://via.placeholder.com/200x300'">
            <h4>${a.name}</h4>
        </div>`;
    }).join('');

    directorsGrid.innerHTML = [...new Set(allDirectors.map(d => JSON.stringify(d)))].map(str => {
        const d = JSON.parse(str);
        return `<div class="person-card">
            <img src="https://image.tmdb.org/t/p/w200${d.profile_path}" onerror="this.src='https://via.placeholder.com/200x300'">
            <h4>${d.name}</h4>
        </div>`;
    }).join('');
}

function renderStats() {
    const container = document.getElementById('stats-container');
    const genres = {};
    seriesData.forEach(s => s.genres.forEach(g => genres[g.name] = (genres[g.name] || 0) + 1));

    container.innerHTML = Object.keys(genres).map(g => `
        <div style="margin-bottom:10px">
            <span>${g} (${genres[g]})</span>
            <div style="background:#333; height:10px; border-radius:5px">
                <div style="background:var(--primary); height:100%; width:${(genres[g]/seriesData.length)*100}%; border-radius:5px"></div>
            </div>
        </div>
    `).join('');
}
