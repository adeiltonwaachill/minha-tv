// =====================================================================
// 1. CONFIGURAÇÕES
// =====================================================================

// Lista pública do IPTV-org.
// Atenção: a disponibilidade e os direitos de cada canal dependem da fonte.
const LISTA_OFICIAL = 'https://iptv-org.github.io/iptv/countries/br.m3u';

// Proxy para tentar contornar o CORS.
// Pode ficar indisponível; por isso o código também trata falhas.
const PROXY_URL = 'https://api.allorigins.win/raw?url=';

const videoWrapper = document.getElementById('videoWrapper');
const grid = document.getElementById('channelGrid');
const searchInput = document.getElementById('search');
const statusBadge = document.getElementById('playerStatus');
const filtersContainer = document.getElementById('filtersContainer');

let allChannels = [];
let currentCategory = 'Todos';
let hls = null;
let currentChannel = null;
let loadController = null;

// =====================================================================
// 2. FUNÇÕES AUXILIARES
// =====================================================================

function cleanChannelName(name) {
    return String(name || 'Canal desconhecido')
        .replace(/Ⓨ/g, '')
        .replace(/\(.*?\)/g, '')
        .replace(/\[.*?\]/g, '')
        .replace(/\b(HD|SD|FHD|UHD|4K)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function translateCategory(group) {
    const translations = {
        'General': 'Geral',
        'News': 'Notícias',
        'Sports': 'Esportes',
        'Movies': 'Filmes',
        'Kids': 'Infantil',
        'Religious': 'Gospel',
        'Entertainment': 'Entretenimento',
        'Culture': 'Cultura',
        'Education': 'Educação',
        'Legislative': 'Legislativo',
        'Music': 'Música',
        'Documentary': 'Documentário',
        'Undefined': 'Outros'
    };

    return translations[group] || group || 'Geral';
}

// Extrai um atributo de uma linha EXTINF.
// Suporta atributos entre aspas.
function getAttribute(line, attribute) {
    const regex = new RegExp(
        `${attribute}="([^"]*)"`,
        'i'
    );

    const match = line.match(regex);
    return match ? match[1].trim() : '';
}

// =====================================================================
// 3. LEITURA DA LISTA M3U
// =====================================================================

function parseM3U(text) {
    const lines = text.split(/\r?\n/);
    const channels = [];

    let currentInfo = null;

    for (const originalLine of lines) {
        const line = originalLine.trim();

        if (!line) continue;

        if (line.startsWith('#EXTINF:')) {
            const commaIndex = line.lastIndexOf(',');

            let name = 'Canal desconhecido';

            if (commaIndex !== -1) {
                name = line.substring(commaIndex + 1).trim();
            }

            name = cleanChannelName(name);

            const logo = getAttribute(line, 'tvg-logo');
            const group = translateCategory(
                getAttribute(line, 'group-title')
            );

            currentInfo = {
                name,
                logo,
                group
            };

        } else if (
            line.startsWith('http://') ||
            line.startsWith('https://')
        ) {
            if (currentInfo) {
                channels.push({
                    ...currentInfo,
                    url: line
                });

                currentInfo = null;
            }
        }
    }

    return channels;
}

// =====================================================================
// 4. CARREGAMENTO DA LISTA
// =====================================================================

async function loadChannels() {
    if (!grid) {
        console.error('Elemento channelGrid não encontrado.');
        return;
    }

    if (loadController) {
        loadController.abort();
    }

    loadController = new AbortController();

    grid.innerHTML = `
        <div class="empty-state">
            Carregando canais...
        </div>
    `;

    try {
        const listUrl =
            PROXY_URL + encodeURIComponent(LISTA_OFICIAL);

        const response = await fetch(listUrl, {
            signal: loadController.signal,
            cache: 'no-cache'
        });

        if (!response.ok) {
            throw new Error(
                `Erro HTTP ${response.status}`
            );
        }

        const text = await response.text();

        if (!text.includes('#EXTM3U')) {
            throw new Error(
                'O conteúdo recebido não parece ser uma lista M3U válida.'
            );
        }

        const parsedChannels = parseM3U(text);

        // Remove canais duplicados pela URL.
        const uniqueChannels = new Map();

        parsedChannels.forEach(channel => {
            if (
                channel.url &&
                !uniqueChannels.has(channel.url)
            ) {
                uniqueChannels.set(
                    channel.url,
                    channel
                );
            }
        });

        allChannels = Array.from(
            uniqueChannels.values()
        ).sort((a, b) =>
            a.name.localeCompare(b.name, 'pt-BR')
        );

        console.log(
            `Canais carregados: ${allChannels.length}`
        );

        generateFilters();
        renderGrid();

    } catch (error) {
        if (error.name === 'AbortError') {
            return;
        }

        console.error(
            'Erro ao carregar a lista:',
            error
        );

        grid.innerHTML = `
            <div class="empty-state">
                <p style="color:#ff4d4d;font-weight:bold;">
                    Não foi possível carregar os canais.
                </p>

                <p>
                    A lista ou o serviço de proxy pode estar
                    temporariamente indisponível.
                </p>

                <p style="font-size:12px;color:#999;margin-top:10px;">
                    Tente novamente mais tarde.
                </p>

                <button
                    class="filter-btn"
                    id="retryLoad"
                    type="button"
                >
                    Tentar novamente
                </button>
            </div>
        `;

        const retryButton =
            document.getElementById('retryLoad');

        if (retryButton) {
            retryButton.addEventListener(
                'click',
                loadChannels
            );
        }
    }
}

// =====================================================================
// 5. FILTROS DE CATEGORIA
// =====================================================================

function generateFilters() {
    if (!filtersContainer) return;

    const categories = new Set();

    allChannels.forEach(channel => {
        if (channel.group) {
            categories.add(channel.group);
        }
    });

    const sortedCategories = Array.from(
        categories
    ).sort((a, b) =>
        a.localeCompare(b, 'pt-BR')
    );

    filtersContainer.replaceChildren();

    createFilterButton(
        'Todos',
        true
    );

    sortedCategories.forEach(category => {
        createFilterButton(
            category,
            false
        );
    });
}

function createFilterButton(category, active) {
    const button = document.createElement('button');

    button.className = active
        ? 'filter-btn active'
        : 'filter-btn';

    button.dataset.category = category;
    button.textContent = category;
    button.type = 'button';

    button.addEventListener('click', () => {
        currentCategory = category;

        document
            .querySelectorAll('.filter-btn')
            .forEach(filterButton => {
                filterButton.classList.remove('active');
            });

        button.classList.add('active');

        renderGrid();
    });

    filtersContainer.appendChild(button);
}

// =====================================================================
// 6. EXIBIÇÃO DOS CANAIS
// =====================================================================

function renderGrid() {
    if (!grid || !searchInput) return;

    const term = searchInput.value
        .toLowerCase()
        .trim();

    const filteredChannels = allChannels.filter(channel => {
        const matchesSearch =
            channel.name.toLowerCase().includes(term);

        const matchesCategory =
            currentCategory === 'Todos' ||
            channel.group === currentCategory;

        return matchesSearch && matchesCategory;
    });

    grid.replaceChildren();

    if (filteredChannels.length === 0) {
        const emptyState = document.createElement('div');

        emptyState.className = 'empty-state';
        emptyState.textContent =
            'Nenhum canal encontrado.';

        grid.appendChild(emptyState);
        return;
    }

    filteredChannels.forEach(channel => {
        const card = createChannelCard(channel);
        grid.appendChild(card);
    });
}

function createChannelCard(channel) {
    const card = document.createElement('div');

    card.className = 'channel-card';
    card.tabIndex = 0;
    card.setAttribute(
        'role',
        'button'
    );

    card.setAttribute(
        'aria-label',
        `Assistir ${channel.name}`
    );

    if (
        currentChannel &&
        currentChannel.url === channel.url
    ) {
        card.classList.add('active');
    }

    const status = document.createElement('div');

    status.className =
        'card-status status-unknown';

    status.textContent = 'AGUARDANDO';

    const art = document.createElement('div');

    art.className = 'channel-art';

    if (channel.logo) {
        const image = document.createElement('img');

        image.src = channel.logo;
        image.alt = channel.name;
        image.loading = 'lazy';

        image.onerror = () => {
            image.remove();

            const fallback =
                createFallbackText(channel.name);

            art.appendChild(fallback);
        };

        art.appendChild(image);
    } else {
        art.appendChild(
            createFallbackText(channel.name)
        );
    }

    const info = document.createElement('div');

    info.className = 'channel-info';

    const title = document.createElement('h3');

    title.textContent = channel.name;
    title.title = channel.name;

    const category = document.createElement('p');

    category.textContent = channel.group;

    info.appendChild(title);
    info.appendChild(category);

    card.appendChild(status);
    card.appendChild(art);
    card.appendChild(info);

    card.addEventListener('click', () => {
        playChannel(channel);
    });

    card.addEventListener('keydown', event => {
        if (
            event.key === 'Enter' ||
            event.key === ' '
        ) {
            event.preventDefault();
            playChannel(channel);
        }
    });

    return card;
}

function createFallbackText(name) {
    const fallback = document.createElement('div');

    fallback.className = 'fallback-text';

    fallback.textContent = String(name)
        .substring(0, 3)
        .toUpperCase();

    return fallback;
}

// =====================================================================
// 7. PLAYER
// =====================================================================

function updatePlayerStatus(message, type = 'loading') {
    if (!statusBadge) return;

    statusBadge.style.display = 'flex';
    statusBadge.replaceChildren();

    const dot = document.createElement('span');

    dot.className = 'status-dot';

    if (type === 'error') {
        dot.style.background = '#ff4d4d';
    }

    const text = document.createElement('span');

    text.textContent = message;

    statusBadge.appendChild(dot);
    statusBadge.appendChild(text);
}

function destroyPlayer() {
    if (hls) {
        hls.destroy();
        hls = null;
    }

    if (videoWrapper) {
        videoWrapper.replaceChildren();
    }
}

function extractYouTubeId(url) {
    try {
        const parsedUrl = new URL(url);

        if (
            parsedUrl.hostname.includes('youtube.com')
        ) {
            return parsedUrl.searchParams.get('v') ||
                parsedUrl.pathname.split('/').pop();
        }

        if (
            parsedUrl.hostname === 'youtu.be'
        ) {
            return parsedUrl.pathname
                .split('/')
                .filter(Boolean)[0];
        }

        return null;

    } catch {
        return null;
    }
}

function playChannel(channel) {
    if (!channel || !videoWrapper) return;

    currentChannel = channel;

    const playingName =
        document.getElementById('playingName');

    const playingCategory =
        document.getElementById('playingCategory');

    if (playingName) {
        playingName.textContent = channel.name;
    }

    if (playingCategory) {
        playingCategory.textContent = channel.group;
    }

    updatePlayerStatus(
        'CARREGANDO...',
        'loading'
    );

    destroyPlayer();

    // Atualiza os cards para indicar o canal selecionado.
    renderGrid();

    // -------------------------------------------------
    // YouTube
    // -------------------------------------------------

    if (
        channel.url.includes('youtube.com') ||
        channel.url.includes('youtu.be')
    ) {
        const videoId =
            extractYouTubeId(channel.url);

        if (!videoId) {
            updatePlayerStatus(
                'LINK DO YOUTUBE INVÁLIDO',
                'error'
            );

            return;
        }

        const iframe =
            document.createElement('iframe');

        iframe.src =
            `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?autoplay=1`;

        iframe.title = channel.name;

        iframe.allow =
            'autoplay; encrypted-media; picture-in-picture; fullscreen';

        iframe.allowFullscreen = true;

        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = '0';

        videoWrapper.appendChild(iframe);

        updatePlayerStatus(
            'YOUTUBE',
            'loading'
        );

        return;
    }

    // -------------------------------------------------
    // Player de vídeo
    // -------------------------------------------------

    const video = document.createElement('video');

    video.controls = true;
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;

    video.style.width = '100%';
    video.style.height = '100%';
    video.style.objectFit = 'contain';

    videoWrapper.appendChild(video);

    video.addEventListener('playing', () => {
        updatePlayerStatus(
            'AO VIVO',
            'online'
        );

        updateCardStatus(
            channel.url,
            'ON',
            'status-online'
        );
    });

    video.addEventListener('error', () => {
        updatePlayerStatus(
            'ERRO NA REPRODUÇÃO',
            'error'
        );

        updateCardStatus(
            channel.url,
            'OFF',
            'status-offline'
        );
    });

    video.addEventListener('waiting', () => {
        updatePlayerStatus(
            'CARREGANDO...',
            'loading'
        );
    });

    // -------------------------------------------------
    // HLS.js
    // -------------------------------------------------

    if (
        typeof Hls !== 'undefined' &&
        Hls.isSupported()
    ) {
        hls = new Hls({
            enableWorker: true,
            lowLatencyMode: false,
            backBufferLength: 30
        });

        hls.loadSource(channel.url);
        hls.attachMedia(video);

        hls.on(
            Hls.Events.MANIFEST_PARSED,
            () => {
                video.play().catch(() => {
                    updatePlayerStatus(
                        'PRESSIONE PLAY',
                        'loading'
                    );
                });
            }
        );

        hls.on(
            Hls.Events.ERROR,
            (event, data) => {
                if (!data.fatal) return;

                console.error(
                    'Erro fatal HLS:',
                    data
                );

                updatePlayerStatus(
                    'CANAL INDISPONÍVEL',
                    'error'
                );

                updateCardStatus(
                    channel.url,
                    'OFF',
                    'status-offline'
                );

                if (hls) {
                    hls.destroy();
                    hls = null;
                }
            }
        );

    // -------------------------------------------------
    // HLS nativo, como Safari e alguns navegadores de TV
    // -------------------------------------------------

    } else if (
        video.canPlayType(
            'application/vnd.apple.mpegurl'
        )
    ) {
        video.src = channel.url;

        video.play().catch(() => {
            updatePlayerStatus(
                'PRESSIONE PLAY',
                'loading'
            );
        });

    } else {
        updatePlayerStatus(
            'FORMATO NÃO SUPORTADO',
            'error'
        );
    }
}

// =====================================================================
// 8. STATUS DOS CARDS
// =====================================================================

function updateCardStatus(
    channelUrl,
    label,
    statusClass
) {
    const cards =
        document.querySelectorAll('.channel-card');

    cards.forEach(card => {
        const title =
            card.querySelector('.channel-info h3');

        if (!title) return;

        const channel = allChannels.find(
            item => item.url === channelUrl
        );

        if (
            !channel ||
            title.textContent !== channel.name
        ) {
            return;
        }

        const status =
            card.querySelector('.card-status');

        if (!status) return;

        status.className =
            `card-status ${statusClass}`;

        status.textContent = label;
    });
}

// =====================================================================
// 9. EVENTOS E INICIALIZAÇÃO
// =====================================================================

if (searchInput) {
    searchInput.addEventListener(
        'input',
        renderGrid
    );
}

loadChannels();
