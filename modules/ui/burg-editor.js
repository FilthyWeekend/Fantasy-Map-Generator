"use strict";
function editBurg(id) {
  if (customization) return;
  closeDialogs(".stable");
  if (!layerIsOn("toggleBurgIcons")) toggleBurgIcons();
  if (!layerIsOn("toggleLabels")) toggleLabels();

  const burg = id || d3.event.target.dataset.id;
  elSelected = burgLabels.select("[data-id='" + burg + "']");
  burgLabels.selectAll("text").call(d3.drag().on("start", dragBurgLabel)).classed("draggable", true);
  updateGroupsList();
  updateBurgValues();

  $("#burgEditor").dialog({
    title: "Edit Burg",
    resizable: false,
    close: closeBurgEditor,
    position: {my: "left top", at: "left+10 top+10", of: "svg", collision: "fit"}
  });

  if (modules.editBurg) return;
  modules.editBurg = true;

  // add listeners
  byId("burgName").on("input", changeName);
  byId("burgNameReRandom").on("click", generateNameRandom);
  byId("burgGroup").on("change", changeGroup);
  byId("burgGroupConfigure").on("click", editBurgGroups);
  byId("burgType").on("change", changeType);
  byId("burgCulture").on("change", changeCulture);
  byId("burgNameReCulture").on("click", generateNameCulture);
  byId("burgPopulation").on("change", changePopulation);
  burgBody.querySelectorAll(".burgFeature").forEach(el => el.on("click", toggleFeature));
  byId("burgLinkOpen").on("click", openBurgLink);

  byId("burgStyleShow").on("click", showStyleSection);
  byId("burgStyleHide").on("click", hideStyleSection);
  byId("burgEditLabelStyle").on("click", editGroupLabelStyle);
  byId("burgEditIconStyle").on("click", editGroupIconStyle);
  byId("burgEditAnchorStyle").on("click", editGroupAnchorStyle);

  byId("burgEmblem").on("click", openEmblemEdit);
  byId("burgSetPreviewLink").on("click", setCustomPreview);
  byId("burgEditEmblem").on("click", openEmblemEdit);
  byId("burgLocate").on("click", zoomIntoBurg);
  byId("burgRelocate").on("click", toggleRelocateBurg);
  byId("burglLegend").on("click", editBurgLegend);
  byId("burgLock").on("click", toggleBurgLockButton);
  byId("burgRemove").on("click", removeSelectedBurg);
  byId("burgTemperatureGraph").on("click", showTemperatureGraph);

  function updateGroupsList() {
    byId("burgGroup").options.length = 0; // remove all options
    for (const {name} of options.burgs.groups) {
      byId("burgGroup").options.add(new Option(name, name));
    }
  }

  function updateBurgValues() {
    const id = +elSelected.attr("data-id");
    const b = pack.burgs[id];
    const province = pack.cells.province[b.cell];
    const provinceName = province ? pack.provinces[province].fullName + ", " : "";
    const stateName = pack.states[b.state].fullName || pack.states[b.state].name;
    byId("burgProvinceAndState").innerHTML = provinceName + stateName;

    byId("burgName").value = b.name;
    byId("burgGroup").value = b.group;
    byId("burgType").value = b.type || "Generic";
    byId("burgPopulation").value = rn(b.population * populationRate * urbanization);
    byId("burgEditAnchorStyle").style.display = +b.port ? "inline-block" : "none";

    // update list and select culture
    const cultureSelect = byId("burgCulture");
    cultureSelect.options.length = 0;
    const cultures = pack.cultures.filter(c => !c.removed);
    cultures.forEach(c => cultureSelect.options.add(new Option(c.name, c.i, false, c.i === b.culture)));

    const temperature = grid.cells.temp[pack.cells.g[b.cell]];
    byId("burgTemperature").innerHTML = convertTemperature(temperature);
    byId("burgTemperatureLikeIn").innerHTML = getTemperatureLikeness(temperature);
    byId("burgElevation").innerHTML = getHeight(pack.cells.h[b.cell]);

    // toggle features
    if (b.capital) byId("burgCapital").classList.remove("inactive");
    else byId("burgCapital").classList.add("inactive");
    if (b.port) byId("burgPort").classList.remove("inactive");
    else byId("burgPort").classList.add("inactive");
    if (b.citadel) byId("burgCitadel").classList.remove("inactive");
    else byId("burgCitadel").classList.add("inactive");
    if (b.walls) byId("burgWalls").classList.remove("inactive");
    else byId("burgWalls").classList.add("inactive");
    if (b.plaza) byId("burgPlaza").classList.remove("inactive");
    else byId("burgPlaza").classList.add("inactive");
    if (b.temple) byId("burgTemple").classList.remove("inactive");
    else byId("burgTemple").classList.add("inactive");
    if (b.shanty) byId("burgShanty").classList.remove("inactive");
    else byId("burgShanty").classList.add("inactive");

    updateBurgLockIcon();

    // set emlem image
    const coaID = "burgCOA" + id;
    COArenderer.trigger(coaID, b.coa);
    byId("burgEmblem").setAttribute("href", "#" + coaID);

    updateBurgPreview(b);
  }

  function dragBurgLabel() {
    const tr = parseTransform(this.getAttribute("transform"));
    const dx = +tr[0] - d3.event.x,
      dy = +tr[1] - d3.event.y;

    d3.event.on("drag", function () {
      const x = d3.event.x,
        y = d3.event.y;
      this.setAttribute("transform", `translate(${dx + x},${dy + y})`);
      tip('Use dragging for fine-tuning only, to actually move burg use "Relocate" button', false, "warning");
    });
  }

  function changeName() {
    const id = +elSelected.attr("data-id");
    pack.burgs[id].name = burgName.value;
    elSelected.text(burgName.value);
  }

  function generateNameRandom() {
    const base = rand(nameBases.length - 1);
    burgName.value = Names.getBase(base);
    changeName();
  }

  function changeGroup() {
    const id = +elSelected.attr("data-id");
    pack.burgs[id].group = this.value;
    moveBurgToGroup(id, this.value);
  }

  function changeType() {
    const id = +elSelected.attr("data-id");
    pack.burgs[id].type = this.value;
  }

  function changeCulture() {
    const id = +elSelected.attr("data-id");
    pack.burgs[id].culture = +this.value;
  }

  function generateNameCulture() {
    const id = +elSelected.attr("data-id");
    const culture = pack.burgs[id].culture;
    burgName.value = Names.getCulture(culture);
    changeName();
  }

  function changePopulation() {
    const id = +elSelected.attr("data-id");
    const burg = pack.burgs[id];

    pack.burgs[id].population = rn(burgPopulation.value / populationRate / urbanization, 4);
    updateBurgPreview(burg);
  }

  function toggleFeature() {
    const id = +elSelected.attr("data-id");
    const burg = pack.burgs[id];
    const feature = this.dataset.feature;
    const turnOn = this.classList.contains("inactive");
    if (feature === "port") togglePort(id);
    else if (feature === "capital") toggleCapital(id);
    else burg[feature] = +turnOn;
    if (burg[feature]) this.classList.remove("inactive");
    else if (!burg[feature]) this.classList.add("inactive");

    if (burg.port) byId("burgEditAnchorStyle").style.display = "inline-block";
    else byId("burgEditAnchorStyle").style.display = "none";
    updateBurgPreview(burg);
  }

  function toggleBurgLockButton() {
    const id = +elSelected.attr("data-id");
    const burg = pack.burgs[id];
    burg.lock = !burg.lock;

    updateBurgLockIcon();
  }

  function updateBurgLockIcon() {
    const id = +elSelected.attr("data-id");
    const b = pack.burgs[id];
    if (b.lock) {
      byId("burgLock").classList.remove("icon-lock-open");
      byId("burgLock").classList.add("icon-lock");
    } else {
      byId("burgLock").classList.remove("icon-lock");
      byId("burgLock").classList.add("icon-lock-open");
    }
  }

  function showStyleSection() {
    document.querySelectorAll("#burgBottom > button").forEach(el => (el.style.display = "none"));
    byId("burgStyleSection").style.display = "inline-block";
  }

  function hideStyleSection() {
    document.querySelectorAll("#burgBottom > button").forEach(el => (el.style.display = "inline-block"));
    byId("burgStyleSection").style.display = "none";
  }

  function editGroupLabelStyle() {
    const g = elSelected.node().parentNode.id;
    editStyle("labels", g);
  }

  function editGroupIconStyle() {
    const g = elSelected.node().parentNode.id;
    editStyle("burgIcons", g);
  }

  function editGroupAnchorStyle() {
    const g = elSelected.node().parentNode.id;
    editStyle("anchors", g);
  }

  function updateBurgPreview(burg) {
    const preview = Burgs.getPreview(burg).preview;
    if (!preview) {
      byId("burgPreviewSection").style.display = "none";
      return;
    }

    byId("burgPreviewSection").style.display = "block";

    // recreate object to force reload (Chrome bug)
    const container = byId("burgPreviewObject");
    container.innerHTML = "";
    const object = document.createElement("object");
    object.style.width = "100%";
    object.data = preview;
    container.insertBefore(object, null);
  }

  function openBurgLink() {
    const id = +elSelected.attr("data-id");
    const burg = pack.burgs[id];
    const link = Burgs.getPreview(burg).link;
    if (link) openURL(link);
  }

  function setCustomPreview() {
    const id = +elSelected.attr("data-id");
    const burg = pack.burgs[id];

    prompt(
      "Provide custom URL to the burg map. It can be a link to a generator or just an image. Leave empty to use the default map preview",
      {default: Burgs.getPreview(burg).link, required: false},
      link => {
        if (link) burg.link = link;
        else delete burg.link;
        updateBurgPreview(burg);
      }
    );
  }

  function openEmblemEdit() {
    const id = +elSelected.attr("data-id");
    const burg = pack.burgs[id];
    editEmblem("burg", "burgCOA" + id, burg);
  }

  function zoomIntoBurg() {
    const id = +elSelected.attr("data-id");
    const burg = pack.burgs[id];
    const x = burg.x;
    const y = burg.y;
    zoomTo(x, y, 8, 2000);
  }

  function toggleRelocateBurg() {
    const toggler = byId("toggleCells");
    byId("burgRelocate").classList.toggle("pressed");
    if (byId("burgRelocate").classList.contains("pressed")) {
      viewbox.style("cursor", "crosshair").on("click", relocateBurgOnClick);
      tip("Click on map to relocate burg. Hold Shift for continuous move", true);
      if (!layerIsOn("toggleCells")) {
        toggleCells();
        toggler.dataset.forced = true;
      }
    } else {
      clearMainTip();
      viewbox.on("click", clicked).style("cursor", "default");
      if (layerIsOn("toggleCells") && toggler.dataset.forced) {
        toggleCells();
        toggler.dataset.forced = false;
      }
    }
  }

  function relocateBurgOnClick() {
    const cells = pack.cells;
    const point = d3.mouse(this);
    const cell = findCell(point[0], point[1]);
    const id = +elSelected.attr("data-id");
    const burg = pack.burgs[id];

    if (cells.h[cell] < 20) {
      tip("Cannot place burg into the water! Select a land cell", false, "error");
      return;
    }

    if (cells.burg[cell] && cells.burg[cell] !== id) {
      tip("There is already a burg in this cell. Please select a free cell", false, "error");
      return;
    }

    const newState = cells.state[cell];
    const oldState = burg.state;

    if (newState !== oldState && burg.capital) {
      tip("Capital cannot be relocated into another state!", false, "error");
      return;
    }

    // change UI
    const x = rn(point[0], 2),
      y = rn(point[1], 2);
    burgIcons
      .select("[data-id='" + id + "']")
      .attr("transform", null)
      .attr("cx", x)
      .attr("cy", y);
    burgLabels
      .select("text[data-id='" + id + "']")
      .attr("transform", null)
      .attr("x", x)
      .attr("y", y);
    const anchor = anchors.select("use[data-id='" + id + "']");
    if (anchor.size()) {
      const size = anchor.attr("width");
      const xa = rn(x - size * 0.47, 2);
      const ya = rn(y - size * 0.47, 2);
      anchor.attr("transform", null).attr("x", xa).attr("y", ya);
    }

    // change data
    cells.burg[burg.cell] = 0;
    cells.burg[cell] = id;
    burg.cell = cell;
    burg.state = newState;
    burg.x = x;
    burg.y = y;
    if (burg.capital) pack.states[newState].center = burg.cell;

    if (d3.event.shiftKey === false) toggleRelocateBurg();
  }

  function editBurgLegend() {
    const id = elSelected.attr("data-id");
    const name = elSelected.text();
    editNotes("burg" + id, name);
  }

  function showTemperatureGraph() {
    const id = elSelected.attr("data-id");
    showBurgTemperatureGraph(id);
  }

  function removeSelectedBurg() {
    const id = +elSelected.attr("data-id");
    if (pack.burgs[id].capital) {
      alertMessage.innerHTML = /* html */ `You cannot remove the burg as it is a state capital.<br /><br />
        You can change the capital using Burgs Editor (shift + T)`;
      $("#alert").dialog({
        resizable: false,
        title: "Remove burg",
        buttons: {
          Ok: function () {
            $(this).dialog("close");
          }
        }
      });
    } else {
      confirmationDialog({
        title: "Remove burg",
        message: "Are you sure you want to remove the burg? <br>This action cannot be reverted",
        confirm: "Remove",
        onConfirm: () => {
          removeBurg(id); // see Editors module
          $("#burgEditor").dialog("close");
        }
      });
    }
  }

  function closeBurgEditor() {
    byId("burgRelocate").classList.remove("pressed");
    burgLabels.selectAll("text").call(d3.drag().on("drag", null)).classed("draggable", false);
    unselect();
  }
}

// in °C, array from -1 °C; source: https://en.wikipedia.org/wiki/List_of_cities_by_average_temperature
function getTemperatureLikeness(temperature) {
  if (temperature < -5) return "Yakutsk";
  const cities = [
    "Snag (Yukon)",
    "Yellowknife (Canada)",
    "Okhotsk (Russia)",
    "Fairbanks (Alaska)",
    "Nuuk (Greenland)",
    "Murmansk", // -5 - 0
    "Arkhangelsk",
    "Anchorage",
    "Tromsø",
    "Reykjavik",
    "Riga",
    "Stockholm",
    "Halifax",
    "Prague",
    "Copenhagen",
    "London", // 1 - 10
    "Antwerp",
    "Paris",
    "Milan",
    "Batumi",
    "Rome",
    "Dubrovnik",
    "Lisbon",
    "Barcelona",
    "Marrakesh",
    "Alexandria", // 11 - 20
    "Tegucigalpa",
    "Guangzhou",
    "Rio de Janeiro",
    "Dakar",
    "Miami",
    "Jakarta",
    "Mogadishu",
    "Bangkok",
    "Aden",
    "Khartoum"
  ]; // 21 - 30
  if (temperature > 30) return "Mecca";
  return cities[temperature + 5] || null;
}
