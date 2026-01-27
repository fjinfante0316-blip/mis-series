const API_KEY = 'e8b61af0cf42a633e3aa581bb73127f8';
const grid = document.getElementById('series-grid');

async function buscarSerie() {
    const query = document.getElementById('serieInput').value;
    if(!query) return;

    // 1. Buscar el ID de la serie
    const searchRes = await fetch(`https://api.themoviedb.org/3/search/tv?api_key=${API_KEY}&query=${query}&language=es-ES`);
    const searchData = await searchRes.json();
    const serieId = searchData.results[0].id;

    // 2. Obtener detalles y créditos (actores, directores, etc)
    const detailRes = await fetch(`https://api.themoviedb.org/3/tv/${serieId}?api_key=${API_KEY}&append_to_response=credits&language=es-ES`);
    const serie = await detailRes.json();

    renderSerie(serie);
}

function renderSerie(serie) {
    const credits = serie.credits;
    
    // Filtrar Datos
    const directores = credits.crew.filter(person => person.job === 'Director' || person.job === 'Executive Producer').slice(0, 2);
    const actores = credits.cast.slice(0, 10);
    const guionistas = credits.crew.filter(person => person.job === 'Writer' || person.department === 'Writing').slice(0, 3);
    const productores = credits.crew.filter(person => person.job === 'Producer').slice(0, 3);

    const card = document.createElement('div');
    card.className = 'serie-card';
    card.innerHTML = `
        <img src="https://image.tmdb.org/t/p/w500${serie.poster_path}" alt="${serie.name}">
        <div class="overlay">
            <h3>${serie.name}</h3>
            <p><strong>Directores:</strong> ${directores.map(d => d.name).join(', ') || 'N/A'}</p>
            <p><strong>Guionistas:</strong> ${guionistas.map(g => g.name).join(', ') || 'N/A'}</p>
            <p><strong>Productores:</strong> ${productores.map(p => p.name).join(', ') || 'N/A'}</p>
            <p><strong>Actores:</strong> ${actores.map(a => a.name).join(', ')}</p>
        </div>
    `;
    grid.prepend(card);
}
