// =====================================================================
// 1. LISTA DE CANAIS EMBUTIDA (399 CANAIS)
// =====================================================================
// Cole aqui TODO o texto do arquivo br.m3u que você baixou.
// Como é muito grande, coloquei alguns exemplos abaixo. 
// VOCÊ PRECISA SUBSTITUIR PELO TEXTO COMPLETO QUE VOCÊ BAIXOU.
const M3U_DATA = `#EXTM3U
#EXTINF:-1 tvg-logo="https://i.imgur.com/0cq0BPp.png" group-title="Geral",Canal Sete
http://play.canalsete.com.br:1935/canalsete/xpl-c7_source/playlist.m3u8
#EXTINF:-1 tvg-logo="https://conteudo.imguol.com.br/c/play/logo_canaluol_2024.svg" group-title="Geral",Canal UOL (1080p)
https://video24.mais.uol.com.br/live/6146.m3u8
#EXTINF:-1 tvg-logo="https://i.imgur.com/SnaIMgj.png" group-title="Entretenimento",Chroma TV (480p)
https://5c483b9d1019c.streamlock.net/8054/8054/playlist.m3u8
#EXTINF:-1 tvg-logo="https://eswqkrogupaisirwcsys.supabase.co/storage/v1/object/public/mbc-media/canais/1775688612576-u0628igjimf.png" group-title="Geral",Cinturao Verde
https://play.redecinturaoverde.com.br/playlist.m3u8
#EXTINF:-1 tvg-logo="https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/ESPN_4_logo.svg/960px-ESPN_4_logo.svg.png" group-title="Esportes",ESPN 4 (Brazil) (1080p)
http://181.78.197.59:8000/play/a07n/index.m3u8
#EXTINF:-1 tvg-logo="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/ESPN_wordmark.svg/960px-ESPN_wordmark.svg.png" group-title="Esportes",ESPN (Brazil) (1080p)
http://181.78.197.59:8000/play/a07z/index.m3u8
#EXTINF:-1 tvg-logo="https://i.imgur.com/7q2BmNc.png" group-title="Gospel",Fonte TV
https://59fb88a1b1108.streamlock.net/fonte/_definst_/fontetv/chunklist_w1224511652.m3u8
#EXTINF:-1 tvg-logo="https://i.imgur.com/BHYWG0h.png" group-title="Filmes",Telecine Action (1080p)
http://46.151.196.223:14326/
#EXTINF:-1 tvg-logo="https://i.imgur.com/t5oUK3C.png" group-title="Notícias",TV Sim Cachoeiro (720p)
https://5cf4a2c2512a2.streamlock.net/8104/8104/playlist.m3u8
#EXTINF:-1 tvg-logo="https://i.imgur.com/t5oUK3C.png" group-title="Notícias",TV Sim Sao Mateus (720p)
https://5cf4a2c2512a2.streamlock.net/8236/8236/playlist.m3u8
// ... CONTINUE COLANDO O RESTO DA SUA LISTA AQUI ...`;

// =====================================================================
// 2. ELEMENTOS DO HTML
// =====================================================================
const video = document.getElementById('videoPlayer');
const videoWrapper = document.getElementById('videoWrapper');
const grid = document.getElementById('channelGrid');
const searchInput = document.getElementById('search');
const statusBadge = document.getElementById('playerStatus');
const filtersContainer = document.getElementById('filtersContainer');

let allChannels = [];
let filteredChannels = [];
let currentCategory = 'Todos';
let hls = null;

// Variáveis do Scroll Infinito
let renderedCount = 0;
const BATCH_SIZE = 50; // Carrega 50 canais por vez para não travar

// =====================================================================
// 3. FUNÇÕES DE APOIO
// =====================================================================
function cleanChannelName(name) {
  return name.replace(/Ⓨ/g, '').replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').replace(/HD|SD|FHD/gi, '').trim();
}

function parseM3U(text) {
  const lines = text.split('\n');
  const channels = [];
  let currentInfo = null;

  for (let line of lines) {
    line = line.trim();
    if (line.startsWith('#EXTINF:')) {
      const nameMatch = line.match(/,(.+)$/);
      let name = nameMatch ? nameMatch[1].trim() : 'Desconhecido';
      name = cleanChannelName(name);

      const logoMatch = line.match(/tvg-logo="([^"]+)"/);
      const logo = logoMatch ? logoMatch[1] : '';

      const groupMatch = line.match(/group-title="([^"]+)"/);
      let group = groupMatch ? groupMatch[1] : 'Geral';
      
      const translations = {
        'General': 'Geral', 'News': 'Notícias', 'Sports': 'Esportes', 'Movies': 'Filmes',
        'Kids': 'Infantil', 'Religious': 'Gospel', 'Entertainment': 'Entretenimento',
        'Culture': 'Cultura', 'Education': 'Educação', 'Legislative': 'Legislativo',
        'Music': 'Música', 'Documentary': 'Documentário', 'Undefined': 'Outros'
      };
      if (translations[group]) group = translations[group];

      currentInfo = { name, logo, group };
    } else if (line && !line.startsWith('#') && currentInfo) {
      const url = line;
      if (url.startsWith('http')) {
        channels.push({ ...currentInfo, url });
      }
      currentInfo = null;
    }
  }
  return channels;
}

// =====================================================================
// 4. INICIALIZAÇÃO
// =====================================================================
function init() {
  grid.innerHTML = '<div class="empty-state">Processando canais...</div>';
  
  try {
    allChannels = parseM3U(M3U_DATA);
    
    // Remove duplicados e ordena
    const unique = new Map();
    allChannels.forEach(ch => {
      if (ch.url && !unique.has(ch.url)) unique.set(ch.url, ch);
    });
    allChannels = Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name));

    generateFilters();
    applyFilters(); // Aplica filtro inicial e começa o scroll infinito
    
  } catch (e) {
    console.error(e);
    grid.innerHTML = '<div class="empty-state">Erro ao processar os canais.</div>';
  }
}

// =====================================================================
// 5. FILTROS E SCROLL INFINITO
// =====================================================================
function generateFilters() {
  const categories = new Set();
  allChannels.forEach(ch => {
    if (ch.group) categories.add(ch.group);
  });

  const sortedCategories = Array.from(categories).sort();
  
  filtersContainer.innerHTML = '<button class="filter-btn active" data-category="Todos">Todos</button>';

  sortedCategories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn';
    btn.dataset.category = cat;
    btn.textContent = cat;
    btn.onclick = () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = cat;
      applyFilters();
    };
    filtersContainer.appendChild(btn);
  });
}

function applyFilters() {
  const term = searchInput.value.toLowerCase().trim();
  
  // Cria a lista filtrada
  filteredChannels = allChannels.filter(ch => {
    const matchesSearch = ch.name.toLowerCase().includes(term);
    const matchesCategory = currentCategory === 'Todos' || ch.group === currentCategory;
    return matchesSearch && matchesCategory;
  });

  // Reseta o scroll infinito
  renderedCount = 0;
  grid.innerHTML = '';
  
  if (filteredChannels.length === 0) {
    grid.innerHTML = '<div class="empty-state">Nenhum canal encontrado.</div>';
    return;
  }

  // Carrega o primeiro lote
  renderNextBatch();
}

function renderNextBatch() {
  const batch = filteredChannels.slice(renderedCount, renderedCount + BATCH_SIZE);
  
  batch.forEach(ch => {
    const card = document.createElement('div');
    card.className = 'channel-card';
    
    if (document.getElementById('playingName').textContent === ch.name) {
      card.classList.add('active');
    }

    const artContent = ch.logo 
      ? `<img src="${ch.logo}" alt="${ch.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
         <div class="fallback-text" style="display:none;">${ch.name.substring(0, 3)}</div>`
      : `<div class="fallback-text">${ch.name.substring(0, 3)}</div>`;

    card.innerHTML = `
      <div class="card-status status-unknown">OFF</div>
      <div class="channel-art">${artContent}</div>
      <div class="channel-info">
        <h3 title="${ch.name}">${ch.name}</h3>
        <p>${ch.group}</p>
      </div>
    `;

    card.onclick = () => playChannel(ch, card);
    grid.appendChild(card);
  });

  renderedCount += batch.length;
}

// EVENTO DE SCROLL INFINITO
window.addEventListener('scroll', () => {
  // Se o usuário rolou até perto do fim da página
  if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
    // E ainda tem canais para carregar
    if (renderedCount < filteredChannels.length) {
      renderNextBatch();
    }
  }
});

// =====================================================================
// 6. PLAYER
// =====================================================================
function playChannel(channel, cardElement) {
  document.getElementById('playingName').textContent = channel.name;
  document.getElementById('playingCategory').textContent = channel.group;
  
  statusBadge.style.display = 'flex';
  statusBadge.innerHTML = '<span class="status-dot"></span> CARREGANDO...';
  
  if (cardElement) {
    const statusEl = cardElement.querySelector('.card-status');
    if (statusEl) statusEl.className = 'card-status status-unknown';
  }

  if (hls) { hls.destroy(); hls = null; }
  videoWrapper.innerHTML = '';

  if (channel.url.includes('youtube.com') || channel.url.includes('youtu.be')) {
    let videoId = '';
    if (channel.url.includes('watch?v=')) videoId = channel.url.split('watch?v=')[1].split('&')[0];
    else if (channel.url.includes('youtu.be/')) videoId = channel.url.split('youtu.be/')[1].split('?')[0];
    
    if (videoId) {
      const iframe = document.createElement('iframe');
      iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1`;
      iframe.allow = "autoplay; fullscreen";
      iframe.allowFullscreen = true;
      videoWrapper.appendChild(iframe);
      
      statusBadge.innerHTML = '<span class="status-dot"></span> YOUTUBE';
      if (cardElement) {
        const statusEl = cardElement.querySelector('.card-status');
        if (statusEl) { statusEl.className = 'card-status status-online'; statusEl.textContent = 'ON'; }
      }
      return;
    }
  }

  const newVideo = document.createElement('video');
  newVideo.controls = true;
  newVideo.autoplay = true;
  newVideo.muted = true;
  newVideo.playsInline = true;
  newVideo.style.width = '100%';
  newVideo.style.height = '100%';
  newVideo.style.objectFit = 'contain';
  videoWrapper.appendChild(newVideo);

  if (Hls.isSupported()) {
    hls = new Hls();
    hls.loadSource(channel.url);
    hls.attachMedia(newVideo);
    
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      newVideo.play().catch(() => {});
      statusBadge.innerHTML = '<span class="status-dot"></span> AO VIVO';
      if (cardElement) {
        const statusEl = cardElement.querySelector('.card-status');
        if (statusEl) { statusEl.className = 'card-status status-online'; statusEl.textContent = 'ON'; }
      }
    });

    hls.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        statusBadge.innerHTML = '<span class="status-dot" style="background:#ff4d4d"></span> OFFLINE';
        if (cardElement) {
          const statusEl = cardElement.querySelector('.card-status');
          if (statusEl) { statusEl.className = 'card-status status-offline'; statusEl.textContent = 'OFF'; }
        }
        hls.destroy();
      }
    });
  } else if (newVideo.canPlayType('application/vnd.apple.mpegurl')) {
    newVideo.src = channel.url;
    newVideo.onloadedmetadata = () => {
      newVideo.play();
      statusBadge.innerHTML = '<span class="status-dot"></span> AO VIVO';
    };
  }
}

// =====================================================================
// 7. EVENTOS
// =====================================================================
searchInput.addEventListener('input', applyFilters);

// Inicializa o aplicativo
init();
