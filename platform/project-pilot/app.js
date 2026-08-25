(function () {
  "use strict";

  const STORAGE_KEY = "project-pilot.projects.v1";
  const SAVED_AT_KEY = "project-pilot.saved-at.v1";
  const DAY_MS = 86400000;
  const STATUS_ORDER = ["已延期", "有风险", "进行中", "未开始", "已完成"];
  const CATEGORY_COLORS = ["var(--teal)", "var(--blue)", "var(--purple)", "var(--amber)", "var(--green)", "var(--red)"];
  const CATEGORY_HEX = ["#167d75", "#2f6fed", "#7457b6", "#b7791f", "#3b7f52", "#b94a48"];
  const PAGE_META = {
    summary: { title: "项目总结", eyebrow: "PROJECT OVERVIEW" },
    timeline: { title: "项目进度", eyebrow: "PORTFOLIO TIMELINE" },
    projects: { title: "项目明细", eyebrow: "PROJECT DIRECTORY" },
    report: { title: "周会汇报", eyebrow: "WEEKLY REPORTING" },
    admin: { title: "后台管理", eyebrow: "CONTENT ADMINISTRATION" }
  };
  const ZOOM_CONFIG = {
    month: { dayWidth: 4, className: "zoom-month" },
    week: { dayWidth: 12, className: "zoom-week" },
    day: { dayWidth: 30, className: "zoom-day" }
  };

  const state = {
    projects: [],
    reports: [],
    settings: null,
    categories: [],
    systems: [],
    storageAvailable: false,
    persistenceMode: "browser",
    dataFileLabel: "",
    page: "summary",
    zoom: "week",
    editingId: null,
    detailId: null,
    milestoneDraft: [],
    ganttInitialized: false,
    projectView: "plans",
    projectSort: "start",
    networkFocusId: null,
    reportDraft: null,
    reportSelectedKeys: null,
    saveQueue: Promise.resolve()
  };

  const el = {};

  document.addEventListener("DOMContentLoaded", () => {
    init().catch((error) => {
      console.error("Application startup failed", error);
    });
  });

  async function init() {
    cacheElements();
    const loaded = await loadProjects();
    state.projects = loaded.projects;
    state.reports = normalizeReports(loaded.reports);
    state.settings = normalizeSettings(loaded.settings);
    state.categories = normalizeCategories(loaded.categories);
    state.systems = normalizeSystems(loaded.systems);
    reconcileCatalogs();
    state.persistenceMode = loaded.mode;
    state.storageAvailable = loaded.available;
    state.dataFileLabel = loaded.dataFileLabel || "";
    bindEvents();
    applyDisplaySettings();
    updateTodayLabel();
    if (loaded.needsInitialSave) await saveProjects();
    else updateStorageState(loaded.savedAt);
    renderAll();
  }

  function cacheElements() {
    [
      "pageTitle", "pageEyebrow", "todayLabel", "quickAddButton", "healthScore",
      "healthSummary", "portfolioProgress", "portfolioProgressBar", "portfolioMeta",
      "metricGrid", "categoryProgress", "riskList", "riskCountLabel", "insightGrid",
      "analysisTime", "ganttSearch", "ganttCategory", "ganttStatus", "ganttFrame",
      "ganttCanvas", "ganttEmpty", "todayButton", "projectSearch", "projectStatusFilter",
      "projectSort", "projectSortField", "projectTableBody", "projectEmpty", "projectCountText", "addProjectButton",
      "projectDialog", "projectForm", "dialogKicker", "dialogTitle", "progressOutput",
      "smartCheck", "milestoneEditor", "addMilestoneButton", "deleteProjectButton",
      "projectCategorySelect", "systemOptions", "dependencyOptions", "importButton", "importInput", "exportButton", "detailDialog",
      "detailCode", "detailName", "detailDialogBody", "editFromDetailButton", "toastRegion",
      "sidebar", "menuButton", "mobileScrim", "lastSaved", "storageState", "storageStatusText",
      "brandName", "brandSubtitle", "quickAddText", "planView", "categoryView", "networkView", "networkCanvas",
      "networkFocusBar", "networkFocusText", "networkFocusSummary", "networkClearFocus", "networkOpenDetail",
      "reportDate", "reportProjectPicker", "reportSelectAll", "reportClearAll", "reportSelectionSummary", "generateReportButton",
      "reportDraftSection", "refreshReportButton", "reportBrandName", "reportSheetDate", "reportTableBody", "saveReportImageButton",
      "reportArchiveCount", "reportArchiveList",
      "settingsForm", "categoryManagerList", "newCategoryName", "newCategoryColor", "addCategoryButton", "saveCategoriesButton",
      "systemManagerList", "newSystemName", "addSystemButton", "saveSystemsButton"
    ].forEach((id) => {
      el[id] = document.getElementById(id);
    });
  }

  function bindEvents() {
    document.querySelectorAll("[data-page]").forEach((button) => {
      button.addEventListener("click", () => navigate(button.dataset.page));
    });
    document.querySelectorAll("[data-go-page]").forEach((button) => {
      button.addEventListener("click", () => navigate(button.dataset.goPage));
    });

    el.quickAddButton.addEventListener("click", () => openProjectDialog());
    el.addProjectButton.addEventListener("click", () => openProjectDialog());
    el.ganttSearch.addEventListener("input", () => renderGantt());
    el.ganttCategory.addEventListener("change", () => renderGantt());
    el.ganttStatus.addEventListener("change", () => renderGantt());
    el.projectSearch.addEventListener("input", renderProjectViews);
    el.projectStatusFilter.addEventListener("change", renderProjectViews);
    el.projectSort.addEventListener("change", () => {
      state.projectSort = el.projectSort.value === "end" ? "end" : "start";
      renderProjectTable();
    });
    el.todayButton.addEventListener("click", scrollGanttToToday);

    document.querySelectorAll("[data-project-view]").forEach((button) => {
      button.addEventListener("click", () => switchProjectView(button.dataset.projectView));
    });

    document.querySelectorAll("[data-zoom]").forEach((button) => {
      button.addEventListener("click", () => {
        state.zoom = button.dataset.zoom;
        document.querySelectorAll("[data-zoom]").forEach((item) => item.classList.toggle("is-selected", item === button));
        renderGantt(true);
      });
    });

    document.querySelectorAll("[data-close-dialog]").forEach((button) => {
      button.addEventListener("click", closeProjectDialog);
    });
    document.querySelectorAll("[data-close-detail]").forEach((button) => {
      button.addEventListener("click", () => el.detailDialog.close());
    });

    el.projectForm.addEventListener("submit", saveProjectFromForm);
    el.projectForm.elements.namedItem("progress").addEventListener("input", updateFormIntelligence);
    ["start", "end", "status"].forEach((name) => {
      el.projectForm.elements.namedItem(name).addEventListener("change", updateFormIntelligence);
    });
    el.addMilestoneButton.addEventListener("click", addMilestoneDraft);
    el.deleteProjectButton.addEventListener("click", deleteEditingProject);
    el.editFromDetailButton.addEventListener("click", () => {
      const id = state.detailId;
      el.detailDialog.close();
      openProjectDialog(id);
    });

    el.exportButton.addEventListener("click", exportProjects);
    el.importButton.addEventListener("click", () => el.importInput.click());
    el.importInput.addEventListener("change", importProjects);

    el.settingsForm.addEventListener("submit", saveDisplaySettings);
    el.addCategoryButton.addEventListener("click", addCategory);
    el.saveCategoriesButton.addEventListener("click", saveCategoryChanges);
    el.categoryManagerList.addEventListener("click", handleCategoryManagerClick);
    el.addSystemButton.addEventListener("click", addSystem);
    el.saveSystemsButton.addEventListener("click", saveSystemChanges);
    el.systemManagerList.addEventListener("click", handleSystemManagerClick);

    el.networkClearFocus.addEventListener("click", () => {
      state.networkFocusId = null;
      renderRelationshipNetwork();
    });
    el.networkOpenDetail.addEventListener("click", () => {
      if (state.networkFocusId) openProjectDetail(state.networkFocusId);
    });

    el.reportProjectPicker.addEventListener("change", updateReportSelectionSummary);
    el.reportSelectAll.addEventListener("click", () => setAllReportProjects(true));
    el.reportClearAll.addEventListener("click", () => setAllReportProjects(false));
    el.generateReportButton.addEventListener("click", generateReportDraft);
    el.refreshReportButton.addEventListener("click", generateReportDraft);
    el.reportTableBody.addEventListener("input", updateReportDraftFromEditor);
    el.saveReportImageButton.addEventListener("click", saveReportImage);
    el.reportArchiveList.addEventListener("click", handleReportArchiveClick);

    el.menuButton.addEventListener("click", openMobileNav);
    el.mobileScrim.addEventListener("click", closeMobileNav);
    window.addEventListener("resize", () => {
      if (window.innerWidth > 820) closeMobileNav();
      if (state.page === "projects" && state.projectView === "network") renderRelationshipNetwork();
    });

    el.projectDialog.addEventListener("click", (event) => {
      if (event.target === el.projectDialog) closeProjectDialog();
    });
    el.detailDialog.addEventListener("click", (event) => {
      if (event.target === el.detailDialog) el.detailDialog.close();
    });
  }

  function navigate(page) {
    if (!PAGE_META[page]) return;
    state.page = page;
    document.querySelectorAll("[data-page-panel]").forEach((panel) => {
      panel.classList.toggle("is-active", panel.dataset.pagePanel === page);
    });
    document.querySelectorAll("[data-page]").forEach((button) => {
      const active = button.dataset.page === page;
      button.classList.toggle("is-active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    const meta = getPageMeta(page);
    el.pageTitle.textContent = meta.title;
    el.pageEyebrow.textContent = PAGE_META[page].eyebrow;
    el.quickAddButton.hidden = page === "admin" || page === "report";
    closeMobileNav();
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (page === "timeline") {
      requestAnimationFrame(() => {
        renderGantt(!state.ganttInitialized);
        state.ganttInitialized = true;
      });
    }
    if (page === "projects") renderActiveProjectView();
    if (page === "report") renderReportPage();
  }

  function openMobileNav() {
    el.sidebar.classList.add("is-open");
    el.mobileScrim.hidden = false;
  }

  function closeMobileNav() {
    el.sidebar.classList.remove("is-open");
    el.mobileScrim.hidden = true;
  }

  function renderAll() {
    populateCategoryControls();
    renderSummary();
    renderGantt();
    renderProjectTable();
    renderCategoryHierarchy();
    renderAdmin();
    renderReportPage();
    renderActiveProjectView();
  }

  function getDefaultSettings() {
    return {
      brandName: "前序",
      brandSubtitle: "项目管理工作台",
      pageNames: { summary: "项目总结", timeline: "项目进度", projects: "项目明细", report: "周会汇报", admin: "后台管理" }
    };
  }

  function normalizeSettings(input) {
    const defaults = getDefaultSettings();
    const pageNames = input && input.pageNames && typeof input.pageNames === "object" ? input.pageNames : {};
    return {
      brandName: String(input && input.brandName || defaults.brandName).slice(0, 24),
      brandSubtitle: String(input && input.brandSubtitle || defaults.brandSubtitle).slice(0, 40),
      pageNames: Object.fromEntries(Object.keys(defaults.pageNames).map((key) => [key, String(pageNames[key] || defaults.pageNames[key]).slice(0, 20)]))
    };
  }

  function normalizeCategories(input) {
    if (!Array.isArray(input)) return [];
    const seen = new Set();
    return input.map((item, index) => ({
      id: String(item && item.id || makeId()),
      name: String(item && item.name || "").trim().slice(0, 30),
      color: /^#[0-9a-f]{6}$/i.test(item && item.color) ? item.color : CATEGORY_HEX[index % CATEGORY_HEX.length]
    })).filter((item) => item.name && !seen.has(item.name.toLowerCase()) && seen.add(item.name.toLowerCase()));
  }

  function normalizeSystems(input) {
    if (!Array.isArray(input)) return [];
    const seen = new Set();
    return input.map((item) => ({ id: String(item && item.id || makeId()), name: String(item && item.name || "").trim().slice(0, 40) }))
      .filter((item) => item.name && !seen.has(item.name.toLowerCase()) && seen.add(item.name.toLowerCase()));
  }

  function normalizeReports(input) {
    if (!Array.isArray(input)) return [];
    return input.map((report) => ({
      id: String(report && report.id || makeId()),
      reportDate: isDateKey(report && report.reportDate) ? report.reportDate : formatDateKey(today()),
      savedAt: String(report && report.savedAt || new Date().toISOString()),
      imagePath: String(report && report.imagePath || ""),
      imageData: String(report && report.imageData || ""),
      rows: Array.isArray(report && report.rows) ? report.rows.map(normalizeReportRow) : []
    })).filter((report) => report.rows.length).sort((a, b) => new Date(b.savedAt) - new Date(a.savedAt));
  }

  function normalizeReportRow(row) {
    return {
      id: String(row && row.id || makeId()),
      planId: String(row && row.planId || ""),
      categoryKey: String(row && row.categoryKey || row && row.category || "未分类"),
      projectKey: String(row && row.projectKey || `${row && row.category || "未分类"}::${row && row.project || "未命名项目"}`),
      category: String(row && row.category || "未分类").slice(0, 60),
      categoryColor: /^#[0-9a-f]{6}$/i.test(row && row.categoryColor) ? row.categoryColor : "#0d766e",
      project: String(row && row.project || "未命名项目").slice(0, 100),
      plan: String(row && row.plan || "整体规划").slice(0, 160),
      targetDate: String(row && row.targetDate || "待确认").slice(0, 60),
      progressText: String(row && row.progressText || "待更新").slice(0, 500),
      blockerText: String(row && row.blockerText || "暂无卡点").slice(0, 500)
    };
  }

  function reconcileCatalogs() {
    state.projects.forEach((project, index) => {
      let category = state.categories.find((item) => item.id === project.categoryId);
      if (!category) category = state.categories.find((item) => item.name === project.category);
      if (!category) {
        category = { id: makeId(), name: project.category || "未分类", color: CATEGORY_HEX[state.categories.length % CATEGORY_HEX.length] };
        state.categories.push(category);
      }
      project.categoryId = category.id;
      project.category = category.name;
      project.systemIds = [...new Set((project.systemIds || []).filter((id) => state.systems.some((system) => system.id === id)))];
      project.dependsOn = [...new Set((project.dependsOn || []).filter((id) => id !== project.id && state.projects.some((item) => item.id === id)))];
      if (!project.planName) project.planName = "整体规划";
      if (!project.code) project.code = `PLAN-${index + 1}`;
    });
  }

  function getPageMeta(page) {
    return { ...PAGE_META[page], title: state.settings && state.settings.pageNames[page] || PAGE_META[page].title };
  }

  function applyDisplaySettings() {
    el.brandName.textContent = state.settings.brandName;
    el.brandSubtitle.textContent = state.settings.brandSubtitle;
    document.title = `${state.settings.brandName} - 智能项目管理`;
    document.querySelectorAll("[data-nav-label]").forEach((label) => {
      label.textContent = state.settings.pageNames[label.dataset.navLabel];
    });
    el.quickAddText.textContent = "新建规划";
    const meta = getPageMeta(state.page);
    el.pageTitle.textContent = meta.title;
    el.pageEyebrow.textContent = meta.eyebrow;
  }

  function switchProjectView(view) {
    if (!["plans", "categories", "network"].includes(view)) return;
    state.projectView = view;
    document.querySelectorAll("[data-project-view]").forEach((button) => {
      const selected = button.dataset.projectView === view;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-selected", String(selected));
    });
    renderActiveProjectView();
  }

  function renderActiveProjectView() {
    document.querySelectorAll("[data-project-view-panel]").forEach((panel) => {
      panel.hidden = panel.dataset.projectViewPanel !== state.projectView;
    });
    const tableFilters = document.querySelector(".projects-toolbar");
    if (tableFilters) tableFilters.classList.toggle("is-network-view", state.projectView === "network");
    if (el.projectSortField) el.projectSortField.hidden = state.projectView !== "plans";
    if (state.projectView === "categories") renderCategoryHierarchy();
    if (state.projectView === "network") requestAnimationFrame(renderRelationshipNetwork);
  }

  function renderCategoryHierarchy() {
    if (!el.categoryView) return;
    const search = el.projectSearch.value.trim().toLowerCase();
    const status = el.projectStatusFilter.value;
    const visible = state.projects.filter((plan) => {
      const systemNames = getSystemNames(plan).join(" ");
      const matchesSearch = !search || `${plan.category} ${plan.name} ${plan.planName} ${plan.code} ${plan.owner} ${systemNames}`.toLowerCase().includes(search);
      return matchesSearch && (status === "all" || getEffectiveStatus(plan) === status);
    });
    const grouped = groupBy(visible, (plan) => plan.category || "未分类");
    const categories = state.categories.filter((category) => grouped[category.name] && grouped[category.name].length);
    if (!categories.length) {
      el.categoryView.innerHTML = '<div class="table-empty hierarchy-empty"><strong>没有符合条件的分类内容</strong><span>调整搜索或状态筛选后再试</span></div>';
      return;
    }
    el.categoryView.innerHTML = categories.map((category, categoryIndex) => {
      const byProject = groupBy(grouped[category.name], (plan) => plan.name);
      return `
        <section class="category-band" style="--category-color:${category.color}">
          <div class="category-band-heading"><span class="category-swatch" style="background:${category.color}"></span><div><h2>${escapeHtml(category.name)}</h2><span>${Object.keys(byProject).length} 个项目 · ${grouped[category.name].length} 条规划</span></div></div>
          <div class="category-project-list">
            ${Object.entries(byProject).map(([projectName, plans], projectIndex) => {
              const systemNames = [...new Set(plans.flatMap(getSystemNames))];
              return `<article class="hierarchy-project">
                <div class="hierarchy-project-head"><div class="hierarchy-project-identity"><span class="hierarchy-level-label">第二层 · 项目 ${categoryIndex + 1}.${projectIndex + 1}</span><strong>${escapeHtml(projectName)}</strong><span>${plans.length} 条细分规划</span></div><div class="system-chip-list">${systemNames.length ? systemNames.map((name) => `<span class="system-chip">${escapeHtml(name)}</span>`).join("") : '<span class="muted-chip">未关联系统</span>'}</div></div>
                <div class="plan-strip-list">${plans.sort((a, b) => parseDate(a.start) - parseDate(b.start)).map((plan) => {
                  const dependencyCount = plan.dependsOn.length;
                  return `<button class="plan-strip" type="button" data-detail-plan="${plan.id}"><span class="plan-strip-main"><i>第三层规划</i><strong>${escapeHtml(plan.planName)}</strong><small>${escapeHtml(plan.code)} · ${formatShortDate(plan.start)} - ${formatShortDate(plan.end)}</small></span><span class="plan-strip-meta">${dependencyCount ? `${dependencyCount} 个前置依赖` : "无前置依赖"}<i class="status-tag ${getStatusClass(getEffectiveStatus(plan))}">${getEffectiveStatus(plan)}</i></span></button>`;
                }).join("")}</div>
              </article>`;
            }).join("")}
          </div>
        </section>`;
    }).join("");
    el.categoryView.querySelectorAll("[data-detail-plan]").forEach((button) => button.addEventListener("click", () => openProjectDetail(button.dataset.detailPlan)));
  }

  function renderRelationshipNetwork() {
    if (!el.networkCanvas || state.projectView !== "network") return;
    const search = el.projectSearch.value.trim().toLowerCase();
    const status = el.projectStatusFilter.value;
    let plans = state.projects.filter((plan) => {
      const matchesSearch = !search || `${plan.category} ${plan.name} ${plan.planName} ${plan.code} ${getSystemNames(plan).join(" ")}`.toLowerCase().includes(search);
      return matchesSearch && (status === "all" || getEffectiveStatus(plan) === status);
    });
    if (search && plans.length) {
      const contextIds = new Set(plans.map((plan) => plan.id));
      plans.forEach((plan) => {
        collectUpstreamIds(plan.id).forEach((id) => contextIds.add(id));
        collectDownstreamIds(plan.id).forEach((id) => contextIds.add(id));
      });
      plans = state.projects.filter((plan) => contextIds.has(plan.id) && (status === "all" || getEffectiveStatus(plan) === status));
    }
    if (!plans.length) {
      el.networkCanvas.innerHTML = '<div class="network-empty"><strong>没有符合条件的规划</strong><span>新增规划后，可在编辑时设置前置依赖</span></div>';
      el.networkFocusBar.hidden = true;
      return;
    }
    const visibleIds = new Set(plans.map((plan) => plan.id));
    const depthCache = new Map();
    const depthOf = (plan, trail = new Set()) => {
      if (depthCache.has(plan.id)) return depthCache.get(plan.id);
      if (trail.has(plan.id)) return 0;
      const nextTrail = new Set(trail).add(plan.id);
      const parents = plan.dependsOn.map((id) => state.projects.find((item) => item.id === id)).filter(Boolean);
      const depth = parents.length ? Math.max(...parents.map((parent) => depthOf(parent, nextTrail))) + 1 : 0;
      depthCache.set(plan.id, depth);
      return depth;
    };
    const maxDepth = Math.max(...plans.map((plan) => depthOf(plan)), 0);
    const categoryGroups = state.categories.map((category) => ({ category, plans: plans.filter((plan) => plan.categoryId === category.id) })).filter((group) => group.plans.length);
    const uncatalogued = plans.filter((plan) => !state.categories.some((category) => category.id === plan.categoryId));
    if (uncatalogued.length) categoryGroups.push({ category: { id: "uncatalogued", name: "未分类", color: "#7b8885" }, plans: uncatalogued });
    const width = Math.max(el.networkView.clientWidth || 900, 360 + (maxDepth + 1) * 280 + 60);
    const positions = new Map();
    const laneParts = [];
    let cursorY = 20;
    categoryGroups.forEach((group) => {
      const byProject = groupBy(group.plans, (plan) => plan.name);
      const categoryTop = cursorY;
      cursorY += 48;
      Object.entries(byProject).forEach(([projectName, projectPlans]) => {
        const projectTop = cursorY;
        const orderedPlans = projectPlans.sort((a, b) => depthOf(a) - depthOf(b) || parseDate(a.start) - parseDate(b.start));
        const laneHeight = Math.max(116, orderedPlans.length * 106 + 12);
        laneParts.push(`<div class="network-project-lane" style="top:${projectTop}px;height:${laneHeight}px"><div class="network-project-label"><span>第二层项目</span><strong>${escapeHtml(projectName)}</strong><small>${orderedPlans.length} 条规划</small></div></div>`);
        orderedPlans.forEach((plan, index) => positions.set(plan.id, { x: 330 + depthOf(plan) * 280, y: projectTop + 10 + index * 106 }));
        cursorY += laneHeight;
      });
      const categoryHeight = cursorY - categoryTop;
      laneParts.push(`<div class="network-category-lane" style="top:${categoryTop}px;height:${categoryHeight}px;--category-color:${group.category.color}"><div class="network-category-label"><i></i><strong>${escapeHtml(group.category.name)}</strong><span>第一层分类 · ${Object.keys(byProject).length} 个项目</span></div></div>`);
      cursorY += 18;
    });
    const height = Math.max(420, cursorY + 20);
    const focusId = visibleIds.has(state.networkFocusId) ? state.networkFocusId : null;
    if (!focusId) state.networkFocusId = null;
    const upstream = focusId ? collectUpstreamIds(focusId) : new Set();
    const downstream = focusId ? collectDownstreamIds(focusId) : new Set();
    const relatedIds = new Set([...(focusId ? [focusId] : []), ...upstream, ...downstream]);
    const edges = plans.flatMap((plan) => plan.dependsOn.filter((id) => visibleIds.has(id) && positions.has(id)).map((dependencyId) => ({ fromId: dependencyId, toId: plan.id, from: positions.get(dependencyId), to: positions.get(plan.id) })));
    const svg = `<svg class="network-lines" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" aria-hidden="true"><defs><marker id="dependencyArrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z"></path></marker><marker id="dependencyArrowActive" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z"></path></marker></defs>${edges.map((edge) => { const x1 = edge.from.x + 220; const y1 = edge.from.y + 46; const x2 = edge.to.x; const y2 = edge.to.y + 46; const mid = (x1 + x2) / 2; const active = focusId && relatedIds.has(edge.fromId) && relatedIds.has(edge.toId) && (upstream.has(edge.fromId) || downstream.has(edge.toId)); return `<path class="${focusId ? active ? "is-active" : "is-dimmed" : ""}" d="M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}" marker-end="url(#${active ? "dependencyArrowActive" : "dependencyArrow"})"></path>`; }).join("")}</svg>`;
    const nodes = plans.map((plan) => {
      const position = positions.get(plan.id);
      const waiting = plan.dependsOn.some((id) => { const dependency = state.projects.find((item) => item.id === id); return dependency && getEffectiveStatus(dependency) !== "已完成"; });
      const focusClass = focusId ? plan.id === focusId ? "is-focus" : upstream.has(plan.id) ? "is-upstream" : downstream.has(plan.id) ? "is-downstream" : "is-dimmed" : "";
      return `<button class="network-node ${waiting ? "is-blocked" : "is-ready"} ${focusClass}" type="button" data-network-plan="${plan.id}" style="left:${position.x}px;top:${position.y}px"><span class="network-node-category"><i style="background:${getCategoryColor(plan.category)}"></i>第三层规划</span><strong>${escapeHtml(plan.planName)}</strong><span>${escapeHtml(plan.code)} · ${getEffectiveStatus(plan)}</span><small>${waiting ? "等待前置规划" : plan.dependsOn.length ? "前置规划已完成" : "无前置依赖"}</small></button>`;
    }).join("");
    el.networkCanvas.innerHTML = `<div class="network-stage" style="width:${width}px;height:${height}px">${laneParts.join("")}${svg}${nodes}</div>`;
    el.networkCanvas.querySelectorAll("[data-network-plan]").forEach((button) => button.addEventListener("click", () => {
      state.networkFocusId = button.dataset.networkPlan;
      renderRelationshipNetwork();
    }));
    renderNetworkFocusBar(focusId, upstream, downstream);
  }

  function collectUpstreamIds(planId, collected = new Set()) {
    const plan = state.projects.find((item) => item.id === planId);
    if (!plan) return collected;
    plan.dependsOn.forEach((id) => {
      if (collected.has(id)) return;
      collected.add(id);
      collectUpstreamIds(id, collected);
    });
    return collected;
  }

  function collectDownstreamIds(planId, collected = new Set()) {
    state.projects.filter((plan) => plan.dependsOn.includes(planId)).forEach((plan) => {
      if (collected.has(plan.id)) return;
      collected.add(plan.id);
      collectDownstreamIds(plan.id, collected);
    });
    return collected;
  }

  function renderNetworkFocusBar(focusId, upstream, downstream) {
    const plan = focusId && state.projects.find((item) => item.id === focusId);
    el.networkFocusBar.hidden = !plan;
    if (!plan) return;
    el.networkFocusText.textContent = `${plan.category} → ${plan.name} → ${plan.planName}`;
    el.networkFocusSummary.textContent = `${upstream.size} 个上游前置 · ${downstream.size} 个下游影响；深色连线为当前完整依赖链路`;
  }

  function renderAdmin() {
    if (!el.settingsForm) return;
    const form = el.settingsForm.elements;
    form.namedItem("brandName").value = state.settings.brandName;
    form.namedItem("brandSubtitle").value = state.settings.brandSubtitle;
    form.namedItem("summaryPageName").value = state.settings.pageNames.summary;
    form.namedItem("timelinePageName").value = state.settings.pageNames.timeline;
    form.namedItem("projectsPageName").value = state.settings.pageNames.projects;
    form.namedItem("reportPageName").value = state.settings.pageNames.report;
    form.namedItem("adminPageName").value = state.settings.pageNames.admin;
    el.categoryManagerList.innerHTML = state.categories.map((category) => {
      const count = state.projects.filter((plan) => plan.categoryId === category.id).length;
      return `<div class="admin-list-row" data-category-row="${category.id}"><input type="color" value="${category.color}" data-category-color aria-label="${escapeAttr(category.name)}颜色"><input value="${escapeAttr(category.name)}" maxlength="30" data-category-name aria-label="分类名称"><span>${count} 条规划</span><button class="icon-button row-delete" type="button" data-delete-category="${category.id}" aria-label="删除 ${escapeAttr(category.name)}">×</button></div>`;
    }).join("") || '<div class="empty-note">尚未建立分类</div>';
    el.systemManagerList.innerHTML = state.systems.map((system) => {
      const count = state.projects.filter((plan) => plan.systemIds.includes(system.id)).length;
      return `<div class="admin-list-row system-row" data-system-row="${system.id}"><input value="${escapeAttr(system.name)}" maxlength="40" data-system-name aria-label="系统名称"><span>${count} 条规划</span><button class="icon-button row-delete" type="button" data-delete-system="${system.id}" aria-label="删除 ${escapeAttr(system.name)}">×</button></div>`;
    }).join("") || '<div class="empty-note">尚未建立关联系统</div>';
  }

  async function saveDisplaySettings(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(el.settingsForm).entries());
    state.settings = normalizeSettings({ brandName: data.brandName, brandSubtitle: data.brandSubtitle, pageNames: { summary: data.summaryPageName, timeline: data.timelinePageName, projects: data.projectsPageName, report: data.reportPageName, admin: data.adminPageName } });
    const saved = await saveProjects();
    applyDisplaySettings();
    if (saved) showToast("页面名称与品牌展示已保存");
  }

  async function addCategory() {
    const name = el.newCategoryName.value.trim();
    if (!name) return showToast("请输入分类名称", true);
    if (state.categories.some((item) => item.name.toLowerCase() === name.toLowerCase())) return showToast("该分类已经存在", true);
    state.categories.push({ id: makeId(), name: name.slice(0, 30), color: el.newCategoryColor.value });
    el.newCategoryName.value = "";
    const saved = await saveProjects();
    renderAll();
    if (saved) showToast("分类已添加并保存");
  }

  async function saveCategoryChanges() {
    const rows = Array.from(el.categoryManagerList.querySelectorAll("[data-category-row]"));
    const names = rows.map((row) => row.querySelector("[data-category-name]").value.trim());
    if (names.some((name) => !name)) return showToast("分类名称不能为空", true);
    if (new Set(names.map((name) => name.toLowerCase())).size !== names.length) return showToast("分类名称不能重复", true);
    rows.forEach((row) => {
      const category = state.categories.find((item) => item.id === row.dataset.categoryRow);
      category.name = row.querySelector("[data-category-name]").value.trim().slice(0, 30);
      category.color = row.querySelector("[data-category-color]").value;
    });
    state.projects.forEach((plan) => { const category = state.categories.find((item) => item.id === plan.categoryId); if (category) plan.category = category.name; });
    const saved = await saveProjects();
    renderAll();
    if (saved) showToast("分类修改已同步到项目规划");
  }

  async function handleCategoryManagerClick(event) {
    const button = event.target.closest("[data-delete-category]");
    if (!button) return;
    const category = state.categories.find((item) => item.id === button.dataset.deleteCategory);
    const usage = state.projects.filter((plan) => plan.categoryId === category.id).length;
    if (usage) return showToast(`该分类仍有 ${usage} 条规划，请先调整规划分类`, true);
    if (!window.confirm(`确定删除分类“${category.name}”吗？`)) return;
    state.categories = state.categories.filter((item) => item.id !== category.id);
    const saved = await saveProjects();
    renderAll();
    if (saved) showToast("分类已删除");
  }

  async function addSystem() {
    const name = el.newSystemName.value.trim();
    if (!name) return showToast("请输入系统名称", true);
    if (state.systems.some((item) => item.name.toLowerCase() === name.toLowerCase())) return showToast("该系统已经存在", true);
    state.systems.push({ id: makeId(), name: name.slice(0, 40) });
    el.newSystemName.value = "";
    const saved = await saveProjects();
    renderAll();
    if (saved) showToast("系统已添加并保存");
  }

  async function saveSystemChanges() {
    const rows = Array.from(el.systemManagerList.querySelectorAll("[data-system-row]"));
    const names = rows.map((row) => row.querySelector("[data-system-name]").value.trim());
    if (names.some((name) => !name)) return showToast("系统名称不能为空", true);
    if (new Set(names.map((name) => name.toLowerCase())).size !== names.length) return showToast("系统名称不能重复", true);
    rows.forEach((row) => { const system = state.systems.find((item) => item.id === row.dataset.systemRow); system.name = row.querySelector("[data-system-name]").value.trim().slice(0, 40); });
    const saved = await saveProjects();
    renderAll();
    if (saved) showToast("系统名称已保存");
  }

  async function handleSystemManagerClick(event) {
    const button = event.target.closest("[data-delete-system]");
    if (!button) return;
    const system = state.systems.find((item) => item.id === button.dataset.deleteSystem);
    const usage = state.projects.filter((plan) => plan.systemIds.includes(system.id)).length;
    if (usage) return showToast(`该系统仍关联 ${usage} 条规划，请先解除关联`, true);
    if (!window.confirm(`确定删除系统“${system.name}”吗？`)) return;
    state.systems = state.systems.filter((item) => item.id !== system.id);
    const saved = await saveProjects();
    renderAll();
    if (saved) showToast("系统已删除");
  }

  function renderSummary() {
    const projects = state.projects;
    const total = projects.length;
    const projectCount = new Set(projects.map((project) => `${project.categoryId}::${project.name}`)).size;
    const statuses = countBy(projects, (project) => getEffectiveStatus(project));
    const completed = statuses["已完成"] || 0;
    const delayed = statuses["已延期"] || 0;
    const risk = statuses["有风险"] || 0;
    const active = (statuses["进行中"] || 0) + risk + delayed;
    const avgProgress = total ? Math.round(projects.reduce((sum, project) => sum + Number(project.progress || 0), 0) / total) : 0;
    const health = total ? clamp(100 - delayed * 15 - risk * 9 - getOverdueMilestoneCount(projects) * 3, 18, 100) : 100;

    el.healthScore.textContent = health;
    el.healthSummary.textContent = getHealthSummary(health, delayed, risk, total);
    el.portfolioProgress.textContent = `${avgProgress}%`;
    el.portfolioProgressBar.style.width = `${avgProgress}%`;
    el.portfolioProgressBar.parentElement.setAttribute("aria-valuenow", String(avgProgress));
    el.portfolioMeta.innerHTML = `<span>${completed} 项已完成</span><span>${active} 项推进中</span>`;

    const nextMilestones = getUpcomingMilestones(projects, 14).length;
    const metrics = [
      { label: "项目总数", value: projectCount, note: `${total} 条规划 · ${state.categories.filter((category) => projects.some((project) => project.categoryId === category.id)).length} 个分类`, symbol: "▦" },
      { label: "推进中", value: active, note: `${statuses["进行中"] || 0} 项按计划推进`, symbol: "↗" },
      { label: "风险 / 延期", value: risk + delayed, note: delayed ? `${delayed} 项已超过计划日期` : "暂无已逾期项目", symbol: "!" },
      { label: "近期节点", value: nextMilestones, note: "未来 14 天待完成", symbol: "◇" }
    ];
    el.metricGrid.innerHTML = metrics.map((metric) => `
      <article class="metric-card">
        <div class="metric-card-head"><span>${metric.label}</span><span class="metric-symbol" aria-hidden="true">${metric.symbol}</span></div>
        <strong>${metric.value}</strong>
        <small>${metric.note}</small>
      </article>
    `).join("");

    renderCategoryProgress();
    renderRiskList();
    renderInsights();
    el.analysisTime.textContent = `基于 ${projectCount} 个项目、${total} 条规划实时分析`;
  }

  function renderCategoryProgress() {
    const grouped = groupBy(state.projects, (project) => project.category || "未分类");
    const categories = Object.entries(grouped)
      .map(([category, projects]) => ({
        category,
        projects,
        progress: projects.length ? Math.round(projects.reduce((sum, item) => sum + Number(item.progress || 0), 0) / projects.length) : 0
      }))
      .sort((a, b) => b.projects.length - a.projects.length || b.progress - a.progress);

    if (!categories.length) {
      el.categoryProgress.innerHTML = '<div class="empty-note">暂无分类数据</div>';
      return;
    }

    el.categoryProgress.innerHTML = categories.map((item, index) => {
      const riskCount = item.projects.filter((project) => ["有风险", "已延期"].includes(getEffectiveStatus(project))).length;
      return `
        <div class="category-row">
          <div class="category-title">
            <span class="category-swatch" style="background:${getCategoryColor(item.category, index)}"></span>
            <div><strong>${escapeHtml(item.category)}</strong><small>${new Set(item.projects.map((project) => project.name)).size} 个项目 · ${item.projects.length} 条规划${riskCount ? ` · ${riskCount} 条需关注` : ""}</small></div>
          </div>
          <div class="mini-progress" role="progressbar" aria-label="${escapeHtml(item.category)}平均进度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${item.progress}"><span style="width:${item.progress}%;background:${getCategoryColor(item.category, index)}"></span></div>
          <span class="category-percent">${item.progress}%</span>
        </div>
      `;
    }).join("");
  }

  function renderRiskList() {
    const risks = state.projects
      .map((project) => ({ project, analysis: analyzeProject(project) }))
      .filter(({ analysis }) => analysis.level === "danger" || analysis.level === "warning")
      .sort((a, b) => riskRank(a.analysis) - riskRank(b.analysis) || parseDate(a.project.end) - parseDate(b.project.end));

    el.riskCountLabel.textContent = `${risks.length} 项`;
    if (!risks.length) {
      el.riskList.innerHTML = '<div class="empty-note">当前没有延期或高风险项目</div>';
      return;
    }

    el.riskList.innerHTML = risks.slice(0, 5).map(({ project, analysis }) => `
      <button class="risk-row text-button" type="button" data-risk-id="${project.id}">
        <span class="risk-dot ${analysis.level === "danger" ? "is-overdue" : ""}"></span>
        <span class="risk-info"><strong>${escapeHtml(project.name)} · ${escapeHtml(project.planName)}</strong><span>${escapeHtml(analysis.reason)}</span></span>
        <span class="risk-days ${analysis.level === "danger" ? "is-overdue" : ""}">${escapeHtml(analysis.shortLabel)}</span>
      </button>
    `).join("");
    el.riskList.querySelectorAll("[data-risk-id]").forEach((button) => {
      button.addEventListener("click", () => openProjectDetail(button.dataset.riskId));
    });
  }

  function renderInsights() {
    const projects = state.projects;
    const riskProjects = projects.filter((project) => ["有风险", "已延期"].includes(getEffectiveStatus(project)));
    const upcoming = getUpcomingMilestones(projects, 14);
    const ownerLoads = Object.entries(groupBy(projects.filter((project) => getEffectiveStatus(project) !== "已完成"), (project) => project.owner || "未指定"))
      .map(([owner, items]) => ({ owner, count: items.length, risks: items.filter((item) => ["有风险", "已延期"].includes(getEffectiveStatus(item))).length }))
      .sort((a, b) => b.count - a.count || b.risks - a.risks);
    const topOwner = ownerLoads[0];

    const insights = [];
    if (riskProjects.length) {
      const topRisk = riskProjects.sort((a, b) => riskRank(analyzeProject(a)) - riskRank(analyzeProject(b)))[0];
      const analysis = analyzeProject(topRisk);
      insights.push({
        type: analysis.level === "danger" ? "danger" : "warning",
        label: "优先处理",
        title: `${topRisk.name} · ${topRisk.planName}`,
        body: `${analysis.reason}。建议先明确责任人与解除时间，再同步更新节点。`
      });
    } else {
      insights.push({ type: "normal", label: "组合状态", title: "计划整体稳定", body: "当前没有识别到明显延期或阻塞，可继续按节点节奏推进。" });
    }

    if (upcoming.length) {
      const nearest = upcoming[0];
      insights.push({
        type: "normal",
        label: "近期节点",
        title: `未来 14 天有 ${upcoming.length} 个节点`,
        body: `最近是“${nearest.milestone.name}”，${formatRelativeDate(nearest.milestone.date)}，来自 ${nearest.project.name} · ${nearest.project.planName}。`
      });
    } else {
      insights.push({ type: "normal", label: "近期节点", title: "未来 14 天暂无节点", body: "可检查进行中项目是否已补充下一阶段的关键交付节点。" });
    }

    if (topOwner) {
      insights.push({
        type: topOwner.risks >= 2 ? "warning" : "normal",
        label: "工作负荷",
        title: `${topOwner.owner} 当前负责 ${topOwner.count} 项`,
        body: topOwner.risks ? `其中 ${topOwner.risks} 项处于风险或延期状态，建议确认资源是否足够。` : "负责项目均未进入风险状态，当前负荷仍需按周复核。"
      });
    } else {
      insights.push({ type: "normal", label: "工作负荷", title: "暂无进行中项目", body: "新建项目并设置负责人后，这里会自动分析人员负荷。" });
    }

    el.insightGrid.innerHTML = insights.map((insight) => `
      <article class="insight-item ${insight.type === "warning" ? "is-warning" : insight.type === "danger" ? "is-danger" : ""}">
        <span>${insight.label}</span>
        <strong>${escapeHtml(insight.title)}</strong>
        <p>${escapeHtml(insight.body)}</p>
      </article>
    `).join("");
  }

  function renderGantt(focusToday) {
    const search = el.ganttSearch.value.trim().toLowerCase();
    const category = el.ganttCategory.value;
    const status = el.ganttStatus.value;
    const projects = state.projects
      .filter((project) => !search || `${project.category} ${project.name} ${project.planName} ${project.code}`.toLowerCase().includes(search))
      .filter((project) => category === "all" || project.category === category)
      .filter((project) => status === "all" || getEffectiveStatus(project) === status)
      .sort((a, b) => parseDate(a.start) - parseDate(b.start));

    el.ganttFrame.classList.remove("zoom-month", "zoom-week", "zoom-day");
    el.ganttFrame.classList.add(ZOOM_CONFIG[state.zoom].className);
    el.ganttEmpty.hidden = projects.length > 0;
    el.ganttCanvas.hidden = projects.length === 0;
    if (!projects.length) {
      el.ganttCanvas.innerHTML = "";
      return;
    }

    const range = getTimelineRange(projects);
    const days = daysBetween(range.start, range.end) + 1;
    const availableWidth = Math.max(320, (el.ganttFrame.clientWidth || 900) - (window.innerWidth <= 560 ? 220 : 264));
    const baseWidth = ZOOM_CONFIG[state.zoom].dayWidth;
    const dayWidth = Math.max(baseWidth, availableWidth / days);
    const timelineWidth = Math.ceil(days * dayWidth);
    const gridSize = state.zoom === "day" ? dayWidth : dayWidth * 7;
    const todayOffset = daysBetween(range.start, today()) * dayWidth + dayWidth / 2;
    const todayVisible = today() >= range.start && today() <= range.end;
    const tickHtml = buildDateTicks(range.start, range.end, dayWidth);
    const todayHtml = todayVisible ? `<span class="today-line" data-today-line style="left:${todayOffset}px"></span>` : "";

    const head = `
      <div class="gantt-head">
        <div class="gantt-project-cell">项目规划 / 项目 / 分类</div>
        <div class="gantt-date-header" style="width:${timelineWidth}px;background-size:${gridSize}px 100%">${tickHtml}${todayHtml}</div>
      </div>
    `;

    const rows = projects.map((project, index) => buildGanttRow(project, index, range, dayWidth, timelineWidth, gridSize, todayVisible ? todayOffset : null)).join("");
    el.ganttCanvas.innerHTML = head + rows;
    el.ganttCanvas.style.width = `${(window.innerWidth <= 560 ? 220 : 264) + timelineWidth}px`;

    el.ganttCanvas.querySelectorAll("[data-project-row]").forEach((row) => {
      row.addEventListener("click", () => openProjectDetail(row.dataset.projectRow));
      row.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          openProjectDetail(row.dataset.projectRow);
        }
      });
    });
    bindMarkTooltips();
    if (focusToday) requestAnimationFrame(scrollGanttToToday);
  }

  function buildDateTicks(start, end, dayWidth) {
    const ticks = [];
    const cursor = new Date(start);

    if (state.zoom === "month") {
      cursor.setDate(1);
      if (cursor < start) cursor.setMonth(cursor.getMonth() + 1);
      while (cursor <= end) {
        const next = new Date(cursor);
        next.setMonth(next.getMonth() + 1);
        const left = daysBetween(start, cursor) * dayWidth;
        const width = Math.max(dayWidth, daysBetween(cursor, next) * dayWidth);
        ticks.push(`<span class="date-tick" style="left:${left}px;width:${width}px"><strong>${cursor.getFullYear()}年</strong>${cursor.getMonth() + 1}月</span>`);
        cursor.setMonth(cursor.getMonth() + 1);
      }
    } else if (state.zoom === "week") {
      const day = cursor.getDay() || 7;
      cursor.setDate(cursor.getDate() - day + 1);
      while (cursor <= end) {
        const left = daysBetween(start, cursor) * dayWidth;
        const week = getWeekNumber(cursor);
        const monthLead = cursor.getDate() <= 7 ? `${cursor.getFullYear()}年${cursor.getMonth() + 1}月` : `第${week}周`;
        ticks.push(`<span class="date-tick" style="left:${left}px;width:${7 * dayWidth}px"><strong>${monthLead}</strong>${cursor.getMonth() + 1}/${cursor.getDate()}</span>`);
        cursor.setDate(cursor.getDate() + 7);
      }
    } else {
      while (cursor <= end) {
        const left = daysBetween(start, cursor) * dayWidth;
        const isMonthStart = cursor.getDate() === 1 || sameDay(cursor, start);
        const weekday = ["日", "一", "二", "三", "四", "五", "六"][cursor.getDay()];
        ticks.push(`<span class="date-tick" style="left:${left}px;width:${dayWidth}px"><strong>${isMonthStart ? `${cursor.getMonth() + 1}月` : ""}</strong>${cursor.getDate()} · ${weekday}</span>`);
        cursor.setDate(cursor.getDate() + 1);
      }
    }
    return ticks.join("");
  }

  function buildGanttRow(project, index, range, dayWidth, timelineWidth, gridSize, todayOffset) {
    const start = parseDate(project.start);
    const end = parseDate(project.end);
    const left = daysBetween(range.start, start) * dayWidth;
    const width = Math.max(dayWidth * 0.7, (daysBetween(start, end) + 1) * dayWidth);
    const progress = clamp(Number(project.progress || 0), 0, 100);
    const expected = getExpectedProgress(project);
    const status = getEffectiveStatus(project);
    const planClass = status === "已完成" ? "is-complete" : "";
    const color = getCategoryColor(project.category, index);
    const actualWidth = Math.max(progress > 0 ? 2 : 0, progress);
    const expectedMarker = expected > 0 && expected < 100 ? `<span class="expected-marker" style="left:${expected}%" aria-label="按时间应完成 ${expected}%"></span>` : "";
    const barLabel = `<span class="bar-label">${progress}% · ${escapeHtml(status)}</span>`;

    let delayHtml = "";
    if (status === "已延期" && today() > end) {
      const delayStart = daysBetween(range.start, addDays(end, 1)) * dayWidth;
      const delayEnd = Math.min(daysBetween(range.start, today()) + 1, daysBetween(range.start, range.end) + 1) * dayWidth;
      delayHtml = `<span class="delay-bar" style="left:${delayStart}px;width:${Math.max(dayWidth, delayEnd - delayStart)}px"></span>`;
    }

    const milestones = (project.milestones || []).map((milestone) => {
      const date = parseDate(milestone.date);
      if (date < range.start || date > range.end) return "";
      const offset = daysBetween(range.start, date) * dayWidth + dayWidth / 2;
      const milestoneClass = milestone.status === "已完成" ? "is-done" : date < today() ? "is-late" : "";
      const tooltip = `${milestone.name} · ${formatDate(date)} · ${milestone.status}`;
      return `<button class="milestone-mark ${milestoneClass}" type="button" style="left:${offset}px" data-tooltip-text="${escapeAttr(tooltip)}" aria-label="${escapeAttr(tooltip)}"></button>`;
    }).join("");

    let blocker = "";
    if ((project.blockers || "").trim()) {
      const markerDate = today() < start ? start : today() > range.end ? range.end : today();
      const offset = daysBetween(range.start, markerDate) * dayWidth + dayWidth / 2;
      blocker = `<button class="blocker-mark" type="button" style="left:${offset}px" data-tooltip-text="卡点：${escapeAttr(project.blockers)}" aria-label="卡点：${escapeAttr(project.blockers)}">!</button>`;
    }

    return `
      <div class="gantt-row" data-project-row="${project.id}" role="button" tabindex="0" aria-label="查看 ${escapeAttr(project.name)} ${escapeAttr(project.planName)} 详情">
        <div class="gantt-project-cell">
          <span class="gantt-project-swatch" style="background:${color}"></span>
          <span class="gantt-project-info"><strong>${escapeHtml(project.planName)}</strong><span>${escapeHtml(project.name)} · ${escapeHtml(project.category)}</span></span>
        </div>
        <div class="gantt-timeline-cell" style="width:${timelineWidth}px;background-size:${gridSize}px 100%">
          ${todayOffset !== null ? `<span class="today-line" style="left:${todayOffset}px"></span>` : ""}
          <span class="plan-bar ${planClass}" style="left:${left}px;width:${width}px" aria-label="计划 ${formatDate(start)} 至 ${formatDate(end)}，已完成 ${progress}%">
            <span class="actual-bar" style="width:${actualWidth}%"></span>
            ${expectedMarker}${barLabel}
          </span>
          ${delayHtml}${milestones}${blocker}
        </div>
      </div>
    `;
  }

  function bindMarkTooltips() {
    let tooltip = null;
    const hide = () => {
      if (tooltip) tooltip.remove();
      tooltip = null;
    };
    el.ganttCanvas.querySelectorAll("[data-tooltip-text]").forEach((mark) => {
      const show = () => {
        hide();
        tooltip = document.createElement("div");
        tooltip.className = "mark-tooltip";
        tooltip.textContent = mark.dataset.tooltipText;
        document.body.appendChild(tooltip);
        const rect = mark.getBoundingClientRect();
        const tipRect = tooltip.getBoundingClientRect();
        const left = clamp(rect.left + rect.width / 2 - tipRect.width / 2, 8, window.innerWidth - tipRect.width - 8);
        const top = rect.top - tipRect.height - 8 < 8 ? rect.bottom + 8 : rect.top - tipRect.height - 8;
        tooltip.style.left = `${left}px`;
        tooltip.style.top = `${top}px`;
      };
      mark.addEventListener("mouseenter", show);
      mark.addEventListener("mouseleave", hide);
      mark.addEventListener("focus", show);
      mark.addEventListener("blur", hide);
      mark.addEventListener("click", (event) => event.stopPropagation());
    });
  }

  function scrollGanttToToday() {
    const line = el.ganttCanvas.querySelector(".gantt-head [data-today-line]");
    if (!line) {
      showToast("今天不在当前项目时间范围内");
      return;
    }
    const stickyWidth = window.innerWidth <= 560 ? 220 : 264;
    const target = Number.parseFloat(line.style.left) + stickyWidth - el.ganttFrame.clientWidth / 2;
    el.ganttFrame.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }

  function renderProjectViews() {
    renderProjectTable();
    renderCategoryHierarchy();
    if (state.projectView === "network") renderRelationshipNetwork();
  }

  function renderProjectTable() {
    const search = el.projectSearch.value.trim().toLowerCase();
    const status = el.projectStatusFilter.value;
    const sortField = state.projectSort === "end" ? "end" : "start";
    const projects = state.projects
      .filter((project) => !search || `${project.category} ${project.name} ${project.planName} ${project.code} ${project.owner} ${getSystemNames(project).join(" ")}`.toLowerCase().includes(search))
      .filter((project) => status === "all" || getEffectiveStatus(project) === status)
      .sort((a, b) => parseDate(a[sortField]) - parseDate(b[sortField]) || a.category.localeCompare(b.category, "zh-CN") || a.name.localeCompare(b.name, "zh-CN") || a.planName.localeCompare(b.planName, "zh-CN"));

    el.projectEmpty.hidden = projects.length > 0;
    el.projectTableBody.parentElement.hidden = projects.length === 0;
    el.projectCountText.textContent = `显示 ${projects.length} 条，共 ${state.projects.length} 条规划`;
    el.projectTableBody.innerHTML = projects.map((project) => {
      const effectiveStatus = getEffectiveStatus(project);
      const progress = clamp(Number(project.progress || 0), 0, 100);
      const hierarchyIndex = getProjectHierarchyIndex(project);
      const categoryColor = getCategoryColor(project.category);
      return `
        <tr data-edit-id="${project.id}" class="hierarchy-table-row" style="--row-category-color:${categoryColor}">
          <td><div class="table-hierarchy-category"><i></i><span><small>第一层分类 ${hierarchyIndex.category}</small><strong>${escapeHtml(project.category)}</strong></span></div></td>
          <td class="project-cell project-level-cell"><span class="table-level-index">第二层 · ${hierarchyIndex.category}.${hierarchyIndex.project}</span><strong>${escapeHtml(project.name)}</strong></td>
          <td class="project-cell plan-level-cell"><span class="table-level-index">第三层规划</span><strong>${escapeHtml(project.planName)}</strong><small>${escapeHtml(project.code)}</small></td>
          <td><div class="system-chip-list table-system-list">${getSystemNames(project).length ? getSystemNames(project).map((name) => `<span class="system-chip">${escapeHtml(name)}</span>`).join("") : '<span class="muted-chip">未关联</span>'}</div></td>
          <td>${escapeHtml(project.owner || "未指定")}</td>
          <td>${formatShortDate(project.start)} - ${formatShortDate(project.end)}</td>
          <td>
            <div class="table-progress">
              <div class="table-progress-head"><span>${progress}%</span><span>预期 ${getExpectedProgress(project)}%</span></div>
              <div class="mini-progress"><span style="width:${progress}%"></span></div>
            </div>
          </td>
          <td><span class="status-tag ${getStatusClass(effectiveStatus)}">${effectiveStatus}</span></td>
          <td><button class="row-action" type="button" data-row-edit="${project.id}" aria-label="编辑 ${escapeAttr(project.name)} ${escapeAttr(project.planName)}">⋯</button></td>
        </tr>
      `;
    }).join("");

    el.projectTableBody.querySelectorAll("[data-edit-id]").forEach((row) => {
      row.addEventListener("click", () => openProjectDialog(row.dataset.editId));
    });
    el.projectTableBody.querySelectorAll("[data-row-edit]").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        openProjectDialog(button.dataset.rowEdit);
      });
    });
  }

  function getProjectHierarchyIndex(project) {
    const categoryIndex = Math.max(0, state.categories.findIndex((category) => category.id === project.categoryId));
    const projectNames = [...new Set(state.projects.filter((plan) => plan.categoryId === project.categoryId).map((plan) => plan.name))];
    const projectIndex = Math.max(0, projectNames.indexOf(project.name));
    return { category: categoryIndex + 1, project: projectIndex + 1 };
  }

  function openProjectDialog(id) {
    const project = id ? state.projects.find((item) => item.id === id) : null;
    state.editingId = project ? project.id : null;
    el.projectForm.reset();
    clearFormErrors();

    const start = formatDateKey(today());
    const end = formatDateKey(addDays(today(), 30));
    const values = project || {
      name: "",
      planName: "整体规划",
      code: generateProjectCode(),
      categoryId: state.categories[0] ? state.categories[0].id : "",
      owner: "",
      priority: "中",
      start,
      end,
      status: "未开始",
      progress: 0,
      blockers: "",
      notes: "",
      dependencyNote: "",
      systemIds: [],
      dependsOn: [],
      milestones: []
    };

    ["name", "planName", "code", "categoryId", "owner", "priority", "start", "end", "status", "progress", "blockers", "notes", "dependencyNote"].forEach((name) => {
      const control = el.projectForm.elements.namedItem(name);
      if (control) control.value = values[name] ?? "";
    });
    state.milestoneDraft = (values.milestones || []).map((milestone) => ({ ...milestone }));
    renderSystemOptions(values.systemIds || []);
    renderDependencyOptions(values.dependsOn || [], project && project.id);
    el.dialogKicker.textContent = project ? "EDIT PLAN" : "NEW PLAN";
    el.dialogTitle.textContent = project ? "编辑项目规划" : "新建项目规划";
    el.deleteProjectButton.hidden = !project;
    renderMilestoneEditor();
    updateFormIntelligence();
    el.projectDialog.showModal();
    requestAnimationFrame(() => el.projectForm.elements.namedItem("name").focus());
  }

  function renderSystemOptions(selectedIds) {
    const selected = new Set(selectedIds);
    el.systemOptions.innerHTML = state.systems.length ? state.systems.map((system) => `<label class="check-option"><input type="checkbox" value="${system.id}" data-system-option${selected.has(system.id) ? " checked" : ""}><span>${escapeHtml(system.name)}</span></label>`).join("") : '<div class="option-empty">尚未配置系统，请先到后台管理添加。</div>';
  }

  function renderDependencyOptions(selectedIds, editingId) {
    const selected = new Set(selectedIds);
    const candidates = state.projects.filter((plan) => plan.id !== editingId).sort((a, b) => a.category.localeCompare(b.category, "zh-CN") || a.name.localeCompare(b.name, "zh-CN") || parseDate(a.start) - parseDate(b.start));
    el.dependencyOptions.innerHTML = candidates.length ? candidates.map((plan) => { const label = `${plan.name} · ${plan.planName} · ${plan.category} · ${plan.code}`; return `<label class="dependency-option"><input type="checkbox" value="${plan.id}" data-dependency-option aria-label="${escapeAttr(label)}"${selected.has(plan.id) ? " checked" : ""}><span><strong>${escapeHtml(plan.name)} · ${escapeHtml(plan.planName)}</strong><small>${escapeHtml(plan.category)} · ${escapeHtml(plan.code)} · ${getEffectiveStatus(plan)}</small></span></label>`; }).join("") : '<div class="option-empty">暂无其他规划可作为前置依赖。</div>';
  }

  function closeProjectDialog() {
    if (el.projectDialog.open) el.projectDialog.close();
    state.editingId = null;
    state.milestoneDraft = [];
  }

  function addMilestoneDraft() {
    const start = el.projectForm.elements.namedItem("start").value || formatDateKey(today());
    state.milestoneDraft.push({ id: makeId(), name: "", date: start, status: "未开始" });
    renderMilestoneEditor();
    const inputs = el.milestoneEditor.querySelectorAll('input[data-milestone-field="name"]');
    if (inputs.length) inputs[inputs.length - 1].focus();
  }

  function renderMilestoneEditor() {
    if (!state.milestoneDraft.length) {
      el.milestoneEditor.innerHTML = '<div class="milestone-empty">尚未添加项目节点</div>';
      return;
    }
    el.milestoneEditor.innerHTML = state.milestoneDraft.map((milestone, index) => `
      <div class="milestone-row" data-milestone-index="${index}">
        <input data-milestone-field="name" value="${escapeAttr(milestone.name || "")}" maxlength="40" placeholder="节点名称" aria-label="节点名称">
        <input data-milestone-field="date" type="date" value="${escapeAttr(milestone.date || "")}" aria-label="节点日期">
        <select data-milestone-field="status" aria-label="节点状态">
          ${["未开始", "进行中", "已完成"].map((status) => `<option${milestone.status === status ? " selected" : ""}>${status}</option>`).join("")}
        </select>
        <button class="row-action" type="button" data-remove-milestone="${index}" aria-label="删除节点">×</button>
      </div>
    `).join("");

    el.milestoneEditor.querySelectorAll("[data-milestone-field]").forEach((control) => {
      control.addEventListener("change", updateMilestoneDraftFromDom);
      control.addEventListener("input", updateMilestoneDraftFromDom);
    });
    el.milestoneEditor.querySelectorAll("[data-remove-milestone]").forEach((button) => {
      button.addEventListener("click", () => {
        updateMilestoneDraftFromDom();
        state.milestoneDraft.splice(Number(button.dataset.removeMilestone), 1);
        renderMilestoneEditor();
      });
    });
  }

  function updateMilestoneDraftFromDom() {
    state.milestoneDraft = Array.from(el.milestoneEditor.querySelectorAll("[data-milestone-index]")).map((row, index) => ({
      id: state.milestoneDraft[index] && state.milestoneDraft[index].id ? state.milestoneDraft[index].id : makeId(),
      name: row.querySelector('[data-milestone-field="name"]').value.trim(),
      date: row.querySelector('[data-milestone-field="date"]').value,
      status: row.querySelector('[data-milestone-field="status"]').value
    }));
  }

  function updateFormIntelligence() {
    const progress = Number(el.projectForm.elements.namedItem("progress").value || 0);
    const startValue = el.projectForm.elements.namedItem("start").value;
    const endValue = el.projectForm.elements.namedItem("end").value;
    const status = el.projectForm.elements.namedItem("status").value;
    el.progressOutput.textContent = `${progress}%`;
    el.smartCheck.classList.remove("is-warning", "is-danger");

    if (!startValue || !endValue || parseDate(endValue) < parseDate(startValue)) {
      el.smartCheck.innerHTML = '<span class="smart-check-icon" aria-hidden="true">◇</span><span>填写有效的计划日期后，将自动判断项目风险。</span>';
      return;
    }

    const temp = { start: startValue, end: endValue, progress, status, blockers: "", milestones: [] };
    const expected = getExpectedProgress(temp);
    const gap = expected - progress;
    if (parseDate(endValue) < today() && progress < 100) {
      el.smartCheck.classList.add("is-danger");
      el.smartCheck.innerHTML = `<span class="smart-check-icon" aria-hidden="true">!</span><span>计划日期已过去，按当前进度将自动识别为“已延期”。</span>`;
    } else if (gap > 15) {
      el.smartCheck.classList.add("is-warning");
      el.smartCheck.innerHTML = `<span class="smart-check-icon" aria-hidden="true">!</span><span>当前进度比时间计划落后 ${Math.round(gap)} 个百分点，建议补充原因或调整节点。</span>`;
    } else if (today() < parseDate(startValue)) {
      el.smartCheck.innerHTML = '<span class="smart-check-icon" aria-hidden="true">◇</span><span>项目尚未开始，计划日期设置正常。</span>';
    } else {
      el.smartCheck.innerHTML = `<span class="smart-check-icon" aria-hidden="true">✓</span><span>当前进度与时间计划基本匹配，计划应完成约 ${expected}%。</span>`;
    }
  }

  async function saveProjectFromForm(event) {
    event.preventDefault();
    updateMilestoneDraftFromDom();
    if (!validateProjectForm()) return;

    const data = Object.fromEntries(new FormData(el.projectForm).entries());
    const progress = clamp(Number(data.progress || 0), 0, 100);
    const category = state.categories.find((item) => item.id === data.categoryId);
    const project = normalizeProject({
      id: state.editingId || makeId(),
      ...data,
      progress: data.status === "已完成" ? 100 : progress,
      status: progress === 100 ? "已完成" : data.status,
      categoryId: data.categoryId,
      category: category ? category.name : "未分类",
      systemIds: Array.from(el.systemOptions.querySelectorAll("[data-system-option]:checked"), (input) => input.value),
      dependsOn: Array.from(el.dependencyOptions.querySelectorAll("[data-dependency-option]:checked"), (input) => input.value),
      milestones: state.milestoneDraft.filter((milestone) => milestone.name && milestone.date)
    });

    const index = state.projects.findIndex((item) => item.id === state.editingId);
    if (index >= 0) state.projects.splice(index, 1, project);
    else state.projects.push(project);
    const saved = await saveProjects();
    closeProjectDialog();
    renderAll();
    if (saved) showToast(index >= 0 ? "项目规划已更新并保存" : "项目规划已创建并保存");
  }

  function validateProjectForm() {
    clearFormErrors();
    let valid = true;
    const required = ["categoryId", "name", "planName", "code", "start", "end"];
    required.forEach((name) => {
      const control = el.projectForm.elements.namedItem(name);
      if (!String(control.value || "").trim()) {
        showFieldError(name, "此项不能为空");
        valid = false;
      }
    });
    const startValue = el.projectForm.elements.namedItem("start").value;
    const endValue = el.projectForm.elements.namedItem("end").value;
    if (startValue && endValue && parseDate(endValue) < parseDate(startValue)) {
      showFieldError("end", "计划完成日期不能早于开始日期");
      valid = false;
    }
    const code = el.projectForm.elements.namedItem("code").value.trim().toLowerCase();
    if (state.projects.some((project) => project.id !== state.editingId && project.code.toLowerCase() === code)) {
      showFieldError("code", "该项目编号已存在");
      valid = false;
    }
    const incompleteMilestone = state.milestoneDraft.some((milestone) => (milestone.name && !milestone.date) || (!milestone.name && milestone.date));
    if (incompleteMilestone) {
      showToast("项目节点需要同时填写名称和日期", true);
      valid = false;
    }
    const selectedDependencies = Array.from(el.dependencyOptions.querySelectorAll("[data-dependency-option]:checked"), (input) => input.value);
    if (state.editingId && selectedDependencies.some((dependencyId) => dependencyReaches(dependencyId, state.editingId))) {
      showToast("该依赖会形成循环，请调整前置规划", true);
      valid = false;
    }
    if (!valid) {
      const first = el.projectForm.querySelector(".is-invalid");
      if (first) first.focus();
    }
    return valid;
  }

  function showFieldError(name, message) {
    const control = el.projectForm.elements.namedItem(name);
    const error = el.projectForm.querySelector(`[data-error-for="${name}"]`);
    if (control) control.classList.add("is-invalid");
    if (error) error.textContent = message;
  }

  function clearFormErrors() {
    el.projectForm.querySelectorAll(".is-invalid").forEach((control) => control.classList.remove("is-invalid"));
    el.projectForm.querySelectorAll(".field-error").forEach((error) => { error.textContent = ""; });
  }

  async function deleteEditingProject() {
    const project = state.projects.find((item) => item.id === state.editingId);
    if (!project) return;
    if (!window.confirm(`确定删除“${project.name} · ${project.planName}”吗？此操作无法撤销。`)) return;
    state.projects.forEach((item) => { item.dependsOn = item.dependsOn.filter((dependencyId) => dependencyId !== project.id); });
    state.projects = state.projects.filter((item) => item.id !== project.id);
    const saved = await saveProjects();
    closeProjectDialog();
    renderAll();
    if (saved) showToast("项目规划已删除并保存");
  }

  function openProjectDetail(id) {
    const project = state.projects.find((item) => item.id === id);
    if (!project) return;
    state.detailId = id;
    const analysis = analyzeProject(project);
    const status = getEffectiveStatus(project);
    const expected = getExpectedProgress(project);
    const gap = Number(project.progress) - expected;
    const milestones = (project.milestones || []).slice().sort((a, b) => parseDate(a.date) - parseDate(b.date));

    const dependencies = project.dependsOn.map((dependencyId) => state.projects.find((item) => item.id === dependencyId)).filter(Boolean);
    el.detailCode.textContent = `${project.category} · ${project.name} · ${project.code}`;
    el.detailName.textContent = project.planName;
    el.detailDialogBody.innerHTML = `
      <div class="detail-status-line">
        <span class="status-tag ${getStatusClass(status)}">${status}</span>
        <span class="priority-tag">${escapeHtml(project.priority)}优先级</span>
        <span class="category-tag">${escapeHtml(project.owner || "未指定负责人")}</span>
      </div>
      <section class="detail-section detail-hierarchy">
        <h3>三级归属</h3>
        <div class="hierarchy-path"><span>${escapeHtml(project.category)}</span><i>→</i><span>${escapeHtml(project.name)}</span><i>→</i><strong>${escapeHtml(project.planName)}</strong></div>
      </section>
      <section class="detail-section">
        <h3>关联系统</h3>
        <div class="system-chip-list">${getSystemNames(project).length ? getSystemNames(project).map((name) => `<span class="system-chip">${escapeHtml(name)}</span>`).join("") : '<span class="muted-chip">未关联系统</span>'}</div>
      </section>
      <section class="detail-section">
        <h3>前置依赖</h3>
        ${dependencies.length ? `<div class="detail-dependencies">${dependencies.map((dependency) => `<button type="button" data-open-dependency="${dependency.id}"><strong>${escapeHtml(dependency.name)} · ${escapeHtml(dependency.planName)}</strong><span>${escapeHtml(dependency.category)} · ${getEffectiveStatus(dependency)}</span></button>`).join("")}</div>` : '<p>无前置依赖，可独立推进。</p>'}
        ${project.dependencyNote ? `<p class="dependency-note">${escapeHtml(project.dependencyNote)}</p>` : ""}
      </section>
      <div class="detail-metrics">
        <div class="detail-metric"><span>实际进度</span><strong>${project.progress}%</strong></div>
        <div class="detail-metric"><span>时间预期</span><strong>${expected}%</strong></div>
        <div class="detail-metric"><span>进度偏差</span><strong>${gap > 0 ? "+" : ""}${gap}%</strong></div>
      </div>
      <section class="detail-section">
        <h3>计划周期</h3>
        <p>${formatDate(project.start)} 至 ${formatDate(project.end)} · 共 ${daysBetween(parseDate(project.start), parseDate(project.end)) + 1} 天</p>
      </section>
      <section class="detail-section">
        <h3>项目节点</h3>
        <div class="detail-milestones">
          ${milestones.length ? milestones.map((milestone) => {
            const late = milestone.status !== "已完成" && parseDate(milestone.date) < today();
            return `<div class="detail-milestone"><span class="detail-milestone-dot ${milestone.status === "已完成" ? "is-done" : late ? "is-late" : ""}"></span><strong>${escapeHtml(milestone.name)}</strong><small>${formatDate(milestone.date)} · ${escapeHtml(milestone.status)}</small></div>`;
          }).join("") : '<p>尚未设置节点</p>'}
        </div>
      </section>
      ${project.blockers ? `<section class="detail-section"><h3>延期 / 卡点</h3><div class="detail-alert">${escapeHtml(project.blockers)}</div></section>` : ""}
      <section class="detail-section">
        <h3>智能判断</h3>
        <p>${escapeHtml(analysis.reason.replace(/[。！？.!?]+$/u, ""))}。${escapeHtml(analysis.action)}</p>
      </section>
      <section class="detail-section">
        <h3>备注</h3>
        <p>${escapeHtml(project.notes || "暂无备注")}</p>
      </section>
    `;
    el.detailDialogBody.querySelectorAll("[data-open-dependency]").forEach((button) => button.addEventListener("click", () => {
      el.detailDialog.close();
      openProjectDetail(button.dataset.openDependency);
    }));
    el.detailDialog.showModal();
  }

  function renderReportPage() {
    if (!el.reportDate) return;
    if (!el.reportDate.value) el.reportDate.value = formatDateKey(today());
    renderReportProjectPicker();
    renderReportArchive();
    if (state.reportDraft) renderReportDraft();
  }

  function getReportProjectGroups() {
    const groups = [];
    state.categories.forEach((category) => {
      const categoryPlans = state.projects.filter((plan) => plan.categoryId === category.id);
      const byProject = groupBy(categoryPlans, (plan) => plan.name);
      const projects = Object.entries(byProject).map(([name, plans]) => ({
        key: `${category.id}::${name}`,
        category,
        name,
        plans: plans.sort((a, b) => parseDate(a.start) - parseDate(b.start))
      }));
      if (projects.length) groups.push({ category, projects });
    });
    return groups;
  }

  function renderReportProjectPicker() {
    const groups = getReportProjectGroups();
    const validKeys = new Set(groups.flatMap((group) => group.projects.map((project) => project.key)));
    if (state.reportSelectedKeys === null) state.reportSelectedKeys = new Set(validKeys);
    else state.reportSelectedKeys = new Set([...state.reportSelectedKeys].filter((key) => validKeys.has(key)));
    el.reportProjectPicker.innerHTML = groups.length ? groups.map((group) => `
      <section class="report-picker-category" style="--category-color:${group.category.color}">
        <div class="report-picker-category-title"><i></i><div><strong>${escapeHtml(group.category.name)}</strong><span>第一层分类 · ${group.projects.length} 个项目</span></div></div>
        <div class="report-picker-options">${group.projects.map((project) => `<label class="report-project-option"><input type="checkbox" data-report-project-key="${escapeAttr(project.key)}"${state.reportSelectedKeys.has(project.key) ? " checked" : ""}><span><strong>${escapeHtml(project.name)}</strong><small>第二层项目 · ${project.plans.length} 条规划</small></span></label>`).join("")}</div>
      </section>`).join("") : '<div class="report-picker-empty">暂无项目可供选择，请先在项目明细中建立规划。</div>';
    updateReportSelectionSummary();
  }

  function updateReportSelectionSummary() {
    const checked = [...el.reportProjectPicker.querySelectorAll("[data-report-project-key]:checked")];
    state.reportSelectedKeys = new Set(checked.map((input) => input.dataset.reportProjectKey));
    const planCount = getReportProjectGroups().flatMap((group) => group.projects).filter((project) => state.reportSelectedKeys.has(project.key)).reduce((sum, project) => sum + project.plans.length, 0);
    el.reportSelectionSummary.textContent = checked.length ? `已选择 ${checked.length} 个项目，将生成 ${planCount} 条规划明细` : "尚未选择项目";
  }

  function setAllReportProjects(selected) {
    el.reportProjectPicker.querySelectorAll("[data-report-project-key]").forEach((input) => { input.checked = selected; });
    updateReportSelectionSummary();
  }

  function generateReportDraft() {
    updateReportSelectionSummary();
    if (!state.reportSelectedKeys.size) return showToast("请至少选择一个汇报项目", true);
    const selectedProjects = getReportProjectGroups().flatMap((group) => group.projects).filter((project) => state.reportSelectedKeys.has(project.key));
    const rows = selectedProjects.flatMap((project) => project.plans.map((plan) => {
      const status = getEffectiveStatus(plan);
      const upcoming = (plan.milestones || []).filter((milestone) => milestone.status !== "已完成").sort((a, b) => parseDate(a.date) - parseDate(b.date))[0];
      const updateParts = [`${status}，当前进度 ${clamp(Number(plan.progress || 0), 0, 100)}%`];
      if (plan.notes) updateParts.push(plan.notes);
      if (upcoming) updateParts.push(`下一节点：${upcoming.name}（${formatChineseDate(upcoming.date)}）`);
      return normalizeReportRow({
        id: makeId(),
        planId: plan.id,
        categoryKey: plan.categoryId,
        projectKey: `${plan.categoryId}::${plan.name}`,
        category: plan.category,
        categoryColor: getCategoryColor(plan.category),
        project: plan.name,
        plan: plan.planName,
        targetDate: formatChineseDate(plan.end),
        progressText: updateParts.join("；"),
        blockerText: plan.blockers || "暂无卡点"
      });
    }));
    state.reportDraft = { reportDate: el.reportDate.value || formatDateKey(today()), rows };
    renderReportDraft();
    requestAnimationFrame(() => el.reportDraftSection.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  function getReportGroups(rows) {
    const categoryMap = new Map();
    rows.forEach((row) => {
      if (!categoryMap.has(row.categoryKey)) categoryMap.set(row.categoryKey, { key: row.categoryKey, name: row.category, color: row.categoryColor, projects: new Map() });
      const category = categoryMap.get(row.categoryKey);
      category.name = row.category;
      if (!category.projects.has(row.projectKey)) category.projects.set(row.projectKey, { key: row.projectKey, name: row.project, rows: [] });
      const project = category.projects.get(row.projectKey);
      project.name = row.project;
      project.rows.push(row);
    });
    return [...categoryMap.values()].map((category) => ({ ...category, projects: [...category.projects.values()] }));
  }

  function renderReportDraft() {
    const draft = state.reportDraft;
    el.reportDraftSection.hidden = !draft || !draft.rows.length;
    if (!draft || !draft.rows.length) return;
    el.reportBrandName.textContent = state.settings.brandName;
    el.reportSheetDate.textContent = `${formatLongChineseDate(draft.reportDate)} 汇报`;
    const groups = getReportGroups(draft.rows);
    el.reportTableBody.innerHTML = groups.map((category) => `
      <tr class="report-category-row" style="--category-color:${category.color}"><th colspan="5"><i></i><input data-report-field="category" data-report-scope="category" data-report-group-key="${escapeAttr(category.key)}" value="${escapeAttr(category.name)}" aria-label="分类名称"></th></tr>
      ${category.projects.map((project) => project.rows.map((row, index) => `
        <tr class="report-plan-row">
          ${index === 0 ? `<td class="report-project-cell" rowspan="${project.rows.length}"><span>第二层项目</span><textarea data-report-field="project" data-report-scope="project" data-report-group-key="${escapeAttr(project.key)}" aria-label="项目名称">${escapeHtml(project.name)}</textarea></td>` : ""}
          <td><span class="report-cell-level">第三层规划</span><textarea data-report-row-id="${row.id}" data-report-field="plan" aria-label="规划内容">${escapeHtml(row.plan)}</textarea></td>
          <td><textarea class="report-date-editor" data-report-row-id="${row.id}" data-report-field="targetDate" aria-label="计划时间">${escapeHtml(row.targetDate)}</textarea></td>
          <td><textarea data-report-row-id="${row.id}" data-report-field="progressText" aria-label="最新进展">${escapeHtml(row.progressText)}</textarea></td>
          <td class="${row.blockerText && row.blockerText !== "暂无卡点" ? "has-blocker" : ""}"><textarea data-report-row-id="${row.id}" data-report-field="blockerText" aria-label="卡点或风险">${escapeHtml(row.blockerText)}</textarea></td>
        </tr>`).join("")).join("")}`).join("");
    el.reportTableBody.querySelectorAll("textarea").forEach(resizeReportEditor);
  }

  function updateReportDraftFromEditor(event) {
    if (!state.reportDraft) return;
    const field = event.target.dataset.reportField;
    if (!field) return;
    if (event.target.tagName === "TEXTAREA") resizeReportEditor(event.target);
    const value = event.target.value.slice(0, 500);
    if (event.target.dataset.reportScope === "category") {
      state.reportDraft.rows.filter((row) => row.categoryKey === event.target.dataset.reportGroupKey).forEach((row) => { row.category = value; });
      return;
    }
    if (event.target.dataset.reportScope === "project") {
      state.reportDraft.rows.filter((row) => row.projectKey === event.target.dataset.reportGroupKey).forEach((row) => { row.project = value; });
      return;
    }
    const row = state.reportDraft.rows.find((item) => item.id === event.target.dataset.reportRowId);
    if (row && ["plan", "targetDate", "progressText", "blockerText"].includes(field)) row[field] = value;
  }

  function resizeReportEditor(editor) {
    editor.style.height = "auto";
    editor.style.height = `${Math.max(58, editor.scrollHeight)}px`;
  }

  async function saveReportImage() {
    if (!state.reportDraft || !state.reportDraft.rows.length) return showToast("请先生成汇报内容", true);
    el.saveReportImageButton.disabled = true;
    el.saveReportImageButton.textContent = "正在生成图片...";
    try {
      const canvas = createReportCanvas(state.reportDraft);
      const blob = await new Promise((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("图片生成失败")), "image/png"));
      const id = makeId();
      const savedAt = new Date().toISOString();
      let imagePath = "";
      let imageData = "";
      if (state.persistenceMode === "file") imagePath = await uploadReportImage(blob, id);
      else imageData = canvas.toDataURL("image/png");
      const record = normalizeReports([{ id, reportDate: state.reportDraft.reportDate, savedAt, imagePath, imageData, rows: state.reportDraft.rows }])[0];
      state.reports.unshift(record);
      const saved = await saveProjects();
      if (!saved) {
        state.reports = state.reports.filter((report) => report.id !== id);
        if (imagePath) await deleteReportImageFile(imagePath);
        throw new Error("汇报记录未能写入数据文件");
      }
      downloadBlob(blob, `项目周会汇报-${state.reportDraft.reportDate}.png`);
      renderReportArchive();
      showToast("汇报图片已下载并归档");
    } catch (error) {
      console.error("Unable to save report image", error);
      showToast(`保存失败：${error.message}`, true);
    } finally {
      el.saveReportImageButton.disabled = false;
      el.saveReportImageButton.textContent = "保存图片并归档";
    }
  }

  async function uploadReportImage(blob, id) {
    const response = await fetch(`/api/report-images/${encodeURIComponent(id)}`, { method: "POST", headers: { "Content-Type": "image/png" }, body: blob });
    if (!response.ok) throw new Error(`图片服务返回 ${response.status}`);
    const payload = await response.json();
    return payload.path;
  }

  async function deleteReportImageFile(imagePath) {
    if (!imagePath || state.persistenceMode !== "file") return;
    try {
      await fetch(`/api/report-images?path=${encodeURIComponent(imagePath)}`, { method: "DELETE" });
    } catch (error) {
      console.warn("Unable to remove archived report image", error);
    }
  }

  function renderReportArchive() {
    if (!el.reportArchiveList) return;
    el.reportArchiveCount.textContent = `${state.reports.length} 份记录`;
    if (!state.reports.length) {
      el.reportArchiveList.innerHTML = '<div class="report-archive-empty"><strong>暂无历史汇报</strong><span>生成并保存第一份周会汇报后会显示在这里。</span></div>';
      return;
    }
    el.reportArchiveList.innerHTML = state.reports.map((report) => {
      const imageSource = report.imagePath ? `${report.imagePath}?v=${encodeURIComponent(report.savedAt)}` : report.imageData;
      const projectCount = new Set(report.rows.map((row) => row.projectKey)).size;
      return `<article class="report-archive-card"><button class="report-image-preview" type="button" data-download-report="${report.id}" aria-label="下载 ${escapeAttr(report.reportDate)} 汇报图片"><img src="${escapeAttr(imageSource)}" alt="${escapeAttr(report.reportDate)} 项目周会汇报"></button><div class="report-archive-meta"><div><strong>${formatLongChineseDate(report.reportDate)} 周会汇报</strong><span>${projectCount} 个项目 · ${report.rows.length} 条规划</span><small>保存于 ${formatSavedTime(report.savedAt)}</small></div><div><button class="button button-quiet" type="button" data-download-report="${report.id}">下载图片</button><button class="button button-danger-text" type="button" data-delete-report="${report.id}">删除记录</button></div></div></article>`;
    }).join("");
  }

  async function handleReportArchiveClick(event) {
    const downloadButton = event.target.closest("[data-download-report]");
    if (downloadButton) {
      const report = state.reports.find((item) => item.id === downloadButton.dataset.downloadReport);
      if (!report) return;
      const anchor = document.createElement("a");
      anchor.href = report.imagePath || report.imageData;
      anchor.download = `项目周会汇报-${report.reportDate}.png`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      return;
    }
    const deleteButton = event.target.closest("[data-delete-report]");
    if (!deleteButton) return;
    const report = state.reports.find((item) => item.id === deleteButton.dataset.deleteReport);
    if (!report || !window.confirm(`确定删除 ${formatLongChineseDate(report.reportDate)} 的汇报记录吗？`)) return;
    const previous = [...state.reports];
    state.reports = state.reports.filter((item) => item.id !== report.id);
    const saved = await saveProjects();
    if (!saved) {
      state.reports = previous;
      return;
    }
    await deleteReportImageFile(report.imagePath);
    renderReportArchive();
    showToast("汇报记录已删除");
  }

  function createReportCanvas(draft) {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    const width = 1600;
    const margin = 40;
    const columns = [230, 480, 170, 390, 250];
    const groups = getReportGroups(draft.rows);
    context.font = '24px "Microsoft YaHei", "PingFang SC", sans-serif';
    groups.forEach((category) => category.projects.forEach((project) => project.rows.forEach((row) => {
      row._canvasHeight = Math.max(70,
        getCanvasLines(context, row.plan, columns[1] - 24).length * 29 + 24,
        getCanvasLines(context, row.targetDate, columns[2] - 24).length * 29 + 24,
        getCanvasLines(context, row.progressText, columns[3] - 24).length * 29 + 24,
        getCanvasLines(context, row.blockerText, columns[4] - 24).length * 29 + 24);
    })));
    const tableHeight = 54 + groups.reduce((total, category) => total + 46 + category.projects.reduce((projectTotal, project) => projectTotal + project.rows.reduce((rowTotal, row) => rowTotal + row._canvasHeight, 0), 0), 0);
    canvas.width = width;
    canvas.height = 165 + tableHeight + 70;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#17211f";
    context.font = '700 34px "Microsoft YaHei", "PingFang SC", sans-serif';
    context.fillText(`${state.settings.brandName} · 项目进展周会汇报`, margin, 58);
    context.fillStyle = "#52605d";
    context.font = '20px "Microsoft YaHei", "PingFang SC", sans-serif';
    context.fillText(`汇报日期：${formatLongChineseDate(draft.reportDate)}`, margin, 96);
    context.textAlign = "right";
    context.fillText(`生成时间：${formatSavedTime(new Date().toISOString())}`, width - margin, 96);
    context.textAlign = "left";
    let y = 125;
    const headers = ["项目", "规划 / 功能改造", "计划时间", "最新进展", "卡点 / 风险"];
    let x = margin;
    headers.forEach((header, index) => {
      drawCanvasCell(context, x, y, columns[index], 54, header, { fill: "#0877b7", color: "#ffffff", weight: 700, align: "center", fontSize: 22 });
      x += columns[index];
    });
    y += 54;
    groups.forEach((category) => {
      drawCanvasCell(context, margin, y, columns.reduce((sum, value) => sum + value, 0), 46, category.name, { fill: rgbaFromHex(category.color, 0.17), color: "#17211f", weight: 700, fontSize: 22, accent: category.color });
      y += 46;
      category.projects.forEach((project) => {
        const projectHeight = project.rows.reduce((sum, row) => sum + row._canvasHeight, 0);
        drawCanvasCell(context, margin, y, columns[0], projectHeight, project.name, { fill: "#dfe8f7", color: "#17211f", weight: 700, align: "center", fontSize: 23 });
        let rowY = y;
        project.rows.forEach((row) => {
          const risky = row.blockerText && row.blockerText !== "暂无卡点";
          const complete = row.progressText.startsWith("已完成");
          const rowFill = risky ? "#fff4e7" : complete ? "#e7f3df" : "#ffffff";
          let rowX = margin + columns[0];
          [row.plan, row.targetDate, row.progressText, row.blockerText].forEach((text, index) => {
            drawCanvasCell(context, rowX, rowY, columns[index + 1], row._canvasHeight, text, { fill: rowFill, color: "#17211f", fontSize: 21, align: index === 1 ? "center" : "left" });
            rowX += columns[index + 1];
          });
          rowY += row._canvasHeight;
        });
        y += projectHeight;
      });
    });
    context.fillStyle = "#7b8885";
    context.font = '17px "Microsoft YaHei", "PingFang SC", sans-serif';
    context.fillText("本报告由项目管理系统生成，内容以保存时的可编辑快照为准。", margin, canvas.height - 28);
    draft.rows.forEach((row) => { delete row._canvasHeight; });
    return canvas;
  }

  function drawCanvasCell(context, x, y, width, height, text, options = {}) {
    context.fillStyle = options.fill || "#ffffff";
    context.fillRect(x, y, width, height);
    if (options.accent) {
      context.fillStyle = options.accent;
      context.fillRect(x, y, 8, height);
    }
    context.strokeStyle = "#9aa8a5";
    context.lineWidth = 1;
    context.strokeRect(x + 0.5, y + 0.5, width - 1, height - 1);
    const fontSize = options.fontSize || 21;
    context.font = `${options.weight || 400} ${fontSize}px "Microsoft YaHei", "PingFang SC", sans-serif`;
    context.fillStyle = options.color || "#17211f";
    const lines = getCanvasLines(context, String(text || ""), width - 24);
    const lineHeight = fontSize + 8;
    let textY = options.align === "center" ? y + Math.max(12, (height - lines.length * lineHeight) / 2) + fontSize : y + 12 + fontSize;
    lines.forEach((line) => {
      if (options.align === "center") {
        context.textAlign = "center";
        context.fillText(line, x + width / 2, textY);
      } else {
        context.textAlign = "left";
        context.fillText(line, x + 12, textY);
      }
      textY += lineHeight;
    });
    context.textAlign = "left";
  }

  function getCanvasLines(context, value, maxWidth) {
    const lines = [];
    String(value || "").split(/\r?\n/).forEach((paragraph) => {
      if (!paragraph) {
        lines.push("");
        return;
      }
      let line = "";
      [...paragraph].forEach((character) => {
        const candidate = line + character;
        if (line && context.measureText(candidate).width > maxWidth) {
          lines.push(line);
          line = character;
        } else line = candidate;
      });
      if (line) lines.push(line);
    });
    return lines.length ? lines : [""];
  }

  function rgbaFromHex(hex, alpha) {
    const value = String(hex || "#0d766e").replace("#", "");
    const number = Number.parseInt(value, 16);
    return `rgba(${(number >> 16) & 255}, ${(number >> 8) & 255}, ${number & 255}, ${alpha})`;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function formatChineseDate(value) {
    const date = parseDate(value);
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  }

  function formatLongChineseDate(value) {
    const date = parseDate(value);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  }

  function formatSavedTime(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "时间未知" : date.toLocaleString("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false });
  }

  function populateCategoryControls() {
    const categories = state.categories.map((category) => category.name);
    const previous = el.ganttCategory.value || "all";
    el.ganttCategory.innerHTML = '<option value="all">全部分类</option>' + categories.map((category) => `<option value="${escapeAttr(category)}">${escapeHtml(category)}</option>`).join("");
    el.ganttCategory.value = categories.includes(previous) ? previous : "all";
    const currentCategoryId = el.projectCategorySelect.value;
    el.projectCategorySelect.innerHTML = state.categories.length ? '<option value="">请选择分类</option>' + state.categories.map((category) => `<option value="${category.id}">${escapeHtml(category.name)}</option>`).join("") : '<option value="">请先在后台管理添加分类</option>';
    if (state.categories.some((category) => category.id === currentCategoryId)) el.projectCategorySelect.value = currentCategoryId;
  }

  function exportProjects() {
    const payload = {
      app: state.settings.brandName,
      version: 3,
      exportedAt: new Date().toISOString(),
      settings: state.settings,
      categories: state.categories,
      systems: state.systems,
      projects: state.projects,
      reports: state.reports.map((report) => ({ ...report, imageData: report.imageData || "" }))
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `项目数据-${formatDateKey(today())}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    showToast("项目数据已导出");
  }

  function importProjects(event) {
    const file = event.target.files && event.target.files[0];
    event.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(reader.result);
        const projects = Array.isArray(parsed) ? parsed : parsed.projects;
        if (!Array.isArray(projects)) throw new Error("文件中没有 projects 数组");
        const normalized = projects.map(normalizeProject).filter((project) => project.name && project.code && project.start && project.end);
        if (!normalized.length && projects.length) throw new Error("没有可识别的项目记录");
        if (!window.confirm(`将用文件中的 ${normalized.length} 个项目替换当前数据，是否继续？`)) return;
        state.projects = normalized;
        if (!Array.isArray(parsed)) {
          state.settings = normalizeSettings(parsed.settings || state.settings);
          state.categories = normalizeCategories(parsed.categories);
          state.systems = normalizeSystems(parsed.systems);
          if (Array.isArray(parsed.reports)) state.reports = normalizeReports(parsed.reports);
        }
        reconcileCatalogs();
        const saved = await saveProjects();
        applyDisplaySettings();
        renderAll();
        if (saved) showToast(`已导入并保存 ${normalized.length} 个项目`);
      } catch (error) {
        showToast(`导入失败：${error.message}`, true);
      }
    };
    reader.onerror = () => showToast("读取文件失败", true);
    reader.readAsText(file, "utf-8");
  }

  async function loadProjects() {
    if (location.protocol === "http:" || location.protocol === "https:") {
      try {
        const response = await fetch("/api/projects", { cache: "no-store" });
        if (response.ok) {
          const payload = await response.json();
          const hasProjects = Array.isArray(payload.projects);
          return {
            projects: hasProjects ? payload.projects.map(normalizeProject) : buildDemoProjects(),
            settings: payload.settings,
            categories: payload.categories,
            systems: payload.systems,
            reports: payload.reports,
            mode: "file",
            available: true,
            dataFileLabel: payload.dataFile || "data/projects.json",
            savedAt: payload.savedAt || null,
            needsInitialSave: !hasProjects || Number(payload.version || 1) < 3
          };
        }
      } catch (error) {
        console.warn("File data service is unavailable; using browser storage", error);
      }
    }

    const browserAvailable = verifyStorage();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) || Array.isArray(parsed.projects)) {
          return {
            projects: (Array.isArray(parsed) ? parsed : parsed.projects).map(normalizeProject),
            settings: Array.isArray(parsed) ? null : parsed.settings,
            categories: Array.isArray(parsed) ? null : parsed.categories,
            systems: Array.isArray(parsed) ? null : parsed.systems,
            reports: Array.isArray(parsed) ? null : parsed.reports,
            mode: "browser",
            available: browserAvailable,
            savedAt: localStorage.getItem(SAVED_AT_KEY),
            needsInitialSave: false
          };
        }
      }
    } catch (error) {
      console.warn("Unable to load saved projects", error);
    }
    return {
      projects: buildDemoProjects(),
      settings: null,
      categories: null,
      systems: null,
      reports: null,
      mode: "browser",
      available: browserAvailable,
      savedAt: null,
      needsInitialSave: browserAvailable
    };
  }

  function saveProjects() {
    const run = () => performSaveProjects();
    state.saveQueue = state.saveQueue.then(run, run);
    return state.saveQueue;
  }

  async function performSaveProjects() {
    if (state.persistenceMode === "file") {
      try {
        const savedAt = new Date().toISOString();
        const response = await fetch("/api/projects", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ version: 3, savedAt, settings: state.settings, categories: state.categories, systems: state.systems, projects: state.projects, reports: state.reports })
        });
        if (!response.ok) throw new Error(`数据服务返回 ${response.status}`);
        const verificationResponse = await fetch("/api/projects", { cache: "no-store" });
        if (!verificationResponse.ok) throw new Error("数据文件回读失败");
        const verification = await verificationResponse.json();
        if (JSON.stringify(verification.projects) !== JSON.stringify(state.projects)) {
          throw new Error("数据文件回读校验不一致");
        }
        if (JSON.stringify(verification.settings) !== JSON.stringify(state.settings) || JSON.stringify(verification.categories) !== JSON.stringify(state.categories) || JSON.stringify(verification.systems) !== JSON.stringify(state.systems) || JSON.stringify(verification.reports || []) !== JSON.stringify(state.reports)) throw new Error("后台配置或汇报记录回读校验不一致");
        state.storageAvailable = true;
        state.dataFileLabel = verification.dataFile || state.dataFileLabel || "data/projects.json";
        writeBrowserBackup(savedAt);
        updateStorageState(savedAt);
        return true;
      } catch (error) {
        console.error("Unable to save projects to the data file", error);
        state.storageAvailable = false;
        updateStorageState();
        showToast("数据文件保存失败，请保持启动窗口运行并重试", true);
        return false;
      }
    }

    if (!state.storageAvailable) {
      updateStorageState();
      showToast("当前浏览器不允许本地保存，请导出 JSON 备份", true);
      return false;
    }
    try {
      const serialized = JSON.stringify({ version: 3, settings: state.settings, categories: state.categories, systems: state.systems, projects: state.projects, reports: state.reports });
      localStorage.setItem(STORAGE_KEY, serialized);
      if (localStorage.getItem(STORAGE_KEY) !== serialized) throw new Error("本地数据回读校验失败");
      const savedAt = new Date().toISOString();
      localStorage.setItem(SAVED_AT_KEY, savedAt);
      state.storageAvailable = true;
      updateStorageState(savedAt);
      return true;
    } catch (error) {
      state.storageAvailable = false;
      updateStorageState();
      showToast("浏览器存储空间不足，数据未能保存", true);
      return false;
    }
  }

  function writeBrowserBackup(savedAt) {
    if (!verifyStorage()) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 3, settings: state.settings, categories: state.categories, systems: state.systems, projects: state.projects, reports: state.reports }));
      localStorage.setItem(SAVED_AT_KEY, savedAt);
    } catch (_) {
      // The data file remains the primary source when browser backup is unavailable.
    }
  }

  function verifyStorage() {
    try {
      const key = `${STORAGE_KEY}.probe`;
      localStorage.setItem(key, "ok");
      const writable = localStorage.getItem(key) === "ok";
      localStorage.removeItem(key);
      return writable;
    } catch (_) {
      return false;
    }
  }

  function updateStorageState(value) {
    el.storageState.classList.toggle("is-error", !state.storageAvailable);
    if (state.persistenceMode === "file") {
      el.storageStatusText.textContent = state.storageAvailable ? `已保存到 ${state.dataFileLabel || "data/projects.json"}` : "数据文件保存失败";
    } else {
      el.storageStatusText.textContent = state.storageAvailable ? "已自动保存到浏览器" : "浏览器保存不可用";
    }
    if (!state.storageAvailable) {
      el.lastSaved.textContent = state.persistenceMode === "file" ? "请保持启动窗口运行" : "请使用导出功能备份";
      return;
    }
    let savedAt = value;
    if (!savedAt) {
      try { savedAt = localStorage.getItem(SAVED_AT_KEY); } catch (_) { savedAt = null; }
    }
    if (!savedAt) {
      el.lastSaved.textContent = "等待首次保存";
      return;
    }
    const date = new Date(savedAt);
    const prefix = state.persistenceMode === "file" ? "文件保存" : "上次保存";
    el.lastSaved.textContent = `${prefix} ${date.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`;
  }

  function buildDemoProjects() {
    const base = today();
    const year = base.getFullYear();
    return [
      {
        id: makeId(), code: `P${year}-001`, name: "智能仓储改造", category: "数字化建设", owner: "陈晨", priority: "高",
        start: formatDateKey(addDays(base, -51)), end: formatDateKey(addDays(base, 55)), progress: 54, status: "有风险",
        blockers: "仓储设备接口协议尚未由供应商确认，联调排期存在不确定性。",
        notes: "本周完成接口清单评审，并与供应商锁定联调窗口。",
        milestones: [
          { id: makeId(), name: "需求冻结", date: formatDateKey(addDays(base, -34)), status: "已完成" },
          { id: makeId(), name: "设备到场", date: formatDateKey(addDays(base, 8)), status: "进行中" },
          { id: makeId(), name: "系统联调", date: formatDateKey(addDays(base, 31)), status: "未开始" },
          { id: makeId(), name: "试运行", date: formatDateKey(addDays(base, 48)), status: "未开始" }
        ]
      },
      {
        id: makeId(), code: `P${year}-002`, name: "会员增长小程序", category: "产品研发", owner: "林晓", priority: "高",
        start: formatDateKey(addDays(base, -32)), end: formatDateKey(addDays(base, 40)), progress: 72, status: "进行中",
        blockers: "", notes: "核心链路已进入灰度，等待第二批种子用户反馈。",
        milestones: [
          { id: makeId(), name: "交互定稿", date: formatDateKey(addDays(base, -24)), status: "已完成" },
          { id: makeId(), name: "灰度发布", date: formatDateKey(addDays(base, -3)), status: "已完成" },
          { id: makeId(), name: "全量上线", date: formatDateKey(addDays(base, 18)), status: "未开始" }
        ]
      },
      {
        id: makeId(), code: `P${year}-003`, name: "华东体验中心开业", category: "市场活动", owner: "赵敏", priority: "高",
        start: formatDateKey(addDays(base, -70)), end: formatDateKey(addDays(base, -3)), progress: 92, status: "已延期",
        blockers: "消防验收较原计划延后，开业物料只能在验收完成后进场。",
        notes: "已准备两套开业日期方案，待验收结果后最终确认。",
        milestones: [
          { id: makeId(), name: "空间设计", date: formatDateKey(addDays(base, -55)), status: "已完成" },
          { id: makeId(), name: "施工完成", date: formatDateKey(addDays(base, -13)), status: "已完成" },
          { id: makeId(), name: "消防验收", date: formatDateKey(addDays(base, -5)), status: "进行中" },
          { id: makeId(), name: "正式开业", date: formatDateKey(addDays(base, 7)), status: "未开始" }
        ]
      },
      {
        id: makeId(), code: `P${year}-004`, name: "供应商准入优化", category: "运营优化", owner: "周远", priority: "中",
        start: formatDateKey(addDays(base, -6)), end: formatDateKey(addDays(base, 70)), progress: 12, status: "进行中",
        blockers: "", notes: "先从高频采购品类试点，验证后再覆盖全部供应商。",
        milestones: [
          { id: makeId(), name: "流程盘点", date: formatDateKey(addDays(base, 9)), status: "进行中" },
          { id: makeId(), name: "试点上线", date: formatDateKey(addDays(base, 37)), status: "未开始" },
          { id: makeId(), name: "全面启用", date: formatDateKey(addDays(base, 65)), status: "未开始" }
        ]
      },
      {
        id: makeId(), code: `P${year}-005`, name: "数据中台一期", category: "数字化建设", owner: "陈晨", priority: "中",
        start: formatDateKey(addDays(base, -112)), end: formatDateKey(addDays(base, -21)), progress: 100, status: "已完成",
        blockers: "", notes: "一期范围已完成验收，二期需求进入价值评估。",
        milestones: [
          { id: makeId(), name: "数据治理", date: formatDateKey(addDays(base, -72)), status: "已完成" },
          { id: makeId(), name: "指标平台", date: formatDateKey(addDays(base, -43)), status: "已完成" },
          { id: makeId(), name: "一期验收", date: formatDateKey(addDays(base, -21)), status: "已完成" }
        ]
      },
      {
        id: makeId(), code: `P${year}-006`, name: "秋季招商大会", category: "市场活动", owner: "赵敏", priority: "中",
        start: formatDateKey(addDays(base, -20)), end: formatDateKey(addDays(base, 22)), progress: 45, status: "进行中",
        blockers: "主论坛嘉宾档期尚未最终确认。", notes: "招商签约目标 35 家，目前已确认 21 家。",
        milestones: [
          { id: makeId(), name: "场地确认", date: formatDateKey(addDays(base, -15)), status: "已完成" },
          { id: makeId(), name: "嘉宾确认", date: formatDateKey(addDays(base, 5)), status: "进行中" },
          { id: makeId(), name: "活动举办", date: formatDateKey(addDays(base, 22)), status: "未开始" }
        ]
      }
    ].map(normalizeProject);
  }

  function normalizeProject(input) {
    const start = isDateKey(input && input.start) ? input.start : formatDateKey(today());
    let end = isDateKey(input && input.end) ? input.end : formatDateKey(addDays(parseDate(start), 30));
    if (parseDate(end) < parseDate(start)) end = start;
    const statuses = ["未开始", "进行中", "有风险", "已延期", "已完成"];
    const milestoneStatuses = ["未开始", "进行中", "已完成"];
    return {
      id: String(input && input.id || makeId()),
      code: String(input && input.code || generateProjectCode()).slice(0, 24),
      name: String(input && input.name || "未命名项目").slice(0, 60),
      planName: String(input && input.planName || "整体规划").slice(0, 60),
      categoryId: String(input && input.categoryId || ""),
      category: String(input && input.category || "未分类").slice(0, 30),
      owner: String(input && input.owner || "").slice(0, 20),
      priority: ["高", "中", "低"].includes(input && input.priority) ? input.priority : "中",
      start,
      end,
      progress: clamp(Number(input && input.progress || 0), 0, 100),
      status: statuses.includes(input && input.status) ? input.status : "未开始",
      blockers: String(input && input.blockers || "").slice(0, 300),
      notes: String(input && input.notes || "").slice(0, 500),
      dependencyNote: String(input && input.dependencyNote || "").slice(0, 300),
      systemIds: Array.isArray(input && input.systemIds) ? input.systemIds.map(String) : [],
      dependsOn: Array.isArray(input && input.dependsOn) ? input.dependsOn.map(String) : [],
      milestones: Array.isArray(input && input.milestones) ? input.milestones.map((milestone) => ({
        id: String(milestone && milestone.id || makeId()),
        name: String(milestone && milestone.name || "").slice(0, 40),
        date: isDateKey(milestone && milestone.date) ? milestone.date : start,
        status: milestoneStatuses.includes(milestone && milestone.status) ? milestone.status : "未开始"
      })).filter((milestone) => milestone.name) : []
    };
  }

  function dependencyReaches(startId, targetId, visited = new Set()) {
    if (startId === targetId) return true;
    if (visited.has(startId)) return false;
    visited.add(startId);
    const plan = state.projects.find((item) => item.id === startId);
    return Boolean(plan && plan.dependsOn.some((dependencyId) => dependencyReaches(dependencyId, targetId, visited)));
  }

  function getSystemNames(project) {
    return (project.systemIds || []).map((id) => state.systems.find((system) => system.id === id)).filter(Boolean).map((system) => system.name);
  }

  function getEffectiveStatus(project) {
    const progress = Number(project.progress || 0);
    if (progress >= 100 || project.status === "已完成") return "已完成";
    if (parseDate(project.end) < today() || project.status === "已延期") return "已延期";
    const overdueMilestone = (project.milestones || []).some((milestone) => milestone.status !== "已完成" && parseDate(milestone.date) < today());
    if ((project.blockers || "").trim() || overdueMilestone || getExpectedProgress(project) - progress > 15 || project.status === "有风险") return "有风险";
    if (parseDate(project.start) > today() || project.status === "未开始") return "未开始";
    return "进行中";
  }

  function analyzeProject(project) {
    const status = getEffectiveStatus(project);
    const expected = getExpectedProgress(project);
    const gap = Math.max(0, expected - Number(project.progress || 0));
    const overdueDays = Math.max(0, daysBetween(parseDate(project.end), today()));
    const overdueMilestones = (project.milestones || []).filter((milestone) => milestone.status !== "已完成" && parseDate(milestone.date) < today());
    if (status === "已延期") {
      return { level: "danger", reason: `已超过计划完成日 ${overdueDays} 天`, shortLabel: `延期 ${overdueDays} 天`, action: "建议立即确认新的可交付日期，并拆出恢复计划。" };
    }
    if ((project.blockers || "").trim()) {
      return { level: "warning", reason: project.blockers, shortLabel: "存在卡点", action: "建议明确卡点责任人、解除条件和最晚处理日期。" };
    }
    if (overdueMilestones.length) {
      return { level: "warning", reason: `${overdueMilestones.length} 个节点已过期未完成`, shortLabel: "节点逾期", action: "建议更新节点状态，或将依赖影响同步到整体计划。" };
    }
    if (gap > 15) {
      return { level: "warning", reason: `实际进度比时间计划落后 ${Math.round(gap)} 个百分点`, shortLabel: `落后 ${Math.round(gap)}%`, action: "建议核对剩余工作量与资源，必要时调整范围或排期。" };
    }
    if (status === "已完成") {
      return { level: "good", reason: "项目已完成", shortLabel: "已完成", action: "建议补充复盘和关键经验，供后续项目复用。" };
    }
    if (status === "未开始") {
      return { level: "neutral", reason: "项目尚未进入计划开始日", shortLabel: "待启动", action: "建议在开始前确认负责人、首个节点和关键依赖。" };
    }
    return { level: "good", reason: "实际进度与时间计划基本匹配", shortLabel: "按计划", action: "继续按节点推进，并在发生偏差时及时记录卡点。" };
  }

  function getExpectedProgress(project) {
    const start = parseDate(project.start);
    const end = parseDate(project.end);
    const now = today();
    if (now <= start) return 0;
    if (now >= end) return 100;
    const total = Math.max(1, daysBetween(start, end));
    return clamp(Math.round(daysBetween(start, now) / total * 100), 0, 100);
  }

  function getHealthSummary(health, delayed, risk, total) {
    if (!total) return "新建项目后，这里会自动分析整体健康度。";
    if (health >= 90) return "项目组合整体稳定，继续保持节点复核节奏。";
    if (health >= 75) return `${risk + delayed} 个项目需要关注，整体仍处于可控范围。`;
    if (delayed) return `${delayed} 个项目已经延期，需要优先确认恢复计划。`;
    return "项目风险较集中，建议尽快检查关键节点与资源安排。";
  }

  function getTimelineRange(projects) {
    const dates = [];
    projects.forEach((project) => {
      dates.push(parseDate(project.start), parseDate(project.end));
      (project.milestones || []).forEach((milestone) => dates.push(parseDate(milestone.date)));
    });
    const min = new Date(Math.min(...dates.map((date) => date.getTime())));
    const max = new Date(Math.max(...dates.map((date) => date.getTime()), today().getTime()));
    return { start: addDays(min, -7), end: addDays(max, 14) };
  }

  function getUpcomingMilestones(projects, dayCount) {
    const now = today();
    const limit = addDays(now, dayCount);
    const items = [];
    projects.forEach((project) => {
      (project.milestones || []).forEach((milestone) => {
        const date = parseDate(milestone.date);
        if (milestone.status !== "已完成" && date >= now && date <= limit) items.push({ project, milestone });
      });
    });
    return items.sort((a, b) => parseDate(a.milestone.date) - parseDate(b.milestone.date));
  }

  function getOverdueMilestoneCount(projects) {
    return projects.reduce((count, project) => count + (project.milestones || []).filter((milestone) => milestone.status !== "已完成" && parseDate(milestone.date) < today()).length, 0);
  }

  function generateProjectCode() {
    const year = today().getFullYear();
    const pattern = new RegExp(`^P${year}-(\\d+)$`, "i");
    const max = state.projects.reduce((value, project) => {
      const match = String(project.code || "").match(pattern);
      return match ? Math.max(value, Number(match[1])) : value;
    }, 0);
    return `P${year}-${String(max + 1).padStart(3, "0")}`;
  }

  function getCategoryColor(category, fallbackIndex) {
    const configured = state.categories.find((item) => item.name === category);
    if (configured) return configured.color;
    let hash = 0;
    String(category || "").split("").forEach((char) => { hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0; });
    return CATEGORY_COLORS[Math.abs(hash + (fallbackIndex || 0)) % CATEGORY_COLORS.length];
  }

  function getStatusClass(status) {
    return {
      "未开始": "status-not-started",
      "进行中": "status-active",
      "有风险": "status-risk",
      "已延期": "status-delayed",
      "已完成": "status-complete"
    }[status] || "status-not-started";
  }

  function riskRank(analysis) {
    return analysis.level === "danger" ? 0 : analysis.level === "warning" ? 1 : 2;
  }

  function groupBy(items, keyFn) {
    return items.reduce((groups, item) => {
      const key = keyFn(item);
      (groups[key] ||= []).push(item);
      return groups;
    }, {});
  }

  function countBy(items, keyFn) {
    return items.reduce((counts, item) => {
      const key = keyFn(item);
      counts[key] = (counts[key] || 0) + 1;
      return counts;
    }, {});
  }

  function updateTodayLabel() {
    const now = new Date();
    el.todayLabel.textContent = now.toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric", weekday: "short" });
  }

  function today() {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }

  function parseDate(value) {
    if (value instanceof Date) {
      const copy = new Date(value);
      copy.setHours(0, 0, 0, 0);
      return copy;
    }
    const [year, month, day] = String(value || "").split("-").map(Number);
    const date = new Date(year || 1970, (month || 1) - 1, day || 1);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  function addDays(value, amount) {
    const date = parseDate(value);
    date.setDate(date.getDate() + amount);
    return date;
  }

  function daysBetween(start, end) {
    return Math.round((parseDate(end) - parseDate(start)) / DAY_MS);
  }

  function sameDay(a, b) {
    return formatDateKey(a) === formatDateKey(b);
  }

  function formatDate(value) {
    return parseDate(value).toLocaleDateString("zh-CN", { year: "numeric", month: "short", day: "numeric" });
  }

  function formatShortDate(value) {
    const date = parseDate(value);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  }

  function formatRelativeDate(value) {
    const diff = daysBetween(today(), parseDate(value));
    if (diff === 0) return "今天";
    if (diff === 1) return "明天";
    if (diff > 1) return `${diff} 天后`;
    return `${Math.abs(diff)} 天前`;
  }

  function formatDateKey(value) {
    const date = parseDate(value);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function isDateKey(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) && !Number.isNaN(parseDate(value).getTime());
  }

  function getWeekNumber(value) {
    const date = new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
    const day = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date - yearStart) / DAY_MS) + 1) / 7);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function makeId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") return window.crypto.randomUUID();
    return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeAttr(value) {
    return escapeHtml(value).replaceAll("`", "&#096;");
  }

  function showToast(message, isError) {
    const toast = document.createElement("div");
    toast.className = `toast${isError ? " is-error" : ""}`;
    toast.setAttribute("role", isError ? "alert" : "status");
    toast.textContent = message;
    el.toastRegion.appendChild(toast);
    window.setTimeout(() => toast.remove(), 3200);
  }
})();
