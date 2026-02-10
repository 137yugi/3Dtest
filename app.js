(() => {
  const data = window.MAP_PORTAL_DATA;

  if (!window.maplibregl || !data) {
    console.error("MapLibre またはデータが読み込めていません。");
    return;
  }

  const STORAGE_KEY = "mapPortal.settings.v2";
  const CUSTOM_DATA_STORAGE_KEY = "mapPortal.customData.v1";
  const SOURCE_ID = "locations-source";
  const FILL_LAYER_ID = "locations-fill";
  const LINE_LAYER_ID = "locations-line";
  const POINT_LAYER_ID = "locations-point";

  const tags = Array.isArray(data.tags) ? [...data.tags] : [];
  const locations = {
    type: "FeatureCollection",
    features: Array.isArray(data.locations && data.locations.features)
      ? [...data.locations.features]
      : []
  };
  const partners = Array.isArray(data.partners) ? [...data.partners] : [];

  mergeCustomData(loadCustomData());

  const tagsById = new Map(tags.map((tag) => [tag.id, tag]));
  const featuresById = new Map(
    (locations.features || [])
      .filter((feature) => feature && feature.properties && feature.properties.id)
      .map((feature) => [feature.properties.id, feature])
  );
  const partnersById = new Map(partners.map((partner) => [partner.id, partner]));

  const defaultTagColors = Object.fromEntries(
    tags.map((tag) => [tag.id, tag.color || "#36cfc9"])
  );

  const state = {
    scope: "world",
    filterMode: "OR",
    showUntagged: true,
    selectedTags: new Set(),
    tagColors: { ...defaultTagColors },
    theme: "dark",
    is3D: true,
    visibleCount: 0
  };

  let searchItems = [];
  let searchIndex = new Map();

  const elements = {
    body: document.body,
    sidePanel: document.getElementById("side-panel"),
    panelOpenMobile: document.getElementById("panel-open-mobile"),
    panelCloseMobile: document.getElementById("panel-close-mobile"),
    tagList: document.getElementById("tag-list"),
    legend: document.getElementById("legend"),
    resultCount: document.getElementById("result-count"),
    filterMode: document.getElementById("filter-mode"),
    untaggedToggle: document.getElementById("untagged-toggle"),
    searchInput: document.getElementById("search-input"),
    searchOptions: document.getElementById("search-options"),
    searchHint: document.getElementById("search-hint"),
    allOnBtn: document.getElementById("all-on-btn"),
    allOffBtn: document.getElementById("all-off-btn"),
    scopeWorldBtn: document.getElementById("scope-world-btn"),
    scopeJapanBtn: document.getElementById("scope-japan-btn"),
    view3dBtn: document.getElementById("view3d-btn"),
    themeToggleBtn: document.getElementById("theme-toggle-btn"),
    zoomInBtn: document.getElementById("zoom-in-btn"),
    zoomOutBtn: document.getElementById("zoom-out-btn"),
    quickAddForm: document.getElementById("quick-add-form"),
    addName: document.getElementById("add-name"),
    addType: document.getElementById("add-type"),
    addScope: document.getElementById("add-scope"),
    addLng: document.getElementById("add-lng"),
    addLat: document.getElementById("add-lat"),
    addDescription: document.getElementById("add-description"),
    addPartnerName: document.getElementById("add-partner-name"),
    addTagSelectors: document.getElementById("add-tag-selectors"),
    addResult: document.getElementById("add-result"),
    tagAddForm: document.getElementById("tag-add-form"),
    tagAddName: document.getElementById("tag-add-name"),
    tagAddGroup: document.getElementById("tag-add-group"),
    tagAddColor: document.getElementById("tag-add-color"),
    tagAddResult: document.getElementById("tag-add-result"),
    detailPanel: document.getElementById("detail-panel"),
    detailContent: document.getElementById("detail-content"),
    detailCloseBtn: document.getElementById("detail-close-btn")
  };

  hydrateStateFromStorage();
  hydrateStateFromUrl();
  sanitizeState();

  let map;

  initUi();
  initMap();

  function initUi() {
    applyBodyTheme();
    refreshSearchIndex();
    renderTagPanel();
    renderLegend();
    renderAddTagChoices();
    syncControlState();

    elements.tagList.addEventListener("change", onTagListChange);

    elements.filterMode.addEventListener("change", () => {
      state.filterMode = elements.filterMode.value;
      persistState();
      updateUrlParams();
      applyFilters();
    });

    elements.untaggedToggle.addEventListener("change", () => {
      state.showUntagged = elements.untaggedToggle.checked;
      persistState();
      updateUrlParams();
      applyFilters();
    });

    elements.allOnBtn.addEventListener("click", () => {
      state.selectedTags = new Set(tags.map((tag) => tag.id));
      persistState();
      updateUrlParams();
      renderTagPanel();
      renderLegend();
      applyFilters();
    });

    elements.allOffBtn.addEventListener("click", () => {
      state.selectedTags = new Set();
      persistState();
      updateUrlParams();
      renderTagPanel();
      renderLegend();
      applyFilters();
    });

    elements.scopeWorldBtn.addEventListener("click", () => {
      setScope("world", true);
    });

    elements.scopeJapanBtn.addEventListener("click", () => {
      setScope("japan", true);
    });

    elements.view3dBtn.addEventListener("click", () => {
      state.is3D = !state.is3D;
      if (map) {
        map.easeTo({
          pitch: state.is3D ? 58 : 0,
          bearing: state.is3D ? -12 : 0,
          duration: 500
        });
      }
      syncControlState();
      persistState();
    });

    elements.themeToggleBtn.addEventListener("click", () => {
      state.theme = state.theme === "dark" ? "light" : "dark";
      applyBodyTheme();
      applyThemeToMap();
      syncControlState();
      persistState();
    });

    elements.zoomInBtn.addEventListener("click", () => {
      if (map) {
        map.zoomIn({ duration: 300 });
      }
    });

    elements.zoomOutBtn.addEventListener("click", () => {
      if (map) {
        map.zoomOut({ duration: 300 });
      }
    });

    elements.searchInput.addEventListener("change", onSearch);
    elements.searchInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        onSearch();
      }
    });

    elements.quickAddForm.addEventListener("submit", onQuickAddSubmit);
    elements.tagAddForm.addEventListener("submit", onTagAddSubmit);

    elements.detailCloseBtn.addEventListener("click", closeDetailPanel);

    elements.panelOpenMobile.addEventListener("click", () => {
      elements.sidePanel.classList.add("is-open");
    });

    elements.panelCloseMobile.addEventListener("click", () => {
      elements.sidePanel.classList.remove("is-open");
    });

    const mediaQuery = window.matchMedia("(max-width: 900px)");
    if (mediaQuery.matches) {
      elements.sidePanel.classList.remove("is-open");
    } else {
      elements.sidePanel.classList.add("is-open");
    }

    mediaQuery.addEventListener("change", (event) => {
      if (event.matches) {
        elements.sidePanel.classList.remove("is-open");
      } else {
        elements.sidePanel.classList.add("is-open");
      }
    });
  }

  function initMap() {
    map = new maplibregl.Map({
      container: "map",
      style: createBaseStyle(),
      center: [20, 25],
      zoom: 0.85,
      minZoom: 0.7,
      maxZoom: 16,
      pitch: state.is3D ? 58 : 0,
      bearing: state.is3D ? -12 : 0,
      renderWorldCopies: false
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), "bottom-right");
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 100, unit: "metric" }), "bottom-left");

    map.on("load", () => {
      applyGlobeProjection();
      ensureDataLayers();
      applyThemeToMap();
      bindMapInteractions();
      syncScopeView(false);
      applyFilters();
      syncControlState();
    });
  }

  function createBaseStyle() {
    return {
      version: 8,
      projection: {
        type: "globe"
      },
      sources: {
        osm: {
          type: "raster",
          tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
          tileSize: 256,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>'
        }
      },
      layers: [
        {
          id: "osm-base",
          type: "raster",
          source: "osm",
          paint: {
            "raster-opacity": 1
          }
        }
      ]
    };
  }

  function applyGlobeProjection() {
    if (!map || typeof map.setProjection !== "function") {
      return;
    }

    try {
      map.setProjection({ type: "globe" });
    } catch (error) {
      console.warn("globe投影の適用に失敗したため、通常投影を継続します。", error);
    }
  }

  function ensureDataLayers() {
    if (!map.getSource(SOURCE_ID)) {
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: []
        }
      });
    }

    if (!map.getLayer(FILL_LAYER_ID)) {
      map.addLayer({
        id: FILL_LAYER_ID,
        type: "fill",
        source: SOURCE_ID,
        filter: [
          "any",
          ["==", ["geometry-type"], "Polygon"],
          ["==", ["geometry-type"], "MultiPolygon"]
        ],
        paint: {
          "fill-color": ["coalesce", ["get", "_renderColor"], "#36cfc9"],
          "fill-opacity": [
            "case",
            ["==", ["get", "type"], "country"],
            0.2,
            ["==", ["get", "type"], "area"],
            0.24,
            0.32
          ]
        }
      });
    }

    if (!map.getLayer(LINE_LAYER_ID)) {
      map.addLayer({
        id: LINE_LAYER_ID,
        type: "line",
        source: SOURCE_ID,
        filter: [
          "any",
          ["==", ["geometry-type"], "Polygon"],
          ["==", ["geometry-type"], "MultiPolygon"]
        ],
        paint: {
          "line-color": ["coalesce", ["get", "_renderColor"], "#20a39e"],
          "line-width": [
            "case",
            ["==", ["get", "type"], "country"],
            1.2,
            2
          ],
          "line-opacity": 0.9
        }
      });
    }

    if (!map.getLayer(POINT_LAYER_ID)) {
      map.addLayer({
        id: POINT_LAYER_ID,
        type: "circle",
        source: SOURCE_ID,
        filter: ["==", ["geometry-type"], "Point"],
        paint: {
          "circle-color": ["coalesce", ["get", "_renderColor"], "#ff9f5c"],
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 2, 5, 10, 11],
          "circle-stroke-color": "#0e1e29",
          "circle-stroke-width": 1.4,
          "circle-opacity": 0.95
        }
      });
    }
  }

  function bindMapInteractions() {
    const interactiveLayers = [FILL_LAYER_ID, POINT_LAYER_ID];

    interactiveLayers.forEach((layerId) => {
      map.on("mouseenter", layerId, () => {
        map.getCanvas().style.cursor = "pointer";
      });

      map.on("mouseleave", layerId, () => {
        map.getCanvas().style.cursor = "";
      });

      map.on("click", layerId, (event) => {
        const feature = event.features && event.features[0];
        if (!feature || !feature.properties || !feature.properties.id) {
          return;
        }

        openFeatureDetail(feature.properties.id);
      });
    });

    map.on("click", (event) => {
      const feature = map.queryRenderedFeatures(event.point, {
        layers: interactiveLayers
      })[0];

      if (!feature) {
        closeDetailPanel();
      }
    });
  }

  function onTagListChange(event) {
    const target = event.target;

    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    if (target.type === "checkbox" && target.dataset.tagId) {
      const tagId = target.dataset.tagId;
      if (target.checked) {
        state.selectedTags.add(tagId);
      } else {
        state.selectedTags.delete(tagId);
      }
      persistState();
      updateUrlParams();
      renderLegend();
      applyFilters();
      return;
    }

    if (target.type === "color" && target.dataset.colorTagId) {
      const tagId = target.dataset.colorTagId;
      state.tagColors[tagId] = target.value;
      persistState();
      persistCustomData();
      renderLegend();
      applyFilters();
    }
  }

  function onSearch() {
    const rawValue = elements.searchInput.value.trim();
    const value = rawValue.toLowerCase();

    if (!value) {
      elements.searchHint.textContent = "候補を選ぶと地図が対象へ移動します。";
      return;
    }

    const item =
      searchIndex.get(value) ||
      searchItems.find((candidate) => candidate.labelLower.includes(value) || candidate.nameLower.includes(value));

    if (!item) {
      elements.searchHint.textContent = "一致候補が見つかりません。候補リストから選択してください。";
      return;
    }

    if (item.kind === "feature") {
      focusFeatureById(item.id);
      elements.searchHint.textContent = `${item.label} へ移動しました。`;
      return;
    }

    if (item.kind === "partner") {
      const partner = partnersById.get(item.id);
      const targetLocationId = (partner && partner.locationIds && partner.locationIds[0]) || null;

      if (!targetLocationId) {
        elements.searchHint.textContent = "この企業に紐づく地点データがありません。";
        return;
      }

      focusFeatureById(targetLocationId);
      elements.searchHint.textContent = `${item.label} の関連地点へ移動しました。`;
    }
  }

  function onTagAddSubmit(event) {
    event.preventDefault();

    const name = elements.tagAddName.value.trim();
    const group = elements.tagAddGroup.value.trim() || "カスタム";
    const color = elements.tagAddColor.value || "#4ed0cf";

    if (!name) {
      elements.tagAddResult.textContent = "タグ名を入力してください。";
      return;
    }

    const normalized = name.toLowerCase();
    const duplicated = tags.some((tag) => String(tag.name || "").toLowerCase() === normalized);
    if (duplicated) {
      elements.tagAddResult.textContent = "同名タグが既に存在します。";
      return;
    }

    const tagId = makeUniqueId("tag_custom");
    const newTag = {
      id: tagId,
      name,
      group,
      color,
      isCustom: true
    };

    tags.push(newTag);
    tagsById.set(tagId, newTag);
    defaultTagColors[tagId] = color;
    state.tagColors[tagId] = color;

    renderTagPanel();
    renderLegend();
    renderAddTagChoices();
    applyFilters();
    persistState();
    persistCustomData();

    elements.tagAddResult.textContent = `タグ「${name}」を追加しました。`;
    elements.tagAddName.value = "";
    elements.tagAddGroup.value = "";
  }

  function onQuickAddSubmit(event) {
    event.preventDefault();

    const name = elements.addName.value.trim();
    const type = elements.addType.value;
    const scope = elements.addScope.value;
    const lng = Number(elements.addLng.value);
    const lat = Number(elements.addLat.value);
    const description = elements.addDescription.value.trim();
    const partnerName = elements.addPartnerName.value.trim();
    const selectedTagIds = Array.from(
      elements.addTagSelectors.querySelectorAll('input[type="checkbox"][data-add-tag-id]:checked')
    ).map((checkbox) => checkbox.dataset.addTagId);

    if (!name) {
      elements.addResult.textContent = "名称を入力してください。";
      return;
    }

    if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
      elements.addResult.textContent = "経度・緯度は数値で入力してください。";
      return;
    }

    if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
      elements.addResult.textContent = "経度は -180〜180、緯度は -90〜90 の範囲で入力してください。";
      return;
    }

    const locationId = makeUniqueId("loc_custom");
    const code = `CUSTOM-${locationId.slice(-6).toUpperCase()}`;

    const newFeature = {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [lng, lat]
      },
      properties: {
        id: locationId,
        type,
        name,
        code,
        scopes: [scope],
        tags: selectedTagIds,
        description: description || "GUIから追加された地点です。",
        partners: [],
        centroid: [lng, lat],
        _isCustom: true
      }
    };

    locations.features.push(newFeature);
    featuresById.set(locationId, newFeature);

    if (partnerName) {
      const partnerId = makeUniqueId("p_custom");
      const newPartner = {
        id: partnerId,
        name: partnerName,
        type: "GUI追加",
        url: "",
        description: `${name} に紐づく GUI 追加企業`,
        locationIds: [locationId],
        tags: selectedTagIds,
        isCustom: true
      };

      partners.push(newPartner);
      partnersById.set(partnerId, newPartner);
      newFeature.properties.partners = [partnerId];
    }

    if (scope !== state.scope) {
      setScope(scope, true);
    }

    refreshSearchIndex();
    applyFilters();
    persistCustomData();

    const isCurrentlyVisible = isFeatureVisible(newFeature.properties);
    focusFeatureById(locationId);

    const visibilityNote = isCurrentlyVisible
      ? ""
      : "（現在のタグフィルタ条件では非表示の可能性があります）";
    elements.addResult.textContent = `「${name}」を追加しました。${visibilityNote}`;

    elements.quickAddForm.reset();
    elements.addScope.value = scope;
    renderAddTagChoices();
  }

  function setScope(scope, moveMap) {
    if (scope !== "world" && scope !== "japan") {
      return;
    }

    state.scope = scope;
    syncControlState();
    applyFilters();

    if (moveMap) {
      syncScopeView(true);
    }

    persistState();
    updateUrlParams();
  }

  function syncScopeView(animate) {
    if (!map) {
      return;
    }

    const options =
      state.scope === "japan"
        ? { center: [138.0, 36.5], zoom: 4.3 }
        : { center: [20, 25], zoom: 0.85 };

    if (animate) {
      map.flyTo({
        center: options.center,
        zoom: options.zoom,
        duration: 700
      });
      return;
    }

    map.jumpTo({
      center: options.center,
      zoom: options.zoom
    });
  }

  function applyFilters() {
    if (!map || !map.getSource(SOURCE_ID)) {
      return;
    }

    const filteredFeatures = (locations.features || [])
      .filter((feature) => isFeatureVisible(feature.properties || {}))
      .map((feature) => {
        const properties = feature.properties || {};
        return {
          ...feature,
          properties: {
            ...properties,
            _renderColor: resolveFeatureColor(properties)
          }
        };
      });

    const source = map.getSource(SOURCE_ID);
    source.setData({
      type: "FeatureCollection",
      features: filteredFeatures
    });

    state.visibleCount = filteredFeatures.length;
    elements.resultCount.textContent = `${state.visibleCount} 件表示`;
  }

  function isFeatureVisible(properties) {
    const scopes = Array.isArray(properties.scopes) ? properties.scopes : [];
    if (!scopes.includes(state.scope)) {
      return false;
    }

    const tagsForFeature = Array.isArray(properties.tags) ? properties.tags : [];
    const selectedTagIds = Array.from(state.selectedTags);

    if (selectedTagIds.length === 0) {
      if (tagsForFeature.length === 0) {
        return state.showUntagged;
      }
      return true;
    }

    if (tagsForFeature.length === 0) {
      return state.showUntagged;
    }

    if (state.filterMode === "AND") {
      return selectedTagIds.every((tagId) => tagsForFeature.includes(tagId));
    }

    return selectedTagIds.some((tagId) => tagsForFeature.includes(tagId));
  }

  function resolveFeatureColor(properties) {
    const tagsForFeature = Array.isArray(properties.tags) ? properties.tags : [];
    const selectedTagIds = Array.from(state.selectedTags);

    const prioritized = selectedTagIds.find((tagId) => tagsForFeature.includes(tagId));
    const fallbackTag = tagsForFeature[0];
    const tagId = prioritized || fallbackTag;

    if (tagId && state.tagColors[tagId]) {
      return state.tagColors[tagId];
    }

    if (properties.type === "country") {
      return "#4da6e9";
    }

    if (properties.type === "site") {
      return "#ff9f5c";
    }

    return "#57c7c7";
  }

  function renderTagPanel() {
    const groups = new Map();

    tags.forEach((tag) => {
      const groupName = tag.group || "未分類";
      if (!groups.has(groupName)) {
        groups.set(groupName, []);
      }
      groups.get(groupName).push(tag);
    });

    elements.tagList.innerHTML = Array.from(groups.entries())
      .map(([groupName, groupTags]) => {
        const rows = groupTags
          .map((tag) => {
            const checked = state.selectedTags.has(tag.id) ? "checked" : "";
            const color = state.tagColors[tag.id] || tag.color || "#36cfc9";
            return `
              <div class="tag-row">
                <input type="checkbox" data-tag-id="${escapeHtml(tag.id)}" ${checked}>
                <span class="tag-name">${escapeHtml(tag.name)}</span>
                <input
                  class="tag-color"
                  type="color"
                  value="${escapeHtml(color)}"
                  aria-label="${escapeHtml(tag.name)} の色"
                  data-color-tag-id="${escapeHtml(tag.id)}"
                >
              </div>
            `;
          })
          .join("");

        return `
          <section class="tag-group">
            <h4 class="tag-group-title">${escapeHtml(groupName)}</h4>
            ${rows}
          </section>
        `;
      })
      .join("");
  }

  function renderLegend() {
    const hasSelection = state.selectedTags.size > 0;

    elements.legend.innerHTML = tags
      .map((tag) => {
        const color = state.tagColors[tag.id] || tag.color || "#36cfc9";
        const isMuted = hasSelection && !state.selectedTags.has(tag.id);
        const opacity = isMuted ? "0.48" : "1";

        return `
          <div class="legend-item" style="opacity:${opacity}">
            <span class="swatch" style="background:${escapeHtml(color)}"></span>
            <span>${escapeHtml(tag.name)}</span>
          </div>
        `;
      })
      .join("");
  }

  function renderAddTagChoices() {
    elements.addTagSelectors.innerHTML = tags
      .map((tag) => {
        return `
          <label>
            <input type="checkbox" data-add-tag-id="${escapeHtml(tag.id)}">
            <span>${escapeHtml(tag.name)}</span>
          </label>
        `;
      })
      .join("");
  }

  function refreshSearchIndex() {
    searchItems = buildSearchItems();
    searchIndex = new Map();

    searchItems.forEach((item) => {
      searchIndex.set(item.labelLower, item);
      searchIndex.set(item.nameLower, item);
    });

    renderSearchOptions();
  }

  function renderSearchOptions() {
    elements.searchOptions.innerHTML = searchItems
      .map((item) => `<option value="${escapeHtml(item.label)}"></option>`)
      .join("");
  }

  function buildSearchItems() {
    const featureItems = (locations.features || [])
      .map((feature) => {
        const props = feature.properties || {};
        if (!props.id || !props.name) {
          return null;
        }

        const label = `${props.name}（${toLabelByType(props.type)}）`;
        return {
          kind: "feature",
          id: props.id,
          name: props.name,
          label,
          nameLower: String(props.name).toLowerCase(),
          labelLower: label.toLowerCase()
        };
      })
      .filter(Boolean);

    const partnerItems = partners
      .map((partner) => {
        if (!partner || !partner.id || !partner.name) {
          return null;
        }

        const label = `${partner.name}（企業）`;
        return {
          kind: "partner",
          id: partner.id,
          name: partner.name,
          label,
          nameLower: String(partner.name).toLowerCase(),
          labelLower: label.toLowerCase()
        };
      })
      .filter(Boolean);

    return [...featureItems, ...partnerItems];
  }

  function focusFeatureById(featureId) {
    const feature = featuresById.get(featureId);
    if (!feature) {
      return;
    }

    const props = feature.properties || {};
    if (Array.isArray(props.scopes) && props.scopes.length > 0 && !props.scopes.includes(state.scope)) {
      state.scope = props.scopes.includes("japan") ? "japan" : "world";
      syncControlState();
      syncScopeView(true);
      updateUrlParams();
    }

    const bounds = getBounds(feature);

    if (bounds) {
      map.fitBounds(bounds, {
        padding: 80,
        duration: 700,
        maxZoom: 8
      });
    } else {
      const center = getFeatureCenter(feature);
      if (center) {
        map.flyTo({
          center,
          zoom: Math.max(map.getZoom(), 7),
          duration: 700
        });
      }
    }

    openFeatureDetail(featureId);
    applyFilters();
    persistState();
  }

  function openFeatureDetail(featureId) {
    const feature = featuresById.get(featureId);
    if (!feature) {
      return;
    }

    const props = feature.properties || {};
    const relatedPartners = gatherPartnersForFeature(featureId, props.partners || []);
    const tagsHtml = (props.tags || [])
      .map((tagId) => {
        const tag = tagsById.get(tagId);
        const label = tag ? tag.name : tagId;
        const color = state.tagColors[tagId] || (tag && tag.color) || "#57c7c7";
        return `<span class="chip" style="border-color:${escapeHtml(color)}">${escapeHtml(label)}</span>`;
      })
      .join("");

    const partnersHtml =
      relatedPartners.length > 0
        ? relatedPartners
            .map((partner) => {
              const website = partner.url
                ? `<p><a href="${escapeHtml(partner.url)}" target="_blank" rel="noopener">Webサイト</a></p>`
                : "";
              return `
                <article class="partner-card">
                  <h4>${escapeHtml(partner.name)}</h4>
                  <p>${escapeHtml(partner.type || "-")}</p>
                  <p>${escapeHtml(partner.description || "")}</p>
                  ${website}
                </article>
              `;
            })
            .join("")
        : "<p class='hint'>関連パートナー情報はありません。</p>";

    elements.detailContent.innerHTML = `
      <p><strong>${escapeHtml(props.name || "名称未設定")}</strong></p>
      <p>種別: ${escapeHtml(toLabelByType(props.type))}</p>
      <p>コード: ${escapeHtml(props.code || "-")}</p>
      <p>${escapeHtml(props.description || "説明は未設定です。")}</p>

      <h3>タグ</h3>
      <div class="chip-list">${tagsHtml || "<span class='hint'>タグなし</span>"}</div>

      <h3>関連パートナー</h3>
      <div class="partner-list">${partnersHtml}</div>
    `;

    elements.detailPanel.classList.add("is-open");
  }

  function gatherPartnersForFeature(featureId, propertyPartnerIds) {
    const fromProperty = Array.isArray(propertyPartnerIds) ? propertyPartnerIds : [];
    const fromRelations = partners
      .filter((partner) => Array.isArray(partner.locationIds) && partner.locationIds.includes(featureId))
      .map((partner) => partner.id);

    const uniqueIds = new Set([...fromProperty, ...fromRelations]);
    return Array.from(uniqueIds)
      .map((id) => partnersById.get(id))
      .filter(Boolean);
  }

  function closeDetailPanel() {
    elements.detailPanel.classList.remove("is-open");
  }

  function applyBodyTheme() {
    elements.body.setAttribute("data-theme", state.theme);
  }

  function applyThemeToMap() {
    if (!map || !map.getLayer("osm-base")) {
      return;
    }

    const isDark = state.theme === "dark";

    map.setPaintProperty("osm-base", "raster-brightness-min", isDark ? 0.03 : 0.06);
    map.setPaintProperty("osm-base", "raster-brightness-max", isDark ? 0.5 : 1.0);
    map.setPaintProperty("osm-base", "raster-contrast", isDark ? 0.28 : 0.02);
    map.setPaintProperty("osm-base", "raster-saturation", isDark ? -0.82 : -0.05);
  }

  function syncControlState() {
    elements.scopeWorldBtn.classList.toggle("is-active", state.scope === "world");
    elements.scopeJapanBtn.classList.toggle("is-active", state.scope === "japan");

    elements.view3dBtn.classList.toggle("is-active", state.is3D);
    elements.view3dBtn.textContent = state.is3D ? "3D" : "2D";

    elements.themeToggleBtn.classList.toggle("is-active", state.theme === "dark");
    elements.themeToggleBtn.textContent = state.theme === "dark" ? "ダーク" : "ライト";

    elements.filterMode.value = state.filterMode;
    elements.untaggedToggle.checked = state.showUntagged;
  }

  function hydrateStateFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return;
      }

      const saved = JSON.parse(raw);
      if (saved.scope === "world" || saved.scope === "japan") {
        state.scope = saved.scope;
      }

      if (saved.filterMode === "OR" || saved.filterMode === "AND") {
        state.filterMode = saved.filterMode;
      }

      if (typeof saved.showUntagged === "boolean") {
        state.showUntagged = saved.showUntagged;
      }

      if (saved.theme === "dark" || saved.theme === "light") {
        state.theme = saved.theme;
      }

      if (typeof saved.is3D === "boolean") {
        state.is3D = saved.is3D;
      }

      if (Array.isArray(saved.selectedTags)) {
        state.selectedTags = new Set(saved.selectedTags);
      }

      if (saved.tagColors && typeof saved.tagColors === "object") {
        state.tagColors = {
          ...state.tagColors,
          ...saved.tagColors
        };
      }
    } catch (error) {
      console.warn("保存状態の読み込みに失敗しました。", error);
    }
  }

  function hydrateStateFromUrl() {
    try {
      const url = new URL(window.location.href);

      const scope = url.searchParams.get("scope");
      if (scope === "world" || scope === "japan") {
        state.scope = scope;
      }

      const mode = url.searchParams.get("mode");
      if (mode === "OR" || mode === "AND") {
        state.filterMode = mode;
      }

      const untagged = url.searchParams.get("untagged");
      if (untagged === "0") {
        state.showUntagged = false;
      }
      if (untagged === "1") {
        state.showUntagged = true;
      }

      const tagsParam = url.searchParams.get("tags");
      if (tagsParam) {
        state.selectedTags = new Set(tagsParam.split(",").filter(Boolean));
      }
    } catch (error) {
      console.warn("URLパラメータの読み込みに失敗しました。", error);
    }
  }

  function updateUrlParams() {
    const url = new URL(window.location.href);
    url.searchParams.set("scope", state.scope);
    url.searchParams.set("mode", state.filterMode);
    url.searchParams.set("untagged", state.showUntagged ? "1" : "0");

    if (state.selectedTags.size > 0) {
      url.searchParams.set("tags", Array.from(state.selectedTags).join(","));
    } else {
      url.searchParams.delete("tags");
    }

    history.replaceState({}, "", url);
  }

  function persistState() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          scope: state.scope,
          filterMode: state.filterMode,
          showUntagged: state.showUntagged,
          selectedTags: Array.from(state.selectedTags),
          tagColors: state.tagColors,
          theme: state.theme,
          is3D: state.is3D
        })
      );
    } catch (error) {
      console.warn("状態保存に失敗しました。", error);
    }
  }

  function sanitizeState() {
    state.selectedTags = new Set(
      Array.from(state.selectedTags).filter((tagId) => tagsById.has(tagId))
    );

    Object.keys(state.tagColors).forEach((tagId) => {
      if (!tagsById.has(tagId)) {
        delete state.tagColors[tagId];
      }
    });

    Object.entries(defaultTagColors).forEach(([tagId, color]) => {
      if (!state.tagColors[tagId]) {
        state.tagColors[tagId] = color;
      }
    });
  }

  function loadCustomData() {
    try {
      const raw = localStorage.getItem(CUSTOM_DATA_STORAGE_KEY);
      if (!raw) {
        return { tags: [], features: [], partners: [] };
      }

      const parsed = JSON.parse(raw);
      return {
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
        features: Array.isArray(parsed.features) ? parsed.features : [],
        partners: Array.isArray(parsed.partners) ? parsed.partners : []
      };
    } catch (error) {
      console.warn("追加データの読み込みに失敗しました。", error);
      return { tags: [], features: [], partners: [] };
    }
  }

  function mergeCustomData(customData) {
    const existingTagIds = new Set(tags.map((tag) => tag.id));
    const existingFeatureIds = new Set(
      locations.features
        .map((feature) => feature && feature.properties && feature.properties.id)
        .filter(Boolean)
    );
    const existingPartnerIds = new Set(partners.map((partner) => partner.id));

    customData.tags.forEach((tag) => {
      if (!tag || !tag.id || existingTagIds.has(tag.id)) {
        return;
      }
      tags.push({ ...tag, isCustom: true });
      existingTagIds.add(tag.id);
    });

    customData.features.forEach((feature) => {
      const featureId = feature && feature.properties && feature.properties.id;
      if (!featureId || existingFeatureIds.has(featureId)) {
        return;
      }
      locations.features.push({
        ...feature,
        properties: {
          ...(feature.properties || {}),
          _isCustom: true
        }
      });
      existingFeatureIds.add(featureId);
    });

    customData.partners.forEach((partner) => {
      if (!partner || !partner.id || existingPartnerIds.has(partner.id)) {
        return;
      }
      partners.push({ ...partner, isCustom: true });
      existingPartnerIds.add(partner.id);
    });
  }

  function persistCustomData() {
    try {
      const customTags = tags.filter((tag) => tag && tag.isCustom);
      const customFeatures = locations.features.filter(
        (feature) => feature && feature.properties && feature.properties._isCustom
      );
      const customPartners = partners.filter((partner) => partner && partner.isCustom);

      if (customTags.length === 0 && customFeatures.length === 0 && customPartners.length === 0) {
        localStorage.removeItem(CUSTOM_DATA_STORAGE_KEY);
        return;
      }

      localStorage.setItem(
        CUSTOM_DATA_STORAGE_KEY,
        JSON.stringify({
          tags: customTags,
          features: customFeatures,
          partners: customPartners
        })
      );
    } catch (error) {
      console.warn("追加データの保存に失敗しました。", error);
    }
  }

  function getFeatureCenter(feature) {
    const props = feature.properties || {};

    if (Array.isArray(props.centroid) && props.centroid.length === 2) {
      return props.centroid;
    }

    if (!feature.geometry) {
      return null;
    }

    if (feature.geometry.type === "Point") {
      return feature.geometry.coordinates;
    }

    const allPoints = flattenCoordinates(feature.geometry.coordinates);
    if (allPoints.length === 0) {
      return null;
    }

    const summary = allPoints.reduce(
      (acc, point) => {
        acc.lng += point[0];
        acc.lat += point[1];
        return acc;
      },
      { lng: 0, lat: 0 }
    );

    return [summary.lng / allPoints.length, summary.lat / allPoints.length];
  }

  function getBounds(feature) {
    if (!feature.geometry || feature.geometry.type === "Point") {
      return null;
    }

    const points = flattenCoordinates(feature.geometry.coordinates);
    if (points.length === 0) {
      return null;
    }

    const bounds = new maplibregl.LngLatBounds(points[0], points[0]);
    points.forEach((point) => bounds.extend(point));
    return bounds;
  }

  function flattenCoordinates(input) {
    const result = [];

    walkCoordinates(input);
    return result;

    function walkCoordinates(value) {
      if (!Array.isArray(value)) {
        return;
      }

      if (value.length >= 2 && typeof value[0] === "number" && typeof value[1] === "number") {
        result.push([value[0], value[1]]);
        return;
      }

      value.forEach(walkCoordinates);
    }
  }

  function makeUniqueId(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  }

  function toLabelByType(type) {
    switch (type) {
      case "country":
        return "国";
      case "prefecture":
        return "都道府県";
      case "municipality":
        return "自治体";
      case "site":
        return "拠点";
      case "area":
        return "エリア";
      default:
        return "その他";
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }
})();
