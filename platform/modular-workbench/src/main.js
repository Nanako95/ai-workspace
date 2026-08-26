import './styles.css';

const STORAGE_KEY = 'modular-workbench-v1';
const ICONS = { grid: '▦', plus: '+', search: '⌕', settings: '⚙', more: '•••', check: '✓', doc: '▤', table: '▥', chart: '◒', note: '✦', clock: '◷', box: '□', trash: '⌫', download: '↓', upload: '↑', moon: '◐' };

const moduleCatalog = {
  note: { icon: ICONS.note, label: '文字卡片', color: 'blue', description: '记录想法、说明和链接' },
  todo: { icon: ICONS.check, label: '待办清单', color: 'green', description: '追踪任务和完成进度' },
  table: { icon: ICONS.table, label: '数据表格', color: 'orange', description: '用字段和行管理信息' },
  document: { icon: ICONS.doc, label: '文档记录', color: 'purple', description: '持续编辑一篇长文档' },
  stats: { icon: ICONS.chart, label: '数据概览', color: 'red', description: '展示关键指标和趋势' },
  clock: { icon: ICONS.clock, label: '时间提醒', color: 'yellow', description: '显示当前时间和专注状态' },
  custom: { icon: ICONS.box, label: '自定义模块', color: 'gray', description: '自由组合标题、内容和字段' }
};

const seed = {
  workspaceName: '我的工作台',
  settings: { autoSave: true, compact: false },
  pages: [
    { id: 'home', name: '我的总览', icon: '⌂', modules: [
      { id: 'welcome', type: 'note', title: '工作台说明', x: 0, y: 0, w: 5, h: 3, content: '这是你的可组合工作台。拖动模块标题移动它，拖动右下角调整大小。\n\n你可以从右上角添加模块，也可以新建完全自定义的模块。' },
      { id: 'today', type: 'todo', title: '今天要做什么', x: 5, y: 0, w: 4, h: 4, items: [{ text: '整理本周重点', done: true }, { text: '更新项目表格', done: false }, { text: '留出专注时间', done: false }] },
      { id: 'pulse', type: 'stats', title: '工作节奏', x: 9, y: 0, w: 3, h: 4 },
      { id: 'projects', type: 'table', title: '项目空间', x: 0, y: 3, w: 8, h: 5, rows: [['工作台重构', '进行中', '今天'], ['作品集整理', '计划中', '周五'], ['学习记录', '已完成', '昨天']] },
      { id: 'scratch', type: 'document', title: '随手记录', x: 8, y: 4, w: 4, h: 4, content: '把零散想法放在这里，之后再整理成任务。' }
    ]},
    { id: 'focus', name: '专注工作区', icon: '◉', modules: [{ id: 'focus-note', type: 'note', title: '本页还很空', x: 0, y: 0, w: 5, h: 3, content: '这是一个新的工作区。点击右上角“添加模块”，开始组合你的专属页面。' }] }
  ],
  activePage: 'home', theme: 'light'
};

const defaultCategories = [{ id: 'work', name: '工作', color: 'blue' }, { id: 'records', name: '记录', color: 'purple' }, { id: 'tasks', name: '待办', color: 'green' }];
const defaultMetrics = [{ label: '本周完成', value: '06' }, { label: '专注率', value: '82%' }];
let state = normalizeState(loadState());
let editMode = false;
let draggedId = null;

function loadState() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || structuredClone(seed); } catch { return structuredClone(seed); } }
function normalizeState(raw) {
  const next = { ...structuredClone(seed), ...raw, settings: { ...seed.settings, ...(raw?.settings || {}) } };
  next.pages = (raw?.pages || seed.pages).map(page => {
    const categories = page.categories?.length ? page.categories : structuredClone(defaultCategories);
    const categoryIds = new Set(categories.map(c => c.id));
    return { ...page, activeCategory: page.activeCategory || 'all', categories, modules: (page.modules || []).map(mod => ({ ...mod, categoryId: categoryIds.has(mod.categoryId) ? mod.categoryId : categoryForType(mod.type, categories), metrics: mod.type === 'stats' ? (mod.metrics || structuredClone(defaultMetrics)) : mod.metrics })) };
  });
  if (!next.pages.length) next.pages = structuredClone(seed.pages);
  if (!next.pages.some(p => p.id === next.activePage)) next.activePage = next.pages[0].id;
  return next;
}
function categoryForType(type, categories = defaultCategories) { const preferred = type === 'todo' ? 'tasks' : ['note', 'document'].includes(type) ? 'records' : 'work'; return categories.some(c => c.id === preferred) ? preferred : categories[0]?.id; }
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function activePage() { return state.pages.find(p => p.id === state.activePage) || state.pages[0]; }
function esc(value = '') { return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function uid(prefix = 'item') { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }
function nl(value = '') { return esc(value).replace(/\n/g, '<br>'); }

function render() {
  const page = activePage();
  const visibleModules = page.modules.filter(mod => page.activeCategory === 'all' || mod.categoryId === page.activeCategory);
  document.body.dataset.theme = state.theme;
  document.body.dataset.compact = state.settings.compact ? 'true' : 'false';
  document.querySelector('#app').innerHTML = `
    <div class="shell">
      <aside class="sidebar">
        <div class="brand"><span class="brand-mark">M</span><span>MODULAR<br><b>WORKBENCH</b></span></div>
        <div class="side-label">工作台页面 <button class="icon-btn small" data-action="new-page" title="新建页面">${ICONS.plus}</button></div>
        <nav class="page-list">${state.pages.map(p => `<button class="page-link ${p.id === page.id ? 'active' : ''}" data-page="${p.id}"><span>${p.icon}</span>${esc(p.name)}<i>${p.modules.length}</i></button>`).join('')}</nav>
        <div class="sidebar-bottom"><button class="side-action" data-action="import">${ICONS.upload}<span>导入工作台</span></button><button class="side-action" data-action="export">${ICONS.download}<span>导出备份</span></button><input id="import-file" type="file" accept="application/json" hidden /></div>
      </aside>
      <main class="main">
        <header class="topbar"><div class="breadcrumbs"><span>${esc(state.workspaceName)}</span><b>/</b><strong>${esc(page.name)}</strong></div><div class="top-actions"><label class="search"><span>${ICONS.search}</span><input placeholder="搜索模块或内容" id="search-input" /></label><button class="icon-btn" data-action="theme" title="切换主题">${ICONS.moon}</button><button class="icon-btn" data-action="settings" title="工作台设置">${ICONS.settings}</button><span class="save-state">${state.settings.autoSave ? '自动保存已开启' : '设置已保存'}</span><button class="avatar">S</button></div></header>
        <section class="content"><div class="page-heading"><div><p class="eyebrow">${new Date().toLocaleDateString('zh-CN', { weekday: 'long', month: 'long', day: 'numeric' })}</p><h1>${esc(page.name)}</h1><p class="subheading">把信息放在你最顺手的位置。</p></div><div class="heading-actions"><button class="button secondary" data-action="settings">${ICONS.settings} 设置</button><button class="button secondary" data-action="toggle-edit">${editMode ? '完成编辑' : '编辑布局'}</button><button class="button primary" data-action="add-module">${ICONS.plus} 添加模块</button></div></div>
          <div class="workspace-tabs-panel"><div class="section-label">工作台页面 <button class="icon-btn small" data-action="new-page" title="新建页面">${ICONS.plus}</button></div><div class="workspace-tabs">${state.pages.map(p => `<div class="tab-wrap"><button class="workspace-tab ${p.id === page.id ? 'active' : ''}" data-page="${p.id}"><span>${p.icon}</span>${esc(p.name)}<i>${p.modules.length}</i></button><button class="tab-edit" data-action="edit-page" data-id="${p.id}" title="编辑页面">${ICONS.more}</button></div>`).join('')}</div></div>
          <div class="category-tabs-panel"><div class="section-label">模块分类 <button class="icon-btn small" data-action="new-category" title="新增分类">${ICONS.plus}</button></div><div class="category-tabs"><button class="category-tab ${page.activeCategory === 'all' ? 'active' : ''}" data-category="all">全部 <i>${page.modules.length}</i></button>${page.categories.map(c => `<div class="category-wrap"><button class="category-tab ${page.activeCategory === c.id ? 'active' : ''}" data-category="${c.id}"><span class="category-dot ${c.color}"></span>${esc(c.name)} <i>${page.modules.filter(m => m.categoryId === c.id).length}</i></button><button class="category-edit" data-action="edit-category" data-id="${c.id}" title="编辑分类">${ICONS.more}</button></div>`).join('')}</div></div>
          <div class="canvas ${editMode ? 'is-editing' : ''}" id="canvas">${visibleModules.map(renderModule).join('')}<button class="empty-add" data-action="add-module"><span>${ICONS.plus}</span><b>${page.activeCategory === 'all' ? '添加你的第一个模块' : '在此分类添加模块'}</b><small>从模块库或自定义模块开始</small></button></div>
        </section>
      </main>
      <div id="modal-root"></div><div id="toast" class="toast"></div>
    </div>`;
  bindEvents();
}

function renderModule(mod) {
  const meta = moduleCatalog[mod.type] || moduleCatalog.custom;
  const body = moduleBody(mod);
  return `<article class="module ${editMode ? 'editable' : ''}" draggable="${editMode}" data-id="${mod.id}" style="--x:${mod.x};--y:${mod.y};--w:${mod.w};--h:${mod.h}"><div class="module-head"><div class="module-title"><span class="module-icon ${meta.color}">${meta.icon}</span><div><h3>${esc(mod.title)}</h3><span>${mod.type === 'custom' ? '自定义模块' : meta.label}</span></div></div><button class="module-more" data-action="module-menu" data-id="${mod.id}" title="模块设置">${ICONS.more}</button></div><div class="module-body">${body}</div>${editMode ? '<span class="resize-handle" title="调整大小"></span>' : ''}</article>`;
}

function moduleBody(mod) {
  if (mod.type === 'note') return `<div class="note-body">${nl(mod.content || '点击模块菜单编辑内容。')}</div>`;
  if (mod.type === 'document') return `<div class="doc-body"><div class="doc-toolbar"><b>B</b><i>I</i><span>⌘</span></div><div class="doc-content">${nl(mod.content || '')}</div></div>`;
  if (mod.type === 'todo') { const done = (mod.items || []).filter(i => i.done).length; return `<div class="progress-line"><span>${done}/${(mod.items || []).length} 完成</span><b><i style="width:${(mod.items || []).length ? done / mod.items.length * 100 : 0}%"></i></b></div><div class="todo-list">${(mod.items || []).map((i, n) => `<label><input type="checkbox" data-todo="${mod.id}" data-index="${n}" ${i.done ? 'checked' : ''}><span class="${i.done ? 'done' : ''}">${esc(i.text)}</span><span class="inline-actions"><button data-action="edit-todo-item" data-id="${mod.id}" data-index="${n}" title="编辑任务">✎</button><button data-action="delete-todo-item" data-id="${mod.id}" data-index="${n}" title="删除任务">×</button></span></label>`).join('')}</div><button class="text-btn" data-action="add-todo" data-id="${mod.id}">+ 添加任务</button>`; }
  if (mod.type === 'table') return `<div class="data-table"><div class="table-row table-header with-actions"><span>名称</span><span>状态</span><span>时间</span><span>操作</span></div>${(mod.rows || []).map((r, n) => `<div class="table-row with-actions" data-table-row="${mod.id}" data-row="${n}"><span>${esc(r[0])}</span><span><em class="status ${r[1] === '已完成' ? 'complete' : r[1] === '进行中' ? 'active' : ''}">${esc(r[1])}</em></span><span>${esc(r[2])}</span><span class="inline-actions"><button data-action="edit-row" data-id="${mod.id}" data-index="${n}" title="编辑行">✎</button><button data-action="delete-row" data-id="${mod.id}" data-index="${n}" title="删除行">×</button></span></div>`).join('')}</div><button class="text-btn" data-action="add-row" data-id="${mod.id}">+ 添加一行</button>`;
  if (mod.type === 'stats') { const metrics = mod.metrics || structuredClone(defaultMetrics); return `<div class="stat-grid">${metrics.map((metric, n) => `<div><strong>${esc(metric.value)}</strong><span>${esc(metric.label)}</span><span class="inline-actions"><button data-action="edit-metric" data-id="${mod.id}" data-index="${n}" title="编辑指标">✎</button><button data-action="delete-metric" data-id="${mod.id}" data-index="${n}" title="删除指标">×</button></span></div>`).join('')}</div><div class="bars"><i style="height:35%"></i><i style="height:55%"></i><i style="height:42%"></i><i style="height:78%"></i><i style="height:62%"></i><i style="height:90%"></i><i style="height:72%"></i></div><div class="chart-labels"><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span><span>日</span></div><button class="text-btn" data-action="add-metric" data-id="${mod.id}">+ 添加指标</button>`; }
  if (mod.type === 'clock') return `<div class="clock-body"><strong>${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</strong><span>${esc(mod.content || '保持专注，慢慢推进。')}</span></div>`;
  return `<div class="custom-body"><span class="custom-tag">CUSTOM</span><p>${nl(mod.content || '这是一个可自由组合的模块。')}</p>${mod.fields?.length ? `<div class="field-list">${mod.fields.map((f, n) => `<span><b>${esc(f.label)}</b>${esc(f.value || '未设置')}<span class="inline-actions"><button data-action="edit-field" data-id="${mod.id}" data-index="${n}" title="编辑字段">✎</button><button data-action="delete-field" data-id="${mod.id}" data-index="${n}" title="删除字段">×</button></span></span>`).join('')}</div>` : ''}<button class="text-btn" data-action="add-field" data-id="${mod.id}">+ 添加字段</button></div>`;
}

function bindEvents() {
  document.querySelectorAll('[data-page]').forEach(b => b.onclick = () => { state.activePage = b.dataset.page; saveState(); render(); });
  document.querySelectorAll('[data-category]').forEach(b => b.onclick = () => { activePage().activeCategory = b.dataset.category; saveState(); render(); });
  document.querySelectorAll('[data-action]').forEach(b => b.onclick = () => actions(b.dataset.action, b.dataset.id));
  document.querySelectorAll('[data-todo]').forEach(input => input.onchange = () => { const m = activePage().modules.find(x => x.id === input.dataset.todo); m.items[input.dataset.index].done = input.checked; saveState(); render(); });
  document.querySelector('#search-input').oninput = e => { const q = e.target.value.toLowerCase(); document.querySelectorAll('.module').forEach(m => m.classList.toggle('filtered', q && !m.innerText.toLowerCase().includes(q))); };
  if (editMode) document.querySelectorAll('.module').forEach(card => {
    card.ondragstart = () => { draggedId = card.dataset.id; card.classList.add('dragging'); };
    card.ondragend = () => card.classList.remove('dragging');
    card.ondragover = e => e.preventDefault();
    card.ondrop = e => { e.preventDefault(); swapModules(draggedId, card.dataset.id); };
    const handle = card.querySelector('.resize-handle');
    if (handle) handle.onpointerdown = e => startResize(e, card);
  });
}

function startResize(event, card) {
  event.preventDefault();
  event.stopPropagation();
  const mod = activePage().modules.find(m => m.id === card.dataset.id);
  if (!mod) return;
  const canvas = document.querySelector('#canvas');
  const column = (canvas.clientWidth - 11 * 14) / 12 + 14;
  const row = 60 + 14;
  const startX = event.clientX;
  const startY = event.clientY;
  const startW = mod.w;
  const startH = mod.h;
  const move = e => {
    const nextW = Math.max(2, Math.min(12 - mod.x, startW + Math.round((e.clientX - startX) / column)));
    const nextH = Math.max(2, Math.min(12, startH + Math.round((e.clientY - startY) / row)));
    card.style.setProperty('--w', nextW);
    card.style.setProperty('--h', nextH);
  };
  const finish = e => {
    const nextW = Math.max(2, Math.min(12 - mod.x, startW + Math.round((e.clientX - startX) / column)));
    const nextH = Math.max(2, Math.min(12, startH + Math.round((e.clientY - startY) / row)));
    mod.w = nextW;
    mod.h = nextH;
    saveState();
    document.removeEventListener('pointermove', move);
    document.removeEventListener('pointerup', finish);
    render();
    toast('模块大小已更新');
  };
  document.addEventListener('pointermove', move);
  document.addEventListener('pointerup', finish);
}

function swapModules(a, b) { const mods = activePage().modules; const one = mods.find(m => m.id === a), two = mods.find(m => m.id === b); if (!one || !two) return; [one.x, two.x] = [two.x, one.x]; [one.y, two.y] = [two.y, one.y]; saveState(); render(); toast('布局已更新'); }
function actions(action, id) {
  if (action === 'toggle-edit') { editMode = !editMode; render(); return; }
  if (action === 'theme') { state.theme = state.theme === 'light' ? 'dark' : 'light'; saveState(); render(); return; }
  if (action === 'add-module') { showModuleLibrary(); return; }
  if (action === 'new-page') { showPageEditor(); return; }
  if (action === 'edit-page') { showPageEditor(state.pages.find(p => p.id === id)); return; }
  if (action === 'new-category') { showCategoryEditor(); return; }
  if (action === 'edit-category') { showCategoryEditor(activePage().categories.find(c => c.id === id)); return; }
  if (action === 'settings') { showSettings(); return; }
  if (action === 'module-menu') { showModuleEditor(activePage().modules.find(m => m.id === id)); return; }
  if (action === 'add-todo') { const m = activePage().modules.find(x => x.id === id); const text = prompt('任务内容'); if (text?.trim()) { m.items.push({ text: text.trim(), done: false }); saveState(); render(); } return; }
  if (action === 'add-row') { const m = activePage().modules.find(x => x.id === id); const text = prompt('输入一行，格式：名称 / 状态 / 时间', '新项目 / 计划中 / 待定'); if (text?.trim()) { const row = text.split('/').map(s => s.trim()); m.rows.push([row[0] || '新项目', row[1] || '计划中', row[2] || '待定']); saveState(); render(); } return; }
  const module = activePage().modules.find(x => x.id === id);
  const index = Number(document.querySelector(`[data-action="${action}"][data-id="${id}"]`)?.dataset.index);
  if (module && ['edit-todo-item', 'delete-todo-item'].includes(action)) { if (action === 'edit-todo-item') { const text = prompt('修改任务内容', module.items[index]?.text); if (text?.trim()) module.items[index].text = text.trim(); } else if (confirm('删除这条任务吗？')) module.items.splice(index, 1); saveState(); render(); return; }
  if (module && ['edit-row', 'delete-row'].includes(action)) { if (action === 'edit-row') { const text = prompt('修改这一行，格式：名称 / 状态 / 时间', module.rows[index]?.join(' / ')); if (text?.trim()) { const row = text.split('/').map(s => s.trim()); module.rows[index] = [row[0] || '新项目', row[1] || '计划中', row[2] || '待定']; } } else if (confirm('删除这一行吗？')) module.rows.splice(index, 1); saveState(); render(); return; }
  if (module && ['add-metric', 'edit-metric', 'delete-metric'].includes(action)) { module.metrics ||= structuredClone(defaultMetrics); if (action === 'add-metric') { const text = prompt('输入指标，格式：名称 / 数值', '本月进度 / 75%'); if (text?.trim()) { const parts = text.split('/').map(s => s.trim()); module.metrics.push({ label: parts[0] || '新指标', value: parts[1] || '0' }); } } else if (action === 'edit-metric') { const text = prompt('修改指标，格式：名称 / 数值', `${module.metrics[index].label} / ${module.metrics[index].value}`); if (text?.trim()) { const parts = text.split('/').map(s => s.trim()); module.metrics[index] = { label: parts[0] || '新指标', value: parts[1] || '0' }; } } else if (confirm('删除这个指标吗？')) module.metrics.splice(index, 1); saveState(); render(); return; }
  if (module && ['add-field', 'edit-field', 'delete-field'].includes(action)) { module.fields ||= []; if (action === 'add-field') { const text = prompt('输入字段，格式：名称 / 内容', '负责人 / 未设置'); if (text?.trim()) { const parts = text.split('/').map(s => s.trim()); module.fields.push({ label: parts[0] || '新字段', value: parts[1] || '未设置' }); } } else if (action === 'edit-field') { const text = prompt('修改字段，格式：名称 / 内容', `${module.fields[index].label} / ${module.fields[index].value}`); if (text?.trim()) { const parts = text.split('/').map(s => s.trim()); module.fields[index] = { label: parts[0] || '新字段', value: parts[1] || '未设置' }; } } else if (confirm('删除这个字段吗？')) module.fields.splice(index, 1); saveState(); render(); return; }
  if (action === 'export') { const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'modular-workbench-backup.json'; a.click(); URL.revokeObjectURL(a.href); toast('备份已导出'); return; }
  if (action === 'import') { document.querySelector('#import-file').click(); document.querySelector('#import-file').onchange = e => { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { try { const next = JSON.parse(reader.result); if (!next.pages) throw Error(); state = next; saveState(); render(); toast('备份已恢复'); } catch { toast('文件格式不正确'); } }; reader.readAsText(file); }; }
}

function showModuleLibrary() { document.querySelector('#modal-root').innerHTML = `<div class="modal-backdrop" data-close><section class="modal library"><div class="modal-head"><div><p class="eyebrow">MODULE LIBRARY</p><h2>添加一个模块</h2><p>选择基础模块，或从空白开始自由组合。</p></div><button class="close" data-close>×</button></div><div class="library-grid">${Object.entries(moduleCatalog).map(([type, m]) => `<button class="library-item" data-library="${type}"><span class="module-icon ${m.color}">${m.icon}</span><b>${m.label}</b><small>${m.description}</small></button>`).join('')}</div></section></div>`; document.querySelectorAll('[data-close]').forEach(x => x.onclick = e => { if (e.target === x) document.querySelector('#modal-root').innerHTML = ''; }); document.querySelectorAll('[data-library]').forEach(x => x.onclick = () => { document.querySelector('#modal-root').innerHTML = ''; addModule(x.dataset.library); }); }
function addModule(type) { const width = type === 'table' ? 7 : 4; const height = type === 'document' ? 4 : 3; const page = activePage(); const m = { id: uid('module'), type, title: moduleCatalog[type].label, categoryId: page.activeCategory === 'all' ? categoryForType(type, page.categories) : page.activeCategory, x: 0, y: findOpenRow(width), w: width, h: height }; if (type === 'note') m.content = '点击模块菜单编辑内容。'; if (type === 'document') m.content = '开始记录你的内容。'; if (type === 'clock') m.content = '保持专注，慢慢推进。'; if (type === 'todo') m.items = [{ text: '我的第一个任务', done: false }]; if (type === 'table') m.rows = [['新记录', '计划中', '待定']]; if (type === 'stats') m.metrics = structuredClone(defaultMetrics); if (type === 'custom') { m.content = '这是一个自定义模块。'; m.fields = [{ label: '状态', value: '未设置' }, { label: '负责人', value: '未设置' }]; } page.modules.push(m); saveState(); render(); toast('模块已添加'); }
function findOpenRow() { const modules = activePage().modules; return modules.length ? Math.max(...modules.map(m => m.y + m.h)) : 0; }
function showPageEditor(page = null) { const isNew = !page; const target = page || { id: uid('page'), name: '新工作区', icon: '◇', modules: [], categories: structuredClone(defaultCategories), activeCategory: 'all' }; document.querySelector('#modal-root').innerHTML = `<div class="modal-backdrop" data-close><section class="modal editor"><div class="modal-head"><div><p class="eyebrow">PAGE SETTINGS</p><h2>${isNew ? '新建页面' : '编辑页面'}</h2><p>页面可以独立拥有自己的模块和分类。</p></div><button class="close" data-close>×</button></div><label>页面名称<input id="page-name" value="${esc(target.name)}"></label><label>页面图标<input id="page-icon" maxlength="2" value="${esc(target.icon || '◇')}"></label><div class="modal-actions">${isNew ? '' : `<button class="button danger" data-page-delete="${target.id}">${ICONS.trash} 删除页面</button>`}<button class="button primary" data-page-save="${target.id}">${isNew ? '创建页面' : '保存页面'}</button></div></section></div>`; bindModalClose(); document.querySelector('[data-page-save]').onclick = () => { target.name = document.querySelector('#page-name').value.trim() || '未命名页面'; target.icon = document.querySelector('#page-icon').value.trim() || '◇'; if (isNew) { state.pages.push(target); state.activePage = target.id; } saveState(); closeModal(); render(); toast(isNew ? '页面已创建' : '页面设置已保存'); }; document.querySelector('[data-page-delete]')?.addEventListener('click', () => { if (state.pages.length === 1) return toast('至少保留一个页面'); if (confirm(`确定删除页面“${target.name}”吗？`)) { state.pages = state.pages.filter(p => p.id !== target.id); if (state.activePage === target.id) state.activePage = state.pages[0].id; saveState(); closeModal(); render(); toast('页面已删除'); } }); }
function showCategoryEditor(category = null) { const isNew = !category; const target = category || { id: uid('category'), name: '新分类', color: 'blue' }; const page = activePage(); document.querySelector('#modal-root').innerHTML = `<div class="modal-backdrop" data-close><section class="modal editor"><div class="modal-head"><div><p class="eyebrow">CATEGORY SETTINGS</p><h2>${isNew ? '新增模块分类' : '编辑模块分类'}</h2><p>分类可以随时重命名、删除和重新整理。</p></div><button class="close" data-close>×</button></div><label>分类名称<input id="category-name" value="${esc(target.name)}"></label><label>分类颜色<select id="category-color"><option value="blue" ${target.color === 'blue' ? 'selected' : ''}>蓝色</option><option value="green" ${target.color === 'green' ? 'selected' : ''}>绿色</option><option value="purple" ${target.color === 'purple' ? 'selected' : ''}>紫色</option><option value="orange" ${target.color === 'orange' ? 'selected' : ''}>橙色</option><option value="red" ${target.color === 'red' ? 'selected' : ''}>红色</option></select></label><div class="modal-actions">${isNew ? '' : `<button class="button danger" data-category-delete="${target.id}">${ICONS.trash} 删除分类</button>`}<button class="button primary" data-category-save="${target.id}">${isNew ? '创建分类' : '保存分类'}</button></div></section></div>`; bindModalClose(); document.querySelector('[data-category-save]').onclick = () => { target.name = document.querySelector('#category-name').value.trim() || '未命名分类'; target.color = document.querySelector('#category-color').value; if (isNew) page.categories.push(target); saveState(); closeModal(); render(); toast(isNew ? '分类已创建' : '分类设置已保存'); }; document.querySelector('[data-category-delete]')?.addEventListener('click', () => { if (confirm(`删除分类“${target.name}”后，里面的模块会移到全部视图。继续吗？`)) { page.categories = page.categories.filter(c => c.id !== target.id); page.modules.forEach(m => { if (m.categoryId === target.id) delete m.categoryId; }); page.activeCategory = 'all'; saveState(); closeModal(); render(); toast('分类已删除'); } }); }
function showSettings() { document.querySelector('#modal-root').innerHTML = `<div class="modal-backdrop" data-close><section class="modal editor"><div class="modal-head"><div><p class="eyebrow">WORKSPACE SETTINGS</p><h2>保存工作台设置</h2><p>这些设置会保存在当前浏览器，重新打开后仍然有效。</p></div><button class="close" data-close>×</button></div><label>工作台名称<input id="workspace-name" value="${esc(state.workspaceName)}"></label><label class="check-setting"><input id="auto-save" type="checkbox" ${state.settings.autoSave ? 'checked' : ''}><span>自动保存模块、页面和布局变化</span></label><label class="check-setting"><input id="compact-layout" type="checkbox" ${state.settings.compact ? 'checked' : ''}><span>使用紧凑布局</span></label><div class="modal-actions"><button class="button primary" data-settings-save>保存设置</button></div></section></div>`; bindModalClose(); document.querySelector('[data-settings-save]').onclick = () => { state.workspaceName = document.querySelector('#workspace-name').value.trim() || '我的工作台'; state.settings.autoSave = document.querySelector('#auto-save').checked; state.settings.compact = document.querySelector('#compact-layout').checked; saveState(); closeModal(); render(); toast('工作台设置已保存'); }; }
function bindModalClose() { document.querySelectorAll('[data-close]').forEach(x => x.onclick = e => { if (e.target === x) closeModal(); }); }
function closeModal() { document.querySelector('#modal-root').innerHTML = ''; }
function showModuleEditor(mod) { if (!mod) return; const page = activePage(); document.querySelector('#modal-root').innerHTML = `<div class="modal-backdrop" data-close><section class="modal editor"><div class="modal-head"><div><p class="eyebrow">MODULE SETTINGS</p><h2>编辑模块</h2><p>修改标题、内容和所属分类，保存后立即生效。</p></div><button class="close" data-close>×</button></div><label>模块名称<input id="edit-title" value="${esc(mod.title)}"></label><label>模块分类<select id="edit-category"><option value="">未分类</option>${page.categories.map(c => `<option value="${c.id}" ${mod.categoryId === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label><label>模块内容<textarea id="edit-content" rows="7">${esc(mod.content || '')}</textarea></label><div class="modal-actions"><button class="button danger" data-delete="${mod.id}">${ICONS.trash} 删除模块</button><button class="button primary" data-save="${mod.id}">保存设置</button></div></section></div>`; bindModalClose(); document.querySelector('[data-save]').onclick = () => { mod.title = document.querySelector('#edit-title').value.trim() || mod.title; mod.categoryId = document.querySelector('#edit-category').value || undefined; if (['note', 'document', 'custom', 'clock'].includes(mod.type)) mod.content = document.querySelector('#edit-content').value; saveState(); closeModal(); render(); toast('模块设置已保存'); }; document.querySelector('[data-delete]').onclick = () => { if (confirm('确定删除这个模块吗？')) { page.modules = page.modules.filter(x => x.id !== mod.id); saveState(); closeModal(); render(); toast('模块已删除'); } }; }
function toast(message) { const el = document.querySelector('#toast'); if (!el) return; el.textContent = message; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 1800); }

render();
