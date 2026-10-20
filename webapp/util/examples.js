sap.ui.define([], function () {
  "use strict";

  // Starter queries for the Query Playground. They show SQL techniques on the case data, NOT the answer to the case
  // (tools/test.js checks that none of them groups the Coding Club by weekday).
  return [
    { id: "codingClubEvents", title: "All Coding Club events (table)",
      code: "SELECT date, title, topic, registered, checked_in, capacity\nFROM events\nWHERE club_id = 'C01'\nORDER BY date" },
    { id: "membersByClub", title: "Members per club (bar chart)",
      code: "SELECT name, members\nFROM clubs\nORDER BY members DESC" },
    { id: "eventsByClub", title: "Events per club, with the club name (JOIN)",
      code: "SELECT c.name AS club, COUNT(*) AS events\nFROM events e\nJOIN clubs c ON c.club_id = e.club_id\nGROUP BY c.name\nORDER BY events DESC" },
    { id: "seatsByWeek", title: "Coding Club: seats filled per week (line chart)",
      code: "SELECT week, ROUND(AVG(fill_pct)) AS fill_pct\nFROM events\nWHERE club_id = 'C01'\nGROUP BY week\nORDER BY week" },
    { id: "reachByChannel", title: "People reached per channel (donut)",
      code: "SELECT channel, SUM(reach) AS reach\nFROM promotion_posts\nGROUP BY channel\nORDER BY reach DESC" },
    { id: "ratingByClub", title: "Average rating per club, 1 decimal",
      code: "SELECT c.name AS club, ROUND(AVG(e.avg_rating), 1) AS rating\nFROM events e\nJOIN clubs c ON c.club_id = e.club_id\nGROUP BY c.name\nORDER BY rating DESC" },
    { id: "earlyVsLate", title: "Two groups with CASE: weeks 1-5 vs. 6-10",
      code: "SELECT CASE WHEN week <= 5 THEN 'Weeks 1-5' ELSE 'Weeks 6-10' END AS period,\n       COUNT(*) AS events\nFROM events\nGROUP BY period" },
    { id: "semester", title: "One row: key numbers for a KPI",
      code: "SELECT COUNT(*) AS events,\n       SUM(checked_in) AS people,\n       ROUND(AVG(avg_rating), 1) AS rating\nFROM events" },
    { id: "codingClub", title: "One row: the Coding Club record",
      code: "SELECT *\nFROM clubs\nWHERE club_id = 'C01'" }
  ];
});
