// =====================================================================
// 1. LISTA M3U EMBUTIDA (COLE O TEXTO COMPLETO AQUI DENTRO)
// =====================================================================
const M3U_DATA = `#EXTM3U
#EXTINF:-1 tvg-logo="https://i.imgur.com/0cq0BPp.png" group-title="Geral",Canal Sete
http://play.canalsete.com.br:1935/canalsete/xpl-c7_source/playlist.m3u8
#EXTINF:-1 tvg-logo="https://conteudo.imguol.com.br/c/play/logo_canaluol_2024.svg" group-title="Geral",Canal UOL
https://video24.mais.uol.com.br/live/6146.m3u8
#EXTINF:-1 tvg-logo="https://i.imgur.com/SnaIMgj.png" group-title="Entretenimento",Chroma TV
https://5c483b9d1019c.streamlock.net/8054/8054/playlist.m3u8
#EXTINF:-1 tvg-logo="https://upload.wikimedia.org/wikipedia/commons/thumb/7/78/ESPN_4_logo.svg/960px-ESPN_4_logo.svg.png" group-title="Esportes",ESPN 4
http://181.78.197.59:8000/play/a07n/index.m3u8
#EXTINF:-1 tvg-logo="https://upload.wikimedia.org/wikipedia/commons/thumb/2/2f/ESPN_wordmark.svg/960px-ESPN_wordmark.svg.png" group-title="Esportes",ESPN
http://181.78.197.59:8000/play/a07z/index.m3u8
#EXTINF:-1 tvg-logo="https://i.imgur.com/7q2BmNc.png" group-title="Gospel",Fonte TV
https://59fb88a1b1108.streamlock.net/fonte/_definst_/fontetv/chunklist_w1224511652.m3u8
#EXTINF:-1 tvg-logo="https://i.imgur.com/BHYWG0h.png" group-title="Filmes",Telecine Action
http://46.151.196.223:14326/
#EXTINF:-1 tvg-logo="https://i.imgur.com/t5oUK3C.png" group-title="Notícias",TV Sim Cachoeiro
https://5cf4a2c2512a2.streamlock.net/8104/8104/playlist.m3u8
// COLE O RESTO DA SUA LISTA AQUI`;
// =====================================================================
// 2. ELEMENTOS DO HTML E VARIÁVEIS GLOBAIS
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
const BATCH_SIZE = 50; // Carrega 50 canais por vez

// =====================================================================
// 3. FUNÇÕES DE APOIO
// =====================================================================
function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

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
// 4. INICIALIZAÇÃO E RENDERIZAÇÃO
// =====================================================================
function init() {
  grid.innerHTML = '<div class="empty-state">Processando canais...</div>';
  
  if (!M3U_DATA || M3U_DATA.length < 100) {
    grid.innerHTML = '<div class="empty-state" style="color:#ff4d4d;">Erro: A lista de canais não foi embutida corretamente.</div>';
    return;
  }

  try {
    allChannels = parseM3U(M3U_DATA);
    
    const unique = new Map();
    allChannels.forEach(ch => {
      if (ch.url && !unique.has(ch.url)) unique.set(ch.url, ch);
    });
    allChannels = Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name));

    generateFilters();
    applyFilters();
  } catch (e) {
    console.error(e);
    grid.innerHTML = '<div class="empty-state">Erro ao processar os canais.</div>';
  }
}

function generateFilters() {
  const categories = new Set();
  allChannels.forEach(ch => { if (ch.group) categories.add(ch.group); });
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
  filteredChannels = allChannels.filter(ch => {
    const matchesSearch = ch.name.toLowerCase().includes(term);
    const matchesCategory = currentCategory === 'Todos' || ch.group === currentCategory;
    return matchesSearch && matchesCategory;
  });

  renderedCount = 0;
  grid.innerHTML = '';
  
  if (filteredChannels.length === 0) {
    grid.innerHTML = '<div class="empty-state">Nenhum canal encontrado.</div>';
    return;
  }
  renderNextBatch();
}

function renderNextBatch() {
  const batch = filteredChannels.slice(renderedCount, renderedCount + BATCH_SIZE);
  
  batch.forEach(ch => {
    const card = document.createElement('div');
    card.className = 'channel-card';
    card.tabIndex = 0; // Permite foco via teclado/controle

    if (document.getElementById('playingName').textContent === ch.name) {
      card.classList.add('active');
    }

    const safeName = escapeHTML(ch.name);
    const artContent = ch.logo 
      ? `<img src="${ch.logo}" alt="${safeName}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
         <div class="fallback-text" style="display:none;">${safeName.substring(0, 3)}</div>`
      : `<div class="fallback-text">${safeName.substring(0, 3)}</div>`;

    card.innerHTML = `
      <div class="card-status status-unknown">OFF</div>
      <div class="channel-art">${artContent}</div>
      <div class="channel-info">
        <h3 title="${safeName}">${safeName}</h3>
        <p>${ch.group}</p>
      </div>
    `;

    card.onclick = () => playChannel(ch, card);
    // Adiciona evento de teclado para "Enter"
    card.onkeydown = (e) => {
        if (e.key === 'Enter' || e.keyCode === 13) {
            playChannel(ch, card);
        }
    };
    grid.appendChild(card);
  });
  renderedCount += batch.length;
}

// Scroll Infinito
window.addEventListener('scroll', () => {
  if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
    if (renderedCount < filteredChannels.length) {
      renderNextBatch();
    }
  }
});

// =====================================================================
// 5. PLAYER (Com Recuperação de Erro)
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

  // HLS
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
        switch(data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            console.log('Erro de rede, tentando recuperar...');
            hls.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            console.log('Erro de mídia, tentando recuperar...');
            hls.recoverMediaError();
            break;
          default:
            statusBadge.innerHTML = '<span class="status-dot" style="background:#ff4d4d"></span> OFFLINE';
            if (cardElement) {
              const statusEl = cardElement.querySelector('.card-status');
              if (statusEl) { statusEl.className = 'card-status status-offline'; statusEl.textContent = 'OFF'; }
            }
            hls.destroy();
            break;
        }
      }
    });
  } else if (newVideo.canPlayType('application/vnd.apple.mpegurl')) {
    newVideo.src = channel.url;
    newVideo.onloadedmetadata = () => {
      newVideo.play();
      statusBadge.innerHTML = '<span class="status-dot"></span> AO VIVO';
    };
    newVideo.onerror = () => {
      statusBadge.innerHTML = '<span class="status-dot" style="background:#ff4d4d"></span> OFFLINE';
    };
  }
}

// =====================================================================
// 6. NAVEGAÇÃO POR TECLADO (TV/Controle Remoto)
// =====================================================================
document.addEventListener('keydown', (e) => {
    const cards = Array.from(document.querySelectorAll('.channel-card'));
    if (cards.length === 0) return;
    
    // Se o foco estiver no player, não mexe na navegação
    if (document.activeElement === video || document.activeElement.tagName === 'IFRAME') return;

    let currentIndex = cards.findIndex(card => card === document.activeElement);
    
    // Se nenhum card estiver focado, começa do primeiro
    if (currentIndex === -1 && (e.keyCode === 40 || e.key === 'ArrowDown')) {
        e.preventDefault();
        cards[0].focus();
        return;
    }

    if (e.key === 'ArrowDown' || e.keyCode === 40) { // Baixo
        e.preventDefault();
        if (currentIndex < cards.length - 1) cards[currentIndex + 1].focus();
    } else if (e.key === 'ArrowUp' || e.keyCode === 38) { // Cima
        e.preventDefault();
        if (currentIndex > 0) cards[currentIndex - 1].focus();
    } else if (e.key === 'ArrowRight' || e.keyCode === 39) { // Direita
        e.preventDefault();
        if (currentIndex < cards.length - 1) cards[currentIndex + 1].focus();
    } else if (e.key === 'ArrowLeft' || e.keyCode === 37) { // Esquerda
        e.preventDefault();
        if (currentIndex > 0) cards[currentIndex - 1].focus();
    }
});

// =====================================================================
// 7. EVENTOS E INICIALIZAÇÃO
// =====================================================================
searchInput.addEventListener('input', applyFilters);
init();
