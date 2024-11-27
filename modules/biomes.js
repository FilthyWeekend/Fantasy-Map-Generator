"use strict";

window.NBiomes = (function () {
  const MIN_LAND_HEIGHT = 20;


  const getDefault = () => {
    const name = [
      "Marine",
      "Savanna",
      "Prarie",
      "Folkvangr",
      "Deadwood",
      "Rainforest",
      "Grassland", // 6
      "Swamp",
      "Forest",
      "Taiga",
      "Tundra",
      "Bamboo grove", // 11
      "Marsh",
      "Cloud mountain",
      "Snow mountain"
    ];

    const color = [
      "#466eab",
      "#fbe79f",
      "#b5b887",
      "#475161",
      "#1c040d",
      "#03420b",
      "#29bc56", // 6
      "#e85f94",
      "#409c43",
      "#4b6b32",
      "#96784b",
      "#61eda0", // 11
      "#78042c",
      "#07a3a6",
      "#ffffff",
    ];
    const habitability = [0, 4, 10, 22, 30, 50, 100, 80, 90, 12, 4, 0, 12, 50, 20];
    const iconsDensity = [0, 3, 2, 120, 120, 120, 120, 150, 150, 100, 5, 0, 250, 200, 10];
    const icons = [
      {},
      {dune: 3, cactus: 6, deadTree: 1},
      {dune: 9, deadTree: 1},
      {acacia: 1, grass: 9},
      {grass: 1},
      {acacia: 8, palm: 1},
      {deciduous: 1},
      {acacia: 5, swamp: 5},
      {palm: 6, swamp: 1},
      {conifer: 1},
      {grass: 1},
      {},
      {swamp: 1},
      {acacia: 1},
      {conifer: 1}
    ];
    const cost = [10, 200, 150, 60, 50, 70, 70, 80, 90, 200, 1000, 5000, 150, 1000, 1000]; // biome movement cost
    const biomesMartix = [
      // hot ↔ cold [>19°C; <-4°C]; dry ↕ wet
      new Uint8Array([1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 10, 10, 10]),
      new Uint8Array([1, 1, 1, 6, 6, 6, 6, 6, 6, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 9, 9, 10, 10, 10, 3]),
      new Uint8Array([5, 11, 4, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 2, 2, 2, 2, 9, 9, 9, 9, 9, 9, 10, 10, 3]),
      new Uint8Array([5, 11, 4, 4, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 9, 9, 9, 9, 9, 9, 10, 3, 3]),
      new Uint8Array([5, 11, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 9, 9, 9, 9, 9, 10, 3, 3, 3])
    ];

    // parse icons weighted array into a simple array
    for (let i = 0; i < icons.length; i++) {
      const parsed = [];
      for (const icon in icons[i]) {
        for (let j = 0; j < icons[i][icon]; j++) {
          parsed.push(icon);
        }
      }
      icons[i] = parsed;
    }

    return {i: d3.range(0, name.length), name, color, biomesMartix, habitability, iconsDensity, icons, cost};
  };

  // assign biome id for each cell
  function define() {
    TIME && console.time("defineBiomes");

    const {fl: flux, r: riverIds, h: heights, c: neighbors, g: gridReference} = pack.cells;
    const {temp, prec, lat} = grid.cells;
    pack.cells.biome = new Uint8Array(pack.cells.i.length); // biomes array

    for (let cellId = 0; cellId < heights.length; cellId++) {
      const height = heights[cellId];
      const moisture = height < MIN_LAND_HEIGHT ? 0 : calculateMoisture(cellId);
      const temperature = temp[gridReference[cellId]];
      const latitude = lat[gridReference[cellId]];
      pack.cells.biome[cellId] = getId(moisture, temperature, height, Boolean(riverIds[cellId]), latitude);
    }

    function calculateMoisture(cellId) {
      let moisture = prec[gridReference[cellId]];
      if (riverIds[cellId]) moisture += Math.max(flux[cellId] / 10, 2);

      const moistAround = neighbors[cellId]
        .filter(neibCellId => heights[neibCellId] >= MIN_LAND_HEIGHT)
        .map(c => prec[gridReference[c]])
        .concat([moisture]);
      return rn(4 + d3.mean(moistAround));
    }

    TIME && console.timeEnd("defineBiomes");
  }

  function getId(moisture, temperature, height, hasRiver, latitude) {
    if (height > 45) return assignHighland(temperature);
    if (height < MIN_LAND_HEIGHT) return 0; // all water cells: marine biome
    if (temperature > 20 && moisture > 30 && height < 25) return 7; // swamp
    if (isMarsh(moisture, temperature, height)) return 12; // too wet: masrh biome

    // in other cases use biome matrix
    const moistureBand = Math.min((moisture / 5) | 0, 4); // [0-4]
    const temperatureBand = Math.min(Math.max(20 - temperature, 0), 25); // [0-25]
    return biomesData.biomesMartix[moistureBand][temperatureBand];
  }

  function assignHighland(temp) {
    if (temp > 16) return 13;
    return 14;
  }

  function isMarsh(moisture, temperature, height) {
    if (temperature <= 0 || temperature > 20) return false; // too cold or too hot
    if (moisture > 30 && height < 25) return true; // near coast
    return false;
  }

  return {getDefault, define, getId};
})();
