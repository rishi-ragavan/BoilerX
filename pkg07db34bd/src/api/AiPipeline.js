/*
 * AiPipeline — Lane B owns this file.
 *
 * STEP 0 STUB: analyzePost implements only the deterministic FALLBACK from §1.4 (no LLM yet). Lane B replaces the
 * bodies with the built-in LLM call (GenaiCore.Llm.Completion.Client [verify]) and keeps `fallbackAnalyze` for
 * LLM error / > 8 s timeout / invalid JSON. Method signatures in AiPipeline.c3typ are frozen.
 */

var STOPWORDS = {};
(
  'a an and are as at be but by can do does for from get go how i idk im in into is it its me my of on or ' +
  'so start that the this to too want was what when where which who why will with you your where should ' +
  'anyone any some there their them they we our us about just like know really'
)
  .split(' ')
  .forEach(function (w) { STOPWORDS[w] = true; });

function keywords(text, max) {
  var seen = {};
  var out = [];
  String(text || '')
    .toLowerCase()
    .split(/[^a-z0-9+#]+/)
    .forEach(function (w) {
      if (w.length > 2 && !STOPWORDS[w] && !seen[w] && out.length < max) {
        seen[w] = true;
        out.push(w);
      }
    });
  return out;
}

function fallbackAnalyze(title, body, askerLevel, directory) {
  var text = (String(title || '') + ' ' + String(body || '')).toLowerCase();
  var kw = keywords(title, 5);
  if (kw.length < 3) kw = keywords(text, 5);
  var kwSet = {};
  kw.forEach(function (k) { kwSet[k] = true; });

  var scored = [];
  if (directory) {
    directory.each(function (d) {
      var matched = [];
      if (d.tags) {
        d.tags.each(function (tag) {
          var t = String(tag).toLowerCase();
          var hit = text.indexOf(t) >= 0 || t.split(/\s+/).some(function (w) { return kwSet[w]; });
          if (hit) matched.push(t);
        });
      }
      var deptMatch = d.department && text.indexOf(String(d.department).toLowerCase()) >= 0 ? 1 : 0;
      if (!matched.length && !deptMatch) return;
      var prox = Rank.levelProximity(askerLevel, d.level);
      var raw = 3 * matched.length + 2 * deptMatch + 1 * prox + 0.1 * (d.reputation || 0);
      var reason = matched.length
        ? 'Expertise in ' + matched.slice(0, 2).join(' and ')
        : 'Works in ' + d.department;
      scored.push({ memberId: d.memberId, raw: raw, reason: reason, department: d.department });
    });
  }
  scored.sort(function (a, b) { return b.raw - a.raw; });
  var top = scored.slice(0, 5);

  var experts = ExpertSuggestion.arrayBuilder();
  top.forEach(function (s) {
    experts.add(
      ExpertSuggestion.make({ memberId: s.memberId, score: Math.min(100, Math.round(s.raw * 10)), reason: s.reason })
    );
  });
  var tags = ArrayType.ofStr().makeBuilder();
  kw.forEach(function (k) { tags.add(k); });

  return AnalyzeResult.make({
    safe: true,
    safetyReason: null,
    space: 'STUDENT',
    department: null,
    tags: tags.build(),
    experts: experts.build(),
  });
}

function analyzePost(title, body, askerLevel, directory) {
  return fallbackAnalyze(title, body, askerLevel, directory);
}

function refineQuestion(text) {
  // STUB: tidy capitalization/punctuation. Lane B replaces with an LLM rewrite.
  var t = String(text || '').trim().replace(/\s+/g, ' ');
  var title = t.length > 90 ? t.substring(0, 87) + '...' : t;
  title = title.charAt(0).toUpperCase() + title.substring(1);
  if (!/[?.!]$/.test(title)) title += '?';
  return RefinedQuestion.make({
    title: title,
    body: 'Context: ' + t + '\n\nWhat I have tried so far, and what I am hoping to learn:',
  });
}

function draftColdEmails(actorId, postId) {
  // STUB: templated drafts for the post's matched experts. Lane B replaces with LLM-personalized drafts.
  var post = Post.fetch({ filter: Filter.eq('id', postId), include: 'id, title, author.id', limit: 1 }).objs;
  if (!post || !post.length) throw new Error('Post not found');
  if (post[0].author.id !== actorId) throw new Error('Only the author can draft cold emails for this post.');
  var actor = ForumMember.fetch({ filter: Filter.eq('id', actorId), include: 'id, name', limit: 1 }).objs[0];

  var out = EmailDraft.arrayBuilder();
  ExpertMatch.fetch({
    filter: Filter.eq('post.id', postId),
    include: 'id, rank, reason, expert.id, expert.name, expert.email',
    order: 'rank',
    limit: 5,
  }).objs.each(function (m) {
    out.add(
      EmailDraft.make({
        memberId: m.expert.id,
        name: m.expert.name,
        email: m.expert.email,
        subject: 'Question from a Purdue student: ' + post[0].title,
        body:
          'Hi ' + m.expert.name + ',\n\n' +
          'I am a Purdue student and BoilerConnect suggested you as an expert (' + m.reason + '). ' +
          'I would really value your perspective on: "' + post[0].title + '".\n\n' +
          'Thank you for your time,\n' + actor.name,
      })
    );
  });
  return out.build();
}
