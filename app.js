// =====================================================================
// CONFIGURAÇÃO DA LISTA GLOBAL (IPTV-ORG)
// =====================================================================
// Lista principal com TODOS os canais do mundo (aprox. 10.000)
const GLOBAL_M3U_URL = 'https://iptv-org.github.io/iptv/index.m3u';

let allChannels = [];      // Todos os canais parseados
let filteredChannels = []; // Canais após filtro de busca/categoria
let renderedCount = 0;     // Controle de scroll infinito
const BATCH_SIZE = 100;    // Quantos canais carregar por vez na tela

const video = document.getElementById('videoPlayer');
const videoWrapper = document.getElementById('videoWrapper');
const grid = document.getElementById('channelGrid');
const searchInput = document.getElementById('search');
const statusBadge = document.getElementById('playerStatus');
const filtersContainer = document.getElementById('filtersContainer');
let hls = null;

// =====================================================================
// PARSER DE M3U (EXTRAI NOME, LOGO, GRUPO E URL)
// =====================================================================
function parseM3U(text) {
  const lines = text.split('\n');
  const channels = [];
  let currentInfo = null;

  for (let line of lines) {
    line = line.trim();
    if (line.startsWith('#EXTINF:')) {
      // Extrai o nome (tudo depois da última vírgula)
      const nameMatch = line.match(/,(.+)$/);
      let name = nameMatch ? nameMatch[1].trim() : 'Canal Desconhecido';
      
      // Limpa o nome (remove lixo técnico)
      name = name.replace(/Ⓨ/g, '').replace(/\(.*?\)/g, '').replace(/\[.*?\]/g, '').trim();

      // Extrai o grupo/categoria
      const groupMatch = line.match(/group-title="([^"]+)"/);
      let group = groupMatch ? groupMatch[1] : 'Geral';
      // Limpa o grupo
      group = group.replace(/;.*$/, ''); // Pega apenas a primeira categoria

      // Extrai a logo
      const logoMatch = line.match(/tvg-logo="([^"]+)"/);
      const logo = logoMatch ? logoMatch[1] : '';

      currentInfo = { name, group, logo };
    } else if (line && !line.startsWith('#') && currentInfo) {
      // URL do stream
      const url = line;
      // Filtro básico: só aceita links http/https e que pareçam vídeo ou youtube
      if (url.startsWith('http') || url.includes('youtube.com') || url.includes('youtu.be')) {
        channels.push({ ...currentInfo, url });
      }
      currentInfo = null;
    }
  }
  return channels;
}

// =====================================================================
// CARREGAMENTO INICIAL
// =====================================================================
async function loadGlobalChannels() {
  try {
    grid.innerHTML = '<div class="empty-state">Baixando lista global (10.000 canais)... Isso pode levar alguns segundos.</div>';
    
    const response = await fetch(GLOBAL_M3U_URL);
    if (!response.ok) throw new Error('Falha ao baixar lista');
    
    const text = await response.text();
    let parsed = parseM3U(text);

    // Filtra duplicados por URL e canais sem nome válido
    const unique = new Map();
    parsed.forEach(ch => {
      if (ch.name && ch.name !== 'Canal Desconhecido' && ch.url && !unique.has(ch.url)) {
        unique.set(ch.url, ch);
      }
    });
    
    // Converte de volta para array e ordena (Brasil primeiro, depois alfabético)
    allChannels = Array.from(unique.values());
    
    // Tenta identificar canais brasileiros pela URL ou nome para dar prioridade
    allChannels.sort((a, b) => {
      const aIsBr = a.name.includes('BR') || a.url.includes('.br') || a.group.includes('Brazil');
      const bIsBr = b.name.includes('BR') || b.url.includes('.br') || b.group.includes('Brazil');
      if (aIsBr && !bIsBr) return -1;
      if (!aIsBr && bIsBr) return 1;
      return a.name.localeCompare(b.name);
    });

    console.log(`Total de canais carregados: ${allChannels.length}`);

    generateFilters();
    applyFilters(); // Aplica filtros iniciais e renderiza

  } catch (e) {
    console.error(e);
    grid.innerHTML = '<div class="empty-state">Erro ao carregar a lista global. Verifique sua conexão.</div>';
  }
}

// =====================================================================
// FILTROS E RENDERIZAÇÃO (COM SCROLL INFINITO)
// =====================================================================
function generateFilters() {
  // Coleta categorias únicas (limitando a 20 para não poluir)
  const categories = new Set();
  allChannels.forEach(ch => {
    if (ch.group && ch.group !== 'Undefined' && ch.group !== 'General') {
      categories.add(ch.group);
    }
  });
  
  const sortedCategories = Array.from(categories).sort().slice(0, 20);

  filtersContainer.innerHTML = '<button class="filter-btn active" data-category="Todos">Todos</button>';
  
  sortedCategories.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn';
    btn.dataset.category = cat;
    btn.textContent = cat;
    btn.onclick = () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      applyFilters(cat);
    };
    filtersContainer.appendChild(btn);
  });
}

function applyFilters(category = 'Todos') {
  const term = searchInput.value.toLowerCase().trim();
  
  filteredChannels = allChannels.filter(ch => {
    const matchesSearch = ch.name.toLowerCase().includes(term);
    const matchesCategory = category === 'Todos' || ch.group === category;
    return matchesSearch && matchesCategory;
  });

  // Reseta a renderização
  renderedCount = 0;
  grid.innerHTML = '';
  
  if (filteredChannels.length === 0) {
    grid.innerHTML = '<div class="empty-state">Nenhum canal encontrado.</div>';
    return;
  }

  // Renderiza o primeiro lote
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

    // Fallback de imagem
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

  // Adiciona um botão "Carregar mais" se ainda houver canais
  if (renderedCount < filteredChannels.length) {
    const moreBtn = document.createElement('button');
    moreBtn.className = 'filter-btn';
    moreBtn.style.margin = '20px auto';
    moreBtn.style.display = 'block';
    moreBtn.style.width = '200px';
    moreBtn.textContent = `Carregar mais (${filteredChannels.length - renderedCount} restantes)`;
    moreBtn.onclick = () => {
      moreBtn.remove();
      renderNextBatch();
    };
    grid.appendChild(moreBtn);
  }
}

// =====================================================================
// LÓGICA DE PLAYER (MANTIDA)
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

  // YouTube
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

  // HLS (m3u8)
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
      if (cardElement) {
        const statusEl = cardElement.querySelector('.card-status');
        if (statusEl) { statusEl.className = 'card-status status-online'; statusEl.textContent = 'ON'; }
      }
    };
    newVideo.onerror = () => {
      statusBadge.innerHTML = '<span class="status-dot" style="background:#ff4d4d"></span> OFFLINE';
      if (cardElement) {
        const statusEl = cardElement.querySelector('.card-status');
        if (statusEl) { statusEl.className = 'card-status status-offline'; statusEl.textContent = 'OFF'; }
      }
    };
  }
}

// =====================================================================
// EVENTOS
// =====================================================================
searchInput.addEventListener('input', () => {
  // Ao digitar, aplica o filtro da categoria ativa
  const activeBtn = document.querySelector('.filter-btn.active');
  const cat = activeBtn ? activeBtn.dataset.category : 'Todos';
  applyFilters(cat);
});

// Inicia
loadGlobalChannels();
