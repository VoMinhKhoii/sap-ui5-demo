sap.ui.define([], function () {
  "use strict";

  /**
   * q(): a tiny query helper over the ERP entities, so turning raw data into chart data is one line.
   *
   *   q("A_SalesOrderItem").join("A_SalesOrder").join("A_Customer")
   *     .groupBy("SalesRegion").sum("NetAmount").sortBy("value", "desc")
   *   → [{ name: "DACH", SalesRegion: "DACH", value: 19777000, count: 312, share: 40.7 }, ...]
   *
   * Every grouped result has the same shape as /breakdown ({ name, value, share }) and every monthly result
   * has { month, period, value }, so gallery blocks work after changing one path.
   * Queries are lazy: nothing runs until .resolve() (the app does that for you), and errors name the step
   * that failed with a "did you mean" hint.
   */

  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const OPS = {
    "=": function (a, b) { return a === b; },
    "==": function (a, b) { return a === b; },
    "!=": function (a, b) { return a !== b; },
    ">": function (a, b) { return a > b; },
    ">=": function (a, b) { return a >= b; },
    "<": function (a, b) { return a < b; },
    "<=": function (a, b) { return a <= b; },
    "contains": function (a, b) { return String(a).toLowerCase().indexOf(String(b).toLowerCase()) > -1; },
    "in": function (a, b) { return b.indexOf(a) > -1; }
  };

  function round(n) {
    return typeof n === "number" ? Math.round(n * 100) / 100 : n;
  }

  function distance(a, b) {
    a = a.toLowerCase(); b = b.toLowerCase();
    const d = [];
    for (let i = 0; i <= a.length; i++) { d[i] = [i]; }
    for (let j = 1; j <= b.length; j++) { d[0][j] = j; }
    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
    }
    return d[a.length][b.length];
  }

  function closest(name, candidates) {
    let best = null, bestScore = Infinity;
    candidates.forEach(function (c) {
      const score = c.toLowerCase().indexOf(name.toLowerCase()) > -1 ? 0.5 : distance(name, c);
      if (score < bestScore) { best = c; bestScore = score; }
    });
    return bestScore <= Math.max(3, name.length / 2) ? best : null;
  }

  function fieldsOf(rows) {
    const set = {};
    rows.slice(0, 50).forEach(function (r) { Object.keys(r).forEach(function (k) { set[k] = true; }); });
    return Object.keys(set);
  }

  function checkField(rows, field, step) {
    if (typeof field !== "string" || !rows.length) {
      return;
    }
    const fields = fieldsOf(rows);
    if (fields.indexOf(field) === -1) {
      const hint = closest(field, fields);
      throw new Error(step + ": there is no field \"" + field + "\"." + (hint ? " Did you mean \"" + hint + "\"?" : "") +
        " Available: " + fields.join(", "));
    }
  }

  function getter(field) {
    return typeof field === "function" ? field : function (row) { return row[field]; };
  }

  function monthKey(value) {
    const s = String(value || "");
    return /^\d{4}-\d{2}/.test(s) ? s.slice(0, 7) : null;
  }

  function monthLabel(key) {
    return MONTHS[Number(key.slice(5, 7)) - 1] + " " + key.slice(2, 4);
  }

  function nextMonth(key) {
    let y = Number(key.slice(0, 4)), m = Number(key.slice(5, 7)) + 1;
    if (m > 12) { m = 1; y++; }
    return y + "-" + String(m).padStart(2, "0");
  }

  /** Creates the q() function for a database { EntityName: rows[] } and a list of relations. */
  function create(db, relations) {
    relations = relations || [];

    function entityRows(name) {
      if (Array.isArray(name)) {
        return name;
      }
      if (!db[name]) {
        const hint = closest(String(name), Object.keys(db));
        throw new Error("q(\"" + name + "\"): unknown entity." + (hint ? " Did you mean \"" + hint + "\"?" : "") +
          " Entities: " + Object.keys(db).join(", "));
      }
      return db[name];
    }

    function Query(source, ops) {
      this._source = source;
      this._ops = ops || [];
    }

    Query.prototype._then = function (label, fn) {
      return new Query(this._source, this._ops.concat([{ label: label, fn: fn }]));
    };

    /** Runs the query. Returns an array of rows, a number (sum/count/... without groupBy) or one object (first). */
    Query.prototype.resolve = function () {
      const state = {
        mode: "rows",
        entities: typeof this._source === "string" ? [this._source] : [],
        source: entityRows(this._source),
        rows: entityRows(this._source).map(function (r) { return Object.assign({}, r); })
      };
      this._ops.forEach(function (op) {
        op.fn(state, op.label);
      });
      if (state.mode === "scalar" || state.mode === "first") {
        return state.value;
      }
      if (state.mode === "grouped") {
        // groupBy without an aggregate: count the rows
        aggregate("count", null, "value")(state, "count()");
      }
      if (state.mode === "result") {
        const rows = state.rows;
        if (!state.time && rows.length && typeof rows[0].value === "number") {
          const total = rows.reduce(function (s, r) { return s + (r.value || 0); }, 0);
          rows.forEach(function (r) { r.share = total ? Math.round(r.value / total * 1000) / 10 : 0; });
        }
        return rows.map(function (r) {
          const copy = Object.assign({}, r);
          delete copy._items;
          return copy;
        });
      }
      return state.rows;
    };
    Query.prototype.rows = Query.prototype.resolve;
    Query.prototype.toJSON = Query.prototype.resolve;

    // ---- Row operations -------------------------------------------------------------------------------

    /** Adds the fields of a related entity. The key is found automatically: .join("A_Customer") */
    Query.prototype.join = function (entity, localField, foreignField) {
      return this._then("join(\"" + entity + "\")", function (state, label) {
        if (state.mode !== "rows") {
          throw new Error(label + ": join before groupBy/byMonth.");
        }
        const right = entityRows(entity);
        if (!localField) {
          const rel = relations.find(function (r) { return r.to === entity && state.entities.indexOf(r.from) > -1; });
          if (!rel) {
            const reverse = relations.find(function (r) { return r.from === entity && state.entities.indexOf(r.to) > -1; });
            throw new Error(label + ": no automatic key from " + state.entities.join(" + ") + " to " + entity + "." +
              (reverse ? " " + entity + " has many rows per " + reverse.to + ": use .include(\"" + entity + "\") instead." :
                " Name the fields: .join(\"" + entity + "\", \"MyField\", \"TheirField\")."));
          }
          localField = rel.field;
          foreignField = rel.key;
        }
        foreignField = foreignField || localField;
        checkField(state.rows, localField, label);
        checkField(right, foreignField, label);
        const index = {};
        right.forEach(function (r) { index[r[foreignField]] = r; });
        const short = String(entity).replace(/^(A_|ZI_)/, "");
        state.rows.forEach(function (row) {
          const match = index[row[localField]];
          if (match) {
            Object.keys(match).forEach(function (k) {
              if (!(k in row)) {
                row[k] = match[k];
              } else if (row[k] !== match[k]) {
                row[short + "_" + k] = match[k];
              }
            });
          }
        });
        state.entities.push(entity);
      });
    };

    /** Adds the related child rows as an array, e.g. every customer gets its orders: .include("A_SalesOrder") */
    Query.prototype.include = function (entity, as) {
      return this._then("include(\"" + entity + "\")", function (state, label) {
        const rel = relations.find(function (r) { return r.from === entity && state.entities.indexOf(r.to) > -1; });
        if (!rel) {
          throw new Error(label + ": " + entity + " is not linked to " + state.entities.join(" + ") + ".");
        }
        const children = {};
        entityRows(entity).forEach(function (c) { (children[c[rel.field]] = children[c[rel.field]] || []).push(Object.assign({}, c)); });
        state.rows.forEach(function (row) { row[as || entity] = children[row[rel.key]] || []; });
      });
    };

    /** .where(r => r.Country === "FR")  or  .where("Country", "FR")  or  .where("NetAmount", ">", 1000) */
    Query.prototype.where = function (field, op, value) {
      const operator = arguments.length === 2 ? "=" : op;
      const expected = arguments.length === 2 ? op : value;
      return this._then("where(" + (typeof field === "string" ? "\"" + field + "\"" : "…") + ")", function (state, label) {
        let test;
        if (typeof field === "function") {
          test = field;
        } else {
          if (!OPS[operator]) {
            throw new Error(label + ": unknown operator \"" + operator + "\". Use one of " + Object.keys(OPS).join(" "));
          }
          checkField(state.rows, field, label);
          test = function (r) { return OPS[operator](r[field], expected); };
        }
        state.rows = state.rows.filter(test);
      });
    };

    /** Adds a calculated field: .compute("Margin", r => r.NetAmount - r.RequestedQuantity * r.StandardPrice) */
    Query.prototype.compute = function (name, fn) {
      return this._then("compute(\"" + name + "\")", function (state) {
        state.rows.forEach(function (r) { r[name] = fn(r); });
      });
    };

    /** Keeps only some fields: .select("CustomerName", "Country") */
    Query.prototype.select = function () {
      const fields = Array.prototype.slice.call(arguments);
      return this._then("select()", function (state, label) {
        fields.forEach(function (f) { checkField(state.rows, f, label); });
        state.rows = state.rows.map(function (r) {
          const o = {};
          fields.forEach(function (f) { o[f] = r[f]; });
          return o;
        });
      });
    };

    /** .sortBy("value", "desc") */
    Query.prototype.sortBy = function (field, direction) {
      return this._then("sortBy(\"" + field + "\")", function (state, label) {
        if (state.mode === "grouped") {
          throw new Error(label + ": add an aggregate (sum, count …) before sortBy.");
        }
        checkField(state.rows, field, label);
        const dir = direction === "desc" ? -1 : 1;
        state.rows.sort(function (a, b) {
          return (a[field] > b[field] ? 1 : a[field] < b[field] ? -1 : 0) * dir;
        });
      });
    };

    /** First n rows: .top(5) */
    Query.prototype.top = function (n) {
      return this._then("top(" + n + ")", function (state) {
        state.rows = state.rows.slice(0, n);
      });
    };

    /** Only the first row, as an object: bind {/myQuery/CustomerName} */
    Query.prototype.first = function () {
      return this._then("first()", function (state) {
        state.mode = "first";
        state.value = state.rows[0] ? Object.assign({}, state.rows[0]) : null;
        if (state.value) {
          delete state.value._items;
        }
      });
    };

    // ---- Grouping -------------------------------------------------------------------------------------

    function group(state, keyOf, label, extra) {
      const groups = {}, order = [];
      state.rows.forEach(function (row) {
        const key = keyOf(row);
        if (!(key in groups)) {
          groups[key] = { _items: [] };
          extra(groups[key], row, key);
          order.push(key);
        }
        groups[key]._items.push(row);
      });
      state.rows = order.map(function (k) { return groups[k]; });
      state.mode = "grouped";
      state.aggregates = 0;
    }

    /** One row per value: .groupBy("SalesRegion") or several fields: .groupBy("SalesRegion", "CustomerGroupText") */
    Query.prototype.groupBy = function () {
      const fields = Array.prototype.slice.call(arguments);
      return this._then("groupBy(" + fields.map(function (f) { return typeof f === "string" ? "\"" + f + "\"" : "…"; }).join(", ") + ")", function (state, label) {
        fields.forEach(function (f) { checkField(state.rows, f, label); });
        const getters = fields.map(getter);
        group(state, function (row) {
          return getters.map(function (g) { return g(row); }).join(" / ");
        }, label, function (out, row, key) {
          out.name = key;
          fields.forEach(function (f, i) {
            if (typeof f === "string") { out[f] = getters[i](row); }
          });
        });
      });
    };

    /** One row per month: .byMonth("SalesOrderDate") → { month: "Jun 26", period: "2026-06", ... }. Extra fields split the series. */
    Query.prototype.byMonth = function (dateField) {
      const extra = Array.prototype.slice.call(arguments, 1);
      return this._then("byMonth(\"" + dateField + "\")", function (state, label) {
        checkField(state.rows, dateField, label);
        extra.forEach(function (f) { checkField(state.rows, f, label); });
        state.rows = state.rows.filter(function (r) { return monthKey(r[dateField]); });
        group(state, function (row) {
          return monthKey(row[dateField]) + extra.map(function (f) { return "|" + row[f]; }).join("");
        }, label, function (out, row) {
          const key = monthKey(row[dateField]);
          out.month = monthLabel(key);
          out.period = key;
          extra.forEach(function (f) { out[f] = row[f]; });
        });
        // Fill months without data so time axes have no gaps (single series only). The range is every month of
        // the source table, so a customer who stopped ordering shows zeros instead of a shorter axis.
        if (!extra.length && state.rows.length) {
          const have = {};
          state.rows.forEach(function (r) { have[r.period] = r; });
          const keys = state.source.map(function (r) { return monthKey(r[dateField]); }).filter(Boolean)
            .concat(Object.keys(have)).sort();
          const filled = [];
          for (let k = keys[0]; k <= keys[keys.length - 1]; k = nextMonth(k)) {
            filled.push(have[k] || { month: monthLabel(k), period: k, _items: [] });
          }
          state.rows = filled;
        }
        state.rows.sort(function (a, b) { return a.period < b.period ? -1 : a.period > b.period ? 1 : 0; });
        state.time = true;
      });
    };

    // ---- Aggregates -----------------------------------------------------------------------------------

    const REDUCERS = {
      sum: function (items, get) { return items.reduce(function (s, r) { return s + (Number(get(r)) || 0); }, 0); },
      avg: function (items, get) { return items.length ? REDUCERS.sum(items, get) / items.length : null; },
      min: function (items, get) { return items.length ? Math.min.apply(null, items.map(get)) : null; },
      max: function (items, get) { return items.length ? Math.max.apply(null, items.map(get)) : null; },
      count: function (items) { return items.length; },
      percent: function (items, get) { return items.length ? items.filter(get).length / items.length * 100 : null; }
    };

    function aggregate(kind, field, as, filter, denominator) {
      return function (state, label) {
        if (state.mode === "scalar" || state.mode === "first") {
          throw new Error(label + ": the query already returns a single value.");
        }
        if (field && typeof field === "string") {
          checkField(state.mode === "rows" ? state.rows : [].concat.apply([], state.rows.map(function (g) { return g._items; })), field, label);
        }
        const get = field ? getter(field) : null;
        const compute = function (items) {
          if (filter) {
            items = items.filter(filter);
          }
          if (kind === "ratio") {
            const below = REDUCERS.sum(items, getter(denominator));
            return below ? REDUCERS.sum(items, get) / below * 100 : null;
          }
          return REDUCERS[kind](items, get);
        };
        if (state.mode === "rows") {
          state.mode = "scalar";
          state.value = round(compute(state.rows));
          return;
        }
        const name = as || (state.aggregates === 0 ? "value" : typeof field === "string" ? field : kind);
        state.rows.forEach(function (g) { g[name] = round(compute(g._items)); });
        if (state.mode === "grouped") {
          state.rows.forEach(function (g) { g.count = g._items.length; });
        }
        state.mode = "result";
        state.aggregates++;
      };
    }

    function label(kind, field, as) {
      return kind + "(" + (typeof field === "string" ? "\"" + field + "\"" : "") + (as ? ", \"" + as + "\"" : "") + ")";
    }

    /** .sum("NetAmount") · .sum("BudgetCO2eTonnes", "target") · .sum("CO2eTonnes", "Leipzig", r => r.PlantName === "Leipzig") */
    ["sum", "avg", "min", "max"].forEach(function (kind) {
      Query.prototype[kind] = function (field, as, filter) {
        return this._then(label(kind, field, as), aggregate(kind, field, as, filter));
      };
    });

    /** Number of rows: .count() · .count("overdue", r => r.PaymentStatusText === "Overdue") */
    Query.prototype.count = function (as, filter) {
      return this._then(label("count", null, as), aggregate("count", null, as, filter));
    };

    /** Share of rows (in %) where a field is true or a test passes: .percent("OnTimeDelivery") */
    Query.prototype.percent = function (fieldOrTest, as) {
      return this._then(label("percent", fieldOrTest, as), aggregate("percent", fieldOrTest, as));
    };

    /** sum(a) / sum(b) in %: .ratio("RenewableElectricityMWh", "ElectricityMWh") */
    Query.prototype.ratio = function (numerator, denominator, as) {
      return this._then(label("ratio", numerator, as), function (state, l) {
        if (typeof denominator === "string") {
          checkField(state.mode === "rows" ? state.rows : [].concat.apply([], state.rows.map(function (g) { return g._items; })), denominator, l);
        }
        aggregate("ratio", numerator, as, null, denominator)(state, l);
      });
    };

    /**
     * Compares value with target and adds state (Good/Critical/Error, for charts and NumericHeader),
     * valueState (Success/Warning/Error, for ObjectStatus) and deltaPercent. Needs a field named target.
     */
    Query.prototype.withState = function (higherIsBetter) {
      const hib = higherIsBetter !== false;
      return this._then("withState()", function (state, l) {
        checkField(state.rows, "target", l);
        state.rows.forEach(function (r) {
          const good = hib ? r.value >= r.target : r.value <= r.target;
          const off = r.target ? Math.abs(r.value - r.target) / r.target : 1;
          r.state = good ? "Good" : off <= 0.1 ? "Critical" : "Error";
          r.valueState = { Good: "Success", Critical: "Warning", Error: "Error" }[r.state];
          r.deltaPercent = r.target ? Math.round((r.value - r.target) / r.target * 1000) / 10 : null;
        });
      });
    };

    /**
     * Adds the value of another result, matched by name (or by month):
     * .groupBy("SalesRegion").sum("TotalNetAmount").merge(q("ZI_SalesPlan").groupBy("SalesRegion").sum("PlanAmount"), "target")
     */
    Query.prototype.merge = function (other, as, field) {
      return this._then("merge(…, \"" + (as || "target") + "\")", function (state, l) {
        if (state.mode !== "result") {
          throw new Error(l + ": merge comes after an aggregate, e.g. .groupBy(…).sum(…).merge(…)");
        }
        const rows = other instanceof Query ? other.resolve() : other;
        if (!Array.isArray(rows)) {
          throw new Error(l + ": the other query must return rows (use groupBy or byMonth there too).");
        }
        const key = state.time ? "period" : "name";
        const index = {};
        rows.forEach(function (r) { index[r[key]] = r; });
        state.rows.forEach(function (r) {
          const match = index[r[key]];
          r[as || "target"] = match ? match[field || "value"] : null;
        });
        state.aggregates++;
      });
    };

    function q(source) {
      entityRows(source); // fail early on unknown entity names
      return new Query(source);
    }
    q.isQuery = function (x) {
      return x instanceof Query;
    };
    /** Runs query code typed as text (the Playground): 'q("A_Plant").count()' → 5 */
    q.run = function (code) {
      const body = /(^|\n)\s*return\b/.test(code) ? code : "return (" + code + "\n);";
      // eslint-disable-next-line no-new-func
      const result = new Function("q", "\"use strict\";\n" + body)(q);
      return q.isQuery(result) ? result.resolve() : result;
    };
    return q;
  }

  return { create: create };
});
