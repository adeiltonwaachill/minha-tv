from pathlib import Path

html = r'''<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#07111f">
<title>Minha.TV — Canais ao vivo</title>
<style>
:root{color-scheme:dark;--bg:#07111f;--panel:#0d1b2c;--text:#f3f6fb;--muted:#9aaabd;--orange:#f28c28;--line:#23374d}
*{box-sizing:border-box}body{margin:0;background:linear-gradient(180deg,#091626,#050b13);color:var(--text);font-family:Arial,Helvetica,sans-serif}
header{position:sticky;top:0;z-index:5;background:rgba(7,17,31,.97);border-bottom:1px solid var(--line);padding:16px clamp(14px,3vw,38px)}
.topbar{display:flex;align-items:center;gap:18px;flex-wrap:wrap}.brand{font-size:26px;font-weight:900;letter-spacing:-1px}.brand span{color:var(--orange)}.tagline{color:var(--muted);font-size:13px}
.controls{display:flex;gap:10px;flex:1;min-width:min(100%,260px)}input{background:#101f31;color:var(--text);border:1px solid #2a4058;border-radius:10px;padding:12px 14px;font-size:15px;min-width:0;width:100%}
button:focus-visible,input:focus-visible{outline:2px solid var(--orange);outline-offset:2px}.small-btn,.filter-btn{border:1px solid #2a4058;background:#101f31;color:#d8e2ef;padding:10px 13px;border-radius:999px;cursor:pointer;white-space:nowrap}.small-btn:hover,.filter-btn:hover{border-color:var(--orange)}
main{padding:24px clamp(14px,3vw,38px) 40px;max-width:1700px;margin:auto}.section-title{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin:4px 0 14px}.section-title h1{font-size:20px;margin:0}.muted{color:var(--muted);font-size:13px}
.player-layout{display:grid;grid-template-columns:minmax(0,1.75fr) minmax(220px,.8fr);gap:18px;margin-bottom:28px}.player-box,.now-playing{background:var(--panel);border:1px solid var(--line);border-radius:16px;overflow:hidden}.player-screen{background:#000;aspect-ratio:16/9;position:relative;display:flex;align-items:center;justify-content:center}.player-screen video,.player-screen iframe{display:block;width:100%;height:100%;border:0;object-fit:contain}.player-placeholder{text-align:center;padding:28px;color:var(--muted)}.play-symbol{font-size:46px;color:var(--orange);margin-bottom:12px}.player-meta{padding:14px 16px;display:flex;justify-content:space-between;gap:12px;align-items:center}.player-meta h2{font-size:17px;margin:0 0 5px}.status{font-size:11px;letter-spacing:.5px;font-weight:800;border-radius:999px;padding:7px 10px;background:#26374a;color:#d4deea;white-space:nowrap}.status.loading{color:#ffd18a;background:#4b321b}.status.live{color:#9af0c4;background:#123a2b}.status.error{color:#ffb5b5;background:#4b2025}
.now-playing{padding:18px}.now-playing h2{font-size:16px;margin:0 0 14px}.info-row{padding:12px 0;border-bottom:1px solid var(--line)}.info-row:last-child{border-bottom:0}.info-row strong{display:block;font-size:13px;margin-bottom:5px}.info-row span{font-size:13px;color:var(--muted);overflow-wrap:anywhere}
.filters{display:flex;gap:8px;flex-wrap:wrap;margin:12px 0 18px}.filter-btn{font-size:13px}.filter-btn.active{background:var(--orange);color:#17110a;border-color:var(--orange);font-weight:800}
.channel-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(155px,1fr));gap:12px}.channel-card{position:relative;text-align:left;background:linear-gradient(145deg,#12243a,#0b1726);border:1px solid var(--line);border-radius:13px;padding:14px 12px;cursor:pointer;min-width:0;color:var(--text)}.channel-card:hover{border-color:#627b98}.channel-card.active{border:1px solid var(--orange);box-shadow:0 0 0 1px rgba(242,140,40,.12)}.channel-art{height:78px;display:flex;align-items:center;justify-content:center;margin-bottom:12px;background:#091321;border-radius:9px;overflow:hidden}.channel-art img{width:100%;height:100%;object-fit:contain;padding:8px}.fallback-text{font-weight:900;font-size:23px;color:var(--orange);text-align:center;overflow-wrap:anywhere;padding:8px}.channel-info h3{font-size:14px;margin:0 0 5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.channel-info p{font-size:12px;color:var(--muted);margin:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;padding-right:35px}.card-status{position:absolute;top:9px;right:9px;font-size:9px;font-weight:900;padding:4px 6px;border-radius:5px;background:#293747;color:#cbd5e1}.card-status.status-online{background:#123a2b;color:#9af0c4}.card-status.status-offline{background:#4b2025;color:#ffb5b5}.empty-state{grid-column:1/-1;text-align:center;padding:36px 16px;border:1px dashed #31445a;border-radius:12px;color:var(--muted);line-height:1.6}.error-text{color:#ffb5b5}.footer{margin-top:34px;border-top:1px solid var(--line);padding-top:18px;color:var(--muted);font-size:12px;line-height:1.6}
@media(max-width:760px){.player-layout{grid-template-columns:1fr}.now-playing{display:grid;grid-template-columns:1fr 1fr;gap:0 14px}.now-playing h2{grid-column:1/-1}.channel-grid{grid-template-columns:repeat(auto-fill,minmax(130px,1fr))}}
@media(max-width:420px){.channel-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.now-playing{display:block}.topbar{gap:10px}.controls{flex-basis:100%}}
</style>
<script src="https://cdn.jsdelivr.net/npm/hls.js@1.5.17/dist/hls.min.js"></script>
</head>
<body>
<header><div class="topbar"><div><div class="brand">Minha<span>.TV</span></div><div class="tagline">Canais ao vivo em um só lugar</div></div><div class="controls"><input id="search" type="search" placeholder="Buscar canal..." aria-label="Buscar canal" autocomplete="off"><button id="reloadBtn" class="small-btn" type="button">Atualizar lista</button></div></div></header>
<main>
<div class="section-title"><h1>Assistir agora</h1><span id="channelCount" class="muted">Preparando lista de canais…</span></div>
<section class="player-layout" aria-label="Player de canais"><div class="player-box"><div id="videoWrapper" class="player-screen"><div class="player-placeholder"><div class="play-symbol">▶</div><strong>Escolha um canal para começar</strong><p>Selecione um canal na lista abaixo.</p></div></div><div class="player-meta"><div><h2 id="playingName">Nenhum canal selecionado</h2><div id="playingCategory" class="muted">—</div></div><div id="playerStatus" class="status">AGUARDANDO</div></div></div>
<aside class="now-playing"><h2>Informações</h2><div class="info-row"><strong>Fonte</strong><span>IPTV-org — lista pública de canais</span></div><div class="info-row"><strong>Reprodução</strong><span>Depende do formato, disponibilidade e permissões do canal.</span></div><div class="info-row"><strong>Navegação</strong><span>Use Tab e Enter ou o controle remoto compatível.</span></div></aside></section>
<section aria-label="Catálogo de canais"><div class="section-title"><h1>Catálogo</h1><span id="filterCount" class="muted"></span></div><div id="filtersContainer" class="filters"><button class="filter-btn active" type="button" data-category="Todos">Todos</button></div><div id="channelGrid" class="channel-grid" aria-live="polite"><div class="empty-state">Carregando canais…</div></div></section>
<footer class="footer">Minha.TV é um catálogo de acesso a transmissões disponíveis publicamente. Os canais são fornecidos por terceiros; disponibilidade, direitos de transmissão, restrições regionais e compatibilidade variam. O catálogo não garante que todos os links funcionem. Prefira transmissões oficiais e autorizadas.</footer>
</main>
<script>
'use strict';
const LISTA_OFICIAL='https://iptv-org.github.io/iptv/countries/br.m3u';
const PROXY_URL='https://api.allorigins.win/raw?url=';
const videoWrapper=document.getElementById('videoWrapper'),grid=document.getElementById('channelGrid'),searchInput=document.getElementById('search'),statusBadge=document.getElementById('playerStatus'),filtersContainer=document.getElementById('filtersContainer'),countLabel=document.getElementById('channelCount'),filterCount=document.getElementById('filterCount'),playingName=document.getElementById('playingName'),playingCategory=document.getElementById('playingCategory'),reloadBtn=document.getElementById('reloadBtn');
let allChannels=[],currentCategory='Todos',hls=null,currentVideo=null,activeUrl='',loadController=null,playAttempt=0;

function cleanChannelName(name){return String(name||'Canal desconhecido').replace(/Ⓨ/g,'').replace(/\s*\([^)]*\)\s*/g,' ').replace(/\s*\[[^\]]*\]\s*/g,' ').replace(/\b(?:HD|SD|FHD|UHD|4K)\b/gi,'').replace(/\s+/g,' ').trim()||'Canal desconhecido'}
function safeHttpUrl(value){try{const u=new URL(value);return ['http:','https:'].includes(u.protocol)?u.href:''}catch{return ''}}
function parseM3U(text){
 const lines=String(text||'').replace(/^\uFEFF/,'').split(/\r?\n/),channels=[];let info=null;
 const translations={General:'Geral',News:'Notícias',Sports:'Esportes',Movies:'Filmes',Kids:'Infantil',Religious:'Religioso',Entertainment:'Entretenimento',Culture:'Cultura',Education:'Educação',Legislative:'Legislativo',Music:'Música',Documentary:'Documentário',Undefined:'Outros'};
 for(const raw of lines){const line=raw.trim();if(!line)continue;
  if(line.startsWith('#EXTINF:')){const comma=line.lastIndexOf(','),name=cleanChannelName(comma>=0?line.slice(comma+1).trim():'Canal desconhecido'),logoMatch=line.match(/\btvg-logo="([^"]*)"/i),groupMatch=line.match(/\bgroup-title="([^"]*)"/i);let group=groupMatch?.[1]?.trim()||'Geral';group=translations[group]||group;info={name,logo:safeHttpUrl(logoMatch?.[1]||''),group}}
  else if(line.startsWith('#'))continue;
  else if(info){const url=safeHttpUrl(line);if(url)channels.push({...info,url});info=null}
 }
 const unique=new Map();for(const ch of channels)if(!unique.has(ch.url))unique.set(ch.url,ch);
 return [...unique.values()].sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'))
}
function setStatus(msg,type=''){statusBadge.textContent=msg;statusBadge.className=('status '+type).trim()}
function showEmpty(msg,isError=false){grid.replaceChildren();const box=document.createElement('div');box.className='empty-state'+(isError?' error-text':'');box.textContent=msg;grid.appendChild(box)}
async function loadChannels(){
 if(loadController)loadController.abort();loadController=new AbortController();const signal=loadController.signal;reloadBtn.disabled=true;reloadBtn.textContent='Carregando…';countLabel.textContent='Baixando lista…';showEmpty('Baixando a lista pública de canais. Aguarde…');
 try{
  let response;
  try{response=await fetch(LISTA_OFICIAL,{signal,cache:'no-cache'});if(!response.ok)throw new Error('HTTP '+response.status)}
  catch(err){if(signal.aborted)throw err;response=await fetch(PROXY_URL+encodeURIComponent(LISTA_OFICIAL),{signal,cache:'no-cache'});if(!response.ok)throw new Error('Proxy HTTP '+response.status)}
  const parsed=parseM3U(await response.text());if(!parsed.length)throw new Error('Nenhum canal válido na lista');allChannels=parsed;
  if(!allChannels.some(ch=>ch.group===currentCategory)&&currentCategory!=='Todos')currentCategory='Todos';
  generateFilters();renderGrid();countLabel.textContent=`${allChannels.length} canais carregados`;
 }catch(err){if(err.name==='AbortError')return;console.error('Erro ao carregar lista:',err);countLabel.textContent='Lista indisponível';showEmpty('Não foi possível carregar a lista. Verifique a conexão e tente novamente.',true)}
 finally{if(!signal.aborted){reloadBtn.disabled=false;reloadBtn.textContent='Atualizar lista'}}
}
function generateFilters(){
 const categories=[...new Set(allChannels.map(ch=>ch.group||'Geral'))].sort((a,b)=>a.localeCompare(b,'pt-BR'));filtersContainer.replaceChildren();
 for(const category of ['Todos',...categories]){const btn=document.createElement('button');btn.type='button';btn.className='filter-btn'+(currentCategory===category?' active':'');btn.dataset.category=category;btn.textContent=category;btn.addEventListener('click',()=>{currentCategory=category;generateFilters();renderGrid()});filtersContainer.appendChild(btn)}
}
function renderGrid(){
 const term=searchInput.value.toLocaleLowerCase('pt-BR').trim(),filtered=allChannels.filter(ch=>ch.name.toLocaleLowerCase('pt-BR').includes(term)&&(currentCategory==='Todos'||ch.group===currentCategory));
 grid.replaceChildren();filterCount.textContent=`${filtered.length} de ${allChannels.length} canais`;if(!filtered.length){showEmpty('Nenhum canal encontrado. Tente outro nome ou categoria.');return}
 const frag=document.createDocumentFragment();
 for(const ch of filtered){
  const card=document.createElement('button');card.type='button';card.className='channel-card'+(activeUrl===ch.url?' active':'');card.setAttribute('aria-label','Reproduzir '+ch.name);
  const badge=document.createElement('span');badge.className='card-status';badge.textContent=activeUrl===ch.url?'SELEC.':'DISP.';badge.title='Disponibilidade ainda não testada';card.appendChild(badge);
  const art=document.createElement('div');art.className='channel-art';
  const fallback=()=>{const f=document.createElement('div');f.className='fallback-text';f.textContent=ch.name.slice(0,3).toUpperCase();return f};
  if(ch.logo){const img=document.createElement('img');img.src=ch.logo;img.alt='';img.loading='lazy';img.referrerPolicy='no-referrer';img.addEventListener('error',()=>img.replaceWith(fallback()),{once:true});art.appendChild(img)}else art.appendChild(fallback());
  const info=document.createElement('div');info.className='channel-info';const title=document.createElement('h3');title.textContent=ch.name;title.title=ch.name;const cat=document.createElement('p');cat.textContent=ch.group;info.append(title,cat);card.append(art,info);card.addEventListener('click',()=>playChannel(ch));frag.appendChild(card)
 }
 grid.appendChild(frag)
}
function clearPlayer(){if(hls){hls.destroy();hls=null}if(currentVideo){currentVideo.pause();currentVideo.removeAttribute('src');currentVideo.load();currentVideo=null}videoWrapper.replaceChildren()}
function updateCardStatus(kind){
 for(const card of grid.querySelectorAll('.channel-card')){const selected=card.getAttribute('aria-label')==='Reproduzir '+playingName.textContent;card.classList.toggle('active',selected);const badge=card.querySelector('.card-status');if(!selected)continue;
  if(kind==='online'){badge.className='card-status status-online';badge.textContent='ON';badge.title='O vídeo começou a reproduzir'}
  else if(kind==='offline'){badge.className='card-status status-offline';badge.textContent='ERRO';badge.title='Falha ao reproduzir; pode haver incompatibilidade ou bloqueio'}
  else{badge.className='card-status';badge.textContent='…';badge.title='Tentando reproduzir'}
 }
}
function playerMessage(msg){const box=document.createElement('div');box.className='player-placeholder';const p=document.createElement('p');p.textContent=msg;box.appendChild(p);videoWrapper.replaceChildren(box)}
function extractYouTubeId(value){try{const u=new URL(value);if(u.hostname==='youtu.be'||u.hostname.endsWith('.youtu.be'))return u.pathname.split('/').filter(Boolean)[0]||'';if(u.hostname.includes('youtube.com')){if(u.pathname==='/watch')return u.searchParams.get('v')||'';const p=u.pathname.split('/').filter(Boolean);if(['embed','live','shorts'].includes(p[0]))return p[1]||''}}catch{}return ''}
function playChannel(ch){
 const attempt=++playAttempt;clearPlayer();activeUrl=ch.url;playingName.textContent=ch.name;playingCategory.textContent=ch.group;setStatus('CARREGANDO…','loading');renderGrid();updateCardStatus('loading');
 const yt=extractYouTubeId(ch.url);
 if(yt){const frame=document.createElement('iframe');frame.title='Player do canal '+ch.name;frame.src='https://www.youtube-nocookie.com/embed/'+encodeURIComponent(yt)+'?autoplay=1';frame.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';videoWrapper.appendChild(frame);setStatus('YOUTUBE','live');return}
 const video=document.createElement('video');video.controls=true;video.autoplay=true;video.muted=true;video.playsInline=true;video.preload='metadata';video.setAttribute('aria-label','Vídeo de '+ch.name);videoWrapper.appendChild(video);currentVideo=video;
 let settled=false;const fail=msg=>{if(settled||attempt!==playAttempt)return;settled=true;setStatus('FALHA NA REPRODUÇÃO','error');updateCardStatus('offline');playerMessage(msg)};
 const playing=()=>{if(attempt!==playAttempt)return;settled=true;setStatus('REPRODUZINDO','live');updateCardStatus('online')};
 video.addEventListener('playing',playing,{once:true});video.addEventListener('error',()=>fail('Este canal não pôde ser reproduzido. O link pode estar indisponível, bloqueado por região ou não permitir reprodução incorporada.'),{once:true});
 if(window.Hls&&Hls.isSupported()){
  hls=new Hls({enableWorker:true,lowLatencyMode:false,manifestLoadingTimeOut:15000,levelLoadingTimeOut:15000});hls.loadSource(ch.url);hls.attachMedia(video);
  hls.on(Hls.Events.MANIFEST_PARSED,()=>video.play().catch(()=>setStatus('PRESSIONE PLAY','loading')));
  hls.on(Hls.Events.ERROR,(_event,data)=>{if(!data.fatal)return;console.warn('Erro HLS:',data.type,data.details);fail(data.type===Hls.ErrorTypes.NETWORK_ERROR?'Não foi possível acessar a transmissão. O servidor pode estar indisponível ou bloquear acesso externo.':data.type===Hls.ErrorTypes.MEDIA_ERROR?'O formato do vídeo não pôde ser decodificado.':'Este canal não é compatível com o player ou está indisponível.');if(hls){hls.destroy();hls=null}});
 }else if(video.canPlayType('application/vnd.apple.mpegurl')){video.src=ch.url;video.play().catch(()=>setStatus('PRESSIONE PLAY','loading'))}
 else fail('Este navegador não oferece suporte ao formato desta transmissão. Tente outro canal.');
 window.setTimeout(()=>{if(!settled&&attempt===playAttempt){setStatus('SEM RESPOSTA','error');updateCardStatus('offline')}},20000)
}
searchInput.addEventListener('input',renderGrid);reloadBtn.addEventListener('click',loadChannels);
document.addEventListener('keydown',e=>{if(e.key==='/'&&document.activeElement!==searchInput){e.preventDefault();searchInput.focus()}if(e.key==='Escape'&&document.activeElement===searchInput){searchInput.value='';searchInput.blur();renderGrid()}});
loadChannels();
</script>
</body></html>'''
out = Path("/mnt/data/minha_tv_index.html")
out.write_text(html, encoding="utf-8")
print(f"Arquivo criado: {out.name} ({out.stat().st_size:,} bytes)")
