// =====================================================================
// 1. CONFIGURAÇÕES E SEGURANÇA
// =====================================================================
// Lista oficial do Brasil (IPTV-com - curadoria focada em PT-BR)
const PLAYLIST_URL = 'https://github.com/iptv-com/iptv/raw/refs/heads/main/lists/brazil.m3u';
const ADULT_PASSWORD = "1234"; // Senha para conteúdo 18+
let isAdultUnlocked = false;

// =====================================================================
// 2. CANAIS 18+ (EXTRAÍDOS DA WEB)
// =====================================================================
// Fontes: Pastebin (listas públicas)
const ADULT_CHANNELS = [
  {
    name: "SEXTREME",
    logo: "http://www.mjc-digital.com/Logos%20Brancos/SEXTREME.png",
    url: "http://server-mjc.xyz:25461/live/xmmaNy6nX/3Z988hsacG/49.ts"
  },
  {
    name: "SEXY HOT",
    logo: "http://www.mjc-digital.com/Logos%20Brancos/SEXY%20HOT.png",
    url: "http://server-mjc.xyz:25461/live/xmmaNy6nX/3Z988hsacG/50.ts"
  },
  {
    name: "PLAYBOY TV",
    logo: "http://www.mjc-digital.com/Logos%20Brancos/PLAYBOY.jpg",
    url: "http://server-mjc.xyz:25461/live/xmmaNy6nX/3Z988hsacG/78.ts"
  },
  {
    name: "PENTHOUSE",
    logo: "http://www.mjc-digital.com/Logos%20Brancos/Penthouse_TV.png",
    url: "http://server-mjc.xyz:25461/live/xmmaNy6nX/3Z988hsacG/79.ts"
  },
  {
    name: "Canal Adulto 3",
    logo: "",
    url: "http://painel.ebanonet.com.br:25461/254126/254126/6198"
  },
  {
    name: "Canal Adulto 4",
    logo: "",
    url: "http://painel.ebanonet.com.br:25461/254126/254126/6201"
  }
];

// =====================================================================
// 3. ELEMENTOS DO HTML
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
        'Music': 'Música', 'Documentary': 'Documentário'
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
// 5. CONTROLE PARENTAL
// =====================================================================
function setupParentalControl() {
  const btnAdult = document.createElement('button');
  btnAdult.className = 'filter-btn';
  btnAdult.style.marginLeft = 'auto';
  btnAdult.style.border = '1px solid #ff4d4d';
  btnAdult.style.color = '#ff4d4d';
  btnAdult.innerHTML = '🔞 Acesso Restrito';
  
  btnAdult.onclick = () => {
    if (isAdultUnlocked) {
      alert("O conteúdo 18+ já está liberado.");
      return;
    }
    
    const password = prompt("Digite a senha para acessar o conteúdo 18+:");
    if (password === ADULT_PASSWORD) {
      isAdultUnlocked = true;
      btnAdult.innerHTML = '✅ Acesso Liberado';
      btnAdult.style.border = '1px solid #65d99a';
      btnAdult.style.color = '#65d99a';
      
      // Adiciona os canais adultos à lista principal
      ADULT_CHANNELS.forEach(ch => {
        allChannels.push({ ...ch, group: 'Adulto' });
      });
      
      generateFilters();
      renderGrid();
      alert(`Acesso liberado! ${ADULT_CHANNELS.length} canais 18+ foram adicionados.`);
    } else if (password !== null) {
      alert("Senha incorreta!");
    }
  };
  filtersContainer.appendChild(btnAdult);
}

// =====================================================================
// 6. CARREGAMENTO INICIAL
// =====================================================================
async function init() {
  grid.innerHTML = '<div class="empty-state">Baixando lista do Brasil (IPTV-com)...</div>';
  
  try {
    const response = await fetch(PLAYLIST_URL);
    if (!response.ok) throw new Error('Falha ao baixar a lista');
    
    const text = await response.text();
    allChannels = parseM3U(text);
    
    // Remove duplicados
    const unique = new Map();
    allChannels.forEach(ch => {
      if (ch.url && !unique.has(ch.url)) unique.set(ch.url, ch);
    });
    allChannels = Array.from(unique.values()).sort((a, b) => a.name.localeCompare(b.name));

    generateFilters();
    setupParentalControl();
    renderGrid();
  } catch (e) {
    console.error(e);
    grid.innerHTML = '<div class="empty-state">Erro ao carregar a lista. Verifique sua conexão.</div>';
  }
}

// =====================================================================
// 7. FILTROS E GRID
// =====================================================================
function generateFilters() {
  const categories = new Set();
  allChannels.forEach(ch => {
    if (ch.group === 'Adulto' && !isAdultUnlocked) return;
    if (ch.group) categories.add(ch.group);
  });

  const sortedCategories = Array.from(categories).sort();
  const existingAdultBtn = document.getElementById('btnAdultControl');
  
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
  
  if (existingAdultBtn) filtersContainer.appendChild(existingAdultBtn);
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
// 8. PLAYER
// =====================================================================
function playChannel(channel, cardElement) {
  if (channel.group === 'Adulto' && !isAdultUnlocked) {
    alert("Acesso negado. Libere o acesso restrito primeiro.");
    return;
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

  // HLS (.m3u8 ou .ts)
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
// 9. EVENTOS E INICIALIZAÇÃO
// =====================================================================
searchInput.addEventListener('input', renderGrid);
init();
