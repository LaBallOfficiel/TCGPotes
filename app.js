/* ═══════════════════════════════════════════════════════════
   TCGPOTES — app.js  v7  (bugfix complet)
═══════════════════════════════════════════════════════════ */

// ── CONFIG ────────────────────────────────────────────────
const FIREBASE_CONFIG={apiKey:"AIzaSyALLbAdXoT3-Vbcy82n1W__yIjdRpsCwZQ",authDomain:"tcgpotes-525e0.firebaseapp.com",projectId:"tcgpotes-525e0",storageBucket:"tcgpotes-525e0.firebasestorage.app",messagingSenderId:"259521841130",appId:"1:259521841130:web:ec723c4ca9f1d1987cd493"};
const JSONBIN_KEY="$2a$10$BBj6PdhZCQE70vbGQir6Negcqd6LOBfm0RP3Y7qgdBOxwN7pzs1aO";
const JB_BASE="https://api.jsonbin.io/v3";
const GLOBAL_INDEX_BIN="69b4217eaa77b81da9e05e2a";

firebase.initializeApp(FIREBASE_CONFIG);
const auth=firebase.auth();

// ── JSONBIN ───────────────────────────────────────────────
async function jbCreate(data){
  const r=await fetch(`${JB_BASE}/b`,{method:"POST",headers:{"Content-Type":"application/json","X-Master-Key":JSONBIN_KEY,"X-Bin-Private":"true"},body:JSON.stringify(data)});
  const j=await r.json();return j.metadata?.id||null;
}
async function jbRead(binId){
  const r=await fetch(`${JB_BASE}/b/${binId}/latest`,{headers:{"X-Master-Key":JSONBIN_KEY}});
  if(!r.ok)throw new Error(`jbRead ${binId} → ${r.status}`);
  const j=await r.json();return j.record||null;
}
async function jbUpdate(binId,data){
  const r=await fetch(`${JB_BASE}/b/${binId}`,{method:"PUT",headers:{"Content-Type":"application/json","X-Master-Key":JSONBIN_KEY},body:JSON.stringify(data)});
  if(!r.ok)throw new Error(`jbUpdate ${binId} → ${r.status}`);
}

// ── INDEX GLOBAL ──────────────────────────────────────────
async function lookupCode(code){
  try{const idx=await jbRead(GLOBAL_INDEX_BIN);return idx?.codes?.[code]||null;}
  catch(e){console.warn('lookupCode err',e);return null;}
}
async function registerCode(code,uid,binId,pseudo,avatar){
  try{
    const idx=await jbRead(GLOBAL_INDEX_BIN)||{codes:{}};
    if(!idx.codes)idx.codes={};
    idx.codes[code]={uid,binId,pseudo,avatar};
    await jbUpdate(GLOBAL_INDEX_BIN,idx);
  }catch(e){console.warn('registerCode err',e);}
}
async function updateAvatarIndex(code,avatar){
  try{
    const idx=await jbRead(GLOBAL_INDEX_BIN)||{codes:{}};
    if(idx.codes?.[code]){idx.codes[code].avatar=avatar;await jbUpdate(GLOBAL_INDEX_BIN,idx);}
  }catch(e){}
}

// ── DONNÉES JEU ───────────────────────────────────────────
// Rarités par numéro de carte — extension Lycée
const LYCEE_RARITIES = {
  // Cartes originales
  1:'basique',2:'basique',3:'basique',4:'basique',5:'basique',
  6:'basique',7:'basique',8:'basique',9:'basique',10:'basique',
  11:'rare',12:'rare',13:'rare',14:'rare',15:'rare',
  16:'rare',17:'rare',18:'rare',19:'rare',20:'rare',
  21:'fullart',22:'fullart',23:'fullart',24:'fullart',25:'fullart',
  26:'gold',
  // Nouvelles cartes
  27:'gold',
  28:'basique',29:'basique',30:'basique',31:'basique',32:'basique',
  33:'basique',34:'basique',35:'basique',
  36:'rare',37:'rare',38:'rare',39:'rare',40:'rare',41:'rare',
  42:'fullart',43:'fullart',44:'fullart',45:'fullart',46:'fullart',
};

const RARITY_SORT_ORDER = {basique:0, rare:1, fullart:2, gold:3};
const RARITY_EMOJI = {basique:'🎴', rare:'💎', fullart:'🌟', gold:'👑'};

function buildCards(ext, total){
  const out = [];
  for(let i = 1; i <= total; i++){
    // Utiliser le mapping spécifique si disponible, sinon fallback générique
    let rarity;
    if(ext === 'Lycee' && LYCEE_RARITIES[i]){
      rarity = LYCEE_RARITIES[i];
    } else {
      if(i <= 10) rarity = 'basique';
      else if(i <= 20) rarity = 'rare';
      else if(i <= 25) rarity = 'fullart';
      else rarity = 'gold';
    }
    out.push({
      id: `${ext}_${i}`,
      num: i,
      name: `Carte ${i}`,
      ext,
      rarity,
      emoji: RARITY_EMOJI[rarity],
      img: `img/${ext}/carte${i}_ex${ext}.png`
    });
  }
  // Trier par rareté pour l'affichage (basique → rare → fullart → gold)
  // Les IDs restent identiques donc les collections existantes ne sont pas affectées
  out.sort((a, b) => {
    const diff = RARITY_SORT_ORDER[a.rarity] - RARITY_SORT_ORDER[b.rarity];
    if(diff !== 0) return diff;
    return a.num - b.num; // même rareté → ordre numérique
  });
  return out;
}

const EXTENSIONS=[{id:'Lycee',name:'Lycée',icon:'🏫',desc:'46 cartes · Extension 1',total:46}];
EXTENSIONS.forEach(e=>{e.cards=buildCards(e.id,e.total);});

const RARITY_LABELS={basique:'Basique',rare:'Rare',fullart:'Full Art',gold:'Gold'};
// Ordre d'affichage dans la collection (tri par rareté, puis par numéro)
const RARITY_SORT={basique:0,rare:1,fullart:2,gold:3};
const AVATARS=[
  // Visages
  '😀','😎','🤩','😈','🥷','🤠','👻','💀','🤖','👾',
  // Animaux
  '🦊','🐱','🐸','🦄','🐲','🐺','🦁','🐯','🐻','🐼',
  '🦋','🐙','🦈','🦅','🦉','🐬','🦎','🦖',
  // Personnages
  '🧙','🧜','🦸','🧚','🧝','🥸','🤺','🧛',
  // Objets / symboles
  '🎩','🌈','🍀','⭐','🔥','💎','👑','⚡','🌙','🌸',
  '🎭','🗡️','🛡️','🎯','🏆','💫','🌊','❄️',
];
const MAX_CHARGES=2, CHARGE_INTERVAL=3*60*60*1000, CARDS_PER_PACK=3;

// ── I18N ──────────────────────────────────────────────────
const I18N={
  fr:{nav_home:'Accueil',nav_collection:'Collection',nav_profile:'Profil',nav_settings:'Réglages',nav_guide:'Guide',
      tap_open:'👆 Appuie pour ouvrir !',open_btn:'🎁 Ouvrir le Booster !',
      charges_full:'⚡ Recharges complètes !',next_charge:'Prochaine dans',
      card_lbl:'Carte',of_lbl:'/',next_card:'Suivant ➡️',see_recap:'🎉 Voir le récap !',
      cards_added:'🎉 3 cartes ajoutées !',add_all:'✅ Tout ajouter !',recap_title:'🎉 Ton Booster !',
      collection_title:'🃏 Collection',
      profile_title:'👤 Mon Profil',friend_code:'Code ami',copy_code:'📋',
      friends_title:'👫 Amis',no_friends:'Aucun ami pour l\'instant 😢\nPartage ton code ami !',
      friend_placeholder:'Code ami (ex: ABC-1234)',add_friend:'+ Ajouter',
      searching:'🔍 Recherche…',not_found:'❌ Code introuvable',already_friend:'👫 Déjà ami !',
      own_code:'😅 C\'est ton propre code !',friend_added:'👫 {name} ajouté !',
      friend_removed:'❌ Ami retiré',remove_friend:'✕',
      friend_req_sent:'📨 Demande envoyée à {name} !',friend_req_pending:'En attente…',
      friend_requests:'Demandes reçues',no_requests:'Aucune demande',
      req_accept:'✅',req_decline:'❌',friend_req_accepted:'👫 {name} accepté !',
      friend_req_declined:'Demande refusée',already_sent:'📨 Demande déjà envoyée',
      view_profile:'👁 Profil',propose_trade:'🔄 Échange',
      avatar_title:'🎭 Avatar',logout_btn:'🚪 Se déconnecter',
      stat_cards:'Cartes',stat_uniq:'Uniques',stat_packs:'Boosters',stat_friends:'Amis',
      settings_title:'⚙️ Réglages',section_appearance:'🎨 Apparence',dark_mode:'Mode sombre',dark_sub:'Thème nuit',
      section_lang:'🌍 Langue',section_audio:'🔊 Audio',music_volume:'Volume musique',animations:'Animations',anims_sub:'Effets visuels',
      section_account:'👤 Compte',notif_title:'Alertes recharge',notif_sub:'Notifications navigateur',enable:'Activer',
      reset_btn:'🗑️ Réinitialiser la progression',
      logout_confirm:'Se déconnecter ?',logout_cloud:'Ta progression est sauvegardée dans le cloud ☁️',
      logout_do:'🚪 Déconnecter',cancel:'✕ Annuler',close:'✕ Fermer',
      reset_confirm:'Réinitialiser ?',reset_warn:'Toute ta progression (cartes, boosters) sera supprimée.',irreversible:'Irréversible !',
      reset_do:'🗑️ Oui, tout effacer',
      trade_title:'🔄 Proposer un échange',trade_give:'Ta carte (à donner)',trade_receive:'Carte souhaitée',
      trade_same_rarity:'⚠️ Même rareté uniquement',trade_send:'Envoyer la proposition',
      trade_cancel:'Annuler',trade_sent:'📨 Proposition envoyée !',trade_accept:'✅ Accepter',trade_decline:'❌ Refuser',
      trade_pending:'Échanges en attente',trade_no_pending:'Aucun échange en attente',
      trade_accepted:'✅ Échange accepté !',trade_declined:'❌ Échange refusé',
      friend_profile_title:'Profil de',friend_collection:'Collection',
      guide_title:'📖 Guide & Règles',guide_intro:'Bienvenue dans TCGPotes ! Voici tout ce que tu dois savoir.',
      guide_pack_title:'🎁 Boosters',guide_pack_text:'Chaque joueur dispose de 2 recharges maximum. Une nouvelle recharge arrive toutes les 3 heures. Chaque booster contient 3 cartes.',
      guide_rarity_title:'✨ Raretés',guide_drop_title:'📊 Taux de drop',
      guide_rarity_basique:'Basique — Cartes 1-10, 28-35',guide_rarity_rare:'Rare — Cartes 11-20, 36-41',
      guide_rarity_fullart:'Full Art — Cartes 21-25, 42-46',guide_rarity_gold:'Gold — Cartes 26 et 27',
      guide_rate_basique:'74%',guide_rate_rare:'20%',guide_rate_fullart:'5%',guide_rate_gold:'1%',
      guide_trade_title:'🔄 Échanges',guide_trade_text:'Tu peux proposer un échange à un ami. L\'échange doit être entre deux cartes de même rareté. L\'ami doit accepter pour que l\'échange soit effectif.',
      guide_level_title:'🏆 Niveaux',guide_level_text:'Ton niveau augmente avec le nombre de cartes collectées.',
      guide_levels:'🌱 Apprenti → ⚡ Débutant (5) → 🎒 Ramasseur (15) → 📦 Collectionneur (30) → 🏹 Chasseur (50) → 🗺️ Explorateur (75) → 🧠 Stratège (100) → ⚔️ Vétéran (140) → … 🃏👑 TCGPotes (1650)',
      guide_friend_title:'👫 Amis',guide_friend_text:'Partage ton code ami à tes amis pour les ajouter. Tu peux voir leur collection et proposer des échanges.',
      lang_name:'Français'},
  en:{nav_home:'Home',nav_collection:'Collection',nav_profile:'Profile',nav_settings:'Settings',nav_guide:'Guide',
      tap_open:'👆 Tap to open!',open_btn:'🎁 Open Booster!',
      charges_full:'⚡ Full charges!',next_charge:'Next in',
      card_lbl:'Card',of_lbl:'/',next_card:'Next ➡️',see_recap:'🎉 See recap!',
      cards_added:'🎉 3 cards added!',add_all:'✅ Add all!',recap_title:'🎉 Your Booster!',
      collection_title:'🃏 Collection',
      profile_title:'👤 My Profile',friend_code:'Friend code',copy_code:'📋',
      friends_title:'👫 Friends',no_friends:'No friends yet 😢\nShare your friend code!',
      friend_placeholder:'Friend code (e.g. ABC-1234)',add_friend:'+ Add',
      searching:'🔍 Searching…',not_found:'❌ Code not found',already_friend:'👫 Already friends!',
      own_code:'😅 That\'s your own code!',friend_added:'👫 {name} added!',
      friend_removed:'❌ Friend removed',remove_friend:'✕',
      friend_req_sent:'📨 Request sent to {name}!',friend_req_pending:'Pending…',
      friend_requests:'Friend requests',no_requests:'No requests',
      req_accept:'✅',req_decline:'❌',friend_req_accepted:'👫 {name} accepted!',
      friend_req_declined:'Request declined',already_sent:'📨 Request already sent',
      view_profile:'👁 Profile',propose_trade:'🔄 Trade',
      avatar_title:'🎭 Avatar',logout_btn:'🚪 Log out',
      stat_cards:'Cards',stat_uniq:'Unique',stat_packs:'Packs',stat_friends:'Friends',
      settings_title:'⚙️ Settings',section_appearance:'🎨 Appearance',dark_mode:'Dark mode',dark_sub:'Night theme',
      section_lang:'🌍 Language',section_audio:'🔊 Audio',music_volume:'Music volume',animations:'Animations',anims_sub:'Visual effects',
      section_account:'👤 Account',notif_title:'Recharge alerts',notif_sub:'Browser notifications',enable:'Enable',
      reset_btn:'🗑️ Reset progress',
      logout_confirm:'Log out?',logout_cloud:'Your progress is saved in the cloud ☁️',
      logout_do:'🚪 Log out',cancel:'✕ Cancel',close:'✕ Close',
      reset_confirm:'Reset?',reset_warn:'All your progress (cards, packs) will be deleted.',irreversible:'Irreversible!',
      reset_do:'🗑️ Yes, delete everything',
      trade_title:'🔄 Propose a trade',trade_give:'Your card (to give)',trade_receive:'Wanted card',
      trade_same_rarity:'⚠️ Same rarity only',trade_send:'Send proposal',
      trade_cancel:'Cancel',trade_sent:'📨 Proposal sent!',trade_accept:'✅ Accept',trade_decline:'❌ Decline',
      trade_pending:'Pending trades',trade_no_pending:'No pending trades',
      trade_accepted:'✅ Trade accepted!',trade_declined:'❌ Trade declined',
      friend_profile_title:'Profile of',friend_collection:'Collection',
      guide_title:'📖 Guide & Rules',guide_intro:'Welcome to TCGPotes! Here\'s everything you need to know.',
      guide_pack_title:'🎁 Boosters',guide_pack_text:'Each player has 2 charges max. A new charge arrives every 3 hours. Each booster contains 3 randomly drawn cards.',
      guide_rarity_title:'✨ Rarities',guide_drop_title:'📊 Drop rates',
      guide_rarity_basique:'Common — Cards 1-10, 28-35',guide_rarity_rare:'Rare — Cards 11-20, 36-41',
      guide_rarity_fullart:'Full Art — Cards 21-25, 42-46',guide_rarity_gold:'Gold — Cards 26 & 27',
      guide_rate_basique:'74%',guide_rate_rare:'20%',guide_rate_fullart:'5%',guide_rate_gold:'1%',
      guide_trade_title:'🔄 Trades',guide_trade_text:'You can propose a trade to a friend. Same rarity only. Your friend must accept.',
      guide_level_title:'🏆 Levels',guide_level_text:'Your level increases with the number of cards collected.',
      guide_levels:'🌱 Apprentice → ⚡ Beginner (5) → 🎒 Gatherer (15) → 📦 Collector (30) → 🏹 Hunter (50) → 🗺️ Explorer (75) → 🧠 Strategist (100) → ⚔️ Veteran (140) → … 🃏👑 TCGPotes (1650)',
      guide_friend_title:'👫 Friends',guide_friend_text:'Share your friend code. You can view their collection and propose trades.',
      lang_name:'English'},
  es:{nav_home:'Inicio',nav_collection:'Colección',nav_profile:'Perfil',nav_settings:'Ajustes',nav_guide:'Guía',
      tap_open:'👆 ¡Toca para abrir!',open_btn:'🎁 ¡Abrir Sobre!',
      charges_full:'⚡ ¡Recargas llenas!',next_charge:'Próxima en',
      card_lbl:'Carta',of_lbl:'/',next_card:'Siguiente ➡️',see_recap:'🎉 ¡Ver resumen!',
      cards_added:'🎉 ¡3 cartas añadidas!',add_all:'✅ ¡Añadir todo!',recap_title:'🎉 ¡Tu Sobre!',
      collection_title:'🃏 Colección',profile_title:'👤 Mi Perfil',friend_code:'Código amigo',copy_code:'📋',
      friends_title:'👫 Amigos',no_friends:'Sin amigos 😢\n¡Comparte tu código!',
      friend_placeholder:'Código amigo',add_friend:'+ Añadir',searching:'🔍 Buscando…',not_found:'❌ Código no encontrado',
      already_friend:'👫 ¡Ya es amigo!',own_code:'😅 ¡Es tu propio código!',friend_added:'👫 {name} añadido!',
      friend_removed:'❌ Amigo eliminado',remove_friend:'✕',
      friend_req_sent:'📨 ¡Solicitud enviada a {name}!',friend_req_pending:'Pendiente…',
      friend_requests:'Solicitudes',no_requests:'Sin solicitudes',
      req_accept:'✅',req_decline:'❌',friend_req_accepted:'👫 ¡{name} aceptado!',
      friend_req_declined:'Solicitud rechazada',already_sent:'📨 Solicitud ya enviada',
      view_profile:'👁 Perfil',propose_trade:'🔄 Intercambio',
      avatar_title:'🎭 Avatar',logout_btn:'🚪 Cerrar sesión',
      stat_cards:'Cartas',stat_uniq:'Únicas',stat_packs:'Sobres',stat_friends:'Amigos',
      settings_title:'⚙️ Ajustes',section_appearance:'🎨 Apariencia',dark_mode:'Modo oscuro',dark_sub:'Tema noche',
      section_lang:'🌍 Idioma',section_audio:'🔊 Audio',music_volume:'Volumen música',animations:'Animaciones',anims_sub:'Efectos visuales',
      section_account:'👤 Cuenta',notif_title:'Alertas recarga',notif_sub:'Notificaciones',enable:'Activar',
      reset_btn:'🗑️ Reiniciar progreso',
      logout_confirm:'¿Cerrar sesión?',logout_cloud:'Tu progreso está guardado en la nube ☁️',
      logout_do:'🚪 Cerrar sesión',cancel:'✕ Cancelar',close:'✕ Cerrar',
      reset_confirm:'¿Reiniciar?',reset_warn:'Todo tu progreso será eliminado.',irreversible:'¡Irreversible!',
      reset_do:'🗑️ Sí, borrar todo',
      trade_title:'🔄 Proponer intercambio',trade_give:'Tu carta (a dar)',trade_receive:'Carta deseada',
      trade_same_rarity:'⚠️ Solo misma rareza',trade_send:'Enviar propuesta',
      trade_cancel:'Cancelar',trade_sent:'📨 ¡Propuesta enviada!',trade_accept:'✅ Aceptar',trade_decline:'❌ Rechazar',
      trade_pending:'Intercambios pendientes',trade_no_pending:'Sin intercambios pendientes',
      trade_accepted:'✅ ¡Intercambio aceptado!',trade_declined:'❌ Intercambio rechazado',
      friend_profile_title:'Perfil de',friend_collection:'Colección',
      guide_title:'📖 Guía y Reglas',guide_intro:'¡Bienvenido a TCGPotes!',
      guide_pack_title:'🎁 Sobres',guide_pack_text:'2 recargas máx. Una cada 3 horas. 3 cartas por sobre.',
      guide_rarity_title:'✨ Rarezas',guide_drop_title:'📊 Tasas de drop',
      guide_rarity_basique:'Común — Cartas 1-10, 28-35',guide_rarity_rare:'Rara — Cartas 11-20, 36-41',
      guide_rarity_fullart:'Full Art — Cartas 21-25, 42-46',guide_rarity_gold:'Gold — Cartas 26 y 27',
      guide_rate_basique:'74%',guide_rate_rare:'20%',guide_rate_fullart:'5%',guide_rate_gold:'1%',
      guide_trade_title:'🔄 Intercambios',guide_trade_text:'Propón un intercambio a un amigo. Solo misma rareza.',
      guide_level_title:'🏆 Niveles',guide_level_text:'Tu nivel sube con las cartas coleccionadas.',
      guide_levels:'🌱 Aprendiz → ⚡ Principiante (5) → 🎒 Recolector (15) → 📦 Coleccionista (30) → 🏹 Cazador (50) → 🗺️ Explorador (75) → 🧠 Estratega (100) → ⚔️ Veterano (140) → … 🃏👑 TCGPotes (1650)',
      guide_friend_title:'👫 Amigos',guide_friend_text:'Comparte tu código para añadir amigos.',
      lang_name:'Español'},
  de:{nav_home:'Start',nav_collection:'Sammlung',nav_profile:'Profil',nav_settings:'Einstellungen',nav_guide:'Anleitung',
      tap_open:'👆 Tippe zum Öffnen!',open_btn:'🎁 Booster öffnen!',
      charges_full:'⚡ Aufladungen voll!',next_charge:'Nächste in',
      card_lbl:'Karte',of_lbl:'/',next_card:'Weiter ➡️',see_recap:'🎉 Zusammenfassung!',
      cards_added:'🎉 3 Karten hinzugefügt!',add_all:'✅ Alle hinzufügen!',recap_title:'🎉 Dein Booster!',
      collection_title:'🃏 Sammlung',profile_title:'👤 Mein Profil',friend_code:'Freundescode',copy_code:'📋',
      friends_title:'👫 Freunde',no_friends:'Noch keine Freunde 😢',
      friend_placeholder:'Freundescode (z.B. ABC-1234)',add_friend:'+ Hinzufügen',searching:'🔍 Suche…',not_found:'❌ Code nicht gefunden',
      already_friend:'👫 Bereits befreundet!',own_code:'😅 Das ist dein eigener Code!',friend_added:'👫 {name} hinzugefügt!',
      friend_removed:'❌ Freund entfernt',remove_friend:'✕',
      friend_req_sent:'📨 Anfrage an {name} gesendet!',friend_req_pending:'Ausstehend…',
      friend_requests:'Freundschaftsanfragen',no_requests:'Keine Anfragen',
      req_accept:'✅',req_decline:'❌',friend_req_accepted:'👫 {name} angenommen!',
      friend_req_declined:'Anfrage abgelehnt',already_sent:'📨 Anfrage bereits gesendet',
      view_profile:'👁 Profil',propose_trade:'🔄 Tausch',
      avatar_title:'🎭 Avatar',logout_btn:'🚪 Abmelden',
      stat_cards:'Karten',stat_uniq:'Einzigartig',stat_packs:'Booster',stat_friends:'Freunde',
      settings_title:'⚙️ Einstellungen',section_appearance:'🎨 Aussehen',dark_mode:'Dunkler Modus',dark_sub:'Nacht-Thema',
      section_lang:'🌍 Sprache',section_audio:'🔊 Audio',music_volume:'Musiklautstärke',animations:'Animationen',anims_sub:'Visuelle Effekte',
      section_account:'👤 Konto',notif_title:'Auflade-Benachrichtigungen',notif_sub:'Browser-Benachrichtigungen',enable:'Aktivieren',
      reset_btn:'🗑️ Fortschritt zurücksetzen',
      logout_confirm:'Abmelden?',logout_cloud:'Dein Fortschritt ist in der Cloud gespeichert ☁️',
      logout_do:'🚪 Abmelden',cancel:'✕ Abbrechen',close:'✕ Schließen',
      reset_confirm:'Zurücksetzen?',reset_warn:'Dein gesamter Fortschritt wird gelöscht.',irreversible:'Unwiderruflich!',
      reset_do:'🗑️ Ja, alles löschen',
      trade_title:'🔄 Tausch vorschlagen',trade_give:'Deine Karte (abgeben)',trade_receive:'Gewünschte Karte',
      trade_same_rarity:'⚠️ Nur gleiche Seltenheit',trade_send:'Vorschlag senden',
      trade_cancel:'Abbrechen',trade_sent:'📨 Vorschlag gesendet!',trade_accept:'✅ Annehmen',trade_decline:'❌ Ablehnen',
      trade_pending:'Ausstehende Tausche',trade_no_pending:'Keine ausstehenden Tausche',
      trade_accepted:'✅ Tausch angenommen!',trade_declined:'❌ Tausch abgelehnt',
      friend_profile_title:'Profil von',friend_collection:'Sammlung',
      guide_title:'📖 Anleitung & Regeln',guide_intro:'Willkommen bei TCGPotes!',
      guide_pack_title:'🎁 Booster',guide_pack_text:'Max. 2 Aufladungen. Alle 3 Stunden eine neue. 3 Karten pro Booster.',
      guide_rarity_title:'✨ Seltenheiten',guide_drop_title:'📊 Drop-Raten',
      guide_rarity_basique:'Gewöhnlich — Karten 1-10, 28-35',guide_rarity_rare:'Selten — Karten 11-20, 36-41',
      guide_rarity_fullart:'Full Art — Karten 21-25, 42-46',guide_rarity_gold:'Gold — Karten 26 & 27',
      guide_rate_basique:'74%',guide_rate_rare:'20%',guide_rate_fullart:'5%',guide_rate_gold:'1%',
      guide_trade_title:'🔄 Tausche',guide_trade_text:'Nur gleiche Seltenheiten. Freund muss annehmen.',
      guide_level_title:'🏆 Level',guide_level_text:'Level steigt mit Anzahl gesammelter Karten.',
      guide_levels:'🌱 Lehrling → ⚡ Anfänger (5) → 🎒 Sammler (15) → 📦 Kollektor (30) → 🏹 Jäger (50) → 🗺️ Entdecker (75) → 🧠 Stratege (100) → ⚔️ Veteran (140) → … 🃏👑 TCGPotes (1650)',
      guide_friend_title:'👫 Freunde',guide_friend_text:'Teile deinen Freundescode. Sammlung ansehen und Tausche vorschlagen.',
      lang_name:'Deutsch'}
};
function t(k,vars){
  let s=(I18N[appCfg.lang]||I18N.fr)[k]||k;
  if(vars)Object.entries(vars).forEach(([k,v])=>{s=s.replace('{'+k+'}',v);});
  return s;
}
function applyI18n(){
  document.querySelectorAll('[data-i18n]').forEach(el=>{
    const v=t(el.dataset.i18n);
    if(el.tagName==='INPUT'||el.tagName==='TEXTAREA')el.placeholder=v;
    else el.textContent=v;
  });
  const btnOpen=document.getElementById('btnOpen');if(btnOpen)btnOpen.textContent=t('open_btn');
  const tapHint=document.querySelector('.tap-hint');if(tapHint)tapHint.textContent=t('tap_open');
  const langSub=document.getElementById('langSubLabel');if(langSub)langSub.textContent=t('lang_name');
  const langSel=document.getElementById('langSelect');if(langSel)langSel.value=appCfg.lang;
  updateTimer();
  if(currentPage==='guide')renderGuide();
}

// ── STATE ─────────────────────────────────────────────────
let appCfg={lang:'fr',dark:false,volume:70,animations:true};
let currentUser=null,profile=null,gameState=null,currentPage='home';
let pendingCards=[],revealIndex=0,toastTimeout=null,musicPlaying=false;
let tradeData={giving:null,wanting:null,friendUid:null,friendBinId:null};
let _handlingAuth=false;  // bloque onAuthStateChanged pendant inscription
let _chargeTimer=null;    // FIX: un seul intervalle, pas d'accumulation
let _pendingFriend=null;  // stocke l'ami trouvé sans passer d'emoji en onclick

const LS_CFG='tcgp_cfg', LS_PROFILE='tcgp_profile';
const lsGame=uid=>`tcgp_game_${uid}`, lsBin=uid=>`tcgp_bin_${uid}`;

function saveCfg(){try{localStorage.setItem(LS_CFG,JSON.stringify(appCfg));}catch(e){}}
function loadCfg(){try{const s=localStorage.getItem(LS_CFG);if(s)appCfg={...appCfg,...JSON.parse(s)};}catch(e){}}
function saveGame(){if(!gameState||!currentUser)return;try{localStorage.setItem(lsGame(currentUser.uid),JSON.stringify(gameState));}catch(e){}}
function loadGameLS(){try{const s=localStorage.getItem(lsGame(currentUser?.uid));return s?JSON.parse(s):null;}catch(e){return null;}}
function saveProfileLS(){try{localStorage.setItem(LS_PROFILE,JSON.stringify(profile));}catch(e){}}
function loadProfileLS(){try{const s=localStorage.getItem(LS_PROFILE);return s?JSON.parse(s):null;}catch(e){return null;}}
function defaultGame(){return{charges:MAX_CHARGES,lastChargeTime:Date.now(),currentExt:'Lycee',collection:{},pendingTrades:[],friendRequests:[]};}

function genFriendCode(uid){const L='ABCDEFGHJKLMNPQRSTUVWXYZ';let h=0;for(const c of uid)h=(h*31+c.charCodeAt(0))&0x7fffffff;let code='',tmp=h;for(let i=0;i<3;i++){code+=L[tmp%L.length];tmp=Math.floor(tmp/L.length);}return code+'-'+(1000+(h%9000));}
// Paliers de niveaux : [seuil_cartes_total, label, icone]
const LEVELS=[
  [0,    'Apprenti',       '🌱'],
  [5,    'Débutant',       '⚡'],
  [15,   'Ramasseur',      '🎒'],
  [30,   'Collectionneur', '📦'],
  [50,   'Chasseur',       '🏹'],
  [75,   'Explorateur',    '🗺️'],
  [100,  'Stratège',       '🧠'],
  [140,  'Vétéran',        '⚔️'],
  [180,  'Elite',          '🔱'],
  [230,  'Champion',       '🥇'],
  [290,  'Expert',         '💠'],
  [360,  'Maître',         '👑'],
  [440,  'Grand Maître',   '🌟'],
  [530,  'Légende',        '🔥'],
  [630,  'Mythique',       '💎'],
  [750,  'Immortel',       '⚡👑'],
  [900,  'Transcendant',   '🌌'],
  [1100, 'Divin',          '✨'],
  [1350, 'Omniscient',     '🌠'],
  [1650, 'TCGPotes',       '🃏👑'],
];
function getLevel(total){
  let lv=0;
  for(let i=0;i<LEVELS.length;i++){if(total>=LEVELS[i][0])lv=i; else break;}
  const num=lv+1;
  const label=LEVELS[lv][1];
  const icon=LEVELS[lv][2];
  const nextLv=LEVELS[lv+1];
  if(!nextLv)return{num,label,icon,next:null,progress:100};
  const cur=LEVELS[lv][0], nxt=nextLv[0];
  const progress=Math.round((total-cur)/(nxt-cur)*100);
  return{num,label,icon,next:nxt,progress};
}
function getExt(id){return EXTENSIONS.find(e=>e.id===id)||EXTENSIONS[0];}
function currentExt(){return getExt(gameState?.currentExt||'Lycee');}
function getRarityBg(r){return{basique:'linear-gradient(135deg,#94a3b8,#64748b)',rare:'linear-gradient(135deg,#93c5fd,#3b82f6)',fullart:'linear-gradient(135deg,#c4b5fd,#8b5cf6)',gold:'linear-gradient(135deg,#fde68a,#f59e0b)'}[r]||'linear-gradient(135deg,#e2e8f0,#cbd5e1)';}

// ── SYNC ──────────────────────────────────────────────────
let _saveTimer=null;
function saveProfile(){
  saveProfileLS();saveGame();
  clearTimeout(_saveTimer);
  _saveTimer=setTimeout(saveProfileRemote,1500);
}
async function saveProfileRemote(){
  if(!profile||!currentUser)return;
  try{
    const binId=profile.binId||localStorage.getItem(lsBin(currentUser.uid));
    if(!binId)return;
    await jbUpdate(binId,{...profile,gameState});
  }catch(e){console.warn('saveProfileRemote err',e);}
}
async function loadProfileRemote(uid){
  // Chercher binId dans l'index global (source de vérité partagée)
  let binId=null;
  try{
    const idx=await jbRead(GLOBAL_INDEX_BIN);
    const entry=idx?.codes&&Object.values(idx.codes).find(v=>v.uid===uid);
    if(entry){binId=entry.binId;localStorage.setItem(lsBin(uid),binId);}
  }catch(e){
    // Index inaccessible → fallback localStorage
    binId=localStorage.getItem(lsBin(uid));
    console.warn('index inaccessible, fallback LS:',binId);
  }
  if(!binId)return null;
  try{
    const data=await jbRead(binId);
    if(!data)return null;
    const{gameState:gs,...prof}=data;
    profile=prof;
    gameState=gs||loadGameLS()||defaultGame();
    if(!gameState.pendingTrades)gameState.pendingTrades=[];
    if(!gameState.friendRequests)gameState.friendRequests=[];
    if(!gameState.collection)gameState.collection={};
    saveProfileLS();saveGame();
    return profile;
  }catch(e){console.warn('loadProfileRemote err',e);return null;}
}
async function createNewProfile(uid,pseudo){
  const friendCode=genFriendCode(uid);
  profile={uid,pseudo,avatar:'😀',friendCode,binId:null,friends:[],packsOpened:0};
  gameState=defaultGame();
  const binId=await jbCreate({...profile,gameState});
  if(!binId)throw new Error('jbCreate a retourné null');
  profile.binId=binId;
  localStorage.setItem(lsBin(uid),binId);
  saveProfileLS();saveGame();
  await registerCode(friendCode,uid,binId,pseudo,'😀');
  return profile;
}

// ── AUTH ──────────────────────────────────────────────────
auth.onAuthStateChanged(async user=>{
  if(_handlingAuth)return; // inscription/création en cours, on ignore
  hideLoading();
  if(!user){currentUser=null;profile=null;gameState=null;showAuthPage();return;}

  currentUser=user;
  setLoading('Chargement…');

  // 1. Cache local → affichage immédiat
  const cached=loadProfileLS();
  if(cached&&cached.uid===user.uid){
    profile=cached;
    gameState=loadGameLS()||defaultGame();
    if(!gameState.pendingTrades)gameState.pendingTrades=[];
    hideLoading();
    enterApp();
    // Sync cloud silencieuse en arrière-plan
    loadProfileRemote(user.uid).then(p=>{if(p)updateUI();}).catch(()=>{});
    return;
  }

  // 2. Pas de cache local → chercher dans le cloud
  const remote=await loadProfileRemote(user.uid);
  hideLoading();
  if(remote){
    enterApp();
  } else if(user.providerData[0]?.providerId==='google.com'){
    showPseudoPrompt(user);
  } else {
    // Compte Firebase existe mais pas de profil JSONBin
    showAuthPage();
    showToast('❌ Profil introuvable, réessaie');
  }
});

function showAuthPage(){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-auth').classList.add('active');
  document.getElementById('mainNavbar').style.display='none';
  // FIX: arrêter l'intervalle quand on est sur la page auth
  if(_chargeTimer){clearInterval(_chargeTimer);_chargeTimer=null;}
}

async function loginUser(){
  const email=document.getElementById('loginEmail').value.trim();
  const pass=document.getElementById('loginPassword').value;
  if(!email||!pass){setAuthError('authError','⚠️ Remplis tous les champs');return;}
  try{
    setLoading('Connexion…');
    await auth.signInWithEmailAndPassword(email,pass);
    // onAuthStateChanged prend le relais
  }catch(e){hideLoading();setAuthError('authError',firebaseErrMsg(e.code));}
}

async function registerUser(){
  const pseudo=document.getElementById('regPseudo').value.trim();
  const email=document.getElementById('regEmail').value.trim();
  const pass=document.getElementById('regPassword').value;
  if(pseudo.length<2||pseudo.length>20){setAuthError('regError','⚠️ Pseudo : 2 à 20 caractères');return;}
  if(!email||pass.length<6){setAuthError('regError','⚠️ Email valide + 6+ caractères');return;}

  _handlingAuth=true;
  setLoading('Vérification du pseudo…');
  try{
    // Vérif pseudo unique
    const idx=await jbRead(GLOBAL_INDEX_BIN)||{codes:{}};
    const taken=Object.values(idx.codes||{}).find(v=>v.pseudo?.toLowerCase()===pseudo.toLowerCase());
    if(taken){_handlingAuth=false;hideLoading();setAuthError('regError','❌ Pseudo déjà pris !');return;}

    setLoading('Création du compte…');
    const cred=await auth.createUserWithEmailAndPassword(email,pass);
    currentUser=cred.user;

    setLoading('Création du profil…');
    await createNewProfile(cred.user.uid,pseudo);

    _handlingAuth=false;
    hideLoading();
    enterApp(); // direct dans le jeu !
  }catch(e){
    _handlingAuth=false;
    hideLoading();
    setAuthError('regError',firebaseErrMsg(e.code));
  }
}

async function loginGoogle(){
  try{
    setLoading('Connexion Google…');
    const provider=new firebase.auth.GoogleAuthProvider();
    const isWebView=/wv|WebView/.test(navigator.userAgent)||(navigator.userAgent.includes('Android')&&!navigator.userAgent.includes('Chrome/'));
    if(isWebView){
      await auth.signInWithRedirect(provider);
    } else {
      await auth.signInWithPopup(provider);
      // onAuthStateChanged prend le relais
    }
  }catch(e){
    hideLoading();
    if(e.code!=='auth/popup-closed-by-user')showToast('❌ '+firebaseErrMsg(e.code));
  }
}
async function checkRedirectResult(){
  try{
    const result=await auth.getRedirectResult();
    // onAuthStateChanged se déclenchera automatiquement
  }catch(e){if(e.code)showToast('❌ '+firebaseErrMsg(e.code));}
}

async function doLogout(){
  closeModal('logoutModal');
  setLoading('Déconnexion…');
  // FIX: nettoyage complet du cache local au logout
  if(currentUser){
    localStorage.removeItem(LS_PROFILE);
    localStorage.removeItem(lsGame(currentUser.uid));
    // NE PAS supprimer lsBin — nécessaire pour se reconnecter
  }
  await auth.signOut();
  hideLoading();
}
function confirmLogout(){document.getElementById('logoutModal').classList.add('active');}

function showPseudoPrompt(user){
  _handlingAuth=true;
  const modal=document.getElementById('resetModal');
  modal.innerHTML=`<div class="card-modal-inner" onclick="event.stopPropagation()">
    <div style="font-size:46px;text-align:center">😀</div>
    <div class="card-modal-name">Choisis ton pseudo</div>
    <input class="p-input" id="googlePseudo" placeholder="Pseudo (2–20 caractères)" maxlength="20" style="width:100%;margin:10px 0;box-sizing:border-box">
    <button class="btn-profile-action" onclick="confirmGooglePseudo('${user.uid}')">✅ Confirmer</button>
    <div id="gPseudoErr" style="color:var(--red);font-size:13px;text-align:center;min-height:16px;margin-top:6px"></div>
  </div>`;
  modal.classList.add('active');
}
async function confirmGooglePseudo(uid){
  const pseudo=document.getElementById('googlePseudo').value.trim();
  if(pseudo.length<2||pseudo.length>20){document.getElementById('gPseudoErr').textContent='⚠️ 2 à 20 caractères';return;}
  setLoading('Création du profil…');
  closeModal('resetModal');
  try{
    await createNewProfile(uid,pseudo);
    _handlingAuth=false;
    hideLoading();
    enterApp();
  }catch(e){
    _handlingAuth=false;
    hideLoading();
    showToast('❌ Erreur création profil');
  }
}

function firebaseErrMsg(code){
  const m={
    'auth/invalid-email':'❌ Email invalide',
    'auth/wrong-password':'❌ Mot de passe incorrect',
    'auth/invalid-credential':'❌ Email ou mot de passe incorrect',
    'auth/user-not-found':'❌ Aucun compte avec cet email',
    'auth/email-already-in-use':'❌ Email déjà utilisé',
    'auth/weak-password':'❌ Mot de passe trop court (6 min)',
    'auth/too-many-requests':'⚠️ Trop de tentatives, réessaie plus tard',
    'auth/network-request-failed':'❌ Pas de connexion internet'
  };
  return m[code]||'❌ Erreur : '+code;
}
function setAuthError(id,msg){const el=document.getElementById(id);if(el){el.textContent=msg;}}
function switchAuthTab(tab){
  const slider=document.getElementById('authTabSlider');
  if(slider)slider.classList.toggle('right',tab==='register');
  document.getElementById('tabLogin').classList.toggle('active',tab==='login');
  document.getElementById('tabRegister').classList.toggle('active',tab==='register');
  document.getElementById('authLogin').style.display=tab==='login'?'':'none';
  document.getElementById('authRegister').style.display=tab==='register'?'':'none';
  document.getElementById('authError').textContent='';
  document.getElementById('regError').textContent='';
}

// ── ÉCHANGES ──────────────────────────────────────────────
function openTradeModal(friendUid,friendBinId,friendPseudo){
  tradeData={giving:null,wanting:null,friendUid,friendBinId};
  document.querySelector('#tradeModal .trade-friend-name').textContent=friendPseudo;
  renderTradeCardSelect('give');
  renderTradeCardSelect('want');
  updateTradeSendBtn();
  document.getElementById('tradeModal').classList.add('active');
}
function renderTradeCardSelect(side){
  const ext=currentExt();
  const container=document.getElementById(side==='give'?'tradeGiveGrid':'tradeWantGrid');
  container.innerHTML='';
  ext.cards.forEach(card=>{
    if(side==='give'&&!(gameState.collection[card.id]?.count>0))return;
    if(side==='want'&&tradeData.giving&&card.rarity!==tradeData.giving.rarity)return;
    const div=document.createElement('div');
    const selected=(side==='give'&&tradeData.giving?.id===card.id)||(side==='want'&&tradeData.wanting?.id===card.id);
    div.className='trade-card-opt'+(selected?' selected':'');
    div.style.background=getRarityBg(card.rarity);
    div.style.opacity=(side==='want'&&!tradeData.giving)?'0.4':'1';
    loadCardImg(card,div,'6px');
    div.onclick=()=>selectTradeCard(side,card);
    container.appendChild(div);
  });
  // Hint "même rareté" sur le label
  const label=container.previousElementSibling;
  if(label&&label.classList.contains('trade-side-label')){
    label.textContent=t(side==='give'?'trade_give':'trade_receive');
    if(side==='want'&&!tradeData.giving){
      const hint=document.createElement('span');
      hint.style.cssText='font-size:11px;color:var(--text-muted);display:block;margin-top:2px';
      hint.textContent=t('trade_same_rarity');
      label.appendChild(hint);
    }
  }
}
function selectTradeCard(side,card){
  if(side==='give'){tradeData.giving=card;tradeData.wanting=null;}
  else{tradeData.wanting=card;}
  renderTradeCardSelect('give');
  renderTradeCardSelect('want');
  updateTradeSendBtn();
}
function updateTradeSendBtn(){
  const btn=document.getElementById('tradeSendBtn');
  if(!btn)return;
  btn.disabled=!tradeData.giving||!tradeData.wanting;
  btn.textContent=t('trade_send');
}
async function sendTrade(){
  if(!tradeData.giving||!tradeData.wanting)return;
  setLoading('Envoi…');
  try{
    const theirData=await jbRead(tradeData.friendBinId);
    if(!theirData){hideLoading();showToast('❌ Impossible de joindre cet ami');return;}
    if(!theirData.gameState)theirData.gameState=defaultGame();
    if(!theirData.gameState.pendingTrades)theirData.gameState.pendingTrades=[];
    theirData.gameState.pendingTrades.push({
      id:Date.now()+'_'+Math.random().toString(36).slice(2),
      fromUid:currentUser.uid,
      fromPseudo:profile.pseudo,
      fromAvatar:profile.avatar,
      fromBinId:profile.binId,
      giving:tradeData.giving,
      wanting:tradeData.wanting
    });
    await jbUpdate(tradeData.friendBinId,theirData);
    hideLoading();
    closeModal('tradeModal');
    showToast(t('trade_sent'));
  }catch(e){
    hideLoading();
    showToast('❌ Erreur envoi échange');
    console.warn('sendTrade err',e);
  }
}
async function acceptTrade(tradeId){
  const trade=gameState.pendingTrades.find(tr=>tr.id===tradeId);
  if(!trade)return;
  // Vérifier possession
  if(!(gameState.collection[trade.wanting.id]?.count>0)){
    showToast('❌ Tu ne possèdes plus cette carte');
    gameState.pendingTrades=gameState.pendingTrades.filter(tr=>tr.id!==tradeId);
    saveProfile();renderPendingTrades();return;
  }
  setLoading('Échange en cours…');
  // Mise à jour locale
  gameState.collection[trade.wanting.id].count--;
  if(gameState.collection[trade.wanting.id].count<=0)delete gameState.collection[trade.wanting.id];
  if(!gameState.collection[trade.giving.id])gameState.collection[trade.giving.id]={count:0,isNew:true};
  gameState.collection[trade.giving.id].count++;
  gameState.collection[trade.giving.id].isNew=true;
  gameState.pendingTrades=gameState.pendingTrades.filter(tr=>tr.id!==tradeId);
  saveProfile();
  // Mise à jour de l'expéditeur
  try{
    const theirData=await jbRead(trade.fromBinId);
    if(theirData&&theirData.gameState){
      if(!theirData.gameState.collection[trade.wanting.id])theirData.gameState.collection[trade.wanting.id]={count:0,isNew:true};
      theirData.gameState.collection[trade.wanting.id].count++;
      theirData.gameState.collection[trade.wanting.id].isNew=true;
      if(theirData.gameState.collection[trade.giving.id]){
        theirData.gameState.collection[trade.giving.id].count--;
        if(theirData.gameState.collection[trade.giving.id].count<=0)delete theirData.gameState.collection[trade.giving.id];
      }
      await jbUpdate(trade.fromBinId,theirData);
    }
  }catch(e){console.warn('acceptTrade remote err',e);}
  hideLoading();
  showToast(t('trade_accepted'));
  renderPendingTrades();updateOwnedCount();updateProfileStats();
}
function declineTrade(tradeId){
  gameState.pendingTrades=gameState.pendingTrades.filter(tr=>tr.id!==tradeId);
  saveProfile();renderPendingTrades();showToast(t('trade_declined'));
}
function renderPendingTrades(){
  const container=document.getElementById('pendingTradesContainer');
  if(!container)return;
  const trades=gameState?.pendingTrades||[];
  renderFriendRequests();
  const titleEl=container.previousElementSibling;
  if(titleEl&&titleEl.dataset.i18n==='trade_pending')titleEl.textContent=t('trade_pending');
  if(!trades.length){
    container.innerHTML=`<div class="friends-empty">${t('trade_no_pending')}</div>`;
    return;
  }
  container.innerHTML='';
  trades.forEach(trade=>{
    const div=document.createElement('div');div.className='trade-pending-item';
    div.innerHTML=`
      <div class="trade-pending-header">
        <span class="friend-avatar">${trade.fromAvatar||'😀'}</span>
        <span class="friend-pseudo">${trade.fromPseudo}</span>
      </div>
      <div class="trade-pending-cards">
        <div class="trade-mini-card" style="background:${getRarityBg(trade.giving.rarity)}">
          <div style="font-size:10px;color:#fff;font-weight:800">${RARITY_LABELS[trade.giving.rarity]}</div>
          <div style="font-size:11px;color:#fff">${trade.giving.name}</div>
          <div style="font-size:10px;opacity:0.7">→ Tu reçois</div>
        </div>
        <div style="font-size:20px;align-self:center">⇄</div>
        <div class="trade-mini-card" style="background:${getRarityBg(trade.wanting.rarity)}">
          <div style="font-size:10px;color:#fff;font-weight:800">${RARITY_LABELS[trade.wanting.rarity]}</div>
          <div style="font-size:11px;color:#fff">${trade.wanting.name}</div>
          <div style="font-size:10px;opacity:0.7">→ Tu donnes</div>
        </div>
      </div>
      <div class="trade-pending-actions">
        <button class="btn-trade-accept" onclick="acceptTrade('${trade.id}')">${t('trade_accept')}</button>
        <button class="btn-trade-decline" onclick="declineTrade('${trade.id}')">${t('trade_decline')}</button>
      </div>`;
    container.appendChild(div);
  });
}

// ── AMIS — Système de demandes ───────────────────────────
async function addFriend(){
  const input=document.getElementById('friendCodeInput');
  const code=input.value.trim().toUpperCase().replace(/[^A-Z0-9-]/g,'');
  const resultEl=document.getElementById('friendSearchResult');
  resultEl.innerHTML='';
  if(!code){showToast('⚠️ Entre un code ami');return;}
  if(code===profile.friendCode){showToast(t('own_code'));return;}
  if((profile.friends||[]).find(f=>f.friendCode===code)){showToast(t('already_friend'));return;}
  resultEl.innerHTML=`<div class="friends-empty">${t('searching')}</div>`;
  const found=await lookupCode(code);
  if(!found){resultEl.innerHTML=`<div class="friends-empty">${t('not_found')}</div>`;return;}
  _pendingFriend={uid:found.uid,pseudo:found.pseudo,avatar:found.avatar||'😀',friendCode:code,binId:found.binId};
  resultEl.innerHTML=`<div class="friend-row">
    <div class="friend-avatar">${found.avatar||'😀'}</div>
    <div class="friend-info">
      <div class="friend-pseudo">${found.pseudo}</div>
      <div class="friend-level">${code}</div>
    </div>
    <button class="btn-add-friend" onclick="sendFriendRequest()">📨 Demander</button>
  </div>`;
}

async function sendFriendRequest(){
  if(!_pendingFriend)return;
  const {uid,pseudo,avatar,friendCode,binId}=_pendingFriend;
  _pendingFriend=null;
  document.getElementById('friendSearchResult').innerHTML='';
  document.getElementById('friendCodeInput').value='';
  if((profile.friends||[]).find(f=>f.uid===uid)){showToast(t('already_friend'));return;}
  setLoading('Envoi de la demande…');
  try{
    const theirData=await jbRead(binId);
    if(!theirData){hideLoading();showToast('❌ Impossible de joindre ce joueur');return;}
    if(!theirData.gameState)theirData.gameState=defaultGame();
    if(!theirData.gameState.friendRequests)theirData.gameState.friendRequests=[];
    // Vérifier si demande déjà envoyée
    if(theirData.gameState.friendRequests.find(r=>r.fromUid===currentUser.uid)){
      hideLoading();showToast(t('already_sent'));return;
    }
    // Vérifier si déjà amis de leur côté
    if((theirData.friends||[]).find(f=>f.uid===currentUser.uid)){
      hideLoading();showToast(t('already_friend'));return;
    }
    theirData.gameState.friendRequests.push({
      id:Date.now()+'_'+Math.random().toString(36).slice(2),
      fromUid:currentUser.uid,
      fromPseudo:profile.pseudo,
      fromAvatar:profile.avatar,
      fromFriendCode:profile.friendCode,
      fromBinId:profile.binId
    });
    await jbUpdate(binId,theirData);
    hideLoading();
    showToast(t('friend_req_sent',{name:pseudo}));
  }catch(e){hideLoading();showToast('❌ Erreur envoi demande');console.warn(e);}
}

async function acceptFriendRequest(reqId){
  const req=gameState.friendRequests?.find(r=>r.id===reqId);
  if(!req)return;
  setLoading('Acceptation…');
  // Ajouter localement
  if(!profile.friends)profile.friends=[];
  if(!profile.friends.find(f=>f.uid===req.fromUid)){
    profile.friends.push({uid:req.fromUid,pseudo:req.fromPseudo,avatar:req.fromAvatar,friendCode:req.fromFriendCode,binId:req.fromBinId});
  }
  gameState.friendRequests=gameState.friendRequests.filter(r=>r.id!==reqId);
  saveProfile();
  renderFriendRequests();renderFriends();updateProfileStats();
  // Ajouter réciproquement chez l'expéditeur
  try{
    const theirData=await jbRead(req.fromBinId);
    if(theirData){
      if(!theirData.friends)theirData.friends=[];
      if(!theirData.friends.find(f=>f.uid===currentUser.uid)){
        theirData.friends.push({uid:currentUser.uid,pseudo:profile.pseudo,avatar:profile.avatar,friendCode:profile.friendCode,binId:profile.binId});
        await jbUpdate(req.fromBinId,{...theirData,friends:theirData.friends});
      }
    }
  }catch(e){console.warn('accept reciprocal err',e);}
  hideLoading();
  showToast(t('friend_req_accepted',{name:req.fromPseudo}));
}

function declineFriendRequest(reqId){
  gameState.friendRequests=gameState.friendRequests.filter(r=>r.id!==reqId);
  saveProfile();renderFriendRequests();showToast(t('friend_req_declined'));
}

function renderFriendRequests(){
  const container=document.getElementById('friendRequestsList');
  if(!container)return;
  const requests=gameState?.friendRequests||[];
  const section=document.getElementById('friendRequestsSection');
  if(section)section.style.display=requests.length?'block':'none';
  // Badge sur l'icône profil dans la navbar
  const badge=document.getElementById('navRequestBadge');
  if(badge){
    if(requests.length>0){badge.textContent=requests.length>9?'9+':requests.length;badge.style.display='flex';}
    else{badge.style.display='none';}
  }
  container.innerHTML='';
  requests.forEach(req=>{
    const div=document.createElement('div');div.className='friend-request-item';
    div.innerHTML=`
      <div class="friend-avatar">${req.fromAvatar||'😀'}</div>
      <div class="friend-info">
        <div class="friend-pseudo">${req.fromPseudo}</div>
        <div class="friend-level">${req.fromFriendCode}</div>
      </div>
      <button class="btn-req-accept" onclick="acceptFriendRequest('${req.id}')" title="${t('req_accept')}">✅</button>
      <button class="btn-req-decline" onclick="declineFriendRequest('${req.id}')" title="${t('req_decline')}">❌</button>`;
    container.appendChild(div);
  });
}

function removeFriend(uid){
  profile.friends=(profile.friends||[]).filter(f=>f.uid!==uid);
  saveProfile();renderFriends();updateProfileStats();showToast(t('friend_removed'));
}

function renderFriends(){
  const list=document.getElementById('friendsList');
  if(!list)return;
  list.innerHTML='';
  const friends=profile?.friends||[];
  if(!friends.length){list.innerHTML=`<div class="friends-empty">${t('no_friends')}</div>`;return;}
  friends.forEach((f,i)=>{
    const row=document.createElement('div');row.className='friend-row';
    row.innerHTML=`
      <div class="friend-avatar">${f.avatar||'😀'}</div>
      <div class="friend-info">
        <div class="friend-pseudo">${f.pseudo}</div>
        <div class="friend-level">${f.friendCode}</div>
      </div>
      <button class="friend-action-btn" onclick="openFriendProfile(${i})" title="${t('view_profile')}">👁</button>
      <button class="friend-action-btn" onclick="openTradeModal('${f.uid}','${f.binId}','${f.pseudo}')" title="${t('propose_trade')}">🔄</button>
      <button class="friend-remove" onclick="removeFriend('${f.uid}')" title="${t('remove_friend')}">✕</button>`;
    list.appendChild(row);
  });
}

// ── PROFIL AMI ────────────────────────────────────────────
async function openFriendProfile(idx){
  const f=profile.friends[idx];
  if(!f)return;
  setLoading('Chargement…');
  let friendGameState=null;
  try{const data=await jbRead(f.binId);if(data)friendGameState=data.gameState;}catch(e){}
  hideLoading();
  const modal=document.getElementById('friendProfileModal');
  const ext=currentExt();
  const total=Object.values(friendGameState?.collection||{}).reduce((s,v)=>s+(v.count||0),0);
  const uniq=Object.keys(friendGameState?.collection||{}).length;
  const lv=getLevel(total); // basé sur total
  modal.querySelector('.fp-avatar').textContent=f.avatar||'😀';
  modal.querySelector('.fp-pseudo').textContent=f.pseudo;
  modal.querySelector('.fp-level').textContent=`${lv.icon} Niv. ${lv.num} · ${lv.label}`;
  modal.querySelector('.fp-stat-cards').textContent=total;
  modal.querySelector('.fp-stat-uniq').textContent=uniq;
  const grid=modal.querySelector('.fp-collection-grid');grid.innerHTML='';
  [...ext.cards].sort((a,b)=>{const rd=RARITY_SORT[a.rarity]-RARITY_SORT[b.rarity];return rd!==0?rd:a.num-b.num;}).forEach(card=>{
    const owned=friendGameState?.collection?.[card.id];
    const item=document.createElement('div');item.className='card-item'+(owned?` owned r-${card.rarity}`:'');
    if(owned){loadCardImg(card,item,'8px');addRarityDot(item,card.rarity);}
    else{item.innerHTML=`<div class="card-item-placeholder unknown"><div class="card-num">#${String(card.num).padStart(3,'0')}</div></div>`;}
    grid.appendChild(item);
  });
  modal.classList.add('active');
}

// ── GUIDE ─────────────────────────────────────────────────
function renderGuide(){
  const c=document.getElementById('guideContent');if(!c)return;
  c.innerHTML=`
    <div class="guide-section"><p class="guide-intro">${t('guide_intro')}</p></div>
    <div class="guide-section">
      <div class="guide-section-title">${t('guide_pack_title')}</div>
      <p>${t('guide_pack_text')}</p>
      <div class="guide-stats-row">
        <div class="guide-stat"><span class="guide-stat-val">2</span><span class="guide-stat-lbl">Recharges max</span></div>
        <div class="guide-stat"><span class="guide-stat-val">3h</span><span class="guide-stat-lbl">Entre chaque</span></div>
        <div class="guide-stat"><span class="guide-stat-val">3</span><span class="guide-stat-lbl">Cartes/booster</span></div>
      </div>
    </div>
    <div class="guide-section">
      <div class="guide-section-title">${t('guide_rarity_title')}</div>
      <div style="font-size:13px;font-weight:800;color:var(--text-muted);margin-bottom:10px">${t('guide_drop_title')}</div>
      ${[{r:'basique',label:t('guide_rarity_basique'),rate:t('guide_rate_basique')},
         {r:'rare',label:t('guide_rarity_rare'),rate:t('guide_rate_rare')},
         {r:'fullart',label:t('guide_rarity_fullart'),rate:t('guide_rate_fullart')},
         {r:'gold',label:t('guide_rarity_gold'),rate:t('guide_rate_gold')}
      ].map(row=>`
        <div class="guide-rarity-row">
          <div class="guide-rarity-badge rarity-${row.r}">${RARITY_LABELS[row.r]}</div>
          <div class="guide-rarity-label">${row.label}</div>
          <div class="guide-rarity-rate">${row.rate}</div>
          <div class="guide-rarity-bar"><div class="guide-rarity-fill" style="width:${row.rate};background:${getRarityBg(row.r)}"></div></div>
        </div>`).join('')}
    </div>
    <div class="guide-section">
      <div class="guide-section-title">${t('guide_trade_title')}</div>
      <p>${t('guide_trade_text')}</p>
    </div>
    <div class="guide-section">
      <div class="guide-section-title">${t('guide_level_title')}</div>
      <p>${t('guide_level_text')}</p>
      <div class="guide-levels-grid">
        ${LEVELS.map((lv,i)=>`
          <div class="guide-level-row">
            <div class="guide-level-icon">${lv[2]}</div>
            <div class="guide-level-info">
              <div class="guide-level-name">Niv. ${i+1} · ${lv[1]}</div>
              <div class="guide-level-req">${lv[0]===0?'Départ':lv[0]+' cartes'}</div>
            </div>
          </div>`).join('')}
      </div>
    </div>
    <div class="guide-section">
      <div class="guide-section-title">${t('guide_friend_title')}</div>
      <p>${t('guide_friend_text')}</p>
    </div>`;
}

// ── NAVIGATION ────────────────────────────────────────────
function enterApp(){
  document.getElementById('mainNavbar').style.display='flex';
  updateUI();applyTheme();applyI18n();initSettingsUI();showPage('home');tryStartMusic();
  // FIX: un seul intervalle, jamais doublé
  if(_chargeTimer)clearInterval(_chargeTimer);
  _chargeTimer=setInterval(()=>{if(gameState){updateCharges();renderCharges();updateTimer();}},1000);
}
function updateUI(){
  if(!profile||!gameState)return;
  updateHomeExt();updateCharges();renderCharges();updateTimer();updateOwnedCount();updateProfileView();renderPendingTrades();
}
function showPage(name){
  currentPage=name;
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
  const page=document.getElementById('page-'+name);if(page)page.classList.add('active');
  const nav=document.getElementById('nav-'+name);if(nav)nav.classList.add('active');
  if(name==='collection')renderCollection();
  if(name==='extensions')renderExtensions();
  if(name==='guide')renderGuide();
  if(name==='profile-view'){
    updateProfileView();renderPendingTrades();
    loadSuggestedFriends();
    // Resync cloud silencieuse quand on ouvre le profil
    if(currentUser){
      loadProfileRemote(currentUser.uid)
        .then(p=>{if(p){updateProfileView();renderPendingTrades();}})
        .catch(()=>{});
    }
  }
}

// ── PROFIL ────────────────────────────────────────────────
function updateProfileView(){
  if(!profile||!gameState)return;
  document.getElementById('userAvatar').textContent=profile.avatar;
  document.getElementById('userPseudoChip').textContent=profile.pseudo;
  document.getElementById('pvAvatar').textContent=profile.avatar;
  document.getElementById('pvPseudo').textContent=profile.pseudo;
  document.getElementById('pvFriendCode').textContent=profile.friendCode;
  updateProfileStats();renderAvatarGrid();renderFriends();
}
function updateProfileStats(){
  if(!profile||!gameState)return;
  const total=Object.values(gameState.collection||{}).reduce((s,v)=>s+(v.count||0),0);
  const uniq=Object.keys(gameState.collection||{}).length;
  const lv=getLevel(total); // basé sur total cartes
  // Afficher niveau
  const lvEl=document.getElementById('pvLevel');
  if(lvEl) lvEl.textContent=`${lv.icon} Niv. ${lv.num} · ${lv.label}`;
  // Barre de progression
  const progBar=document.getElementById('pvLevelProgress');
  if(progBar){
    progBar.style.width=lv.progress+'%';
    progBar.title=lv.next?`${lv.progress}% vers niveau ${lv.num+1}`:'Niveau max !';
  }
  const progText=document.getElementById('pvLevelProgressText');
  if(progText){
    if(lv.next!=null) progText.textContent=`${total} / ${lv.next} cartes`;
    else progText.textContent='✨ Niveau maximum atteint !';
  }
  document.getElementById('statCards').textContent=total;
  document.getElementById('statUniq').textContent=uniq;
  document.getElementById('statPacks').textContent=profile.packsOpened||0;
  document.getElementById('statFriends').textContent=(profile.friends||[]).length;
}
function renderAvatarGrid(){
  const grid=document.getElementById('avatarGrid');if(!grid)return;
  grid.innerHTML='';
  AVATARS.forEach(av=>{
    const d=document.createElement('div');
    d.className='avatar-opt'+(profile.avatar===av?' selected':'');
    d.textContent=av;d.onclick=()=>selectAvatar(av);
    grid.appendChild(d);
  });
}
async function selectAvatar(av){
  profile.avatar=av;saveProfile();renderAvatarGrid();
  document.getElementById('pvAvatar').textContent=av;
  document.getElementById('userAvatar').textContent=av;
  await updateAvatarIndex(profile.friendCode,av);
}
function copyFriendCode(){
  if(navigator.clipboard){
    navigator.clipboard.writeText(profile.friendCode).then(()=>showToast('📋 Code copié !'));
  } else {
    showToast(profile.friendCode);
  }
}

// ── EXTENSIONS ───────────────────────────────────────────
function updateHomeExt(){
  if(!gameState)return;const ext=currentExt();
  document.getElementById('extStripIcon').textContent=ext.icon;
  document.getElementById('extStripName').textContent=ext.name;
  document.getElementById('boosterExtName').textContent=ext.name;
  document.getElementById('boosterTapExtName').textContent=ext.name;
}
function renderExtensions(){
  const list=document.getElementById('extList');list.innerHTML='';
  EXTENSIONS.forEach(ext=>{
    const div=document.createElement('div');
    div.className='ext-card'+(ext.id===gameState?.currentExt?' selected':'');
    const owned=ext.cards.filter(c=>gameState?.collection?.[c.id]).length;
    div.innerHTML=`<div class="ext-card-icon">${ext.icon}</div><div class="ext-card-info"><div class="ext-card-name">${ext.name}</div><div class="ext-card-sub">${owned}/${ext.cards.length} cartes · ${ext.desc}</div></div>${ext.id===gameState?.currentExt?'<div class="ext-selected-badge">✓ Active</div>':''}`;
    div.onclick=()=>selectExtension(ext.id);
    list.appendChild(div);
  });
}
function selectExtension(id){
  gameState.currentExt=id;saveProfile();updateHomeExt();renderExtensions();
  showToast(`${getExt(id).icon} ${getExt(id).name}`);
  setTimeout(()=>showPage('home'),500);
}

// ── CHARGES ──────────────────────────────────────────────
function updateCharges(){
  if(!gameState)return;
  const elapsed=Date.now()-gameState.lastChargeTime;
  const gained=Math.floor(elapsed/CHARGE_INTERVAL);
  if(gained>0&&gameState.charges<MAX_CHARGES){
    gameState.charges=Math.min(MAX_CHARGES,gameState.charges+gained);
    gameState.lastChargeTime+=gained*CHARGE_INTERVAL;
    saveProfile();
  }
}
function renderCharges(){
  if(!gameState)return;
  for(let i=0;i<MAX_CHARGES;i++){
    const p=document.getElementById('pip'+i);
    if(p)p.classList.toggle('filled',i<gameState.charges);
  }
  const btn=document.getElementById('btnOpen');
  if(btn)btn.disabled=gameState.charges<=0;
}
function updateTimer(){
  if(!gameState)return;
  const el=document.getElementById('chargesTimer');if(!el)return;
  if(gameState.charges>=MAX_CHARGES){el.innerHTML=`<span>${t('charges_full')}</span>`;return;}
  const rem=Math.max(0,gameState.lastChargeTime+CHARGE_INTERVAL-Date.now());
  const h=String(Math.floor(rem/3600000)).padStart(2,'0');
  const m=String(Math.floor(rem%3600000/60000)).padStart(2,'0');
  const s=String(Math.floor(rem%60000/1000)).padStart(2,'0');
  el.innerHTML=`${t('next_charge')} <span>${h}:${m}:${s}</span>`;
}

// ── BOOSTER ───────────────────────────────────────────────
function rollRarity(){const r=Math.random()*100;if(r<1)return'gold';if(r<6)return'fullart';if(r<26)return'rare';return'basique';}
function rollCard(){
  const ext=currentExt();
  const pool=ext.cards.filter(c=>c.rarity===rollRarity());
  const cards=pool.length?pool:ext.cards;
  return cards[Math.floor(Math.random()*cards.length)];
}
function openBooster(){
  if(!gameState||gameState.charges<=0)return;
  gameState.charges--;
  profile.packsOpened=(profile.packsOpened||0)+1;
  saveProfile();renderCharges();
  pendingCards=Array.from({length:CARDS_PER_PACK},rollCard);
  revealIndex=0;
  document.getElementById('boosterTapExtName').textContent=currentExt().name;
  showStage('stageBooster');
  document.getElementById('boosterOverlay').classList.add('active');
}
function showStage(id){
  ['stageBooster','stageCards','stageRecap'].forEach(s=>{
    document.getElementById(s).style.display=s===id?'flex':'none';
  });
}
function startReveal(){spawnParticles('basique');setTimeout(()=>{showStage('stageCards');showCurrentCard();},250);}
function showCurrentCard(){
  const card=pendingCards[revealIndex];
  document.getElementById('revealCounter').textContent=`${t('card_lbl')} ${revealIndex+1} ${t('of_lbl')} ${CARDS_PER_PACK}`;
  document.getElementById('revealedCardName').textContent=card.name;
  const rb=document.getElementById('revealedCardRarity');
  rb.textContent=RARITY_LABELS[card.rarity];rb.className='card-rarity-badge rarity-'+card.rarity;
  const wrap=document.getElementById('revealedCardWrap');
  wrap.style.animation='none';wrap.offsetHeight;wrap.style.animation='';
  document.getElementById('revealedCard').className='revealed-card reveal-glow-'+card.rarity;
  const content=document.getElementById('revealedCardContent');
  content.innerHTML='';loadCardImg(card,content,'12px');
  spawnParticles(card.rarity);
  document.getElementById('btnNextCard').textContent=revealIndex<CARDS_PER_PACK-1?t('next_card'):t('see_recap');
}
function nextReveal(){revealIndex++;if(revealIndex<CARDS_PER_PACK)showCurrentCard();else showRecap();}
function showRecap(){
  showStage('stageRecap');
  document.querySelector('.recap-title').textContent=t('recap_title');
  document.querySelector('.btn-collect-all').textContent=t('add_all');
  const grid=document.getElementById('recapGrid');grid.innerHTML='';
  pendingCards.forEach((card,i)=>{
    const div=document.createElement('div');div.className='recap-card-mini';
    div.style.setProperty('--delay',(i*0.08)+'s');div.style.background=getRarityBg(card.rarity);
    loadCardImg(card,div,'6px');grid.appendChild(div);
  });
  spawnParticles('gold');
}
function collectAll(){
  pendingCards.forEach(card=>{
    if(!gameState.collection[card.id])gameState.collection[card.id]={count:0,isNew:true};
    gameState.collection[card.id].count++;
    gameState.collection[card.id].isNew=true;
  });
  saveProfile();pendingCards=[];
  document.getElementById('boosterOverlay').classList.remove('active');
  document.getElementById('particles').innerHTML='';
  showToast(t('cards_added'));updateOwnedCount();updateProfileStats();
}
function loadCardImg(card,container,radius){
  const img=new Image();
  img.onload=()=>{container.innerHTML=`<img src="${card.img}" alt="${card.name}" style="width:100%;height:100%;object-fit:cover;border-radius:${radius};display:block;">`};
  img.onerror=()=>{container.innerHTML=`<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:${getRarityBg(card.rarity)};border-radius:${radius};font-size:28px">${card.emoji}</div>`};
  img.src=card.img;
}

// ── COLLECTION ────────────────────────────────────────────
function renderCollection(){
  if(!gameState)return;
  const ext=currentExt();
  const grid=document.getElementById('collectionGrid');grid.innerHTML='';
  document.getElementById('collectionExtLabel').textContent=`${ext.icon} Extension ${ext.name}`;
  updateOwnedCount();
  // Tri par rareté puis par numéro (n'affecte PAS les IDs ni la progression)
  const sortedCards=[...ext.cards].sort((a,b)=>{
    const rd=RARITY_SORT[a.rarity]-RARITY_SORT[b.rarity];
    return rd!==0?rd:a.num-b.num;
  });
  sortedCards.forEach(card=>{
    const owned=gameState.collection[card.id];
    const item=document.createElement('div');
    item.className='card-item'+(owned?` owned r-${card.rarity}`:'');
    if(owned){
      loadCardImg(card,item,'8px');
      if(owned.isNew){const b=document.createElement('div');b.className='new-badge';b.textContent='New!';item.appendChild(b);}
      if(owned.count>1){const b=document.createElement('div');b.className='count-badge';b.textContent=`×${owned.count}`;item.appendChild(b);}
      addRarityDot(item,card.rarity);
      item.onclick=()=>openCardModal(card);
    } else {
      item.innerHTML=`<div class="card-item-placeholder unknown"><div class="card-shadow-icon">🃏</div><div class="card-num">#${String(card.num).padStart(3,'0')}</div></div>`;
    }
    grid.appendChild(item);
  });
}
function addRarityDot(item,rarity){
  const d=document.createElement('div');d.className=`card-rarity-dot dot-${rarity}`;item.appendChild(d);
}
function updateOwnedCount(){
  if(!gameState)return;const ext=currentExt();
  document.getElementById('ownedCount').textContent=ext.cards.filter(c=>gameState.collection?.[c.id]).length;
  document.getElementById('totalCount').textContent=ext.cards.length;
}
function openCardModal(card){
  // FIX: marquer comme vu sans re-render toute la collection
  if(gameState.collection[card.id]){
    gameState.collection[card.id].isNew=false;
    saveProfile();
  }
  const imgCont=document.getElementById('cardModalImg');imgCont.innerHTML='';
  loadCardImg(card,imgCont,'10px');
  document.getElementById('cardModalName').textContent=card.name;
  const rb=document.getElementById('cardModalRarity');
  rb.textContent=RARITY_LABELS[card.rarity];rb.className='card-rarity-badge rarity-'+card.rarity;
  const owned=gameState.collection[card.id];
  document.getElementById('cardModalCount').textContent=owned?`${owned.count} exemplaire${owned.count>1?'s':''}`:'';
  document.getElementById('cardModal').classList.add('active');
}
function closeCardModal(){document.getElementById('cardModal').classList.remove('active');}
function closeModal(id){const el=document.getElementById(id);if(el)el.classList.remove('active');}

// ── PARTICLES ─────────────────────────────────────────────
function spawnParticles(rarity){
  const pal={basique:['#94a3b8','#cbd5e1','#fff'],rare:['#3b82f6','#93c5fd','#fff'],fullart:['#8b5cf6','#c4b5fd','#fff','#f472b6'],gold:['#f59e0b','#fde68a','#fff','#fb923c']};
  const cols=pal[rarity]||pal.basique, count=rarity==='gold'?65:rarity==='fullart'?45:22;
  const cont=document.getElementById('particles');cont.innerHTML='';
  let style=document.getElementById('particleStyle');
  if(!style){style=document.createElement('style');style.id='particleStyle';document.head.appendChild(style);}
  const dx=(Math.random()>0.5?1:-1)*(50+Math.random()*120), dy=-(70+Math.random()*100);
  style.textContent=`@keyframes pfly{0%{transform:scale(1) translate(0,0);opacity:1}100%{transform:scale(0) translate(${dx}px,${dy}px);opacity:0}}`;
  for(let i=0;i<count;i++){
    const p=document.createElement('div');p.className='particle';
    const col=cols[Math.floor(Math.random()*cols.length)], sz=4+Math.random()*8, x=15+Math.random()*70, y=15+Math.random()*70, dur=(0.4+Math.random()*0.8).toFixed(2);
    p.style.cssText=`left:${x}%;top:${y}%;width:${sz}px;height:${sz}px;background:${col};box-shadow:0 0 ${sz}px ${col};animation:pfly ${dur}s ease-out forwards;`;
    cont.appendChild(p);
  }
}

// ── THÈME / LANG / MUSIQUE ────────────────────────────────
function applyTheme(){
  const dark=appCfg.dark;
  document.documentElement.setAttribute('data-theme',dark?'dark':'light');
  const btn=document.getElementById('themeBtn');if(btn)btn.textContent=dark?'☀️':'🌙';
  const dt=document.getElementById('darkToggle');if(dt)dt.checked=dark;
}
function toggleDark(){setDark(!appCfg.dark);}
function setDark(v){appCfg.dark=v;saveCfg();applyTheme();}
function setLang(lang){appCfg.lang=lang;saveCfg();applyI18n();showToast('🌍 '+t('lang_name'));}
function saveSetting(k,v){
  appCfg[k]=v;saveCfg();
  if(k==='volume'){
    document.getElementById('volumeLabel').textContent=v+'%';
    document.getElementById('volumeSlider').style.setProperty('--val',v+'%');
    document.getElementById('bgMusic').volume=v/100;
  }
}
function tryStartMusic(){
  const audio=document.getElementById('bgMusic');
  audio.volume=appCfg.volume/100;
  if(appCfg.volume>0)audio.play().then(()=>{musicPlaying=true;updateMusicBtn();}).catch(()=>{});
}
function toggleMusic(){
  const audio=document.getElementById('bgMusic');
  if(musicPlaying){audio.pause();musicPlaying=false;}
  else{audio.play().then(()=>{musicPlaying=true;}).catch(()=>{});}
  updateMusicBtn();
}
function updateMusicBtn(){const b=document.getElementById('musicBtn');if(b)b.textContent=musicPlaying?'🎵':'🔇';}

// ── RESET ─────────────────────────────────────────────────
function confirmReset(){document.getElementById('resetModal').classList.add('active');}
function doReset(){
  gameState=defaultGame();
  profile.packsOpened=0;
  saveProfile();
  closeModal('resetModal');
  updateUI();
  showToast('🗑️ Réinitialisé !');
}
function requestNotifPermission(){
  if(!('Notification'in window)){showToast('⚠️ Non supporté');return;}
  Notification.requestPermission().then(p=>showToast(p==='granted'?'🔔 Activé !':'❌ Refusé'));
}

// ── UTILS ─────────────────────────────────────────────────
function setLoading(msg){
  document.getElementById('loadingScreen').style.display='flex';
  document.getElementById('loadingText').textContent=msg||'…';
}
function hideLoading(){document.getElementById('loadingScreen').style.display='none';}
function showToast(msg){
  const el=document.getElementById('toast');
  el.textContent=msg;el.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout=setTimeout(()=>el.classList.remove('show'),2400);
}
function initBg(){
  const bc=document.getElementById('bgBubbles');
  const cols=['#f472b6','#8b5cf6','#3b82f6','#facc15','#06b6d4','#22c55e'];
  for(let i=0;i<8;i++){
    const b=document.createElement('div');b.className='bubble';
    const sz=80+Math.random()*200, col=cols[Math.floor(Math.random()*cols.length)];
    b.style.cssText=`left:${Math.random()*100}%;top:${Math.random()*100}%;width:${sz}px;height:${sz}px;background:${col};--dur:${12+Math.random()*15}s;--delay:${-Math.random()*10}s;`;
    bc.appendChild(b);
  }
}
function initSettingsUI(){
  const sl=document.getElementById('volumeSlider');if(!sl)return;
  sl.value=appCfg.volume;sl.style.setProperty('--val',appCfg.volume+'%');
  document.getElementById('volumeLabel').textContent=appCfg.volume+'%';
  document.getElementById('animToggle').checked=appCfg.animations!==false;
  document.getElementById('langSelect').value=appCfg.lang||'fr';
  // Retirer l'ancien listener avant d'en ajouter un nouveau
  sl.replaceWith(sl.cloneNode(true));
  const newSl=document.getElementById('volumeSlider');
  newSl.addEventListener('input',function(){saveSetting('volume',parseInt(this.value));});
}

function init(){loadCfg();applyTheme();initBg();applyI18n();setLoading('Connexion…');checkRedirectResult();}
document.addEventListener('DOMContentLoaded',init);


// ── RENOMMAGE ─────────────────────────────────────────────
function openRenameModal(){
  const input=document.getElementById('renameInput');
  if(input)input.value=profile.pseudo;
  document.getElementById('renameError').textContent='';
  document.getElementById('renameModal').classList.add('active');
  setTimeout(()=>input?.focus(),200);
}
async function doRename(){
  const newPseudo=document.getElementById('renameInput').value.trim();
  const errEl=document.getElementById('renameError');
  if(newPseudo.length<2||newPseudo.length>20){errEl.textContent='⚠️ 2 à 20 caractères';return;}
  if(newPseudo===profile.pseudo){closeModal('renameModal');return;}
  errEl.textContent='';
  setLoading('Vérification…');
  try{
    // Vérifier unicité
    const idx=await jbRead(GLOBAL_INDEX_BIN)||{codes:{}};
    const taken=Object.values(idx.codes||{}).find(v=>v.pseudo?.toLowerCase()===newPseudo.toLowerCase()&&v.uid!==currentUser.uid);
    if(taken){hideLoading();errEl.textContent='❌ Pseudo déjà pris !';return;}
    // Mettre à jour le profil
    const oldPseudo=profile.pseudo;
    profile.pseudo=newPseudo;
    // Mettre à jour l'index global
    if(idx.codes?.[profile.friendCode]){
      idx.codes[profile.friendCode].pseudo=newPseudo;
      await jbUpdate(GLOBAL_INDEX_BIN,idx);
    }
    saveProfile();
    updateProfileView();
    hideLoading();
    closeModal('renameModal');
    showToast('✅ Pseudo changé !');
    console.log('Pseudo changé:',oldPseudo,'→',newPseudo);
  }catch(e){hideLoading();errEl.textContent='❌ Erreur, réessaie';}
}

// ── SUPPRESSION DE COMPTE ─────────────────────────────────
function confirmDeleteAccount(){
  document.getElementById('deleteConfirmInput').value='';
  document.getElementById('deleteError').textContent='';
  document.getElementById('deleteAccountModal').classList.add('active');
}
async function doDeleteAccount(){
  const pass=document.getElementById('deleteConfirmInput').value;
  const errEl=document.getElementById('deleteError');
  if(!pass){errEl.textContent='⚠️ Entre ton mot de passe';return;}
  setLoading('Suppression…');
  try{
    // Ré-authentifier pour confirmer
    const credential=firebase.auth.EmailAuthProvider.credential(currentUser.email,pass);
    await currentUser.reauthenticateWithCredential(credential);
    // Supprimer le bin JSONBin
    if(profile.binId){
      try{
        await fetch(`${JB_BASE}/b/${profile.binId}`,{method:'DELETE',headers:{'X-Master-Key':JSONBIN_KEY}});
      }catch(e){console.warn('delete bin err',e);}
    }
    // Retirer de l'index global
    try{
      const idx=await jbRead(GLOBAL_INDEX_BIN)||{codes:{}};
      if(idx.codes?.[profile.friendCode]){
        delete idx.codes[profile.friendCode];
        await jbUpdate(GLOBAL_INDEX_BIN,idx);
      }
    }catch(e){console.warn('delete index err',e);}
    // Nettoyer localStorage
    localStorage.removeItem(LS_PROFILE);
    localStorage.removeItem(lsGame(currentUser.uid));
    localStorage.removeItem(lsBin(currentUser.uid));
    // Supprimer le compte Firebase
    await currentUser.delete();
    hideLoading();
    showToast('✅ Compte supprimé');
  }catch(e){
    hideLoading();
    if(e.code==='auth/wrong-password'||e.code==='auth/invalid-credential'){
      errEl.textContent='❌ Mot de passe incorrect';
    } else {
      errEl.textContent='❌ Erreur : '+e.code;
    }
  }
}

// ── AMIS SUGGÉRÉS ─────────────────────────────────────────
async function loadSuggestedFriends(){
  const container=document.getElementById('suggestedFriends');
  const list=document.getElementById('suggestedList');
  if(!container||!list)return;
  try{
    const idx=await jbRead(GLOBAL_INDEX_BIN)||{codes:{}};
    const allUsers=Object.values(idx.codes||{});
    // Exclure soi-même et les amis déjà ajoutés
    const friendUids=new Set((profile.friends||[]).map(f=>f.uid));
    friendUids.add(currentUser.uid);
    const candidates=allUsers.filter(u=>!friendUids.has(u.uid));
    if(!candidates.length){container.style.display='none';return;}
    // Prendre 2 au hasard
    const shuffled=candidates.sort(()=>Math.random()-0.5).slice(0,2);
    list.innerHTML='';
    shuffled.forEach(u=>{
      const div=document.createElement('div');div.className='suggested-row';
      div.innerHTML=`
        <div class="friend-avatar">${u.avatar||'😀'}</div>
        <div class="suggested-info">
          <div class="suggested-pseudo">${u.pseudo}</div>
          <div class="suggested-code">${Object.keys(idx.codes).find(k=>idx.codes[k].uid===u.uid)||''}</div>
        </div>
        <button class="btn-suggest-add" onclick="addSuggestedFriend('${u.uid}','${u.pseudo}','${u.avatar||'😀'}','${u.binId}','${Object.keys(idx.codes).find(k=>idx.codes[k].uid===u.uid)||''}')">+ Ajouter</button>`;
      list.appendChild(div);
    });
    container.style.display='block';
  }catch(e){console.warn('suggestions err',e);container.style.display='none';}
}
async function addSuggestedFriend(uid,pseudo,avatar,binId,friendCode){
  if(!profile.friends)profile.friends=[];
  if(profile.friends.find(f=>f.uid===uid)){showToast(t('already_friend'));return;}
  profile.friends.push({uid,pseudo,avatar,friendCode,binId});
  saveProfile();renderFriends();updateProfileStats();
  showToast(t('friend_added',{name:pseudo}));
  // Ajout réciproque
  try{
    const theirData=await jbRead(binId);
    if(theirData){
      if(!theirData.friends)theirData.friends=[];
      if(!theirData.friends.find(f=>f.uid===currentUser.uid)){
        theirData.friends.push({uid:currentUser.uid,pseudo:profile.pseudo,avatar:profile.avatar,friendCode:profile.friendCode,binId:profile.binId});
        await jbUpdate(binId,{...theirData,friends:theirData.friends});
      }
    }
  }catch(e){}
  // Rafraîchir les suggestions
  loadSuggestedFriends();
}

// Exposer toutes les fonctions au HTML
Object.assign(window,{
  switchAuthTab,loginUser,registerUser,loginGoogle,confirmGooglePseudo,checkRedirectResult,
  confirmLogout,doLogout,closeModal,closeCardModal,
  showPage,toggleDark,setDark,setLang,toggleMusic,saveSetting,
  openBooster,startReveal,nextReveal,collectAll,openCardModal,
  addFriend,sendFriendRequest,acceptFriendRequest,declineFriendRequest,removeFriend,
  openFriendProfile,openTradeModal,selectTradeCard,sendTrade,acceptTrade,declineTrade,
  copyFriendCode,selectAvatar,
  confirmReset,doReset,requestNotifPermission,
  openRenameModal,doRename,confirmDeleteAccount,doDeleteAccount,addSuggestedFriend
});
