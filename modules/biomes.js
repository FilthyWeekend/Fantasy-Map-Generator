"use strict";

window.NBiomes = (function () {
  const MIN_LAND_HEIGHT = 20;


  const getDefault = () => {
    const name = [
      "Marine",
      "Savanna",
      "Prarie",
      "Folkvangr",
      "Elderwood",
      "Rainforest",
      "Meadow", // 6
      "Swamp",
      "Forest",
      "Taiga",
      "Tundra",
      "Bamboo grove", // 11
      "Marsh",
      "Cloud mountain",
      "Snow mountain",
      "Scarland", // 15
      "Springland",
      "Lavaland",
      "Iceland",
      "Kelp forest",
      "Island", // 20,
      "Coral reef",
      "Ice floes"
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
      "#733d15",
      "#96784b",
      "#61eda0", // 11
      "#78042c",
      "#07a3a6",
      "#ffffff",
      "#ced435", // 15
      "#ed7b09",
      "#fa0505",
      "#81f7ed",
      "#4f0cc4",
      "#8a00a6", // 20
      "#47f2f5",
      "#096596"
    ];
    const habitability = [
      0,
      4, 
      10, 
      2, 
      30, 
      50, 
      100, // 6
      80, 
      90, 
      12, 
      4, 
      0, 
      12, 
      50, 
      20, 
      100, 
      100, 
      0, 
      0, 
      0, 
      100,
      0,
      0
    ];
    const iconsDensity = [
      0, 
      3, 
      2, 
      120, 
      120, 
      120, 
      80, // 6
      150, 
      200, 
      100, 
      5, 
      0, 
      250, 
      200, 
      10, 
      100, 
      100, 
      1, 
      10, 
      10, 
      50, // 20
      0,
      0
    ];
    const icons = [
      {},
      {dune: 3, cactus: 6, },
      {dune: 9, },
      {swamp: 1, grass: 9},
      {deadTree: 8, swamp: 2},
      {acacia: 8, palm: 1},
      {grass: 9, deciduous: 1}, // 6
      {acacia: 5, swamp: 5},
      {deciduous: 9, conifer: 1},
      {coniferSnow: 1},
      {grass: 1},
      {},
      {swamp: 1},
      {acacia: 1},
      {coniferSnow: 1},
      {},
      {},
      {vulcan: 1},
      {},
      {},
      {palm: 1}, // 20
      {},
      {}
    ];
    const cost = [ // biome movement cost
      10, 
      200, 
      150, 
      60, 
      50, 
      70, 
      50, // 6
      80, 
      120, 
      200, 
      1000, 
      5000, 
      150, 
      1000, 
      1000, 
      500, 
      500, 
      500, 
      500, 
      1000, 
      100,
      20,
      30
    ]; 
    const biomesMartix = [
      // hot ↔ cold [>19°C; <-4°C]; dry ↕ wet
      new Uint8Array([1, 1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 10, 10, 17]),
      new Uint8Array([1, 1, 1, 6, 6, 6, 6, 6, 6, 6, 6, 6, 2, 2, 2, 2, 2, 2, 2, 2, 9, 10, 10, 10, 10, 3]),
      new Uint8Array([5, 11, 11, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 8, 2, 2, 2, 4, 9, 9, 9, 10, 10, 18, 3]),
      new Uint8Array([5, 16, 11, 8, 8, 8, 6, 6, 8, 8, 8, 8, 8, 8, 8, 8, 4, 9, 9, 9, 9, 16, 9, 10, 3, 3]),
      new Uint8Array([5, 11, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 8, 4, 4, 9, 9, 9, 9, 9, 10, 3, 3, 3])
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
      pack.cells.biome[cellId] = getId(moisture, temperature, height, Boolean(riverIds[cellId]), cellId);
    }

    const maxIslandSize = 30;
    const tropicIslandLat = 20;
    const polarIslandLat = 55;

    // recolour island biomes
    for (let cellId = 0; cellId < heights.length; cellId++) { 
      const height = heights[cellId];
      const latitude = Math.abs(lat[gridReference[cellId]]);
      const biome = pack.cells.biome[cellId];

      if (height < MIN_LAND_HEIGHT - 1) {
        pack.cells.biome[cellId] = assignCoastBiome(cellId);
      } else if (biome != 20 && biome != 18) { // sea or already marked as island
        const visitedCells = [cellId];
  
        if ((latitude < tropicIslandLat || latitude > polarIslandLat) && isIsland(cellId, visitedCells)) {
          const islandType = Math.abs(latitude) < tropicIslandLat ? 20 : 18
          visitedCells.forEach(islandCellId => pack.cells.biome[islandCellId] = islandType);
        }
      }
    }

    function assignCoastBiome(cellId) {
      var biomeId = 0;
      for (const adjCellId of neighbors[cellId]) {
        const adjBiome = pack.cells.biome[adjCellId];
        if ([2, 6, 8, 15].includes(adjBiome)) {
          biomeId = 19;
          break;
        }
        if ([5, 13, 20].includes(adjBiome)) {
          biomeId = 21;
          break;
        }
        if ([3, 18].includes(adjBiome)) {
          biomeId = 22;
          break;
        }
      }
      return biomeId;
    }

    function isIsland(cellId, visitedCells) {
      const adjacentLandCells = neighbors[cellId]
        .filter(neibCellId => 
          heights[neibCellId] >= MIN_LAND_HEIGHT
          && !visitedCells.includes(neibCellId));

      if (adjacentLandCells.length == 0) return true;
        
      for (const adjCellId of adjacentLandCells) {
        visitedCells.push(adjCellId);
        if (visitedCells.length > maxIslandSize) return false;
        if (!isIsland(adjCellId, visitedCells)) return false;
      };

      return true;
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

  function getId(moisture, temperature, height, hasRiver, cellId) {
    if (height < MIN_LAND_HEIGHT) return 0; // all water cells: marine biome
    if (isGorge(height, hasRiver, cellId)) return 15;
    if (height > 45) return assignHighlandId(temperature, hasRiver);
    if (temperature > 20 && moisture > 30 && height < 25) return 7; // swamp
    if (isMarsh(moisture, temperature, height)) return 12; // too wet: masrh biome

    // in other cases use biome matrix
    const moistureBand = Math.min((moisture / 5) | 0, 4); // [0-4]
    const temperatureBand = Math.min(Math.max(20 - temperature, 0), 25); // [0-25]
    return biomesData.biomesMartix[moistureBand][temperatureBand];
  }

  function assignHighlandId(temp, hasRiver) {
    if (temp > 14) return 13; // cloud mountain
    if (temp < 11) return 14; // snow mountain
    if (!hasRiver) return 16; // springland
    return 11; // bamboo grove
  }

  function isGorge(height, hasRiver, cellId) {
    const {fl: flux, r: riverIds, h: heights, c: neighbors, g: gridReference} = pack.cells;
    const minGorgeFlux = 120;

    if (height > 25) {
      return neighbors[cellId]
        .filter(neibCellId => Boolean(riverIds[neibCellId]) && neighborhoodHeightCheck(neibCellId))
        .some(neibCellId => flux[neibCellId] > minGorgeFlux);
    }
    if (hasRiver && flux[cellId] > minGorgeFlux) {
      return neighborhoodHeightCheck(cellId);
    }

    function neighborhoodHeightCheck(cellId) {
      return neighbors[cellId].filter(neibCellId => heights[neibCellId] > 25).length > 1; // at least 2 tall neighboring cells
    }
  }

  function isMarsh(moisture, temperature, height) {
    if (temperature <= 0 || temperature > 20) return false; // too cold or too hot
    if (moisture > 30 && height < 25) return true; // near coast
    return false;
  }

  return {getDefault, define, getId};
})();
