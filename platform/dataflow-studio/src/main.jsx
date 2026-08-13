import React, { useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Papa from 'papaparse';
import { Upload, WandSparkles, Download, RotateCcw, Check, AlertTriangle, Database, Rows3, Columns3, FileSpreadsheet, X, Search, Activity, ChevronDown, Plus, Trash2, GripVertical, Lightbulb, Pencil, Table2, Undo2, Redo2, Filter, ListChecks, BarChart3 } from 'lucide-react';
import './styles.css';
import './compact-rules.css';
import './drag-rules.css';
import './multi-field.css';
import './rule-execution.css';
import './task-tabs.css';
import './visual-refresh.css';
import './ui-polish.css';
import './dataflow-fix.css';
import './responsive-layout.css';

const SAMPLE = `customer_id,name,city,phone,email,amount\nC001, 申晴 ,上海,13800138000,SHEN@example.com,1280\nC002,李明,北京,,liming@example.com,980\nC002,李明,北京,,liming@example.com,980\nC003,王芳, 上海 ,13900139000,WANG@example.com,\nC004,,杭州,13700137000,invalid-email,1560\nC005,赵雷,北京,13600136000,zhao@example.com,2100`;

const makeRule = (type, fields = []) => ({ id: crypto.randomUUID(), type, fields, enabled: true, find: '', replace: '' });
const defaultRules = column => [makeRule('trim'), makeRule('lowercase', ['email']), makeRule('dedupe', column ? [column] : [])];
const RULE_NAMES = { trim: '去除首尾空格', lowercase: '转为小写', uppercase: '转为大写', dedupe: '删除重复记录', removeEmpty: '删除空值行', replace: '查找并替换' };

function parseCsv(text, name = 'data.csv') {
  const result = Papa.parse(text, { header: true, skipEmptyLines: true, transformHeader: h => h.trim() });
  const rows = result.data.map(row => Object.fromEntries(Object.entries(row).map(([k, v]) => [k, v ?? ''])));
  return { name, rows, columns: result.meta.fields || [], errors: result.errors };
}

function profile(rows, columns) {
  return columns.map(column => {
    const values = rows.map(r => String(r[column] ?? ''));
    const filled = values.filter(v => v.trim() !== '');
    const unique = new Set(filled.map(v => v.trim().toLowerCase())).size;
    return { column, empty: values.length - filled.length, unique, duplicate: Math.max(0, filled.length - unique), completeness: values.length ? Math.round(filled.length / values.length * 100) : 0 };
  });
}

function applyRules(rows, columns, rules) {
  return rules.filter(r => r.enabled).reduce((output, rule) => {
    if (rule.type === 'dedupe') {
      const seen = new Set();
      const fields = rule.fields?.length ? rule.fields : columns;
      return output.filter(row => { const key = fields.map(c => String(row[c] ?? '').trim().toLowerCase()).join('\u001f'); if (seen.has(key)) return false; seen.add(key); return true; });
    }
    if (rule.type === 'removeEmpty') return rule.fields?.length ? output.filter(row => rule.fields.every(c => String(row[c] ?? '').trim() !== '')) : output;
    return output.map(row => {
      const next = { ...row }; const targets = rule.fields?.length ? rule.fields : columns;
      targets.forEach(col => { const value = String(next[col] ?? ''); if (rule.type === 'trim') next[col] = value.trim(); if (rule.type === 'lowercase') next[col] = value.toLowerCase(); if (rule.type === 'uppercase') next[col] = value.toUpperCase(); if (rule.type === 'replace' && rule.find) next[col] = value.split(rule.find).join(rule.replace); });
      return next;
    });
  }, rows.map(r => ({ ...r })));
}

function App() {
  const firstTab = useMemo(() => ({ id: crypto.randomUUID(), type: 'workspace', title: '数据整理 1', dataset: null, rules: [], appliedRules: [], query: '' }), []);
  const [tabs, setTabs] = useState([firstTab]);
  const [sources, setSources] = useState([]);
  const [activeId, setActiveId] = useState(firstTab.id);
  const [addingRule, setAddingRule] = useState(false);
  const [draggedRuleId, setDraggedRuleId] = useState(null);
  const [dropRuleId, setDropRuleId] = useState(null);
  const inputRef = useRef(null);
  const activeTab = tabs.find(tab => tab.id === activeId) || tabs[0];
  const active = activeTab.type;
  const { dataset, rules = [], appliedRules = [], query = '' } = activeTab;
  const updateTab = patch => setTabs(current => current.map(tab => tab.id === activeId ? { ...tab, ...patch } : tab));
  const setDataset = value => updateTab({ dataset: value });
  const setRules = value => updateTab({ rules: typeof value === 'function' ? value(rules) : value });
  const setAppliedRules = value => updateTab({ appliedRules: typeof value === 'function' ? value(appliedRules) : value });
  const setQuery = value => updateTab({ query: typeof value === 'function' ? value(query) : value });
  const openTab = (type, source = null) => {
    const count = tabs.filter(tab => tab.type === type).length + 1;
    const id = crypto.randomUUID();
    const sourceData = source?.dataset || source;
    const sourceId = source?.sourceId || sourceData?.sourceId || sourceData?.id || null;
    const tab = type === 'quality'
      ? { id, type, title: sourceData ? `${sourceData.name.replace(/\.csv$/i, '')} 报告` : `质量报告 ${count}`, sourceId, dataset: sourceData ? structuredClone(sourceData) : null, rules: source?.rules || [], appliedRules: source?.appliedRules || [], query: '' }
      : type === 'editor'
        ? { id, type, title: sourceData ? `${sourceData.name.replace(/\.csv$/i, '')} 编辑` : `数据编辑 ${count}`, sourceId, focusColumn: source?.focusColumn || '', dataset: sourceData ? structuredClone(sourceData) : null, undoStack: [], redoStack: [], rules: [], appliedRules: [], query: '' }
        : type === 'analysis'
          ? { id, type, title: sourceData ? `${sourceData.name.replace(/\.csv$/i, '')} 分析` : `数据分析 ${count}`, sourceId, dataset: sourceData ? structuredClone(sourceData) : null, groupBy: sourceData?.columns?.[0] || '', measure: sourceData?.columns?.[sourceData?.columns?.length > 1 ? 1 : 0] || '', aggregation: 'sum', rules: [], appliedRules: [], query: '' }
        : { id, type, title: sourceData ? sourceData.name.replace(/\.csv$/i, '') : `数据整理 ${count}`, sourceId, dataset: sourceData ? structuredClone(sourceData) : null, rules: source?.rules || [], appliedRules: source?.appliedRules || [], query: '' };
    setTabs(current => [...current, tab]); setActiveId(id); setAddingRule(false);
  };
  const activateType = type => { const existing = tabs.find(tab => tab.type === type && (!activeTab.sourceId || tab.sourceId === activeTab.sourceId)); if (existing) { setActiveId(existing.id); setAddingRule(false); } else openTab(type, activeTab.sourceId ? activeTab : null); };
  const closeTab = id => setTabs(current => { const index = current.findIndex(tab => tab.id === id); const next = current.filter(tab => tab.id !== id); if (!next.length) { const fresh = { id: crypto.randomUUID(), type: 'workspace', title: '数据整理 1', dataset: null, rules: [], appliedRules: [], query: '' }; setActiveId(fresh.id); return [fresh]; } if (id === activeId) setActiveId(next[Math.max(0, index - 1)].id); return next; });
  const cleaned = useMemo(() => dataset ? applyRules(dataset.rows, dataset.columns, appliedRules) : [], [dataset, appliedRules]);
  const rulesDirty = JSON.stringify(rules) !== JSON.stringify(appliedRules);
  const profiles = useMemo(() => dataset ? profile(dataset.rows, dataset.columns) : [], [dataset]);
  const score = dataset ? Math.max(0, Math.round(profiles.reduce((s, p) => s + p.completeness, 0) / Math.max(1, profiles.length) - profiles.reduce((s,p) => s+p.duplicate,0) / Math.max(1,dataset.rows.length) * 10)) : 0;
  const filtered = cleaned.filter(row => !query || Object.values(row).some(v => String(v).toLowerCase().includes(query.toLowerCase())));

  const loadText = (text, name) => { const data = { ...parseCsv(text, name), id: crypto.randomUUID() }; setSources(current => [...current, data]); const initialRules=defaultRules(data.columns[0] || ''); updateTab({ sourceId: data.id, dataset: structuredClone(data), rules: initialRules, appliedRules: initialRules, title: name.replace(/\.csv$/i, '') }); };
  const updateSource = (sourceId, next) => { if (!sourceId) return; setSources(current => current.map(source => source.id === sourceId ? { ...source, ...structuredClone(next) } : source)); setTabs(current => current.map(tab => tab.sourceId === sourceId ? { ...tab, dataset: structuredClone(next) } : tab)); };
  const optimizeQuality = actions => {
    if (!activeTab.sourceId || !dataset || !actions.length) return;
    let rows = dataset.rows.map(row => ({ ...row }));
    actions.filter(action => action.kind === 'empty').forEach(action => { rows = rows.map(row => String(row[action.column] ?? '').trim() === '' ? { ...row, [action.column]: '待补充' } : row); });
    actions.filter(action => action.kind === 'duplicate').forEach(action => { const seen = new Set(); rows = rows.filter(row => { const value = String(row[action.column] ?? '').trim().toLowerCase(); if (!value || !seen.has(value)) { if (value) seen.add(value); return true; } return false; }); });
    updateSource(activeTab.sourceId, { ...dataset, rows });
  };
  const openEditor = (focusColumn = '') => openTab('editor', { ...activeTab, focusColumn });
  const openQuality = () => openTab('quality', activeTab);
  const openExistingQuality = () => {
    const existing = tabs.find(tab => tab.type === 'quality' && tab.sourceId && tab.sourceId === activeTab.sourceId);
    if (existing) { setActiveId(existing.id); setAddingRule(false); return; }
    openTab('quality', activeTab);
  };
  const onFile = file => { if (!file) return; const reader = new FileReader(); reader.onload = () => loadText(reader.result, file.name); reader.readAsText(file, 'utf-8'); };
  const exportCsv = () => { const blob = new Blob(['\ufeff' + Papa.unparse(cleaned)], { type: 'text/csv;charset=utf-8' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${dataset.name.replace(/\.csv$/i,'')}_cleaned.csv`; a.click(); URL.revokeObjectURL(a.href); };
  const moveRule = targetId => { if (!draggedRuleId || draggedRuleId === targetId) return; const from = rules.findIndex(r => r.id === draggedRuleId); const to = rules.findIndex(r => r.id === targetId); const next = [...rules]; const [moved] = next.splice(from, 1); next.splice(to, 0, moved); setRules(next); };

  return <div className="app">
    <aside className="sidebar">
      <div className="brand"><div className="brandmark"><WandSparkles size={19}/></div><div><strong>DataFlow</strong><span>数据整理工作台</span></div></div>
      <nav>
        <button className={active==='workspace'?'active':''} onClick={()=>activateType('workspace')}><Database/>数据整理</button>
        <button className={active==='editor'?'active':''} onClick={()=>activateType('editor')}><Pencil/>数据编辑</button>
        <button className={active==='quality'?'active':''} onClick={()=>activateType('quality')}><Activity/>质量报告</button>
        <button className={active==='analysis'?'active':''} onClick={()=>activateType('analysis')}><BarChart3/>数据分析</button>
      </nav>
      <div className="side-note"><span>本地处理</span><p>文件仅在当前浏览器中解析，不会上传。</p></div>
    </aside>
    <main>
      <header><div><h1>{active==='workspace'?'数据整理工作区':active==='editor'?'数据编辑工作区':active==='analysis'?'数据分析工作区':'数据质量报告'}</h1><p>{dataset ? dataset.name : active==='editor'?'直接修改表格内容，完成后导出数据':active==='analysis'?'创建聚合表并查看关键指标':'选择一个数据源开始工作'}</p></div>{dataset && <div className="header-actions"><button className="icon-btn" title="编辑原始数据" onClick={()=>openEditor()}><Pencil/></button><button className="icon-btn" title="重置当前工作区" onClick={()=>{setDataset(null);setRules([]);setAppliedRules([])}}><RotateCcw/></button><button className="primary" onClick={exportCsv}><Download/>导出结果</button></div>}</header>
      <div className="task-tabs"><div className="task-tab-scroll">{tabs.filter(tab=>tab.type===active).map(tab=><button key={tab.id} className={`task-tab ${tab.id===activeId?'active':''}`} onClick={()=>{setActiveId(tab.id);setAddingRule(false)}}><span>{active==='workspace'?<Database/>:active==='editor'?<Pencil/>:active==='quality'?<Activity/>:<BarChart3/>}</span><em>{tab.title}</em><i role="button" title="关闭标签" onClick={e=>{e.stopPropagation();closeTab(tab.id)}}><X/></i></button>)}</div></div>
      {!dataset ? <SourceHub active={active} sources={sources} inputRef={inputRef} onFile={onFile} onSample={()=>loadText(SAMPLE,'客户数据示例.csv')} onOpen={(type,source)=>openTab(type,source)}/> : active==='editor' ? <Editor dataset={dataset} focusColumn={activeTab.focusColumn} onChange={next=>updateTab({dataset:next,undoStack:[...(activeTab.undoStack||[]),structuredClone(dataset)],redoStack:[]})} onUndo={()=>{const stack=activeTab.undoStack||[];if(!stack.length)return;const previous=stack[stack.length-1];updateTab({dataset:previous,undoStack:stack.slice(0,-1),redoStack:[...(activeTab.redoStack||[]),structuredClone(dataset)]})}} onRedo={()=>{const stack=activeTab.redoStack||[];if(!stack.length)return;const next=stack[stack.length-1];updateTab({dataset:next,redoStack:stack.slice(0,-1),undoStack:[...(activeTab.undoStack||[]),structuredClone(dataset)]})}} canUndo={Boolean(activeTab.undoStack?.length)} canRedo={Boolean(activeTab.redoStack?.length)} onSave={()=>updateSource(activeTab.sourceId,dataset)} saved={activeTab.sourceId ? JSON.stringify(sources.find(source=>source.id===activeTab.sourceId)?.rows || []) === JSON.stringify(dataset.rows) : true}/> : active==='quality' ? <Quality profiles={profiles} rows={dataset.rows.length} score={score} onEdit={openEditor} onOptimize={optimizeQuality}/> : active==='analysis' ? <Analysis dataset={dataset} tab={activeTab} onChange={updateTab}/> : <section className="workspace">
        <div className="stats">
          <Stat icon={<Rows3/>} label="原始记录" value={dataset.rows.length}/><Stat icon={<Columns3/>} label="字段数量" value={dataset.columns.length}/><Stat icon={<Check/>} label="清洗后记录" value={cleaned.length}/><Stat icon={<Activity/>} label="质量评分" value={`${score}%`} tone={score<80?'warn':'good'} onClick={openExistingQuality}/>
        </div>
        <div className="work-grid">
          <div className="rules-panel"><div className="panel-title"><div><h3>清洗规则</h3><p>按顺序执行，可自由增减</p></div><span className="rule-count">{rules.length}</span></div>
            <div className="rule-list">{rules.map(rule=><RuleCard key={rule.id} rule={rule} columns={dataset.columns} dragging={draggedRuleId===rule.id} dropTarget={dropRuleId===rule.id&&draggedRuleId!==rule.id} onDragStart={e=>{setDraggedRuleId(rule.id);e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',rule.id)}} onDragOver={e=>{e.preventDefault();e.dataTransfer.dropEffect='move';setDropRuleId(rule.id)}} onDrop={e=>{e.preventDefault();moveRule(rule.id);setDraggedRuleId(null);setDropRuleId(null)}} onDragEnd={()=>{setDraggedRuleId(null);setDropRuleId(null)}} onUpdate={patch=>setRules(rules.map(r=>r.id===rule.id?{...r,...patch}:r))} onDelete={()=>setRules(rules.filter(r=>r.id!==rule.id))}/>)}</div>
            {addingRule ? <AddRule columns={dataset.columns} onCancel={()=>setAddingRule(false)} onAdd={rule=>{setRules([...rules,rule]);setAddingRule(false)}}/> : <button className="add-rule" onClick={()=>setAddingRule(true)}><Plus/>新增清洗规则</button>}
            <button className={`run-clean ${rulesDirty?'pending':''}`} disabled={!rulesDirty} onClick={()=>setAppliedRules(structuredClone(rules))}><WandSparkles/>{rulesDirty?'执行清洗':'已执行'}</button>
            {rulesDirty&&<div className="pending-note">规则已修改，结果尚未更新</div>}
            <div className="impact"><span>当前执行结果</span><strong>{dataset.rows.length-cleaned.length} 行已被移除</strong></div>
          </div>
          <div className="table-panel"><div className="table-toolbar"><div><h3>结果预览</h3><p>显示 {filtered.length} / {cleaned.length} 行</p></div><div className="search"><Search/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜索数据"/>{query&&<button onClick={()=>setQuery('')}><X/></button>}</div></div>
            <div className="table-wrap"><table><thead><tr><th>#</th>{dataset.columns.map(c=><th key={c}>{c}</th>)}</tr></thead><tbody>{filtered.slice(0,100).map((row,i)=><tr key={i}><td>{i+1}</td>{dataset.columns.map(c=><td key={c} className={!String(row[c]??'').trim()?'empty':''}>{String(row[c]??'').trim()||'空值'}</td>)}</tr>)}</tbody></table></div>
            {cleaned.length>100&&<div className="table-foot">预览前 100 行，导出包含全部 {cleaned.length} 行</div>}
          </div>
        </div>
      </section>}
    </main>
  </div>;
}

function SourceHub({active,sources,inputRef,onFile,onSample,onOpen}){return <section className="source-hub"><div className="source-hero"><div className="upload-icon"><FileSpreadsheet/></div><div><h2>选择一个数据源开始工作</h2><p>CSV 只需导入一次，之后可在三个工作区之间自由切换。</p></div><div className="source-actions"><button className="primary" onClick={()=>inputRef.current.click()}><Upload/>导入 CSV</button><button className="secondary" onClick={onSample}>加载示例</button></div><input ref={inputRef} type="file" accept=".csv,text/csv" hidden onChange={e=>onFile(e.target.files[0])}/></div>{sources.length>0&&<div className="source-list">{sources.map(source=><article className="source-card" key={source.id}><div className="source-card-main"><FileSpreadsheet/><div><strong>{source.name}</strong><span>{source.rows.length} 行 · {source.columns.length} 个字段</span></div></div><div className="source-card-actions"><button onClick={()=>onOpen('workspace',source)}><Database/>数据整理</button><button onClick={()=>onOpen('editor',source)}><Pencil/>数据编辑</button><button onClick={()=>onOpen('quality',source)}><Activity/>质量报告</button><button onClick={()=>onOpen('analysis',source)}><BarChart3/>数据分析</button></div></article>)}</div>}<div className="capabilities"><span><Check/>一次导入，重复使用</span><span><Check/>原始数据留在浏览器</span><span><Check/>四个工作区独立操作</span></div></section>}

function Analysis({dataset,tab,onChange}){
  const [boardType,setBoardType]=useState(null);
  const numericColumns = dataset.columns.filter(column => dataset.rows.some(row => Number.isFinite(Number(String(row[column] ?? '').replace(/,/g,''))) && String(row[column] ?? '').trim() !== ''));
  const groupBy = tab.groupBy || dataset.columns[0] || '';
  const measure = tab.measure || numericColumns[0] || dataset.columns[0] || '';
  const aggregation = tab.aggregation || 'sum';
  const grouped = useMemo(() => {
    const buckets = new Map();
    dataset.rows.forEach(row => { const key = String(row[groupBy] ?? '').trim() || '空值'; const bucket = buckets.get(key) || { key, rows: [], values: [] }; bucket.rows.push(row); const number = Number(String(row[measure] ?? '').replace(/,/g,'')); if (Number.isFinite(number)) bucket.values.push(number); buckets.set(key, bucket); });
    return [...buckets.values()].map(bucket => { const values = bucket.values; const value = aggregation === 'count' ? bucket.rows.length : aggregation === 'avg' ? (values.length ? values.reduce((sum, item) => sum + item, 0) / values.length : 0) : values.reduce((sum, item) => sum + item, 0); return { key: bucket.key, rows: bucket.rows.length, value }; }).sort((a,b) => b.value - a.value);
  }, [dataset,groupBy,measure,aggregation]);
  const total = aggregation === 'count' ? dataset.rows.length : grouped.reduce((sum,row) => sum + row.value, 0);
  const boardOptions=[['bar','柱状排行','比较各分组的数值高低'],['donut','占比环图','查看各分组在总量中的占比'],['table','明细排行','以排序表快速定位重点分组']];
  const boardContent=boardType==='table'?<table><thead><tr><th>{groupBy}</th><th>记录数</th><th>结果</th></tr></thead><tbody>{grouped.map(row=><tr key={row.key}><td><strong>{row.key}</strong></td><td>{row.rows}</td><td>{aggregation==='avg'?row.value.toFixed(2):row.value.toLocaleString()}</td></tr>)}</tbody></table>:boardType==='donut'?<div className="donut-board"><div className="donut-ring" style={{background:`conic-gradient(#759b4b 0 42%,#a5bf6f 42% 68%,#c8db9d 68% 84%,#e7efd7 84% 100%)`}}><div><strong>{grouped.length}</strong><span>分组</span></div></div><div className="donut-legend">{grouped.slice(0,5).map((row,index)=><span key={row.key}><i className={`legend-dot dot-${index}`}/>{row.key}</span>)}</div></div>:<div className="analysis-bars">{grouped.slice(0,8).map(row=><div className="analysis-bar" key={row.key}><div><span>{row.key}</span><strong>{aggregation==='avg'?row.value.toFixed(2):row.value.toLocaleString()}</strong></div><i><b style={{width:`${grouped[0]?.value ? Math.max(4, row.value / grouped[0].value * 100) : 0}%`}}/></i></div>)}</div>;
  return <section className="analysis-page"><div className="analysis-hero"><div><span className="eyebrow">数据分析</span><h2>从明细数据生成聚合视图</h2><p>选择分组字段和指标，快速得到类似 Excel 数据透视表的结果。</p></div><div className="analysis-controls"><label><span>分组字段</span><select value={groupBy} onChange={e=>onChange({groupBy:e.target.value})}>{dataset.columns.map(column=><option key={column}>{column}</option>)}</select></label><label><span>指标字段</span><select value={measure} onChange={e=>onChange({measure:e.target.value})}>{(numericColumns.length?numericColumns:dataset.columns).map(column=><option key={column}>{column}</option>)}</select></label><label><span>聚合方式</span><select value={aggregation} onChange={e=>onChange({aggregation:e.target.value})}><option value="sum">求和</option><option value="avg">平均值</option><option value="count">计数</option></select></label></div></div><div className="analysis-stats"><div><span>分组数</span><strong>{grouped.length}</strong></div><div><span>参与记录</span><strong>{dataset.rows.length}</strong></div><div><span>汇总结果</span><strong>{aggregation==='avg'?total.toFixed(2):total.toLocaleString()}</strong></div></div><div className="analysis-grid"><div className="analysis-card"><div className="panel-title"><div><h3>聚合表</h3><p>按 {groupBy} 汇总 {measure}</p></div><Table2/></div><table><thead><tr><th>{groupBy}</th><th>记录数</th><th>{aggregation==='sum'?'合计':aggregation==='avg'?'平均值':'计数'}</th></tr></thead><tbody>{grouped.map(row=><tr key={row.key}><td><strong>{row.key}</strong></td><td>{row.rows}</td><td>{aggregation==='avg'?row.value.toFixed(2):row.value.toLocaleString()}</td></tr>)}</tbody></table></div><div className="analysis-card"><div className="panel-title"><div><h3>分析看板</h3><p>{boardType?'当前看板已生成':'选择一种看板类型后开始生成'}</p></div><BarChart3/></div>{!boardType?<div className="board-picker">{boardOptions.map(([type,title,detail])=><button key={type} onClick={()=>setBoardType(type)}><span className={`board-icon board-${type}`}><BarChart3/></span><span><strong>{title}</strong><em>{detail}</em></span><ChevronDown/></button>)}</div>:<div className="board-result"><button className="board-back" onClick={()=>setBoardType(null)}><RotateCcw/>更换看板类型</button>{boardContent}</div>}</div></div></section>;
}
function Editor({dataset,onChange,focusColumn,onSave,saved,onUndo,onRedo,canUndo,canRedo}){const [mode,setMode]=useState('single');const [filters,setFilters]=useState({});const [filterOpen,setFilterOpen]=useState(null);const [selected,setSelected]=useState([]);const [batchColumn,setBatchColumn]=useState(dataset.columns[0]||'');const [batchValue,setBatchValue]=useState('');const filterRows=dataset.rows.map((row,index)=>({row,index})).filter(({row})=>dataset.columns.every(column=>!filters[column]?.length||filters[column].includes(String(row[column]??''))));const updateCell=(rowIndex,column,value)=>{const rows=dataset.rows.map((row,index)=>index===rowIndex?{...row,[column]:value}:row);onChange({...dataset,rows});};const toggleFilter=(column,value)=>setFilters(current=>{const values=current[column]||[];const next=values.includes(value)?values.filter(item=>item!==value):[...values,value];return {...current,[column]:next};});const batchUpdate=()=>{if(!selected.length||!batchColumn)return;const rows=dataset.rows.map((row,index)=>selected.includes(index)?{...row,[batchColumn]:batchValue}:row);onChange({...dataset,rows});setSelected([]);};return <section className="editor-page"><div className="editor-summary"><div><Table2/><strong>{dataset.rows.length} 行</strong><span>{dataset.columns.length} 个字段</span></div><div className="editor-summary-actions"><p>{focusColumn?`建议处理字段：${focusColumn}`:'编辑内容不会自动保存，点击保存后同步到三个工作区。'}</p><div className="editor-mode"><button className={mode==='single'?'active':''} onClick={()=>setMode('single')}><Pencil/>单元格</button><button className={mode==='batch'?'active':''} onClick={()=>setMode('batch')}><ListChecks/>批量修改</button></div><div className="history-actions"><button className="history-btn" title="撤销" aria-label="撤销" disabled={!canUndo} onClick={onUndo}><Undo2/></button><button className="history-btn" title="重做" aria-label="重做" disabled={!canRedo} onClick={onRedo}><Redo2/></button></div><button className={`save-editor ${saved?'saved':''}`} disabled={saved} onClick={onSave}><Check/>{saved?'已保存':'保存并同步'}</button></div></div>{mode==='batch'&&<div className="batch-toolbar"><strong>批量修改</strong><span>已选择 {selected.length} 行</span><select value={batchColumn} onChange={e=>setBatchColumn(e.target.value)}>{dataset.columns.map(column=><option key={column}>{column}</option>)}</select><input value={batchValue} onChange={e=>setBatchValue(e.target.value)} placeholder="统一修改为"/><button onClick={batchUpdate} disabled={!selected.length}>应用修改</button></div>}<div className="editor-table-wrap"><table className="editor-table"><thead><tr>{mode==='batch'&&<th className="select-col"><input type="checkbox" checked={selected.length===filterRows.length&&filterRows.length>0} onChange={e=>setSelected(e.target.checked?filterRows.map(item=>item.index):[])}/></th>}<th>#</th>{dataset.columns.map(column=><th className={focusColumn===column?'focus-column':''} key={column}><span className="editor-th-label">{column}<button className={filters[column]?.length?'filter-active':''} title={`筛选 ${column}`} onClick={()=>setFilterOpen(filterOpen===column?null:column)}><Filter/></button></span>{filterOpen===column&&<div className="filter-menu"><strong>筛选值</strong>{[...new Set(dataset.rows.map(row=>String(row[column]??'')))].slice(0,100).map(value=><label key={value}><input type="checkbox" checked={filters[column]?.includes(value)||false} onChange={()=>toggleFilter(column,value)}/><span>{value||'空值'}</span></label>)}</div>}</th>)}</tr></thead><tbody>{filterRows.map(({row,index})=><tr key={index}>{mode==='batch'&&<td className="select-col"><input type="checkbox" checked={selected.includes(index)} onChange={e=>setSelected(current=>e.target.checked?[...current,index]:current.filter(rowIndex=>rowIndex!==index))}/></td>}<td>{index+1}</td>{dataset.columns.map(column=><td className={focusColumn===column?'focus-column':''} key={column}><input aria-label={`${index+1}行${column}`} value={String(row[column]??'')} onChange={e=>updateCell(index,column,e.target.value)}/></td>)}</tr>)}</tbody></table></div></section>}
function Stat({icon,label,value,tone='',onClick}){return <div className={`stat ${tone} ${onClick?'clickable':''}`} onClick={onClick} role={onClick?'button':undefined} tabIndex={onClick?0:undefined} onKeyDown={e=>{if(onClick&&(e.key==='Enter'||e.key===' '))onClick()}}><div className="stat-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong></div></div>}
function Select({label,value,options,onChange}){return <label className="select"><span>{label}</span><div><select value={value} onChange={e=>onChange(e.target.value)}>{options.map(([v,t])=><option value={v} key={v}>{t}</option>)}</select><ChevronDown/></div></label>}
function RuleCard({rule,columns,dragging,dropTarget,onDragStart,onDragOver,onDrop,onDragEnd,onUpdate,onDelete}){const hasFields=['lowercase','uppercase','removeEmpty','replace','dedupe'].includes(rule.type);const summary=rule.fields?.length?rule.fields.length===1?rule.fields[0]:`${rule.fields.length} 个字段`:rule.type==='dedupe'?'整行':'全部字段';return <div className={`rule-card ${rule.enabled?'':'disabled'} ${dragging?'dragging':''} ${dropTarget?'drop-target':''}`} onDragOver={onDragOver} onDrop={onDrop}><div className="rule-card-head"><button className="drag-handle" title="拖拽调整优先级" draggable onDragStart={onDragStart} onDragEnd={onDragEnd}><GripVertical/></button><label className="mini-toggle"><input type="checkbox" checked={rule.enabled} onChange={e=>onUpdate({enabled:e.target.checked})}/><i/></label><div className="rule-name"><strong>{RULE_NAMES[rule.type]}</strong><span>{summary}</span></div><div className="rule-tools"><button title="删除" onClick={onDelete}><Trash2/></button></div></div>{rule.enabled&&<div className="rule-config">{hasFields&&<MultiField columns={columns} values={rule.fields||[]} emptyLabel={rule.type==='dedupe'?'整行':'全部字段'} onChange={fields=>onUpdate({fields})}/>} {rule.type==='replace'&&<div className="replace-fields"><input placeholder="查找内容" value={rule.find} onChange={e=>onUpdate({find:e.target.value})}/><input placeholder="替换为" value={rule.replace} onChange={e=>onUpdate({replace:e.target.value})}/></div>}</div>}</div>}
function AddRule({columns,onCancel,onAdd}){const [type,setType]=useState('trim');const [fields,setFields]=useState([]);const [find,setFind]=useState('');const [replace,setReplace]=useState('');const hasFields=['lowercase','uppercase','removeEmpty','replace','dedupe'].includes(type);return <div className="add-rule-panel"><strong>新增规则</strong><Select label="规则类型" value={type} options={Object.entries(RULE_NAMES).map(([v,t])=>[v,t])} onChange={v=>{setType(v);setFields([])}}/>{hasFields&&<MultiField columns={columns} values={fields} emptyLabel={type==='dedupe'?'整行':'全部字段'} onChange={setFields}/>} {type==='replace'&&<div className="replace-fields"><input placeholder="查找内容" value={find} onChange={e=>setFind(e.target.value)}/><input placeholder="替换为" value={replace} onChange={e=>setReplace(e.target.value)}/></div>}<div className="add-actions"><button onClick={onCancel}>取消</button><button className="confirm" onClick={()=>onAdd({...makeRule(type,fields),find,replace})}>添加</button></div></div>}
function MultiField({columns,values,emptyLabel,onChange}){const [open,setOpen]=useState(false);const label=values.length===0?emptyLabel:values.join('、');const toggle=field=>onChange(values.includes(field)?values.filter(v=>v!==field):[...values,field]);return <div className={`multi-field ${open?'open':''}`}><button type="button" className="multi-trigger" onClick={()=>setOpen(!open)}><span>{label}</span><ChevronDown/></button>{open&&<div className="multi-menu"><div className="multi-menu-head"><strong>选择字段</strong><button type="button" title="关闭" onClick={()=>setOpen(false)}><X/></button></div><button type="button" className={!values.length?'selected':''} onClick={()=>onChange([])}><i>{!values.length&&<Check/>}</i>{emptyLabel}</button>{columns.map(column=><button type="button" className={values.includes(column)?'selected':''} key={column} onClick={()=>toggle(column)}><i>{values.includes(column)&&<Check/>}</i>{column}</button>)}</div>}</div>}
function LegacyQuality({profiles,rows,score,onEdit}){const suggestions=[];profiles.filter(p=>p.empty>0).sort((a,b)=>b.empty-a.empty).forEach(p=>suggestions.push({level:'高',column:p.column,title:`补齐 ${p.column} 的 ${p.empty} 个空值`,detail:`完整度为 ${p.completeness}%。建议回查数据源补录；无法补录时设置统一缺失标记，并确认该字段是否应设为必填。`}));profiles.filter(p=>p.duplicate>0).sort((a,b)=>b.duplicate-a.duplicate).forEach(p=>suggestions.push({level:'中',column:p.column,title:`核查 ${p.column} 的 ${p.duplicate} 个重复值`,detail:'先确认该字段是否应唯一；若是业务主键，请按更新时间保留最新记录，并记录被合并的数据。'}));if(!suggestions.length)suggestions.push({level:'低',column:'',title:'保持当前数据质量',detail:'本次未发现空值或明显重复。建议导入新数据后继续执行相同检查，并定期抽样核对格式和业务口径。'});return <section className="quality"><div className="score-card"><div className="score-ring" style={{'--score':`${score*3.6}deg`}}><div><strong>{score}</strong><span>质量分</span></div></div><div><h2>{score>=90?'数据状态优秀':score>=75?'数据基本可用':'建议优先清洗'}</h2><p>基于完整性、唯一性和重复情况综合计算，共检查 {rows} 条记录。</p></div></div><div className="quality-advice"><div className="panel-title"><div><h3>质量优化建议</h3><p>按影响程度给出可直接执行的处理方式</p></div><Lightbulb/></div><div className="advice-list">{suggestions.slice(0,6).map((item,index)=><div className="advice-item" key={`${item.title}-${index}`}><span className={`priority ${item.level==='高'?'high':item.level==='中'?'medium':'low'}`}>{item.level}优先级</span><div><strong>{item.title}</strong><p>{item.detail}</p>{onEdit&&item.column&&<button className="advice-edit" onClick={()=>onEdit(item.column)}><Pencil/>去编辑 {item.column}</button>}</div></div>)}</div></div><div className="quality-table"><div className="panel-title"><div><h3>字段画像</h3><p>快速定位需要处理的字段</p></div></div><table><thead><tr><th>字段</th><th>完整度</th><th>空值</th><th>唯一值</th><th>重复值</th><th>状态</th></tr></thead><tbody>{profiles.map(p=><tr key={p.column}><td><strong>{p.column}</strong></td><td><div className="bar"><i style={{width:`${p.completeness}%`}}/><span>{p.completeness}%</span></div></td><td>{p.empty}</td><td>{p.unique}</td><td>{p.duplicate}</td><td>{p.completeness===100?<span className="tag good">完整</span>:<span className="tag warn"><AlertTriangle/>需关注</span>}</td></tr>)}</tbody></table></div></section>}

function Quality({profiles,rows,score,onEdit,onOptimize}){
  const suggestions=[];
  profiles.filter(p=>p.empty>0).sort((a,b)=>b.empty-a.empty).forEach(p=>suggestions.push({id:`empty:${p.column}`,kind:'empty',level:'高',column:p.column,title:`补齐 ${p.column} 的 ${p.empty} 个空值`,detail:'将空单元格标记为“待补充”，后续可在数据编辑中替换为真实业务值。'}));
  profiles.filter(p=>p.duplicate>0).sort((a,b)=>b.duplicate-a.duplicate).forEach(p=>suggestions.push({id:`duplicate:${p.column}`,kind:'duplicate',level:'中',column:p.column,title:`核查 ${p.column} 的 ${p.duplicate} 个重复值`,detail:'保留每个值的首条记录，删除后续重复行，并重新计算质量评分。'}));
  const [selected,setSelected]=useState([]);
  const actionable=suggestions.slice(0,8);
  const allSelected=actionable.length>0&&selected.length===actionable.length;
  const toggle=id=>setSelected(current=>current.includes(id)?current.filter(item=>item!==id):[...current,id]);
  const run=()=>{const actions=actionable.filter(item=>selected.includes(item.id));if(actions.length){onOptimize(actions);setSelected([]);}};
  return <section className="quality"><div className="score-card"><div className="score-ring" style={{'--score':`${score*3.6}deg`}}><div><strong>{score}</strong><span>质量分</span></div></div><div><h2>{score>=90?'数据状态优秀':score>=75?'数据基本可用':'建议优先清洗'}</h2><p>基于完整性、唯一性和重复情况综合计算，共检查 {rows} 条记录。</p></div></div><div className="quality-advice"><div className="panel-title"><div><h3>质量优化建议</h3><p>选择建议项后，一键处理并同步刷新所有工作区</p></div><Lightbulb/></div>{actionable.length>0&&<div className="advice-actions"><label><input type="checkbox" checked={allSelected} onChange={e=>setSelected(e.target.checked?actionable.map(item=>item.id):[])}/>全选建议</label><span>已选择 {selected.length} 项</span><button className="optimize-btn" disabled={!selected.length} onClick={run}><WandSparkles/>一键优化</button></div>}<div className="advice-list">{actionable.length?actionable.map(item=><div className={`advice-item ${selected.includes(item.id)?'selected':''}`} key={item.id}><label className="advice-check"><input type="checkbox" checked={selected.includes(item.id)} onChange={()=>toggle(item.id)}/><i/></label><span className={`priority ${item.level==='高'?'high':'medium'}`}>{item.level}优先级</span><div><strong>{item.title}</strong><p>{item.detail}</p>{onEdit&&item.column&&<button className="advice-edit" onClick={()=>onEdit(item.column)}><Pencil/>去编辑 {item.column}</button>}</div></div>):<div className="advice-empty"><Check/>当前没有待处理建议，质量状态良好。</div>}</div></div><div className="quality-table"><div className="panel-title"><div><h3>字段画像</h3><p>快速定位需要处理的字段</p></div></div><table><thead><tr><th>字段</th><th>完整度</th><th>空值</th><th>唯一值</th><th>重复值</th><th>状态</th></tr></thead><tbody>{profiles.map(p=><tr key={p.column}><td><strong>{p.column}</strong></td><td><div className="bar"><i style={{width:`${p.completeness}%`}}/><span>{p.completeness}%</span></div></td><td>{p.empty}</td><td>{p.unique}</td><td>{p.duplicate}</td><td>{p.completeness===100?<span className="tag good">完整</span>:<span className="tag warn"><AlertTriangle/>需关注</span>}</td></tr>)}</tbody></table></div></section>;
}

createRoot(document.getElementById('root')).render(<App/>);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js'));
}
