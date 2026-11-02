// =====================================================================
// SUA LISTA M3U (Embutida)
// =====================================================================
const M3U_DATA = `#EXTM3U
#EXTINF:-1 tvg-name="COM Brasil" tvg-logo="https://i.imgur.com/c8ztQnF.png" group-title="Brazil",COM Brasil
https://br5093.streamingdevideo.com.br/abc/abc/playlist.m3u8
#EXTINF:-1 tvg-name="SBT" tvg-logo="https://logodownload.org/wp-content/uploads/2013/12/sbt-logo.png" group-title="Brazil",SBT Ⓨ
https://www.youtube.com/watch?v=ABVQXgr2LW4
#EXTINF:-1 tvg-name="AgroBrasil TV" tvg-logo="https://upload.wikimedia.org/wikipedia/pt/6/60/Logo_AgroBrasilTV.jpg" group-title="Brazil",AgroBrasil TV
http://45.162.230.234:1935/agrobrasiltv/agrobrasiltv/playlist.m3u8
#EXTINF:-1 tvg-name="Futura" tvg-logo="https://upload.wikimedia.org/wikipedia/commons/c/ce/Canal_Futura_2022.svg" group-title="Brazil",Futura
http://168.197.104.22/FUTURA/index.m3u8
#EXTINF:-1 tvg-name="RBC" tvg-logo="https://portal.rbc1.com.br/public/portal/img/layout/logorbc.png" group-title="Brazil",RBC Ⓨ
https://www.youtube.com/watch?v=oUdd3CsxYaE
#EXTINF:-1 tvg-name="Record News" tvg-logo="https://upload.wikimedia.org/wikipedia/commons/4/46/Record_News_logo_2023.svg" group-title="Brazil",Record News
https://rnw-rn.otteravision.com/rnw/rn/rnw_rn.m3u8
#EXTINF:-1 tvg-name="ISTV" tvg-logo="https://upload.wikimedia.org/wikipedia/pt/b/b5/Logotipo_da_ISTV.png" group-title="Brazil",ISTV
https://video08.logicahost.com.br/istvnacional/srt.stream/istvnacional.m3u8
#EXTINF:-1 tvg-name="Rede Brasil" tvg-logo="https://upload.wikimedia.org/wikipedia/commons/d/d1/Marca_rede_brasil_rgb-color.png" group-title="Brazil",Rede Brasil
https://video09.logicahost.com.br/redebrasiloficial/redebrasiloficial/playlist.m3u8
#EXTINF:-1 tvg-name="TV Câmara" tvg-logo="https://i.imgur.com/UpV2PRk.png" group-title="Brazil",TV Câmara
https://stream3.camara.gov.br/tv1/manifest.m3u8
#EXTINF:-1 tvg-name="TVE RS" tvg-logo="https://upload.wikimedia.org/wikipedia/commons/c/c2/Logotipo_da_TVE_RS.png" group-title="Brazil",TVE RS
http://streaming.procergs.com.br:1935/tve/stve/playlist.m3u8
#EXTINF:-1 tvg-name="TV Cultura" tvg-logo="https://upload.wikimedia.org/wikipedia/commons/8/82/Cultura_logo_2013.svg" group-title="Brazil",TV Cultura
https://player-tvcultura.stream.uol.com.br/live/tvcultura.m3u8`;

// =====================================================================
// CONFIGURAÇÕES E VARIÁVEIS
// =====================================================================
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
// FUNÇÕES DE APOIO
// =====================================================================
function cleanChannelName(name) {
  return name
    .replace(/Ⓨ/g, '')
    .replace(/\(.*?\)/g, '')
    .replace(/\[.*?\]/g, '')
    .replace(/HD|SD|FHD/gi, '')
    .trim();
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
      if (group === 'Brazil' || group === 'BR') group = 'Brasil';

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
// INICIALIZAÇÃO
// =====================================================================
function init() {
  allChannels = parseM3U(M3U_DATA);
  console.log(`Canais carregados: ${allChannels.length}`);
  generateFilters();
  renderGrid();
}

// =====================================================================
// FILTROS E GRID
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
// PLAYER
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

  // Se for YouTube
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

  // Se for HLS (m3u8)
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
        statusBadge.style.background = 'rgba(255, 77, 77, 0.1)';
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
searchInput.addEventListener('input', renderGrid);

// Inicia a aplicação
init();
