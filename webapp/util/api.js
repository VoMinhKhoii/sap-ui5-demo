sap.ui.define([], function () {
  "use strict";

  // The workshop "REST API" is a set of static JSON files under webapp/api/.
  // ui5 serve hosts them next to the app, so this is a normal HTTP GET (no CORS, no backend).
  const BASE = sap.ui.require.toUrl("workshop/dashboard/api");
  const ENDPOINTS = ["meta", "kpis", "trend", "breakdown", "items", "alerts"];

  function getJson(url) {
    return fetch(url).then(function (response) {
      if (!response.ok) {
        throw new Error("GET " + url + " failed: " + response.status);
      }
      return response.json();
    });
  }

  return {
    ENDPOINTS: ENDPOINTS,

    url: function (scenarioId, endpoint) {
      return BASE + "/" + scenarioId + "/" + endpoint + ".json";
    },

    get: function (scenarioId, endpoint) {
      return getJson(this.url(scenarioId, endpoint));
    },

    loadIndex: function () {
      if (!this._index) {
        this._index = getJson(BASE + "/index.json");
      }
      return this._index;
    },

    /** Calls every endpoint of a scenario and returns { meta, kpis, trend, breakdown, items, alerts }. */
    loadScenario: function (scenarioId) {
      return Promise.all(ENDPOINTS.map(function (endpoint) {
        return this.get(scenarioId, endpoint);
      }.bind(this))).then(function (results) {
        const data = {};
        ENDPOINTS.forEach(function (endpoint, i) { data[endpoint] = results[i]; });
        return data;
      });
    },

    /**
     * Which scenarios are switched on: webapp/config.json, or ?scenarios=all / ?scenarios=sales,sustainability in the URL.
     * @returns {Promise<string[]>} scenario ids
     */
    loadConfig: function () {
      if (!this._config) {
        const fromUrl = new URLSearchParams(window.location.search).get("scenarios");
        this._config = Promise.all([getJson(sap.ui.require.toUrl("workshop/dashboard/config.json")), this.loadIndex()]).then(function (results) {
          const all = results[1].scenarios.map(function (s) { return s.id; });
          const wanted = fromUrl === "all" ? all : fromUrl ? fromUrl.split(",") : results[0].scenarios;
          return all.filter(function (id) { return wanted.indexOf(id) > -1; });
        });
      }
      return this._config;
    },

    /** Loads the ERP tables of the switched-on scenarios: { index, db: { ZI_PlantEmissions: [...], ... } }. Cached. */
    loadErp: function () {
      if (!this._erp) {
        this._erp = Promise.all([getJson(BASE + "/erp/index.json"), this.loadConfig()]).then(function (results) {
          const scenarios = results[1];
          const index = Object.assign({}, results[0], {
            entities: results[0].entities.filter(function (e) {
              return e.scenarios.some(function (s) { return scenarios.indexOf(s) > -1; });
            })
          });
          const names = index.entities.map(function (e) { return e.name; });
          index.relations = index.relations.filter(function (r) { return names.indexOf(r.from) > -1 && names.indexOf(r.to) > -1; });
          return Promise.all(index.entities.map(function (entity) {
            return getJson(BASE + "/erp/" + entity.name + ".json");
          })).then(function (results) {
            const db = {};
            index.entities.forEach(function (entity, i) { db[entity.name] = results[i].value; });
            return { index: index, db: db };
          });
        });
      }
      return this._erp;
    },

    erpUrl: function (entity) {
      return BASE + "/erp/" + entity + ".json";
    },

    /** The cases of the switched-on scenarios. */
    loadCases: function () {
      return Promise.all([getJson(BASE + "/cases.json"), this.loadConfig()]).then(function (results) {
        return results[0].filter(function (c) { return results[1].indexOf(c.scenario) > -1; });
      });
    },

    emptyScenario: function () {
      return { meta: { trend: {}, breakdown: {}, items: { columns: {} } }, kpis: [], trend: [], breakdown: [], items: [], alerts: [] };
    }
  };
});
