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

let state = loadState();
let editMode = false;
let draggedId = null;

function loadState() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || structuredClone(seed); } catch { return structuredClone(seed); } }
function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
function activePage() { return state.pages.find(p => p.id === state.activePage) || state.pages[0]; }
function esc(value = '') { return String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
function uid(prefix = 'item') { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`; }
function nl(value = '') { return esc(value).replace(/\n/g, '<br>'); }

function render() {
  const page = activePage();
  document.body.dataset.theme = state.theme;
  document.querySelector('#app').innerHTML = `
    <div class="shell">
      <aside class="sidebar">
        <div class="brand"><span class="brand-mark">M</span><span>MODULAR<br><b>WORKBENCH</b></span></div>
        <div class="side-label">工作台页面 <button class="icon-btn small" data-action="new-page" title="新建页面">${ICONS.plus}</button></div>
        <nav class="page-list">${state.pages.map(p => `<button class="page-link ${p.id === page.id ? 'active' : ''}" data-page="${p.id}"><span>${p.icon}</span>${esc(p.name)}<i>${p.modules.length}</i></button>`).join('')}</nav>
        <div class="sidebar-bottom"><button class="side-action" data-action="import">${ICONS.upload}<span>导入工作台</span></button><button class="side-action" data-action="export">${ICONS.download}<span>导出备份</span></button><input id="import-file" type="file" accept="application/json" hidden /></div>
      </aside>
      <main class="main">
        <header class="topbar"><div class="breadcrumbs"><span>我的空间</span><b>/</b><strong>${esc(page.name)}</strong></div><div class="top-actions"><label class="search"><span>${ICONS.search}</span><input placeholder="搜索模块或内容" id="search-input" /></label><button class="icon-btn" data-action="theme" title="切换主题">${ICONS.moon}</button><button class="avatar">S</button></div></header>
        <section class="content"><div class="page-heading"><div><p class="eyebrow">${new Date().toLocaleDateString('zh-CN', { weekday: 'long', month: 'long', day: 'numeric' })}</p><h1>${esc(page.name)}</h1><p class="subheading">把信息放在你最顺手的位置。</p></div><div class="heading-actions"><button class="button secondary" data-action="toggle-edit">${editMode ? '完成编辑' : '编辑布局'}</button><button class="button primary" data-action="add-module">${ICONS.plus} 添加模块</button></div></div>
          <div class="canvas ${editMode ? 'is-editing' : ''}" id="canvas">${page.modules.map(renderModule).join('')}<button class="empty-add" data-action="add-module"><span>${ICONS.plus}</span><b>添加你的第一个模块</b><small>从模块库或自定义模块开始</small></button></div>
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
  if (mod.type === 'todo') { const done = (mod.items || []).filter(i => i.done).length; return `<div class="progress-line"><span>${done}/${(mod.items || []).length} 完成</span><b><i style="width:${(mod.items || []).length ? done / mod.items.length * 100 : 0}%"></i></b></div><div class="todo-list">${(mod.items || []).map((i, n) => `<label><input type="checkbox" data-todo="${mod.id}" data-index="${n}" ${i.done ? 'checked' : ''}><span class="${i.done ? 'done' : ''}">${esc(i.text)}</span></label>`).join('')}</div><button class="text-btn" data-action="add-todo" data-id="${mod.id}">+ 添加任务</button>`; }
  if (mod.type === 'table') return `<div class="data-table"><div class="table-row table-header"><span>名称</span><span>状态</span><span>时间</span></div>${(mod.rows || []).map((r, n) => `<div class="table-row" data-table-row="${mod.id}" data-row="${n}"><span>${esc(r[0])}</span><span><em class="status ${r[1] === '已完成' ? 'complete' : r[1] === '进行中' ? 'active' : ''}">${esc(r[1])}</em></span><span>${esc(r[2])}</span></div>`).join('')}</div><button class="text-btn" data-action="add-row" data-id="${mod.id}">+ 添加一行</button>`;
  if (mod.type === 'stats') return `<div class="stat-grid"><div><strong>06</strong><span>本周完成</span></div><div><strong>82%</strong><span>专注率</span></div></div><div class="bars"><i style="height:35%"></i><i style="height:55%"></i><i style="height:42%"></i><i style="height:78%"></i><i style="height:62%"></i><i style="height:90%"></i><i style="height:72%"></i></div><div class="chart-labels"><span>一</span><span>二</span><span>三</span><span>四</span><span>五</span><span>六</span><span>日</span></div>`;
  if (mod.type === 'clock') return `<div class="clock-body"><strong>${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}</strong><span>保持专注，慢慢推进。</span></div>`;
  return `<div class="custom-body"><span class="custom-tag">CUSTOM</span><p>${nl(mod.content || '这是一个可自由组合的模块。')}</p>${mod.fields?.length ? `<div class="field-list">${mod.fields.map(f => `<span><b>${esc(f.label)}</b>${esc(f.value || '未设置')}</span>`).join('')}</div>` : ''}</div>`;
}

function bindEvents() {
  document.querySelectorAll('[data-page]').forEach(b => b.onclick = () => { state.activePage = b.dataset.page; saveState(); render(); });
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
  if (action === 'new-page') { const name = prompt('新页面名称', '新工作区'); if (name?.trim()) { const p = { id: uid('page'), name: name.trim(), icon: '◇', modules: [] }; state.pages.push(p); state.activePage = p.id; saveState(); render(); } return; }
  if (action === 'module-menu') { showModuleEditor(activePage().modules.find(m => m.id === id)); return; }
  if (action === 'add-todo') { const m = activePage().modules.find(x => x.id === id); const text = prompt('任务内容'); if (text?.trim()) { m.items.push({ text: text.trim(), done: false }); saveState(); render(); } return; }
  if (action === 'add-row') { const m = activePage().modules.find(x => x.id === id); const text = prompt('输入一行，格式：名称 / 状态 / 时间', '新项目 / 计划中 / 待定'); if (text?.trim()) { const row = text.split('/').map(s => s.trim()); m.rows.push([row[0] || '新项目', row[1] || '计划中', row[2] || '待定']); saveState(); render(); } return; }
  if (action === 'export') { const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'modular-workbench-backup.json'; a.click(); URL.revokeObjectURL(a.href); toast('备份已导出'); return; }
  if (action === 'import') { document.querySelector('#import-file').click(); document.querySelector('#import-file').onchange = e => { const file = e.target.files[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => { try { const next = JSON.parse(reader.result); if (!next.pages) throw Error(); state = next; saveState(); render(); toast('备份已恢复'); } catch { toast('文件格式不正确'); } }; reader.readAsText(file); }; }
}

function showModuleLibrary() { document.querySelector('#modal-root').innerHTML = `<div class="modal-backdrop" data-close><section class="modal library"><div class="modal-head"><div><p class="eyebrow">MODULE LIBRARY</p><h2>添加一个模块</h2><p>选择基础模块，或从空白开始自由组合。</p></div><button class="close" data-close>×</button></div><div class="library-grid">${Object.entries(moduleCatalog).map(([type, m]) => `<button class="library-item" data-library="${type}"><span class="module-icon ${m.color}">${m.icon}</span><b>${m.label}</b><small>${m.description}</small></button>`).join('')}</div></section></div>`; document.querySelectorAll('[data-close]').forEach(x => x.onclick = e => { if (e.target === x) document.querySelector('#modal-root').innerHTML = ''; }); document.querySelectorAll('[data-library]').forEach(x => x.onclick = () => { document.querySelector('#modal-root').innerHTML = ''; addModule(x.dataset.library); }); }
function addModule(type) { const width = type === 'table' ? 7 : 4; const height = type === 'document' ? 4 : 3; const m = { id: uid('module'), type, title: moduleCatalog[type].label, x: 0, y: findOpenRow(width), w: width, h: height }; if (type === 'note') m.content = '点击模块菜单编辑内容。'; if (type === 'document') m.content = '开始记录你的内容。'; if (type === 'todo') m.items = [{ text: '我的第一个任务', done: false }]; if (type === 'table') m.rows = [['新记录', '计划中', '待定']]; if (type === 'custom') { m.content = '这是一个自定义模块。'; m.fields = [{ label: '状态', value: '未设置' }, { label: '负责人', value: '未设置' }]; } activePage().modules.push(m); saveState(); render(); toast('模块已添加'); }
function findOpenRow() { const modules = activePage().modules; return modules.length ? Math.max(...modules.map(m => m.y + m.h)) : 0; }
function showModuleEditor(mod) { if (!mod) return; document.querySelector('#modal-root').innerHTML = `<div class="modal-backdrop" data-close><section class="modal editor"><div class="modal-head"><div><p class="eyebrow">MODULE SETTINGS</p><h2>编辑模块</h2></div><button class="close" data-close>×</button></div><label>模块名称<input id="edit-title" value="${esc(mod.title)}"></label><label>模块内容<textarea id="edit-content" rows="7">${esc(mod.content || '')}</textarea></label><div class="modal-actions"><button class="button danger" data-delete="${mod.id}">${ICONS.trash} 删除模块</button><button class="button primary" data-save="${mod.id}">保存设置</button></div></section></div>`; document.querySelectorAll('[data-close]').forEach(x => x.onclick = e => { if (e.target === x) document.querySelector('#modal-root').innerHTML = ''; }); document.querySelector('[data-save]').onclick = () => { mod.title = document.querySelector('#edit-title').value.trim() || mod.title; if (['note', 'document', 'custom'].includes(mod.type)) mod.content = document.querySelector('#edit-content').value; saveState(); document.querySelector('#modal-root').innerHTML = ''; render(); toast('模块设置已保存'); }; document.querySelector('[data-delete]').onclick = () => { if (confirm('确定删除这个模块吗？')) { activePage().modules = activePage().modules.filter(x => x.id !== mod.id); saveState(); document.querySelector('#modal-root').innerHTML = ''; render(); toast('模块已删除'); } }; }
function toast(message) { const el = document.querySelector('#toast'); if (!el) return; el.textContent = message; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 1800); }

render();
