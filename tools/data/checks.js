function checks(t) {
  const list = [];
  const check = (ok, text) => list.push({ ok: !!ok, text });
  const sum = (es, f) => es.reduce((s, e) => s + f(e), 0);
  const fill = (es) => sum(es, (e) => e.checked_in) / sum(es, (e) => e.capacity) * 100;
  const show = (es) => sum(es, (e) => e.checked_in) / sum(es, (e) => e.registered) * 100;
  const signup = (es) => sum(es, (e) => e.registered) / sum(es, (e) => e.capacity) * 100;
  const r = (x) => Math.round(x);

  const cc = t.events.filter((e) => e.club_id === "C01");
  const others = t.events.filter((e) => e.club_id !== "C01");
  const recent = cc.filter((e) => e.date >= "2026-10-05");
  const fri = (e) => e.weekday === "Fri";
  const topic = (es, tp) => es.filter((e) => e.topic === tp);
  const rating = (tp) => sum(topic(cc, tp), (e) => e.avg_rating) / topic(cc, tp).length;

  const naive = { Workshop: fill(topic(recent, "Workshop")), Talk: fill(topic(recent, "Talk")), Social: fill(topic(recent, "Social")) };
  check(naive.Workshop < naive.Talk - 15 && naive.Workshop < naive.Social,
    `trap: since October workshops look worst (${r(naive.Workshop)}% of seats vs. talks ${r(naive.Talk)}%, socials ${r(naive.Social)}%)`);
  const ws = (d) => fill(cc.filter((e) => e.topic === "Workshop" && e.weekday === d));
  check(ws("Wed") >= 65 && ws("Thu") >= 65 && ws("Fri") < 50, `weekday workshops fill well (Wed ${r(ws("Wed"))}%, Thu ${r(ws("Thu"))}%), Friday ones don't (${r(ws("Fri"))}%)`);
  check(signup(recent.filter(fri)) >= 80, `people still sign up for Friday events (${r(signup(recent.filter(fri)))}% of seats)`);
  check(show(recent.filter(fri)) <= 50 && show(recent.filter((e) => e.weekday === "Wed")) >= 75,
    `but only ${r(show(recent.filter(fri)))}% of them turn up on Friday, vs. ${r(show(recent.filter((e) => e.weekday === "Wed")))}% on Wednesday`);
  check(rating("Workshop") > rating("Talk") && rating("Workshop") > rating("Social"),
    `workshops get the best ratings (${rating("Workshop").toFixed(2)} vs. talks ${rating("Talk").toFixed(2)}, socials ${rating("Social").toFixed(2)})`);
  check(show(others.filter(fri)) <= 55 && show(others.filter((e) => !fri(e))) >= 75,
    `other clubs see the same Friday drop (${r(show(others.filter(fri)))}% vs. ${r(show(others.filter((e) => !fri(e))))}% Mon-Thu)`);
  const before = cc.filter((e) => e.week < 7), after = cc.filter((e) => e.week >= 7);
  const reach = (es) => sum(t.promotion_posts.filter((p) => es.some((e) => e.event_id === p.event_id)), (p) => p.reach) / es.length;
  check(reach(after) < reach(before) / 2 && Math.abs(signup(before) - signup(after)) <= 6,
    `red herring: reach per event fell ${r(reach(before))} → ${r(reach(after))} after Instagram stopped (week 7), sign-ups didn't (${r(signup(before))}% → ${r(signup(after))}%)`);
  const lab = t.room_bookings.filter((b) => b.room === "M105").map((b) => b.weekday);
  check(lab.indexOf("Tue") < 0 && lab.indexOf("Fri") < 0, `next semester the lab M105 is free on Tuesday (booked: ${lab.join(", ")})`);

  const no = (es, min, text) => check(show(es) >= min, `not ${text} (${r(show(es))}% show-up)`);
  const yes = (es, max, text) => check(show(es) <= max, `Friday drop holds ${text} (${r(show(es))}% show-up)`);
  no(cc.filter((e) => e.organiser === "Jonas Becker" && !fri(e)), 75, "the organiser: Jonas runs every Friday event, his weekday events are fine");
  no(cc.filter((e) => e.room === "M105" && e.weekday === "Thu"), 75, "the room: the same lab on Thursdays, weeks 1-4");
  yes(cc.filter((e) => fri(e) && e.week < 7), 55, "with Instagram posts (Fridays in weeks 5-6)");
  no(cc.filter((e) => e.weekday === "Wed" && e.week >= 7), 75, "promotion: Wednesdays without Instagram (weeks 7-10)");
  no(cc.filter((e) => !fri(e) && e.week >= 7), 75, "end-of-semester fatigue: weekday events in weeks 7-10");
  no(others.filter((e) => !fri(e) && e.start_time >= "18:30"), 75, "the late start time: other clubs' weekday events at 18:30 or later");
  yes(others.filter((e) => fri(e) && e.start_time < "18:30"), 55, "for other clubs' Friday events before 18:30");
  yes(cc.filter((e) => fri(e) && e.topic !== "Workshop"), 55, "for the Friday social, so it's not workshops on Friday");
  const perWeek = [...Array(10)].map((_, i) => cc.filter((e) => e.topic === "Workshop" && e.week === i + 1).length);
  check(perWeek.every((x) => x >= 1), `the Coding Club runs a workshop every week (${perWeek.join(" ")})`);
  return list;
}

module.exports = { checks };
