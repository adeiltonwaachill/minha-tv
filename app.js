// =====================================================================
// 1. CONFIGURAÇÕES
// =====================================================================
// Link oficial da lista do Brasil (IPTV-org)
const LISTA_OFICIAL = 'https://iptv-org.github.io/iptv/countries/br.m3u';
// Proxy para contornar o bloqueio de CORS do navegador
const PROXY_URL = 'https://api.allorigins.win/raw?url=';

const video = document.getElementById('videoPlayer');
const videoWrapper = document.getElementById('videoWrapper');
const grid = document.getElementById('channelGrid');
const searchInput = document.getElementById('search');
const statusBadge = document.getElementById('playerStatus');
const filtersContainer = document.getElementById('filtersContainer');

let allChannels = [];
let currentCategory = 'Todos';
let hls = null;

// =====================================================================
// 2. FUNÇÕES DE APOIO
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
// 3. CARREGAMENTO (COM PROXY E TRATAMENTO DE ERRO)
// =====================================================================
async function loadChannels() {
  grid.innerHTML = '<div class="empty-state">Baixando os 399 canais... Aguarde um instante.</div>';
  
  try {
    // Usa o proxy para baixar a lista oficial
    const response = await fetch(PROXY_URL + encodeURIComponent(LISTA_OFICIAL));
    if (!response.ok) throw new Error('Erro na rede');
    
    const text = await response.text();
    allChannels = parseM3U(text);
    
    // Remove duplicados
    const unique = new Map();
    allChannels.forEach(ch => {
      if (ch.url && !unique.has(ch.url)) unique.set(ch.url, ch);
    });
    allChannels = Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name));

    console.log(`Canais carregados com sucesso: ${allChannels.length}`);
    
    generateFilters();
    renderGrid();
    
  } catch (error) {
    console.error(error);
    grid.innerHTML = `
      <div class="empty-state">
        <p style="color:#ff4d4d; font-weight:bold; margin-bottom:10px;">Falha ao baixar a lista de 399 canais.</p>
        <p>O servidor da lista está instável ou bloqueou a conexão.</p>
        <p style="font-size:12px; color:#666; margin-top:10px;">Tente recarregar a página em alguns segundos.</p>
      </div>
    `;
  }
}

// =====================================================================
// 4. FILTROS E GRID
// =====================================================================
function generateFilters() {
  const categories = new Set();
  allChannels.forEach(ch => {
    if (ch.group) categories.add(ch.group);
  });

  const sortedCategories = Array.from(categories).sort();
  const existingAdultBtn = document.getElementById('btnAdultControl'); // Não usamos mais, mas mantém a estrutura
  
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
      renderGrid();
    };
    filtersContainer.appendChild(btn);
  });
}

function renderGrid() {
  const term = searchInput.value.toLowerCase().trim();
  const filtered = allChannels.filter(ch => {
    const matchesSearch = ch.name.toLowerCase().includes(term);
    const matchesCategory = currentCategory === 'Todos' || ch.group === currentCategory;
    return matchesSearch && matchesCategory;
  });

  grid.innerHTML = '';

  if (filtered.length === 0) {
    grid.innerHTML = '<div class="empty-state">Nenhum canal encontrado.</div>';
    return;
  }

  filtered.forEach(ch => {
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
}

// =====================================================================
// 5. PLAYER
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
// 6. EVENTOS E INICIALIZAÇÃO
// =====================================================================
searchInput.addEventListener('input', renderGrid);

// Começa o download dos 399 canais
loadChannels();
