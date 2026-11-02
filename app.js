// =====================================================================
// 1. FONTE OFICIAL (IPTV-ORG BRASIL) + CANAIS YOUTUBE MANUAIS
// =====================================================================
const PLAYLIST_URL = 'https://iptv-org.github.io/iptv/countries/br.m3u';
const ADULT_PASSWORD = "1234";
let isAdultUnlocked = false;

// =====================================================================
// 2. CANAIS MANUAIS DO YOUTUBE (ADICIONE AQUI OS QUE VOCÊ QUISER)
// =====================================================================
// Para adicionar um canal do YouTube, pegue o ID do vídeo ao vivo.
// Exemplo: https://www.youtube.com/watch?v=ABCDEFG123 -> ID é ABCDEFG123
const YOUTUBE_CHANNELS = [
  {
    name: "WT Kids Brasil (Scooby-Doo)",
    logo: "https://yt3.googleusercontent.com/ytc/APkrFKb...", // Coloque a logo se quiser
    group: "Infantil",
    url: "https://www.youtube.com/watch?v=s1LmZvLZAlM" // SUBSTITUA PELO ID DA LIVE DA WT KIDS
  },
  {
    name: "TV Novo Tempo",
    logo: "https://yt3.googleusercontent.com/ytc/APkrFKb...",
    group: "Gospel",
    url: "https://www.youtube.com/watch?v=UNI4nT1z7yw" // Link oficial da TV Novo Tempo (exemplo)
  }
];

// =====================================================================
// 3. CONFIGURAÇÕES E VARIÁVEIS
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
// 4. FUNÇÕES DE APOIO
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
        'Music': 'Música', 'Documentary': 'Documentário', 'Adult': 'Adulto'
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
// 5. INICIALIZAÇÃO (UNE LISTA OFICIAL + YOUTUBE)
// =====================================================================
async function init() {
  grid.innerHTML = '<div class="empty-state">Carregando canais...</div>';
  
  try {
    // Carrega lista oficial
    const response = await fetch(PLAYLIST_URL);
    const text = await response.text();
    allChannels = parseM3U(text);
    
    // Adiciona os canais do YouTube manualmente
    YOUTUBE_CHANNELS.forEach(ch => {
      allChannels.push({
        name: ch.name,
        logo: ch.logo,
        group: ch.group,
        url: ch.url
      });
    });

    // Remove duplicados e ordena
    const unique = new Map();
    allChannels.forEach(ch => {
      if (ch.url && !unique.has(ch.url)) unique.set(ch.url, ch);
    });
    allChannels = Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name));

    console.log(`Canais carregados: ${allChannels.length}`);
    
    generateFilters();
    setupParentalControl();
    renderGrid();
  } catch (e) {
    console.error(e);
    // Mesmo se a lista oficial falhar, mostra os canais do YouTube
    allChannels = YOUTUBE_CHANNELS.map(ch => ({ name: ch.name, logo: ch.logo, group: ch.group, url: ch.url }));
    generateFilters();
    setupParentalControl();
    renderGrid();
  }
}

// =====================================================================
// 6. FILTROS E RENDERIZAÇÃO
// =====================================================================
function generateFilters() {
  const categories = new Set();
  allChannels.forEach(ch => {
    if (ch.group && ch.group !== 'Adulto') categories.add(ch.group);
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

function setupParentalControl() {
  const btnAdult = document.createElement('button');
  btnAdult.className = 'filter-btn';
  btnAdult.style.marginLeft = 'auto';
  btnAdult.style.border = '1px solid #ff4d4d';
  btnAdult.style.color = '#ff4d4d';
  btnAdult.innerHTML = '🔞 Acesso Restrito';
  
  btnAdult.onclick = () => {
    if (isAdultUnlocked) { alert("Já liberado."); return; }
    const password = prompt("Senha:");
    if (password === ADULT_PASSWORD) {
      isAdultUnlocked = true;
      btnAdult.innerHTML = '✅ Liberado';
      btnAdult.style.borderColor = '#65d99a';
      btnAdult.style.color = '#65d99a';
      renderGrid();
    } else if (password !== null) { alert("Senha incorreta!"); }
  };
  filtersContainer.appendChild(btnAdult);
}

function renderGrid() {
  const term = searchInput.value.toLowerCase().trim();
  const filtered = allChannels.filter(ch => {
    if (ch.group === 'Adulto' && !isAdultUnlocked) return false;
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
    if (document.getElementById('playingName').textContent === ch.name) card.classList.add('active');

    const artContent = ch.logo 
      ? `<img src="${ch.logo}" alt="${ch.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"><div class="fallback-text" style="display:none;">${ch.name.substring(0, 3)}</div>`
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
// 7. PLAYER (COM SUPORTE A YOUTUBE E HLS)
// =====================================================================
function playChannel(channel, cardElement) {
  if (channel.group === 'Adulto' && !isAdultUnlocked) {
    alert("Acesso negado."); return;
  }

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

  // --- SE FOR YOUTUBE ---
  if (channel.url.includes('youtube.com') || channel.url.includes('youtu.be')) {
    let videoId = '';
    if (channel.url.includes('watch?v=')) videoId = channel.url.split('watch?v=')[1].split('&')[0];
    else if (channel.url.includes('youtu.be/')) videoId = channel.url.split('youtu.be/')[1].split('?')[0];
    
    if (videoId) {
      const iframe = document.createElement('iframe');
      // O parâmetro autoplay=1 e mute=1 ajuda a contornar bloqueios
      iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1`;
      iframe.allow = "autoplay; fullscreen; picture-in-picture";
      iframe.allowFullscreen = true;
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = '0';
      videoWrapper.appendChild(iframe);
      
      statusBadge.innerHTML = '<span class="status-dot"></span> YOUTUBE';
      if (cardElement) {
        const statusEl = cardElement.querySelector('.card-status');
        if (statusEl) { statusEl.className = 'card-status status-online'; statusEl.textContent = 'ON'; }
      }
      return;
    }
  }

  // --- SE FOR HLS (.m3u8) ---
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
// 8. EVENTOS
// =====================================================================
searchInput.addEventListener('input', renderGrid);
init();
