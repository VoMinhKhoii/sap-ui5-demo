sap.ui.define([], function () {
  "use strict";

  /*
   * YOUR DATA. Every entry below becomes a path you can bind in your pages:
   *
   *   name: sql(`SELECT …`)       many rows  →  items="{/name}" (table, list) or data="{/name}" (chart),
   *                                              then {column} inside, e.g. {members}
   *   name: sql.one(`SELECT …`)   one row    →  {/name/column} anywhere, e.g. text="{/codingClub/members}"
   *
   * 1. Write the query in the kit's Query Playground (tab 1) until the result looks right.
   * 2. Click "Copy for data.js" and paste it between the 🧩 markers below.
   * 3. Save, press F5 in your app. Broken query? A message tells you which one and why.
   *
   * Tip: name every calculated column with AS, e.g. ROUND(AVG(avg_rating), 1) AS rating.
   * That name is what you bind to.
   */
  return function (sql) {
    return {
      // Example: members per club. Bind a chart to {/membersByClub} with {name} and {members}.
      membersByClub: sql(`
        SELECT name, members
        FROM clubs
        ORDER BY members DESC
      `),

      // 🧩 YOUR QUERIES START

      // 🧩 YOUR QUERIES END
    };
  };
});
