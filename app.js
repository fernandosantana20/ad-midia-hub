// ============================================================================
// AD MÍDIA HUB — MOTOR DE APLICAÇÃO (DIRETOR & EQUIPE)
// ============================================================================

// Redirecionamento permanente e imediato de domínios antigos Netlify para o servidor oficial Vercel
if (typeof window !== 'undefined' && window.location && window.location.hostname && window.location.hostname.includes('netlify.app')) {
  window.location.replace('https://ad-midia-hub.vercel.app' + window.location.pathname + window.location.search + window.location.hash);
}

const STORAGE_KEYS = {
  ROLES: 'ad_midia_roles_v9_qr',
  MEMBERS: 'ad_midia_members_v9_qr',
  SCHEDULES: 'ad_midia_schedules_v9_qr',
  MODE: 'ad_midia_mode_v9_qr',
  ACTIVE_MEMBER: 'ad_midia_active_member_v9_qr',
  AUTH_EMAIL: 'ad_midia_auth_email_v9_qr',
  XP_RESET_DONE: 'ad_midia_xp_reset_v9',
  THEME: 'ad_midia_theme'
};

const ROLE_COLOR_THEMES = {
  cyan: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  amber: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  fuchsia: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30',
  emerald: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  purple: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  rose: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  blue: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  indigo: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
};

const AVATAR_GRADIENTS = [
  'from-cyan-500 to-blue-600',
  'from-amber-500 to-orange-600',
  'from-purple-500 to-indigo-600',
  'from-pink-500 to-rose-600',
  'from-emerald-500 to-teal-600',
  'from-sky-500 to-indigo-600',
  'from-violet-500 to-purple-600',
  'from-rose-500 to-red-600'
];

const state = {
  theme: localStorage.getItem(STORAGE_KEYS.THEME) || 'dark',
  authEmail: localStorage.getItem(STORAGE_KEYS.AUTH_EMAIL) || '',
  mode: localStorage.getItem(STORAGE_KEYS.MODE) || 'director', // 'director' | 'team'
  activeMemberId: localStorage.getItem(STORAGE_KEYS.ACTIVE_MEMBER) || 'm1',
  activeTab: 'schedules', // 'schedules' | 'my_area' | 'members' | 'roles' | 'attendance' | 'ranking'
  selectedScheduleId: null,
  memberSearch: '',
  memberSort: 'name_asc', // 'name_asc' (padrão A-Z) | 'name_desc' (Z-A) | 'date_desc' (recentes) | 'date_asc' (antigos)
  roleFilter: 'all',
  scheduleVolunteerSearch: '',
  attendanceVolunteerSearch: '',
  attendanceSort: 'name_asc', // 'name_asc' (padrão A-Z) | 'name_desc' (Z-A) | 'date_desc' (recentes) | 'date_asc' (antigos)
  cloudSyncStatus: 'syncing', // 'synced' | 'syncing' | 'local'
  roles: [],
  members: [],
  schedules: [],
  attendanceReportConfig: {
    scheduleId: 'all_members',
    eventDate: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }).replace('/', '.'),
    eventTitle: 'CULTO DE DOMINGO — ASSEMBLEIA DE DEUS',
    sourceFilter: 'all', // 'all' | 'qr_present' | 'scheduled'
    customRows: [] // [{ id, name, roleName, congregation, qrToken, status }]
  },
  reportConfig: {
    scheduleId: 'all_members',
    eventDate: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }).replace('/', '.'),
    eventTitle: 'MÍDIA ASSEMBLEIA GERAL',
    sourceFilter: 'all', // 'all' | 'qr_present' | 'scheduled'
    sort: 'name_asc', // 'name_asc' (padrão A-Z) | 'name_desc' (Z-A) | 'date_desc' (recentes) | 'date_asc' (antigos)
    defaultValue: '',
    customRows: [] // [{ id, name, value, signature }]
  }
};

// ============================================================================
// GESTÃO DE TEMA: MODO CLARO & MODO ESCURO (COM CORES HUMANAS E ACOLHEDORAS)
// ============================================================================

function applyTheme(theme) {
  state.theme = theme === 'light' ? 'light' : 'dark';
  try {
    localStorage.setItem(STORAGE_KEYS.THEME, state.theme);
  } catch (e) {}
  const root = document.documentElement;
  if (state.theme === 'light') {
    root.classList.remove('dark');
    root.classList.add('light');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', '#f6f8fb');
  } else {
    root.classList.remove('light');
    root.classList.add('dark');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', '#0d1320');
  }
}

function toggleTheme() {
  const nextTheme = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme(nextTheme);
  renderApp();
  showToast(
    nextTheme === 'dark' 
      ? '🌙 Modo Escuro (Cores Acolhedoras) ativado!' 
      : '☀️ Modo Claro (Luminoso & Limpo) ativado!', 
    'amber'
  );
}

// ============================================================================
// PERMISSÕES E PRIVACIDADE DE ACESSO (RBAC)
// ============================================================================

function getLoggedInUser() {
  if (!state.authEmail) return null;
  const email = state.authEmail.toLowerCase().trim();
  const isFernando = email === 'fernandosantanaferramentas@gmail.com' ||
                     email === 'fernandobritosantana@gmail.com' ||
                     email === 'fernandobritossantana@gmail.com';
  if (isFernando) {
    const fMem = state.members.find(m => m.id === 'm1') || state.members.find(m => m.roleType === 'developer');
    if (fMem) return fMem;
  }
  return state.members.find(m =>
    (m.email || '').toLowerCase().trim() === email ||
    (Array.isArray(m.secondaryEmails) && m.secondaryEmails.includes(email))
  ) || null;
}

function getEffectiveUser() {
  const logged = getLoggedInUser();
  const active = state.activeMemberId ? getMemberById(state.activeMemberId) : null;
  // Se o usuário logado for Desenvolvedor ou Diretor, permite simular as permissões do voluntário ativo no modo equipe
  if (logged && (logged.roleType === 'developer' || logged.roleType === 'director')) {
    if (state.mode === 'team' && active) {
      return active;
    }
    return logged;
  }
  return logged || active;
}

function isPrivilegedUser(member = getEffectiveUser()) {
  if (!member) return false;
  return member.roleType === 'developer' || member.roleType === 'director' || member.roleType === 'leader';
}

function canMarkAttendanceUser(member = getEffectiveUser()) {
  if (!member) {
    return state.mode === 'director';
  }
  return member.roleType === 'developer' || 
         member.roleType === 'director' || 
         member.roleType === 'leader' || 
         member.canMarkAttendance === true;
}

function toggleMemberAttendancePermission(memberId) {
  const logged = getEffectiveUser();
  if (!logged || (logged.roleType !== 'developer' && logged.roleType !== 'director' && logged.roleType !== 'leader')) {
    showToast('Apenas a liderança da mídia pode autorizar quem marca frequência.', 'rose');
    return;
  }
  const member = getMemberById(memberId);
  if (!member) return;
  member.canMarkAttendance = !member.canMarkAttendance;
  saveData();
  renderApp();
  showToast(
    member.canMarkAttendance
      ? `✅ ${member.name} agora tem permissão para marcar frequência no QR Code!`
      : `🔒 Permissão de marcar frequência removida de ${member.name}.`,
    member.canMarkAttendance ? 'emerald' : 'amber'
  );
}

function enforcePrivacyState() {
  const logged = getLoggedInUser();
  if (!logged) return;
  if (!isPrivilegedUser(logged)) {
    // Voluntário comum: trava no próprio perfil e na visão Equipe
    state.mode = 'team';
    state.activeMemberId = logged.id;
    if (state.activeTab === 'members' || state.activeTab === 'reports') {
      state.activeTab = 'my_area';
    }
  }
}

// ============================================================================
// URL BASE DO APP & SINCRONIZAÇÃO EM NUVEM SIMULTÂNEA (VERCEL)
// ============================================================================

function getAppBaseUrl() {
  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    if (window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1')) {
      return window.location.origin;
    }
  }
  return 'https://ad-midia-hub.vercel.app';
}

const PRIMARY_CLOUD_API = '/api/state';
const FALLBACK_CLOUD_API = 'https://ad-midia-hub-escala-desativado.netlify.app/api/state';

async function syncFromCloud(silent = false) {
  try {
    state.cloudSyncStatus = 'syncing';
    let cloudData = null;

    // 1. Tentar Endpoint Primário da Nuvem (/api/state na Vercel ou Netlify)
    try {
      const res = await fetch(PRIMARY_CLOUD_API, { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json && json.ok && json.data) {
          cloudData = json.data;
        }
      }
    } catch (_) {}

    // 2. Fallback direto ao Netlify Blobs Database se o proxy /api/state não responder
    if (!cloudData) {
      try {
        const fallbackRes = await fetch(FALLBACK_CLOUD_API, { cache: 'no-store' });
        if (fallbackRes.ok) {
          const fallbackJson = await fallbackRes.json();
          if (fallbackJson && fallbackJson.ok && fallbackJson.data) {
            cloudData = fallbackJson.data;
          }
        }
      } catch (_) {}
    }

    if (cloudData) {
      if (Array.isArray(cloudData.roles) && cloudData.roles.length > 0) state.roles = cloudData.roles;
      if (Array.isArray(cloudData.members) && cloudData.members.length > 0) state.members = cloudData.members;
      if (Array.isArray(cloudData.schedules)) state.schedules = cloudData.schedules;

      normalizeLoadedState();
      saveLocalCacheOnly();
      state.cloudSyncStatus = 'synced';
      renderApp();
      if (!silent) showToast('Banco em nuvem sincronizado entre todos os aparelhos!', 'emerald');
    } else {
      await pushToCloud();
      renderApp();
    }
  } catch (err) {
    state.cloudSyncStatus = 'local';
    renderApp();
  }
}

async function pushToCloud() {
  const logged = getLoggedInUser();
  const payloadObj = {
    roles: state.roles,
    members: state.members,
    schedules: state.schedules,
    updatedAt: new Date().toISOString(),
    updatedBy: logged?.email || 'system'
  };
  const bodyStr = JSON.stringify(payloadObj);

  let synced = false;

  // 1. Gravar no endpoint primário (/api/state)
  try {
    const res = await fetch(PRIMARY_CLOUD_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: bodyStr
    });
    if (res.ok) {
      const json = await res.json().catch(() => null);
      if (json && json.ok) synced = true;
    }
  } catch (_) {}

  // 2. Fallback direto ao Netlify Blobs se primário falhar
  if (!synced) {
    try {
      const fallbackRes = await fetch(FALLBACK_CLOUD_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: bodyStr
      });
      if (fallbackRes.ok) {
        const json = await fallbackRes.json().catch(() => null);
        if (json && json.ok) synced = true;
      }
    } catch (_) {}
  }

  state.cloudSyncStatus = synced ? 'synced' : 'local';
  renderApp();
}

// Sincronização periódica em segundo plano (a cada 20 segundos) e ao focar a tela
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (typeof document.addEventListener === 'function') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        syncFromCloud(true);
      }
    });
  }
  if (typeof window.addEventListener === 'function') {
    window.addEventListener('focus', () => {
      syncFromCloud(true);
    });
  }
  setInterval(() => {
    if (document.visibilityState === 'visible') {
      syncFromCloud(true);
    }
  }, 20000);
}

// ============================================================================
// FUNÇÕES DE PESQUISA DE VOLUNTÁRIOS (MEMBROS, ESCALA E FREQUÊNCIA)
// ============================================================================

function executeMemberSearch() {
  const input = document.getElementById('member-search-input');
  if (input) {
    state.memberSearch = (input.value || '').trim();
  }
  renderApp();
}

function clearMemberSearch() {
  state.memberSearch = '';
  const input = document.getElementById('member-search-input');
  if (input) input.value = '';
  renderApp();
}

function executeScheduleVolunteerSearch() {
  const input = document.getElementById('schedule-volunteer-search-input');
  if (input) {
    state.scheduleVolunteerSearch = (input.value || '').trim();
  }
  renderApp();
}

function clearScheduleVolunteerSearch() {
  state.scheduleVolunteerSearch = '';
  const input = document.getElementById('schedule-volunteer-search-input');
  if (input) input.value = '';
  renderApp();
}

function executeAttendanceVolunteerSearch() {
  const input = document.getElementById('attendance-volunteer-search-input');
  if (input) {
    state.attendanceVolunteerSearch = (input.value || '').trim();
  }
  renderApp();
}

function clearAttendanceVolunteerSearch() {
  state.attendanceVolunteerSearch = '';
  const input = document.getElementById('attendance-volunteer-search-input');
  if (input) input.value = '';
  renderApp();
}

function normalizeLoadedState() {
  if (!state.roles.some(r => r.id === 'designer')) {
    const designerDefault = window.MEDIA_ROLES.find(r => r.id === 'designer');
    if (designerDefault) state.roles.push(designerDefault);
  }

  state.schedules.forEach(s => {
    if (!Array.isArray(s.storyboard) || s.storyboard.length === 0) {
      s.storyboard = JSON.parse(JSON.stringify(window.DEFAULT_STORYBOARD || []));
    }
  });

  // Ensure all 27 official INITIAL_MEMBERS are registered in state.members
  let addedNewInitialMembers = false;
  (window.INITIAL_MEMBERS || []).forEach(initMem => {
    const existing = state.members.find(
      m => m.id === initMem.id || (m.name && m.name.toLowerCase().trim() === initMem.name.toLowerCase().trim())
    );
    if (!existing) {
      state.members.push(JSON.parse(JSON.stringify(initMem)));
      addedNewInitialMembers = true;
    } else {
      if (initMem.nickname && !existing.nickname) existing.nickname = initMem.nickname;
      if (initMem.age && !existing.age) existing.age = initMem.age;
      if (initMem.congregation && (!existing.congregation || existing.congregation === '--')) existing.congregation = initMem.congregation;
      if (initMem.experienceTime && !existing.experienceTime) existing.experienceTime = initMem.experienceTime;
      if (initMem.phone && !existing.phone) existing.phone = initMem.phone;
      if (initMem.birthDate && !existing.birthDate) existing.birthDate = initMem.birthDate;
      if (initMem.memberCardNumber && !existing.memberCardNumber) existing.memberCardNumber = initMem.memberCardNumber;
    }
  });

  state.members.forEach(m => {
    const initialRef = window.INITIAL_MEMBERS.find(im => im.id === m.id);
    if (typeof m.historyParticipations !== 'number') {
      m.historyParticipations = 0;
    }
    if (typeof m.bonusXp !== 'number') {
      m.bonusXp = 0;
    }
    if (typeof m.starRating !== 'number') {
      m.starRating = initialRef?.starRating ?? 0;
    }
    if (!m.email && initialRef?.email) {
      m.email = initialRef.email;
    }
    if (initialRef?.birthDate && !m.birthDate) {
      m.birthDate = initialRef.birthDate;
    }
    if (initialRef?.memberCardNumber && !m.memberCardNumber) {
      m.memberCardNumber = initialRef.memberCardNumber;
    }
    if (initialRef?.congregation && (!m.congregation || m.congregation === '--')) {
      m.congregation = initialRef.congregation;
    }
    if (m.id === 'm1') {
      m.email = 'fernandosantanaferramentas@gmail.com';
      m.secondaryEmails = ['fernandobritosantana@gmail.com', 'fernandobritossantana@gmail.com'];
      m.roleType = 'developer';
      m.canMarkAttendance = true;
      m.starRating = 10;
      m.qrToken = 'ADMIDIA-M1-FERNANDO';
    }
    if (!m.password || (m.id === 'm1' && m.password === 'admin123')) {
      m.password = initialRef?.password || 'N@ndo201807';
    }
    if (initialRef?.qrToken) {
      m.qrToken = initialRef.qrToken;
    } else if (!m.qrToken) {
      const slug = (m.name || 'USER').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
      m.qrToken = `ADMIDIA-${m.id.toUpperCase()}-${slug}`;
    }
    if (!Array.isArray(m.attendanceLogs)) {
      m.attendanceLogs = [];
    }
    if (!Array.isArray(m.blockedDates)) {
      m.blockedDates = [];
    }
    if (m.id === 'm22' && (!m.roleType || m.roleType === 'member')) {
      m.roleType = 'leader';
      m.canMarkAttendance = true;
    }
    if (m.roleType === 'developer' || m.roleType === 'director' || m.roleType === 'leader') {
      m.canMarkAttendance = true;
    } else if (typeof m.canMarkAttendance !== 'boolean') {
      m.canMarkAttendance = false;
    }

    // Garantir data de registro confiável para ordenação precisa por data
    if (!m.createdAt) {
      if (m.id && m.id.startsWith('m_')) {
        const ts = Number(m.id.split('_')[1]);
        m.createdAt = !isNaN(ts) && ts > 1000000000 ? new Date(ts).toISOString() : new Date(2025, 0, 1 + idx, 10, 0, 0).toISOString();
      } else if (m.id && /^m\d+$/i.test(m.id)) {
        const num = parseInt(m.id.replace(/\D/g, ''), 10) || (idx + 1);
        m.createdAt = new Date(2025, 0, num, 10, 0, 0).toISOString();
      } else {
        m.createdAt = new Date(2025, 0, 1 + idx, 10, 0, 0).toISOString();
      }
    }
  });

  enforcePrivacyState();

  if (!state.members.some(m => m.id === state.activeMemberId)) {
    const logged = getLoggedInUser();
    state.activeMemberId = logged?.id || state.members[0]?.id || 'm1';
  }

  sortSchedules();

  if (!state.selectedScheduleId && state.schedules.length > 0) {
    state.selectedScheduleId = state.schedules[0].id;
  }

  if (addedNewInitialMembers) {
    saveLocalCacheOnly();
    pushToCloud();
  }
}

function loadData() {
  try {
    const savedRoles = localStorage.getItem(STORAGE_KEYS.ROLES);
    const savedMembers = localStorage.getItem(STORAGE_KEYS.MEMBERS);
    const savedSchedules = localStorage.getItem(STORAGE_KEYS.SCHEDULES);

    state.roles = savedRoles ? JSON.parse(savedRoles) : [...window.MEDIA_ROLES];
    state.members = savedMembers ? JSON.parse(savedMembers) : [...window.INITIAL_MEMBERS];
    state.schedules = savedSchedules ? JSON.parse(savedSchedules) : [...window.INITIAL_SCHEDULES];

    normalizeLoadedState();
  } catch (e) {
    console.error('Erro ao carregar dados locais:', e);
    state.roles = [...window.MEDIA_ROLES];
    state.members = [...window.INITIAL_MEMBERS];
    state.schedules = [...window.INITIAL_SCHEDULES];
  }
}

function saveLocalCacheOnly() {
  sortSchedules();
  localStorage.setItem(STORAGE_KEYS.ROLES, JSON.stringify(state.roles));
  localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(state.members));
  localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(state.schedules));
  localStorage.setItem(STORAGE_KEYS.MODE, state.mode);
  localStorage.setItem(STORAGE_KEYS.ACTIVE_MEMBER, state.activeMemberId);
  if (state.authEmail) {
    localStorage.setItem(STORAGE_KEYS.AUTH_EMAIL, state.authEmail);
  } else {
    localStorage.removeItem(STORAGE_KEYS.AUTH_EMAIL);
  }
}

function saveData() {
  enforcePrivacyState();
  saveLocalCacheOnly();
  pushToCloud();
}

function sortSchedules() {
  state.schedules.sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
}

// ============================================================================
// SISTEMA CENTRAL DE ORDENAÇÃO DE LISTAS (A-Z, Z-A E DATA DE REGISTRO)
// ============================================================================

function sortItemsByCriteria(items, criteria = 'name_asc', nameGetter = (x) => x?.name, dateGetter = (x) => x?.createdAt || x?.date || x?.id) {
  if (!Array.isArray(items)) return [];
  const list = [...items];
  list.sort((a, b) => {
    const nameA = String(nameGetter(a) || '').trim();
    const nameB = String(nameGetter(b) || '').trim();
    if (criteria === 'name_asc') {
      return nameA.localeCompare(nameB, 'pt-BR', { sensitivity: 'base' });
    }
    if (criteria === 'name_desc') {
      return nameB.localeCompare(nameA, 'pt-BR', { sensitivity: 'base' });
    }
    if (criteria === 'date_desc') {
      const valA = dateGetter(a);
      const valB = dateGetter(b);
      const timeA = new Date(valA).getTime() || (typeof valA === 'string' && valA.startsWith('m_') ? Number(valA.split('_')[1]) : 0);
      const timeB = new Date(valB).getTime() || (typeof valB === 'string' && valB.startsWith('m_') ? Number(valB.split('_')[1]) : 0);
      if (timeB !== timeA) return timeB - timeA;
      return nameA.localeCompare(nameB, 'pt-BR', { sensitivity: 'base' });
    }
    if (criteria === 'date_asc') {
      const valA = dateGetter(a);
      const valB = dateGetter(b);
      const timeA = new Date(valA).getTime() || (typeof valA === 'string' && valA.startsWith('m_') ? Number(valA.split('_')[1]) : 0);
      const timeB = new Date(valB).getTime() || (typeof valB === 'string' && valB.startsWith('m_') ? Number(valB.split('_')[1]) : 0);
      if (timeA !== timeB) return timeA - timeB;
      return nameA.localeCompare(nameB, 'pt-BR', { sensitivity: 'base' });
    }
    return nameA.localeCompare(nameB, 'pt-BR', { sensitivity: 'base' });
  });
  return list;
}

function resetDemoData() {
  if (!confirm('Deseja zerar o banco de dados (remover todos os cultos/eventos e manter apenas Fernando Santana e Lucas Henrique)?')) return;
  localStorage.removeItem(STORAGE_KEYS.ROLES);
  localStorage.removeItem(STORAGE_KEYS.MEMBERS);
  localStorage.removeItem(STORAGE_KEYS.SCHEDULES);
  loadData();
  state.selectedScheduleId = null;
  saveData();
  renderApp();
  showToast('Banco de dados zerado! Apenas Fernando Santana e Lucas Henrique estão cadastrados.', 'cyan');
}

// ============================================================================
// AUTENTICAÇÃO VIA GMAIL & AUTO-CADASTRO EM NUVEM
// ============================================================================

async function handleGmailLogin(e) {
  e.preventDefault();
  const input = document.getElementById('gmail-login-input');
  const passInput = document.getElementById('gmail-password-input');
  const email = (input?.value || '').trim().toLowerCase();
  const password = (passInput?.value || '').trim();

  if (!email || !email.includes('@')) {
    showToast('Digite um endereço de e-mail Gmail válido.', 'rose');
    return;
  }

  // First pull latest state from cloud so any member registered on another PC is found
  await syncFromCloud(true);

  const isFernando = email === 'fernandosantanaferramentas@gmail.com' ||
                     email === 'fernandobritosantana@gmail.com' ||
                     email === 'fernandobritossantana@gmail.com';

  let matchedMember = null;
  if (isFernando) {
    matchedMember = state.members.find(m => m.id === 'm1') || state.members.find(m => m.roleType === 'developer');
  }
  if (!matchedMember) {
    matchedMember = state.members.find(m =>
      (m.email || '').toLowerCase().trim() === email ||
      (Array.isArray(m.secondaryEmails) && m.secondaryEmails.includes(email))
    );
  }

  if (!matchedMember) {
    showToast('Este Gmail ainda não está cadastrado. Preencha seu cadastro abaixo ou peça ao Diretor Lucas Henrique.', 'amber');
    toggleLoginRegisterView(true, email);
    return;
  }

  const expectedPass = matchedMember.password || 'midia123';
  const passValid = password === expectedPass ||
                    (isFernando && (password === '123456' || password === 'N@ndo201807' || password === 'midia123'));

  if (!passValid) {
    showToast('Senha incorreta! Verifique sua senha de acesso.', 'rose');
    return;
  }

  state.authEmail = matchedMember.email;
  state.activeMemberId = matchedMember.id;
  const isAdminOrDirector = isPrivilegedUser(matchedMember);
  state.mode = isAdminOrDirector ? 'director' : 'team';
  state.activeTab = isAdminOrDirector ? 'schedules' : 'my_area';
  saveLocalCacheOnly();
  renderApp();
  showToast(`Bem-vindo(a), ${matchedMember.name}! Acesso liberado.`, 'emerald');
}

function toggleLoginRegisterView(showRegister, prefillEmail = '') {
  const loginBox = document.getElementById('gmail-login-box');
  const regBox = document.getElementById('gmail-register-box');
  if (!loginBox || !regBox) return;

  if (showRegister) {
    loginBox.classList.add('hidden');
    regBox.classList.remove('hidden');
    if (prefillEmail) {
      const regEmail = document.getElementById('reg-gmail-input');
      if (regEmail) regEmail.value = prefillEmail;
    }
  } else {
    regBox.classList.add('hidden');
    loginBox.classList.remove('hidden');
  }
}

async function handleSelfRegister(e) {
  e.preventDefault();
  const name = (document.getElementById('reg-name-input')?.value || '').trim();
  const email = (document.getElementById('reg-gmail-input')?.value || '').trim().toLowerCase();
  const password = (document.getElementById('reg-password-input')?.value || '').trim() || 'midia123';
  const phone = (document.getElementById('reg-phone-input')?.value || '').trim();
  const skillNodes = document.querySelectorAll('input[name="reg-skill"]:checked');
  const skills = Array.from(skillNodes).map(n => n.value);

  if (!name || !email || !email.includes('@')) {
    showToast('Preencha seu nome completo e um Gmail válido.', 'rose');
    return;
  }
  if (skills.length === 0) {
    showToast('Selecione pelo menos uma função que você exerce na mídia.', 'amber');
    return;
  }

  await syncFromCloud(true);

  let member = state.members.find(m => (m.email || '').toLowerCase() === email);
  if (member) {
    member.name = name;
    member.password = password;
    member.phone = phone || member.phone;
    member.skills = skills;
  } else {
    // Check if registering user is Lucas Henrique (Director) or Fernando Santana (Developer)
    const isLucas = name.toLowerCase().includes('lucas henrique');
    const isFernando = email === 'fernandobritosantana@gmail.com' || email === 'fernandobritossantana@gmail.com';
    member = {
      id: 'm_' + Date.now(),
      name,
      email,
      password,
      roleType: isFernando ? 'developer' : isLucas ? 'director' : 'member',
      title: isFernando
        ? 'Desenvolvedor & Administrador do Sistema'
        : isLucas
        ? 'Diretor Geral da Mídia'
        : 'Voluntário AD Mídia',
      phone,
      skills,
      availability: 'Todos os cultos',
      avatarColor: AVATAR_GRADIENTS[state.members.length % AVATAR_GRADIENTS.length],
      historyParticipations: 0,
      bonusXp: 0,
      starRating: isFernando || isLucas ? 10 : 0,
      validatedBy: isFernando || isLucas ? 'Sistema Master' : '',
      active: true
    };
    state.members.push(member);
  }

  state.authEmail = member.email;
  state.activeMemberId = member.id;
  state.mode = isPrivilegedUser(member) ? 'director' : 'team';
  state.activeTab = isPrivilegedUser(member) ? 'schedules' : 'my_area';

  saveData();
  renderApp();
  showToast(`Cadastro salvo na nuvem! Bem-vindo(a), ${member.name}!`, 'emerald');
}

function quickSelectGmailAccount(email) {
  const input = document.getElementById('gmail-login-input');
  if (input) {
    input.value = email;
    handleGmailLogin(new Event('submit'));
  }
}

function logoutGmail() {
  state.authEmail = '';
  localStorage.removeItem(STORAGE_KEYS.AUTH_EMAIL);
  renderApp();
  showToast('Sessão encerrada com segurança.', 'cyan');
}

// ============================================================================
// UTILITÁRIOS
// ============================================================================

function getRoleById(roleId) {
  const found = state.roles.find(r => r.id === roleId);
  if (found) return found;

  const extraTitles = {
    extra_apoio: { name: 'Apoio Geral de Mídia', shortName: 'Apoio Mídia', icon: 'user-check', badgeClass: 'bg-teal-500/20 text-teal-300 border-teal-500/40' },
    extra_camera: { name: 'Cinegrafista Adicional', shortName: 'Câm. Extra', icon: 'video', badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' },
    extra_foto: { name: 'Fotógrafo Adicional', shortName: 'Foto Extra', icon: 'camera', badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40' },
    extra_social: { name: 'Social Media / Cobertura', shortName: 'Social Extra', icon: 'share-2', badgeClass: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40' },
    extra_intercom: { name: 'Operador de Intercom / Áudio', shortName: 'Intercom', icon: 'headphones', badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' }
  };

  const extra = extraTitles[roleId];
  if (extra) {
    return {
      id: roleId,
      name: extra.name,
      shortName: extra.shortName,
      category: 'Apoio & Extras',
      icon: extra.icon,
      badgeClass: extra.badgeClass,
      station: 'Produção / Geral'
    };
  }

  return {
    id: roleId,
    name: roleId,
    shortName: roleId,
    category: 'Geral',
    icon: 'circle',
    badgeClass: 'bg-slate-500/20 text-slate-300 border-slate-500/30',
    station: 'Templo'
  };
}

function getScheduleTargetPositions(sched) {
  if (!sched) return 0;
  if (typeof sched.targetVolunteers === 'number' && sched.targetVolunteers > 0) {
    return sched.targetVolunteers;
  }
  if (Array.isArray(sched.activeRoleIds) && sched.activeRoleIds.length > 0) {
    return sched.activeRoleIds.length;
  }
  return state.roles.length;
}

function updateScheduleTargetVolunteers(scheduleId, newTarget) {
  const sched = state.schedules.find(s => s.id === scheduleId);
  if (!sched) return;

  const targetNum = parseInt(newTarget, 10);
  if (isNaN(targetNum) || targetNum < 1) {
    showToast('Informe uma quantidade válida de voluntários (mínimo 1).', 'rose');
    return;
  }

  sched.targetVolunteers = targetNum;
  saveData();
  renderApp();
  renderAdjustScheduleModalContent(scheduleId);
  showToast(`Meta da escala ajustada para ${targetNum} voluntários!`, 'emerald');
}

function getRoleTypeLabel(roleType) {
  if (roleType === 'developer') return 'Desenvolvedor / Admin';
  if (roleType === 'director') return 'Diretor Geral';
  if (roleType === 'leader') return 'Líder de Setor';
  return 'Equipe / Voluntário';
}

function getRoleTypeBadge(roleType) {
  if (roleType === 'developer') {
    return `<span class="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-purple-500/25 text-purple-300 border border-purple-500/40">⚡ Desenvolvedor / Admin</span>`;
  }
  if (roleType === 'director') {
    return `<span class="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">👑 Diretor Geral</span>`;
  }
  if (roleType === 'leader') {
    return `<span class="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">⭐ Líder de Mídia</span>`;
  }
  return `<span class="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">Voluntário</span>`;
}

// ============================================================================
// VALIDAÇÃO TÉCNICA POR ESTRELAS (0 A 10 — EXCLUSIVO LÍDER / DIRETOR / DEV)
// ============================================================================

function setMemberStarRating(memberId, ratingValue) {
  const logged = getLoggedInUser();
  if (!isPrivilegedUser(logged)) {
    showToast('Apenas o Diretor Geral, Líder ou Desenvolvedor podem avaliar e validar voluntários.', 'rose');
    return;
  }
  const member = getMemberById(memberId);
  if (!member) return;

  const score = Math.max(0, Math.min(10, Number(ratingValue) || 0));
  member.starRating = score;
  member.validatedBy = logged?.name || 'Direção';
  saveData();
  renderApp();
  showToast(`Validação de ${member.name} atualizada para ★ ${score}/10!`, 'amber');
}

function renderStarRatingWidget(member, canEvaluate = false) {
  const score = typeof member.starRating === 'number' ? member.starRating : 0;
  const isValidated = score > 0;

  if (!canEvaluate) {
    return `
      <div class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border ${
        isValidated
          ? 'bg-amber-500/15 border-amber-500/35 text-amber-300'
          : 'bg-slate-900/90 border-slate-800 text-slate-400'
      }">
        <i data-lucide="star" class="w-3.5 h-3.5 ${isValidated ? 'fill-amber-400 text-amber-400' : ''}"></i>
        <span class="text-xs font-display font-extrabold">${score}/10</span>
        <span class="text-[10px] opacity-80">${isValidated ? 'Validado' : 'Sem avaliação'}</span>
      </div>
    `;
  }

  return `
    <div class="p-2.5 rounded-2xl bg-slate-950/80 border border-amber-500/30 space-y-1.5">
      <div class="flex items-center justify-between text-[10px]">
        <span class="uppercase tracking-wider font-bold text-amber-300 flex items-center gap-1">
          <i data-lucide="shield-check" class="w-3 h-3"></i>
          Validação do Líder/Diretor (0 a 10)
        </span>
        <span class="font-display font-extrabold text-xs text-white bg-amber-500/20 px-2 py-0.2 rounded-md border border-amber-500/40">
          ★ ${score}/10
        </span>
      </div>
      <div class="flex items-center justify-between gap-0.5">
        ${Array.from({ length: 11 }, (_, i) => i).map(val => {
          const active = val <= score && val > 0;
          const isZero = val === 0;
          return `
            <button
              type="button"
              onclick="setMemberStarRating('${member.id}', ${val})"
              title="Avaliar com nota ${val}/10"
              class="w-6 h-6 rounded-lg text-[10px] font-extrabold transition flex items-center justify-center border ${
                val === score
                  ? 'bg-amber-400 text-slate-950 border-amber-300 shadow glow-gold'
                  : active
                  ? 'bg-amber-500/25 text-amber-200 border-amber-500/40 hover:bg-amber-400 hover:text-slate-950'
                  : isZero
                  ? 'bg-slate-900 text-slate-500 border-slate-800 hover:border-rose-500/40 hover:text-rose-300'
                  : 'bg-slate-900/90 text-slate-400 border-slate-800 hover:border-amber-400/50 hover:text-amber-300'
              }">
              ${val}
            </button>
          `;
        }).join('')}
      </div>
      ${member.validatedBy ? `<span class="block text-[10px] text-slate-400">Validado por: <strong class="text-slate-200">${escapeHTML(member.validatedBy)}</strong></span>` : ''}
    </div>
  `;
}

function getMemberById(memberId) {
  return state.members.find(m => m.id === memberId) || null;
}

function getInitials(name) {
  if (!name) return 'AD';
  const parts = String(name).trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ============================================================================
// SEGURANÇA (ANTI-XSS) & COMPRESSÃO DE FOTO DE PERFIL (CANVAS)
// ============================================================================

function escapeHTML(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderMemberAvatar(member, sizeClasses = 'w-12 h-12 rounded-2xl text-base', allowQuickUpload = false) {
  if (!member) return '';
  const safeName = escapeHTML(member.name);
  const gradient = member.avatarColor || 'from-cyan-500 to-blue-600';
  const uploadOverlay = allowQuickUpload
    ? `<button
        type="button"
        onclick="event.stopPropagation(); triggerQuickPhotoUpload('${member.id}')"
        title="Trocar / Atualizar foto de ${safeName}"
        class="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-950 border border-cyan-400/70 text-cyan-300 hover:bg-cyan-400 hover:text-slate-950 flex items-center justify-center shadow-lg transition">
        <i data-lucide="camera" class="w-3 h-3"></i>
      </button>`
    : '';

  if (member.photoUrl) {
    return `
      <div class="relative ${sizeClasses} shrink-0 select-none overflow-hidden rounded-2xl">
        <img
          src="${member.photoUrl}"
          alt="${safeName}"
          class="w-full h-full object-cover rounded-[inherit] border border-cyan-400/50 shadow-md block" />
        ${uploadOverlay}
      </div>
    `;
  }

  return `
    <div class="relative ${sizeClasses} bg-gradient-to-br ${gradient} flex items-center justify-center font-display font-extrabold text-white shadow-md shrink-0 select-none rounded-2xl">
      <span>${getInitials(member.name)}</span>
      ${uploadOverlay}
    </div>
  `;
}

function compressImageFile(file, maxSize = 240, quality = 0.82) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) {
      reject(new Error('Selecione um arquivo de imagem válido (JPG, PNG, WEBP).'));
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = maxSize;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        // Center crop square
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;

        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = () => reject(new Error('Falha ao processar imagem.'));
      img.src = ev.target.result;
    };
    reader.onerror = () => reject(new Error('Erro na leitura do arquivo.'));
    reader.readAsDataURL(file);
  });
}

// ============================================================================
// MINI EDITOR & REDIMENSIONADOR DE FOTO DE PERFIL (CROPPER CANVAS)
// ============================================================================

let quickPhotoTargetMemberId = null;

const cropper = {
  active: false,
  targetType: null, // 'modal' | 'quick'
  targetMemberId: null,
  img: null,
  rotation: 0, // 0, 90, 180, 270
  flipH: false,
  zoom: 1.0, // 1.0 to 3.5
  panX: 0,
  panY: 0,
  baseScale: 1.0,
  isDragging: false,
  dragStartX: 0,
  dragStartY: 0,
  startPanX: 0,
  startPanY: 0,
  pinchStartDist: 0,
  pinchStartZoom: 1.0,
  eventsBound: false
};

function triggerQuickPhotoUpload(memberId) {
  quickPhotoTargetMemberId = memberId;
  const input = document.getElementById('quick-photo-input');
  if (input) {
    input.value = '';
    input.click();
  }
}

async function handleQuickPhotoSelected(event) {
  const file = event.target.files?.[0];
  if (!file || !quickPhotoTargetMemberId) return;
  openCropperWithFile(file, 'quick', quickPhotoTargetMemberId);
  quickPhotoTargetMemberId = null;
}

async function handleModalPhotoSelected(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  openCropperWithFile(file, 'modal', null);
}

function openCropperForCurrentModalPhoto() {
  const currentPhoto = document.getElementById('member-photo-data')?.value;
  if (!currentPhoto) {
    showToast('Nenhuma foto selecionada para ajustar.', 'amber');
    return;
  }
  openCropperWithUrl(currentPhoto, 'modal', null);
}

function openCropperForMemberPhoto(memberId) {
  const member = getMemberById(memberId);
  if (!member || !member.photoUrl) {
    showToast('Nenhuma foto cadastrada para redimensionar.', 'amber');
    return;
  }
  openCropperWithUrl(member.photoUrl, 'quick', member.id);
}

function openCropperWithFile(file, targetType = 'modal', targetMemberId = null) {
  if (!file || !file.type.startsWith('image/')) {
    showToast('Selecione um arquivo de imagem válido (JPG, PNG, WEBP).', 'rose');
    return;
  }
  const reader = new FileReader();
  reader.onload = ev => {
    openCropperWithUrl(ev.target.result, targetType, targetMemberId);
  };
  reader.onerror = () => {
    showToast('Erro ao ler a imagem selecionada.', 'rose');
  };
  reader.readAsDataURL(file);
}

function openCropperWithUrl(url, targetType = 'modal', targetMemberId = null) {
  const img = new Image();
  img.onload = () => {
    cropper.active = true;
    cropper.targetType = targetType;
    cropper.targetMemberId = targetMemberId;
    cropper.img = img;
    cropper.rotation = 0;
    cropper.flipH = false;
    cropper.panX = 0;
    cropper.panY = 0;
    cropper.zoom = 1.0;

    updateCropperBaseScale();

    const modal = document.getElementById('modal-image-cropper');
    if (modal) modal.classList.remove('hidden');

    setCropperZoom(1.0);
    initCropperEvents();
    if (window.lucide) window.lucide.createIcons();
    showToast('Ajuste o enquadramento e o zoom da foto.', 'cyan');
  };
  img.onerror = () => {
    showToast('Não foi possível carregar a imagem para ajuste.', 'rose');
  };
  img.src = url;
}

function closeImageCropper() {
  cropper.active = false;
  document.getElementById('modal-image-cropper')?.classList.add('hidden');
}

function updateCropperBaseScale() {
  if (!cropper.img) return;
  const cw = 320;
  const ch = 320;
  const isRotated90 = (cropper.rotation % 180) !== 0;
  const naturalW = isRotated90 ? cropper.img.naturalHeight : cropper.img.naturalWidth;
  const naturalH = isRotated90 ? cropper.img.naturalWidth : cropper.img.naturalHeight;

  // Escala para cobrir completamente os 320x320
  cropper.baseScale = Math.max(cw / naturalW, ch / naturalH);
  clampCropperPan();
}

function clampCropperPan() {
  if (!cropper.img) return;
  const cw = 320;
  const ch = 320;
  const isRotated90 = (cropper.rotation % 180) !== 0;
  const naturalW = isRotated90 ? cropper.img.naturalHeight : cropper.img.naturalWidth;
  const naturalH = isRotated90 ? cropper.img.naturalWidth : cropper.img.naturalHeight;
  const totalScale = cropper.baseScale * cropper.zoom;

  const currentW = naturalW * totalScale;
  const currentH = naturalH * totalScale;

  const maxPanX = Math.max(0, (currentW - cw) / 2);
  const maxPanY = Math.max(0, (currentH - ch) / 2);

  cropper.panX = Math.max(-maxPanX, Math.min(maxPanX, cropper.panX));
  cropper.panY = Math.max(-maxPanY, Math.min(maxPanY, cropper.panY));
}

function setCropperZoom(val) {
  const clamped = Math.max(1.0, Math.min(3.5, Number(val) || 1.0));
  cropper.zoom = clamped;

  const slider = document.getElementById('cropper-zoom-slider');
  const badge = document.getElementById('cropper-zoom-badge');
  const percent = Math.round(clamped * 100);

  if (slider) slider.value = percent;
  if (badge) badge.textContent = `${percent}%`;

  clampCropperPan();
  drawCropper();
}

function handleCropperZoomInput(val) {
  setCropperZoom(Number(val) / 100);
}

function stepCropperZoom(deltaPercent) {
  const currentPercent = Math.round(cropper.zoom * 100);
  setCropperZoom((currentPercent + deltaPercent) / 100);
}

function rotateCropper(deg = 90) {
  cropper.rotation = (cropper.rotation + deg) % 360;
  updateCropperBaseScale();
  drawCropper();
}

function flipCropperH() {
  cropper.flipH = !cropper.flipH;
  drawCropper();
}

function resetCropperView() {
  cropper.zoom = 1.0;
  cropper.rotation = 0;
  cropper.flipH = false;
  cropper.panX = 0;
  cropper.panY = 0;
  updateCropperBaseScale();
  setCropperZoom(1.0);
}

function drawCropper() {
  const canvas = document.getElementById('cropper-canvas');
  if (!canvas || !cropper.img) return;
  const ctx = canvas.getContext('2d');
  const cw = canvas.width;
  const ch = canvas.height;

  ctx.clearRect(0, 0, cw, ch);
  ctx.save();

  // Fundo do canvas
  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, cw, ch);

  // 1. Desenhar a imagem com transformações (translação, rotação, espelhamento, zoom)
  ctx.save();
  ctx.translate(cw / 2 + cropper.panX, ch / 2 + cropper.panY);
  ctx.rotate((cropper.rotation * Math.PI) / 180);
  if (cropper.flipH) {
    ctx.scale(-1, 1);
  }
  const curScale = cropper.baseScale * cropper.zoom;
  ctx.scale(curScale, curScale);

  ctx.drawImage(
    cropper.img,
    -cropper.img.naturalWidth / 2,
    -cropper.img.naturalHeight / 2
  );
  ctx.restore();

  // 2. Máscara de recorte & Guia visual (Área circular do Avatar + borda)
  const cx = cw / 2;
  const cy = ch / 2;
  const radius = cw * 0.44; // raio de ~140px

  ctx.save();
  // Escurecimento fora do círculo
  ctx.fillStyle = 'rgba(2, 6, 23, 0.62)';
  ctx.beginPath();
  ctx.rect(0, 0, cw, ch);
  ctx.arc(cx, cy, radius, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.fill();

  // Grade de auxílio (regra dos terços enquanto arrasta)
  if (cropper.isDragging) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;
    const pad = cx - radius;
    const diam = radius * 2;
    ctx.beginPath();
    ctx.moveTo(pad + diam / 3, pad);
    ctx.lineTo(pad + diam / 3, pad + diam);
    ctx.moveTo(pad + (diam * 2) / 3, pad);
    ctx.lineTo(pad + (diam * 2) / 3, pad + diam);
    ctx.moveTo(pad, pad + diam / 3);
    ctx.lineTo(pad + diam, pad + diam / 3);
    ctx.moveTo(pad, pad + (diam * 2) / 3);
    ctx.lineTo(pad + diam, pad + (diam * 2) / 3);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Anel do avatar circular (ciano luminoso)
  ctx.strokeStyle = '#06b6d4';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Marcas de canto estilo enquadramento
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.lineWidth = 1.5;
  const sqPad = 16;
  const sqSize = cw - sqPad * 2;
  const cornerLen = 18;
  // Canto superior esquerdo
  ctx.beginPath();
  ctx.moveTo(sqPad, sqPad + cornerLen);
  ctx.lineTo(sqPad, sqPad);
  ctx.lineTo(sqPad + cornerLen, sqPad);
  // Canto superior direito
  ctx.moveTo(sqPad + sqSize - cornerLen, sqPad);
  ctx.lineTo(sqPad + sqSize, sqPad);
  ctx.lineTo(sqPad + sqSize, sqPad + cornerLen);
  // Canto inferior direito
  ctx.moveTo(sqPad + sqSize, sqPad + sqSize - cornerLen);
  ctx.lineTo(sqPad + sqSize, sqPad + sqSize);
  ctx.lineTo(sqPad + sqSize - cornerLen, sqPad + sqSize);
  // Canto inferior esquerdo
  ctx.moveTo(sqPad + cornerLen, sqPad + sqSize);
  ctx.lineTo(sqPad, sqPad + sqSize);
  ctx.lineTo(sqPad, sqPad + sqSize - cornerLen);
  ctx.stroke();

  ctx.restore();
}

function initCropperEvents() {
  const canvas = document.getElementById('cropper-canvas');
  if (!canvas || cropper.eventsBound) return;
  cropper.eventsBound = true;

  // Roda do mouse para zoom
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.08 : -0.08;
    setCropperZoom(cropper.zoom + delta);
  }, { passive: false });

  // Pointer events para arrastar / mover imagem
  canvas.addEventListener('pointerdown', e => {
    if (e.pointerType === 'touch' && !e.isPrimary) return;
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    cropper.isDragging = true;
    cropper.dragStartX = e.clientX;
    cropper.dragStartY = e.clientY;
    cropper.startPanX = cropper.panX;
    cropper.startPanY = cropper.panY;
    drawCropper();
  });

  canvas.addEventListener('pointermove', e => {
    if (!cropper.isDragging) return;
    const dx = e.clientX - cropper.dragStartX;
    const dy = e.clientY - cropper.dragStartY;
    cropper.panX = cropper.startPanX + dx;
    cropper.panY = cropper.startPanY + dy;
    clampCropperPan();
    drawCropper();
  });

  const stopDrag = e => {
    if (cropper.isDragging) {
      cropper.isDragging = false;
      try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
      drawCropper();
    }
  };
  canvas.addEventListener('pointerup', stopDrag);
  canvas.addEventListener('pointercancel', stopDrag);

  // Pinça com 2 dedos (pinch-to-zoom) em celulares
  canvas.addEventListener('touchstart', e => {
    if (e.touches.length === 2) {
      cropper.isDragging = false;
      cropper.pinchStartDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      cropper.pinchStartZoom = cropper.zoom;
    }
  }, { passive: true });

  canvas.addEventListener('touchmove', e => {
    if (e.touches.length === 2 && cropper.pinchStartDist > 0) {
      const currentDist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const newZoom = cropper.pinchStartZoom * (currentDist / cropper.pinchStartDist);
      setCropperZoom(newZoom);
    }
  }, { passive: true });
}

function applyCropperImage() {
  if (!cropper.img) return;

  // Renderizar imagem recortada em alta resolução (360x360)
  const outCanvas = document.createElement('canvas');
  outCanvas.width = 360;
  outCanvas.height = 360;
  const ctx = outCanvas.getContext('2d');
  const cw = outCanvas.width;
  const ch = outCanvas.height;
  const ratio = cw / 320;

  ctx.fillStyle = '#020617';
  ctx.fillRect(0, 0, cw, ch);

  ctx.translate(cw / 2 + cropper.panX * ratio, ch / 2 + cropper.panY * ratio);
  ctx.rotate((cropper.rotation * Math.PI) / 180);
  if (cropper.flipH) {
    ctx.scale(-1, 1);
  }
  const curScale = cropper.baseScale * cropper.zoom * ratio;
  ctx.scale(curScale, curScale);

  ctx.drawImage(
    cropper.img,
    -cropper.img.naturalWidth / 2,
    -cropper.img.naturalHeight / 2
  );

  const croppedDataUrl = outCanvas.toDataURL('image/jpeg', 0.86);

  if (cropper.targetType === 'modal') {
    const hiddenInp = document.getElementById('member-photo-data');
    if (hiddenInp) hiddenInp.value = croppedDataUrl;
    updateModalPhotoPreview(croppedDataUrl);
    showToast('Foto ajustada com sucesso! Lembre-se de salvar o perfil.', 'cyan');
  } else if (cropper.targetType === 'quick') {
    const member = getMemberById(cropper.targetMemberId);
    if (member) {
      member.photoUrl = croppedDataUrl;
      saveData();
      renderApp();
      syncFromCloud(false);
      showToast(`Foto de perfil de ${member.name} redimensionada e salva!`, 'emerald');
    }
  }

  closeImageCropper();
}

function clearModalPhoto() {
  document.getElementById('member-photo-data').value = '';
  updateModalPhotoPreview('');
}

function updateModalPhotoPreview(photoUrl, memberName = '') {
  const previewEl = document.getElementById('member-photo-preview');
  const removeBtn = document.getElementById('member-photo-remove-btn');
  const cropBtn = document.getElementById('member-photo-crop-btn');
  if (!previewEl) return;

  if (photoUrl) {
    previewEl.innerHTML = `<img src="${photoUrl}" alt="Preview" class="w-full h-full object-cover rounded-2xl border border-cyan-400/60" />`;
    removeBtn?.classList.remove('hidden');
    cropBtn?.classList.remove('hidden');
  } else {
    previewEl.innerHTML = `<span class="text-lg font-display font-extrabold text-white">${getInitials(memberName || 'AD')}</span>`;
    removeBtn?.classList.add('hidden');
    cropBtn?.classList.add('hidden');
  }
}

// ============================================================================
// BACKUP SEGURO (EXPORTAR / IMPORTAR JSON) & PIN DE DIRETOR
// ============================================================================

function exportBackupJSON() {
  const payload = {
    app: 'AD Mídia Hub',
    version: 3,
    exportedAt: new Date().toISOString(),
    roles: state.roles,
    members: state.members,
    schedules: state.schedules
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ad-midia-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Backup completo exportado com sucesso!', 'emerald');
}

function triggerImportBackup() {
  const input = document.getElementById('backup-json-input');
  if (input) {
    input.value = '';
    input.click();
  }
}

function handleImportBackupJSON(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      if (!Array.isArray(data.members) || !Array.isArray(data.schedules)) {
        throw new Error('Formato de backup inválido.');
      }
      if (Array.isArray(data.roles) && data.roles.length > 0) state.roles = data.roles;
      state.members = data.members;
      state.schedules = data.schedules;
      state.selectedScheduleId = state.schedules[0]?.id || null;
      saveData();
      renderApp();
      showToast('Backup restaurado com sucesso!', 'emerald');
    } catch (err) {
      showToast('Arquivo JSON inválido ou corrompido.', 'rose');
    }
  };
  reader.readAsText(file);
}

function formatDateBR(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  const dateObj = new Date(Number(y), Number(m) - 1, Number(d));
  const weekdays = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return {
    day: d,
    month: months[Number(m) - 1],
    year: y,
    weekday: weekdays[dateObj.getDay()],
    full: `${weekdays[dateObj.getDay()]}, ${d} de ${months[Number(m) - 1]}`
  };
}

// ============================================================================
// MOTOR DE GAMIFICAÇÃO & RANKING DE PARTICIPAÇÃO (XP ZERADO INICIAL)
// ============================================================================

function getMemberGamificationStats(memberId) {
  const member = getMemberById(memberId);
  if (!member) return null;

  let currentScheduled = 0;
  let currentConfirmed = 0;
  let swapsRequested = 0;

  state.schedules.forEach(s => {
    s.assignments.forEach(a => {
      if (a.memberId === memberId) {
        currentScheduled++;
        if (a.status === 'confirmed') currentConfirmed++;
        if (a.status === 'swap_requested') swapsRequested++;
      }
    });
  });

  const qrCount = Array.isArray(member.attendanceLogs) ? member.attendanceLogs.length : 0;
  const historyCount = member.historyParticipations || 0;
  const totalParticipations = historyCount + currentConfirmed + qrCount;
  const starRating = typeof member.starRating === 'number' ? member.starRating : 0;
  const xp = Math.max(
    0,
    historyCount * 100 +
      currentConfirmed * 120 +
      qrCount * 150 +
      starRating * 30 +
      (member.bonusXp || 0) -
      swapsRequested * 30
  );

  let badge = { title: 'Iniciante (0 XP)', icon: 'award', color: 'text-slate-300 bg-slate-800 border-slate-700' };
  if (xp >= 1500) {
    badge = { title: 'Lenda do Broadcast AD', icon: 'crown', color: 'text-amber-300 bg-amber-500/20 border-amber-500/40' };
  } else if (xp >= 900) {
    badge = { title: 'Guardião da Transmissão', icon: 'flame', color: 'text-orange-300 bg-orange-500/20 border-orange-500/40' };
  } else if (xp >= 400) {
    badge = { title: 'Especialista Master', icon: 'zap', color: 'text-fuchsia-300 bg-fuchsia-500/20 border-fuchsia-500/40' };
  } else if (xp > 0) {
    badge = { title: 'Operador Fiel', icon: 'award', color: 'text-cyan-300 bg-cyan-500/15 border-cyan-500/30' };
  }

  return {
    member,
    qrCount,
    historyCount,
    currentScheduled,
    currentConfirmed,
    totalParticipations,
    xp,
    badge
  };
}

function resetAllMembersXP() {
  const logged = getLoggedInUser();
  if (!isPrivilegedUser(logged)) {
    showToast('Apenas a liderança pode zerar os XPs da equipe.', 'rose');
    return;
  }
  if (!confirm('Deseja zerar o XP, estrelas e histórico de frequência de todos os usuários cadastrados?')) return;
  state.members.forEach(m => {
    m.historyParticipations = 0;
    m.bonusXp = 0;
    m.starRating = 0;
    m.validatedBy = '';
    m.attendanceLogs = [];
  });
  saveData();
  renderApp();
  showToast('Todos os XPs dos usuários foram zerados (0 XP)!', 'cyan');
}

// ============================================================================
// CONTROLE DE FREQUÊNCIA POR QR CODE & MODAL DE AVALIAÇÃO
// ============================================================================

function getQrCodeImageUrl(token, size = 280) {
  const safeToken = (token || 'ADMIDIA-VOLUNTARIO').trim();
  // Fundo branco (#ffffff) e padrão preto (#000000) de alto contraste garantem leitura óptica instantânea em qualquer câmera ou tela
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&bgcolor=ffffff&color=000000&margin=8&qzone=2&data=${encodeURIComponent(safeToken)}`;
}

function openQrModal(memberId) {
  const member = getMemberById(memberId);
  if (!member) return;
  const modal = document.getElementById('modal-qr');
  if (!modal) return;

  modal.dataset.memberId = member.id;
  document.getElementById('qr-member-name').textContent = member.name;
  document.getElementById('qr-member-role').textContent = member.title || getRoleTypeLabel(member.roleType);
  const detailsEl = document.getElementById('qr-member-details');
  if (detailsEl) {
    const cong = member.congregation ? `⛪ ${member.congregation}` : '⛪ Sede';
    const card = member.memberCardNumber ? ` • 💳 Cartão: ${member.memberCardNumber}` : '';
    detailsEl.textContent = `${cong}${card}`;
  }
  document.getElementById('qr-member-token').textContent = member.qrToken;
  document.getElementById('qr-code-img').src = getQrCodeImageUrl(member.qrToken, 260);
  modal.classList.remove('hidden');
}

function closeQrModal() {
  document.getElementById('modal-qr')?.classList.add('hidden');
}

function printMemberBadge() {
  const modal = document.getElementById('modal-qr');
  const memberId = modal?.dataset?.memberId || state.activeMemberId;
  const member = getMemberById(memberId) || getLoggedInUser();
  if (!member) return;

  const qrUrl = getQrCodeImageUrl(member.qrToken, 300);
  const roleLabel = getRoleTypeLabel(member.roleType);
  const skillsList = (member.skills || []).map(sId => getRoleById(sId).shortName).join(' • ');
  const congLabel = member.congregation || 'Sede (Templo Central)';
  const cardLabel = member.memberCardNumber ? `Nº ${member.memberCardNumber}` : 'Membro AD';

  const printWin = window.open('', '_blank', 'width=480,height=720');
  if (!printWin) {
    showToast('Permita pop-ups no navegador para imprimir o crachá.', 'amber');
    return;
  }

  printWin.document.write(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <title>Crachá Oficial — ${escapeHTML(member.name)}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@500;700;800&display=swap');
        body {
          margin: 0;
          padding: 24px;
          background: #0f172a;
          font-family: 'Outfit', sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          color: #f8fafc;
        }
        .badge-card {
          width: 320px;
          border-radius: 24px;
          background: linear-gradient(160deg, #070b19 0%, #0f172a 60%, #1e1b4b 100%);
          border: 2px solid #38bdf8;
          padding: 24px 20px;
          text-align: center;
          box-shadow: 0 20px 50px rgba(0,0,0,0.6);
          position: relative;
        }
        .lanyard-slot {
          width: 64px;
          height: 10px;
          border-radius: 99px;
          background: #020617;
          border: 1px solid #334155;
          margin: 0 auto 16px auto;
        }
        .church-tag {
          display: inline-block;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #fbbf24;
          background: rgba(245, 158, 11, 0.15);
          border: 1px solid rgba(245, 158, 11, 0.4);
          padding: 4px 12px;
          border-radius: 99px;
        }
        .brand {
          font-size: 22px;
          font-weight: 800;
          margin: 8px 0 2px 0;
          color: #ffffff;
        }
        .avatar {
          width: 84px;
          height: 84px;
          border-radius: 20px;
          margin: 14px auto 10px auto;
          object-fit: cover;
          border: 2px solid #38bdf8;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #1e293b;
          font-size: 28px;
          font-weight: 800;
          color: #38bdf8;
        }
        .member-name {
          font-size: 20px;
          font-weight: 800;
          margin: 4px 0;
          color: #ffffff;
        }
        .member-role {
          font-size: 12px;
          font-weight: 700;
          color: #38bdf8;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .skills {
          font-size: 11px;
          color: #94a3b8;
          margin-top: 6px;
        }
        .qr-box {
          margin: 16px auto 10px auto;
          padding: 10px;
          background: #070b19;
          border: 1px solid rgba(56, 189, 248, 0.4);
          border-radius: 18px;
          display: inline-block;
        }
        .qr-box img {
          width: 150px;
          height: 150px;
          display: block;
        }
        .token {
          font-family: monospace;
          font-size: 11px;
          color: #34d399;
          letter-spacing: 1px;
        }
        .print-btn {
          margin-top: 20px;
          padding: 10px 24px;
          border-radius: 12px;
          background: #38bdf8;
          color: #020617;
          font-weight: 800;
          border: none;
          cursor: pointer;
        }
        @media print {
          body { background: #fff; padding: 0; }
          .print-btn { display: none; }
          .badge-card { box-shadow: none; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      </style>
    </head>
    <body>
      <div class="badge-card">
        <div class="lanyard-slot"></div>
        <span class="church-tag">Assembleia de Deus</span>
        <div class="brand">AD MÍDIA HUB</div>
        ${member.photoUrl
          ? `<img class="avatar" src="${member.photoUrl}" alt="${escapeHTML(member.name)}" />`
          : `<div class="avatar">${getInitials(member.name)}</div>`
        }
        <div class="member-name">${escapeHTML(member.name)}</div>
        <div class="member-role">${escapeHTML(roleLabel)}</div>
        <div style="font-size: 11px; color: #38bdf8; margin-top: 4px; font-weight: 600;">⛪ ${escapeHTML(congLabel)} • 💳 ${escapeHTML(cardLabel)}</div>
        <div class="skills">${escapeHTML(skillsList)}</div>
        <div class="qr-box">
          <img src="${qrUrl}" alt="QR Code" onload="setTimeout(() => window.print(), 400)" />
        </div>
        <div class="token">${escapeHTML(member.qrToken)}</div>
      </div>
      <button class="print-btn" onclick="window.print()">🖨️ Imprimir / Salvar PDF</button>
    </body>
    </html>
  `);
  printWin.document.close();
}

function downloadMemberQrBadgeImage(targetMemberId = null) {
  const modal = document.getElementById('modal-qr');
  const memberId = targetMemberId || modal?.dataset?.memberId || state.activeMemberId;
  const member = getMemberById(memberId) || getLoggedInUser();
  if (!member) {
    showToast('Voluntário não encontrado.', 'rose');
    return;
  }

  showToast(`Gerando credencial digital de ${member.name}...`, 'cyan');

  const canvas = document.createElement('canvas');
  canvas.width = 700;
  canvas.height = 960;
  const ctx = canvas.getContext('2d');

  // Background Gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, 960);
  bgGrad.addColorStop(0, '#040714');
  bgGrad.addColorStop(0.5, '#0b132b');
  bgGrad.addColorStop(1, '#02050f');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, 700, 960);

  // Outer border & Glow
  ctx.strokeStyle = '#0284c7';
  ctx.lineWidth = 6;
  ctx.strokeRect(18, 18, 664, 924);

  ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
  ctx.lineWidth = 2;
  ctx.strokeRect(28, 28, 644, 904);

  // Header Church Banner
  ctx.fillStyle = '#f59e0b';
  ctx.font = 'bold 20px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ASSEMBLEIA DE DEUS — IMPERATRIZ', 350, 78);

  ctx.fillStyle = '#38bdf8';
  ctx.font = '800 14px Arial, sans-serif';
  ctx.fillText('DEPARTAMENTO DE MÍDIA & COMUNICAÇÃO', 350, 106);

  // Line
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(60, 126);
  ctx.lineTo(640, 126);
  ctx.stroke();

  // Name
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 30px Arial, sans-serif';
  ctx.fillText(member.name.toUpperCase(), 350, 175);

  // Role
  ctx.fillStyle = '#7dd3fc';
  ctx.font = 'bold 16px Arial, sans-serif';
  ctx.fillText((member.title || getRoleTypeLabel(member.roleType)).toUpperCase(), 350, 206);

  // Level & XP
  const lvl = Math.floor((member.xp || 0) / 300) + 1;
  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 14px Arial, sans-serif';
  ctx.fillText(`NÍVEL ${lvl} • ${member.xp || 0} XP • AVALIAÇÃO: ★ ${(member.starRating || 0).toFixed(1)}/10`, 350, 238);

  // QR Container (Pure White Box)
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(160, 275, 380, 380, 28);
  ctx.fill();

  // Draw QR Image
  const qrImg = new Image();
  qrImg.crossOrigin = 'anonymous';
  qrImg.onload = function() {
    ctx.drawImage(qrImg, 185, 300, 330, 330);

    // Token Badge
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.roundRect(110, 685, 480, 64, 18);
    ctx.fill();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#34d399';
    ctx.font = 'bold 22px monospace';
    ctx.fillText(member.qrToken || 'ADMIDIA', 350, 725);

    // Instructions
    ctx.fillStyle = '#94a3b8';
    ctx.font = '14px Arial, sans-serif';
    ctx.fillText('Apresente este QR Code na chegada ao culto para registrar presença.', 350, 785);

    // Footer
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 13px Arial, sans-serif';
    ctx.fillText('CREDENCIAL DIGITAL OFICIAL • AD MÍDIA HUB', 350, 845);

    ctx.fillStyle = '#64748b';
    ctx.font = '11px Arial, sans-serif';
    ctx.fillText(`Validação Oficial da Direção • Gerado em ${new Date().toLocaleDateString('pt-BR')}`, 350, 875);

    // Download
    const dataUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    const safeSlug = member.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    a.download = `credencial-qr-${safeSlug}.png`;
    a.href = dataUrl;
    a.click();
    showToast(`✅ Credencial QR de ${member.name} salva na galeria (PNG)!`, 'emerald');
  };

  qrImg.onerror = function() {
    showToast('Falha temporária ao carregar imagem do QR Code. Tente novamente em instantes.', 'rose');
  };

  qrImg.src = getQrCodeImageUrl(member.qrToken, 330);
}

// ============================================================================
// FUNÇÕES VOLUTS / MYKIDS: INDISPONIBILIDADE DE DATAS, BOLSA DE SUBSTITUIÇÃO & CHECKLIST
// ============================================================================

const ROLE_CHECKLIST_ITEMS = {
  default: [
    { id: 'chk_arrival', label: 'Chegada no Call Time + Briefing e Oração' },
    { id: 'chk_gear', label: 'Equipamento, cabos e baterias 100% testados' },
    { id: 'chk_intercom', label: 'Rádio Intercom / Comunicação posicionada' },
    { id: 'chk_storage', label: 'Arquivos entregues / Equipamento guardado pós-culto' }
  ]
};

function isMemberBlockedOnDate(member, dateStr) {
  if (!member || !dateStr || !Array.isArray(member.blockedDates)) return null;
  return member.blockedDates.find(b => b.date === dateStr) || null;
}

function handleAddBlockedDate(e, memberId) {
  e.preventDefault();
  const member = getMemberById(memberId);
  if (!member) return;

  const dateInput = document.getElementById('block-date-input');
  const reasonInput = document.getElementById('block-reason-input');
  const dateVal = dateInput?.value || '';
  const reasonVal = (reasonInput?.value || '').trim() || 'Compromisso pessoal';

  if (!dateVal) {
    showToast('Selecione a data em que você não poderá servir.', 'rose');
    return;
  }

  if (!Array.isArray(member.blockedDates)) member.blockedDates = [];
  if (member.blockedDates.some(b => b.date === dateVal)) {
    showToast('Esta data já está registrada na sua lista de indisponibilidade.', 'amber');
    return;
  }

  member.blockedDates.push({
    id: 'blk_' + Date.now(),
    date: dateVal,
    reason: reasonVal
  });
  member.blockedDates.sort((a, b) => a.date.localeCompare(b.date));

  saveData();
  renderApp();
  showToast(`Indisponibilidade registrada para ${formatDateBR(dateVal).full}! O Diretor será avisado na escala.`, 'cyan');
}

function removeBlockedDate(memberId, blockId) {
  const member = getMemberById(memberId);
  if (!member || !Array.isArray(member.blockedDates)) return;
  member.blockedDates = member.blockedDates.filter(b => b.id !== blockId);
  saveData();
  renderApp();
  showToast('Data liberada novamente para escalas!', 'emerald');
}

function takeOverSwapAssignment(scheduleId, roleId) {
  const logged = getLoggedInUser();
  if (!logged) return;
  const sched = state.schedules.find(s => s.id === scheduleId);
  if (!sched) return;
  const assign = sched.assignments.find(a => a.roleId === roleId);
  if (!assign || assign.status !== 'swap_requested') return;

  const previousMember = getMemberById(assign.memberId);
  const role = getRoleById(roleId);

  if (!logged.skills.includes(roleId) && !isPrivilegedUser(logged)) {
    showToast(`Você precisa estar habilitado na função "${role.shortName}" para assumir esta vaga.`, 'rose');
    return;
  }

  const blocked = isMemberBlockedOnDate(logged, sched.date);
  if (blocked) {
    showToast(`Você marcou indisponibilidade nesta data (${blocked.reason}). Remova o bloqueio primeiro.`, 'rose');
    return;
  }

  assign.memberId = logged.id;
  assign.status = 'confirmed';
  delete assign.swapNote;

  // Award +50 Bonus XP for covering a teammate!
  logged.bonusXp = (logged.bonusXp || 0) + 50;

  saveData();
  renderApp();
  showToast(`🎉 Você assumiu a vaga de ${previousMember?.name || 'colega'} em "${role.shortName}" e ganhou +50 XP Bônus!`, 'emerald');
}

function toggleChecklistItem(scheduleId, roleId, checkId) {
  const sched = state.schedules.find(s => s.id === scheduleId);
  if (!sched) return;
  const assign = sched.assignments.find(a => a.roleId === roleId);
  if (!assign) return;

  if (!Array.isArray(assign.checkedItems)) assign.checkedItems = [];
  if (assign.checkedItems.includes(checkId)) {
    assign.checkedItems = assign.checkedItems.filter(id => id !== checkId);
  } else {
    assign.checkedItems.push(checkId);
  }

  saveData();
  renderApp();
}

function openEvaluationModal(memberId) {
  const logged = getLoggedInUser();
  if (!isPrivilegedUser(logged)) {
    showToast('Apenas o Diretor Geral, Líder ou Desenvolvedor podem avaliar voluntários.', 'rose');
    return;
  }
  const member = getMemberById(memberId);
  if (!member) return;
  const modal = document.getElementById('modal-evaluate');
  if (!modal) return;

  document.getElementById('eval-member-id').value = member.id;
  document.getElementById('eval-member-name').textContent = member.name;
  document.getElementById('eval-member-title').textContent = member.title;
  const currentScore = typeof member.starRating === 'number' ? member.starRating : 0;
  document.getElementById('eval-score-input').value = String(currentScore);
  renderEvalStarsPreview(currentScore);
  modal.classList.remove('hidden');
}

function closeEvaluationModal() {
  document.getElementById('modal-evaluate')?.classList.add('hidden');
}

function renderEvalStarsPreview(score) {
  const num = Number(score) || 0;
  const container = document.getElementById('eval-stars-interactive');
  const label = document.getElementById('eval-score-label');
  if (label) label.textContent = `★ ${num} / 10`;
  const scoreInput = document.getElementById('eval-score-input');
  if (scoreInput) scoreInput.value = String(num);

  if (!container) return;
  container.innerHTML = Array.from({ length: 11 }, (_, i) => i).map(val => {
    const active = val <= num && val > 0;
    return `
      <button
        type="button"
        onclick="renderEvalStarsPreview(${val})"
        class="h-10 rounded-xl font-display font-extrabold text-xs border transition flex items-center justify-center ${
          val === num
            ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-lg glow-gold scale-105'
            : active
            ? 'bg-amber-500/25 text-amber-200 border-amber-500/40'
            : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-amber-400/50'
        }">
        ${val}
      </button>
    `;
  }).join('');
}

function handleSaveEvaluation(e) {
  e.preventDefault();
  const memberId = document.getElementById('eval-member-id').value;
  const score = Number(document.getElementById('eval-score-input').value || 0);
  setMemberStarRating(memberId, score);
  closeEvaluationModal();
}

let html5QrScanner = null;

function playBeepSuccess() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const audioCtx = new AudioContextClass();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 (880Hz)
    osc.frequency.setValueAtTime(1318.5, audioCtx.currentTime + 0.08); // E6 (1318.5Hz)

    gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.25);
  } catch (e) {
    // Ignore audio autoplay restrictions
  }
}

function triggerHapticFeedback() {
  try {
    if (navigator.vibrate) {
      navigator.vibrate([70, 40, 70]);
    }
  } catch (e) {
    // Ignore
  }
}

let scanModalHtml5Qr = null;
let lastScannedToken = null;
let lastScannedTime = 0;

function openScanAttendanceModal(preselectedScheduleId = null) {
  const logged = getEffectiveUser();
  if (!canMarkAttendanceUser(logged)) {
    showToast('Apenas o Diretor Lucas Henrique, Desenvolvedor Fernando ou líderes autorizados podem registrar presença.', 'rose');
    return;
  }

  const modal = document.getElementById('modal-scan-attendance');
  if (!modal) return;
  modal.classList.remove('hidden');

  // Populate schedule selector
  const schedSelect = document.getElementById('scan-modal-schedule-select');
  if (schedSelect) {
    if (state.schedules.length === 0) {
      schedSelect.innerHTML = '<option value="">-- Nenhum culto cadastrado ainda --</option>';
    } else {
      const todayStr = new Date().toISOString().split('T')[0];
      schedSelect.innerHTML = state.schedules.map(s => {
        const isToday = s.date === todayStr;
        const isSelected = preselectedScheduleId
          ? s.id === preselectedScheduleId
          : (s.id === state.selectedScheduleId || isToday);
        return `<option value="${s.id}" ${isSelected ? 'selected' : ''}>${escapeHTML(s.title)} — ${s.date} (${s.startTime})</option>`;
      }).join('');
    }
  }

  // Render recent check-ins for the selected schedule
  dismissScanFeedbackCard();
  updateScanModalRecentList();

  // Start the camera automatically
  setTimeout(startScanModalCamera, 200);
}

function closeScanAttendanceModal() {
  stopScanModalCamera();
  dismissScanFeedbackCard();
  document.getElementById('modal-scan-attendance')?.classList.add('hidden');
}

function handleScanModalScheduleChange() {
  updateScanModalRecentList();
}

let currentScanFacingMode = 'environment';

function toggleScanModalCameraFacing() {
  currentScanFacingMode = currentScanFacingMode === 'environment' ? 'user' : 'environment';
  restartScanModalCamera();
  showToast(currentScanFacingMode === 'environment' ? '📷 Câmera Traseira ativada' : '🤳 Câmera Frontal ativada', 'cyan');
}

function handleScanQrFileSelected(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  if (!window.Html5Qrcode) {
    showToast('Biblioteca de QR Code indisponível.', 'amber');
    return;
  }

  showToast('Analisando foto do QR Code...', 'cyan');
  const tempScanner = new window.Html5Qrcode('scan-modal-camera-viewport');
  tempScanner.scanFile(file, true)
    .then(decodedText => {
      const schedId = document.getElementById('scan-modal-schedule-select')?.value;
      handleAttendanceScanResult(decodedText, schedId);
    })
    .catch(() => {
      showToast('Nenhum QR Code detectado na foto. Tente aproximar ou use a lista manual.', 'rose');
    })
    .finally(() => {
      event.target.value = '';
    });
}

function restartScanModalCamera() {
  stopScanModalCamera();
  setTimeout(startScanModalCamera, 300);
}

function startScanModalCamera() {
  const readerDiv = document.getElementById('scan-modal-camera-viewport');
  if (!readerDiv) return;

  if (!window.Html5Qrcode) {
    setTimeout(startScanModalCamera, 800);
    return;
  }

  try {
    if (scanModalHtml5Qr) {
      scanModalHtml5Qr.stop().then(() => {
        scanModalHtml5Qr.clear();
        scanModalHtml5Qr = null;
        startScanModalCameraInstance();
      }).catch(() => {
        scanModalHtml5Qr = null;
        startScanModalCameraInstance();
      });
      return;
    }
  } catch (e) {
    scanModalHtml5Qr = null;
  }

  startScanModalCameraInstance();
}

function startScanModalCameraInstance() {
  try {
    const readerDiv = document.getElementById('scan-modal-camera-viewport');
    if (!readerDiv) return;

    scanModalHtml5Qr = new window.Html5Qrcode('scan-modal-camera-viewport');

    const scanConfig = {
      fps: 20,
      aspectRatio: 1.0,
      disableFlip: false,
      qrbox: (viewfinderWidth, viewfinderHeight) => {
        const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
        const boxSize = Math.max(Math.floor(minEdge * 0.85), 180);
        return { width: boxSize, height: boxSize };
      },
      experimentalFeatures: {
        useBarCodeDetectorIfSupported: true
      }
    };

    const onSuccess = decodedText => {
      const now = Date.now();
      if (decodedText === lastScannedToken && now - lastScannedTime < 2500) {
        return;
      }
      lastScannedToken = decodedText;
      lastScannedTime = now;

      // Efeito visual de flash na câmera indicando leitura imediata
      const viewport = document.getElementById('scan-modal-camera-viewport');
      if (viewport) {
        viewport.classList.add('ring-4', 'ring-emerald-400');
        setTimeout(() => viewport.classList.remove('ring-4', 'ring-emerald-400'), 600);
      }

      const schedId = document.getElementById('scan-modal-schedule-select')?.value;
      handleAttendanceScanResult(decodedText, schedId);
    };

    scanModalHtml5Qr.start(
      { facingMode: currentScanFacingMode },
      scanConfig,
      onSuccess,
      () => {}
    ).catch(() => {
      if (!scanModalHtml5Qr) return;
      scanModalHtml5Qr.start(
        {},
        scanConfig,
        onSuccess,
        () => {}
      ).catch(() => {
        showToast('Permissão de câmera não concedida. Use a chamada rápida em 1 toque abaixo.', 'amber');
      });
    });
  } catch (err) {
    console.warn('Erro ao inicializar leitor QR:', err);
  }
}

function stopScanModalCamera() {
  if (scanModalHtml5Qr) {
    try {
      scanModalHtml5Qr.stop().then(() => {
        scanModalHtml5Qr.clear();
        scanModalHtml5Qr = null;
      }).catch(() => {
        scanModalHtml5Qr = null;
      });
    } catch (e) {
      scanModalHtml5Qr = null;
    }
  }
}

function handleScanModalManualSubmit(e) {
  e.preventDefault();
  const input = document.getElementById('scan-modal-manual-input');
  if (!input) return;
  const schedId = document.getElementById('scan-modal-schedule-select')?.value;
  handleAttendanceScanResult(input.value, schedId);
  input.value = '';
}

function updateScanModalRecentList() {
  const container = document.getElementById('scan-modal-recent-list');
  const pendingContainer = document.getElementById('scan-modal-pending-list');
  const countBadge = document.getElementById('scan-modal-count-badge');
  if (!container) return;

  const schedId = document.getElementById('scan-modal-schedule-select')?.value;
  const sched = state.schedules.find(s => s.id === schedId);

  if (!sched) {
    container.innerHTML = '<p class="text-[11px] text-slate-500 italic py-2 text-center">Nenhum culto selecionado.</p>';
    if (countBadge) countBadge.textContent = '0 presentes';
    if (pendingContainer) pendingContainer.innerHTML = '';
    return;
  }

  const attendees = [];
  state.members.forEach(m => {
    const log = (m.attendanceLogs || []).find(l => l.scheduleId === sched.id);
    if (log) {
      attendees.push({ member: m, log });
    }
  });

  attendees.sort((a, b) => (b.log.time || '').localeCompare(a.log.time || ''));

  if (countBadge) {
    countBadge.textContent = `${attendees.length} presente(s)`;
  }

  // 1. Lista de Presenças Já Confirmadas
  if (attendees.length === 0) {
    container.innerHTML = `
      <p class="text-[11px] text-slate-500 italic py-2 text-center">
        Nenhuma presença registrada ainda neste culto. Aponte a câmera para os QR Codes ou toque na lista acima!
      </p>
    `;
  } else {
    container.innerHTML = attendees.map(({ member, log }) => `
      <div class="p-2 rounded-xl bg-slate-900/90 border border-emerald-500/30 flex items-center justify-between gap-2">
        <div class="flex items-center gap-2 min-w-0">
          ${renderMemberAvatar(member, 'w-8 h-8 rounded-lg text-xs', false)}
          <div class="min-w-0">
            <h5 class="text-xs font-bold text-white truncate">${escapeHTML(member.name)}</h5>
            <span class="text-[10px] text-emerald-300 font-mono block">✓ Presente às ${escapeHTML(log.time)} • ${escapeHTML(member.title)}</span>
          </div>
        </div>
        <span class="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shrink-0">
          ✓ Confirmado (+150 XP)
        </span>
      </div>
    `).join('');
  }

  // 2. Chamada Rápida dos Voluntários Escalados Pendentes (Confirmação em 1 Toque)
  if (pendingContainer) {
    const assignedMemberIds = sched.assignments.map(a => a.memberId);
    const pendingAssigned = state.members.filter(m => 
      assignedMemberIds.includes(m.id) && !attendees.some(att => att.member.id === m.id)
    );

    if (pendingAssigned.length === 0) {
      pendingContainer.innerHTML = `
        <div class="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-center">
          <span class="text-xs font-bold text-emerald-300">🎉 Todos os ${assignedMemberIds.length} voluntários escalados já confirmaram presença!</span>
        </div>
      `;
    } else {
      pendingContainer.innerHTML = pendingAssigned.map(m => {
        const assign = sched.assignments.find(a => a.memberId === m.id);
        const role = assign ? getRoleById(assign.roleId) : null;
        return `
          <div class="p-2 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-cyan-500/40 flex items-center justify-between gap-2 transition">
            <div class="flex items-center gap-2 min-w-0">
              ${renderMemberAvatar(m, 'w-8 h-8 rounded-lg text-xs', false)}
              <div class="min-w-0">
                <h5 class="text-xs font-bold text-slate-100 truncate">${escapeHTML(m.name)}</h5>
                <span class="text-[10px] text-cyan-300 font-medium block truncate">${role?.name || m.title}</span>
              </div>
            </div>
            <button
              type="button"
              onclick="handleAttendanceScanResult('${m.id}', '${sched.id}')"
              class="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:brightness-110 active:scale-95 text-slate-950 font-extrabold text-[11px] shrink-0 shadow flex items-center gap-1 transition">
              <i data-lucide="check" class="w-3.5 h-3.5"></i>
              <span>Marcar Presença</span>
            </button>
          </div>
        `;
      }).join('');
    }
  }

  if (window.lucide) window.lucide.createIcons();
}

function normalizeStr(str) {
  if (!str) return '';
  return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function findMemberByScannedData(rawToken) {
  if (!rawToken) return null;
  let str = String(rawToken).trim();
  if (!str) return null;

  // 1. JSON string parsing
  if (str.startsWith('{') && str.endsWith('}')) {
    try {
      const parsed = JSON.parse(str);
      const subCandidate = parsed.qrToken || parsed.token || parsed.id || parsed.memberId || parsed.email || parsed.name;
      if (subCandidate) {
        const found = findMemberByScannedData(subCandidate);
        if (found) return found;
      }
    } catch (_) {}
  }

  // 2. URL parsing or parameter extraction
  if (str.includes('http://') || str.includes('https://') || str.includes('?')) {
    try {
      const url = new URL(str.startsWith('http') ? str : 'https://temp.org/' + str);
      const dataParam = url.searchParams.get('data') || url.searchParams.get('token') || url.searchParams.get('id') || url.searchParams.get('user');
      if (dataParam) {
        const found = findMemberByScannedData(dataParam);
        if (found) return found;
      }
    } catch (_) {}
    const urlTokenMatch = str.match(/ADMIDIA-[A-Z0-9_-]+/i);
    if (urlTokenMatch) {
      str = urlTokenMatch[0];
    }
  }

  const clean = str.toUpperCase().trim();

  // 3. Exact match by qrToken
  const byExactQr = state.members.find(m => (m.qrToken || '').toUpperCase().trim() === clean);
  if (byExactQr) return byExactQr;

  // 4. Exact match by id (e.g. "m1", "m2", "m3", "m_1794887126238")
  const byExactId = state.members.find(m => (m.id || '').toUpperCase().trim() === clean);
  if (byExactId) return byExactId;

  // 5. Token format: ADMIDIA-{ID}-{SLUG} -> Extract exact candidate ID!
  // Example: ADMIDIA-M1-FERNANDO -> ID = 'm1'
  // Example: ADMIDIA-M14-ROMULO -> ID = 'm14'
  // Example: ADMIDIA-M24-MYRELLE -> ID = 'm24'
  // Example: ADMIDIA-M_1794887126238-FERNANDOTE -> ID = 'm_1794887126238'
  const idMatch = clean.match(/^ADMIDIA-([A-Z0-9_]+?)(?:-[A-Z0-9]+)?$/i);
  if (idMatch && idMatch[1]) {
    const candidateId = idMatch[1].toLowerCase();
    const byExtractedId = state.members.find(m => (m.id || '').toLowerCase() === candidateId);
    if (byExtractedId) return byExtractedId;
  }

  // 6. Generic ADMIDIA token match
  const genericMatch = clean.match(/ADMIDIA-([A-Z0-9_]+)/i);
  if (genericMatch && genericMatch[1]) {
    const candidateId = genericMatch[1].toLowerCase();
    const byCandidateId = state.members.find(m => (m.id || '').toLowerCase() === candidateId);
    if (byCandidateId) return byCandidateId;
  }

  // 7. Exact match by email or secondaryEmails
  const cleanLower = str.toLowerCase().trim();
  const byEmail = state.members.find(m => {
    const em = (m.email || '').toLowerCase().trim();
    if (em && em === cleanLower) return true;
    if (Array.isArray(m.secondaryEmails) && m.secondaryEmails.map(x => x.toLowerCase().trim()).includes(cleanLower)) return true;
    return false;
  });
  if (byEmail) return byEmail;

  // 8. Exact match by full name (normalized without accents)
  const normClean = normalizeStr(cleanLower);
  const byName = state.members.find(m => {
    const nm = normalizeStr((m.name || '').toLowerCase().trim());
    return nm && (nm === normClean || (normClean.length >= 6 && (nm.includes(normClean) || normClean.includes(nm))));
  });
  if (byName) return byName;

  // 9. Match against window.INITIAL_MEMBERS as fallback reference
  if (Array.isArray(window.INITIAL_MEMBERS)) {
    const initFound = window.INITIAL_MEMBERS.find(im => {
      const q = (im.qrToken || '').toUpperCase().trim();
      const id = (im.id || '').toUpperCase().trim();
      const em = (im.email || '').toUpperCase().trim();
      return q === clean || id === clean || (idMatch && idMatch[1] && id.toLowerCase() === idMatch[1].toLowerCase()) || (em && em === cleanLower);
    });
    if (initFound) {
      const inState = state.members.find(m => m.id === initFound.id || (m.name && m.name.toLowerCase().trim() === initFound.name.toLowerCase().trim()));
      if (inState) return inState;
    }
  }

  return null;
}

function dismissScanFeedbackCard() {
  const card = document.getElementById('scan-modal-feedback-card');
  if (card) {
    card.classList.add('hidden');
    card.innerHTML = '';
  }
}

function showScanFeedbackCard(type, member, rawCode) {
  const card = document.getElementById('scan-modal-feedback-card');
  if (!card) return;

  const targetSchedId = document.getElementById('scan-modal-schedule-select')?.value || state.selectedScheduleId;
  const targetSched = state.schedules.find(s => s.id === targetSchedId);
  const schedTitle = targetSched?.title || 'Culto do Dia';

  if (type === 'success' && member) {
    const role = (member.skills && member.skills[0]) ? getRoleById(member.skills[0]) : null;
    const roleLabel = role?.name || member.title || getRoleTypeLabel(member.roleType);
    card.innerHTML = `
      <div class="p-4 rounded-2xl bg-emerald-500/20 border-2 border-emerald-400 shadow-2xl glow-emerald flex items-center justify-between gap-3 animate-view">
        <div class="flex items-center gap-3.5 min-w-0">
          ${renderMemberAvatar(member, 'w-14 h-14 rounded-2xl text-base border-2 border-emerald-300 shrink-0 shadow-lg', false)}
          <div class="min-w-0">
            <div class="flex items-center gap-1.5 flex-wrap">
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-400 text-slate-950">✓ Presença Confirmada</span>
              <span class="text-[11px] text-emerald-300 font-extrabold">+150 XP</span>
            </div>
            <h4 class="text-base sm:text-lg font-black text-white truncate mt-0.5">${escapeHTML(member.name)}</h4>
            <p class="text-xs text-cyan-200 font-medium truncate">${escapeHTML(roleLabel)} • ${escapeHTML(member.congregation || 'Assembleia de Deus')}</p>
            <span class="text-[10px] text-slate-300 block mt-0.5 font-mono">Às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • ${escapeHTML(schedTitle)}</span>
          </div>
        </div>
        <button
          type="button"
          onclick="dismissScanFeedbackCard()"
          title="Fechar aviso"
          class="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-emerald-300 hover:text-white shrink-0 border border-emerald-500/40 transition">
          <i data-lucide="check" class="w-5 h-5"></i>
        </button>
      </div>
    `;
  } else if (type === 'already_logged' && member) {
    card.innerHTML = `
      <div class="p-4 rounded-2xl bg-amber-500/20 border-2 border-amber-400 shadow-2xl flex items-center justify-between gap-3 animate-view">
        <div class="flex items-center gap-3.5 min-w-0">
          ${renderMemberAvatar(member, 'w-14 h-14 rounded-2xl text-base border-2 border-amber-300 shrink-0 shadow-lg', false)}
          <div class="min-w-0">
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950">⚠️ Já Confirmado</span>
            <h4 class="text-base sm:text-lg font-black text-white truncate mt-0.5">${escapeHTML(member.name)}</h4>
            <p class="text-xs text-amber-200">Presença já havia sido confirmada para "${escapeHTML(schedTitle)}".</p>
          </div>
        </div>
        <button
          type="button"
          onclick="dismissScanFeedbackCard()"
          title="Fechar aviso"
          class="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-amber-300 hover:text-white shrink-0 border border-amber-500/40 transition">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>
      </div>
    `;
  } else {
    card.innerHTML = `
      <div class="p-4 rounded-2xl bg-rose-500/20 border-2 border-rose-400 shadow-2xl flex items-center justify-between gap-3 animate-view">
        <div class="flex items-center gap-3.5 min-w-0">
          <div class="w-12 h-12 rounded-2xl bg-rose-500/30 border border-rose-400 flex items-center justify-center text-rose-300 shrink-0 shadow">
            <i data-lucide="alert-circle" class="w-6 h-6"></i>
          </div>
          <div class="min-w-0">
            <span class="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-500 text-white">Código Não Reconhecido</span>
            <h4 class="text-xs font-mono font-bold text-rose-200 truncate mt-1">"${escapeHTML(rawCode || '')}"</h4>
            <p class="text-[11px] text-slate-300">Nenhum voluntário encontrado para este QR Code. Use a chamada rápida abaixo para marcar em 1 toque.</p>
          </div>
        </div>
        <button
          type="button"
          onclick="dismissScanFeedbackCard()"
          title="Fechar aviso"
          class="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-rose-300 hover:text-white shrink-0 border border-rose-500/40 transition">
          <i data-lucide="x" class="w-5 h-5"></i>
        </button>
      </div>
    `;
  }

  card.classList.remove('hidden');
  if (window.lucide) window.lucide.createIcons();
  try {
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (_) {}
}

function handleAttendanceScanResult(rawToken, scheduleId = null) {
  const loggedLeader = getEffectiveUser();
  if (!canMarkAttendanceUser(loggedLeader)) {
    showToast('Apenas o Diretor Lucas Henrique, Desenvolvedor Fernando ou voluntários autorizados pela liderança podem registrar presença.', 'rose');
    return;
  }

  const rawClean = (rawToken || '').trim();
  if (!rawClean) {
    showToast('Código QR vazio ou inválido.', 'rose');
    return;
  }

  const targetSchedId = scheduleId || document.getElementById('scan-modal-schedule-select')?.value || document.getElementById('attendance-schedule-select')?.value || state.selectedScheduleId;
  const targetSched = state.schedules.find(s => s.id === targetSchedId);

  if (!targetSched) {
    showToast('Selecione obrigatoriamente o Culto / Evento do dia antes de marcar a frequência!', 'amber');
    return;
  }

  const member = findMemberByScannedData(rawClean);

  if (!member) {
    showScanFeedbackCard('not_found', null, rawClean);
    showToast(`Nenhum voluntário encontrado para o código: "${rawClean}"`, 'rose');
    return;
  }

  const eventLabel = `${targetSched.title} (${targetSched.date})`;

  if (!Array.isArray(member.attendanceLogs)) member.attendanceLogs = [];

  // Check if already checked in for this schedule
  const alreadyLogged = member.attendanceLogs.some(
    log => log.scheduleId === targetSched.id
  );

  if (alreadyLogged) {
    showScanFeedbackCard('already_logged', member, rawClean);
    showToast(`⚠️ ${member.name} já teve a presença confirmada para "${targetSched.title}"!`, 'amber');
    return;
  }

  const todayStr = targetSched.date || new Date().toISOString().split('T')[0];
  member.attendanceLogs.unshift({
    id: 'att_' + Date.now(),
    scheduleId: targetSched.id,
    eventTitle: eventLabel,
    date: todayStr,
    time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    verifiedBy: loggedLeader?.name || 'Direção'
  });

  // Also mark assignment confirmed if assigned in this schedule
  const assign = targetSched.assignments.find(a => a.memberId === member.id);
  if (assign) assign.status = 'confirmed';

  playBeepSuccess();
  triggerHapticFeedback();

  saveData();
  updateScanModalRecentList();
  renderApp();
  showScanFeedbackCard('success', member, rawClean);
  showToast(`✅ Presença confirmada: ${member.name} (+150 XP)`, 'emerald');
}

function markAttendanceByQrToken(rawToken, scheduleId = null) {
  handleAttendanceScanResult(rawToken, scheduleId);
}

function handleManualQrSubmit(e) {
  e.preventDefault();
  const loggedLeader = getEffectiveUser();
  if (!canMarkAttendanceUser(loggedLeader)) {
    showToast('Apenas usuários autorizados podem registrar presença.', 'rose');
    return;
  }
  const input = document.getElementById('manual-qr-token-input');
  if (!input) return;
  markAttendanceByQrToken(input.value);
  input.value = '';
}

function startCameraQrScanner() {
  const loggedLeader = getEffectiveUser();
  if (!canMarkAttendanceUser(loggedLeader)) {
    showToast('Apenas o Diretor Lucas Henrique, Desenvolvedor Fernando ou voluntários autorizados pela liderança podem abrir o scanner.', 'rose');
    return;
  }
  openScanAttendanceModal();
}

function stopCameraQrScanner() {
  if (html5QrScanner) {
    html5QrScanner.stop().then(() => {
      html5QrScanner.clear();
      html5QrScanner = null;
    }).catch(() => {});
  }
  document.getElementById('qr-camera-reader')?.classList.add('hidden');
}

function getRankingsList() {
  return state.members
    .map(m => getMemberGamificationStats(m.id))
    .filter(Boolean)
    .sort((a, b) => b.xp - a.xp || b.totalParticipations - a.totalParticipations);
}

function awardBonusParticipation(memberId, points = 100) {
  const member = getMemberById(memberId);
  if (!member) return;
  member.historyParticipations = (member.historyParticipations || 0) + 1;
  member.bonusXp = (member.bonusXp || 0) + points;
  saveData();
  renderApp();
  showToast(`+1 Participação e +${points} XP concedidos para ${member.name}!`, 'amber');
}

// ============================================================================
// MOTOR DE STORYBOARD (ROTEIRO DE CENAS & CÂMERAS DO CULTO)
// ============================================================================

function cycleStoryboardStatus(scheduleId, itemId) {
  const sched = state.schedules.find(s => s.id === scheduleId);
  if (!sched || !Array.isArray(sched.storyboard)) return;
  const item = sched.storyboard.find(i => i.id === itemId);
  if (!item) return;

  const order = ['ready', 'live', 'done'];
  const nextIdx = (order.indexOf(item.status || 'ready') + 1) % order.length;
  item.status = order[nextIdx];

  saveData();
  renderApp();
  const labels = { ready: 'Aguardando', live: 'AO VIVO AGORA', done: 'Concluído' };
  showToast(`Cena "${item.phase}" marcada como: ${labels[item.status]}`, item.status === 'live' ? 'amber' : 'emerald');
}

function openStoryboardModal(scheduleId, itemId = null) {
  const modal = document.getElementById('modal-storyboard');
  if (!modal) return;

  const sched = state.schedules.find(s => s.id === scheduleId);
  if (!sched) return;
  const item = itemId && Array.isArray(sched.storyboard) ? sched.storyboard.find(i => i.id === itemId) : null;

  document.getElementById('sb-schedule-id').value = scheduleId;
  document.getElementById('sb-item-id').value = item ? item.id : '';
  document.getElementById('sb-modal-title').textContent = item ? 'Editar Cena do Storyboard' : 'Adicionar Cena ao Storyboard';
  document.getElementById('sb-time').value = item ? item.time : '18:30';
  document.getElementById('sb-phase').value = item ? item.phase : '';
  document.getElementById('sb-scene').value = item ? item.scene : '';
  document.getElementById('sb-cue').value = item ? item.cameraCue : '';

  const rolesGrid = document.getElementById('sb-roles-grid');
  rolesGrid.innerHTML = state.roles.map(role => {
    const checked = item ? (item.targetRoles || []).includes(role.id) : false;
    return `
      <label class="flex items-center gap-2 p-2 rounded-xl border border-slate-700/70 bg-slate-900/60 hover:border-cyan-500/40 cursor-pointer text-xs">
        <input type="checkbox" name="sb-role" value="${role.id}" ${checked ? 'checked' : ''} class="rounded border-slate-600 text-cyan-500 bg-slate-800">
        <span class="text-slate-200 font-medium">${role.shortName}</span>
      </label>
    `;
  }).join('');

  modal.classList.remove('hidden');
}

function closeStoryboardModal() {
  document.getElementById('modal-storyboard')?.classList.add('hidden');
}

function handleSaveStoryboardItem(e) {
  e.preventDefault();
  const scheduleId = document.getElementById('sb-schedule-id').value;
  const itemId = document.getElementById('sb-item-id').value;
  const time = document.getElementById('sb-time').value || '18:00';
  const phase = document.getElementById('sb-phase').value.trim();
  const scene = document.getElementById('sb-scene').value.trim();
  const cameraCue = document.getElementById('sb-cue').value.trim();

  const checkedNodes = document.querySelectorAll('input[name="sb-role"]:checked');
  const targetRoles = Array.from(checkedNodes).map(n => n.value);

  const sched = state.schedules.find(s => s.id === scheduleId);
  if (!sched || !phase || !scene) return;
  if (!Array.isArray(sched.storyboard)) sched.storyboard = [];

  if (itemId) {
    const existing = sched.storyboard.find(i => i.id === itemId);
    if (existing) {
      existing.time = time;
      existing.phase = phase;
      existing.scene = scene;
      existing.cameraCue = cameraCue;
      existing.targetRoles = targetRoles;
    }
    showToast(`Cena "${phase}" atualizada no Storyboard!`, 'cyan');
  } else {
    sched.storyboard.push({
      id: 'sb_' + Date.now(),
      time,
      phase,
      scene,
      cameraCue: cameraCue || 'Atenção ao direcionamento no rádio intercom.',
      targetRoles: targetRoles.length > 0 ? targetRoles : ['diretor_culto'],
      status: 'ready'
    });
    sched.storyboard.sort((a, b) => a.time.localeCompare(b.time));
    showToast(`Nova cena "${phase}" adicionada ao Storyboard!`, 'emerald');
  }

  saveData();
  closeStoryboardModal();
  renderApp();
}

function deleteStoryboardItem(scheduleId, itemId) {
  const sched = state.schedules.find(s => s.id === scheduleId);
  if (!sched || !Array.isArray(sched.storyboard)) return;
  sched.storyboard = sched.storyboard.filter(i => i.id !== itemId);
  saveData();
  renderApp();
  showToast('Cena removida do Storyboard.', 'rose');
}

// ============================================================================
// STORYBOARD DE QUANTIDADE DE VOLUNTÁRIOS E FUNÇÕES + RELATÓRIO CANTINA (PDF & EXCEL)
// ============================================================================

function renderVolunteersRolesStoryboard() {
  const totalMembers = state.members.length;
  const totalRoles = state.roles.length;
  const selectedSched = state.schedules.find(s => s.id === state.selectedScheduleId) || state.schedules[0] || null;
  const totalAssigned = selectedSched ? selectedSched.assignments.length : 0;
  const totalConfirmed = selectedSched ? selectedSched.assignments.filter(a => a.status === 'confirmed').length : 0;

  let totalQrPresences = 0;
  state.members.forEach(m => {
    totalQrPresences += Array.isArray(m.attendanceLogs) ? m.attendanceLogs.length : 0;
  });

  return `
    <div class="glass-panel rounded-3xl p-5 sm:p-6 border border-cyan-500/35 space-y-5 relative overflow-hidden">
      <div class="absolute -right-12 -bottom-12 w-56 h-56 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div class="flex items-center gap-3.5">
          <div class="w-11 h-11 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center text-slate-950 shadow-lg glow-cyan shrink-0">
            <i data-lucide="layout-grid" class="w-6 h-6"></i>
          </div>
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="text-base sm:text-lg font-display font-extrabold text-white">
                Storyboard de Voluntários & Quantidade por Função
              </h2>
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                Mapa de Capacidade da Equipe
              </span>
            </div>
            <p class="text-xs text-slate-400">
              Visão em tempo real da quantidade total de voluntários cadastrados e quantos atuam em cada função da mídia.
            </p>
          </div>
        </div>

        <!-- KPIs Gerais -->
        <div class="grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
          <div class="px-3.5 py-2 rounded-2xl bg-slate-900/90 border border-cyan-500/30 text-center">
            <span class="text-lg font-display font-extrabold text-cyan-300 block leading-none">${totalMembers}</span>
            <span class="text-[10px] uppercase tracking-wider text-slate-400">Voluntários</span>
          </div>
          <div class="px-3.5 py-2 rounded-2xl bg-slate-900/90 border border-fuchsia-500/30 text-center">
            <span class="text-lg font-display font-extrabold text-fuchsia-300 block leading-none">${totalRoles}</span>
            <span class="text-[10px] uppercase tracking-wider text-slate-400">Funções</span>
          </div>
          <div class="px-3.5 py-2 rounded-2xl bg-slate-900/90 border border-amber-500/30 text-center">
            <span class="text-lg font-display font-extrabold text-amber-300 block leading-none">${totalAssigned}/${getScheduleTargetPositions(selectedSched)}</span>
            <span class="text-[10px] uppercase tracking-wider text-slate-400">Escalados</span>
          </div>
          <div class="px-3.5 py-2 rounded-2xl bg-slate-900/90 border border-emerald-500/30 text-center">
            <span class="text-lg font-display font-extrabold text-emerald-300 block leading-none">${totalQrPresences}</span>
            <span class="text-[10px] uppercase tracking-wider text-slate-400">Check-ins QR</span>
          </div>
        </div>
      </div>

      <!-- Cards do Storyboard de Quantidade por Função -->
      <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
        ${state.roles.map(role => {
          const qualifiedMembers = state.members.filter(m => Array.isArray(m.skills) && m.skills.includes(role.id));
          const count = qualifiedMembers.length;
          const pct = totalMembers > 0 ? Math.min(100, Math.round((count / totalMembers) * 100)) : 0;
          const activeAssign = selectedSched ? selectedSched.assignments.find(a => a.roleId === role.id) : null;
          const activeMember = activeAssign ? getMemberById(activeAssign.memberId) : null;

          return `
            <div class="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800/90 hover:border-cyan-500/40 transition flex flex-col justify-between gap-2.5">
              <div>
                <div class="flex items-center justify-between gap-2 mb-2">
                  <div class="flex items-center gap-2 min-w-0">
                    <div class="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${role.badgeClass}">
                      <i data-lucide="${role.icon}" class="w-4 h-4"></i>
                    </div>
                    <div class="min-w-0">
                      <h4 class="text-xs font-display font-bold text-white truncate" title="${escapeHTML(role.name)}">${escapeHTML(role.shortName)}</h4>
                      <span class="text-[10px] text-slate-400 block truncate">${escapeHTML(role.category)}</span>
                    </div>
                  </div>
                  <span class="px-2.5 py-1 rounded-xl text-xs font-display font-extrabold shrink-0 ${
                    count > 0
                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                      : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                  }">
                    ${count} ${count === 1 ? 'voluntário' : 'voluntários'}
                  </span>
                </div>

                <!-- Barra de Proporção -->
                <div class="w-full h-1.5 rounded-full bg-slate-950 overflow-hidden my-1.5">
                  <div class="h-full bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full" style="width: ${Math.max(count > 0 ? 14 : 0, pct)}%"></div>
                </div>

                <!-- Nomes dos voluntários habilitados -->
                <div class="flex flex-wrap gap-1 mt-2">
                  ${count > 0
                    ? qualifiedMembers.slice(0, 4).map(m => `
                        <span class="text-[10px] px-1.5 py-0.5 rounded bg-slate-950 text-slate-300 border border-slate-800 truncate max-w-[110px]">
                          ${escapeHTML(m.name.split(' ')[0])}
                        </span>
                      `).join('') + (count > 4 ? `<span class="text-[10px] text-cyan-400 font-bold px-1">+${count - 4}</span>` : '')
                    : `<span class="text-[10px] italic text-rose-300/80">Sem voluntário cadastrado</span>`
                  }
                </div>
              </div>

              ${selectedSched ? `
                <div class="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                  <span class="text-slate-400">No culto atual:</span>
                  ${activeMember
                    ? `<strong class="text-emerald-300 truncate max-w-[120px]">✓ ${escapeHTML(activeMember.name.split(' ')[0])}</strong>`
                    : `<span class="text-amber-300">Vaga aberta</span>`
                  }
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function getMemberPrimaryRoleName(member, schedule = null) {
  if (!member) return 'Voluntário Mídia';
  if (schedule && Array.isArray(schedule.assignments)) {
    const a = schedule.assignments.find(item => item.memberId === member.id);
    if (a) return getRoleById(a.roleId).shortName;
  }
  if (Array.isArray(member.skills) && member.skills.length > 0) {
    return member.skills.map(sId => getRoleById(sId).shortName).join(' / ');
  }
  return member.title || 'Mídia';
}

// ============================================================================
// MÓDULO 1 (EXCLUSIVO): RELATÓRIO DE FREQUÊNCIA COM NOME E DATA DO EVENTO (PDF & EXCEL)
// ============================================================================

function syncAttendanceReportRows() {
  const cfg = state.attendanceReportConfig;
  const sched = state.schedules.find(s => s.id === cfg.scheduleId) || null;

  if (sched) {
    const [y, m, d] = (sched.date || '').split('-');
    if (d && m) cfg.eventDate = `${d}/${m}/${y}`;
    cfg.eventTitle = `${sched.title.toUpperCase()} (${sched.category.toUpperCase()})`;
  }

  const rows = [];

  if (cfg.sourceFilter === 'scheduled' && sched) {
    sched.assignments.forEach(a => {
      const m = getMemberById(a.memberId);
      if (m) {
        const r = getRoleById(a.roleId);
        const logs = Array.isArray(m.attendanceLogs) ? m.attendanceLogs : [];
        const matchLog = logs.find(l => l.scheduleId === sched.id);
        rows.push({
          id: 'att_row_' + m.id + '_' + r.id,
          name: m.name.toUpperCase(),
          roleName: r.shortName,
          congregation: m.congregation || 'Sede',
          qrToken: m.qrToken || '',
          status: matchLog
            ? `PRESENTE QR (${matchLog.time})`
            : a.status === 'confirmed'
            ? 'CONFIRMADO NO APP'
            : 'AGUARDANDO CHECK-IN'
        });
      }
    });
  } else if (cfg.sourceFilter === 'qr_present') {
    state.members.forEach(m => {
      const logs = Array.isArray(m.attendanceLogs) ? m.attendanceLogs : [];
      const matchingLog = sched ? logs.find(l => l.scheduleId === sched.id) : logs[0];
      if (matchingLog) {
        rows.push({
          id: 'att_qr_' + m.id,
          name: m.name.toUpperCase(),
          roleName: getMemberPrimaryRoleName(m, sched),
          congregation: m.congregation || 'Sede',
          qrToken: m.qrToken || '',
          status: `PRESENTE QR (${matchingLog.date} às ${matchingLog.time})`
        });
      }
    });
  } else {
    state.members.forEach(m => {
      const logs = Array.isArray(m.attendanceLogs) ? m.attendanceLogs : [];
      const lastLog = logs[0];
      rows.push({
        id: 'att_all_' + m.id,
        name: m.name.toUpperCase(),
        roleName: getMemberPrimaryRoleName(m, sched),
        congregation: m.congregation || 'Sede',
        qrToken: m.qrToken || '',
        status: lastLog ? `PRESENTE QR (${lastLog.date} ${lastLog.time})` : 'PRESENTE / ASSINATURA'
      });
    });
  }

  cfg.customRows = rows;
}

function ensureAttendanceReportInitialized() {
  if (!Array.isArray(state.attendanceReportConfig.customRows) || state.attendanceReportConfig.customRows.length === 0) {
    syncAttendanceReportRows();
  }
  return state.attendanceReportConfig.customRows;
}

function handleAttendanceReportFilterChange() {
  const sourceSel = document.getElementById('att-rep-source-select')?.value || 'all';
  const dateInp = document.getElementById('att-rep-date-input')?.value || state.attendanceReportConfig.eventDate;
  const titleInp = document.getElementById('att-rep-title-input')?.value || state.attendanceReportConfig.eventTitle;

  state.attendanceReportConfig.sourceFilter = sourceSel;
  state.attendanceReportConfig.eventDate = dateInp;
  state.attendanceReportConfig.eventTitle = titleInp;

  syncAttendanceReportRows();
  renderApp();
  showToast('Relatório de Frequência atualizado!', 'cyan');
}

function updateAttendanceReportHeaderField(field, value) {
  state.attendanceReportConfig[field] = value;
  const el = document.getElementById('attendance-report-banner-text');
  if (el) {
    el.textContent = `RELATÓRIO DE FREQUÊNCIA — ${state.attendanceReportConfig.eventDate} • ${state.attendanceReportConfig.eventTitle}`;
  }
}

function updateAttendanceReportRowField(rowId, field, val) {
  const row = (state.attendanceReportConfig.customRows || []).find(r => r.id === rowId);
  if (row) row[field] = val;
}

function removeAttendanceReportRow(rowId) {
  state.attendanceReportConfig.customRows = (state.attendanceReportConfig.customRows || []).filter(r => r.id !== rowId);
  renderApp();
}

function printReportHtml(html) {
  let printWin = null;
  try {
    printWin = window.open('', '_blank', 'width=980,height=850');
  } catch (_) {}

  if (printWin && printWin.document) {
    printWin.document.write(html);
    printWin.document.close();
    return;
  }

  // Fallback se o navegador bloquear pop-ups
  let iframe = document.getElementById('report-print-iframe');
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'report-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = 'none';
    document.body.appendChild(iframe);
  }
  const frameDoc = iframe.contentWindow || iframe.contentDocument;
  const doc = frameDoc.document || frameDoc;
  doc.open();
  doc.write(html);
  doc.close();
  setTimeout(() => {
    (iframe.contentWindow || window).focus();
    (iframe.contentWindow || window).print();
  }, 400);
}

function exportAttendanceReportPDF() {
  const rows = ensureAttendanceReportInitialized();
  const cfg = state.attendanceReportConfig;
  const eventHeader = `${cfg.eventDate || 'HOJE'} — ${cfg.eventTitle || 'CULTO OFICIAL ASSEMBLEIA DE DEUS'}`;

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <title>Relatório Oficial de Frequência — ${escapeHTML(eventHeader)}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Outfit:wght@700;800&display=swap');
        * { box-sizing: border-box; }
        body {
          margin: 0;
          padding: 28px;
          font-family: 'Inter', Arial, sans-serif;
          background: #f8fafc;
          color: #0f172a;
        }
        .sheet {
          max-width: 900px;
          margin: 0 auto;
          background: #ffffff;
          border: 2px solid #0f172a;
          border-radius: 12px;
          overflow: hidden;
        }
        .top-header {
          background: #064e3b;
          color: #ffffff;
          padding: 18px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 2px solid #0f172a;
        }
        .top-header h1 {
          font-family: 'Outfit', sans-serif;
          font-size: 19px;
          margin: 0;
        }
        .top-header p {
          margin: 3px 0 0 0;
          font-size: 12px;
          color: #a7f3d0;
        }
        .event-bar {
          background: #10b981;
          color: #022c22;
          text-align: center;
          font-family: 'Outfit', sans-serif;
          font-size: 17px;
          font-weight: 800;
          padding: 10px 16px;
          border-bottom: 2px solid #0f172a;
          text-transform: uppercase;
        }
        table { width: 100%; border-collapse: collapse; }
        th {
          background: #cbd5e1;
          color: #0f172a;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          padding: 9px 10px;
          border: 1.5px solid #0f172a;
          text-align: center;
        }
        td {
          padding: 8px 10px;
          border: 1.5px solid #0f172a;
          font-size: 12px;
          font-weight: 600;
          color: #0f172a;
        }
        tr:nth-child(even) td { background: #f8fafc; }
        .footer {
          padding: 14px 20px;
          background: #f1f5f9;
          border-top: 2px solid #0f172a;
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          font-weight: 700;
        }
        .actions { max-width: 900px; margin: 0 auto 14px auto; text-align: right; }
        .btn { background: #059669; color: #fff; padding: 10px 18px; border-radius: 8px; font-weight: 800; border: none; cursor: pointer; }
        @media print {
          body { background: #fff; padding: 0; }
          .actions { display: none; }
          .sheet { border-radius: 0; max-width: 100%; }
          .top-header, .event-bar, th, tr:nth-child(even) td, .footer {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      </style>
    </head>
    <body>
      <div class="actions">
        <button class="btn" onclick="window.print()">🖨️ Imprimir / Salvar PDF de Frequência</button>
      </div>
      <div class="sheet">
        <div class="top-header">
          <div>
            <h1>RELATÓRIO OFICIAL DE FREQUÊNCIA — AD MÍDIA HUB</h1>
            <p>Assembleia de Deus • Controle de Presença por QR Code e Escala</p>
          </div>
          <div style="background:#fbbf24;color:#0f172a;padding:6px 14px;border-radius:99px;font-weight:800;font-size:12px;">
            ${rows.length} Voluntários
          </div>
        </div>
        <div class="event-bar">
          DATA: ${escapeHTML(cfg.eventDate)} &nbsp;|&nbsp; EVENTO: ${escapeHTML(cfg.eventTitle)}
        </div>
        <table>
          <thead>
            <tr>
              <th style="width:42px;">Nº</th>
              <th style="text-align:left;">NOME DO VOLUNTÁRIO</th>
              <th>FUNÇÃO NA MÍDIA</th>
              <th>CONGREGAÇÃO</th>
              <th>CÓDIGO QR</th>
              <th>FREQUÊNCIA / CHECK-IN</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((r, i) => `
              <tr>
                <td style="text-align:center;font-weight:800;">${String(i + 1).padStart(2, '0')}</td>
                <td style="font-weight:700;">${escapeHTML(r.name)}</td>
                <td style="text-align:center;">${escapeHTML(r.roleName || '-')}</td>
                <td style="text-align:center;">${escapeHTML(r.congregation || '-')}</td>
                <td style="text-align:center;font-family:monospace;font-size:11px;">${escapeHTML(r.qrToken || '-')}</td>
                <td style="text-align:center;color:#047857;font-weight:700;">${escapeHTML(r.status || '')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="footer">
          <span>Total de Voluntários: ${rows.length}</span>
          <span>Responsável / Direção de Mídia: _______________________________</span>
          <span>Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}</span>
        </div>
      </div>
      <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 350); };</script>
    </body>
    </html>
  `;
  printReportHtml(html);
}

function exportAttendanceReportExcel() {
  const rows = ensureAttendanceReportInitialized();
  const cfg = state.attendanceReportConfig;
  const headerBanner = `RELATÓRIO DE FREQUÊNCIA — ${cfg.eventDate} - ${cfg.eventTitle}`;
  const slug = `${cfg.eventDate}-${cfg.eventTitle}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  if (window.XLSX) {
    try {
      const aoa = [
        [headerBanner, '', '', '', '', ''],
        ['Nº', 'NOME DO VOLUNTÁRIO', 'FUNÇÃO NA MÍDIA', 'CONGREGAÇÃO', 'TOKEN QR CODE', 'STATUS DE FREQUÊNCIA'],
        ...rows.map((r, idx) => [
          idx + 1,
          r.name,
          r.roleName || '',
          r.congregation || '',
          r.qrToken || '',
          r.status || ''
        ])
      ];
      const ws = window.XLSX.utils.aoa_to_sheet(aoa);
      ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];
      ws['!cols'] = [{ wch: 6 }, { wch: 34 }, { wch: 24 }, { wch: 22 }, { wch: 24 }, { wch: 28 }];
      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, 'Relatorio de Frequencia');
      window.XLSX.writeFile(wb, `relatorio-frequencia-${slug || 'evento'}.xlsx`);
      showToast('Planilha Excel de Frequência (.xlsx) baixada com sucesso!', 'emerald');
      return;
    } catch (e) {}
  }

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
    <head><meta charset="UTF-8" /></head>
    <body>
      <table border="1" style="border-collapse:collapse;font-family:Arial,sans-serif;">
        <tr>
          <th colspan="6" style="background:#10b981;color:#000;font-size:15pt;font-weight:bold;padding:10px;text-align:center;">
            ${escapeHTML(headerBanner)}
          </th>
        </tr>
        <tr style="background:#cbd5e1;font-weight:bold;text-align:center;">
          <th>Nº</th><th>NOME DO VOLUNTÁRIO</th><th>FUNÇÃO</th><th>CONGREGAÇÃO</th><th>QR CODE</th><th>FREQUÊNCIA</th>
        </tr>
        ${rows.map((r, i) => `
          <tr>
            <td style="text-align:center;">${i + 1}</td>
            <td style="font-weight:bold;">${escapeHTML(r.name)}</td>
            <td style="text-align:center;">${escapeHTML(r.roleName || '')}</td>
            <td style="text-align:center;">${escapeHTML(r.congregation || '')}</td>
            <td style="text-align:center;">${escapeHTML(r.qrToken || '')}</td>
            <td style="text-align:center;">${escapeHTML(r.status || '')}</td>
          </tr>
        `).join('')}
      </table>
    </body>
    </html>
  `;
  const blob = new Blob(['\ufeff', html], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `relatorio-frequencia-${slug || 'evento'}.xls`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Planilha Excel de Frequência (.xls) baixada!', 'emerald');
}

function renderAttendanceReportGenerator() {
  const rows = ensureAttendanceReportInitialized();
  const cfg = state.attendanceReportConfig;

  return `
    <div class="glass-panel rounded-3xl p-5 sm:p-6 border border-emerald-500/40 space-y-5 relative overflow-hidden">
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div class="flex items-center gap-3.5">
          <div class="w-11 h-11 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-slate-950 shadow-lg glow-emerald shrink-0">
            <i data-lucide="clipboard-check" class="w-6 h-6"></i>
          </div>
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="text-lg sm:text-xl font-display font-extrabold text-white">
                1. Relatório Oficial de Frequência do Evento
              </h2>
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Exclusivo Presença & Funções (Separado da Cantina)
              </span>
            </div>
            <p class="text-xs text-slate-400">
              Relatório com <strong>Nome do Evento</strong>, <strong>Data</strong>, <strong>Voluntário</strong>, <strong>Função</strong>, <strong>Congregação</strong> e <strong>Check-in QR Code</strong>.
            </p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onclick="exportAttendanceReportPDF()"
            class="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-400 to-cyan-500 hover:brightness-110 text-slate-950 font-extrabold text-xs sm:text-sm shadow-lg flex items-center gap-2 transition">
            <i data-lucide="file-text" class="w-4 h-4"></i>
            <span>Gerar PDF de Frequência</span>
          </button>

          <button
            type="button"
            onclick="exportAttendanceReportExcel()"
            class="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/40 font-extrabold text-xs sm:text-sm flex items-center gap-2 transition">
            <i data-lucide="table" class="w-4 h-4"></i>
            <span>Baixar Excel de Frequência</span>
          </button>
        </div>
      </div>

      <!-- Filtros do Relatório de Frequência -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-900/75 p-4 rounded-2xl border border-slate-800">
        <div>
          <label class="block text-[10px] font-bold uppercase tracking-wider text-emerald-300 mb-1">Data do Culto / Evento</label>
          <input
            id="att-rep-date-input"
            type="text"
            value="${escapeHTML(cfg.eventDate)}"
            oninput="updateAttendanceReportHeaderField('eventDate', this.value)"
            placeholder="Ex: 17/11/2026"
            class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-emerald-400" />
        </div>

        <div>
          <label class="block text-[10px] font-bold uppercase tracking-wider text-emerald-300 mb-1">Nome do Evento / Culto</label>
          <input
            id="att-rep-title-input"
            type="text"
            value="${escapeHTML(cfg.eventTitle)}"
            oninput="updateAttendanceReportHeaderField('eventTitle', this.value)"
            placeholder="Ex: CULTO DA FAMÍLIA — AD SEDE"
            class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-emerald-400" />
        </div>

        <div>
          <label class="block text-[10px] font-bold uppercase tracking-wider text-cyan-300 mb-1">Filtrar Voluntários</label>
          <select
            id="att-rep-source-select"
            onchange="handleAttendanceReportFilterChange()"
            class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400">
            <option value="all" ${cfg.sourceFilter === 'all' ? 'selected' : ''}>Todos os 27 Voluntários</option>
            <option value="qr_present" ${cfg.sourceFilter === 'qr_present' ? 'selected' : ''}>Apenas Presentes no QR Code</option>
            <option value="scheduled" ${cfg.sourceFilter === 'scheduled' ? 'selected' : ''}>Escalados no Culto</option>
          </select>
        </div>
      </div>

      <div class="rounded-2xl overflow-hidden border-2 border-emerald-500/50 bg-slate-950">
        <div
          id="attendance-report-banner-text"
          class="bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-display font-extrabold text-sm sm:text-base text-center py-2.5 px-4 uppercase tracking-wide">
          RELATÓRIO DE FREQUÊNCIA — ${escapeHTML(cfg.eventDate)} • ${escapeHTML(cfg.eventTitle)}
        </div>

        <div class="overflow-x-auto max-h-80">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-900 text-slate-300 text-[11px] font-display font-extrabold uppercase border-b border-slate-800">
                <th class="py-2.5 px-3 text-center w-12">Nº</th>
                <th class="py-2.5 px-4">NOME DO VOLUNTÁRIO</th>
                <th class="py-2.5 px-4 text-center">FUNÇÃO</th>
                <th class="py-2.5 px-4 text-center">CONGREGAÇÃO</th>
                <th class="py-2.5 px-4 text-center">STATUS FREQUÊNCIA / QR</th>
                <th class="py-2.5 px-2 text-center w-12">Ação</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-800/80 text-xs">
              ${rows.map((r, idx) => `
                <tr class="hover:bg-slate-900/70">
                  <td class="py-2 px-3 text-center font-mono text-slate-400">${String(idx + 1).padStart(2, '0')}</td>
                  <td class="py-1.5 px-3">
                    <input
                      type="text"
                      value="${escapeHTML(r.name)}"
                      oninput="updateAttendanceReportRowField('${r.id}', 'name', this.value)"
                      class="w-full bg-transparent text-white font-bold focus:outline-none" />
                  </td>
                  <td class="py-1.5 px-3">
                    <input
                      type="text"
                      value="${escapeHTML(r.roleName || '')}"
                      oninput="updateAttendanceReportRowField('${r.id}', 'roleName', this.value)"
                      class="w-full bg-transparent text-cyan-300 text-center focus:outline-none" />
                  </td>
                  <td class="py-1.5 px-3">
                    <input
                      type="text"
                      value="${escapeHTML(r.congregation || '')}"
                      oninput="updateAttendanceReportRowField('${r.id}', 'congregation', this.value)"
                      class="w-full bg-transparent text-slate-300 text-center focus:outline-none" />
                  </td>
                  <td class="py-1.5 px-3">
                    <input
                      type="text"
                      value="${escapeHTML(r.status || '')}"
                      oninput="updateAttendanceReportRowField('${r.id}', 'status', this.value)"
                      class="w-full bg-transparent text-emerald-300 text-center font-semibold focus:outline-none" />
                  </td>
                  <td class="py-1.5 px-2 text-center">
                    <button onclick="removeAttendanceReportRow('${r.id}')" class="p-1 text-slate-500 hover:text-rose-400">
                      <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

// ============================================================================
// MÓDULO 2 (SEPARADO): LISTA EXCLUSIVA DA CANTINA (NOME, VALOR, ASSINATURA)
// ============================================================================

function syncReportRowsFromSelection() {
  const cfg = state.reportConfig;
  if (!cfg.scheduleId || cfg.scheduleId === 'all_members') {
    cfg.scheduleId = state.selectedScheduleId || state.schedules[0]?.id || 'all_members';
  }
  const sched = state.schedules.find(s => s.id === cfg.scheduleId) || state.schedules[0] || null;

  if (sched) {
    cfg.scheduleId = sched.id;
    const [y, m, d] = (sched.date || '').split('-');
    if (d && m) cfg.eventDate = `${d}.${m}`;
    cfg.eventTitle = `MÍDIA — ${sched.title.toUpperCase()}`;
  }

  if (!cfg.rowValuesById) cfg.rowValuesById = {};
  if (!cfg.sourceFilter) cfg.sourceFilter = 'scheduled';
  const rows = [];
  const valDefault = cfg.defaultValue || '';
  const addedMemberIds = new Set();

  if (cfg.sourceFilter === 'scheduled' && sched && Array.isArray(sched.assignments)) {
    // 1. Filtrar Voluntários: Escalados no Culto
    sched.assignments.forEach(a => {
      const m = getMemberById(a.memberId);
      if (!m || addedMemberIds.has(m.id)) return;
      addedMemberIds.add(m.id);
      const rowId = 'row_' + m.id + '_' + a.roleId;
      rows.push({
        id: rowId,
        memberId: m.id,
        createdAt: m.createdAt,
        name: m.name.toUpperCase(),
        value: cfg.rowValuesById[rowId] !== undefined ? cfg.rowValuesById[rowId] : valDefault,
        signature: '' // LIMPO: Espaço em branco para assinatura manual com caneta
      });
    });
  } else if (cfg.sourceFilter === 'qr_present') {
    // 2. Filtrar Voluntários: Apenas Presentes no QR Code
    state.members.forEach(m => {
      const logs = Array.isArray(m.attendanceLogs) ? m.attendanceLogs : [];
      const matchLog = sched ? logs.find(l => l.scheduleId === sched.id || l.date === sched.date) : logs[0];
      if (matchLog && !addedMemberIds.has(m.id)) {
        addedMemberIds.add(m.id);
        const rowId = 'row_qr_' + m.id;
        rows.push({
          id: rowId,
          memberId: m.id,
          createdAt: m.createdAt,
          name: m.name.toUpperCase(),
          value: cfg.rowValuesById[rowId] !== undefined ? cfg.rowValuesById[rowId] : valDefault,
          signature: '' // LIMPO: Espaço em branco para assinatura manual com caneta
        });
      }
    });
  } else {
    // 3. Filtrar Voluntários: Todos os Membros da Equipe
    state.members.forEach(m => {
      if (addedMemberIds.has(m.id)) return;
      addedMemberIds.add(m.id);
      const rowId = 'row_all_' + m.id;
      rows.push({
        id: rowId,
        memberId: m.id,
        createdAt: m.createdAt,
        name: m.name.toUpperCase(),
        value: cfg.rowValuesById[rowId] !== undefined ? cfg.rowValuesById[rowId] : valDefault,
        signature: '' // LIMPO: Espaço em branco para assinatura manual com caneta
      });
    });
  }

  // Ordenação da Lista da Cantina (Padrão: A-Z)
  const canteenSortMode = cfg.sort || 'name_asc';
  cfg.customRows = sortItemsByCriteria(
    rows,
    canteenSortMode,
    r => r.name,
    r => r.createdAt || r.id
  );
}

function handleReportFilterChange() {
  const schedSel = document.getElementById('rep-schedule-select')?.value || state.selectedScheduleId || 'all_members';
  const sourceSel = document.getElementById('rep-source-select')?.value || state.reportConfig.sourceFilter || 'scheduled';
  const sortSel = document.getElementById('rep-sort-select')?.value || state.reportConfig.sort || 'name_asc';
  const dateInp = document.getElementById('rep-date-input')?.value || state.reportConfig.eventDate;
  const titleInp = document.getElementById('rep-title-input')?.value || state.reportConfig.eventTitle;
  const valInp = document.getElementById('rep-default-val')?.value ?? state.reportConfig.defaultValue;

  state.reportConfig.scheduleId = schedSel;
  state.reportConfig.sourceFilter = sourceSel;
  state.reportConfig.sort = sortSel;
  state.reportConfig.eventDate = dateInp;
  state.reportConfig.eventTitle = titleInp;
  state.reportConfig.defaultValue = valInp;

  syncReportRowsFromSelection();
  renderApp();
  showToast('Lista da Cantina atualizada com o filtro e ordenação selecionados!', 'amber');
}

function updateReportHeaderField(field, value) {
  state.reportConfig[field] = value;
  const bannerEl = document.getElementById('canteen-preview-banner-text');
  if (bannerEl) {
    bannerEl.textContent = `${state.reportConfig.eventDate} - ${state.reportConfig.eventTitle}`;
  }
}

function applyDefaultValueToAllReportRows() {
  const val = (document.getElementById('rep-default-val')?.value || '').trim();
  state.reportConfig.defaultValue = val;
  state.reportConfig.rowValuesById = {};
  syncReportRowsFromSelection();
  renderApp();
  showToast('Valor da cantina aplicado a todos os voluntários presentes na escala!', 'emerald');
}

function updateReportRowField(rowId, field, val) {
  if (!state.reportConfig.rowValuesById) state.reportConfig.rowValuesById = {};
  if (field === 'value') {
    state.reportConfig.rowValuesById[rowId] = val;
  }
  const row = (state.reportConfig.customRows || []).find(r => r.id === rowId);
  if (row) {
    row[field] = val;
  }
}

function addManualReportRow(e) {
  if (e) e.preventDefault();
  const nameInp = document.getElementById('rep-new-name');
  const valInp = document.getElementById('rep-new-val');

  const name = (nameInp?.value || '').trim().toUpperCase();
  if (!name) {
    showToast('Digite o nome do voluntário para adicionar na lista da cantina.', 'rose');
    return;
  }
  const value = (valInp?.value || '').trim() || state.reportConfig.defaultValue || '';

  if (!Array.isArray(state.reportConfig.customRows) || state.reportConfig.customRows.length === 0) {
    syncReportRowsFromSelection();
  }

  state.reportConfig.customRows.push({
    id: 'row_manual_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    name,
    value,
    signature: ''
  });

  if (nameInp) nameInp.value = '';
  if (valInp) valInp.value = '';
  renderApp();
  showToast(`${name} adicionado(a) à Lista da Cantina!`, 'emerald');
}

function removeReportRow(rowId) {
  state.reportConfig.customRows = (state.reportConfig.customRows || []).filter(r => r.id !== rowId);
  renderApp();
}

function loadClassicCanteenExampleList() {
  state.reportConfig.eventDate = '10.11';
  state.reportConfig.eventTitle = 'MIDIA ASSEMBLEIA GERAL';
  const sampleNames = [
    'LH',
    'WESLEY',
    'ALCENIR',
    'JEOSAFÁ',
    'WILLIAN AGUIAR',
    'LAYLA',
    'SARAH FROTA',
    'FELIPE RAFAEL',
    'VITHORYA',
    'JULIA',
    'MATHEUS',
    'ISAQUE ROCHA',
    'SARAH'
  ];
  state.reportConfig.customRows = sampleNames.map((name, idx) => ({
    id: 'sample_' + idx,
    name,
    value: state.reportConfig.defaultValue || '',
    signature: ''
  }));
  renderApp();
  showToast('Lista modelo da imagem ("10.11 - MIDIA ASSEMBLEIA GERAL") carregada!', 'amber');
}

function ensureReportRowsInitialized() {
  syncReportRowsFromSelection();
  return state.reportConfig.customRows;
}

function exportCanteenReportPDF() {
  const rows = ensureReportRowsInitialized();
  const headerBanner = `${state.reportConfig.eventDate || '10.11'} - ${state.reportConfig.eventTitle || 'MIDIA ASSEMBLEIA GERAL'}`;

  let totalMoney = 0;
  let hasNumericValue = false;
  rows.forEach(r => {
    const cleaned = String(r.value || '').replace(/[^\d,.-]/g, '').replace(',', '.');
    const num = parseFloat(cleaned);
    if (!isNaN(num) && num > 0) {
      totalMoney += num;
      hasNumericValue = true;
    }
  });

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <title>Lista da Cantina — ${escapeHTML(headerBanner)}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Outfit:wght@700;800&display=swap');
        * { box-sizing: border-box; }
        body {
          margin: 0;
          padding: 32px;
          font-family: 'Inter', Arial, sans-serif;
          background: #f8fafc;
          color: #000000;
        }
        .sheet {
          max-width: 820px;
          margin: 0 auto;
          background: #ffffff;
          border: 2px solid #000000;
        }
        .yellow-title-bar {
          background: #ffff00;
          color: #000000;
          text-align: center;
          font-family: 'Times New Roman', 'Outfit', serif;
          font-size: 22px;
          font-weight: 800;
          padding: 10px 16px;
          border-bottom: 2px solid #000000;
          text-transform: uppercase;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        th {
          background: #a6a6a6;
          color: #000000;
          font-size: 13px;
          font-weight: 800;
          text-transform: uppercase;
          padding: 8px 12px;
          border: 1.5px solid #000000;
          text-align: center;
        }
        td {
          padding: 9px 12px;
          border: 1.5px solid #000000;
          font-size: 13px;
          font-weight: 600;
          color: #000000;
          height: 34px;
        }
        .col-name { width: 42%; text-align: center; font-weight: 700; text-transform: uppercase; }
        .col-val { width: 23%; text-align: center; font-weight: 700; }
        .col-sig { width: 35%; text-align: center; }
        .footer-summary {
          padding: 12px 18px;
          background: #f8fafc;
          border-top: 2px solid #000000;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 12px;
          font-weight: 700;
        }
        .actions-bar {
          max-width: 820px;
          margin: 0 auto 16px auto;
          display: flex;
          justify-content: flex-end;
        }
        .btn-print {
          padding: 10px 18px;
          border-radius: 10px;
          font-weight: 800;
          font-size: 13px;
          cursor: pointer;
          border: none;
          background: #eab308;
          color: #000;
        }
        @media print {
          body { background: #fff; padding: 0; }
          .actions-bar { display: none; }
          .sheet { max-width: 100%; }
          .yellow-title-bar, th, .footer-summary {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      </style>
    </head>
    <body>
      <div class="actions-bar">
        <button class="btn-print" onclick="window.print()">🖨️ Imprimir / Salvar PDF da Cantina</button>
      </div>
      <div class="sheet">
        <div class="yellow-title-bar">
          ${escapeHTML(headerBanner)}
        </div>
        <table>
          <thead>
            <tr>
              <th class="col-name">NOME</th>
              <th class="col-val">VALOR</th>
              <th class="col-sig">ASSINATURA</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => `
              <tr>
                <td class="col-name">${escapeHTML(r.name)}</td>
                <td class="col-val">${escapeHTML(r.value || '')}</td>
                <td class="col-sig">
                  ${r.signatureImage ? `<img src="${r.signatureImage}" style="height:26px; max-width:140px; object-fit:contain; display:inline-block;" />` : ''}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="footer-summary">
          <span>Quantidade na Lista da Cantina: ${rows.length} voluntários</span>
          <span>${hasNumericValue ? `Total: R$ ${totalMoney.toFixed(2).replace('.', ',')}` : 'AD Mídia Hub — Assembleia de Deus'}</span>
        </div>
      </div>
      <script>
        window.onload = function() {
          setTimeout(function() { window.print(); }, 350);
        };
      </script>
    </body>
    </html>
  `;
  printReportHtml(html);
}

function exportCanteenReportExcel() {
  const rows = ensureReportRowsInitialized();
  const headerBanner = `${state.reportConfig.eventDate || '10.11'} - ${state.reportConfig.eventTitle || 'MIDIA ASSEMBLEIA GERAL'}`;
  const safeFileSlug = headerBanner.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  if (window.XLSX) {
    try {
      const aoa = [
        [headerBanner, '', ''],
        ['NOME', 'VALOR', 'ASSINATURA'],
        ...rows.map(r => [
          r.name,
          r.value || '',
          '' // LIMPO para assinatura manuscrita a caneta
        ])
      ];

      const ws = window.XLSX.utils.aoa_to_sheet(aoa);
      ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }];
      ws['!cols'] = [
        { wch: 36 },
        { wch: 20 },
        { wch: 36 }
      ];

      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, 'Lista Cantina');
      window.XLSX.writeFile(wb, `lista-cantina-${safeFileSlug || 'midia'}.xlsx`);
      showToast('Planilha Excel da Cantina (.xlsx) baixada com sucesso!', 'emerald');
      return;
    } catch (err) {
      console.warn('Fallback para Excel HTML (.xls):', err);
    }
  }

  const excelHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="UTF-8" />
    </head>
    <body>
      <table border="1" style="border-collapse:collapse; font-family:Arial, sans-serif;">
        <tr>
          <th colspan="3" style="background-color:#FFFF00; color:#000000; font-size:16pt; font-weight:bold; text-align:center; padding:10px; border:1px solid #000000;">
            ${escapeHTML(headerBanner)}
          </th>
        </tr>
        <tr style="background-color:#A6A6A6; color:#000000; font-weight:bold; text-align:center;">
          <th style="padding:8px; width:280px;">NOME</th>
          <th style="padding:8px; width:150px;">VALOR</th>
          <th style="padding:8px; width:260px;">ASSINATURA</th>
        </tr>
        ${rows.map(r => `
          <tr>
            <td style="text-align:center; font-weight:bold; padding:6px;">${escapeHTML(r.name)}</td>
            <td style="text-align:center; padding:6px;">${escapeHTML(r.value || '')}</td>
            <td style="text-align:center; padding:6px;">${escapeHTML(r.signature || '')}</td>
          </tr>
        `).join('')}
      </table>
    </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', excelHtml], { type: 'application/vnd.ms-excel;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lista-cantina-${safeFileSlug || 'midia'}.xls`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Planilha Excel da Cantina (.xls) baixada com sucesso!', 'emerald');
}

// ============================================================================
// ASSINATURA / RUBRICA DIGITAL NA TELA (CANVAS TOUCH & MOUSE)
// ============================================================================

let signaturePadActiveRowId = null;
let signatureCanvasInited = false;
let isDrawingSignature = false;
let sigLastX = 0;
let sigLastY = 0;

function initSignatureCanvasEvents() {
  const canvas = document.getElementById('signature-canvas');
  if (!canvas || signatureCanvasInited) return;
  signatureCanvasInited = true;

  const ctx = canvas.getContext('2d');
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    if (e.touches && e.touches[0]) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY
      };
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  function start(e) {
    e.preventDefault();
    isDrawingSignature = true;
    const p = getPos(e);
    sigLastX = p.x;
    sigLastY = p.y;
  }

  function move(e) {
    if (!isDrawingSignature) return;
    e.preventDefault();
    const p = getPos(e);
    ctx.beginPath();
    ctx.moveTo(sigLastX, sigLastY);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    sigLastX = p.x;
    sigLastY = p.y;
  }

  function end() {
    isDrawingSignature = false;
  }

  canvas.addEventListener('mousedown', start);
  canvas.addEventListener('mousemove', move);
  window.addEventListener('mouseup', end);

  canvas.addEventListener('touchstart', start, { passive: false });
  canvas.addEventListener('touchmove', move, { passive: false });
  window.addEventListener('touchend', end);
}

function openSignatureModal(rowId) {
  signaturePadActiveRowId = rowId;
  const modal = document.getElementById('modal-signature');
  if (!modal) return;
  modal.classList.remove('hidden');

  const canvas = document.getElementById('signature-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  initSignatureCanvasEvents();

  const row = (state.reportConfig.customRows || []).find(r => r.id === rowId);
  const subtitle = document.getElementById('signature-modal-subtitle');
  if (subtitle && row) {
    subtitle.textContent = `Assinatura de: ${row.name}`;
  }
}

function closeSignatureModal() {
  document.getElementById('modal-signature')?.classList.add('hidden');
  signaturePadActiveRowId = null;
}

function clearSignatureCanvas() {
  const canvas = document.getElementById('signature-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function saveSignatureCanvas() {
  if (!signaturePadActiveRowId) {
    closeSignatureModal();
    return;
  }
  const canvas = document.getElementById('signature-canvas');
  if (!canvas) return;

  const dataUrl = canvas.toDataURL('image/png');
  const row = (state.reportConfig.customRows || []).find(r => r.id === signaturePadActiveRowId);
  if (row) {
    row.signatureImage = dataUrl;
    row.signature = 'RUBRICADO DIGITALMENTE';
  }
  closeSignatureModal();
  renderApp();
  showToast('Rubrica gravada com sucesso na lista da cantina!', 'emerald');
}

// ============================================================================
// FECHAMENTO MENSAL CONSOLIDADO DA CANTINA (TODOS OS CULTOS DO MÊS)
// ============================================================================

function getMonthlyCanteenSummary(targetMonth = null) {
  const currentMonthStr = targetMonth || (state.monthlyReportFilter || new Date().toISOString().slice(0, 7));
  const [year, month] = currentMonthStr.split('-');

  let memberRows = [];
  const defaultValNum = parseFloat(String(state.reportConfig.defaultValue || '10').replace(',', '.')) || 10;

  state.members.forEach(m => {
    const logs = (m.attendanceLogs || []).filter(l => (l.date || '').startsWith(currentMonthStr));
    if (logs.length > 0) {
      memberRows.push({
        member: m,
        name: m.name.toUpperCase(),
        count: logs.length,
        dates: logs.map(l => l.date).sort().join(', '),
        totalValue: logs.length * defaultValNum,
        signature: ''
      });
    }
  });

  const canteenSortMode = state.reportConfig.sort || 'name_asc';
  memberRows = sortItemsByCriteria(
    memberRows,
    canteenSortMode,
    r => r.name,
    r => r.member?.createdAt || r.member?.id
  );

  const totalServicesInMonth = new Set();
  state.members.forEach(m => {
    (m.attendanceLogs || []).forEach(l => {
      if ((l.date || '').startsWith(currentMonthStr)) {
        totalServicesInMonth.add(l.scheduleId || l.date);
      }
    });
  });

  const grandTotalVolunteers = memberRows.length;
  const grandTotalSnacks = memberRows.reduce((sum, r) => sum + r.count, 0);
  const grandTotalMoney = memberRows.reduce((sum, r) => sum + r.totalValue, 0);

  return {
    monthStr: currentMonthStr,
    memberRows,
    totalServicesCount: totalServicesInMonth.size,
    grandTotalVolunteers,
    grandTotalSnacks,
    grandTotalMoney
  };
}

function handleMonthlyReportFilterChange(val) {
  state.monthlyReportFilter = val;
  renderApp();
}

function exportMonthlyCanteenPDF() {
  const summary = getMonthlyCanteenSummary();
  const [year, month] = summary.monthStr.split('-');
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const monthLabel = `${monthNames[parseInt(month, 10) - 1] || month} de ${year}`;
  const headerBanner = `FECHAMENTO MENSAL DA CANTINA — ${monthLabel.toUpperCase()}`;

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8" />
      <title>${escapeHTML(headerBanner)}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Outfit:wght@700;800&display=swap');
        * { box-sizing: border-box; }
        body { margin: 0; padding: 28px; font-family: 'Inter', Arial, sans-serif; background: #fff; color: #000; }
        .sheet { max-width: 840px; margin: 0 auto; border: 2px solid #000; }
        .header-bar { background: #ffff00; color: #000; text-align: center; font-size: 20px; font-weight: 800; padding: 12px; border-bottom: 2px solid #000; text-transform: uppercase; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #a6a6a6; color: #000; font-size: 12px; font-weight: 800; padding: 8px; border: 1.5px solid #000; text-align: center; }
        td { padding: 8px 10px; border: 1.5px solid #000; font-size: 12px; font-weight: 600; text-align: center; }
        .col-name { text-align: left; font-weight: 700; padding-left: 12px; }
        .summary-box { background: #f8fafc; padding: 14px 18px; border-top: 2px solid #000; display: flex; justify-content: space-between; font-weight: 700; font-size: 13px; }
        .actions-bar { max-width: 840px; margin: 0 auto 12px auto; display: flex; justify-content: flex-end; }
        .btn-print { padding: 8px 16px; border-radius: 8px; font-weight: 800; font-size: 12px; cursor: pointer; border: none; background: #eab308; color: #000; }
        @media print { .actions-bar { display: none; } body { padding: 0; } }
      </style>
    </head>
    <body>
      <div class="actions-bar">
        <button class="btn-print" onclick="window.print()">🖨️ Imprimir Fechamento Mensal</button>
      </div>
      <div class="sheet">
        <div class="header-bar">${escapeHTML(headerBanner)}</div>
        <table>
          <thead>
            <tr>
              <th style="width:40%;">NOME DO VOLUNTÁRIO</th>
              <th style="width:18%;">CULTOS PRESENTES</th>
              <th style="width:18%;">VALOR TOTAL</th>
              <th style="width:24%;">ASSINATURA / VISTO</th>
            </tr>
          </thead>
          <tbody>
            ${summary.memberRows.map(r => `
              <tr>
                <td class="col-name">${escapeHTML(r.name)}</td>
                <td>${r.count} presença(s)</td>
                <td>R$ ${r.totalValue.toFixed(2).replace('.', ',')}</td>
                <td></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="summary-box">
          <span>Total de Voluntários Atendidos: ${summary.grandTotalVolunteers}</span>
          <span>Lanches Consumidos: ${summary.grandTotalSnacks}</span>
          <span>Valor Total Cantina: R$ ${summary.grandTotalMoney.toFixed(2).replace('.', ',')}</span>
        </div>
      </div>
      <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 350); };</script>
    </body>
    </html>
  `;
  printReportHtml(html);
}

function exportMonthlyCanteenExcel() {
  const summary = getMonthlyCanteenSummary();
  const [year, month] = summary.monthStr.split('-');
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const monthLabel = `${monthNames[parseInt(month, 10) - 1] || month} de ${year}`;
  const headerBanner = `FECHAMENTO MENSAL DA CANTINA — ${monthLabel.toUpperCase()}`;

  if (window.XLSX) {
    try {
      const aoa = [
        [headerBanner, '', '', ''],
        ['NOME DO VOLUNTÁRIO', 'CULTOS PRESENTES', 'VALOR TOTAL (R$)', 'DATAS'],
        ...summary.memberRows.map(r => [
          r.name,
          r.count,
          r.totalValue,
          r.dates
        ]),
        ['TOTAL GERAL', `${summary.grandTotalSnacks} lanches`, summary.grandTotalMoney, '']
      ];
      const ws = window.XLSX.utils.aoa_to_sheet(aoa);
      ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 3 } }];
      ws['!cols'] = [{ wch: 36 }, { wch: 20 }, { wch: 20 }, { wch: 38 }];
      const wb = window.XLSX.utils.book_new();
      window.XLSX.utils.book_append_sheet(wb, ws, 'Fechamento Mensal');
      window.XLSX.writeFile(wb, `fechamento-mensal-cantina-${summary.monthStr}.xlsx`);
      showToast('Planilha Excel do Fechamento Mensal (.xlsx) baixada!', 'emerald');
      return;
    } catch (e) {
      console.warn('Fallback para XLS:', e);
    }
  }

  showToast('Exportando fechamento...', 'cyan');
}

function renderMonthlyCanteenReportGenerator() {
  const summary = getMonthlyCanteenSummary();
  const [year, month] = summary.monthStr.split('-');
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const monthLabel = `${monthNames[parseInt(month, 10) - 1] || month} de ${year}`;

  return `
    <div class="glass-panel rounded-3xl p-5 sm:p-6 border border-yellow-500/40 space-y-5 relative overflow-hidden bg-slate-900/60">
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div class="flex items-center gap-3.5">
          <div class="w-11 h-11 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center text-slate-950 shadow-lg glow-gold shrink-0">
            <i data-lucide="calendar-range" class="w-6 h-6"></i>
          </div>
          <div>
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="text-lg sm:text-xl font-display font-extrabold text-white">
                3. Fechamento Mensal Consolidado da Cantina
              </h2>
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-yellow-500/20 text-yellow-300 border border-yellow-500/40">
                Consolidado do Mês
              </span>
            </div>
            <p class="text-xs text-slate-400">
              Soma total de presenças e valor de lanche acumulado por voluntário em todos os cultos do mês de <strong>${escapeHTML(monthLabel)}</strong>.
            </p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onclick="exportMonthlyCanteenPDF()"
            class="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-yellow-400 to-amber-500 hover:brightness-110 text-slate-950 font-extrabold text-xs sm:text-sm shadow-lg flex items-center gap-2 transition">
            <i data-lucide="file-text" class="w-4 h-4"></i>
            <span>Gerar PDF Mensal</span>
          </button>

          <button
            type="button"
            onclick="exportMonthlyCanteenExcel()"
            class="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-yellow-300 border border-yellow-500/40 font-extrabold text-xs sm:text-sm flex items-center gap-2 transition">
            <i data-lucide="table" class="w-4 h-4"></i>
            <span>Baixar Excel Mensal</span>
          </button>
        </div>
      </div>

      <!-- KPIs Mensais -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
          <span class="text-[10px] uppercase font-bold text-slate-400 block">Cultos Realizados</span>
          <strong class="text-lg sm:text-xl font-display font-extrabold text-cyan-400">${summary.totalServicesCount}</strong>
        </div>
        <div class="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
          <span class="text-[10px] uppercase font-bold text-slate-400 block">Voluntários Atendidos</span>
          <strong class="text-lg sm:text-xl font-display font-extrabold text-white">${summary.grandTotalVolunteers}</strong>
        </div>
        <div class="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
          <span class="text-[10px] uppercase font-bold text-slate-400 block">Lanches Consumidos</span>
          <strong class="text-lg sm:text-xl font-display font-extrabold text-amber-400">${summary.grandTotalSnacks}</strong>
        </div>
        <div class="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 text-center">
          <span class="text-[10px] uppercase font-bold text-slate-400 block">Valor Total (R$)</span>
          <strong class="text-lg sm:text-xl font-display font-extrabold text-emerald-400">R$ ${summary.grandTotalMoney.toFixed(2).replace('.', ',')}</strong>
        </div>
      </div>

      <!-- Tabela Resumo do Mês -->
      <div class="rounded-2xl overflow-hidden border border-slate-800 bg-slate-950">
        <div class="overflow-x-auto max-h-80">
          ${summary.memberRows.length === 0 ? `
            <div class="p-6 text-center text-slate-400 text-xs">
              Nenhuma presença registrada via QR Code ou escala no mês selecionado (${monthLabel}).
            </div>
          ` : `
            <table class="w-full text-left border-collapse text-xs">
              <thead>
                <tr class="bg-slate-900 text-slate-300 font-bold uppercase tracking-wider border-b border-slate-800">
                  <th class="py-2.5 px-4">Voluntário</th>
                  <th class="py-2.5 px-4 text-center">Cultos Presentes</th>
                  <th class="py-2.5 px-4 text-center">Valor Total</th>
                  <th class="py-2.5 px-4 text-center">Datas</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-800/80">
                ${summary.memberRows.map(r => `
                  <tr class="hover:bg-slate-900/50">
                    <td class="py-2.5 px-4 font-bold text-white">${escapeHTML(r.name)}</td>
                    <td class="py-2.5 px-4 text-center text-amber-300 font-semibold">${r.count} culto(s)</td>
                    <td class="py-2.5 px-4 text-center text-emerald-300 font-mono font-bold">R$ ${r.totalValue.toFixed(2).replace('.', ',')}</td>
                    <td class="py-2.5 px-4 text-center text-slate-400 text-[11px]">${escapeHTML(r.dates)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}
        </div>
      </div>
    </div>
  `;
}

function renderCanteenAndAttendanceReportGenerator() {
  const rows = ensureReportRowsInitialized();
  const cfg = state.reportConfig;
  const headerBanner = `${cfg.eventDate || '10.11'} - ${cfg.eventTitle || 'MÍDIA ASSEMBLEIA GERAL'}`;

  return `
    <div class="space-y-6">
      <!-- 1. RELATÓRIO DE FREQUÊNCIA (SEPARADO) -->
      ${renderAttendanceReportGenerator()}

      <!-- 2. RELATÓRIO EXCLUSIVO DA CANTINA (SEPARADO - IDÊNTICO À IMAGEM: NOME | VALOR | ASSINATURA) -->
      <div class="glass-panel rounded-3xl p-5 sm:p-6 border border-amber-500/40 space-y-5 relative overflow-hidden">
        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div class="flex items-center gap-3.5">
            <div class="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-slate-950 shadow-lg glow-gold shrink-0">
              <i data-lucide="utensils" class="w-6 h-6"></i>
            </div>
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h2 class="text-lg sm:text-xl font-display font-extrabold text-white">
                  2. Relatório Exclusivo da Cantina (NOME | VALOR | ASSINATURA)
                </h2>
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Separado do Relatório de Frequência
                </span>
              </div>
              <p class="text-xs text-slate-400">
                Aparece <strong>exclusivamente quem está escalado e presente no dia da escala</strong> (confirmado por QR Code ou Check-in). Colunas: <strong>NOME</strong>, <strong>VALOR</strong> e <strong>ASSINATURA</strong> em PDF e Excel.
              </p>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onclick="exportCanteenReportPDF()"
              class="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:brightness-110 text-slate-950 font-extrabold text-xs sm:text-sm shadow-lg flex items-center gap-2 transition">
              <i data-lucide="file-text" class="w-4 h-4"></i>
              <span>Gerar PDF da Cantina</span>
            </button>

            <button
              type="button"
              onclick="exportCanteenReportExcel()"
              class="px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/40 font-extrabold text-xs sm:text-sm flex items-center gap-2 transition">
              <i data-lucide="table" class="w-4 h-4"></i>
              <span>Baixar Excel da Cantina</span>
            </button>
          </div>
        </div>

        <!-- Painel de Configuração da Lista da Cantina -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 bg-slate-900/75 p-4 rounded-2xl border border-slate-800">
          <div>
            <label class="block text-[10px] font-bold uppercase tracking-wider text-cyan-300 mb-1">1. Escala / Culto do Dia</label>
            <select
              id="rep-schedule-select"
              onchange="handleReportFilterChange()"
              class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-cyan-400">
              ${state.schedules.length === 0 ? `
                <option value="none">Nenhuma escala criada ainda</option>
              ` : state.schedules.map(s => `
                <option value="${s.id}" ${s.id === cfg.scheduleId ? 'selected' : ''}>
                  ${escapeHTML(s.title)} — ${s.date} (${s.assignments.filter(a => a.status === 'confirmed').length}/${s.assignments.length} presentes)
                </option>
              `).join('')}
            </select>
          </div>

          <div>
            <label class="block text-[10px] font-bold uppercase tracking-wider text-cyan-300 mb-1">2. Filtrar Voluntários</label>
            <select
              id="rep-source-select"
              onchange="handleReportFilterChange()"
              class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-cyan-400">
              <option value="scheduled" ${(cfg.sourceFilter || 'scheduled') === 'scheduled' ? 'selected' : ''}>Escalados no Culto</option>
              <option value="qr_present" ${cfg.sourceFilter === 'qr_present' ? 'selected' : ''}>Apenas Presentes no QR Code</option>
              <option value="all" ${cfg.sourceFilter === 'all' ? 'selected' : ''}>Todos os ${state.members.length} Voluntários</option>
            </select>
          </div>

          <div>
            <label class="block text-[10px] font-bold uppercase tracking-wider text-amber-300 mb-1">3. Ordenação da Lista</label>
            <select
              id="rep-sort-select"
              onchange="handleReportFilterChange()"
              class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-amber-400">
              <option value="name_asc" ${(cfg.sort || 'name_asc') === 'name_asc' ? 'selected' : ''}>Ordem Alfabética (A a Z)</option>
              <option value="name_desc" ${cfg.sort === 'name_desc' ? 'selected' : ''}>Ordem Alfabética (Z a A)</option>
              <option value="date_desc" ${cfg.sort === 'date_desc' ? 'selected' : ''}>Data de Registro (Recentes)</option>
              <option value="date_asc" ${cfg.sort === 'date_asc' ? 'selected' : ''}>Data de Registro (Antigos)</option>
            </select>
          </div>

          <div>
            <label class="block text-[10px] font-bold uppercase tracking-wider text-amber-300 mb-1">4. Data na Barra Amarela</label>
            <input
              id="rep-date-input"
              type="text"
              value="${escapeHTML(cfg.eventDate)}"
              oninput="updateReportHeaderField('eventDate', this.value)"
              placeholder="Ex: 10.11"
              class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-amber-400" />
          </div>

          <div>
            <label class="block text-[10px] font-bold uppercase tracking-wider text-amber-300 mb-1">5. Título na Barra Amarela</label>
            <input
              id="rep-title-input"
              type="text"
              value="${escapeHTML(cfg.eventTitle)}"
              oninput="updateReportHeaderField('eventTitle', this.value)"
              placeholder="Ex: MIDIA ASSEMBLEIA GERAL"
              class="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-amber-400" />
          </div>

          <div>
            <label class="block text-[10px] font-bold uppercase tracking-wider text-emerald-300 mb-1">6. Valor Padrão Cantina</label>
            <div class="flex gap-1.5">
              <input
                id="rep-default-val"
                type="text"
                value="${escapeHTML(cfg.defaultValue)}"
                placeholder="Ex: R$ 20,00 ou livre"
                class="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-400" />
              <button
                type="button"
                onclick="applyDefaultValueToAllReportRows()"
                class="px-2.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-extrabold shrink-0">
                Aplicar
              </button>
            </div>
          </div>
        </div>

        <!-- Pré-visualização Idêntica à Planilha da Cantina (NOME | VALOR | ASSINATURA) -->
        <div class="rounded-2xl overflow-hidden border-2 border-amber-400/70 shadow-2xl bg-slate-950">
          <div
            id="canteen-preview-banner-text"
            class="bg-[#ffff00] text-black font-display font-extrabold text-base sm:text-lg text-center py-2.5 px-4 uppercase tracking-wide border-b-2 border-black">
            ${escapeHTML(headerBanner)}
          </div>

          <div class="overflow-x-auto max-h-96">
            ${rows.length === 0 ? `
              <div class="p-8 text-center space-y-2">
                <p class="text-sm font-bold text-amber-300">Nenhum voluntário encontrado com o filtro selecionado.</p>
                <p class="text-xs text-slate-400">
                  Alterne o filtro acima para "Todos os Voluntários" ou selecione outro culto na lista!
                </p>
              </div>
            ` : `
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="bg-slate-400 text-black text-xs font-display font-extrabold uppercase tracking-wider border-b-2 border-black">
                    <th class="py-2.5 px-4 text-center border-r border-slate-700 w-5/12">NOME</th>
                    <th class="py-2.5 px-4 text-center border-r border-slate-700 w-3/12">VALOR</th>
                    <th class="py-2.5 px-4 text-center border-r border-slate-700 w-4/12">ASSINATURA</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-800 text-xs">
                  ${rows.map(row => `
                    <tr class="hover:bg-slate-900/80 transition">
                      <td class="py-2 px-3 border-r border-slate-800 text-center font-bold text-white uppercase">
                        ${escapeHTML(row.name)}
                      </td>
                      <td class="py-1.5 px-3 border-r border-slate-800">
                        <input
                          type="text"
                          value="${escapeHTML(row.value || '')}"
                          placeholder="R$ --"
                          oninput="updateReportRowField('${row.id}', 'value', this.value)"
                          class="w-full bg-slate-900/70 border border-slate-800 focus:border-amber-400 text-amber-300 text-center font-bold px-2 py-1 rounded-lg focus:outline-none" />
                      </td>
                      <td class="py-1.5 px-3 border-r border-slate-800 text-center">
                        ${row.signatureImage ? `
                          <img src="${row.signatureImage}" class="h-8 max-w-[140px] mx-auto object-contain bg-white rounded p-0.5 border border-slate-700" alt="Rubrica" />
                        ` : `
                          <span class="text-slate-500 italic text-[11px] block">— Limpo para assinatura a caneta —</span>
                        `}
                        <button
                          type="button"
                          onclick="openSignatureModal('${row.id}')"
                          class="text-[10px] text-amber-300 hover:text-amber-200 font-bold underline mt-1 block mx-auto transition">
                          ${row.signatureImage ? 'Alterar Rubrica Digital' : '✍️ Rubricar no App (Opcional)'}
                        </button>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            `}
          </div>
        </div>
      </div>

      <!-- 3. FECHAMENTO MENSAL CONSOLIDADO DA CANTINA (TODOS OS CULTOS DO MÊS) -->
      ${renderMonthlyCanteenReportGenerator()}
    </div>
  `;
}


function showToast(message, tone = 'cyan') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  const borderColors = {
    cyan: 'border-cyan-400/50 bg-slate-900/95 text-cyan-200',
    amber: 'border-amber-400/50 bg-slate-900/95 text-amber-200',
    emerald: 'border-emerald-400/50 bg-slate-900/95 text-emerald-200',
    rose: 'border-rose-400/50 bg-slate-900/95 text-rose-200'
  };
  toast.className = `flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-xl text-sm font-medium animate-view ${borderColors[tone] || borderColors.cyan}`;
  toast.innerHTML = `
    <i data-lucide="sparkles" class="w-4 h-4 shrink-0"></i>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  if (window.lucide) window.lucide.createIcons();
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.25s ease';
    setTimeout(() => toast.remove(), 260);
  }, 3200);
}

// ============================================================================
// CONTROLE DE MODO (DIRETOR vs EQUIPE) E NAVEGAÇÃO
// ============================================================================

function setMode(newMode) {
  const logged = getLoggedInUser();
  if (!isPrivilegedUser(logged) && newMode === 'director') {
    showToast('Acesso restrito: apenas o Diretor Geral, Líderes e Desenvolvedor podem acessar o modo Diretor.', 'rose');
    return;
  }
  state.mode = newMode;
  if (newMode === 'team' && state.activeTab === 'schedules') {
    state.activeTab = 'my_area';
  } else if (newMode === 'director' && state.activeTab === 'my_area') {
    state.activeTab = 'schedules';
  }
  saveLocalCacheOnly();
  renderApp();
  const modeLabel = newMode === 'director' ? 'Modo Diretor de Mídia ativado' : 'Modo Membro da Equipe ativado';
  showToast(modeLabel, newMode === 'director' ? 'amber' : 'cyan');
}

function setActiveTab(tab) {
  const logged = getLoggedInUser();
  const effective = getEffectiveUser();
  const canAccess = isPrivilegedUser(logged) || isPrivilegedUser(effective);
  if (!canAccess && (tab === 'members' || tab === 'reports')) {
    showToast('Privacidade ativa: apenas a liderança pode visualizar esta área.', 'rose');
    return;
  }
  state.activeTab = tab;
  renderApp();
}

function setActiveMember(memberId, redirectToTab = null) {
  const logged = getLoggedInUser();
  if (!isPrivilegedUser(logged) && memberId !== logged?.id) {
    showToast('Privacidade ativa: você não pode acessar ou trocar para outro usuário.', 'rose');
    renderApp();
    return;
  }
  if (memberId === state.activeMemberId) {
    if (redirectToTab) setActiveTab(redirectToTab);
    return;
  }
  const targetMember = getMemberById(memberId);
  if (!targetMember) return;

  // Sempre exigir a senha do novo usuário ao trocar de perfil
  openSwitchUserModal(targetMember, redirectToTab);
}

function openSwitchUserModal(targetMember, redirectToTab = null) {
  const modal = document.getElementById('modal-switch-user');
  if (!modal) return;
  document.getElementById('switch-user-id').value = targetMember.id;
  document.getElementById('switch-user-tab').value = redirectToTab || '';
  document.getElementById('switch-user-name').textContent = targetMember.name;
  document.getElementById('switch-user-email').textContent = targetMember.email || '';
  const passInput = document.getElementById('switch-user-password');
  if (passInput) {
    passInput.value = '';
    setTimeout(() => passInput.focus(), 80);
  }
  modal.classList.remove('hidden');
}

function closeSwitchUserModal() {
  document.getElementById('modal-switch-user')?.classList.add('hidden');
  renderApp(); // Restore select dropdown to the current activeMemberId if cancelled
}

function handleConfirmSwitchUser(e) {
  e.preventDefault();
  const memberId = document.getElementById('switch-user-id')?.value;
  const redirectToTab = document.getElementById('switch-user-tab')?.value;
  const enteredPass = (document.getElementById('switch-user-password')?.value || '').trim();

  const targetMember = getMemberById(memberId);
  if (!targetMember) {
    closeSwitchUserModal();
    return;
  }

  const expectedPass = targetMember.password || 'midia123';
  if (enteredPass !== expectedPass) {
    showToast(`Senha incorreta para o usuário ${targetMember.name}! A troca de perfil foi bloqueada.`, 'rose');
    return;
  }

  state.authEmail = targetMember.email || state.authEmail;
  state.activeMemberId = targetMember.id;
  const isAdminOrDirector = isPrivilegedUser(targetMember);
  state.mode = isAdminOrDirector ? state.mode : 'team';
  if (redirectToTab) {
    state.activeTab = redirectToTab;
  } else if (!isAdminOrDirector && state.activeTab === 'members') {
    state.activeTab = 'my_area';
  }

  document.getElementById('modal-switch-user')?.classList.add('hidden');
  saveLocalCacheOnly();
  renderApp();
  showToast(`Autenticado com sucesso! Perfil alterado para ${targetMember.name}.`, 'emerald');
}

function selectSchedule(scheduleId) {
  state.selectedScheduleId = scheduleId;
  renderApp();
}

// ============================================================================
// AÇÕES DE ESCALA (SORTEIO INTELIGENTE, CHECK-IN, TROCA, WHATSAPP)
// ============================================================================

function updateAssignment(scheduleId, roleId, memberId) {
  const schedule = state.schedules.find(s => s.id === scheduleId);
  if (!schedule) return;

  const existingIdx = schedule.assignments.findIndex(a => a.roleId === roleId);
  if (!memberId) {
    if (existingIdx !== -1) schedule.assignments.splice(existingIdx, 1);
  } else {
    const member = getMemberById(memberId);
    const blocked = isMemberBlockedOnDate(member, schedule.date);
    if (blocked) {
      if (!confirm(`⚠️ ATENÇÃO (Voluts Bloqueio): ${member.name} informou que NÃO PODE servir nesta data (${schedule.date}).\nMotivo: "${blocked.reason}".\n\nDeseja escalar mesmo assim?`)) {
        renderApp();
        return;
      }
    }

    // Check if member is already assigned to another role in this same service
    const duplicate = schedule.assignments.find(a => a.memberId === memberId && a.roleId !== roleId);
    if (duplicate) {
      const dupRole = getRoleById(duplicate.roleId);
      if (!confirm(`${member.name} já está escalado(a) em "${dupRole.shortName}" neste mesmo culto. Deseja escalar em ambas as funções?`)) {
        renderApp();
        return;
      }
    }

    if (existingIdx !== -1) {
      schedule.assignments[existingIdx].memberId = memberId;
      schedule.assignments[existingIdx].status = 'pending';
      delete schedule.assignments[existingIdx].swapNote;
    } else {
      schedule.assignments.push({ roleId, memberId, status: 'pending' });
    }
  }

  saveData();
  renderApp();
  showToast('Escala atualizada!', 'cyan');
}

function toggleAssignmentStatus(scheduleId, roleId, newStatus, customNote = '') {
  const schedule = state.schedules.find(s => s.id === scheduleId);
  if (!schedule) return;
  const assignment = schedule.assignments.find(a => a.roleId === roleId);
  if (!assignment) return;

  assignment.status = newStatus;
  if (customNote) {
    assignment.swapNote = customNote;
  } else if (newStatus === 'confirmed') {
    delete assignment.swapNote;
  }

  saveData();
  renderApp();

  if (newStatus === 'confirmed') {
    showToast('Presença confirmada na escala! Bom culto!', 'emerald');
  } else if (newStatus === 'swap_requested') {
    showToast('Solicitação de troca registrada para o Diretor.', 'amber');
  }
}

function promptSwapRequest(scheduleId, roleId) {
  const reason = prompt('Informe o motivo ou com quem deseja trocar esta escala:');
  if (reason === null) return;
  toggleAssignmentStatus(scheduleId, roleId, 'swap_requested', reason.trim() || 'Solicitou substituição');
}

function autoFillSchedule(scheduleId) {
  const schedule = state.schedules.find(s => s.id === scheduleId);
  if (!schedule) return;

  // Count how many times each member is already scheduled across all schedules to balance workload
  const workload = {};
  state.members.forEach(m => { workload[m.id] = 0; });
  state.schedules.forEach(s => {
    if (s.id !== scheduleId) {
      s.assignments.forEach(a => {
        if (workload[a.memberId] !== undefined) workload[a.memberId]++;
      });
    }
  });

  const usedInThisSchedule = new Set();
  const newAssignments = [];

  // Keep already confirmed assignments if user wants, or fill empty/all
  const existingMap = {};
  schedule.assignments.forEach(a => {
    if (a.memberId && a.status === 'confirmed') {
      existingMap[a.roleId] = a;
      usedInThisSchedule.add(a.memberId);
    }
  });

  state.roles.forEach(role => {
    if (existingMap[role.id]) {
      newAssignments.push(existingMap[role.id]);
      return;
    }

    // Find eligible active members who have this skill, aren't blocked on this date, and aren't used yet in this service
    let candidates = state.members.filter(
      m => m.active && m.skills.includes(role.id) && !isMemberBlockedOnDate(m, schedule.date) && !usedInThisSchedule.has(m.id)
    );

    if (candidates.length === 0) {
      // Fallback: any active member with this skill who isn't blocked on this date
      candidates = state.members.filter(m => m.active && m.skills.includes(role.id) && !isMemberBlockedOnDate(m, schedule.date));
    }

    if (candidates.length > 0) {
      // Sort by lowest workload with slight shuffle for fairness
      candidates.sort((a, b) => (workload[a.id] - workload[b.id]) || (Math.random() - 0.5));
      const chosen = candidates[0];
      usedInThisSchedule.add(chosen.id);
      workload[chosen.id]++;
      newAssignments.push({
        roleId: role.id,
        memberId: chosen.id,
        status: 'pending'
      });
    }
  });

  schedule.assignments = newAssignments;
  saveData();
  renderApp();
  showToast('Escala gerada automaticamente com equilíbrio de funções!', 'amber');
}

function copyScheduleForWhatsApp(scheduleId) {
  const schedule = state.schedules.find(s => s.id === scheduleId);
  if (!schedule) return;
  const d = formatDateBR(schedule.date);

  let lines = [
    `🔥 *ESCALA OFICIAL — AD MÍDIA HUB* 🔥`,
    `⛪ *${schedule.title}* (${schedule.category})`,
    `📅 *Data:* ${d.full}/${d.year}`,
    `⏰ *Chegada (Briefing):* ${schedule.callTime} | *Início:* ${schedule.startTime}`,
    `👕 *Dress Code:* ${schedule.dressCode || 'Padrão Mídia'}`,
    ``
  ];

  const categories = [...new Set(state.roles.map(r => r.category))];
  categories.forEach(cat => {
    lines.push(`*▸ ${cat.toUpperCase()}*`);
    const rolesInCat = state.roles.filter(r => r.category === cat);
    rolesInCat.forEach(role => {
      const assign = schedule.assignments.find(a => a.roleId === role.id);
      const member = assign ? getMemberById(assign.memberId) : null;
      const statusIcon = !assign ? '⚪' : assign.status === 'confirmed' ? '✅' : assign.status === 'swap_requested' ? '⚠️' : '⏳';
      lines.push(`${statusIcon} *${role.shortName}:* ${member ? member.name : '_Vaga aberta_'}`);
    });
    lines.push('');
  });

  if (schedule.notes) {
    lines.push(`📌 *Diretrizes da Direção:* ${schedule.notes}`);
    lines.push('');
  }

  lines.push(`📲 *Confirme sua presença no App:* ${getAppBaseUrl()}/`);
  lines.push(`_Que Deus abençoe nosso ministério e culto!_ 🙌`);

  const text = lines.join('\n');
  navigator.clipboard.writeText(text).then(() => {
    showToast('Escala formatada copiada! Pronto para colar no grupo do WhatsApp.', 'emerald');
  }).catch(() => {
    prompt('Copie o texto abaixo para o WhatsApp:', text);
  });
}

// ============================================================================
// MODAIS: NOVO CULTO/ESCALA & NOVO MEMBRO
// ============================================================================

function applyScheduleTemplate(templateKey) {
  const titleInput = document.getElementById('sched-title');
  const catInput = document.getElementById('sched-category');
  const callInput = document.getElementById('sched-call');
  const startInput = document.getElementById('sched-start');
  const dressInput = document.getElementById('sched-dress');
  const notesInput = document.getElementById('sched-notes');

  const templates = {
    domingo: {
      title: 'Culto da Família & Celebração',
      category: 'Culto de Domingo',
      callTime: '17:15',
      startTime: '18:00',
      dressCode: 'All Black (Preto Total) + Crachá Mídia',
      notes: 'Chegada 45 min antes para testes de áudio, bateria de câmeras e transmissão ao vivo.',
      targetVolunteers: 15
    },
    terca: {
      title: 'Culto de Ensino & Doutrina',
      category: 'Doutrina (Terça)',
      callTime: '18:45',
      startTime: '19:30',
      dressCode: 'Camisa Mídia ou Social Escuro',
      notes: 'Atenção aos slides e passagens bíblicas na projeção e na transmissão online.',
      targetVolunteers: 8
    },
    quinta: {
      title: 'Culto de Vitória & Campanha',
      category: 'Campanha (Quinta)',
      callTime: '18:45',
      startTime: '19:30',
      dressCode: 'All Black (Preto Total) + Crachá Mídia',
      notes: 'Cobertura de oração e testemunhos. Foco nas câmeras dinâmicas e fotos.',
      targetVolunteers: 8
    },
    sabado: {
      title: 'Culto Conectados — Jovens UMAD',
      category: 'Culto de Jovens',
      callTime: '18:30',
      startTime: '19:30',
      dressCode: 'Camisa Mídia ou All Black Jovem',
      notes: 'Transmissão dinâmica, captação para Reels/Stories em tempo real e fotos no hall.',
      targetVolunteers: 12
    },
    santaceia: {
      title: 'Santa Ceia Geral do Senhor',
      category: 'Santa Ceia',
      callTime: '17:00',
      startTime: '18:00',
      dressCode: 'Traje Social Completo + Crachá Oficial',
      notes: 'Culto solene com alta audiência. Checagem prévia de gravação em 4K e redundância.',
      targetVolunteers: 15
    }
  };

  const tpl = templates[templateKey];
  if (!tpl) return;

  if (titleInput) titleInput.value = tpl.title;
  if (catInput) catInput.value = tpl.category;
  if (callInput) callInput.value = tpl.callTime;
  if (startInput) startInput.value = tpl.startTime;
  if (dressInput) dressInput.value = tpl.dressCode;
  if (notesInput) notesInput.value = tpl.notes;
  const targetInp = document.getElementById('sched-target-volunteers');
  if (targetInp) targetInp.value = tpl.targetVolunteers || 15;

  showToast(`⚡ Modelo "${tpl.title}" aplicado!`, 'emerald');
}

function sendIndividualWhatsAppReminder(schedId, roleId, memberId) {
  const sched = state.schedules.find(s => s.id === schedId);
  const role = state.roles.find(r => r.id === roleId);
  const member = getMemberById(memberId);

  if (!sched || !role || !member) {
    showToast('Dados da escala incompletos.', 'rose');
    return;
  }

  let phone = (member.phone || '').replace(/\D/g, '');
  if (!phone) {
    const input = prompt(`O voluntário ${member.name} não possui celular cadastrado. Digite o WhatsApp com DDD (Ex: 99981234567):`);
    if (!input) return;
    phone = input.replace(/\D/g, '');
    member.phone = phone;
    saveData();
  }

  if (phone.length === 10 || phone.length === 11) {
    phone = '55' + phone;
  }

  const d = formatDateBR(sched.date);
  const dateFormatted = d.full || sched.date;

  const msg =
    `*GRAÇA E PAZ, ${member.name.toUpperCase()}!* 🙏\n\n` +
    `📌 *LEMBRETE DE ESCALA — AD MÍDIA*\n` +
    `⛪ *Culto:* ${sched.title}\n` +
    `📅 *Data:* ${dateFormatted}\n` +
    `⏰ *Horário de Chegada (Call Time):* ${sched.callTime}\n` +
    `🎬 *Início do Culto / Live:* ${sched.startTime}\n` +
    `🎯 *Sua Função:* ${role.shortName} (${role.name})\n` +
    `📍 *Posto de Operação:* ${role.station}\n` +
    `👔 *Dress Code:* ${sched.dressCode || 'Preto Padrão'}\n\n` +
    `📲 *Confirme sua presença no App:* ${getAppBaseUrl()}/\n\n` +
    `_Que Deus abençoe seu ministério! Contamos com sua dedicação e pontualidade._ 🙌`;

  const url = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  window.open(url, '_blank');
  showToast(`Lembrete WhatsApp gerado para ${member.name}!`, 'emerald');
}

function openNewScheduleModal() {
  const modal = document.getElementById('modal-schedule');
  if (!modal) return;
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('sched-title').value = '';
  document.getElementById('sched-category').value = 'Culto de Domingo';
  document.getElementById('sched-date').value = today;
  document.getElementById('sched-call').value = '17:30';
  document.getElementById('sched-start').value = '18:00';
  document.getElementById('sched-dress').value = 'All Black (Preto Total) + Crachá';
  document.getElementById('sched-notes').value = '';
  const targetInp = document.getElementById('sched-target-volunteers');
  if (targetInp) targetInp.value = '15';
  modal.classList.remove('hidden');
}

function closeScheduleModal() {
  document.getElementById('modal-schedule')?.classList.add('hidden');
}

// ============================================================================
// MODAL: AJUSTE RÁPIDO DA ESCALA (ADICIONAR OU REMOVER VOLUNTÁRIOS)
// ============================================================================

function openAdjustScheduleModal(scheduleId = null) {
  const targetId = scheduleId || state.selectedScheduleId || state.schedules[0]?.id;
  if (!targetId) {
    showToast('Nenhum culto ou evento encontrado para ajustar.', 'rose');
    return;
  }
  const sched = state.schedules.find(s => s.id === targetId);
  if (!sched) {
    showToast('Culto não encontrado.', 'rose');
    return;
  }

  state.selectedScheduleId = targetId;
  const modal = document.getElementById('modal-adjust-schedule');
  if (!modal) return;

  renderAdjustScheduleModalContent(targetId);
  modal.classList.remove('hidden');
  if (window.lucide) window.lucide.createIcons();
}

function closeAdjustScheduleModal() {
  const modal = document.getElementById('modal-adjust-schedule');
  if (modal) modal.classList.add('hidden');
}

function renderAdjustScheduleModalContent(scheduleId) {
  const container = document.getElementById('adjust-schedule-container');
  const titleEl = document.getElementById('adjust-schedule-title');
  const subtitleEl = document.getElementById('adjust-schedule-subtitle');
  const countEl = document.getElementById('adjust-schedule-count');
  if (!container) return;

  const sched = state.schedules.find(s => s.id === scheduleId);
  if (!sched) return;

  const d = formatDateBR(sched.date);
  const assignments = Array.isArray(sched.assignments) ? sched.assignments : [];
  const confirmedCount = assignments.filter(a => a.status === 'confirmed').length;
  const targetPositions = getScheduleTargetPositions(sched);

  if (titleEl) titleEl.textContent = `Ajustar Escala: ${sched.title}`;
  if (subtitleEl) subtitleEl.textContent = `${d.full} de ${d.year} • Início: ${sched.startTime} • Local: ${sched.location}`;
  if (countEl) countEl.textContent = `${assignments.length} de ${targetPositions} voluntários escalados (${confirmedCount} confirmados)`;

  // Member options
  const assignedMemberIds = new Set(assignments.map(a => a.memberId));
  const sortedMembers = [...state.members].sort((a, b) => a.name.localeCompare(b.name));

  // Occupied roles map
  const occupiedRoleIds = new Map();
  assignments.forEach(a => {
    occupiedRoleIds.set(a.roleId, a.memberId);
  });

  const percentFilled = targetPositions > 0 ? Math.min(100, Math.round((assignments.length / targetPositions) * 100)) : 100;

  container.innerHTML = `
    <!-- 0. CONTROLE DA QUANTIDADE DE VOLUNTÁRIOS NA ESCALA (META DE VAGAS) -->
    <div class="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-slate-900 to-cyan-500/10 border border-amber-500/35 space-y-3.5 shadow-xl">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div class="flex items-center gap-2">
            <h4 class="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
              <i data-lucide="target" class="w-4 h-4 text-amber-400"></i>
              <span>Meta / Quantidade de Voluntários Neste Culto</span>
            </h4>
            <span class="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
              Vagas Definidas
            </span>
          </div>
          <p class="text-[11px] text-slate-400 mt-1">
            Ajuste a quantidade exata de pessoas que você precisa nesta escala (ex: 4 para culto menor, 8 para semana ou 15 para domingo).
          </p>
        </div>

        <!-- Seletor / Stepper de Quantidade -->
        <div class="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-700 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onclick="updateScheduleTargetVolunteers('${sched.id}', ${Math.max(1, targetPositions - 1)})"
            title="Diminuir quantidade de vagas"
            class="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-sm flex items-center justify-center transition">
            -
          </button>
          <input
            type="number"
            min="1"
            max="50"
            value="${targetPositions}"
            onchange="updateScheduleTargetVolunteers('${sched.id}', this.value)"
            class="w-14 bg-transparent text-center font-display font-extrabold text-base text-amber-300 focus:outline-none" />
          <button
            type="button"
            onclick="updateScheduleTargetVolunteers('${sched.id}', ${targetPositions + 1})"
            title="Aumentar quantidade de vagas"
            class="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-sm flex items-center justify-center transition">
            +
          </button>
          <span class="text-xs font-bold text-slate-300 pr-2">vagas</span>
        </div>
      </div>

      <!-- Atalhos Rápidos de Quantidade -->
      <div class="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/80">
        <span class="text-[10px] uppercase font-bold text-slate-400 mr-1">Atalhos rápidos:</span>
        <button
          type="button"
          onclick="updateScheduleTargetVolunteers('${sched.id}', 4)"
          class="px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${targetPositions === 4 ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'}">
          4 Vagas (Mínimo)
        </button>
        <button
          type="button"
          onclick="updateScheduleTargetVolunteers('${sched.id}', 6)"
          class="px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${targetPositions === 6 ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'}">
          6 Vagas (Básico)
        </button>
        <button
          type="button"
          onclick="updateScheduleTargetVolunteers('${sched.id}', 8)"
          class="px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${targetPositions === 8 ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'}">
          8 Vagas (Culto Semanal)
        </button>
        <button
          type="button"
          onclick="updateScheduleTargetVolunteers('${sched.id}', 10)"
          class="px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${targetPositions === 10 ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'}">
          10 Vagas (Intermediário)
        </button>
        <button
          type="button"
          onclick="updateScheduleTargetVolunteers('${sched.id}', 12)"
          class="px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${targetPositions === 12 ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'}">
          12 Vagas (Padrão)
        </button>
        <button
          type="button"
          onclick="updateScheduleTargetVolunteers('${sched.id}', 15)"
          class="px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${targetPositions === 15 ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'}">
          15 Vagas (Completo)
        </button>
        <button
          type="button"
          onclick="updateScheduleTargetVolunteers('${sched.id}', 18)"
          class="px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${targetPositions === 18 ? 'bg-amber-500 text-slate-950 border-amber-400' : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'}">
          18 Vagas (Grande Evento)
        </button>
      </div>

      <!-- Barra de Progresso da Quantidade Escalada -->
      <div>
        <div class="flex items-center justify-between text-[11px] font-bold mb-1">
          <span class="text-slate-300">Preenchimento da Quantidade Desejada:</span>
          <span class="${assignments.length >= targetPositions ? 'text-emerald-300' : 'text-amber-300'} font-extrabold">
            ${assignments.length} de ${targetPositions} voluntários escalados (${percentFilled}%)
          </span>
        </div>
        <div class="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
          <div
            class="h-full rounded-full transition-all duration-300 ${assignments.length >= targetPositions ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-amber-500 to-orange-400'}"
            style="width: ${percentFilled}%"></div>
        </div>
      </div>
    </div>

    <!-- 1. PAINEL DE ADICIONAR VOLUNTÁRIO -->
    <div class="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-cyan-500/30 space-y-3.5 shadow-xl">
      <div class="flex items-center justify-between">
        <h4 class="text-xs font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
          <i data-lucide="user-plus" class="w-4 h-4 text-cyan-400"></i>
          <span>1. Adicionar Voluntário à Escala</span>
        </h4>
        <span class="text-[10px] text-slate-400 font-semibold">${state.members.length} membros no banco</span>
      </div>

      <form onsubmit="addVolunteerToScheduleSubmit(event, '${sched.id}')" class="space-y-3">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <!-- Seletor de Voluntário -->
          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
              Selecione o Voluntário *
            </label>
            <select
              id="adjust-add-member"
              required
              class="w-full bg-slate-900/90 border border-slate-700 focus:border-cyan-400 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none">
              <option value="">-- Selecione quem vai servir --</option>
              ${sortedMembers.map(m => {
                const isAssigned = assignedMemberIds.has(m.id);
                const assignedRole = isAssigned ? assignments.find(a => a.memberId === m.id) : null;
                const roleObj = assignedRole ? getRoleById(assignedRole.roleId) : null;
                const blk = isMemberBlockedOnDate(m, sched.date);
                const tag = isAssigned
                  ? `[JÁ ESCALADO: ${roleObj?.shortName || 'Função'}]`
                  : blk
                  ? `[🚫 INDISPONÍVEL: ${blk.reason}]`
                  : `(Disponível)`;
                return `
                  <option value="${m.id}">
                    ${escapeHTML(m.name)} • ${escapeHTML(m.congregation || 'Sede')} ${tag}
                  </option>
                `;
              }).join('')}
            </select>
          </div>

          <!-- Seletor de Função -->
          <div>
            <label class="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-1">
              Função / Posição *
            </label>
            <select
              id="adjust-add-role"
              required
              class="w-full bg-slate-900/90 border border-slate-700 focus:border-cyan-400 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none">
              <option value="">-- Escolha a função --</option>
              <optgroup label="Estações Oficiais da Mídia">
                ${state.roles.map(r => {
                  const occupiedMemberId = occupiedRoleIds.get(r.id);
                  const occupiedMember = occupiedMemberId ? getMemberById(occupiedMemberId) : null;
                  const tag = occupiedMember
                    ? `(Ocupada por ${occupiedMember.name})`
                    : `[✓ VAGA ABERTA]`;
                  return `
                    <option value="${r.id}">
                      ${escapeHTML(r.shortName)} • ${escapeHTML(r.category)} ${tag}
                    </option>
                  `;
                }).join('')}
              </optgroup>
              <optgroup label="★ Vagas Extras / Adicionais">
                <option value="extra_apoio">★ Vaga Extra: Apoio Geral de Mídia</option>
                <option value="extra_camera">★ Vaga Extra: Cinegrafista Adicional</option>
                <option value="extra_foto">★ Vaga Extra: Fotógrafo Adicional</option>
                <option value="extra_social">★ Vaga Extra: Social Media Adicional</option>
                <option value="extra_intercom">★ Vaga Extra: Operador de Intercom</option>
              </optgroup>
            </select>
          </div>
        </div>

        <div class="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <div class="flex items-center gap-2 w-full sm:w-auto">
            <label class="text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0">Status:</label>
            <select
              id="adjust-add-status"
              class="bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none">
              <option value="confirmed" selected>✓ Já Confirmado (Presente)</option>
              <option value="pending">⏳ Pendente de Confirmação</option>
            </select>
          </div>

          <button
            type="submit"
            class="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 hover:brightness-110 active:scale-95 text-slate-950 font-extrabold text-xs shadow-lg glow-emerald flex items-center justify-center gap-2 transition shrink-0">
            <i data-lucide="plus-circle" class="w-4 h-4"></i>
            <span>Adicionar à Escala</span>
          </button>
        </div>
      </form>
    </div>

    <!-- 2. LISTA DE VOLUNTÁRIOS ATUALMENTE ESCALADOS -->
    <div class="space-y-3">
      <div class="flex flex-wrap items-center justify-between gap-2 px-1">
        <h4 class="text-xs font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
          <i data-lucide="users" class="w-4 h-4 text-amber-400"></i>
          <span>2. Voluntários Escalados Neste Culto (${assignments.length})</span>
        </h4>

        ${assignments.length > 0 ? `
          <button
            type="button"
            onclick="clearAllVolunteersFromSchedule('${sched.id}')"
            class="text-[11px] text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 hover:underline transition">
            <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            <span>Limpar Todos os Voluntários</span>
          </button>
        ` : ''}
      </div>

      ${assignments.length === 0 ? `
        <div class="p-8 text-center rounded-2xl bg-slate-900/60 border border-slate-800 space-y-3">
          <div class="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-300">
            <i data-lucide="users" class="w-6 h-6"></i>
          </div>
          <div>
            <h5 class="text-sm font-bold text-white">Nenhum voluntário escalado ainda</h5>
            <p class="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Utilize o formulário acima para adicionar voluntários, ou clique abaixo para auto-escalar a equipe com base nas habilidades.
            </p>
          </div>
          <button
            type="button"
            onclick="autoFillSchedule('${sched.id}'); renderAdjustScheduleModalContent('${sched.id}');"
            class="px-4 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold inline-flex items-center gap-2 transition">
            <i data-lucide="wand-2" class="w-4 h-4"></i>
            <span>Auto-Escalar Equipe Agora</span>
          </button>
        </div>
      ` : `
        <div class="space-y-2 max-h-96 overflow-y-auto pr-1">
          ${assignments.map(a => {
            const member = getMemberById(a.memberId);
            const role = getRoleById(a.roleId);
            const isConfirmed = a.status === 'confirmed';

            return `
              <div class="p-3 sm:p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition">
                <!-- Info do Membro -->
                <div class="flex items-center gap-3 min-w-0">
                  ${member ? renderMemberAvatar(member, 'w-10 h-10 rounded-xl text-xs', false) : `
                    <div class="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                      <i data-lucide="user" class="w-5 h-5"></i>
                    </div>
                  `}
                  <div class="min-w-0">
                    <h5 class="text-xs sm:text-sm font-bold text-white truncate">
                      ${escapeHTML(member?.name || 'Voluntário não encontrado')}
                    </h5>
                    <p class="text-[11px] text-slate-400 flex items-center gap-1.5 flex-wrap">
                      <span class="text-cyan-300 font-medium">${escapeHTML(member?.congregation || 'Sede')}</span>
                      <span>•</span>
                      <span class="text-slate-400">${escapeHTML(member?.roleType === 'leader' ? 'Líder' : member?.roleType === 'director' ? 'Diretor' : 'Voluntário')}</span>
                      ${member?.phone ? `
                        <span>•</span>
                        <span class="font-mono text-[10px] text-slate-400">${escapeHTML(member.phone)}</span>
                      ` : ''}
                    </p>
                  </div>
                </div>

                <!-- Função e Ações de Ajuste / Remoção -->
                <div class="flex items-center gap-2 shrink-0 justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800/80">
                  <!-- Seletor de Troca Rápida de Função -->
                  <select
                    onchange="changeVolunteerRoleInSchedule('${sched.id}', '${a.roleId}', this.value)"
                    title="Trocar a função deste voluntário na escala"
                    class="bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-xl px-2.5 py-1.5 text-[11px] text-white font-semibold focus:outline-none max-w-[150px]">
                    ${state.roles.map(r => `
                      <option value="${r.id}" ${r.id === a.roleId ? 'selected' : ''}>
                        ${escapeHTML(r.shortName)}
                      </option>
                    `).join('')}
                  </select>

                  <!-- Toggle Confirmado / Pendente -->
                  <button
                    type="button"
                    onclick="toggleAssignmentStatus('${sched.id}', '${a.roleId}', '${isConfirmed ? 'pending' : 'confirmed'}'); renderAdjustScheduleModalContent('${sched.id}');"
                    title="${isConfirmed ? 'Confirmado (Clique para alterar para Pendente)' : 'Pendente (Clique para confirmar)'}"
                    class="p-2 rounded-xl border text-xs font-bold transition ${
                      isConfirmed
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                        : 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                    }">
                    <i data-lucide="${isConfirmed ? 'check' : 'clock'}" class="w-3.5 h-3.5"></i>
                  </button>

                  <!-- BOTÃO REMOVER VOLUNTÁRIO DA ESCALA -->
                  <button
                    type="button"
                    onclick="removeVolunteerAssignment('${sched.id}', '${a.roleId}')"
                    title="Remover ${escapeHTML(member?.name || 'voluntário')} desta escala"
                    class="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-extrabold flex items-center gap-1.5 active:scale-95 transition">
                    <i data-lucide="user-minus" class="w-3.5 h-3.5"></i>
                    <span>Remover</span>
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `}
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();
}

function addVolunteerToScheduleSubmit(event, scheduleId) {
  if (event) event.preventDefault();
  const schedule = state.schedules.find(s => s.id === scheduleId);
  if (!schedule) return;

  const memberSelect = document.getElementById('adjust-add-member');
  const roleSelect = document.getElementById('adjust-add-role');
  const statusSelect = document.getElementById('adjust-add-status');

  const memberId = memberSelect?.value;
  const roleId = roleSelect?.value;
  const status = statusSelect?.value || 'confirmed';

  if (!memberId) {
    showToast('Por favor, selecione um voluntário.', 'rose');
    return;
  }
  if (!roleId) {
    showToast('Por favor, selecione a função na escala.', 'rose');
    return;
  }

  const member = getMemberById(memberId);
  const role = getRoleById(roleId);

  // Check if someone is already in this role
  const existingAssign = schedule.assignments.find(a => a.roleId === roleId);
  if (existingAssign && existingAssign.memberId !== memberId) {
    const prevMember = getMemberById(existingAssign.memberId);
    if (!confirm(`A função "${role.shortName}" já está ocupada por ${prevMember ? prevMember.name : 'outro voluntário'}.\nDeseja substituir por ${member.name}?`)) {
      return;
    }
    existingAssign.memberId = memberId;
    existingAssign.status = status;
  } else if (existingAssign && existingAssign.memberId === memberId) {
    existingAssign.status = status;
  } else {
    // Check if member is already assigned in another role
    const dup = schedule.assignments.find(a => a.memberId === memberId);
    if (dup) {
      const dupRole = getRoleById(dup.roleId);
      if (!confirm(`${member.name} já está escalado(a) em "${dupRole.shortName}".\n\nDeseja escalar também na função "${role.shortName}"?`)) {
        return;
      }
    }
    schedule.assignments.push({
      roleId,
      memberId,
      status
    });
  }

  saveData();
  renderApp();
  renderAdjustScheduleModalContent(scheduleId);
  showToast(`${member.name} adicionado(a) à escala na função ${role.shortName}!`, 'emerald');
}

function removeVolunteerAssignment(scheduleId, roleId) {
  const schedule = state.schedules.find(s => s.id === scheduleId);
  if (!schedule) return;

  const idx = schedule.assignments.findIndex(a => a.roleId === roleId);
  if (idx !== -1) {
    const member = getMemberById(schedule.assignments[idx].memberId);
    const role = getRoleById(roleId);
    schedule.assignments.splice(idx, 1);
    saveData();
    renderApp();
    renderAdjustScheduleModalContent(scheduleId);
    showToast(`${member ? member.name : 'Voluntário'} removido(a) da escala com sucesso!`, 'amber');
  }
}

function changeVolunteerRoleInSchedule(scheduleId, oldRoleId, newRoleId) {
  if (oldRoleId === newRoleId) return;
  const schedule = state.schedules.find(s => s.id === scheduleId);
  if (!schedule) return;

  const currentAssign = schedule.assignments.find(a => a.roleId === oldRoleId);
  if (!currentAssign) return;

  const targetOccupied = schedule.assignments.find(a => a.roleId === newRoleId);
  if (targetOccupied) {
    const targetMember = getMemberById(targetOccupied.memberId);
    const newRole = getRoleById(newRoleId);
    if (!confirm(`A função "${newRole.shortName}" já está ocupada por ${targetMember ? targetMember.name : 'outro voluntário'}.\nDeseja inverter as funções entre eles?`)) {
      renderAdjustScheduleModalContent(scheduleId);
      return;
    }
    targetOccupied.roleId = oldRoleId;
    currentAssign.roleId = newRoleId;
  } else {
    currentAssign.roleId = newRoleId;
  }

  saveData();
  renderApp();
  renderAdjustScheduleModalContent(scheduleId);
  showToast('Função do voluntário na escala atualizada!', 'cyan');
}

function clearAllVolunteersFromSchedule(scheduleId) {
  const schedule = state.schedules.find(s => s.id === scheduleId);
  if (!schedule) return;

  if (schedule.assignments.length === 0) {
    showToast('A escala já está sem nenhum voluntário.', 'cyan');
    return;
  }

  if (!confirm(`Tem certeza que deseja remover TODOS os ${schedule.assignments.length} voluntários desta escala?\n\nTodas as vagas deste culto ficarão abertas.`)) {
    return;
  }

  schedule.assignments = [];
  saveData();
  renderApp();
  renderAdjustScheduleModalContent(scheduleId);
  showToast('Todos os voluntários foram removidos da escala!', 'amber');
}

function handleSaveSchedule(e) {
  e.preventDefault();
  const title = document.getElementById('sched-title').value.trim();
  const category = document.getElementById('sched-category').value;
  const date = document.getElementById('sched-date').value;
  const callTime = document.getElementById('sched-call').value;
  const startTime = document.getElementById('sched-start').value;
  const dressCode = document.getElementById('sched-dress').value.trim();
  const notes = document.getElementById('sched-notes').value.trim();
  const targetVolunteers = parseInt(document.getElementById('sched-target-volunteers')?.value, 10) || 15;
  const autoFill = document.getElementById('sched-autofill').checked;

  if (!title || !date) return;

  const newSchedule = {
    id: 's_' + Date.now(),
    title,
    category,
    date,
    callTime,
    startTime,
    targetVolunteers: targetVolunteers > 0 ? targetVolunteers : 15,
    location: 'Templo Sede — Assembleia de Deus',
    dressCode: dressCode || 'Padrão Mídia',
    notes,
    storyboard: JSON.parse(JSON.stringify(window.DEFAULT_STORYBOARD || [])),
    assignments: []
  };

  state.schedules.push(newSchedule);
  state.selectedScheduleId = newSchedule.id;

  if (autoFill) {
    autoFillSchedule(newSchedule.id);
  } else {
    saveData();
    renderApp();
  }

  closeScheduleModal();
  showToast(`Escala "${title}" criada com sucesso!`, 'emerald');
}

function deleteSchedule(scheduleId) {
  const sched = state.schedules.find(s => s.id === scheduleId);
  if (!sched) return;
  if (!confirm(`Deseja excluir a escala "${sched.title}"?`)) return;
  state.schedules = state.schedules.filter(s => s.id !== scheduleId);
  state.selectedScheduleId = state.schedules[0]?.id || null;
  saveData();
  renderApp();
  showToast('Escala removida.', 'rose');
}

function openMemberModal(memberId = null) {
  const logged = getLoggedInUser();
  const canManage = isPrivilegedUser(logged);

  // Privacidade: voluntário comum só pode abrir o modal para editar seu próprio perfil (foto/telefone)
  if (!canManage && (!memberId || memberId !== logged?.id)) {
    showToast('Privacidade ativa: apenas o Diretor, Líder ou Desenvolvedor podem cadastrar ou editar outros membros.', 'rose');
    return;
  }

  const modal = document.getElementById('modal-member');
  if (!modal) return;

  const member = memberId ? getMemberById(memberId) : null;
  document.getElementById('member-id').value = member ? member.id : '';
  document.getElementById('member-modal-title').textContent = member ? 'Editar Membro & Foto de Perfil' : 'Cadastrar Membro da Mídia';
  document.getElementById('member-name').value = member ? member.name : '';
  const emailField = document.getElementById('member-email');
  if (emailField) {
    emailField.value = member?.email || '';
    emailField.disabled = !canManage;
  }
  const passField = document.getElementById('member-password');
  if (passField) {
    passField.value = member?.password || 'midia123';
  }
  document.getElementById('member-title').value = member ? member.title : '';
  document.getElementById('member-phone').value = member ? member.phone : '';
  document.getElementById('member-availability').value = member ? member.availability : 'Todos os cultos';
  const congField = document.getElementById('member-congregation');
  if (congField) congField.value = member ? (member.congregation || '') : '';
  const birthField = document.getElementById('member-birthdate');
  if (birthField) birthField.value = member ? (member.birthDate || '') : '';
  const cardField = document.getElementById('member-cardnumber');
  if (cardField) cardField.value = member ? (member.memberCardNumber || '') : '';
  const roleTypeSelect = document.getElementById('member-roletype');
  if (roleTypeSelect) {
    roleTypeSelect.value = member ? member.roleType : 'member';
    roleTypeSelect.disabled = !canManage;
  }
  const starSelect = document.getElementById('member-starrating');
  if (starSelect) {
    starSelect.value = typeof member?.starRating === 'number' ? String(member.starRating) : '0';
    starSelect.disabled = !canManage;
  }
  const isAutoPrivileged = member?.roleType === 'developer' || member?.roleType === 'director' || member?.roleType === 'leader';
  const canGrantAtt = logged?.roleType === 'developer' || logged?.roleType === 'director';
  const attCheckbox = document.getElementById('member-canmarkattendance');
  if (attCheckbox) {
    attCheckbox.checked = Boolean(member?.canMarkAttendance || isAutoPrivileged);
    attCheckbox.disabled = !canGrantAtt || isAutoPrivileged;
  }
  document.getElementById('member-photo-data').value = member?.photoUrl || '';
  updateModalPhotoPreview(member?.photoUrl || '', member?.name || 'AD');

  // Render skill checkboxes
  const skillsContainer = document.getElementById('member-skills-grid');
  skillsContainer.innerHTML = state.roles.map(role => {
    const checked = member ? member.skills.includes(role.id) : false;
    return `
      <label class="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-700/70 bg-slate-900/60 hover:border-cyan-500/40 cursor-pointer transition text-xs">
        <input type="checkbox" name="member-skill" value="${role.id}" ${checked ? 'checked' : ''} class="rounded border-slate-600 text-cyan-500 focus:ring-cyan-500 bg-slate-800">
        <span class="text-slate-200 font-medium">${escapeHTML(role.shortName)}</span>
      </label>
    `;
  }).join('');

  modal.classList.remove('hidden');
}

function closeMemberModal() {
  document.getElementById('modal-member')?.classList.add('hidden');
}

function openRoleModal(roleId = null) {
  const modal = document.getElementById('modal-role');
  if (!modal) return;

  const role = roleId ? state.roles.find(r => r.id === roleId) : null;
  document.getElementById('role-id').value = role ? role.id : '';
  document.getElementById('role-modal-title').textContent = role ? 'Editar Função da Mídia' : 'Criar Nova Função na Mídia';
  document.getElementById('role-name').value = role ? role.name : '';
  document.getElementById('role-shortname').value = role ? role.shortName : '';
  document.getElementById('role-category').value = role ? role.category : 'Digital & Pós-Produção';
  document.getElementById('role-station').value = role ? role.station : '';
  document.getElementById('role-icon').value = role ? role.icon : 'palette';
  document.getElementById('role-color').value = role ? (role.color || 'cyan') : 'fuchsia';
  document.getElementById('role-desc').value = role ? role.description : '';

  modal.classList.remove('hidden');
}

function closeRoleModal() {
  document.getElementById('modal-role')?.classList.add('hidden');
}

function handleSaveRole(e) {
  e.preventDefault();
  const id = document.getElementById('role-id').value;
  const name = document.getElementById('role-name').value.trim();
  const shortName = document.getElementById('role-shortname').value.trim() || name;
  const category = document.getElementById('role-category').value.trim() || 'Digital & Pós-Produção';
  const station = document.getElementById('role-station').value.trim() || 'Templo Sede';
  const icon = document.getElementById('role-icon').value || 'sparkles';
  const color = document.getElementById('role-color').value || 'cyan';
  const description = document.getElementById('role-desc').value.trim() || 'Função operacional da equipe de mídia.';

  if (!name) return;

  const badgeClass = ROLE_COLOR_THEMES[color] || ROLE_COLOR_THEMES.cyan;

  if (id) {
    const existing = state.roles.find(r => r.id === id);
    if (existing) {
      existing.name = name;
      existing.shortName = shortName;
      existing.category = category;
      existing.station = station;
      existing.icon = icon;
      existing.color = color;
      existing.badgeClass = badgeClass;
      existing.description = description;
    }
    showToast(`Função "${shortName}" atualizada!`, 'cyan');
  } else {
    const newRoleId = 'role_' + Date.now();
    state.roles.push({
      id: newRoleId,
      name,
      shortName,
      category,
      icon,
      color,
      badgeClass,
      station,
      description
    });
    showToast(`Nova função "${shortName}" adicionada ao sistema!`, 'emerald');
  }

  saveData();
  closeRoleModal();
  renderApp();
}

function deleteRole(roleId) {
  const role = state.roles.find(r => r.id === roleId);
  if (!role) return;
  if (!confirm(`Deseja remover a função "${role.name}" das escalas?`)) return;

  state.roles = state.roles.filter(r => r.id !== roleId);
  state.members.forEach(m => {
    m.skills = m.skills.filter(s => s !== roleId);
  });
  state.schedules.forEach(s => {
    s.assignments = s.assignments.filter(a => a.roleId !== roleId);
  });

  saveData();
  renderApp();
  showToast(`Função "${role.shortName}" removida.`, 'rose');
}

function handleSaveMember(e) {
  e.preventDefault();
  const logged = getLoggedInUser();
  const canManage = isPrivilegedUser(logged);

  const id = document.getElementById('member-id').value;
  if (!canManage && id !== logged?.id) {
    showToast('Sem permissão para alterar outros usuários.', 'rose');
    return;
  }

  const name = document.getElementById('member-name').value.trim();
  const emailInput = (document.getElementById('member-email')?.value || '').trim().toLowerCase();
  const passwordInput = (document.getElementById('member-password')?.value || '').trim() || 'midia123';
  const title = document.getElementById('member-title').value.trim();
  const phone = document.getElementById('member-phone').value.trim();
  const availability = document.getElementById('member-availability').value.trim();
  const congregation = (document.getElementById('member-congregation')?.value || '').trim();
  const birthDate = (document.getElementById('member-birthdate')?.value || '').trim();
  const memberCardNumber = (document.getElementById('member-cardnumber')?.value || '').trim();
  const roleType = document.getElementById('member-roletype').value;
  const starRatingInput = Number(document.getElementById('member-starrating')?.value || 0);
  const canMarkInput = Boolean(document.getElementById('member-canmarkattendance')?.checked);
  const canGrantAtt = logged?.roleType === 'developer' || logged?.roleType === 'director';
  const photoUrl = document.getElementById('member-photo-data').value || '';

  const skillNodes = document.querySelectorAll('input[name="member-skill"]:checked');
  const skills = Array.from(skillNodes).map(n => n.value);

  if (!name) return;
  if (skills.length === 0) {
    alert('Selecione pelo menos uma função que este voluntário exerce na mídia.');
    return;
  }

  const normalizedEmail = emailInput || `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}@gmail.com`;

  if (id) {
    const existing = getMemberById(id);
    if (existing) {
      existing.name = name;
      if (canManage) existing.email = normalizedEmail;
      existing.password = passwordInput;
      existing.title = title || 'Voluntário AD Mídia';
      existing.phone = phone;
      existing.availability = availability || 'Domingos';
      existing.congregation = congregation || existing.congregation || 'Sede';
      existing.birthDate = birthDate;
      existing.memberCardNumber = memberCardNumber;
      if (canManage) {
        existing.roleType = roleType;
        existing.starRating = Math.max(0, Math.min(10, starRatingInput));
        if (existing.starRating > 0 && !existing.validatedBy) {
          existing.validatedBy = logged?.name || 'Direção';
        }
      }
      if (canGrantAtt || roleType === 'leader') {
        existing.canMarkAttendance = existing.roleType === 'developer' || existing.roleType === 'director' || existing.roleType === 'leader' || canMarkInput;
      }
      existing.skills = skills;
      existing.photoUrl = photoUrl;
      existing.createdAt = existing.createdAt || new Date().toISOString();
    }
    showToast(`Dados salvos e sincronizados na nuvem!`, 'cyan');
  } else {
    const finalRoleType = canManage ? roleType : 'member';
    const newMember = {
      id: 'm_' + Date.now(),
      createdAt: new Date().toISOString(),
      name,
      email: normalizedEmail,
      password: passwordInput,
      roleType: finalRoleType,
      canMarkAttendance: finalRoleType === 'developer' || finalRoleType === 'director' || finalRoleType === 'leader' || (canGrantAtt && canMarkInput),
      title: title || 'Voluntário AD Mídia',
      phone: phone || '',
      skills,
      availability: availability || 'Todos os cultos',
      congregation: congregation || 'Sede',
      birthDate: birthDate || '',
      memberCardNumber: memberCardNumber || '',
      avatarColor: AVATAR_GRADIENTS[state.members.length % AVATAR_GRADIENTS.length],
      photoUrl,
      historyParticipations: 0,
      bonusXp: 0,
      starRating: canManage ? Math.max(0, Math.min(10, starRatingInput)) : 0,
      validatedBy: canManage && starRatingInput > 0 ? (logged?.name || 'Direção') : '',
      active: true
    };
    state.members.push(newMember);
    showToast(`${name} (${normalizedEmail}) cadastrado(a) no banco em nuvem!`, 'emerald');
  }

  saveData();
  closeMemberModal();
  renderApp();
}

function deleteMember(memberId) {
  const member = getMemberById(memberId);
  if (!member) return;
  if (!confirm(`Remover ${member.name} da equipe de mídia?`)) return;
  state.members = state.members.filter(m => m.id !== memberId);
  state.schedules.forEach(s => {
    s.assignments = s.assignments.filter(a => a.memberId !== memberId);
  });
  if (state.activeMemberId === memberId) {
    state.activeMemberId = state.members[0]?.id || 'm1';
  }
  saveData();
  renderApp();
  showToast('Membro removido da equipe.', 'rose');
}

function sendMemberAccessViaWhatsApp(memberId) {
  const member = getMemberById(memberId);
  if (!member) return;

  const appUrl = getAppBaseUrl();
  const callName = member.nickname || member.name.split(' ')[0];
  const roleNames = (member.skills || []).map(sId => getRoleById(sId).shortName).join(', ');
  const pass = member.password || 'midia123';

  const msgLines = [
    `🔥 *ACESSO OFICIAL — AD MÍDIA HUB* 🔥`,
    `Olá, *${callName}* (${member.name})! A paz do Senhor!`,
    ``,
    `Seu cadastro na plataforma oficial de Escalas & QR Code da Mídia já está liberado:`,
    `🌐 *Link do App:* ${appUrl}`,
    ``,
    `🔑 *SEUS DADOS DE ACESSO:*`,
    `• *Login (Gmail):* ${member.email}`,
    `• *Sua Senha:* ${pass}`,
    `• *Código do seu QR Code:* ${member.qrToken}`,
    `• *Funções vinculadas:* ${roleNames || 'Mídia'}`,
    ``,
    `✅ *O que fazer ao entrar:*`,
    `1. Acesse o link acima e entre com seu Gmail e senha.`,
    `2. Em *"Meu Perfil"*, você pode colocar sua foto e alterar sua senha se desejar.`,
    `3. Na chegada ao culto, apresente seu *QR Code Individual* para marcar sua frequência e liberar seu nome na lista da cantina!`
  ];

  const text = msgLines.join('\n');
  const rawDigits = String(member.phone || '').replace(/\D/g, '');

  if (rawDigits.length >= 10) {
    const fullPhone = rawDigits.startsWith('55') ? rawDigits : `55${rawDigits}`;
    const waUrl = `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`;
    window.open(waUrl, '_blank');
    showToast(`Abrindo WhatsApp de ${callName} com o acesso pronto!`, 'emerald');
  } else {
    navigator.clipboard.writeText(text).then(() => {
      showToast(`Mensagem de acesso de ${callName} copiada! Cole no WhatsApp dele(a).`, 'amber');
    }).catch(() => {
      prompt(`Copie os dados de acesso de ${member.name}:`, text);
    });
  }
}

function copyAllMembersAccessForGroup() {
  const appUrl = getAppBaseUrl();
  const lines = [
    `🔥 *SISTEMA OFICIAL DE ESCALAS — AD MÍDIA HUB* 🔥`,
    `Olá, equipe! Nosso sistema de escalas, storyboard e check-in por QR Code já está no ar!`,
    ``,
    `🌐 *Link de Acesso:*`,
    `${appUrl}`,
    ``,
    `🔑 *SENHA INICIAL DOS VOLUNTÁRIOS:* *midia123*`,
    `_(Ao entrar, clique em "Meu Perfil" para colocar sua foto e trocar para uma senha pessoal)_`,
    ``,
    `📧 *LOGIN (GMAIL) DE CADA VOLUNTÁRIO:*`
  ];

  state.members
    .filter(m => m.roleType === 'member')
    .forEach(m => {
      const label = m.nickname ? `${m.nickname} (${m.name.split(' ')[0]})` : m.name;
      lines.push(`• *${label}:* ${m.email}`);
    });

  lines.push(``);
  lines.push(`✅ Apresente seu *QR Code* na chegada ao culto para registrar presença e entrar na lista da cantina!`);

  const fullText = lines.join('\n');
  navigator.clipboard.writeText(fullText).then(() => {
    showToast('Lista de acessos de todos os voluntários copiada para colar no grupo do WhatsApp!', 'emerald');
  }).catch(() => {
    prompt('Copie a lista abaixo para o grupo do WhatsApp:', fullText);
  });
}

// ============================================================================
// RENDERIZAÇÃO DE COMPONENTES
// ============================================================================

function renderHeader() {
  const loggedUser = getLoggedInUser();
  const logged = loggedUser;
  const activeMember = getMemberById(state.activeMemberId) || loggedUser || state.members[0];
  const effectiveUser = getEffectiveUser();

  const canManage = isPrivilegedUser(loggedUser) || isPrivilegedUser(effectiveUser);
  const canMark = canMarkAttendanceUser(effectiveUser);
  const isDirector = canManage && (state.mode === 'director' || effectiveUser?.roleType === 'leader');

  // Calculate global stats
  const totalMembers = state.members.length;
  const totalSchedules = state.schedules.length;
  const swapAlerts = state.schedules.reduce((acc, s) => acc + s.assignments.filter(a => a.status === 'swap_requested').length, 0);

  const cloudBadge =
    state.cloudSyncStatus === 'synced'
      ? `<button type="button" onclick="syncFromCloud()" title="Nuvem conectada e sincronizada. Clique para sincronizar agora" class="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition cursor-pointer active:scale-95"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>Nuvem Sincronizada 🔄</button>`
      : state.cloudSyncStatus === 'syncing'
      ? `<span class="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 animate-pulse">Sincronizando Nuvem...</span>`
      : `<button type="button" onclick="syncFromCloud()" title="Clique para sincronizar com a nuvem agora" class="inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition cursor-pointer active:scale-95">Sincronizar Nuvem 🔄</button>`;

  return `
    <header class="sticky top-0 z-30 border-b backdrop-blur-md shadow-md">
      <div class="app-screen-container py-3.5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        
        <!-- Brand Identity -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3.5">
            <div class="relative w-11 h-11 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shadow-sm">
              <i data-lucide="flame" class="w-6 h-6 text-amber-400"></i>
              <span class="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[var(--bg-deep)]"></span>
            </div>
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-display font-extrabold text-lg sm:text-xl tracking-tight bg-gradient-to-r from-amber-400 via-amber-300 to-amber-500 bg-clip-text text-transparent">
                  AD MÍDIA HUB
                </span>
                <span class="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  Assembleia de Deus
                </span>
                ${cloudBadge}
              </div>
              <p class="text-xs text-slate-400">Gestão de Escalas, Produção & Comunicação</p>
            </div>
          </div>

          <!-- Mobile Quick Actions -->
          <div class="flex items-center gap-2 lg:hidden">
            <button
              onclick="toggleTheme()"
              title="${state.theme === 'dark' ? 'Mudar para Modo Claro' : 'Mudar para Modo Escuro'}"
              class="p-2 rounded-xl border border-slate-700/80 hover:bg-slate-800/80 text-amber-400 transition">
              <i data-lucide="${state.theme === 'dark' ? 'sun' : 'moon'}" class="w-4 h-4"></i>
            </button>
            <button onclick="syncFromCloud(false)" title="Sincronizar com Banco em Nuvem" class="p-2 rounded-xl border border-slate-700/80 text-cyan-300 hover:bg-slate-800">
              <i data-lucide="refresh-cw" class="w-4 h-4"></i>
            </button>
          </div>
        </div>

        <!-- Mode Switcher & User Identity -->
        <div class="flex flex-wrap items-center justify-between sm:justify-end gap-3">
          
          ${canManage ? `
            <!-- Role Selector Pill (Only visible to Developer / Director / Leader) -->
            <div class="flex items-center p-1 rounded-2xl bg-slate-900/90 border border-slate-800">
              <button
                onclick="setMode('director')"
                class="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                  isDirector
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md font-bold'
                    : 'text-slate-400 hover:text-white'
                }">
                <i data-lucide="shield-check" class="w-4 h-4"></i>
                <span>Visão da Liderança</span>
                ${swapAlerts > 0 ? `<span class="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-600 text-white">${swapAlerts}</span>` : ''}
              </button>

              <button
                onclick="setMode('team')"
                class="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                  !isDirector
                    ? 'bg-slate-800 text-slate-100 border border-slate-700 shadow-md font-bold'
                    : 'text-slate-400 hover:text-white'
                }">
                <i data-lucide="user-check" class="w-4 h-4"></i>
                <span>Visão da Equipe</span>
              </button>
            </div>
          ` : `
            <!-- Locked Privacy Badge for Regular Team Members -->
            <div class="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold">
              <i data-lucide="lock" class="w-3.5 h-3.5"></i>
              <span>Acesso Individual Privado</span>
            </div>
          `}

          <!-- Logged User Box -->
          <div class="flex items-center gap-2.5 bg-slate-900/80 border border-slate-800/90 rounded-2xl px-3 py-1.5">
            ${renderMemberAvatar(activeMember, 'w-8 h-8 rounded-xl text-[11px]', true)}
            <div class="text-left">
              <label class="block text-[10px] uppercase tracking-wider text-emerald-400 leading-none">
                ${escapeHTML(activeMember?.email || 'Conta Gmail')}
              </label>
              ${canManage ? `
                <select
                  onchange="setActiveMember(this.value)"
                  class="bg-transparent text-xs font-semibold text-slate-100 focus:outline-none cursor-pointer pr-2">
                  ${state.members.map(m => `
                    <option value="${m.id}" class="bg-slate-900 text-slate-100" ${m.id === state.activeMemberId ? 'selected' : ''}>
                      ${escapeHTML(m.name)} (${getRoleTypeLabel(m.roleType)})
                    </option>
                  `).join('')}
                </select>
              ` : `
                <div class="text-xs font-bold text-white pr-1">
                  ${escapeHTML(activeMember?.name)}
                </div>
              `}
            </div>
            <button
              onclick="openMemberModal('${activeMember?.id || 'm1'}')"
              title="Editar Meu Perfil & Foto"
              class="px-2.5 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/35 text-xs font-bold flex items-center gap-1 transition">
              <i data-lucide="user-cog" class="w-3.5 h-3.5"></i>
              <span class="hidden sm:inline">Meu Perfil</span>
            </button>
            <button
              onclick="logoutGmail()"
              title="Sair da conta Gmail"
              class="p-1.5 rounded-lg bg-slate-800/90 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition">
              <i data-lucide="log-out" class="w-3.5 h-3.5"></i>
            </button>
          </div>

          <!-- Theme Switcher (Claro & Escuro com cores humanas) -->
          <button
            onclick="toggleTheme()"
            title="${state.theme === 'dark' ? 'Alternar para Modo Claro' : 'Alternar para Modo Escuro (Cores Acolhedoras)'}"
            class="flex items-center gap-1.5 px-3 py-2 rounded-xl border transition shadow-sm ${
              state.theme === 'dark'
                ? 'border-slate-800/90 bg-slate-900/80 text-amber-300 hover:border-amber-500/40'
                : 'border-slate-200 bg-slate-100/90 text-slate-700 hover:border-amber-500/50 hover:bg-slate-200/80'
            }">
            <i data-lucide="${state.theme === 'dark' ? 'sun' : 'moon'}" class="w-3.5 h-3.5 ${state.theme === 'dark' ? 'text-amber-400' : 'text-amber-600'}"></i>
            <span class="text-xs font-bold hidden sm:inline">${state.theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}</span>
          </button>

          <button
            onclick="syncFromCloud(false)"
            title="Atualizar dados da nuvem agora"
            class="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-800/90 bg-slate-900/60 text-xs text-cyan-300 hover:border-cyan-500/40 transition">
            <i data-lucide="refresh-cw" class="w-3.5 h-3.5"></i>
            <span>Sincronizar</span>
          </button>

          ${canManage ? `
            <button
              onclick="exportBackupJSON()"
              title="Exportar Backup JSON"
              class="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-800/90 bg-slate-900/60 text-xs text-slate-300 hover:text-emerald-300 hover:border-emerald-500/30 transition">
              <i data-lucide="download" class="w-3.5 h-3.5"></i>
              <span>Backup</span>
            </button>

            <button
              onclick="triggerImportBackup()"
              title="Importar Backup JSON"
              class="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-800/90 bg-slate-900/60 text-xs text-slate-300 hover:text-cyan-300 hover:border-cyan-500/30 transition">
              <i data-lucide="upload" class="w-3.5 h-3.5"></i>
              <span>Restaurar</span>
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Navigation Bar Fluida & Sem Cortes (Computador e Celular) -->
      <div class="border-t border-slate-800/60 bg-slate-950/40">
        <div class="app-screen-container flex flex-wrap lg:flex-nowrap items-center justify-between gap-2 py-1.5">
          <nav class="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1 min-w-0 flex-1 max-w-full">
            <button
              onclick="setActiveTab('my_area')"
              class="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition shrink-0 ${
                state.activeTab === 'my_area'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }">
              <i data-lucide="smartphone" class="w-4 h-4"></i>
              <span>Meu Perfil & Credencial</span>
            </button>

            <button
              onclick="setActiveTab('schedules')"
              class="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition shrink-0 ${
                state.activeTab === 'schedules'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }">
              <i data-lucide="calendar-Check-2" class="w-4 h-4"></i>
              <span>Escalas (${totalSchedules})</span>
            </button>

            ${canManage ? `
              <button
                onclick="setActiveTab('members')"
                class="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition shrink-0 ${
                  state.activeTab === 'members'
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
                }">
                <i data-lucide="users" class="w-4 h-4"></i>
                <span>Voluntários (${totalMembers})</span>
              </button>
            ` : ''}

            <button
              onclick="setActiveTab('roles')"
              class="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition shrink-0 ${
                state.activeTab === 'roles'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }">
              <i data-lucide="layers" class="w-4 h-4"></i>
              <span>Funções (${state.roles.length})</span>
            </button>

            <button
              onclick="setActiveTab('attendance')"
              class="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition shrink-0 ${
                state.activeTab === 'attendance'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-emerald-200 hover:bg-slate-900/50'
              }">
              <i data-lucide="qr-code" class="w-4 h-4 text-emerald-400"></i>
              <span>Frequência & QR</span>
            </button>

            ${canManage ? `
              <button
                onclick="setActiveTab('reports')"
                class="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition shrink-0 ${
                  state.activeTab === 'reports'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-amber-200 hover:bg-slate-900/50'
                }">
                <i data-lucide="file-spreadsheet" class="w-4 h-4 text-amber-400"></i>
                <span>Relatórios & Cantina</span>
              </button>
            ` : ''}

            <button
              onclick="setActiveTab('ranking')"
              class="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition shrink-0 ${
                state.activeTab === 'ranking'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-amber-200 hover:bg-slate-900/50'
              }">
              <i data-lucide="trophy" class="w-4 h-4 text-amber-400"></i>
              <span>Destaques & Equipe</span>
            </button>
          </nav>

          <div class="flex items-center gap-2 py-1 shrink-0">
            ${canMark ? `
              <button
                onclick="openScanAttendanceModal()"
                title="Ativar câmera do celular para escanear QR Code e marcar frequência"
                class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 hover:brightness-110 active:scale-95 text-slate-950 text-xs font-extrabold shadow-md transition shrink-0 whitespace-nowrap">
                <i data-lucide="scan-line" class="w-4 h-4"></i>
                <span>Frequência Rápida</span>
              </button>
            ` : ''}

            ${isDirector ? `
              <button
                onclick="openRoleModal()"
                class="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition shrink-0 whitespace-nowrap">
                <i data-lucide="layers" class="w-3.5 h-3.5 text-fuchsia-400"></i>
                <span>+ Nova Função</span>
              </button>
              <button
                onclick="openMemberModal()"
                class="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition shrink-0 whitespace-nowrap">
                <i data-lucide="user-plus" class="w-3.5 h-3.5 text-cyan-400"></i>
                <span>+ Voluntário</span>
              </button>
              <button
                onclick="openNewScheduleModal()"
                class="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-bold shadow-lg transition shrink-0 whitespace-nowrap">
                <i data-lucide="plus-circle" class="w-3.5 h-3.5"></i>
                <span>Nova Escala</span>
              </button>
            ` : ''}
          </div>
        </div>
      </div>
    </header>
  `;
}

// ============================================================================
// COMPONENTE REUTILIZÁVEL: STORYBOARD DO CULTO + MINI PÓDIO DE GAMIFICAÇÃO
// ============================================================================

function renderStoryboardPanel(sched, isDirector, highlightRoleId = null) {
  if (!sched) return '';
  const items = Array.isArray(sched.storyboard) ? sched.storyboard : [];

  return `
    <div class="glass-panel rounded-3xl p-5 sm:p-6 border border-cyan-500/30 space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500/25 to-purple-600/25 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
            <i data-lucide="clapperboard" class="w-5 h-5"></i>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-base sm:text-lg font-display font-extrabold text-white">
                Storyboard & Roteiro de Produção — ${sched.title}
              </h3>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                ${items.length} Cenas
              </span>
            </div>
            <p class="text-xs text-slate-400">
              ${isDirector
                ? 'Timeline de câmeras, telão, cortes e ações de cada momento do culto. Clique no status para marcar AO VIVO.'
                : 'Acompanhe o roteiro visual do culto e veja em quais momentos sua função entra em ação.'}
            </p>
          </div>
        </div>

        ${isDirector ? `
          <button
            onclick="openStoryboardModal('${sched.id}')"
            class="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-bold text-xs shadow-lg glow-cyan transition shrink-0">
            <i data-lucide="plus-circle" class="w-4 h-4"></i>
            <span>+ Adicionar Cena</span>
          </button>
        ` : ''}
      </div>

      <!-- Horizontal / Grid Storyboard Cards -->
      <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
        ${items.map((item, idx) => {
          const isHighlighted = highlightRoleId && (item.targetRoles || []).includes(highlightRoleId);
          const isLive = item.status === 'live';
          const isDone = item.status === 'done';

          const statusConfig = isLive
            ? { label: '🔴 NO AR / AO VIVO', cls: 'bg-rose-500/20 text-rose-300 border-rose-500/50 animate-pulse' }
            : isDone
            ? { label: '✓ Cena Concluída', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' }
            : { label: `Cena 0${idx + 1} • Pronta`, cls: 'bg-slate-800 text-slate-300 border-slate-700' };

          return `
            <div class="rounded-2xl p-4 border transition flex flex-col justify-between gap-3 relative overflow-hidden ${
              isLive
                ? 'bg-rose-950/25 border-rose-500/60 ring-1 ring-rose-500/40'
                : isHighlighted
                ? 'bg-cyan-950/30 border-cyan-400/50 ring-1 ring-cyan-400/30'
                : isDone
                ? 'bg-slate-900/40 border-slate-800/60 opacity-75'
                : 'bg-slate-900/75 border-slate-800/90 hover:border-slate-700'
            }">
              <div>
                <div class="flex items-center justify-between gap-2 mb-2">
                  <span class="inline-flex items-center gap-1 text-xs font-display font-extrabold text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-lg border border-amber-500/25">
                    <i data-lucide="clock" class="w-3 h-3"></i>
                    ${item.time}
                  </span>

                  <div class="flex items-center gap-1">
                    <button
                      onclick="cycleStoryboardStatus('${sched.id}', '${item.id}')"
                      title="Clique para alternar: Pronta -> Ao Vivo -> Concluída"
                      class="text-[10px] font-bold px-2 py-0.5 rounded-full border cursor-pointer transition ${statusConfig.cls}">
                      ${statusConfig.label}
                    </button>
                    ${isDirector ? `
                      <button
                        onclick="openStoryboardModal('${sched.id}', '${item.id}')"
                        class="p-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300">
                        <i data-lucide="pencil" class="w-3 h-3"></i>
                      </button>
                      <button
                        onclick="deleteStoryboardItem('${sched.id}', '${item.id}')"
                        class="p-1 rounded-lg bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300">
                        <i data-lucide="trash-2" class="w-3 h-3"></i>
                      </button>
                    ` : ''}
                  </div>
                </div>

                <span class="text-[10px] font-bold uppercase tracking-wider text-cyan-400 block">${item.phase}</span>
                <h4 class="text-sm font-display font-bold text-white mt-0.5">${item.scene}</h4>
                
                <div class="mt-2.5 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-[11px] text-slate-300 leading-relaxed">
                  <strong class="text-amber-300 block text-[10px] uppercase tracking-wider mb-0.5">🎬 Direção de Câmera / Ação:</strong>
                  ${item.cameraCue}
                </div>
              </div>

              <div class="pt-2 border-t border-slate-800/70 flex flex-wrap items-center gap-1">
                ${(item.targetRoles || []).map(rId => {
                  const r = getRoleById(rId);
                  const isMyRole = rId === highlightRoleId;
                  return `
                    <span class="text-[10px] px-2 py-0.5 rounded-md border font-semibold ${
                      isMyRole ? 'bg-cyan-400 text-slate-950 border-cyan-300 font-extrabold' : r.badgeClass
                    }">
                      ${r.shortName}
                    </span>
                  `;
                }).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

function renderTopRankingBanner() {
  const rankings = getRankingsList();
  const top5 = rankings.slice(0, 5);
  const myRankIdx = rankings.findIndex(r => r.member.id === state.activeMemberId);
  const myStats = rankings[myRankIdx];

  return `
    <div class="glass-panel rounded-3xl p-5 sm:p-6 border border-amber-500/35 relative overflow-hidden">
      <div class="absolute -left-10 -bottom-10 w-52 h-52 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
      
      <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-slate-950 shadow-lg glow-gold shrink-0">
            <i data-lucide="trophy" class="w-6 h-6"></i>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-base sm:text-lg font-display font-extrabold text-white">
                Ranking de Engajamento & Gamificação AD Mídia
              </h2>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Top Participação
              </span>
            </div>
            <p class="text-xs text-slate-400">
              Os voluntários que mais participam e confirmam presença nos cultos sobem no pódio e conquistam medalhas!
            </p>
          </div>
        </div>

        <div class="flex items-center gap-3">
          ${myStats ? `
            <div class="px-3.5 py-2 rounded-2xl bg-slate-900/90 border border-cyan-500/40 flex items-center gap-2.5">
              <span class="text-xs font-extrabold text-cyan-300">#${myRankIdx + 1} no Ranking</span>
              <span class="text-xs text-slate-300">•</span>
              <span class="text-xs font-bold text-amber-300">${myStats.xp} XP (${myStats.totalParticipations} cultos)</span>
            </div>
          ` : ''}
          <button
            onclick="setActiveTab('ranking')"
            class="px-3.5 py-2 rounded-2xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/35 text-xs font-bold flex items-center gap-1.5 transition shrink-0">
            <span>Ver Ranking Completo</span>
            <i data-lucide="arrow-right" class="w-3.5 h-3.5"></i>
          </button>
        </div>
      </div>

      <!-- Top 5 Podium Strip -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        ${top5.map((item, idx) => {
          const medals = ['🥇 1º Lugar', '🥈 2º Lugar', '🥉 3º Lugar', '🏅 4º Lugar', '🏅 5º Lugar'];
          const podiumStyles = [
            'border-amber-400/60 bg-gradient-to-b from-amber-500/20 to-slate-900/90 ring-1 ring-amber-400/30',
            'border-slate-300/40 bg-gradient-to-b from-slate-400/15 to-slate-900/90',
            'border-orange-400/45 bg-gradient-to-b from-orange-500/15 to-slate-900/90',
            'border-slate-800 bg-slate-900/75',
            'border-slate-800 bg-slate-900/75'
          ];
          const isMe = item.member.id === state.activeMemberId;

          return `
            <div class="rounded-2xl p-3.5 border ${podiumStyles[idx]} flex flex-col justify-between gap-2 relative">
              <div class="flex items-center justify-between">
                <span class="text-[11px] font-extrabold ${idx === 0 ? 'text-amber-300' : 'text-slate-300'}">
                  ${medals[idx]}
                </span>
                <span class="text-[11px] font-display font-extrabold text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
                  ${item.xp} XP
                </span>
              </div>

              <div class="flex items-center gap-2.5 my-1">
                ${renderMemberAvatar(item.member, 'w-10 h-10 rounded-xl text-xs', false)}
                <div class="min-w-0">
                  <div class="flex items-center gap-1">
                    <h4 class="text-xs font-bold text-white truncate">${escapeHTML(item.member.name)}</h4>
                    ${isMe ? `<span class="text-[9px] px-1 rounded bg-cyan-400 text-slate-950 font-extrabold">VOCÊ</span>` : ''}
                  </div>
                  <p class="text-[10px] text-slate-400 truncate">${escapeHTML(item.badge.title)}</p>
                </div>
              </div>

              <div class="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-300">
                <span>🔥 <strong>${item.totalParticipations}</strong> participações</span>
                <span class="text-emerald-300 font-semibold">${item.currentConfirmed} check-ins</span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

// ============================================================================
// DASHBOARD DE ANIVERSARIANTES DA SEMANA
// ============================================================================

function getBirthdayData(members = state.members) {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDate = now.getDate();

  // Início da semana atual (Domingo) e fim (Sábado)
  const dayOfWeek = now.getDay();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(currentDate - dayOfWeek);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const weekDays = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  const birthdayList = [];

  members.forEach(member => {
    if (!member.birthDate) return;
    const cleanDate = String(member.birthDate).trim();
    let birthYear, birthMonth, birthDay;

    if (cleanDate.includes('/')) {
      const parts = cleanDate.split('/');
      if (parts.length === 3) {
        birthDay = parseInt(parts[0], 10);
        birthMonth = parseInt(parts[1], 10) - 1;
        birthYear = parseInt(parts[2], 10);
      }
    } else if (cleanDate.includes('-')) {
      const parts = cleanDate.split('-');
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          birthYear = parseInt(parts[0], 10);
          birthMonth = parseInt(parts[1], 10) - 1;
          birthDay = parseInt(parts[2], 10);
        } else {
          birthDay = parseInt(parts[0], 10);
          birthMonth = parseInt(parts[1], 10) - 1;
          birthYear = parseInt(parts[2], 10);
        }
      }
    }

    if (isNaN(birthYear) || isNaN(birthMonth) || isNaN(birthDay)) return;
    if (birthMonth < 0 || birthMonth > 11 || birthDay < 1 || birthDay > 31) return;

    // Data de aniversário no ano atual
    const bdayThisYear = new Date(currentYear, birthMonth, birthDay);
    const dayOfWeekName = weekDays[bdayThisYear.getDay()];

    // Checar se cai na semana corrente (Domingo a Sábado)
    const isThisWeek = (bdayThisYear >= startOfWeek && bdayThisYear <= endOfWeek);

    // Diferença em dias em relação a hoje
    const todayMidnight = new Date(currentYear, currentMonth, currentDate);
    const diffTime = bdayThisYear.getTime() - todayMidnight.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    // Idade completada este ano
    const age = currentYear - birthYear;

    if (isThisWeek || (diffDays >= 0 && diffDays <= 7)) {
      birthdayList.push({
        member,
        birthDate: member.birthDate,
        day: birthDay,
        month: birthMonth + 1,
        monthName: monthNames[birthMonth],
        dayOfWeekName,
        dateFormatted: `${String(birthDay).padStart(2, '0')}/${String(birthMonth + 1).padStart(2, '0')}`,
        age,
        diffDays,
        isToday: diffDays === 0,
        isPast: diffDays < 0,
        isUpcoming: diffDays > 0,
        bdayDate: bdayThisYear
      });
    }
  });

  birthdayList.sort((a, b) => a.diffDays - b.diffDays);

  return {
    birthdays: birthdayList,
    startOfWeekStr: `${String(startOfWeek.getDate()).padStart(2, '0')}/${String(startOfWeek.getMonth() + 1).padStart(2, '0')}`,
    endOfWeekStr: `${String(endOfWeek.getDate()).padStart(2, '0')}/${String(endOfWeek.getMonth() + 1).padStart(2, '0')}`
  };
}

function sendBirthdayWhatsApp(memberId) {
  const member = getMemberById(memberId);
  if (!member) return;
  const firstName = member.name.split(' ')[0];
  const phone = (member.phone || '').replace(/\D/g, '');
  const text = encodeURIComponent(`🎉 Graça e Paz, ${firstName}! A equipe da AD Mídia Hub deseja a você um Feliz Aniversário! Que Deus continue abençoando ricamente sua vida e seu ministério na mídia da igreja! 🎂🎈✨`);
  if (phone) {
    const fullPhone = phone.startsWith('55') ? phone : `55${phone}`;
    window.open(`https://wa.me/${fullPhone}?text=${text}`, '_blank');
  } else {
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }
}

function renderBirthdayWidget() {
  const data = getBirthdayData();
  const birthdays = data.birthdays;

  return `
    <div class="glass-panel rounded-3xl p-5 sm:p-6 border border-pink-500/35 relative overflow-hidden bg-gradient-to-br from-pink-950/20 via-slate-900/60 to-purple-950/20 shadow-xl">
      <div class="absolute -right-10 -top-10 w-44 h-44 bg-pink-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <!-- Header do Dashboard de Aniversariantes -->
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-pink-500/20">
        <div class="flex items-center gap-3">
          <div class="w-11 h-11 rounded-2xl bg-gradient-to-tr from-pink-500 to-amber-400 text-slate-950 flex items-center justify-center font-extrabold shadow-lg glow-pink">
            <i data-lucide="cake" class="w-6 h-6"></i>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-lg sm:text-xl font-display font-extrabold text-white">Aniversariantes da Semana</h2>
              <span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-pink-500/20 text-pink-300 border border-pink-500/40">
                ${birthdays.length} ${birthdays.length === 1 ? 'comemoração' : 'comemorações'}
              </span>
            </div>
            <p class="text-xs text-slate-400 mt-0.5">
              Semana de <strong class="text-pink-300">${data.startOfWeekStr}</strong> a <strong class="text-pink-300">${data.endOfWeekStr}</strong> • Homenagens da Equipe AD Mídia
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2 self-start sm:self-auto">
          <span class="text-[11px] font-semibold text-amber-300 bg-amber-500/15 border border-amber-500/30 px-3 py-1 rounded-xl flex items-center gap-1.5">
            <span>🎉</span>
            <span>Vamos celebrar a vida dos nossos voluntários!</span>
          </span>
        </div>
      </div>

      <!-- Conteúdo dos Cards de Aniversariantes -->
      <div class="mt-4">
        ${birthdays.length === 0 ? `
          <div class="text-center py-6 text-slate-400 space-y-1">
            <p class="text-sm font-semibold">Nenhum voluntário faz aniversário nesta semana atual.</p>
            <p class="text-xs text-slate-500">Cadastre a data de nascimento dos voluntários no perfil para acompanhar aqui!</p>
          </div>
        ` : `
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            ${birthdays.map(item => {
              const isToday = item.isToday;
              return `
                <div class="rounded-2xl p-4 transition-all duration-300 relative overflow-hidden flex flex-col justify-between ${
                  isToday
                    ? 'bg-gradient-to-b from-pink-500/20 via-purple-500/15 to-slate-900 border-2 border-pink-400 shadow-lg glow-pink scale-[1.02]'
                    : 'bg-slate-900/80 border border-slate-800 hover:border-pink-500/40'
                }">
                  ${isToday ? `
                    <div class="absolute top-0 right-0 bg-gradient-to-r from-pink-500 to-amber-400 text-slate-950 text-[10px] font-extrabold uppercase px-3 py-0.5 rounded-bl-xl shadow flex items-center gap-1">
                      <span>🎂</span>
                      <span>É HOJE! PARABÉNS!</span>
                    </div>
                  ` : ''}

                  <div class="space-y-3">
                    <div class="flex items-start gap-3">
                      <div class="relative shrink-0">
                        ${renderMemberAvatar(item.member, 'w-12 h-12 rounded-2xl text-sm', false)}
                        <span class="absolute -bottom-1 -right-1 text-sm">🎈</span>
                      </div>
                      <div class="min-w-0 pr-6">
                        <h4 class="text-sm font-display font-extrabold text-white truncate">${escapeHTML(item.member.name)}</h4>
                        <p class="text-xs text-cyan-300 font-medium truncate">${escapeHTML(item.member.title || 'Voluntário AD Mídia')}</p>
                        <p class="text-[11px] text-slate-400 truncate mt-0.5 flex items-center gap-1">
                          <span>⛪</span>
                          <span>${escapeHTML(item.member.congregation || 'Sede')}</span>
                        </p>
                      </div>
                    </div>

                    <div class="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-xs">
                      <div>
                        <span class="text-[10px] uppercase font-bold text-slate-400 block">${item.dayOfWeekName}</span>
                        <strong class="text-pink-300 font-display text-sm">${item.dateFormatted}</strong>
                      </div>
                      <div class="text-right">
                        <span class="text-[10px] uppercase font-bold text-slate-400 block">Completando</span>
                        <strong class="text-amber-300 font-display text-sm">${item.age} anos 🎂</strong>
                      </div>
                    </div>
                  </div>

                  <div class="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center gap-2">
                    <button
                      type="button"
                      onclick="sendBirthdayWhatsApp('${item.member.id}')"
                      class="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:brightness-110 active:scale-95 text-slate-950 font-extrabold text-xs flex items-center justify-center gap-1.5 shadow transition">
                      <i data-lucide="send" class="w-3.5 h-3.5"></i>
                      <span>Dar Parabéns no WhatsApp</span>
                    </button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    </div>
  `;
}

// ============================================================================
// ABA 1: CENTRAL DE ESCALAS (VISÃO DIRETOR & GERAL)
// ============================================================================

function renderSchedulesTab() {
  const loggedUser = getLoggedInUser();
  const logged = loggedUser;
  const effectiveUser = getEffectiveUser();
  const canManage = isPrivilegedUser(loggedUser) || isPrivilegedUser(effectiveUser);
  const canMark = canMarkAttendanceUser(effectiveUser);
  const isDirector = state.mode === 'director' || canManage;
  const selected = state.schedules.find(s => s.id === state.selectedScheduleId) || state.schedules[0];

  // Top KPI strip
  const totalPositions = selected ? getScheduleTargetPositions(selected) : 0;
  const filledPositions = selected ? selected.assignments.length : 0;
  const confirmedCount = selected ? selected.assignments.filter(a => a.status === 'confirmed').length : 0;
  const swapCount = selected ? selected.assignments.filter(a => a.status === 'swap_requested').length : 0;

  return `
    <div class="space-y-6 animate-view">
      <!-- Top Action Banner -->
      <div class="glass-panel rounded-3xl p-5 sm:p-6 border border-slate-800/90 relative overflow-hidden">
        <div class="absolute -right-12 -top-12 w-56 h-56 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold ${
              isDirector
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
            } mb-2">
              <span class="w-2 h-2 rounded-full ${isDirector ? 'bg-amber-400' : 'bg-cyan-400'}"></span>
              <span>${isDirector ? 'MODO DIRETOR — CONTROLE TOTAL DE ESCALAS' : 'MODO EQUIPE — QUADRO GERAL DE CULTOS'}</span>
            </div>
            <h1 class="text-2xl sm:text-3xl font-display font-extrabold text-white tracking-tight">
              Escala Geral da Mídia
            </h1>
            <p class="text-xs sm:text-sm text-slate-400 mt-1">
              ${isDirector
                ? 'Escale cada operador por função, gere escalas inteligentes com 1 clique ou envie o resumo pronto no WhatsApp.'
                : 'Confira quem trabalhará em cada câmera, mesa de corte, telão, fotografia e social media em todos os cultos.'}
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-2.5">
            ${canMark ? `
              <button
                onclick="openScanAttendanceModal('${selected?.id || ''}')"
                class="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 text-slate-950 font-extrabold text-xs sm:text-sm shadow-lg glow-emerald hover:brightness-110 active:scale-95 transition">
                <i data-lucide="scan-line" class="w-4 h-4"></i>
                <span>Marcar Frequência QR</span>
              </button>
            ` : ''}

            ${isDirector ? `
              ${selected ? `
                <button
                  onclick="openAdjustScheduleModal('${selected.id}')"
                  class="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 text-slate-950 font-extrabold text-xs sm:text-sm shadow-lg glow-cyan hover:brightness-110 active:scale-95 transition"
                  title="Adicionar ou remover voluntários da escala deste culto">
                  <i data-lucide="sliders" class="w-4 h-4"></i>
                  <span>Ajustar Escala</span>
                </button>
              ` : ''}
              <button
                onclick="openNewScheduleModal()"
                class="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold text-xs sm:text-sm shadow-lg glow-gold hover:brightness-110 transition">
                <i data-lucide="calendar-plus" class="w-4 h-4"></i>
                <span>Criar Culto / Evento</span>
              </button>
              <button
                onclick="openMemberModal()"
                class="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-slate-100 font-semibold text-xs sm:text-sm border border-slate-700 transition">
                <i data-lucide="user-plus" class="w-4 h-4 text-cyan-400"></i>
                <span>Cadastrar Membro</span>
              </button>
              <button
                onclick="openRoleModal()"
                class="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-slate-100 font-semibold text-xs sm:text-sm border border-slate-700 transition">
                <i data-lucide="palette" class="w-4 h-4 text-fuchsia-400"></i>
                <span>+ Criar Função</span>
              </button>
              <button
                onclick="setActiveTab('attendance')"
                class="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-bold text-xs sm:text-sm border border-emerald-500/40 transition">
                <i data-lucide="file-spreadsheet" class="w-4 h-4 text-emerald-400"></i>
                <span>Relatório Frequência & Cantina (PDF/Excel)</span>
              </button>
            ` : `
              <button
                onclick="setActiveTab('my_area')"
                class="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-bold text-xs sm:text-sm shadow-lg glow-cyan transition">
                <i data-lucide="check-circle-2" class="w-4 h-4"></i>
                <span>Ir para Minhas Escalas</span>
              </button>
            `}
          </div>
        </div>
      </div>

      <!-- Storyboard de Quantidade de Voluntários e Funções -->
      ${renderVolunteersRolesStoryboard()}

      <!-- Dashboard de Aniversariantes da Semana -->
      ${renderBirthdayWidget()}

      <!-- Top 5 Gamification Ranking Banner -->
      ${renderTopRankingBanner()}

      <!-- Interactive Storyboard for the Selected Service -->
      ${selected ? renderStoryboardPanel(selected, isDirector) : ''}

      <!-- Main Grid: Sidebar of Services + Active Service Board -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        <!-- Left Column: Cultos & Eventos Agenda -->
        <div class="lg:col-span-4 space-y-3">
          <div class="flex items-center justify-between px-1">
            <h2 class="text-xs font-bold uppercase tracking-wider text-slate-400">Agenda de Cultos & Eventos</h2>
            <span class="text-xs text-cyan-400 font-medium">${state.schedules.length} programados</span>
          </div>

          <div class="space-y-3">
            ${state.schedules.map(sched => {
              const d = formatDateBR(sched.date);
              const isSelected = selected && sched.id === selected.id;
              const confirmed = sched.assignments.filter(a => a.status === 'confirmed').length;
              const swaps = sched.assignments.filter(a => a.status === 'swap_requested').length;
              const myAssignment = sched.assignments.find(a => a.memberId === state.activeMemberId);

              return `
                <div
                  onclick="selectSchedule('${sched.id}')"
                  class="glass-panel-interactive rounded-2xl p-4 cursor-pointer relative overflow-hidden ${
                    isSelected
                      ? 'border-cyan-400/70 bg-slate-900/90 ring-1 ring-cyan-400/40'
                      : 'border-slate-800/80'
                  }">
                  <div class="flex items-start gap-3.5">
                    <!-- Date Badge -->
                    <div class="w-14 h-16 rounded-2xl flex flex-col items-center justify-center shrink-0 border ${
                      isSelected
                        ? 'bg-gradient-to-b from-cyan-500/25 to-blue-600/25 border-cyan-400/50 text-cyan-300'
                        : 'bg-slate-900/80 border-slate-800 text-slate-300'
                    }">
                      <span class="text-[10px] font-bold uppercase tracking-wider">${d.month}</span>
                      <span class="text-xl font-display font-extrabold leading-none my-0.5 text-white">${d.day}</span>
                      <span class="text-[10px] text-slate-400">${d.weekday.split('-')[0]}</span>
                    </div>

                    <div class="flex-1 min-w-0">
                      <div class="flex items-center justify-between gap-2">
                        <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-800 text-cyan-300 border border-slate-700">
                          ${sched.category}
                        </span>
                        <span class="text-xs font-semibold text-amber-300 flex items-center gap-1">
                          <i data-lucide="clock" class="w-3 h-3"></i>
                          ${sched.startTime}
                        </span>
                      </div>

                      <h3 class="font-display font-bold text-base text-white mt-1.5 truncate">${sched.title}</h3>
                      
                      <div class="flex flex-wrap items-center gap-2 mt-2.5 text-[11px] text-slate-400">
                        <span class="inline-flex items-center gap-1 text-emerald-300 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                          <i data-lucide="users" class="w-3 h-3"></i>
                          ${sched.assignments.length}/${getScheduleTargetPositions(sched)} escalados (${confirmed} OK)
                        </span>
                        ${swaps > 0 ? `
                          <span class="inline-flex items-center gap-1 text-rose-300 bg-rose-500/15 px-2 py-0.5 rounded-md border border-rose-500/30">
                            <i data-lucide="alert-triangle" class="w-3 h-3"></i>
                            ${swaps} troca
                          </span>
                        ` : ''}
                        ${myAssignment ? `
                          <span class="inline-flex items-center gap-1 text-cyan-300 bg-cyan-500/15 px-2 py-0.5 rounded-md border border-cyan-500/30 font-semibold">
                            Você: ${getRoleById(myAssignment.roleId).shortName}
                          </span>
                        ` : ''}
                      </div>
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Right Column: Detailed Role Matrix for Selected Culto -->
        <div class="lg:col-span-8">
          ${selected ? renderSelectedScheduleDetail(selected, isDirector, totalPositions, filledPositions, confirmedCount, swapCount) : `
            <div class="glass-panel rounded-3xl p-10 sm:p-14 text-center space-y-4 border border-cyan-500/25">
              <div class="w-16 h-16 rounded-3xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                <i data-lucide="calendar-plus" class="w-8 h-8"></i>
              </div>
              <div>
                <h3 class="text-xl font-display font-extrabold text-white">Nenhum Culto ou Evento Cadastrado</h3>
                <p class="text-xs sm:text-sm text-slate-400 max-w-md mx-auto mt-1">
                  O banco de dados está limpo e pronto! Crie a primeira escala de culto para escalar a equipe e ativar o Storyboard de produção.
                </p>
              </div>
              ${isDirector ? `
                <button
                  onclick="openNewScheduleModal()"
                  class="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-extrabold text-xs sm:text-sm shadow-lg glow-gold hover:brightness-110 transition">
                  <i data-lucide="plus-circle" class="w-4 h-4"></i>
                  <span>Criar Primeiro Culto / Escala</span>
                </button>
              ` : ''}
            </div>
          `}
        </div>

      </div>
    </div>
  `;
}

function renderSelectedScheduleDetail(sched, isDirector, totalPositions, filledPositions, confirmedCount, swapCount) {
  const d = formatDateBR(sched.date);
  const categories = [...new Set(state.roles.map(r => r.category))];

  return `
    <div class="glass-panel rounded-3xl p-5 sm:p-6 border border-slate-800/90 space-y-6">
      
      <!-- Service Header & Director Controls -->
      <div class="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-800/80">
        <div>
          <div class="flex flex-wrap items-center gap-2 mb-2">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
              ${sched.category}
            </span>
            <span class="text-xs text-slate-300 font-medium flex items-center gap-1.5">
              <i data-lucide="calendar" class="w-3.5 h-3.5 text-amber-400"></i>
              ${d.full} de ${d.year}
            </span>
          </div>
          <h2 class="text-2xl font-display font-extrabold text-white">${sched.title}</h2>
          <p class="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
            <i data-lucide="map-pin" class="w-3.5 h-3.5 text-cyan-400"></i>
            ${sched.location}
          </p>
        </div>

        <!-- Quick Actions: Adjust, Auto-fill, WhatsApp Export, Delete -->
        <div class="flex flex-wrap items-center gap-2">
          ${isDirector ? `
            <button
              onclick="openAdjustScheduleModal('${sched.id}')"
              class="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 text-slate-950 font-extrabold text-xs shadow-lg glow-cyan hover:brightness-110 active:scale-95 transition"
              title="Adicionar ou remover voluntários desta escala com 1 clique">
              <i data-lucide="sliders" class="w-4 h-4"></i>
              <span>⚙️ Ajustar Escala</span>
            </button>
            <button
              onclick="autoFillSchedule('${sched.id}')"
              class="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold transition"
              title="Preenche automaticamente todas as funções com base nas habilidades de cada voluntário">
              <i data-lucide="wand-2" class="w-4 h-4"></i>
              <span>Auto-Escalar Equipe</span>
            </button>
          ` : ''}

          <button
            onclick="copyScheduleForWhatsApp('${sched.id}')"
            class="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition">
            <i data-lucide="share-2" class="w-4 h-4"></i>
            <span>Copiar p/ WhatsApp</span>
          </button>

          ${isDirector ? `
            <button
              onclick="deleteSchedule('${sched.id}')"
              class="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/20 transition"
              title="Excluir Escala">
              <i data-lucide="trash-2" class="w-4 h-4"></i>
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Briefing & Call Time Strip -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div class="p-3.5 rounded-2xl bg-slate-900/75 border border-slate-800/80">
          <span class="text-[10px] uppercase tracking-wider text-slate-400 block">Call Time (Chegada)</span>
          <span class="text-base font-display font-bold text-amber-300 mt-0.5 flex items-center gap-1.5">
            <i data-lucide="alarm-clock" class="w-4 h-4"></i>
            ${sched.callTime}
          </span>
        </div>
        <div class="p-3.5 rounded-2xl bg-slate-900/75 border border-slate-800/80">
          <span class="text-[10px] uppercase tracking-wider text-slate-400 block">Início do Culto / Live</span>
          <span class="text-base font-display font-bold text-cyan-300 mt-0.5 flex items-center gap-1.5">
            <i data-lucide="radio" class="w-4 h-4"></i>
            ${sched.startTime}
          </span>
        </div>
        <div class="p-3.5 rounded-2xl bg-slate-900/75 border border-slate-800/80">
          <span class="text-[10px] uppercase tracking-wider text-slate-400 block">Dress Code (Vestimenta)</span>
          <span class="text-xs font-semibold text-slate-200 mt-1 block truncate" title="${sched.dressCode}">
            ${sched.dressCode || 'Preto Padrão'}
          </span>
        </div>
        <div class="p-3.5 rounded-2xl bg-slate-900/75 border border-slate-800/80">
          <div class="flex items-center justify-between">
            <span class="text-[10px] uppercase tracking-wider text-slate-400 block">Status da Equipe</span>
            ${isDirector ? `
              <button
                type="button"
                onclick="openAdjustScheduleModal('${sched.id}')"
                class="text-[9px] text-cyan-300 hover:text-cyan-200 font-extrabold uppercase hover:underline">
                Ajustar Vagas
              </button>
            ` : ''}
          </div>
          <span class="text-xs font-bold text-emerald-300 mt-1 block">
            ${confirmedCount} confirmados • ${filledPositions}/${totalPositions} vagas
          </span>
        </div>
      </div>

      ${sched.notes ? `
        <div class="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3">
          <i data-lucide="megaphone" class="w-5 h-5 text-amber-400 shrink-0 mt-0.5"></i>
          <div class="text-xs text-slate-200 leading-relaxed">
            <strong class="text-amber-300 block mb-0.5">Briefing & Orientações da Direção:</strong>
            ${sched.notes}
          </div>
        </div>
      ` : ''}

      <!-- Barra de Pesquisa de Voluntário na Escala -->
      <div class="glass-panel rounded-2xl p-3.5 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="flex items-center gap-2 flex-1">
          <div class="relative flex-1">
            <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"></i>
            <input
              id="schedule-volunteer-search-input"
              type="text"
              placeholder="Pesquisar voluntário na escala (Ex: Wesley, Lucas, Fernando)..."
              value="${escapeHTML(state.scheduleVolunteerSearch || '')}"
              onkeydown="if(event.key === 'Enter') executeScheduleVolunteerSearch();"
              class="w-full bg-slate-950/90 border border-slate-700 focus:border-amber-400 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none">
          </div>
          <button
            type="button"
            onclick="executeScheduleVolunteerSearch()"
            class="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-md glow-amber transition shrink-0"
            title="Pesquisar Voluntário nesta Escala">
            <i data-lucide="search" class="w-3.5 h-3.5"></i>
            <span>Pesquisar</span>
          </button>
          ${state.scheduleVolunteerSearch ? `
            <button
              type="button"
              onclick="clearScheduleVolunteerSearch()"
              class="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold shrink-0"
              title="Limpar pesquisa na escala">
              ✕ Limpar
            </button>
          ` : ''}
        </div>
        ${state.scheduleVolunteerSearch ? `
          <div class="text-xs text-amber-300 font-semibold flex items-center gap-1.5 shrink-0">
            <i data-lucide="user-check" class="w-4 h-4"></i>
            <span>Mostrando postos de: "<strong>${escapeHTML(state.scheduleVolunteerSearch)}</strong>"</span>
          </div>
        ` : ''}
      </div>

      <!-- Role Assignments Grouped by Department -->
      <div class="space-y-6">
        ${(() => {
          const schedVolunteerQuery = (state.scheduleVolunteerSearch || '').toLowerCase().trim();
          if (schedVolunteerQuery) {
            const hasAnyMatch = sched.assignments.some(a => {
              const m = getMemberById(a.memberId);
              return m && (
                (m.name || '').toLowerCase().includes(schedVolunteerQuery) ||
                (m.nickname || '').toLowerCase().includes(schedVolunteerQuery)
              );
            });
            if (!hasAnyMatch) {
              return `
                <div class="glass-panel rounded-3xl p-6 border border-slate-800 text-center space-y-2">
                  <div class="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
                    <i data-lucide="user-x" class="w-5 h-5"></i>
                  </div>
                  <h4 class="text-sm font-bold text-white">Nenhuma função atribuída</h4>
                  <p class="text-xs text-slate-400">O voluntário "${escapeHTML(state.scheduleVolunteerSearch)}" não está escalado em nenhuma função nesta data.</p>
                  <button type="button" onclick="clearScheduleVolunteerSearch()" class="px-3.5 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs">Exibir todas as funções</button>
                </div>
              `;
            }
          }
          return categories.map(category => {
          let roles = state.roles.filter(r => r.category === category);
          if (schedVolunteerQuery) {
            roles = roles.filter(role => {
              const assign = sched.assignments.find(a => a.roleId === role.id);
              const assignedMember = assign ? getMemberById(assign.memberId) : null;
              return assignedMember && (
                (assignedMember.name || '').toLowerCase().includes(schedVolunteerQuery) ||
                (assignedMember.nickname || '').toLowerCase().includes(schedVolunteerQuery)
              );
            });
            if (roles.length === 0) return '';
          }
          return `
            <div class="space-y-3">
              <div class="flex items-center gap-2">
                <span class="w-1.5 h-4 rounded-full bg-cyan-400"></span>
                <h3 class="text-xs font-bold uppercase tracking-wider text-slate-300">${category}</h3>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3.5">
                ${roles.map(role => {
                  const assign = sched.assignments.find(a => a.roleId === role.id);
                  const assignedMember = assign ? getMemberById(assign.memberId) : null;
                  const isCurrentUser = assignedMember && assignedMember.id === state.activeMemberId;
                  const isSearchedVolunteer = schedVolunteerQuery && assignedMember && (
                    (assignedMember.name || '').toLowerCase().includes(schedVolunteerQuery) ||
                    (assignedMember.nickname || '').toLowerCase().includes(schedVolunteerQuery)
                  );

                  // Sort members alphabetically so specialists and others appear in A-Z order
                  const skilledMembers = state.members.filter(m => m.skills.includes(role.id))
                    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
                  const otherMembers = state.members.filter(m => !m.skills.includes(role.id))
                    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));

                  const statusBadge = !assign
                    ? `<span class="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">Vaga Aberta</span>`
                    : assign.status === 'confirmed'
                    ? `<span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">✓ Confirmado</span>`
                    : assign.status === 'swap_requested'
                    ? `<span class="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-semibold">⚠ Pediu Troca</span>`
                    : `<span class="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">⏳ Pendente</span>`;

                  return `
                    <div class="p-3.5 rounded-2xl border transition ${
                      isSearchedVolunteer
                        ? 'bg-amber-950/30 border-amber-500/60 ring-1 ring-amber-400/40'
                        : isCurrentUser
                        ? 'bg-cyan-950/35 border-cyan-400/50 ring-1 ring-cyan-400/30'
                        : 'bg-slate-900/65 border-slate-800/80 hover:border-slate-700'
                    }">
                      <div class="flex items-start justify-between gap-2 mb-2.5">
                        <div class="flex items-center gap-2.5">
                          <div class="w-9 h-9 rounded-xl flex items-center justify-center border ${role.badgeClass}">
                            <i data-lucide="${role.icon}" class="w-4 h-4"></i>
                          </div>
                          <div>
                            <div class="flex items-center gap-1.5">
                              <h4 class="text-xs font-bold text-white">${role.shortName}</h4>
                              ${isSearchedVolunteer ? `<span class="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-amber-400 text-slate-950">LOCALIZADO</span>` : ''}
                              ${isCurrentUser ? `<span class="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded bg-cyan-400 text-slate-950">VOCÊ</span>` : ''}
                            </div>
                            <p class="text-[11px] text-slate-400">${role.station}</p>
                          </div>
                        </div>
                        ${statusBadge}
                      </div>

                      ${isDirector ? `
                        <!-- Director Dropdown to assign or swap member -->
                        <div class="mt-2 flex items-center gap-2">
                          ${assignedMember ? renderMemberAvatar(assignedMember, 'w-8 h-8 rounded-xl text-[10px]', false) : ''}
                          <select
                            onchange="updateAssignment('${sched.id}', '${role.id}', this.value)"
                            class="w-full bg-slate-950/90 border border-slate-800 focus:border-cyan-400 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none">
                            <option value="">-- Selecionar Voluntário --</option>
                            <optgroup label="★ Especialistas na Função (${skilledMembers.length})">
                              ${skilledMembers.map(m => {
                                const blk = isMemberBlockedOnDate(m, sched.date);
                                return `
                                  <option value="${m.id}" ${assignedMember?.id === m.id ? 'selected' : ''}>
                                    ${escapeHTML(m.name)} ${blk ? `🚫 INDISPONÍVEL (${escapeHTML(blk.reason)})` : `(${escapeHTML(m.availability)})`}
                                  </option>
                                `;
                              }).join('')}
                            </optgroup>
                            <optgroup label="Outros Membros da Equipe">
                              ${otherMembers.map(m => {
                                const blk = isMemberBlockedOnDate(m, sched.date);
                                return `
                                  <option value="${m.id}" ${assignedMember?.id === m.id ? 'selected' : ''}>
                                    ${escapeHTML(m.name)} ${blk ? `🚫 INDISPONÍVEL (${escapeHTML(blk.reason)})` : ''}
                                  </option>
                                `;
                              }).join('')}
                            </optgroup>
                          </select>

                          ${assign ? `
                            <button
                              onclick="toggleAssignmentStatus('${sched.id}', '${role.id}', '${assign.status === 'confirmed' ? 'pending' : 'confirmed'}')"
                              title="Alternar confirmação"
                              class="p-2 rounded-xl border ${
                                assign.status === 'confirmed'
                                  ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                                  : 'border-slate-700 bg-slate-800 text-slate-400 hover:text-white'
                              }">
                              <i data-lucide="check" class="w-3.5 h-3.5"></i>
                            </button>
                            ${assignedMember ? `
                              <button
                                type="button"
                                onclick="sendIndividualWhatsAppReminder('${sched.id}', '${role.id}', '${assignedMember.id}')"
                                title="Enviar lembrete de escala no WhatsApp de ${escapeHTML(assignedMember.name)}"
                                class="p-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/30 transition">
                                <i data-lucide="send" class="w-3.5 h-3.5"></i>
                              </button>
                            ` : ''}
                            <button
                              type="button"
                              onclick="removeVolunteerAssignment('${sched.id}', '${role.id}')"
                              title="Remover ${escapeHTML(assignedMember ? assignedMember.name : 'voluntário')} desta função na escala"
                              class="p-2 rounded-xl border border-rose-500/30 bg-rose-500/15 text-rose-300 hover:bg-rose-500/30 transition">
                              <i data-lucide="user-minus" class="w-3.5 h-3.5"></i>
                            </button>
                          ` : ''}
                        </div>
                      ` : `
                        <!-- Team Member Read/Self-Checkin View -->
                        <div class="mt-2 pt-2 border-t border-slate-800/70 flex items-center justify-between">
                          ${assignedMember ? `
                            <div class="flex items-center gap-2">
                              ${renderMemberAvatar(assignedMember, 'w-7 h-7 rounded-full text-[10px]', false)}
                              <span class="text-xs font-semibold text-slate-200">${escapeHTML(assignedMember.name)}</span>
                            </div>
                          ` : `
                            <span class="text-xs italic text-slate-500">Aguardando escalação</span>
                          `}

                          ${isCurrentUser ? `
                            <div class="flex items-center gap-1.5">
                              ${assign.status !== 'confirmed' ? `
                                <button
                                  onclick="toggleAssignmentStatus('${sched.id}', '${role.id}', 'confirmed')"
                                  class="px-2.5 py-1 rounded-lg bg-emerald-500 text-slate-950 font-bold text-[11px] hover:bg-emerald-400 transition">
                                  Confirmar
                                </button>
                              ` : ''}
                              <button
                                onclick="promptSwapRequest('${sched.id}', '${role.id}')"
                                class="px-2 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-amber-300 text-[11px] border border-slate-700 transition">
                                Pedir Troca
                              </button>
                            </div>
                          ` : assign?.status === 'swap_requested' ? `
                            <button
                              onclick="takeOverSwapAssignment('${sched.id}', '${role.id}')"
                              class="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-extrabold text-[11px] shadow hover:brightness-110 transition">
                              🔄 Assumir Vaga (+50 XP)
                            </button>
                          ` : ''}
                        </div>
                      `}

                      ${assign?.swapNote ? `
                        <div class="mt-2 px-2.5 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/25 text-[11px] text-rose-200 flex items-center justify-between gap-2">
                          <span><strong>Motivo da troca:</strong> ${escapeHTML(assign.swapNote)}</span>
                          ${!isCurrentUser ? `
                            <button
                              onclick="takeOverSwapAssignment('${sched.id}', '${role.id}')"
                              class="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-extrabold text-[10px] shrink-0">
                              Cobrir Escala (+50 XP)
                            </button>
                          ` : ''}
                        </div>
                      ` : ''}
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `;
        }).join('');
      })()}
      </div>
    </div>
  `;
}

// ============================================================================
// ABA 2: MINHA ESCALA & CHECK-IN (VISÃO INDIVIDUAL DO MEMBRO DA EQUIPE)
// ============================================================================

function renderMyAreaTab() {
  const loggedUser = getLoggedInUser();
  const canManage = isPrivilegedUser(loggedUser);
  const member = canManage ? (getMemberById(state.activeMemberId) || loggedUser || state.members[0]) : loggedUser;
  if (!member) return '';

  // Find all schedules where this member is assigned
  const mySchedules = [];
  state.schedules.forEach(sched => {
    sched.assignments.forEach(assign => {
      if (assign.memberId === member.id) {
        mySchedules.push({
          schedule: sched,
          assignment: assign,
          role: getRoleById(assign.roleId)
        });
      }
    });
  });

  const confirmedTotal = mySchedules.filter(item => item.assignment.status === 'confirmed').length;
  const pendingTotal = mySchedules.filter(item => item.assignment.status === 'pending').length;

  return `
    <div class="space-y-6 animate-view">
      
      <!-- Personal Futuristic Pass Card -->
      <div class="glass-panel rounded-3xl p-6 border border-cyan-500/30 relative overflow-hidden">
        <div class="absolute -right-10 -bottom-10 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div class="flex items-center gap-4">
            ${renderMemberAvatar(member, 'w-16 h-16 sm:w-20 sm:h-20 rounded-3xl text-2xl', true)}
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Credencial Digital AD Mídia
                </span>
                ${getRoleTypeBadge(member.roleType)}
                ${renderStarRatingWidget(member, false)}
                <button
                  onclick="openMemberModal('${member.id}')"
                  class="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 transition">
                  <i data-lucide="user-cog" class="w-3 h-3"></i>
                  <span>Editar Dados do Perfil</span>
                </button>
                <button
                  onclick="openQrModal('${member.id}')"
                  class="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 transition">
                  <i data-lucide="qr-code" class="w-3 h-3"></i>
                  <span>Meu QR Code</span>
                </button>
                <button
                  onclick="triggerQuickPhotoUpload('${member.id}')"
                  class="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition">
                  <i data-lucide="camera" class="w-3 h-3"></i>
                  <span>${member.photoUrl ? 'Atualizar Foto' : 'Subir Foto'}</span>
                </button>
                ${member.photoUrl ? `
                  <button
                    onclick="openCropperForMemberPhoto('${member.id}')"
                    title="Ajustar enquadramento e zoom da foto de perfil"
                    class="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 transition">
                    <i data-lucide="crop" class="w-3 h-3"></i>
                    <span>Redimensionar Foto</span>
                  </button>
                ` : ''}
                <span class="text-xs text-emerald-300 font-medium">${escapeHTML(member.email || '')}</span>
                ${member.phone ? `<span class="text-xs text-slate-400">• ${escapeHTML(member.phone)}</span>` : ''}
              </div>
              <h1 class="text-2xl sm:text-3xl font-display font-extrabold text-white mt-1">${escapeHTML(member.name)}</h1>
              <p class="text-xs sm:text-sm text-amber-300 font-medium">${escapeHTML(member.title)} • Disponibilidade: ${escapeHTML(member.availability)}</p>
              
              <!-- Member's registered functions -->
              <div class="flex flex-wrap gap-1.5 mt-3">
                ${member.skills.map(skillId => {
                  const r = getRoleById(skillId);
                  return `
                    <span class="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-lg border ${r.badgeClass}">
                      <i data-lucide="${r.icon}" class="w-3 h-3"></i>
                      ${r.shortName}
                    </span>
                  `;
                }).join('')}
              </div>
            </div>
          </div>

          <!-- Stats for this member -->
          <div class="grid grid-cols-3 gap-3 shrink-0">
            <div class="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
              <span class="text-2xl font-display font-extrabold text-white">${mySchedules.length}</span>
              <span class="block text-[10px] uppercase tracking-wider text-slate-400 mt-0.5">Escalas</span>
            </div>
            <div class="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center">
              <span class="text-2xl font-display font-extrabold text-emerald-300">${confirmedTotal}</span>
              <span class="block text-[10px] uppercase tracking-wider text-emerald-200/80 mt-0.5">Confirmadas</span>
            </div>
            <div class="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-center">
              <span class="text-2xl font-display font-extrabold text-amber-300">${pendingTotal}</span>
              <span class="block text-[10px] uppercase tracking-wider text-amber-200/80 mt-0.5">Pendentes</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Gamification Ranking Strip in Team View -->
      ${renderTopRankingBanner()}

      <!-- VOLUTS FEATURE: Bloqueio de Datas / Indisponibilidade & Mural de Substituições -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        <!-- Bloqueio de Datas (Dias que NÃO posso servir) -->
        <div class="glass-panel rounded-3xl p-5 border border-rose-500/30 space-y-3.5">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2.5">
              <div class="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-300">
                <i data-lucide="calendar-x-2" class="w-5 h-5"></i>
              </div>
              <div>
                <h3 class="text-sm font-display font-extrabold text-white">Minhas Indisponibilidades (Estilo Voluts)</h3>
                <p class="text-[11px] text-slate-400">Informe datas em que você NÃO poderá servir para bloquear na escala</p>
              </div>
            </div>
            <span class="text-xs font-bold text-rose-300 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20">
              ${(member.blockedDates || []).length} bloqueios
            </span>
          </div>

          <form onsubmit="handleAddBlockedDate(event, '${member.id}')" class="grid grid-cols-1 sm:grid-cols-12 gap-2">
            <input
              id="block-date-input"
              type="date"
              required
              class="sm:col-span-4 bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-400" />
            <input
              id="block-reason-input"
              type="text"
              placeholder="Motivo (Ex: Viagem, Plantão, Prova...)"
              class="sm:col-span-5 bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-400" />
            <button
              type="submit"
              class="sm:col-span-3 py-2 px-3 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 font-bold text-xs transition">
              + Bloquear Data
            </button>
          </form>

          <div class="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            ${(member.blockedDates || []).length === 0 ? `
              <p class="text-xs text-slate-500 italic py-2">Você está disponível para todas as datas no momento.</p>
            ` : (member.blockedDates || []).map(b => {
              const fd = formatDateBR(b.date);
              return `
                <div class="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs">
                  <div>
                    <strong class="text-rose-300">${fd.full}/${fd.year}</strong>
                    <span class="text-slate-400 ml-1.5">— ${escapeHTML(b.reason)}</span>
                  </div>
                  <button
                    onclick="removeBlockedDate('${member.id}', '${b.id}')"
                    class="text-[11px] text-slate-400 hover:text-emerald-300 px-2 py-0.5 rounded bg-slate-800">
                    Liberar Data
                  </button>
                </div>
              `;
            }).join('')}
          </div>
        </div>

        <!-- Bolsa de Substituição (Vagas abertas por pedidos de troca com +50 XP Bônus) -->
        ${(() => {
          const openSwaps = [];
          state.schedules.forEach(s => {
            s.assignments.forEach(a => {
              if (a.status === 'swap_requested' && a.memberId !== member.id) {
                openSwaps.push({ schedule: s, assign: a, role: getRoleById(a.roleId), requester: getMemberById(a.memberId) });
              }
            });
          });

          return `
            <div class="glass-panel rounded-3xl p-5 border border-amber-500/30 space-y-3.5">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2.5">
                  <div class="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-300">
                    <i data-lucide="repeat" class="w-5 h-5"></i>
                  </div>
                  <div>
                    <h3 class="text-sm font-display font-extrabold text-white">Bolsa de Substituição (+50 XP Bônus)</h3>
                    <p class="text-[11px] text-slate-400">Colegas que pediram troca e precisam de cobertura no culto</p>
                  </div>
                </div>
                <span class="text-xs font-bold text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                  ${openSwaps.length} abertas
                </span>
              </div>

              <div class="space-y-2 max-h-48 overflow-y-auto pr-1">
                ${openSwaps.length === 0 ? `
                  <p class="text-xs text-slate-500 italic py-4 text-center">Nenhum pedido de substituição aberto no momento.</p>
                ` : openSwaps.map(item => {
                  const fd = formatDateBR(item.schedule.date);
                  return `
                    <div class="p-3 rounded-2xl bg-slate-900/80 border border-amber-500/30 flex items-center justify-between gap-2">
                      <div>
                        <span class="text-[10px] font-bold text-amber-300 uppercase block">${fd.full} • ${escapeHTML(item.schedule.title)}</span>
                        <h4 class="text-xs font-bold text-white">${escapeHTML(item.role.name)}</h4>
                        <p class="text-[11px] text-slate-400">Pedido por: ${escapeHTML(item.requester?.name || 'Voluntário')} (${escapeHTML(item.assign.swapNote || 'Troca')})</p>
                      </div>
                      <button
                        onclick="takeOverSwapAssignment('${item.schedule.id}', '${item.role.id}')"
                        class="px-3 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-extrabold text-xs shrink-0 shadow">
                        Assumir (+50 XP)
                      </button>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          `;
        })()}
      </div>

      <!-- Storyboard in Team View (Highlighting the Member's Primary Role) -->
      ${(() => {
        const nextMySched = mySchedules[0]?.schedule || state.schedules[0];
        const myRoleInSched = mySchedules[0]?.role?.id || member.skills[0];
        return nextMySched ? renderStoryboardPanel(nextMySched, state.mode === 'director', myRoleInSched) : '';
      })()}

      <!-- List of Member's Upcoming Assignments -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="text-lg font-display font-bold text-white flex items-center gap-2">
            <i data-lucide="Sparkles" class="w-5 h-5 text-cyan-400"></i>
            <span>Onde você vai trabalhar nos próximos cultos</span>
          </h2>
          <span class="text-xs text-slate-400">
            ${canManage ? 'Modo Liderança: você pode alternar voluntários no topo' : '🔒 Visão exclusiva e privada do seu usuário'}
          </span>
        </div>

        ${mySchedules.length === 0 ? `
          <div class="glass-panel rounded-3xl p-10 text-center space-y-3">
            <div class="w-12 h-12 rounded-2xl bg-slate-800/80 flex items-center justify-center mx-auto text-slate-400">
              <i data-lucide="calendar-off" class="w-6 h-6"></i>
            </div>
            <h3 class="text-base font-bold text-white">Você ainda não está escalado(a) nos cultos atuais</h3>
            <p class="text-xs text-slate-400 max-w-md mx-auto">
              Consulte a aba "Central de Escalas" para ver o quadro completo da igreja ou fale com o Diretor de Mídia.
            </p>
          </div>
        ` : `
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            ${mySchedules.map(({ schedule, assignment, role }) => {
              const d = formatDateBR(schedule.date);
              const teammates = schedule.assignments
                .filter(a => a.memberId !== member.id)
                .map(a => ({ member: getMemberById(a.memberId), role: getRoleById(a.roleId) }))
                .filter(item => item.member);

              return `
                <div class="glass-panel rounded-3xl p-5 border ${
                  assignment.status === 'confirmed'
                    ? 'border-emerald-500/35'
                    : assignment.status === 'swap_requested'
                    ? 'border-rose-500/40'
                    : 'border-cyan-500/35'
                } flex flex-col justify-between space-y-4">
                  
                  <div>
                    <!-- Top Date & Status -->
                    <div class="flex items-center justify-between gap-2 mb-3">
                      <span class="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                        <i data-lucide="calendar" class="w-3.5 h-3.5"></i>
                        ${d.full}
                      </span>
                      ${assignment.status === 'confirmed' ? `
                        <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          ✓ Presença Confirmada
                        </span>
                      ` : assignment.status === 'swap_requested' ? `
                        <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          ⚠ Troca Solicitada
                        </span>
                      ` : `
                        <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          ⏳ Aguardando Seu Check-in
                        </span>
                      `}
                    </div>

                    <h3 class="text-xl font-display font-extrabold text-white">${schedule.title}</h3>
                    <p class="text-xs text-slate-400 mt-0.5">${schedule.location}</p>

                    <!-- Highlighted Assigned Role Box -->
                    <div class="mt-4 p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex items-start gap-3.5">
                      <div class="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${role.badgeClass}">
                        <i data-lucide="${role.icon}" class="w-5 h-5"></i>
                      </div>
                      <div>
                        <span class="text-[10px] uppercase font-bold tracking-wider text-cyan-400 block">Sua Função Escalada</span>
                        <h4 class="text-base font-display font-bold text-white">${role.name}</h4>
                        <p class="text-xs text-amber-300 font-medium mt-0.5">📍 Posição / Estação: ${role.station}</p>
                        <p class="text-[11px] text-slate-400 mt-1">${role.description}</p>
                      </div>
                    </div>

                    <!-- Schedule Timing & Dress Code -->
                    <div class="grid grid-cols-2 gap-2.5 mt-3 text-xs">
                      <div class="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                        <span class="text-[10px] text-slate-400 block">Chegada / Briefing</span>
                        <strong class="text-amber-300">${schedule.callTime} (Início ${schedule.startTime})</strong>
                      </div>
                      <div class="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80">
                        <span class="text-[10px] text-slate-400 block">Dress Code</span>
                        <strong class="text-slate-200 truncate block">${schedule.dressCode}</strong>
                      </div>
                    </div>

                    <!-- Who works with you -->
                    <div class="mt-3 pt-3 border-t border-slate-800/70">
                      <span class="text-[10px] uppercase tracking-wider text-slate-400 block mb-1.5">
                        Equipe escalada com você (${teammates.length} colegas):
                      </span>
                      <div class="flex flex-wrap gap-1.5">
                        ${teammates.slice(0, 6).map(t => `
                          <span class="text-[11px] px-2 py-0.5 rounded-md bg-slate-900 text-slate-300 border border-slate-800">
                            <strong>${t.role.shortName}:</strong> ${t.member.name.split(' ')[0]}
                          </span>
                        `).join('')}
                        ${teammates.length > 6 ? `<span class="text-[11px] text-cyan-400">+${teammates.length - 6} mais</span>` : ''}
                      </div>
                    </div>

                    <!-- Checklist de Equipamentos & Pós-Culto -->
                    <div class="mt-3 pt-3 border-t border-slate-800/70 space-y-1.5">
                      <span class="text-[10px] uppercase tracking-wider font-bold text-cyan-300 block">
                        📋 Checklist Operacional do Culto:
                      </span>
                      ${ROLE_CHECKLIST_ITEMS.default.map(chk => {
                        const isChecked = Array.isArray(assignment.checkedItems) && assignment.checkedItems.includes(chk.id);
                        return `
                          <label class="flex items-center gap-2 text-xs text-slate-300 cursor-pointer hover:text-white">
                            <input
                              type="checkbox"
                              ${isChecked ? 'checked' : ''}
                              onchange="toggleChecklistItem('${schedule.id}', '${role.id}', '${chk.id}')"
                              class="rounded border-slate-600 text-emerald-500 bg-slate-900" />
                            <span class="${isChecked ? 'line-through text-emerald-300' : ''}">${chk.label}</span>
                          </label>
                        `;
                      }).join('')}
                    </div>
                  </div>

                  <!-- Check-in & Swap Buttons -->
                  <div class="pt-3 border-t border-slate-800 flex items-center gap-2.5">
                    <button
                      onclick="toggleAssignmentStatus('${schedule.id}', '${role.id}', 'confirmed')"
                      class="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs transition ${
                        assignment.status === 'confirmed'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-gradient-to-r from-emerald-400 to-teal-500 text-slate-950 shadow-lg glow-emerald'
                      }">
                      <i data-lucide="check-circle" class="w-4 h-4"></i>
                      <span>${assignment.status === 'confirmed' ? 'Presença Confirmada' : 'Confirmar Minha Presença'}</span>
                    </button>

                    <button
                      onclick="promptSwapRequest('${schedule.id}', '${role.id}')"
                      class="py-2.5 px-3.5 rounded-xl bg-slate-800/90 hover:bg-rose-500/20 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 text-xs font-semibold transition">
                      Solicitar Troca
                    </button>
                  </div>

                </div>
              `;
            }).join('')}
          </div>
        `}
      </div>
    </div>
  `;
}

// ============================================================================
// ABA 3: DIRETÓRIO DE MEMBROS DA EQUIPE (20+ PESSOAS)
// ============================================================================

function renderMembersTab() {
  const loggedUser = getLoggedInUser();
  const logged = loggedUser;
  const effectiveUser = getEffectiveUser();
  const canManage = isPrivilegedUser(loggedUser) || isPrivilegedUser(effectiveUser);
  if (!canManage) {
    return renderMyAreaTab();
  }
  const isDirector = (state.mode === 'director' && isPrivilegedUser(loggedUser)) || canManage;

  const memQuery = (state.memberSearch || '').toLowerCase().trim();
  const filteredMembers = state.members.filter(m => {
    const matchesSearch = !memQuery ||
      (m.name || '').toLowerCase().includes(memQuery) ||
      (m.nickname || '').toLowerCase().includes(memQuery) ||
      (m.title || '').toLowerCase().includes(memQuery) ||
      (m.congregation || '').toLowerCase().includes(memQuery) ||
      (m.email || '').toLowerCase().includes(memQuery);
    const matchesRole = state.roleFilter === 'all' || (m.skills || []).includes(state.roleFilter);
    return matchesSearch && matchesRole;
  });

  const sortedMembers = sortItemsByCriteria(
    filteredMembers,
    state.memberSort || 'name_asc',
    m => m.name,
    m => m.createdAt || m.id
  );

  return `
    <div class="space-y-6 animate-view">
      <!-- Storyboard de Quantidade de Voluntários e Funções -->
      ${renderVolunteersRolesStoryboard()}

      <!-- Dashboard de Aniversariantes da Semana -->
      ${renderBirthdayWidget()}

      <!-- Search & Filter Bar -->
      <div class="glass-panel rounded-3xl p-5 border border-slate-800/90 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-display font-extrabold text-white">Equipe de Mídia (${state.members.length} Integrantes)</h1>
          <p class="text-xs text-slate-400 mt-0.5">
            Diretório completo de videomakers, cinegrafistas, mesa de corte, telão, fotógrafos, storymakers e editores.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2.5">
          <!-- Campo e Botão de Pesquisa de Voluntário -->
          <div class="flex items-center gap-1.5">
            <div class="relative">
              <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2"></i>
              <input
                id="member-search-input"
                type="text"
                placeholder="Buscar por nome, cargo ou congregação..."
                value="${escapeHTML(state.memberSearch || '')}"
                onkeydown="if(event.key === 'Enter') executeMemberSearch();"
                class="bg-slate-900/90 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400 w-48 sm:w-64">
            </div>
            <button
              type="button"
              onclick="executeMemberSearch()"
              class="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-md glow-amber transition shrink-0"
              title="Pesquisar Voluntário por Nome">
              <i data-lucide="search" class="w-3.5 h-3.5"></i>
              <span>Pesquisar</span>
            </button>
            ${state.memberSearch ? `
              <button
                type="button"
                onclick="clearMemberSearch()"
                class="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold shrink-0"
                title="Limpar pesquisa de voluntário">
                ✕ Limpar
              </button>
            ` : ''}
          </div>

          <select
            onchange="state.roleFilter = this.value; renderApp();"
            class="bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-400">
            <option value="all" ${state.roleFilter === 'all' ? 'selected' : ''}>Todas as Funções (${state.roles.length})</option>
            ${state.roles.map(r => `
              <option value="${r.id}" ${state.roleFilter === r.id ? 'selected' : ''}>${r.shortName}</option>
            `).join('')}
          </select>

          <!-- Filtro de Ordenação: A-Z, Z-A e Data de Registro -->
          <div class="flex items-center gap-1.5">
            <label for="member-sort-select" class="text-xs font-bold text-slate-400 hidden xl:inline">Ordenar:</label>
            <select
              id="member-sort-select"
              onchange="state.memberSort = this.value; renderApp();"
              class="bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-400 font-semibold"
              title="Ordenar Lista de Voluntários">
              <option value="name_asc" ${(state.memberSort || 'name_asc') === 'name_asc' ? 'selected' : ''}>Ordem Alfabética (A a Z)</option>
              <option value="name_desc" ${state.memberSort === 'name_desc' ? 'selected' : ''}>Ordem Alfabética (Z a A)</option>
              <option value="date_desc" ${state.memberSort === 'date_desc' ? 'selected' : ''}>Data de Registro (Mais recentes)</option>
              <option value="date_asc" ${state.memberSort === 'date_asc' ? 'selected' : ''}>Data de Registro (Mais antigos)</option>
            </select>
          </div>

          <button
            onclick="copyAllMembersAccessForGroup()"
            title="Copiar lista com link, login e senha de todos os voluntários para o grupo do WhatsApp"
            class="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-extrabold text-xs transition">
            <i data-lucide="share-2" class="w-4 h-4"></i>
            <span>Copiar Acessos p/ WhatsApp</span>
          </button>

          <button
            onclick="openMemberModal()"
            class="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-slate-950 font-bold text-xs shadow-lg glow-cyan transition">
            <i data-lucide="user-plus" class="w-4 h-4"></i>
            <span>Novo Membro</span>
          </button>
        </div>
      </div>

      ${state.memberSearch ? `
        <div class="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 text-xs text-amber-200">
          <span>🔍 Resultado da pesquisa por "<strong>${escapeHTML(state.memberSearch)}</strong>": <strong>${filteredMembers.length}</strong> voluntário(s) encontrado(s).</span>
          <button onclick="clearMemberSearch()" class="text-amber-400 hover:underline font-bold text-xs">Exibir todos (${state.members.length})</button>
        </div>
      ` : ''}

      ${filteredMembers.length === 0 ? `
        <div class="glass-panel rounded-3xl p-8 border border-slate-800 text-center space-y-3">
          <div class="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto">
            <i data-lucide="user-x" class="w-6 h-6"></i>
          </div>
          <h3 class="text-base font-bold text-white">Nenhum voluntário encontrado</h3>
          <p class="text-xs text-slate-400">Nenhum voluntário correspondente ao termo "${escapeHTML(state.memberSearch)}" foi localizado.</p>
          <button onclick="clearMemberSearch()" class="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-extrabold text-xs">Limpar Pesquisa</button>
        </div>
      ` : ''}

      <!-- Members Grid Responsivo (Celular, Tablet e Computador) -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
        ${sortedMembers.map(member => {
          // Count how many times scheduled
          const scheduledCount = state.schedules.reduce(
            (acc, s) => acc + (s.assignments.some(a => a.memberId === member.id) ? 1 : 0),
            0
          );

          return `
            <div class="glass-panel-interactive rounded-3xl p-4 sm:p-5 flex flex-col justify-between space-y-4 border border-slate-800/80">
              <div class="space-y-3">
                <!-- Top Identity: Avatar + Info (Completamente responsivo e legível) -->
                <div class="flex items-start gap-3.5">
                  ${renderMemberAvatar(member, 'w-14 h-14 sm:w-16 sm:h-16 rounded-2xl text-base', true)}
                  <div class="min-w-0 flex-1">
                    <div class="flex flex-wrap items-center gap-1.5">
                      <h3 class="font-display font-extrabold text-base sm:text-lg text-white leading-tight">${escapeHTML(member.name)}</h3>
                      ${member.nickname ? `<span class="px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/40">"${escapeHTML(member.nickname)}"</span>` : ''}
                      ${getRoleTypeBadge(member.roleType)}
                      ${member.canMarkAttendance || member.roleType === 'developer' || member.roleType === 'director'
                        ? `<span class="px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">✓ Marca Frequência</span>`
                        : ''}
                    </div>
                    <p class="text-xs text-cyan-300 font-semibold mt-0.5">${escapeHTML(member.title)}</p>
                    <p class="text-[11px] text-emerald-300/90 truncate mt-0.5">${escapeHTML(member.email || 'Sem Gmail cadastrado')}</p>
                    ${member.phone ? `<p class="text-[11px] text-slate-300 font-medium mt-0.5 flex items-center gap-1"><span>📱</span><span>${escapeHTML(member.phone)}</span></p>` : ''}
                    ${member.congregation ? `<p class="text-[11px] text-slate-400 mt-0.5">⛪ Congregação: <strong class="text-slate-200">${escapeHTML(member.congregation)}</strong> ${member.age ? `• ${escapeHTML(member.age)}` : ''} ${member.experienceTime ? `• ⏱️ ${escapeHTML(member.experienceTime)}` : ''}</p>` : ''}
                    ${member.birthDate ? `<p class="text-[11px] text-pink-300 font-medium mt-0.5 flex items-center gap-1.5"><span>🎂</span><span>Nascimento: <strong>${member.birthDate.split('-').reverse().join('/')}</strong></span></p>` : ''}
                    ${member.memberCardNumber ? `<p class="text-[11px] text-cyan-300 font-mono font-bold mt-0.5 flex items-center gap-1.5"><span>💳</span><span>Cartão Nº: <strong>${escapeHTML(member.memberCardNumber)}</strong></span></p>` : ''}
                  </div>
                </div>

                <!-- Barra de Ações Dedicada: Logo abaixo da identificação, sem sobreposição -->
                <div class="flex flex-wrap items-center gap-1.5 pt-2.5 border-t border-slate-800/80">
                  <button
                    onclick="sendMemberAccessViaWhatsApp('${member.id}')"
                    title="Enviar Login, Senha e Link direto no WhatsApp deste voluntário"
                    class="px-2.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center gap-1 shadow transition">
                    <i data-lucide="send" class="w-3.5 h-3.5"></i>
                    <span>WhatsApp Acesso</span>
                  </button>
                  <button
                    onclick="openQrModal('${member.id}')"
                    title="Gerar / Ver QR Code de Frequência"
                    class="p-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/35 transition" title="Ver QR Code">
                    <i data-lucide="qr-code" class="w-3.5 h-3.5"></i>
                  </button>
                  <button
                    onclick="openEvaluationModal('${member.id}')"
                    title="Avaliar Voluntário (0 a 10 Estrelas)"
                    class="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-extrabold flex items-center gap-1 transition">
                    <i data-lucide="star" class="w-3.5 h-3.5"></i>
                    <span>Avaliar</span>
                  </button>
                  <button
                    onclick="openMemberModal('${member.id}')"
                    title="Editar dados do perfil, Gmail, senha e funções"
                    class="px-2.5 py-1.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/35 text-xs font-bold flex items-center gap-1 transition">
                    <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
                    <span>Editar</span>
                  </button>
                  ${(loggedUser?.roleType === 'developer' || loggedUser?.roleType === 'director') && member.roleType !== 'developer' && member.roleType !== 'director' ? `
                    <button
                      onclick="toggleMemberAttendancePermission('${member.id}')"
                      title="Permitir ou bloquear que este usuário marque frequência no QR Code"
                      class="px-2.5 py-1.5 rounded-xl text-[11px] font-extrabold border flex items-center gap-1 transition ${
                        member.canMarkAttendance
                          ? 'bg-emerald-500/25 text-emerald-200 border-emerald-400/50 hover:bg-rose-500/20 hover:text-rose-200'
                          : 'bg-slate-800/90 text-slate-300 border-slate-700 hover:border-emerald-400/50 hover:text-emerald-300'
                      }">
                      <i data-lucide="shield-check" class="w-3.5 h-3.5"></i>
                      <span>${member.canMarkAttendance ? '✓ Autorizado Frequência' : '+ Permitir Frequência'}</span>
                    </button>
                  ` : ''}
                  ${isDirector ? `
                    <button
                      onclick="deleteMember('${member.id}')"
                      title="Remover membro"
                      class="p-2 rounded-xl bg-slate-800/90 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-slate-700 transition">
                      <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                    </button>
                  ` : ''}
                </div>
              </div>

                <!-- Validação 0 a 10 por Estrelas (Exclusivo Líder / Diretor / Dev) -->
                <div class="mt-4">
                  ${renderStarRatingWidget(member, canManage)}
                </div>

                <!-- Skills badges -->
                <div class="mt-3">
                  <span class="text-[10px] uppercase tracking-wider text-slate-400 block mb-1.5">Funções Habilitadas:</span>
                  <div class="flex flex-wrap gap-1.5">
                    ${member.skills.map(skillId => {
                      const role = getRoleById(skillId);
                      return `
                        <span class="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-lg border ${role.badgeClass}">
                          <i data-lucide="${role.icon}" class="w-3 h-3"></i>
                          ${role.shortName}
                        </span>
                      `;
                    }).join('')}
                  </div>
                </div>
              </div>

              <div class="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span class="text-slate-400">
                  <strong class="text-slate-200">Disponibilidade:</strong> ${member.availability}
                </span>
                <button
                  onclick="setActiveMember('${member.id}', 'my_area');"
                  class="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1">
                  <span>${scheduledCount} escalas</span>
                  <i data-lucide="arrow-up-right" class="w-3.5 h-3.5"></i>
                </button>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

// ============================================================================
// ABA 4: MAPA DE FUNÇÕES OPERACIONAIS DA MÍDIA
// ============================================================================

function renderRolesTab() {
  const loggedUser = getLoggedInUser();
  const isDirector = isPrivilegedUser(loggedUser) && state.mode === 'director';
  const categories = [...new Set(state.roles.map(r => r.category))];

  return `
    <div class="space-y-6 animate-view">
      <!-- Storyboard de Quantidade de Voluntários e Funções -->
      ${renderVolunteersRolesStoryboard()}

      <div class="glass-panel rounded-3xl p-6 border border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-display font-extrabold text-white">Estações & Funções da Mídia (${state.roles.length})</h1>
          <p class="text-xs sm:text-sm text-slate-400 mt-1">
             Estrutura operacional de funções e atribuições do departamento de mídia da Assembleia de Deus.
          </p>
        </div>

        ${isDirector ? `
          <button
            onclick="openRoleModal()"
            class="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white font-bold text-xs sm:text-sm shadow-lg hover:brightness-110 transition shrink-0">
            <i data-lucide="plus-circle" class="w-4 h-4"></i>
            <span>Criar Nova Função</span>
          </button>
        ` : ''}
      </div>

      ${categories.map(cat => {
        const roles = state.roles.filter(r => r.category === cat);
        return `
          <div class="space-y-3">
            <h2 class="text-sm font-display font-bold uppercase tracking-wider text-cyan-300 px-1">${cat}</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              ${roles.map(role => {
                const qualified = state.members.filter(m => m.skills.includes(role.id));
                return `
                  <div class="glass-panel rounded-2xl p-5 border border-slate-800/80 flex flex-col justify-between space-y-4">
                    <div>
                      <div class="flex items-center justify-between gap-2 mb-3">
                        <div class="w-10 h-10 rounded-2xl flex items-center justify-center border ${role.badgeClass}">
                          <i data-lucide="${role.icon}" class="w-5 h-5"></i>
                        </div>
                        <div class="flex items-center gap-1.5">
                          <span class="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-900 text-slate-300 border border-slate-800">
                            ${qualified.length} habilitados
                          </span>
                          ${isDirector ? `
                            <button
                              onclick="openRoleModal('${role.id}')"
                              title="Editar função"
                              class="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition">
                              <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
                            </button>
                            <button
                              onclick="deleteRole('${role.id}')"
                              title="Excluir função"
                              class="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 transition">
                              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                            </button>
                          ` : ''}
                        </div>
                      </div>
                      <h3 class="text-base font-display font-bold text-white">${role.name}</h3>
                      <p class="text-xs text-amber-300 font-medium mt-0.5">📍 ${role.station}</p>
                      <p class="text-xs text-slate-400 mt-2 leading-relaxed">${role.description}</p>
                    </div>

                    ${isDirector ? `
                      <div class="pt-3 border-t border-slate-800/80">
                        <span class="text-[10px] uppercase tracking-wider text-slate-400 block mb-2">Equipe habilitada nesta função:</span>
                        <div class="flex flex-wrap gap-1.5">
                          ${qualified.length > 0 ? qualified.map(m => `
                            <span class="text-[11px] px-2 py-0.5 rounded-lg bg-slate-900/90 text-slate-200 border border-slate-800">
                              ${escapeHTML(m.name)}
                            </span>
                          `).join('') : `<span class="text-[11px] italic text-slate-500">Nenhum membro vinculado ainda</span>`}
                        </div>
                      </div>
                    ` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

// ============================================================================
// ABA 5: RANKING COMPLETO & GAMIFICAÇÃO DA EQUIPE
// ============================================================================

function renderRankingTab() {
  const loggedUser = getLoggedInUser();
  const canManage = isPrivilegedUser(loggedUser);
  const isDirector = canManage;
  const rankings = getRankingsList();
  const top3 = rankings.slice(0, 3);

  return `
    <div class="space-y-6 animate-view">
      <!-- Header -->
      <div class="glass-panel rounded-3xl p-6 border border-amber-500/35 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 mb-2">
            <i data-lucide="flame" class="w-3.5 h-3.5"></i>
            <span>TEMPORADA OFICIAL AD MÍDIA HUB</span>
          </div>
          <h1 class="text-2xl sm:text-3xl font-display font-extrabold text-white">
            Ranking Geral & Gamificação da Equipe
          </h1>
          <p class="text-xs sm:text-sm text-slate-400 mt-1">
            Pontuação calculada por Frequência via QR Code (+150 XP), Check-in de Escala (+120 XP) e Avaliação por Estrelas (+30 XP/estrela).
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-3 shrink-0 text-xs">
          <div class="p-3 rounded-2xl bg-slate-900/90 border border-slate-800">
            <span class="text-slate-400 block text-[10px] uppercase">Frequência QR Code</span>
            <strong class="text-emerald-300 text-sm font-display">+150 XP / leitura</strong>
          </div>
          ${canManage ? `
            <button
              onclick="resetAllMembersXP()"
              class="px-4 py-3 rounded-2xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/35 font-bold text-xs flex items-center gap-2 transition">
              <i data-lucide="rotate-ccw" class="w-4 h-4"></i>
              <span>Zerar XP de Todos</span>
            </button>
          ` : ''}
        </div>
      </div>

      <!-- Top 3 Podium Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-5">
        ${top3.map((item, idx) => {
          const rankLabels = ['🥇 1º LUGAR — CAMPEÃO DE ASSIDUIDADE', '🥈 2º LUGAR — VICE-LÍDER', '🥉 3º LUGAR — DESTAQUE'];
          const cardBorders = [
            'border-amber-400/70 bg-gradient-to-b from-amber-500/20 via-slate-900/90 to-slate-950 glow-gold',
            'border-cyan-400/50 bg-gradient-to-b from-cyan-500/15 via-slate-900/90 to-slate-950',
            'border-orange-400/50 bg-gradient-to-b from-orange-500/15 via-slate-900/90 to-slate-950'
          ];

          return `
            <div class="glass-panel rounded-3xl p-6 border ${cardBorders[idx]} flex flex-col justify-between space-y-4 relative overflow-hidden">
              <div>
                <div class="flex items-center justify-between gap-2 mb-4">
                  <span class="text-xs font-extrabold tracking-wider uppercase ${idx === 0 ? 'text-amber-300' : 'text-cyan-300'}">
                    ${rankLabels[idx]}
                  </span>
                  <span class="px-3 py-1 rounded-full text-xs font-display font-extrabold bg-slate-950/90 text-amber-300 border border-amber-500/40">
                    ${item.xp} XP
                  </span>
                </div>

                <div class="flex items-center gap-4">
                  ${renderMemberAvatar(item.member, 'w-16 h-16 rounded-2xl text-xl', true)}
                  <div>
                    <h3 class="text-lg font-display font-extrabold text-white">${escapeHTML(item.member.name)}</h3>
                    <p class="text-xs text-slate-300">${escapeHTML(item.member.title)}</p>
                    <span class="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border mt-1.5 ${item.badge.color}">
                      <i data-lucide="${item.badge.icon}" class="w-3 h-3"></i>
                      ${escapeHTML(item.badge.title)}
                    </span>
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800/80 text-center">
                <div class="p-2 rounded-xl bg-slate-950/60">
                  <span class="text-base font-display font-extrabold text-white">${item.totalParticipations}</span>
                  <span class="block text-[10px] text-slate-400">Cultos Totais</span>
                </div>
                <div class="p-2 rounded-xl bg-slate-950/60">
                  <span class="text-base font-display font-extrabold text-emerald-300">${item.currentConfirmed}</span>
                  <span class="block text-[10px] text-slate-400">Confirmados</span>
                </div>
                <div class="p-2 rounded-xl bg-slate-950/60">
                  <span class="text-base font-display font-extrabold text-cyan-300">${item.member.skills.length}</span>
                  <span class="block text-[10px] text-slate-400">Funções</span>
                </div>
              </div>

              ${isDirector ? `
                <button
                  onclick="awardBonusParticipation('${item.member.id}', 100)"
                  class="w-full py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/35 text-xs font-bold flex items-center justify-center gap-1.5 transition">
                  <i data-lucide="award" class="w-3.5 h-3.5"></i>
                  <span>Premiar +1 Participação (+100 XP)</span>
                </button>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>

      <!-- Complete Leaderboard Table -->
      <div class="glass-panel rounded-3xl p-5 sm:p-6 border border-slate-800/90 space-y-4">
        <h2 class="text-base font-display font-bold text-white flex items-center gap-2">
          <i data-lucide="list-ordered" class="w-5 h-5 text-cyan-400"></i>
          <span>Classificação Geral dos ${rankings.length} Integrantes da Mídia</span>
        </h2>

        <div class="space-y-2.5">
          ${rankings.map((item, idx) => {
            const isMe = item.member.id === state.activeMemberId;
            return `
              <div class="p-3.5 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isMe
                  ? 'bg-cyan-950/35 border-cyan-400/60 ring-1 ring-cyan-400/30'
                  : 'bg-slate-900/70 border-slate-800/80 hover:border-slate-700'
              }">
                <div class="flex items-center gap-3.5">
                  <div class="w-9 h-9 rounded-xl flex items-center justify-center font-display font-extrabold text-sm ${
                    idx === 0
                      ? 'bg-amber-400 text-slate-950'
                      : idx === 1
                      ? 'bg-slate-300 text-slate-950'
                      : idx === 2
                      ? 'bg-orange-400 text-slate-950'
                      : 'bg-slate-800 text-slate-300'
                  }">
                    #${idx + 1}
                  </div>

                  ${renderMemberAvatar(item.member, 'w-10 h-10 rounded-xl text-xs', false)}

                  <div>
                    <div class="flex flex-wrap items-center gap-2">
                      <h4 class="text-sm font-bold text-white">${escapeHTML(item.member.name)}</h4>
                      ${isMe ? `<span class="text-[9px] px-1.5 py-0.5 rounded bg-cyan-400 text-slate-950 font-extrabold">VOCÊ</span>` : ''}
                      <span class="text-[10px] font-bold px-2 py-0.5 rounded-full border ${item.badge.color}">
                        ${escapeHTML(item.badge.title)}
                      </span>
                    </div>
                    <p class="text-xs text-slate-400">${escapeHTML(item.member.title)}</p>
                  </div>
                </div>

                <div class="flex flex-wrap items-center justify-between sm:justify-end gap-4">
                  <div class="text-right">
                    <span class="text-xs font-bold text-slate-200 block">🔥 ${item.totalParticipations} cultos participados</span>
                    <span class="text-[11px] text-emerald-300">${item.currentConfirmed} escalas confirmadas no mês</span>
                  </div>

                  <div class="px-3 py-1.5 rounded-xl bg-slate-950 border border-cyan-500/30 text-cyan-300 font-display font-extrabold text-sm min-w-[90px] text-center">
                    ${item.xp} XP
                  </div>

                  ${isDirector ? `
                    <button
                      onclick="openEvaluationModal('${item.member.id}')"
                      title="Avaliar Voluntário (0 a 10 Estrelas)"
                      class="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-extrabold flex items-center gap-1 transition">
                      <i data-lucide="star" class="w-3.5 h-3.5"></i>
                      <span>Avaliar</span>
                    </button>
                    <button
                      onclick="awardBonusParticipation('${item.member.id}', 100)"
                      title="Dar +1 participação e +100 XP"
                      class="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition">
                      +100 XP
                    </button>
                  ` : ''}
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

// ============================================================================
// ABA 6: CONTROLE DE FREQUÊNCIA POR QR CODE (GERADOR & LEITOR)
// ============================================================================

function renderAttendanceTab() {
  const loggedUser = getLoggedInUser();
  const logged = loggedUser;
  const effectiveUser = getEffectiveUser();
  const canManage = isPrivilegedUser(loggedUser) || isPrivilegedUser(effectiveUser);
  const canMark = canMarkAttendanceUser(effectiveUser);
  const myMember = effectiveUser || loggedUser || state.members[0];

  // Collect all attendance logs across members
  const allLogs = [];
  state.members.forEach(m => {
    (m.attendanceLogs || []).forEach(log => {
      allLogs.push({ member: m, log });
    });
  });
  allLogs.sort((a, b) => (b.log.id || '').localeCompare(a.log.id || ''));

  const visibleLogs = (canMark || canManage) ? allLogs : allLogs.filter(item => item.member.id === myMember?.id);

  const attQuery = (state.attendanceVolunteerSearch || '').toLowerCase().trim();
  const attSort = state.attendanceSort || 'name_asc';

  let displayedAttendanceMembers = attQuery
    ? state.members.filter(m =>
        (m.name || '').toLowerCase().includes(attQuery) ||
        (m.nickname || '').toLowerCase().includes(attQuery) ||
        (m.qrToken || '').toLowerCase().includes(attQuery) ||
        (m.title || '').toLowerCase().includes(attQuery)
      )
    : [...state.members];

  displayedAttendanceMembers = sortItemsByCriteria(
    displayedAttendanceMembers,
    attSort,
    m => m.name,
    m => m.createdAt || m.id
  );

  let displayedHistoryLogs = attQuery
    ? visibleLogs.filter(item =>
        (item.member?.name || '').toLowerCase().includes(attQuery) ||
        (item.member?.nickname || '').toLowerCase().includes(attQuery) ||
        (item.log?.eventTitle || '').toLowerCase().includes(attQuery)
      )
    : [...visibleLogs];

  displayedHistoryLogs = sortItemsByCriteria(
    displayedHistoryLogs,
    attSort,
    item => item.member?.name,
    item => (item.log?.date ? `${item.log.date}T${item.log.time || '00:00'}` : item.member?.createdAt)
  );

  return `
    <div class="space-y-6 animate-view">
      <!-- Top Banner -->
      <div class="glass-panel rounded-3xl p-6 border border-emerald-500/35 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 mb-2">
            <i data-lucide="qr-code" class="w-3.5 h-3.5"></i>
            <span>CHECK-IN DIGITAL POR QR CODE (+150 XP)</span>
          </div>
          <h1 class="text-2xl sm:text-3xl font-display font-extrabold text-white">
            Controle de Frequência por QR Code
          </h1>
          <p class="text-xs sm:text-sm text-slate-400 mt-1">
            Cada voluntário possui um QR Code único de identificação. A frequência no culto é registrada vinculada ao evento selecionado pelo Diretor ou líder autorizado.
          </p>
        </div>

        <div class="flex flex-wrap items-center gap-2.5">
          ${canMark ? `
            <button
              onclick="openScanAttendanceModal()"
              class="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500 text-slate-950 font-extrabold text-xs sm:text-sm shadow-lg glow-emerald hover:brightness-110 active:scale-95 transition">
              <i data-lucide="scan-line" class="w-4 h-4"></i>
              <span>Ativar Câmera QR Frequência</span>
            </button>
          ` : ''}

          <button
            onclick="openQrModal('${myMember.id}')"
            class="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-extrabold text-xs sm:text-sm border border-slate-700 shadow transition">
            <i data-lucide="qr-code" class="w-4 h-4 text-cyan-400"></i>
            <span>Exibir Meu QR Code</span>
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        <!-- Left Column: My Personal QR Pass Card -->
        <div class="lg:col-span-5 xl:col-span-4 space-y-4">
          <div class="glass-panel rounded-3xl p-6 border border-amber-500/30 text-center space-y-4">
            <div class="flex items-center justify-center gap-3">
              ${renderMemberAvatar(myMember, 'w-12 h-12 rounded-2xl text-sm', false)}
              <div class="text-left">
                <span class="text-[10px] uppercase tracking-wider text-amber-400 font-bold block">Credencial do Voluntário</span>
                <h3 class="text-lg font-display font-extrabold text-white">${escapeHTML(myMember.name)}</h3>
                <p class="text-xs text-slate-400">${escapeHTML(myMember.title)}</p>
              </div>
            </div>

            <div class="p-4 rounded-2xl bg-white border-4 border-amber-400/80 inline-block mx-auto shadow-2xl">
              <img
                src="${getQrCodeImageUrl(myMember.qrToken, 240)}"
                alt="QR Code ${escapeHTML(myMember.name)}"
                class="w-48 h-48 mx-auto rounded-lg block" />
            </div>

            <div>
              <span class="text-[10px] uppercase tracking-wider text-slate-400 block">Código Único do Voluntário</span>
              <code class="text-xs font-mono font-bold text-amber-300 bg-slate-900 px-3 py-1 rounded-lg border border-slate-800 inline-block mt-1">
                ${escapeHTML(myMember.qrToken)}
              </code>
            </div>

            <button
              type="button"
              onclick="downloadMemberQrBadgeImage('${myMember.id}')"
              class="w-full py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-110 active:scale-95 text-slate-950 font-extrabold text-xs shadow-md flex items-center justify-center gap-2 transition">
              <i data-lucide="download" class="w-4 h-4"></i>
              <span>Salvar Cartão de Credencial (PNG)</span>
            </button>

            <p class="text-xs text-slate-400">
              Apresente este QR Code ao líder na chegada ao culto para registrar sua presença e pontualidade no evento.
            </p>
          </div>
        </div>

        <!-- Right Column: Scanner & Attendance Control (For Director / Leader / Authorized) or Personal Log -->
        <div class="lg:col-span-7 xl:col-span-8 space-y-6">
          ${canMark ? `
            <div class="glass-panel rounded-3xl p-6 border border-amber-500/35 space-y-4">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div>
                  <h2 class="text-lg font-display font-extrabold text-white flex items-center gap-2">
                    <i data-lucide="scan-line" class="w-5 h-5 text-amber-400"></i>
                    <span>Leitor de QR Code (Exclusivo Direção / Autorizados)</span>
                  </h2>
                  <p class="text-xs text-slate-400">Selecione o culto do dia e escaneie ou valide o QR Code dos voluntários</p>
                </div>

                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    onclick="startCameraQrScanner()"
                    class="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-lg transition">
                    <i data-lucide="camera" class="w-4 h-4"></i>
                    <span>Abrir Câmera QR</span>
                  </button>
                  <button
                    type="button"
                    onclick="stopCameraQrScanner()"
                    class="px-2.5 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white text-xs">
                    Fechar
                  </button>
                </div>
              </div>

              <!-- Camera Viewport -->
              <div id="qr-camera-reader" class="hidden rounded-2xl overflow-hidden border border-cyan-500/40 bg-black max-w-sm mx-auto"></div>

              <!-- Select Culto/Evento Reference (OBRIGATÓRIO) -->
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Culto / Evento do Dia (Obrigatório)</span>
                  <span class="text-[10px] text-amber-400 font-semibold">* Presença vinculada ao evento</span>
                </label>
                <select
                  id="attendance-schedule-select"
                  class="w-full bg-slate-900/90 border border-amber-500/40 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400">
                  ${state.schedules.length === 0 ? '<option value="">Nenhum culto cadastrado ainda</option>' : ''}
                  ${state.schedules.map(s => `
                    <option value="${s.id}" ${s.id === state.selectedScheduleId ? 'selected' : ''}>
                      ${escapeHTML(s.title)} — ${s.date} (${s.startTime})
                    </option>
                  `).join('')}
                </select>
              </div>

              <!-- Manual / USB Barcode Scanner Input -->
              <form onsubmit="handleManualQrSubmit(event)" class="flex gap-2">
                <input
                  id="manual-qr-token-input"
                  type="text"
                  placeholder="Ler código QR (Ex: ADMIDIA-M1-FERNANDO) ou Gmail..."
                  class="flex-1 bg-slate-900/90 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-emerald-400" />
                <button
                  type="submit"
                  class="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shrink-0 transition">
                  Confirmar QR
                </button>
              </form>

              <!-- Quick 1-Click QR Check-in & Evaluation List for All Members -->
              <div class="pt-3 border-t border-slate-800/80 space-y-2.5">
                <div class="flex items-center justify-between">
                  <span class="text-[10px] uppercase tracking-wider font-bold text-cyan-300 block">
                    Cartões QR dos Voluntários Cadastrados (${displayedAttendanceMembers.length}${attQuery ? ` de ${state.members.length}` : ''}):
                  </span>
                </div>

                <!-- Barra de Pesquisa e Filtro de Ordenação da Frequência -->
                <div class="flex flex-col sm:flex-row sm:items-center gap-2">
                  <div class="flex items-center gap-2 flex-1">
                    <div class="relative flex-1">
                      <i data-lucide="search" class="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2"></i>
                      <input
                        id="attendance-volunteer-search-input"
                        type="text"
                        placeholder="Pesquisar voluntário na frequência (Ex: Wesley, Lucas)..."
                        value="${escapeHTML(state.attendanceVolunteerSearch || '')}"
                        onkeydown="if(event.key === 'Enter') executeAttendanceVolunteerSearch();"
                        class="w-full bg-slate-900/90 border border-slate-700 focus:border-emerald-400 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none">
                    </div>
                    <button
                      type="button"
                      onclick="executeAttendanceVolunteerSearch()"
                      class="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-md glow-emerald transition shrink-0"
                      title="Pesquisar Voluntário na Frequência">
                      <i data-lucide="search" class="w-3.5 h-3.5"></i>
                      <span>Pesquisar</span>
                    </button>
                    ${state.attendanceVolunteerSearch ? `
                      <button
                        type="button"
                        onclick="clearAttendanceVolunteerSearch()"
                        class="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold shrink-0"
                        title="Limpar pesquisa na frequência">
                        ✕ Limpar
                      </button>
                    ` : ''}
                  </div>

                  <!-- Filtro de Ordenação da Frequência: A-Z, Z-A e Data de Registro -->
                  <div class="flex items-center gap-1.5 shrink-0">
                    <label for="attendance-sort-select" class="text-xs font-bold text-slate-400 hidden md:inline">Ordenar:</label>
                    <select
                      id="attendance-sort-select"
                      onchange="state.attendanceSort = this.value; renderApp();"
                      class="bg-slate-900/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400 font-semibold"
                      title="Ordenar Lista de Frequência">
                      <option value="name_asc" ${(state.attendanceSort || 'name_asc') === 'name_asc' ? 'selected' : ''}>Ordem Alfabética (A a Z)</option>
                      <option value="name_desc" ${state.attendanceSort === 'name_desc' ? 'selected' : ''}>Ordem Alfabética (Z a A)</option>
                      <option value="date_desc" ${state.attendanceSort === 'date_desc' ? 'selected' : ''}>Data de Registro (Mais recentes)</option>
                      <option value="date_asc" ${state.attendanceSort === 'date_asc' ? 'selected' : ''}>Data de Registro (Mais antigos)</option>
                    </select>
                  </div>
                </div>

                ${state.attendanceVolunteerSearch ? `
                  <div class="text-[11px] text-emerald-300 font-semibold">
                    Filtrando por: "<strong>${escapeHTML(state.attendanceVolunteerSearch)}</strong>" (${displayedAttendanceMembers.length} voluntários)
                  </div>
                ` : ''}

                <div class="space-y-2 max-h-72 overflow-y-auto pr-1">
                  ${displayedAttendanceMembers.length === 0 ? `
                    <p class="text-xs text-slate-500 italic py-4 text-center">
                      Nenhum voluntário encontrado para "${escapeHTML(state.attendanceVolunteerSearch)}".
                    </p>
                  ` : displayedAttendanceMembers.map(m => {
                    const logsCount = Array.isArray(m.attendanceLogs) ? m.attendanceLogs.length : 0;
                    return `
                      <div class="p-3 rounded-2xl bg-slate-900/75 border border-slate-800 flex flex-wrap items-center justify-between gap-2">
                        <div class="flex items-center gap-2.5 min-w-0">
                          ${renderMemberAvatar(m, 'w-9 h-9 rounded-xl text-xs', false)}
                          <div class="min-w-0">
                            <h4 class="text-xs font-bold text-white truncate">${escapeHTML(m.name)}</h4>
                            <span class="text-[10px] font-mono text-emerald-300 block">${escapeHTML(m.qrToken)} • ${logsCount} presenças</span>
                          </div>
                        </div>

                        <div class="flex items-center gap-1.5">
                          <button
                            onclick="openQrModal('${m.id}')"
                            title="Ver QR Code do Voluntário"
                            class="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-slate-700 text-xs">
                            <i data-lucide="qr-code" class="w-3.5 h-3.5"></i>
                          </button>
                          <button
                            onclick="openEvaluationModal('${m.id}')"
                            class="px-2.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-bold flex items-center gap-1">
                            <i data-lucide="star" class="w-3 h-3"></i>
                            <span>Avaliar (${m.starRating || 0}/10)</span>
                          </button>
                          <button
                            onclick="markAttendanceByQrToken('${m.qrToken}')"
                            class="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-[11px] flex items-center gap-1">
                            <i data-lucide="check-circle-2" class="w-3.5 h-3.5"></i>
                            <span>Marcar Presença</span>
                          </button>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
            </div>
          ` : `
            <div class="glass-panel rounded-3xl p-6 border border-slate-800 text-center space-y-3">
              <div class="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
                <i data-lucide="shield-alert" class="w-6 h-6"></i>
              </div>
              <h3 class="text-base font-bold text-white">Registro de Presença Restrito</h3>
              <p class="text-xs text-slate-400 max-w-md mx-auto">
                Apenas o Diretor Geral <strong>Lucas Henrique</strong>, o Desenvolvedor <strong>Fernando</strong> ou voluntários que receberam autorização expressa do Diretor podem registrar frequência via QR Code. Apresente seu QR Code ao lado na recepção do culto!
              </p>
            </div>
          `}

          <!-- Attendance History Log -->
          <div class="glass-panel rounded-3xl p-6 border border-slate-800/90 space-y-3">
            <h3 class="text-sm font-display font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <i data-lucide="history" class="w-4 h-4 text-emerald-400"></i>
              <span>Histórico de Frequências Registradas via QR Code (${displayedHistoryLogs.length})</span>
            </h3>

            ${displayedHistoryLogs.length === 0 ? `
              <p class="text-xs text-slate-500 italic py-4 text-center">
                ${attQuery ? `Nenhum registro de frequência encontrado para "${escapeHTML(state.attendanceVolunteerSearch)}".` : 'Nenhuma frequência registrada via QR Code ainda.'}
              </p>
            ` : `
              <div class="space-y-2 max-h-64 overflow-y-auto pr-1">
                ${displayedHistoryLogs.map(({ member, log }) => `
                  <div class="p-3 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between gap-2 text-xs">
                    <div class="flex items-center gap-2.5">
                      ${renderMemberAvatar(member, 'w-8 h-8 rounded-lg text-[10px]', false)}
                      <div>
                        <strong class="text-white block">${escapeHTML(member.name)}</strong>
                        <span class="text-[11px] text-slate-400">${escapeHTML(log.eventTitle)}</span>
                      </div>
                    </div>
                    <div class="text-right">
                      <span class="text-emerald-300 font-bold block">✓ +150 XP</span>
                      <span class="text-[10px] text-slate-400">${escapeHTML(log.date)} às ${escapeHTML(log.time)}</span>
                    </div>
                  </div>
                `).join('')}
              </div>
            `}
          </div>
        </div>

      </div>

      <!-- Relatório de Frequência & Lista para Cantina (PDF & Excel) -->
      ${canManage ? renderCanteenAndAttendanceReportGenerator() : ''}

      <!-- Storyboard de Quantidade de Voluntários e Funções -->
      ${renderVolunteersRolesStoryboard()}
    </div>
  `;
}

// ============================================================================
// TELA DE LOGIN VIA CONTA GMAIL (COM PRIVACIDADE DE USUÁRIOS)
// ============================================================================

function renderGmailLoginScreen() {
  return `
    <div class="min-h-screen flex items-center justify-center p-4">
      <div class="glass-panel rounded-3xl max-w-md w-full p-7 sm:p-8 border border-cyan-500/35 space-y-6 animate-view relative overflow-hidden">
        <div class="absolute -right-12 -top-12 w-48 h-48 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none"></div>

        <div class="text-center space-y-2">
          <div class="w-16 h-16 rounded-3xl bg-gradient-to-br from-cyan-500/20 via-blue-600/20 to-amber-500/20 border border-cyan-400/50 flex items-center justify-center mx-auto glow-cyan">
            <i data-lucide="flame" class="w-8 h-8 text-amber-400"></i>
          </div>
          <span class="inline-block text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
            Assembleia de Deus
          </span>
          <h1 class="text-2xl font-display font-extrabold text-white">AD MÍDIA HUB</h1>
          <p class="text-xs text-slate-400">
            Conectado ao <strong>Banco de Dados em Nuvem</strong>. Entre com seu Gmail ou faça seu cadastro inicial na equipe.
          </p>
        </div>

        <!-- BOX 1: LOGIN GMAIL + SENHA -->
        <div id="gmail-login-box" class="space-y-4">
          <form onsubmit="handleGmailLogin(event)" class="space-y-3.5">
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Seu E-mail Google (Gmail)
              </label>
              <div class="relative">
                <i data-lucide="mail" class="w-4 h-4 text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2"></i>
                <input
                  id="gmail-login-input"
                  type="email"
                  required
                  placeholder="seuemail@gmail.com"
                  class="w-full bg-slate-900/90 border border-slate-700 focus:border-cyan-400 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Sua Senha de Acesso
              </label>
              <div class="relative">
                <i data-lucide="lock" class="w-4 h-4 text-amber-400 absolute left-3.5 top-1/2 -translate-y-1/2"></i>
                <input
                  id="gmail-password-input"
                  type="password"
                  required
                  placeholder="Digite sua senha"
                  class="w-full bg-slate-900/90 border border-slate-700 focus:border-amber-400 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:outline-none" />
              </div>
            </div>

            <button
              type="submit"
              class="w-full py-3 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-extrabold text-xs sm:text-sm shadow-xl flex items-center justify-center gap-2.5 transition">
              <svg class="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z"/>
                <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z"/>
                <path fill="#FBBC05" d="M5.3 14.8c-.2-.8-.4-1.8-.4-2.8s.2-2 .4-2.8L1.6 6.4C.6 8.4 0 10.6 0 12s.6 3.6 1.6 5.6l3.7-2.8z"/>
                <path fill="#34A853" d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5l-3.7 2.8C3.5 19.9 7.4 23 12 23z"/>
              </svg>
              <span>Entrar no Sistema</span>
            </button>
          </form>

          <button
            type="button"
            onclick="toggleLoginRegisterView(true)"
            class="w-full py-2.5 px-4 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/35 font-bold text-xs transition">
            Primeiro acesso? Cadastre seu Gmail e Senha
          </button>
        </div>

        <!-- BOX 2: AUTO-CADASTRO DE NOVO INTEGRANTE NA NUVEM -->
        <div id="gmail-register-box" class="hidden space-y-4">
          <form onsubmit="handleSelfRegister(event)" class="space-y-3.5">
            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">Nome Completo *</label>
              <input
                id="reg-name-input"
                type="text"
                required
                placeholder="Ex: Lucas Henrique"
                class="w-full bg-slate-900/90 border border-slate-700 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none" />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-emerald-300 mb-1">Seu Gmail *</label>
                <input
                  id="reg-gmail-input"
                  type="email"
                  required
                  placeholder="seuemail@gmail.com"
                  class="w-full bg-slate-900/90 border border-slate-700 focus:border-emerald-400 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none" />
              </div>
              <div>
                <label class="block text-xs font-bold uppercase tracking-wider text-amber-300 mb-1">Crie sua Senha *</label>
                <input
                  id="reg-password-input"
                  type="password"
                  required
                  placeholder="Sua senha"
                  class="w-full bg-slate-900/90 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none" />
              </div>
            </div>

            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1">WhatsApp</label>
              <input
                id="reg-phone-input"
                type="text"
                placeholder="(11) 99999-9999"
                class="w-full bg-slate-900/90 border border-slate-700 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none" />
            </div>

            <div>
              <label class="block text-xs font-bold uppercase tracking-wider text-cyan-300 mb-1.5">
                Suas Funções na Mídia (Marque 1 ou mais) *
              </label>
              <div class="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
                ${state.roles.map(role => `
                  <label class="flex items-center gap-2 p-2 rounded-xl border border-slate-700/70 bg-slate-900/60 hover:border-cyan-500/40 cursor-pointer text-[11px]">
                    <input type="checkbox" name="reg-skill" value="${role.id}" class="rounded border-slate-600 text-cyan-500 bg-slate-800">
                    <span class="text-slate-200 font-medium truncate">${escapeHTML(role.shortName)}</span>
                  </label>
                `).join('')}
              </div>
            </div>

            <button
              type="submit"
              class="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-400 to-cyan-500 text-slate-950 font-extrabold text-xs sm:text-sm shadow-xl transition">
              Concluir Cadastro & Entrar
            </button>
          </form>

          <button
            type="button"
            onclick="toggleLoginRegisterView(false)"
            class="w-full py-2 text-xs text-slate-400 hover:text-white transition">
            ← Voltar para Login
          </button>
        </div>

        <div class="pt-4 border-t border-slate-800/80 text-center space-y-2">
          <div class="inline-flex items-center gap-1.5 text-[11px] text-emerald-300 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/25">
            <i data-lucide="shield-check" class="w-3.5 h-3.5"></i>
            <span>Acesso Individual Protegido & Banco em Nuvem</span>
          </div>
          <p class="text-[11px] text-slate-500">
            Por privacidade, cada voluntário acessa exclusivamente sua própria conta e não pode alternar para outros usuários.
          </p>
        </div>
      </div>
    </div>
  `;
}

// ============================================================================
// ABA 7: CENTRAL DE RELATÓRIOS OFICIAIS & LISTA DA CANTINA
// ============================================================================

function renderReportsAndCanteenTab() {
  const loggedUser = getLoggedInUser();
  const logged = loggedUser;
  const effectiveUser = getEffectiveUser();
  const canManage = isPrivilegedUser(loggedUser) || isPrivilegedUser(effectiveUser);
  if (!canManage) {
    return renderMyAreaTab();
  }

  return `
    <div class="space-y-6 animate-view">
      <!-- Storyboard de Quantidade de Voluntários e Funções -->
      ${renderVolunteersRolesStoryboard()}

      <!-- Top Action Banner -->
      <div class="glass-panel rounded-3xl p-5 sm:p-6 border border-amber-500/35 relative overflow-hidden bg-gradient-to-br from-amber-950/20 via-slate-900/60 to-yellow-950/20 shadow-xl">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 mb-2">
              <i data-lucide="file-spreadsheet" class="w-3.5 h-3.5"></i>
              <span>CENTRAL OFICIAL DE RELATÓRIOS & CANTINA</span>
            </div>
            <h1 class="text-2xl sm:text-3xl font-display font-extrabold text-white">
              Relatórios Oficiais & Lista da Cantina
            </h1>
            <p class="text-xs sm:text-sm text-slate-400 mt-1">
              Gere e imprima em PDF ou exporte em Excel a Lista da Cantina com assinatura e o Relatório de Frequência do Culto.
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2.5">
            <button
              onclick="exportCanteenReportPDF()"
              class="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-500 hover:brightness-110 text-slate-950 font-extrabold text-xs sm:text-sm shadow-lg flex items-center gap-2 transition">
              <i data-lucide="file-text" class="w-4 h-4"></i>
              <span>Imprimir Lista Cantina</span>
            </button>
            <button
              onclick="exportAttendanceReportPDF()"
              class="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-400 to-teal-500 hover:brightness-110 text-slate-950 font-extrabold text-xs sm:text-sm shadow-lg flex items-center gap-2 transition">
              <i data-lucide="clipboard-check" class="w-4 h-4"></i>
              <span>Imprimir Relatório Frequência</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Relatórios e Lista da Cantina -->
      ${renderCanteenAndAttendanceReportGenerator()}
    </div>
  `;
}

// ============================================================================
// RENDERIZAÇÃO PRINCIPAL
// ============================================================================

function renderApp() {
  const root = document.getElementById('app-root');
  if (!root) return;

  enforcePrivacyState();

  if (!state.authEmail || !getLoggedInUser()) {
    root.innerHTML = renderGmailLoginScreen();
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  let mainContent = '';
  if (state.activeTab === 'schedules') {
    mainContent = renderSchedulesTab();
  } else if (state.activeTab === 'my_area') {
    mainContent = renderMyAreaTab();
  } else if (state.activeTab === 'members') {
    mainContent = renderMembersTab();
  } else if (state.activeTab === 'roles') {
    mainContent = renderRolesTab();
  } else if (state.activeTab === 'attendance') {
    mainContent = renderAttendanceTab();
  } else if (state.activeTab === 'reports') {
    mainContent = renderReportsAndCanteenTab();
  } else if (state.activeTab === 'ranking') {
    mainContent = renderRankingTab();
  }

  const effectiveUser = getEffectiveUser();
  const canMark = canMarkAttendanceUser(effectiveUser);

  root.innerHTML = `
    ${renderHeader()}
    <main class="app-screen-container py-6 pb-24">
      ${mainContent}
    </main>

    ${canMark ? `
      <!-- Botão Flutuante Mobile: Marcar Frequência QR Code -->
      <button
        onclick="openScanAttendanceModal()"
        title="Marcar Frequência QR Code com a Câmera"
        class="sm:hidden fixed bottom-6 right-5 z-40 w-14 h-14 rounded-full bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-400 text-slate-950 flex items-center justify-center shadow-2xl glow-emerald active:scale-90 transition border-2 border-emerald-300">
        <i data-lucide="scan-line" class="w-6 h-6"></i>
      </button>
    ` : ''}
  `;

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  applyTheme(state.theme);
  loadData();
  renderApp();
  syncFromCloud(true);

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(err => {
      console.warn('Service Worker registro opcional:', err);
    });
  }
});
