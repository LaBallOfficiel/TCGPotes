/* ═══════════════════════════════════════════════════════════
   TCGPOTES — app.js  v4  (Firebase backend)
   
   ╔══════════════════════════════════════════════════════╗
   ║  CONFIGURATION FIREBASE — À REMPLIR UNE SEULE FOIS  ║
   ║                                                      ║
   ║  1. Va sur https://console.firebase.google.com       ║
   ║  2. Crée un projet (ex: "tcgpotes")                  ║
   ║  3. Ajoute une app Web (icône </>)                   ║
   ║  4. Copie l'objet firebaseConfig ci-dessous          ║
   ║  5. Active Authentication > Email/Password + Google  ║
   ║  6. Active Firestore Database (mode test pour débuter)║
   ║  7. Dans Firestore > Règles, colle :                 ║
   ║                                                      ║
   ║   rules_version = '2';                               ║
   ║   service cloud.firestore {                          ║
   ║     match /databases/{db}/documents {                ║
   ║       match /users/{uid} {                           ║
   ║         allow read: if request.auth != null;         ║
   ║         allow write: if request.auth.uid == uid;     ║
   ║       }                                              ║
   ║       match /usersByCode/{code} {                    ║
   ║         allow read: if request.auth != null;         ║
   ║         allow write: if request.auth != null;        ║
   ║       }                                              ║
   ║     }                                                ║
   ║   }                                                  ║
   ╚══════════════════════════════════════════════════════╝
═══════════════════════════════════════════════════════════ */

// ══════════════════════════════════════════════════════════
//  🔧 COLLE TA CONFIG FIREBASE ICI
// ══════════════════════════════════════════════════════════
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyALLbAdXoT3-Vbcy82n1W__yIjdRpsCwZQ",
  authDomain:        "tcgpotes-525e0.firebaseapp.com",
  projectId:         "tcgpotes-525e0",
  storageBucket:     "tcgpotes-525e0.firebasestorage.app",
  messagingSenderId: "259521841130",
  appId:             "1:259521841130:web:ec723c4ca9f1d1987cd493"
};
// ══════════════════════════════════════════════════════════

// ── Firebase imports (CDN ESM) ────────────────────────────
import { initializeApp }                          from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword,
         signInWithEmailAndPassword, signOut,
         onAuthStateChanged, GoogleAuthProvider,
         signInWithPopup }                        from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc,
         updateDoc, onSnapshot, serverTimestamp,
         collection, query, where, getDocs }      from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ── Init Firebase ─────────────────────────────────────────
const fbApp  = initializeApp(FIREBASE_CONFIG);
const auth   = getAuth(fbApp);
const db     = getFirestore(fbApp);

// ══════════════════════════════════════════════════════════
//  DONNÉES DU JEU
// ══════════════════════════════════════════════════════════

const EXTENSIONS = [
  { id:'Lycee', name:'Lycée', icon:'🏫', desc:'26 cartes · Extension 1', total:26 }
];
EXTENSIONS.forEach(e => { e.cards = buildCards(e.id, e.total); });

function buildCards(ext, total) {
  const out = [];
  for (let i = 1; i <= total; i++) {
    let rarity, emoji;
    if      (i <= 10) { rarity='basique'; emoji='🎴'; }
    else if (i <= 20) { rarity='rare';    emoji='💎'; }
    else if (i <= 25) { rarity='fullart'; emoji='🌟'; }
    else              { rarity='gold';    emoji='👑'; }
    out.push({ id:`${ext}_${i}`, num:i, name:`Carte ${i}`, ext, rarity, emoji,
               img:`img/${ext}/carte${i}_ex${ext}.png` });
  }
  return out;
}

const RARITY_LABELS  = { basique:'Basique', rare:'Rare', fullart:'Full Art', gold:'Gold' };
const AVATARS        = ['😀','😎','🦊','🐱','🐸','🦄','🐲','🤖','👾','🧙','🧜','🦸','🎩','🌈','🍀','⭐'];
const MAX_CHARGES    = 4;
const CHARGE_INTERVAL= 6*60*60*1000;
const CARDS_PER_PACK = 5;

// ── I18N ──────────────────────────────────────────────────
const I18N = {
  fr:{ nav_home:'Accueil', nav_collection:'Collection', nav_profile:'Profil', nav_settings:'Réglages',
       tap_open:'👆 Appuie pour ouvrir !', open_btn:'🎁 Ouvrir le Booster !',
       charges_full:'⚡ Recharges complètes !', next_charge:'Prochaine dans', lang_name:'Français' },
  en:{ nav_home:'Home', nav_collection:'Collection', nav_profile:'Profile', nav_settings:'Settings',
       tap_open:'👆 Tap to open!', open_btn:'🎁 Open Booster!',
       charges_full:'⚡ Full charges!', next_charge:'Next in', lang_name:'English' },
  es:{ nav_home:'Inicio', nav_collection:'Colección', nav_profile:'Perfil', nav_settings:'Ajustes',
       tap_open:'👆 ¡Toca para abrir!', open_btn:'🎁 ¡Abrir Sobre!',
       charges_full:'⚡ ¡Recargas llenas!', next_charge:'Próxima en', lang_name:'Español' },
  de:{ nav_home:'Start', nav_collection:'Sammlung', nav_profile:'Profil', nav_settings:'Einstellungen',
       tap_open:'👆 Tippe zum Öffnen!', open_btn:'🎁 Booster öffnen!',
       charges_full:'⚡ Aufladungen voll!', next_charge:'Nächste in', lang_name:'Deutsch' }
};
function t(k) { return (I18N[appCfg.lang]||I18N.fr)[k]||k; }
function applyI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => { const v=t(el.dataset.i18n); if(v!==el.dataset.i18n) el.textContent=v; });
  const b=document.getElementById('btnOpen'); if(b) b.textContent=t('open_btn');
  const h=document.querySelector('.tap-hint'); if(h) h.textContent=t('tap_open');
  const s=document.getElementById('langSubLabel'); if(s) s.textContent=t('lang_name');
}

// ══════════════════════════════════════════════════════════
//  STATE  (tout en mémoire, synchro Firebase)
// ══════════════════════════════════════════════════════════
let appCfg = { lang:'fr', dark:false, volume:70, animations:true };  // localStorage uniquement
let currentUser = null;    // Firebase User
let profile     = null;    // Firestore /users/{uid}  — données profil
let gameState   = null;    // Partie de profile.gameState
let unsub       = null;    // listener Firestore en temps réel
let pendingCards = [], revealIndex = 0;
let toastTimeout = null, musicPlaying = false;

// ── Local settings (pas besoin du cloud) ─────────────────
const LS_CFG = 'tcgp_cfg';
function saveCfg()  { try { localStorage.setItem(LS_CFG, JSON.stringify(appCfg)); } catch(e){} }
function loadCfg()  { try { const s=localStorage.getItem(LS_CFG); if(s) appCfg={...appCfg,...JSON.parse(s)}; } catch(e){} }

// ── Helpers ──────────────────────────────────────────────
function getExt(id)   { return EXTENSIONS.find(e=>e.id===id)||EXTENSIONS[0]; }
function currentExt() { return getExt(gameState?.currentExt||'Lycee'); }
function getRarityBg(r) {
  return {basique:'linear-gradient(135deg,#94a3b8,#64748b)',rare:'linear-gradient(135deg,#93c5fd,#3b82f6)',
          fullart:'linear-gradient(135deg,#c4b5fd,#8b5cf6)',gold:'linear-gradient(135deg,#fde68a,#f59e0b)'}[r]
         ||'linear-gradient(135deg,#e2e8f0,#cbd5e1)';
}
function defaultGame() {
  return { charges:4, lastChargeTime:Date.now(), currentExt:'Lycee', collection:{} };
}
function genFriendCode(uid) {
  const L='ABCDEFGHJKLMNPQRSTUVWXYZ';
  let h=0; for(const c of uid) h=(h*31+c.charCodeAt(0))&0x7fffffff;
  let code=''; let tmp=h;
  for(let i=0;i<3;i++){code+=L[tmp%L.length];tmp=Math.floor(tmp/L.length);}
  return code+'-'+(1000+(h%9000));
}
function getLevel(n) {
  if(n>=200)return{num:10,label:'Maître'};
  if(n>=100)return{num:7,label:'Expert'};
  if(n>=50)return{num:5,label:'Chasseur'};
  if(n>=20)return{num:3,label:'Collectionneur'};
  if(n>=5)return{num:2,label:'Débutant'};
  return{num:1,label:'Apprenti'};
}

// ══════════════════════════════════════════════════════════
//  FIREBASE — LECTURE / ÉCRITURE
// ══════════════════════════════════════════════════════════

// Écoute en temps réel le profil de l'utilisateur connecté
function subscribeProfile(uid) {
  if (unsub) unsub();
  unsub = onSnapshot(doc(db,'users',uid), snap => {
    if (snap.exists()) {
      profile   = snap.data();
      gameState = profile.gameState || defaultGame();
      updateUI();
    }
  });
}

// Sauvegarde le profil dans Firestore (debounced)
let saveTimer = null;
function saveProfile() {
  if (!currentUser || !profile) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    try {
      await setDoc(doc(db,'users',currentUser.uid), profile, { merge:true });
    } catch(e) { console.warn('Save error', e); }
  }, 800);
}

// Crée le profil la première fois
async function createProfile(uid, pseudo) {
  const friendCode = genFriendCode(uid);
  const p = {
    uid, pseudo, avatar:'😀', friendCode,
    friends: [],        // [{ uid, pseudo, avatar, friendCode }]
    packsOpened: 0,
    createdAt: serverTimestamp(),
    lastSeen:  serverTimestamp(),
    gameState: defaultGame()
  };
  await setDoc(doc(db,'users',uid), p);
  // Index inversé code→uid pour la recherche
  await setDoc(doc(db,'usersByCode',friendCode), { uid, pseudo, avatar:'😀' });
  return p;
}

// Mise à jour lastSeen
async function touchLastSeen() {
  if (!currentUser) return;
  try { await updateDoc(doc(db,'users',currentUser.uid), { lastSeen:serverTimestamp() }); } catch(e){}
}

// ══════════════════════════════════════════════════════════
//  AUTH
// ══════════════════════════════════════════════════════════

// Watcher Firebase Auth → point d'entrée unique
onAuthStateChanged(auth, async user => {
  hideLoading();
  if (user) {
    currentUser = user;
    setLoading('Chargement du profil…');
    const snap = await getDoc(doc(db,'users',user.uid));
    if (snap.exists()) {
      profile   = snap.data();
      gameState = profile.gameState || defaultGame();
    } else {
      // Nouveau compte Google sans pseudo encore
      showPseudoPrompt(user);
      return;
    }
    hideLoading();
    subscribeProfile(user.uid);
    touchLastSeen();
    enterApp();
  } else {
    currentUser = null; profile = null; gameState = null;
    if (unsub) { unsub(); unsub = null; }
    showAuthPage();
  }
});

function showAuthPage() {
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-auth').classList.add('active');
  document.getElementById('mainNavbar').style.display = 'none';
}

// Connexion email/password
async function loginUser() {
  const email    = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  if (!email||!password) { setAuthError('authError','⚠️ Remplis tous les champs'); return; }
  try {
    setLoading('Connexion…');
    await signInWithEmailAndPassword(auth, email, password);
    // onAuthStateChanged prend la suite
  } catch(e) {
    hideLoading();
    setAuthError('authError', firebaseErrMsg(e.code));
  }
}

// Inscription email/password
async function registerUser() {
  const pseudo   = document.getElementById('regPseudo').value.trim();
  const email    = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  if (pseudo.length<2||pseudo.length>20) { setAuthError('regError','⚠️ Pseudo : 2 à 20 caractères'); return; }
  if (!email||password.length<6) { setAuthError('regError','⚠️ Email valide et mot de passe 6+ caractères'); return; }
  // Vérifier unicité pseudo
  try {
    setLoading('Création du compte…');
    const q = query(collection(db,'users'), where('pseudo','==',pseudo));
    const snap = await getDocs(q);
    if (!snap.empty) { hideLoading(); setAuthError('regError','❌ Ce pseudo est déjà pris !'); return; }
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await createProfile(cred.user.uid, pseudo);
    // onAuthStateChanged prend la suite
  } catch(e) {
    hideLoading();
    setAuthError('regError', firebaseErrMsg(e.code));
  }
}

// Google Sign-In
async function loginGoogle() {
  try {
    setLoading('Connexion Google…');
    const provider = new GoogleAuthProvider();
    const result   = await signInWithPopup(auth, provider);
    const user     = result.user;
    // Vérifier si profil existe
    const snap = await getDoc(doc(db,'users',user.uid));
    if (!snap.exists()) {
      hideLoading();
      showPseudoPrompt(user);
    }
    // sinon onAuthStateChanged gère
  } catch(e) {
    hideLoading();
    if (e.code !== 'auth/popup-closed-by-user') showToast('❌ '+firebaseErrMsg(e.code));
  }
}

// Pseudo prompt pour Google (1ère connexion)
function showPseudoPrompt(user) {
  const modal = document.getElementById('resetModal'); // on réutilise un modal générique
  modal.innerHTML = `
    <div class="card-modal-inner" onclick="event.stopPropagation()">
      <div style="font-size:46px;text-align:center">😀</div>
      <div class="card-modal-name">Choisis ton pseudo</div>
      <input class="p-input" id="googlePseudo" placeholder="Pseudo (2–20 caractères)" maxlength="20" style="width:100%;margin:10px 0">
      <button class="btn-profile-action" onclick="confirmGooglePseudo('${user.uid}','${user.email}')">✅ Confirmer</button>
      <div class="profile-hint" id="gPseudoErr" style="color:var(--red)"></div>
    </div>`;
  modal.classList.add('active');
}
async function confirmGooglePseudo(uid) {
  const pseudo = document.getElementById('googlePseudo').value.trim();
  if (pseudo.length<2||pseudo.length>20) { document.getElementById('gPseudoErr').textContent='⚠️ 2 à 20 caractères'; return; }
  setLoading('Création du profil…');
  const q    = query(collection(db,'users'), where('pseudo','==',pseudo));
  const snap = await getDocs(q);
  if (!snap.empty) { hideLoading(); document.getElementById('gPseudoErr').textContent='❌ Pseudo déjà pris !'; return; }
  profile = await createProfile(uid, pseudo);
  gameState = profile.gameState;
  closeModal('resetModal');
  subscribeProfile(uid);
  touchLastSeen();
  enterApp();
}

async function doLogout() {
  closeModal('logoutModal');
  setLoading('Déconnexion…');
  if (unsub) { unsub(); unsub=null; }
  await signOut(auth);
  hideLoading();
}
function confirmLogout() { document.getElementById('logoutModal').classList.add('active'); }

function firebaseErrMsg(code) {
  const m = {
    'auth/invalid-email':'❌ Email invalide',
    'auth/wrong-password':'❌ Mot de passe incorrect',
    'auth/user-not-found':'❌ Aucun compte avec cet email',
    'auth/email-already-in-use':'❌ Email déjà utilisé',
    'auth/weak-password':'❌ Mot de passe trop court',
    'auth/too-many-requests':'⚠️ Trop de tentatives, réessaie plus tard',
    'auth/network-request-failed':'⚠️ Problème réseau'
  };
  return m[code]||'❌ Erreur : '+code;
}
function setAuthError(id, msg) {
  const el=document.getElementById(id); if(el){el.textContent=msg; el.style.color='var(--red)';}
}

// ══════════════════════════════════════════════════════════
//  AMIS  (via Firestore)
// ══════════════════════════════════════════════════════════

async function addFriend() {
  const raw  = document.getElementById('friendCodeInput').value.trim().toUpperCase();
  const code = raw.replace(/[^A-Z0-9-]/g,'');
  const result = document.getElementById('friendSearchResult');
  result.innerHTML = '';
  if (!code) { showToast('⚠️ Entre un code ami'); return; }
  if (code === profile.friendCode) { showToast('😅 C\'est ton propre code !'); return; }
  if ((profile.friends||[]).find(f=>f.friendCode===code)) { showToast('👫 Déjà ami !'); return; }

  result.innerHTML = '<div class="friends-empty">🔍 Recherche…</div>';
  try {
    // Cherche dans l'index code→uid
    const snap = await getDoc(doc(db,'usersByCode',code));
    if (!snap.exists()) { result.innerHTML='<div class="friends-empty">❌ Code introuvable</div>'; return; }
    const found = snap.data();
    // Affiche une carte de confirmation
    result.innerHTML = `
      <div class="friend-row" style="animation:badgePop 0.3s ease">
        <div class="friend-avatar">${found.avatar||'😀'}</div>
        <div class="friend-info">
          <div class="friend-pseudo">${found.pseudo}</div>
          <div class="friend-level">${code}</div>
        </div>
        <button class="btn-add-friend" onclick="confirmAddFriend('${found.uid}','${found.pseudo}','${found.avatar||'😀'}','${code}')">+ Ajouter</button>
      </div>`;
  } catch(e) { result.innerHTML='<div class="friends-empty">⚠️ Erreur réseau</div>'; }
}

async function confirmAddFriend(uid, pseudo, avatar, code) {
  document.getElementById('friendSearchResult').innerHTML='';
  document.getElementById('friendCodeInput').value='';
  if (!profile.friends) profile.friends=[];
  profile.friends.push({ uid, pseudo, avatar, friendCode:code });
  saveProfile();
  renderFriends(); updateProfileStats();
  showToast(`👫 ${pseudo} ajouté !`);

  // Optionnel : ajouter réciproquement (best effort)
  try {
    const theirSnap = await getDoc(doc(db,'users',uid));
    if (theirSnap.exists()) {
      const them = theirSnap.data();
      if (!them.friends) them.friends=[];
      if (!them.friends.find(f=>f.uid===currentUser.uid)) {
        them.friends.push({ uid:currentUser.uid, pseudo:profile.pseudo, avatar:profile.avatar, friendCode:profile.friendCode });
        await updateDoc(doc(db,'users',uid), { friends:them.friends });
      }
    }
  } catch(e) {} // silencieux
}

async function removeFriend(uid) {
  profile.friends = (profile.friends||[]).filter(f=>f.uid!==uid);
  saveProfile(); renderFriends(); updateProfileStats();
  showToast('❌ Ami retiré');
}

function renderFriends() {
  const list = document.getElementById('friendsList');
  list.innerHTML = '';
  const friends = profile?.friends||[];
  if (!friends.length) {
    list.innerHTML='<div class="friends-empty">Aucun ami pour l\'instant 😢<br>Partage ton code ami pour jouer ensemble !</div>';
    return;
  }
  friends.forEach(f => {
    const row=document.createElement('div'); row.className='friend-row';
    // Écouter lastSeen en temps réel pour badge "en ligne"
    row.innerHTML=`
      <div class="friend-avatar">${f.avatar||'😀'}</div>
      <div class="friend-info">
        <div class="friend-pseudo">${f.pseudo}</div>
        <div class="friend-level">${f.friendCode}</div>
      </div>
      <button class="friend-remove" onclick="removeFriend('${f.uid}')">✕</button>`;
    list.appendChild(row);
    // Afficher badge online (lastSeen < 5min)
    getDoc(doc(db,'users',f.uid)).then(snap=>{
      if (snap.exists()) {
        const ls = snap.data().lastSeen?.toMillis?.();
        if (ls && Date.now()-ls < 5*60*1000) {
          const badge=document.createElement('span');
          badge.textContent='🟢'; badge.style.cssText='font-size:12px;margin-right:4px';
          row.querySelector('.friend-pseudo').prepend(badge);
        }
      }
    }).catch(()=>{});
  });
}

// ══════════════════════════════════════════════════════════
//  NAVIGATION & UI
// ══════════════════════════════════════════════════════════

function enterApp() {
  hideLoading();
  document.getElementById('mainNavbar').style.display = 'flex';
  updateUI();
  applyTheme();
  applyI18n();
  initSettingsUI();
  showPage('home');
  tryStartMusic();
  // Timer recharges
  setInterval(()=>{ if(gameState){ updateCharges(); renderCharges(); updateTimer(); }},1000);
}

function updateUI() {
  if (!profile || !gameState) return;
  updateHomeExt();
  updateCharges();
  renderCharges();
  updateTimer();
  updateOwnedCount();
  updateProfileView();
}

function showPage(name) {
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  const page=document.getElementById('page-'+name);
  if (page) page.classList.add('active');
  const nav=document.getElementById('nav-'+name);
  if (nav) nav.classList.add('active');
  if (name==='collection')   renderCollection();
  if (name==='extensions')   renderExtensions();
  if (name==='profile-view') updateProfileView();
}

// ── Profil view ──────────────────────────────────────────
function updateProfileView() {
  if (!profile||!gameState) return;
  document.getElementById('userAvatar').textContent     = profile.avatar;
  document.getElementById('userPseudoChip').textContent = profile.pseudo;
  document.getElementById('pvAvatar').textContent       = profile.avatar;
  document.getElementById('pvPseudo').textContent       = profile.pseudo;
  document.getElementById('pvFriendCode').textContent   = profile.friendCode;
  updateProfileStats();
  renderAvatarGrid();
  renderFriends();
}
function updateProfileStats() {
  if (!profile||!gameState) return;
  const total = Object.values(gameState.collection||{}).reduce((s,v)=>s+(v.count||0),0);
  const uniq  = Object.keys(gameState.collection||{}).length;
  const lv    = getLevel(total);
  document.getElementById('pvLevel').textContent     = `Niv. ${lv.num} · ${lv.label}`;
  document.getElementById('statCards').textContent   = total;
  document.getElementById('statUniq').textContent    = uniq;
  document.getElementById('statPacks').textContent   = profile.packsOpened||0;
  document.getElementById('statFriends').textContent = (profile.friends||[]).length;
}
function renderAvatarGrid() {
  const grid=document.getElementById('avatarGrid'); grid.innerHTML='';
  AVATARS.forEach(av=>{
    const d=document.createElement('div'); d.className='avatar-opt'+(profile.avatar===av?' selected':'');
    d.textContent=av; d.onclick=()=>selectAvatar(av); grid.appendChild(d);
  });
}
async function selectAvatar(av) {
  profile.avatar=av;
  // Met aussi à jour l'index codes
  try { await updateDoc(doc(db,'usersByCode',profile.friendCode),{avatar:av}); } catch(e){}
  saveProfile(); renderAvatarGrid();
  document.getElementById('pvAvatar').textContent   = av;
  document.getElementById('userAvatar').textContent = av;
}
function copyFriendCode() {
  navigator.clipboard?.writeText(profile.friendCode).then(()=>showToast('📋 Code copié !'));
}

// ── Extension ────────────────────────────────────────────
function updateHomeExt() {
  if (!gameState) return;
  const ext=currentExt();
  document.getElementById('extStripIcon').textContent     = ext.icon;
  document.getElementById('extStripName').textContent     = ext.name;
  document.getElementById('boosterExtName').textContent   = ext.name;
  document.getElementById('boosterTapExtName').textContent= ext.name;
}
function renderExtensions() {
  const list=document.getElementById('extList'); list.innerHTML='';
  EXTENSIONS.forEach(ext=>{
    const div=document.createElement('div');
    div.className='ext-card'+(ext.id===gameState?.currentExt?' selected':'');
    const owned=ext.cards.filter(c=>gameState?.collection?.[c.id]).length;
    div.innerHTML=`<div class="ext-card-icon">${ext.icon}</div><div class="ext-card-info"><div class="ext-card-name">${ext.name}</div><div class="ext-card-sub">${owned}/${ext.cards.length} cartes · ${ext.desc}</div></div>${ext.id===gameState?.currentExt?'<div class="ext-selected-badge">✓ Active</div>':''}`;
    div.onclick=()=>selectExtension(ext.id); list.appendChild(div);
  });
}
function selectExtension(id) {
  gameState.currentExt=id; profile.gameState=gameState; saveProfile();
  updateHomeExt(); renderExtensions(); showToast(`${getExt(id).icon} ${getExt(id).name}`);
  setTimeout(()=>showPage('home'),500);
}

// ── Charges ──────────────────────────────────────────────
function updateCharges() {
  if (!gameState) return;
  const elapsed=Date.now()-gameState.lastChargeTime;
  const gained =Math.floor(elapsed/CHARGE_INTERVAL);
  if (gained>0&&gameState.charges<MAX_CHARGES) {
    gameState.charges=Math.min(MAX_CHARGES,gameState.charges+gained);
    gameState.lastChargeTime+=gained*CHARGE_INTERVAL;
    profile.gameState=gameState; saveProfile();
  }
}
function renderCharges() {
  if (!gameState) return;
  for(let i=0;i<4;i++) document.getElementById('pip'+i).classList.toggle('filled',i<gameState.charges);
  document.getElementById('btnOpen').disabled=gameState.charges<=0;
}
function updateTimer() {
  if (!gameState) return;
  const el=document.getElementById('chargesTimer');
  if (gameState.charges>=MAX_CHARGES){el.innerHTML=`<span>${t('charges_full')}</span>`;return;}
  const rem=Math.max(0,gameState.lastChargeTime+CHARGE_INTERVAL-Date.now());
  const h=String(Math.floor(rem/3600000)).padStart(2,'0');
  const m=String(Math.floor(rem%3600000/60000)).padStart(2,'0');
  const s=String(Math.floor(rem%60000/1000)).padStart(2,'0');
  el.innerHTML=`${t('next_charge')} <span>${h}:${m}:${s}</span>`;
}

// ── Booster ──────────────────────────────────────────────
function rollRarity(){const r=Math.random()*100;if(r<1)return'gold';if(r<6)return'fullart';if(r<26)return'rare';return'basique';}
function rollCard(){const ext=currentExt();const pool=ext.cards.filter(c=>c.rarity===rollRarity());const cards=pool.length?pool:ext.cards;return cards[Math.floor(Math.random()*cards.length)];}

function openBooster() {
  if (!gameState||gameState.charges<=0) return;
  gameState.charges--; profile.gameState=gameState; saveProfile();
  profile.packsOpened=(profile.packsOpened||0)+1;
  renderCharges();
  pendingCards=Array.from({length:CARDS_PER_PACK},rollCard); revealIndex=0;
  document.getElementById('boosterTapExtName').textContent=currentExt().name;
  showStage('stageBooster');
  document.getElementById('boosterOverlay').classList.add('active');
}
function showStage(id){['stageBooster','stageCards','stageRecap'].forEach(s=>{document.getElementById(s).style.display=s===id?'flex':'none';});}
function startReveal(){spawnParticles('basique');setTimeout(()=>{showStage('stageCards');showCurrentCard();},250);}
function showCurrentCard(){
  const card=pendingCards[revealIndex];
  document.getElementById('revealCounter').textContent=`Carte ${revealIndex+1} / ${CARDS_PER_PACK}`;
  document.getElementById('revealedCardName').textContent=card.name;
  const rb=document.getElementById('revealedCardRarity'); rb.textContent=RARITY_LABELS[card.rarity]; rb.className='card-rarity-badge rarity-'+card.rarity;
  const wrap=document.getElementById('revealedCardWrap'); wrap.style.animation='none'; wrap.offsetHeight; wrap.style.animation='';
  document.getElementById('revealedCard').className='revealed-card reveal-glow-'+card.rarity;
  const content=document.getElementById('revealedCardContent'); content.innerHTML=''; content.style.cssText='';
  loadCardImg(card,content,'12px'); spawnParticles(card.rarity);
  document.getElementById('btnNextCard').textContent=revealIndex<CARDS_PER_PACK-1?'Suivant ➡️':'🎉 Voir le récap !';
}
function nextReveal(){revealIndex++;if(revealIndex<CARDS_PER_PACK)showCurrentCard();else showRecap();}
function showRecap(){
  showStage('stageRecap');
  const grid=document.getElementById('recapGrid'); grid.innerHTML='';
  pendingCards.forEach((card,i)=>{
    const div=document.createElement('div'); div.className='recap-card-mini'; div.style.setProperty('--delay',(i*0.08)+'s'); div.style.background=getRarityBg(card.rarity);
    loadCardImg(card,div,'6px'); grid.appendChild(div);
  });
  spawnParticles('gold');
}
function collectAll(){
  pendingCards.forEach(card=>{
    if (!gameState.collection[card.id]) gameState.collection[card.id]={count:0,isNew:true};
    gameState.collection[card.id].count++; gameState.collection[card.id].isNew=true;
  });
  profile.gameState=gameState; saveProfile();
  pendingCards=[];
  document.getElementById('boosterOverlay').classList.remove('active');
  document.getElementById('particles').innerHTML='';
  showToast('🎉 5 cartes ajoutées !');
  updateOwnedCount(); updateProfileStats();
}

// ── Images ───────────────────────────────────────────────
function loadCardImg(card,container,radius){
  const img=new Image();
  img.onload =()=>{ container.innerHTML=`<img src="${card.img}" alt="${card.name}" style="width:100%;height:100%;object-fit:cover;border-radius:${radius};display:block;">`; };
  img.onerror=()=>{ container.innerHTML=`<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:${getRarityBg(card.rarity)};border-radius:${radius};font-size:28px">${card.emoji}</div>`; };
  img.src=card.img;
}

// ── Collection ───────────────────────────────────────────
function renderCollection(){
  if (!gameState) return;
  const ext=currentExt(); const grid=document.getElementById('collectionGrid'); grid.innerHTML='';
  document.getElementById('collectionExtLabel').textContent=`${ext.icon} Extension ${ext.name}`;
  updateOwnedCount();
  ext.cards.forEach(card=>{
    const owned=gameState.collection[card.id];
    const item=document.createElement('div'); item.className='card-item'+(owned?` owned r-${card.rarity}`:'');
    if(owned){
      loadCardImg(card,item,'8px');
      if(owned.isNew){const b=document.createElement('div');b.className='new-badge';b.textContent='New!';item.appendChild(b);}
      if(owned.count>1){const b=document.createElement('div');b.className='count-badge';b.textContent=`×${owned.count}`;item.appendChild(b);}
      addRarityDot(item,card.rarity); item.onclick=()=>openCardModal(card);
    } else {
      item.innerHTML=`<div class="card-item-placeholder unknown"><div class="card-shadow-icon">🃏</div><div class="card-num">#${String(card.num).padStart(3,'0')}</div></div>`;
    }
    grid.appendChild(item);
  });
}
function addRarityDot(item,rarity){const d=document.createElement('div');d.className=`card-rarity-dot dot-${rarity}`;item.appendChild(d);}
function updateOwnedCount(){
  if (!gameState) return;
  const ext=currentExt();
  document.getElementById('ownedCount').textContent=ext.cards.filter(c=>gameState.collection?.[c.id]).length;
  document.getElementById('totalCount').textContent=ext.cards.length;
}

// ── Card modal ───────────────────────────────────────────
function openCardModal(card){
  if(gameState.collection[card.id]){gameState.collection[card.id].isNew=false;profile.gameState=gameState;saveProfile();}
  const imgCont=document.getElementById('cardModalImg'); imgCont.innerHTML=''; loadCardImg(card,imgCont,'10px');
  document.getElementById('cardModalName').textContent=card.name;
  const rb=document.getElementById('cardModalRarity'); rb.textContent=RARITY_LABELS[card.rarity]; rb.className='card-rarity-badge rarity-'+card.rarity;
  const owned=gameState.collection[card.id];
  document.getElementById('cardModalCount').textContent=owned?`${owned.count} exemplaire${owned.count>1?'s':''}`:'';
  document.getElementById('cardModal').classList.add('active'); renderCollection();
}
function closeCardModal(){document.getElementById('cardModal').classList.remove('active');}
function closeModal(id){document.getElementById(id).classList.remove('active');}

// ── Particles ────────────────────────────────────────────
function spawnParticles(rarity){
  const pal={basique:['#94a3b8','#cbd5e1','#fff'],rare:['#3b82f6','#93c5fd','#fff'],fullart:['#8b5cf6','#c4b5fd','#fff','#f472b6'],gold:['#f59e0b','#fde68a','#fff','#fb923c']};
  const cols=pal[rarity]||pal.basique; const count=rarity==='gold'?65:rarity==='fullart'?45:22;
  const cont=document.getElementById('particles'); cont.innerHTML='';
  let style=document.getElementById('particleStyle');
  if(!style){style=document.createElement('style');style.id='particleStyle';document.head.appendChild(style);}
  const dx=(Math.random()>0.5?1:-1)*(50+Math.random()*120); const dy=-(70+Math.random()*100);
  style.textContent=`@keyframes pfly{0%{transform:scale(1) translate(0,0);opacity:1}100%{transform:scale(0) translate(${dx}px,${dy}px);opacity:0}}`;
  for(let i=0;i<count;i++){
    const p=document.createElement('div'); p.className='particle';
    const col=cols[Math.floor(Math.random()*cols.length)];
    const sz=4+Math.random()*8,x=15+Math.random()*70,y=15+Math.random()*70,dur=(0.4+Math.random()*0.8).toFixed(2);
    p.style.cssText=`left:${x}%;top:${y}%;width:${sz}px;height:${sz}px;background:${col};box-shadow:0 0 ${sz}px ${col};animation:pfly ${dur}s ease-out forwards;`;
    cont.appendChild(p);
  }
}

// ── Thème / Langue / Musique ─────────────────────────────
function applyTheme(){
  const dark=appCfg.dark;
  document.documentElement.setAttribute('data-theme',dark?'dark':'light');
  const btn=document.getElementById('themeBtn'); if(btn) btn.textContent=dark?'☀️':'🌙';
  const dt=document.getElementById('darkToggle'); if(dt) dt.checked=dark;
}
function toggleDark(){ setDark(!appCfg.dark); }
function setDark(v){ appCfg.dark=v; saveCfg(); applyTheme(); }
function setLang(lang){ appCfg.lang=lang; saveCfg(); applyI18n(); showToast('🌍 '+t('lang_name')); }
function saveSetting(k,v){ appCfg[k]=v; saveCfg(); if(k==='volume'){document.getElementById('volumeLabel').textContent=v+'%';document.getElementById('volumeSlider').style.setProperty('--val',v+'%');document.getElementById('bgMusic').volume=v/100;} }

function tryStartMusic(){
  const audio=document.getElementById('bgMusic'); audio.volume=appCfg.volume/100;
  if(appCfg.volume>0) audio.play().then(()=>{musicPlaying=true;updateMusicBtn();}).catch(()=>{});
}
function toggleMusic(){
  const audio=document.getElementById('bgMusic');
  if(musicPlaying){audio.pause();musicPlaying=false;}else{audio.play().then(()=>{musicPlaying=true;}).catch(()=>{});}
  updateMusicBtn();
}
function updateMusicBtn(){const b=document.getElementById('musicBtn');if(b)b.textContent=musicPlaying?'🎵':'🔇';}

// ── Save / Reset ─────────────────────────────────────────
function exportSave(){
  const data=btoa(JSON.stringify({gameState}));
  navigator.clipboard?.writeText(data).then(()=>showToast('📋 Sauvegarde copiée !'));
}
function showImportModal(){document.getElementById('importModal').classList.add('active');}
function importSave(){
  const raw=document.getElementById('importDataArea').value.trim();
  if(!raw){showToast('⚠️ Colle un code');return;}
  try{
    const p=JSON.parse(atob(raw));
    if(p.gameState){gameState=p.gameState;profile.gameState=gameState;saveProfile();}
    closeModal('importModal'); updateUI(); showToast('✅ Importée !');
  }catch(e){showToast('❌ Code invalide');}
}
function confirmReset(){document.getElementById('resetModal').classList.add('active');}
function doReset(){
  gameState=defaultGame(); profile.gameState=gameState; saveProfile();
  closeModal('resetModal'); updateUI(); showToast('🗑️ Réinitialisé !');
}
function requestNotifPermission(){
  if(!('Notification' in window)){showToast('⚠️ Non supporté');return;}
  Notification.requestPermission().then(p=>showToast(p==='granted'?'🔔 Activé !':'❌ Refusé'));
}

// ── Auth UI tabs ─────────────────────────────────────────
function switchAuthTab(tab){
  document.getElementById('tabLogin').classList.toggle('active',tab==='login');
  document.getElementById('tabRegister').classList.toggle('active',tab==='register');
  document.getElementById('authLogin').style.display    = tab==='login'?'':'none';
  document.getElementById('authRegister').style.display = tab==='register'?'':'none';
  document.getElementById('authError').textContent='';
  document.getElementById('regError').textContent='';
}

// ── Loading screen ───────────────────────────────────────
function setLoading(msg){ document.getElementById('loadingScreen').style.display='flex'; document.getElementById('loadingText').textContent=msg||'…'; }
function hideLoading()  { document.getElementById('loadingScreen').style.display='none'; }

// ── Toast ────────────────────────────────────────────────
function showToast(msg){
  const t=document.getElementById('toast'); t.textContent=msg; t.classList.add('show');
  clearTimeout(toastTimeout); toastTimeout=setTimeout(()=>t.classList.remove('show'),2400);
}

// ── Background bubbles ───────────────────────────────────
function initBg(){
  const bc=document.getElementById('bgBubbles');
  const cols=['#f472b6','#8b5cf6','#3b82f6','#facc15','#06b6d4','#22c55e'];
  for(let i=0;i<8;i++){
    const b=document.createElement('div'); b.className='bubble';
    const sz=80+Math.random()*200,col=cols[Math.floor(Math.random()*cols.length)];
    b.style.cssText=`left:${Math.random()*100}%;top:${Math.random()*100}%;width:${sz}px;height:${sz}px;background:${col};--dur:${12+Math.random()*15}s;--delay:${-Math.random()*10}s;`;
    bc.appendChild(b);
  }
}

// ── Settings UI ──────────────────────────────────────────
function initSettingsUI(){
  const sl=document.getElementById('volumeSlider'); if(!sl) return;
  sl.value=appCfg.volume; sl.style.setProperty('--val',appCfg.volume+'%');
  document.getElementById('volumeLabel').textContent=appCfg.volume+'%';
  document.getElementById('animToggle').checked=appCfg.animations!==false;
  document.getElementById('langSelect').value=appCfg.lang||'fr';
  sl.addEventListener('input',function(){saveSetting('volume',parseInt(this.value));});
}

// ── Init ─────────────────────────────────────────────────
function init(){
  loadCfg(); applyTheme(); initBg(); applyI18n();
  // Loading screen pendant que Firebase vérifie la session
  setLoading('Connexion…');
  // onAuthStateChanged est le vrai point d'entrée (déclaré plus haut)
}

document.addEventListener('DOMContentLoaded', init);

// Expose globalement les fonctions appelées depuis le HTML
Object.assign(window, {
  switchAuthTab, loginUser, registerUser, loginGoogle, confirmGooglePseudo,
  confirmLogout, doLogout, closeModal,
  showPage, toggleDark, setDark, setLang, toggleMusic, saveSetting,
  openBooster, startReveal, nextReveal, collectAll,
  closeCardModal, openCardModal,
  addFriend, confirmAddFriend, removeFriend,
  copyFriendCode, selectAvatar,
  exportSave, showImportModal, importSave, confirmReset, doReset, requestNotifPermission
});
