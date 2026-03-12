/* ═══════════════════════════════════════
   TCGPOTES — app.js  v3
═══════════════════════════════════════ */

// ── EXTENSIONS ────────────────────────
const EXTENSIONS = [
  { id:'Lycee', name:'Lycée', icon:'🏫', desc:'26 cartes · Première extension', total:26 }
  // ex: { id:'College', name:'Collège', icon:'🏢', desc:'26 cartes', total:26 }
];

function buildCards(ext, total) {
  const out = [];
  for (let i = 1; i <= total; i++) {
    let rarity, emoji;
    if      (i <= 10) { rarity='basique';  emoji='🎴'; }
    else if (i <= 20) { rarity='rare';     emoji='💎'; }
    else if (i <= 25) { rarity='fullart';  emoji='🌟'; }
    else              { rarity='gold';     emoji='👑'; }
    out.push({ id:`${ext}_${i}`, num:i, name:`Carte ${i}`, ext, rarity, emoji, img:`img/${ext}/carte${i}_ex${ext}.png` });
  }
  return out;
}
// Build card lists
EXTENSIONS.forEach(e => { e.cards = buildCards(e.id, e.total); });

const RARITY_LABELS = { basique:'Basique', rare:'Rare', fullart:'Full Art', gold:'Gold' };
const MAX_CHARGES = 4;
const CHARGE_INTERVAL = 6*60*60*1000;
const CARDS_PER_PACK  = 5;

// ── I18N ──────────────────────────────
const I18N = {
  fr:{ nav_home:'Accueil', nav_collection:'Collection', nav_profile:'Profil', nav_settings:'Réglages',
       tap_open:'👆 Appuie pour ouvrir !', open_btn:'🎁 Ouvrir le Booster !',
       charges_full:'⚡ Recharges complètes !', next_charge:'Prochaine dans',
       add_collection:'✅ Tout ajouter !', lang_name:'Français' },
  en:{ nav_home:'Home', nav_collection:'Collection', nav_profile:'Profile', nav_settings:'Settings',
       tap_open:'👆 Tap to open!', open_btn:'🎁 Open Booster!',
       charges_full:'⚡ Full charges!', next_charge:'Next in',
       add_collection:'✅ Add all!', lang_name:'English' },
  es:{ nav_home:'Inicio', nav_collection:'Colección', nav_profile:'Perfil', nav_settings:'Ajustes',
       tap_open:'👆 ¡Toca para abrir!', open_btn:'🎁 ¡Abrir Sobre!',
       charges_full:'⚡ ¡Recargas llenas!', next_charge:'Próxima en',
       add_collection:'✅ ¡Añadir todo!', lang_name:'Español' },
  de:{ nav_home:'Start', nav_collection:'Sammlung', nav_profile:'Profil', nav_settings:'Einstellungen',
       tap_open:'👆 Tippe zum Öffnen!', open_btn:'🎁 Booster öffnen!',
       charges_full:'⚡ Aufladungen voll!', next_charge:'Nächste in',
       add_collection:'✅ Alle hinzufügen!', lang_name:'Deutsch' }
};
function t(key) { return (I18N[appSettings.lang] || I18N.fr)[key] || key; }
function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const k = el.dataset.i18n;
    if (t(k) !== k) el.textContent = t(k);
  });
  const btn = document.getElementById('btnOpen');
  if (btn) btn.textContent = t('open_btn');
  const hint = document.querySelector('.tap-hint');
  if (hint) hint.textContent = t('tap_open');
  const sub = document.getElementById('langSubLabel');
  if (sub) sub.textContent = t('lang_name');
}

// ── AVATARS ───────────────────────────
const AVATARS = ['😀','😎','🦊','🐱','🐸','🦄','🐲','🤖','👾','🧙','🧜','🦸','🎩','🌈','🍀','⭐'];

// ── LEVEL SYSTEM ──────────────────────
function getLevel(totalCards) {
  if (totalCards >= 200) return { num:10, label:'Maître' };
  if (totalCards >= 100) return { num:7,  label:'Expert' };
  if (totalCards >= 50)  return { num:5,  label:'Chasseur' };
  if (totalCards >= 20)  return { num:3,  label:'Collectionneur' };
  if (totalCards >=  5)  return { num:2,  label:'Débutant' };
  return { num:1, label:'Apprenti' };
}

// ── FRIEND CODE GENERATOR ─────────────
function genFriendCode(pseudo) {
  let hash = 0;
  for (let i = 0; i < pseudo.length; i++) hash = ((hash << 5) - hash) + pseudo.charCodeAt(i) | 0;
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code = '';
  let h = Math.abs(hash);
  for (let i = 0; i < 3; i++) { code += letters[h % letters.length]; h = Math.floor(h / letters.length); }
  h = Math.abs(hash * 31 + pseudo.length);
  code += '-' + String(1000 + (h % 9000)).slice(0,4);
  return code;
}

// ── APP STATE ─────────────────────────
let appSettings = { lang:'fr', dark:false, volume:70, animations:true };
let profile = null;         // { pseudo, avatar, friendCode, friends:[], packsOpened }
let gameState = null;       // { charges, lastChargeTime, currentExt, collection:{} }

let pendingCards = [];
let revealIndex  = 0;
let toastTimeout = null;
let musicPlaying = false;

// ── STORAGE KEYS ──────────────────────
const KEY_SETTINGS = 'tcgp_settings';
const KEY_PROFILES = 'tcgp_profiles';   // object: { pseudo: profileData }
const KEY_GAME     = (pseudo) => `tcgp_game_${pseudo}`;

// ── PERSISTENCE ───────────────────────
function saveSettings() { try { localStorage.setItem(KEY_SETTINGS, JSON.stringify(appSettings)); } catch(e){} }
function loadSettings() {
  try { const s = localStorage.getItem(KEY_SETTINGS); if (s) appSettings = { ...appSettings, ...JSON.parse(s) }; } catch(e){}
}
function saveProfile() {
  if (!profile) return;
  try {
    const all = getAllProfiles();
    all[profile.pseudo] = profile;
    localStorage.setItem(KEY_PROFILES, JSON.stringify(all));
  } catch(e){}
}
function getAllProfiles() {
  try { const s = localStorage.getItem(KEY_PROFILES); return s ? JSON.parse(s) : {}; } catch(e){ return {}; }
}
function saveGame() {
  if (!gameState || !profile) return;
  try { localStorage.setItem(KEY_GAME(profile.pseudo), JSON.stringify(gameState)); } catch(e){}
}
function loadGame() {
  if (!profile) return;
  try {
    const s = localStorage.getItem(KEY_GAME(profile.pseudo));
    if (s) gameState = { ...defaultGameState(), ...JSON.parse(s) };
    else   gameState = defaultGameState();
  } catch(e) { gameState = defaultGameState(); }
}
function defaultGameState() {
  return { charges:4, lastChargeTime:Date.now(), currentExt:'Lycee', collection:{} };
}

// ── AUTH ──────────────────────────────
function switchAuthTab(tab) {
  document.getElementById('tabLogin').classList.toggle('active', tab==='login');
  document.getElementById('tabRegister').classList.toggle('active', tab==='register');
  document.getElementById('authLogin').style.display    = tab==='login'    ? '' : 'none';
  document.getElementById('authRegister').style.display = tab==='register' ? '' : 'none';
}

function loginUser() {
  const pseudo = document.getElementById('loginPseudo').value.trim();
  if (!pseudo) { showToast('⚠️ Entre ton pseudo'); return; }
  const all = getAllProfiles();
  if (!all[pseudo]) { showToast('❌ Compte introuvable. Crée-en un !'); switchAuthTab('register'); return; }
  profile = all[pseudo];
  loadGame();
  enterApp();
}

function registerUser() {
  const pseudo = document.getElementById('regPseudo').value.trim();
  if (pseudo.length < 2 || pseudo.length > 20) { showToast('⚠️ Pseudo : 2 à 20 caractères'); return; }
  const all = getAllProfiles();
  if (all[pseudo]) { showToast('❌ Ce pseudo est déjà pris !'); return; }
  profile = { pseudo, avatar:'😀', friendCode:genFriendCode(pseudo), friends:[], packsOpened:0 };
  saveProfile();
  loadGame();
  enterApp();
}

function enterApp() {
  updateHomeExt();
  updateCharges();
  renderCharges();
  updateTimer();
  updateProfileView();
  updateOwnedCount();
  applyTheme();
  applyI18n();
  showPage('home');
  tryStartMusic();
}

function confirmLogout() { document.getElementById('logoutModal').classList.add('active'); }
function doLogout() {
  closeModal('logoutModal');
  profile = null; gameState = null;
  showPage('profile');
  document.getElementById('nav-home').classList.remove('active');
}

// ── THEME ─────────────────────────────
function applyTheme() {
  const dark = appSettings.dark;
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  document.getElementById('themeBtn').textContent = dark ? '☀️' : '🌙';
  const dt = document.getElementById('darkToggle');
  if (dt) dt.checked = dark;
}
function toggleDark() { setDark(!appSettings.dark); }
function setDark(val) {
  appSettings.dark = val;
  saveSettings();
  applyTheme();
}

// ── LANGUAGE ──────────────────────────
function setLang(lang) {
  appSettings.lang = lang;
  saveSettings();
  applyI18n();
  showToast('🌍 ' + t('lang_name'));
}

// ── MUSIC ─────────────────────────────
function tryStartMusic() {
  const audio = document.getElementById('bgMusic');
  audio.volume = appSettings.volume / 100;
  if (appSettings.volume > 0) {
    audio.play().then(() => { musicPlaying = true; updateMusicBtn(); }).catch(()=>{});
  }
}
function toggleMusic() {
  const audio = document.getElementById('bgMusic');
  if (musicPlaying) { audio.pause(); musicPlaying = false; }
  else { audio.play().then(()=>{ musicPlaying=true; }).catch(()=>{}); }
  updateMusicBtn();
}
function updateMusicBtn() {
  document.getElementById('musicBtn').textContent = musicPlaying ? '🎵' : '🔇';
}
function saveSetting(key, val) {
  appSettings[key] = val;
  saveSettings();
  if (key === 'volume') {
    const pct = val + '%';
    document.getElementById('volumeLabel').textContent = pct;
    document.getElementById('volumeSlider').style.setProperty('--val', pct);
    document.getElementById('bgMusic').volume = val / 100;
    if (val > 0 && !musicPlaying) tryStartMusic();
  }
}

// ── NAVIGATION ────────────────────────
function showPage(name) {
  if (!profile && name !== 'profile') { return; }
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const page = document.getElementById('page-' + name);
  if (page) page.classList.add('active');
  const nav  = document.getElementById('nav-' + name);
  if (nav) nav.classList.add('active');
  if (name === 'collection')    renderCollection();
  if (name === 'extensions')    renderExtensions();
  if (name === 'profile-view')  updateProfileView();
}

// ── HELPERS ───────────────────────────
function getExt(id)   { return EXTENSIONS.find(e => e.id === id) || EXTENSIONS[0]; }
function currentExt() { return getExt(gameState?.currentExt || 'Lycee'); }
function getRarityBg(r) {
  return { basique:'linear-gradient(135deg,#94a3b8,#64748b)', rare:'linear-gradient(135deg,#93c5fd,#3b82f6)', fullart:'linear-gradient(135deg,#c4b5fd,#8b5cf6)', gold:'linear-gradient(135deg,#fde68a,#f59e0b)' }[r] || 'linear-gradient(135deg,#e2e8f0,#cbd5e1)';
}

// ── CHARGES ───────────────────────────
function updateCharges() {
  if (!gameState) return;
  const elapsed = Date.now() - gameState.lastChargeTime;
  const gained  = Math.floor(elapsed / CHARGE_INTERVAL);
  if (gained > 0 && gameState.charges < MAX_CHARGES) {
    gameState.charges = Math.min(MAX_CHARGES, gameState.charges + gained);
    gameState.lastChargeTime += gained * CHARGE_INTERVAL;
    saveGame();
  }
}
function renderCharges() {
  if (!gameState) return;
  for (let i = 0; i < 4; i++) document.getElementById('pip'+i).classList.toggle('filled', i < gameState.charges);
  document.getElementById('btnOpen').disabled = gameState.charges <= 0;
}
function updateTimer() {
  if (!gameState) return;
  const el = document.getElementById('chargesTimer');
  if (gameState.charges >= MAX_CHARGES) { el.innerHTML = `<span>${t('charges_full')}</span>`; return; }
  const rem = Math.max(0, gameState.lastChargeTime + CHARGE_INTERVAL - Date.now());
  const h = String(Math.floor(rem/3600000)).padStart(2,'0');
  const m = String(Math.floor(rem%3600000/60000)).padStart(2,'0');
  const s = String(Math.floor(rem%60000/1000)).padStart(2,'0');
  el.innerHTML = `${t('next_charge')} <span>${h}:${m}:${s}</span>`;
}

// ── BOOSTER ───────────────────────────
function rollRarity() {
  const r = Math.random()*100;
  if (r < 1)  return 'gold';
  if (r < 6)  return 'fullart';
  if (r < 26) return 'rare';
  return 'basique';
}
function rollCard() {
  const ext = currentExt();
  const pool = ext.cards.filter(c => c.rarity === rollRarity());
  const cards = pool.length ? pool : ext.cards;
  return cards[Math.floor(Math.random()*cards.length)];
}

function openBooster() {
  if (!gameState || gameState.charges <= 0) return;
  gameState.charges--; saveGame(); renderCharges();
  profile.packsOpened = (profile.packsOpened||0) + 1; saveProfile();
  pendingCards = Array.from({length:CARDS_PER_PACK}, rollCard);
  revealIndex  = 0;
  document.getElementById('boosterTapExtName').textContent = currentExt().name;
  showStage('stageBooster');
  document.getElementById('boosterOverlay').classList.add('active');
}
function showStage(id) {
  ['stageBooster','stageCards','stageRecap'].forEach(s => {
    document.getElementById(s).style.display = s===id ? 'flex' : 'none';
  });
}
function startReveal() {
  spawnParticles('basique');
  setTimeout(()=>{ showStage('stageCards'); showCurrentCard(); }, 250);
}
function showCurrentCard() {
  const card = pendingCards[revealIndex];
  document.getElementById('revealCounter').textContent = `Carte ${revealIndex+1} / ${CARDS_PER_PACK}`;
  document.getElementById('revealedCardName').textContent = card.name;
  const rb = document.getElementById('revealedCardRarity');
  rb.textContent = RARITY_LABELS[card.rarity]; rb.className = 'card-rarity-badge rarity-'+card.rarity;
  const wrap = document.getElementById('revealedCardWrap');
  wrap.style.animation='none'; wrap.offsetHeight; wrap.style.animation='';
  const cardEl = document.getElementById('revealedCard');
  cardEl.className = 'revealed-card reveal-glow-'+card.rarity;
  const content = document.getElementById('revealedCardContent');
  content.innerHTML = ''; content.style.cssText='';
  loadCardImg(card, content, '12px');
  spawnParticles(card.rarity);
  document.getElementById('btnNextCard').textContent = revealIndex < CARDS_PER_PACK-1 ? 'Suivant ➡️' : '🎉 Voir le récap !';
}
function nextReveal() {
  revealIndex++;
  if (revealIndex < CARDS_PER_PACK) showCurrentCard();
  else showRecap();
}
function showRecap() {
  showStage('stageRecap');
  const grid = document.getElementById('recapGrid');
  grid.innerHTML = '';
  pendingCards.forEach((card,i) => {
    const div = document.createElement('div');
    div.className = 'recap-card-mini';
    div.style.setProperty('--delay', (i*0.08)+'s');
    div.style.background = getRarityBg(card.rarity);
    loadCardImg(card, div, '6px');
    grid.appendChild(div);
  });
  spawnParticles('gold');
}
function collectAll() {
  pendingCards.forEach(card => {
    if (!gameState.collection[card.id]) gameState.collection[card.id] = { count:0, isNew:true };
    gameState.collection[card.id].count++;
    gameState.collection[card.id].isNew = true;
  });
  saveGame(); saveProfile();
  pendingCards = [];
  document.getElementById('boosterOverlay').classList.remove('active');
  document.getElementById('particles').innerHTML = '';
  showToast('🎉 5 cartes ajoutées !');
  updateOwnedCount();
  updateProfileStats();
}

// ── IMAGE LOADER ──────────────────────
function loadCardImg(card, container, borderRadius) {
  const img = new Image();
  img.onload  = () => { container.innerHTML = `<img src="${card.img}" alt="${card.name}" style="width:100%;height:100%;object-fit:cover;border-radius:${borderRadius};display:block;">`; };
  img.onerror = () => { container.innerHTML = `<div class="recap-mini-placeholder" style="background:${getRarityBg(card.rarity)};width:100%;height:100%;border-radius:${borderRadius}">${card.emoji}</div>`; };
  img.src = card.img;
}

// ── PARTICLES ─────────────────────────
function spawnParticles(rarity) {
  const pal = { basique:['#94a3b8','#cbd5e1','#fff'], rare:['#3b82f6','#93c5fd','#fff'], fullart:['#8b5cf6','#c4b5fd','#fff','#f472b6'], gold:['#f59e0b','#fde68a','#fff','#fb923c','#facc15'] };
  const cols = pal[rarity]||pal.basique;
  const count = rarity==='gold'?65:rarity==='fullart'?45:22;
  const cont = document.getElementById('particles');
  cont.innerHTML='';
  let style = document.getElementById('particleStyle');
  if (!style) { style=document.createElement('style'); style.id='particleStyle'; document.head.appendChild(style); }
  const dx = (Math.random()>0.5?1:-1)*(50+Math.random()*120);
  const dy = -(70+Math.random()*100);
  style.textContent = `@keyframes pfly{0%{transform:scale(1) translate(0,0);opacity:1}100%{transform:scale(0) translate(${dx}px,${dy}px);opacity:0}}`;
  for (let i=0;i<count;i++){
    const p=document.createElement('div');
    p.className='particle';
    const col=cols[Math.floor(Math.random()*cols.length)];
    const sz=4+Math.random()*8, x=15+Math.random()*70, y=15+Math.random()*70, dur=(0.4+Math.random()*0.8).toFixed(2);
    p.style.cssText=`left:${x}%;top:${y}%;width:${sz}px;height:${sz}px;background:${col};box-shadow:0 0 ${sz}px ${col};animation:pfly ${dur}s ease-out forwards;`;
    cont.appendChild(p);
  }
}

// ── COLLECTION ────────────────────────
function renderCollection() {
  if (!gameState) return;
  const ext = currentExt();
  const grid = document.getElementById('collectionGrid');
  grid.innerHTML = '';
  document.getElementById('collectionExtLabel').textContent = `${ext.icon} Extension ${ext.name}`;
  updateOwnedCount();
  ext.cards.forEach(card => {
    const owned = gameState.collection[card.id];
    const item  = document.createElement('div');
    item.className = 'card-item'+(owned?` owned r-${card.rarity}`:'');
    if (owned) {
      loadCardImg(card, item, '8px');
      if (owned.isNew) { const b=document.createElement('div'); b.className='new-badge'; b.textContent='New!'; item.appendChild(b); }
      if (owned.count>1) { const b=document.createElement('div'); b.className='count-badge'; b.textContent=`×${owned.count}`; item.appendChild(b); }
      addRarityDot(item, card.rarity);
      item.onclick = ()=>openCardModal(card);
    } else {
      item.innerHTML = `<div class="card-item-placeholder unknown"><div class="card-shadow-icon">🃏</div><div class="card-num">#${String(card.num).padStart(3,'0')}</div></div>`;
    }
    grid.appendChild(item);
  });
}
function addRarityDot(item, rarity) {
  const d=document.createElement('div'); d.className=`card-rarity-dot dot-${rarity}`; item.appendChild(d);
}
function updateOwnedCount() {
  if (!gameState) return;
  const ext = currentExt();
  const owned = ext.cards.filter(c=>gameState.collection[c.id]).length;
  document.getElementById('ownedCount').textContent = owned;
  document.getElementById('totalCount').textContent = ext.cards.length;
}

// ── EXTENSIONS PAGE ───────────────────
function renderExtensions() {
  if (!gameState) return;
  const list = document.getElementById('extList');
  list.innerHTML = '';
  EXTENSIONS.forEach(ext => {
    const div = document.createElement('div');
    div.className = 'ext-card'+(ext.id===gameState.currentExt?' selected':'');
    const owned = ext.cards.filter(c=>gameState.collection[c.id]).length;
    div.innerHTML = `<div class="ext-card-icon">${ext.icon}</div><div class="ext-card-info"><div class="ext-card-name">${ext.name}</div><div class="ext-card-sub">${owned}/${ext.cards.length} cartes · ${ext.desc}</div></div>${ext.id===gameState.currentExt?'<div class="ext-selected-badge">✓ Active</div>':''}`;
    div.onclick = ()=>selectExtension(ext.id);
    list.appendChild(div);
  });
}
function selectExtension(id) {
  gameState.currentExt = id; saveGame(); updateHomeExt(); renderExtensions();
  showToast(`${getExt(id).icon} Extension ${getExt(id).name} !`);
  setTimeout(()=>showPage('home'), 500);
}
function updateHomeExt() {
  if (!gameState) return;
  const ext = currentExt();
  document.getElementById('extStripIcon').textContent    = ext.icon;
  document.getElementById('extStripName').textContent    = ext.name;
  document.getElementById('boosterExtName').textContent  = ext.name;
  document.getElementById('boosterTapExtName').textContent = ext.name;
}

// ── CARD MODAL ────────────────────────
function openCardModal(card) {
  if (gameState.collection[card.id]) { gameState.collection[card.id].isNew=false; saveGame(); }
  const imgCont = document.getElementById('cardModalImg');
  imgCont.innerHTML='';
  loadCardImg(card, imgCont, '10px');
  document.getElementById('cardModalName').textContent = card.name;
  const rb=document.getElementById('cardModalRarity'); rb.textContent=RARITY_LABELS[card.rarity]; rb.className='card-rarity-badge rarity-'+card.rarity;
  const owned=gameState.collection[card.id];
  document.getElementById('cardModalCount').textContent = owned?`${owned.count} exemplaire${owned.count>1?'s':''}` : '';
  document.getElementById('cardModal').classList.add('active');
  renderCollection();
}
function closeCardModal() { document.getElementById('cardModal').classList.remove('active'); }
function closeModal(id)   { document.getElementById(id).classList.remove('active'); }

// ── PROFILE VIEW ──────────────────────
function updateProfileView() {
  if (!profile || !gameState) return;
  document.getElementById('userAvatar').textContent       = profile.avatar;
  document.getElementById('userPseudoChip').textContent   = profile.pseudo;
  document.getElementById('pvAvatar').textContent         = profile.avatar;
  document.getElementById('pvPseudo').textContent         = profile.pseudo;
  document.getElementById('pvFriendCode').textContent     = profile.friendCode;
  updateProfileStats();
  renderAvatarGrid();
  renderFriends();
}
function updateProfileStats() {
  if (!profile || !gameState) return;
  const totalCards = Object.values(gameState.collection).reduce((s,v)=>s+(v.count||0),0);
  const uniqCards  = Object.keys(gameState.collection).length;
  const lv = getLevel(totalCards);
  document.getElementById('pvLevel').textContent   = `Niv. ${lv.num} · ${lv.label}`;
  document.getElementById('statCards').textContent = totalCards;
  document.getElementById('statUniq').textContent  = uniqCards;
  document.getElementById('statPacks').textContent = profile.packsOpened||0;
  document.getElementById('statFriends').textContent = (profile.friends||[]).length;
}
function renderAvatarGrid() {
  const grid = document.getElementById('avatarGrid');
  grid.innerHTML='';
  AVATARS.forEach(av => {
    const div=document.createElement('div'); div.className='avatar-opt'+(profile.avatar===av?' selected':'');
    div.textContent=av; div.onclick=()=>selectAvatar(av); grid.appendChild(div);
  });
}
function selectAvatar(av) {
  profile.avatar=av; saveProfile(); renderAvatarGrid();
  document.getElementById('pvAvatar').textContent       = av;
  document.getElementById('userAvatar').textContent     = av;
}
function copyFriendCode() {
  navigator.clipboard?.writeText(profile.friendCode).then(()=>showToast('📋 Code copié !'));
}

// ── FRIENDS ───────────────────────────
function addFriend() {
  const code = document.getElementById('friendCodeInput').value.trim().toUpperCase();
  if (!code) { showToast('⚠️ Entre un code ami'); return; }
  if (code === profile.friendCode) { showToast('😅 C\'est ton propre code !'); return; }
  if ((profile.friends||[]).find(f=>f.code===code)) { showToast('👫 Déjà ami !'); return; }

  // Search all profiles for matching friend code
  const all = getAllProfiles();
  const found = Object.values(all).find(p => p.friendCode === code);
  if (!found) { showToast('❌ Code introuvable'); return; }

  if (!profile.friends) profile.friends=[];
  profile.friends.push({ pseudo:found.pseudo, avatar:found.avatar, code:found.friendCode });
  saveProfile();
  document.getElementById('friendCodeInput').value='';
  renderFriends(); updateProfileStats();
  showToast(`👫 ${found.pseudo} ajouté !`);
}
function removeFriend(code) {
  profile.friends = (profile.friends||[]).filter(f=>f.code!==code);
  saveProfile(); renderFriends(); updateProfileStats();
  showToast('❌ Ami retiré');
}
function renderFriends() {
  const list = document.getElementById('friendsList');
  list.innerHTML='';
  const friends = profile.friends||[];
  if (!friends.length) {
    list.innerHTML='<div class="friends-empty">Aucun ami pour l\'instant 😢<br>Partage ton code pour jouer ensemble !</div>'; return;
  }
  friends.forEach(f => {
    const row=document.createElement('div'); row.className='friend-row';
    row.innerHTML=`<div class="friend-avatar">${f.avatar||'😀'}</div><div class="friend-info"><div class="friend-pseudo">${f.pseudo}</div><div class="friend-level">${f.code}</div></div><button class="friend-remove" onclick="removeFriend('${f.code}')">✕</button>`;
    list.appendChild(row);
  });
}

// ── SAVE / IMPORT / RESET ─────────────
function exportSave() {
  const data = btoa(JSON.stringify({ profile, gameState }));
  navigator.clipboard?.writeText(data).then(()=>showToast('📋 Sauvegarde copiée !')).catch(()=>showToast('📋 Voir la console'));
}
function showImportModal() { document.getElementById('importModal').classList.add('active'); }
function importSave() {
  const raw = document.getElementById('importDataArea').value.trim();
  if (!raw) { showToast('⚠️ Colle un code'); return; }
  try {
    const parsed = JSON.parse(atob(raw));
    if (parsed.profile) { profile=parsed.profile; saveProfile(); }
    if (parsed.gameState) { gameState=parsed.gameState; saveGame(); }
    closeModal('importModal');
    updateHomeExt(); updateProfileView(); renderCharges(); updateOwnedCount();
    showToast('✅ Importée !');
  } catch(e) { showToast('❌ Code invalide'); }
}
function confirmReset() { document.getElementById('resetModal').classList.add('active'); }
function doReset() {
  gameState = defaultGameState(); saveGame();
  closeModal('resetModal');
  renderCharges(); updateHomeExt(); updateOwnedCount(); updateProfileStats();
  showToast('🗑️ Réinitialisé !');
}
function requestNotifPermission() {
  if (!('Notification' in window)) { showToast('⚠️ Non supporté'); return; }
  Notification.requestPermission().then(p=>showToast(p==='granted'?'🔔 Activé !':'❌ Refusé'));
}

// ── TOAST ─────────────────────────────
function showToast(msg) {
  const t=document.getElementById('toast'); t.textContent=msg; t.classList.add('show');
  clearTimeout(toastTimeout); toastTimeout=setTimeout(()=>t.classList.remove('show'),2400);
}

// ── BUBBLES BG ────────────────────────
function initBg() {
  const bc=document.getElementById('bgBubbles');
  const cols=['#f472b6','#8b5cf6','#3b82f6','#facc15','#06b6d4','#22c55e'];
  for (let i=0;i<8;i++){
    const b=document.createElement('div'); b.className='bubble';
    const sz=80+Math.random()*200, col=cols[Math.floor(Math.random()*cols.length)];
    b.style.cssText=`left:${Math.random()*100}%;top:${Math.random()*100}%;width:${sz}px;height:${sz}px;background:${col};--dur:${12+Math.random()*15}s;--delay:${-Math.random()*10}s;`;
    bc.appendChild(b);
  }
}

// ── SETTINGS INIT ─────────────────────
function initSettingsUI() {
  const sl=document.getElementById('volumeSlider');
  sl.value=appSettings.volume; sl.style.setProperty('--val',appSettings.volume+'%');
  document.getElementById('volumeLabel').textContent=appSettings.volume+'%';
  document.getElementById('animToggle').checked=appSettings.animations!==false;
  document.getElementById('langSelect').value=appSettings.lang||'fr';
  sl.addEventListener('input',function(){saveSetting('volume',parseInt(this.value));});
}

// ── INIT ──────────────────────────────
function init() {
  loadSettings();
  applyTheme();
  initBg();
  initSettingsUI();
  applyI18n();
  // Check if a session was open
  const lastUser = localStorage.getItem('tcgp_lastuser');
  if (lastUser) {
    const all = getAllProfiles();
    if (all[lastUser]) {
      profile = all[lastUser];
      loadGame();
      enterApp();
      return;
    }
  }
  showPage('profile');
  document.getElementById('page-profile').classList.add('active');

  setInterval(()=>{ if(gameState){ updateCharges(); renderCharges(); updateTimer(); } }, 1000);
}

// save last user on login
const _enterApp = enterApp;
enterApp = function() {
  if (profile) localStorage.setItem('tcgp_lastuser', profile.pseudo);
  _enterApp();
};

document.addEventListener('DOMContentLoaded', init);
