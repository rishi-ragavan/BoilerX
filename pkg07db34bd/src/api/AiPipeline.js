/*
 * AiPipeline — Lane B owns this file.
 *
 * Every method makes (at most) one call to the platform's built-in LLM through `GenaiCore.Llm.Completion.Client`
 * and validates the JSON it returns. On LLM error, timeout, or invalid JSON each method falls back to deterministic
 * logic, so callers never see an LLM exception. Method signatures in AiPipeline.c3typ are frozen.
 */

// ---------------------------------------------------------------------------------------------------------------
// LLM wrapper
// ---------------------------------------------------------------------------------------------------------------

var ANALYZE_TIMEOUT_MS = 8000;
var REFINE_TIMEOUT_MS = 8000;
var EMAIL_TIMEOUT_MS = 20000;

var SPACES = ['STUDENT', 'FACULTY', 'ALUMNI'];
var CAPS_LINE =
  'If you are struggling, please reach out to Purdue CAPS (Counseling and Psychological Services) at ' +
  '765-494-6995 — you do not have to go through this alone. In an emergency call 911 or text/call 988.';

function log() {
  return Logger.for('AiPipeline');
}

/** Private helper: one built-in LLM call returning parsed JSON, or null on error / timeout / bad output. */
function callLlmJson(systemPrompt, userPrompt, timeoutMs, maxTokens) {
  try {
    var text = AiPipeline.Llm.completeJson(systemPrompt, userPrompt, timeoutMs, maxTokens);
    return text ? JSON.parse(String(text)) : null;
  } catch (e) {
    log().warn('LLM helper failed: {}', String((e && e.message) || e).substring(0, 300));
    return null;
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------------------------------------------

var STOPWORDS = {};
(
  'a an and are as at be but by can do does for from get go how i idk im in into is it its me my of on or ' +
  'so start that the this to too want was what when where which who why will with you your where should ' +
  'anyone any some there their them they we our us about just like know really best good need help has have ' +
  'not all get got would could please thanks one more much very also than then been being'
)
  .split(' ')
  .forEach(function (w) { STOPWORDS[w] = true; });

/** Iterates a C3 array or a native JS array. */
function forEachItem(list, fn) {
  if (!list) return;
  if (typeof list.each === 'function') list.each(fn);
  else for (var i = 0; i < list.length; i++) fn(list[i], i);
}

function str(v) {
  return v === null || v === undefined ? null : String(v);
}

function words(text) {
  return String(text || '').trim().split(/\s+/).filter(function (w) { return w.length > 0; });
}

function truncateWords(text, max) {
  var w = words(text);
  return w.length <= max ? w.join(' ') : w.slice(0, max).join(' ');
}

function truncateChars(text, max) {
  var s = String(text || '').trim().replace(/\s+/g, ' ');
  if (s.length <= max) return s;
  var cut = s.substring(0, max);
  var sp = cut.lastIndexOf(' ');
  return sp > max * 0.6 ? cut.substring(0, sp) : cut;
}

/** The `max` longest non-stopword words of `text`, in order of length (ties keep text order). */
function keywords(text, max) {
  var seen = {};
  var out = [];
  String(text || '')
    .toLowerCase()
    .split(/[^a-z0-9+#]+/)
    .forEach(function (w, i) {
      if (w.length > 2 && !STOPWORDS[w] && !seen[w]) {
        seen[w] = true;
        out.push({ w: w, i: i });
      }
    });
  out.sort(function (a, b) { return b.w.length - a.w.length || a.i - b.i; });
  return out.slice(0, max).map(function (x) { return x.w; });
}

function directoryToNative(directory) {
  var out = [];
  forEachItem(directory, function (d) {
    if (!d || !d.memberId) return;
    var tags = [];
    forEachItem(d.tags, function (t) { tags.push(String(t)); });
    var badges = [];
    forEachItem(d.badges, function (b) { badges.push(String(b)); });
    out.push({
      id: String(d.memberId),
      role: str(d.role),
      level: str(d.level),
      department: str(d.department),
      tags: tags,
      badges: badges,
      bio: d.bio ? String(d.bio).substring(0, 120) : null,
      reputation: d.reputation || 0,
    });
  });
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// Safety heuristics (used by the fallback, and to guarantee the CAPS pointer on self-harm)
// ---------------------------------------------------------------------------------------------------------------

var SELF_HARM_RE =
  /(kill(ing)? myself|suicid|self[- ]?harm|end (it all|my life)|(don[’']?t|do not) want to (be alive|live)|want to die|hurt(ing)? myself|cutting myself|no reason to live)/i;
var CHEATING_RE =
  /((give|send|share|post|leak|need|want|get)\b.{0,30}\b(answers?|solutions?|answer key)\b.{0,40}\b(exam|midterm|final|quiz|homework|hw|test|assignment|problem set|pset)s?)|((exam|midterm|quiz|homework|hw|test)\b.{0,20}\banswers?\b)/i;
var DOXX_RE = /\b(home address|where (does|do) .{1,40} live|phone number of|social security|ssn)\b/i;

function heuristicSafety(text) {
  if (SELF_HARM_RE.test(text)) return CAPS_LINE;
  if (CHEATING_RE.test(text)) {
    return 'Requests for exam, quiz, or homework answers violate Purdue academic integrity policy. ' +
      'Try asking how to approach the concept instead.';
  }
  if (DOXX_RE.test(text)) return 'Posts asking for personal information about other people are not allowed.';
  return null;
}

// ---------------------------------------------------------------------------------------------------------------
// analyzePost
// ---------------------------------------------------------------------------------------------------------------

var ANALYZE_SYSTEM_PROMPT =
  'You are the routing brain of BoilerConnect, a Purdue Q&A forum. Given a post, the asker\'s level, and a ' +
  'directory of Purdue members, return ONLY JSON:\n' +
  '{"safe": bool, "safety_reason": string|null, "space": "STUDENT"|"FACULTY"|"ALUMNI", "department": string|null, ' +
  '"tags": [3-5 lowercase strings], "experts": [{"member_id": string, "score": 0-100, "reason": string ≤12 words}] ' +
  '(max 5, best first)}.\n' +
  'SAFETY: safe=false for harassment, hate, doxxing or personal info about others, requests for exam/homework/quiz ' +
  'answers or other academic dishonesty, sexual content. If self-harm is mentioned, safe=false and safety_reason ' +
  'must kindly point to Purdue CAPS (765-494-6995). If unsafe, experts may be empty. Asking for advice, study ' +
  'strategies, or how to approach a topic is SAFE. Vague, unclear, or gibberish posts are SAFE (route them to ' +
  'STUDENT with generic tags); only the categories above are unsafe.\n' +
  'ROUTING: STUDENT = peer advice, campus life, clubs, housing, course selection tips. FACULTY = academic, ' +
  'research, deep subject-matter questions; set department to the best Purdue department. ALUMNI = careers, ' +
  'internships, industry, job search. Getting into research, joining a lab, grad school / PhD admissions, or ' +
  'understanding a subject is FACULTY even when the field is business or finance; ALUMNI is only for jobs, ' +
  'recruiting, interviews, and industry careers. Examples: "how do I get into stock market research" → FACULTY, ' +
  'Finance; "any ML labs taking undergrads" → FACULTY, Computer Science; "how do quant firms interview" → ALUMNI; ' +
  '"best dorm for freshmen" → STUDENT.\n' +
  'MATCHING: only use member_ids from the directory. Rank by (1) domain fit between the question and the member\'s ' +
  'tags/bio/department, (2) level proximity: for an undergraduate asking about research or grad school include at ' +
  'least one PhD or MS student alongside faculty; for career questions prefer alumni, (3) reputation as a ' +
  'tie-breaker. Each reason (at most 12 words, no trailing period) must say concretely why this person fits, e.g. ' +
  '"Finance professor who studies stock market anomalies and advises undergrads". Only include members with a real domain ' +
  'fit; fewer than 5 is fine.\n' +
  'Output the JSON object only, minified on ONE line: no markdown, no commentary.';

/**
 * Compact directory lines. Members get short aliases (m1, m2, …) to cut output tokens (the LLM writes ~50
 * tokens/s here, so output size dominates latency); `aliases` maps them back to real ids. Empty fields are omitted.
 */
function analyzeUserPrompt(title, body, askerLevel, dir, aliases) {
  var lines = dir.map(function (d, i) {
    var alias = 'm' + (i + 1);
    aliases[alias] = d.id;
    var row = { id: alias, role: d.role, level: d.level };
    if (d.department) row.department = d.department;
    if (d.tags.length) row.tags = d.tags;
    if (d.badges.length) row.badges = d.badges;
    if (d.bio) row.bio = d.bio;
    if (d.reputation) row.reputation = d.reputation;
    return JSON.stringify(row);
  });
  return 'TITLE: ' + String(title || '') + '\n' +
    'BODY: ' + String(body || '') + '\n' +
    'ASKER_LEVEL: ' + String(askerLevel || 'UG') + '\n' +
    'DIRECTORY (one JSON object per line):\n' + lines.join('\n');
}

/**
 * Deterministic fallback for {@link AiPipeline#analyzePost}: safe=true (unless an obvious safety keyword matches),
 * space STUDENT, title keywords as tags, experts ranked by 3·tagOverlap + 2·deptMatch + 1·levelProximity +
 * 0.1·reputation.
 */
function fallbackAnalyze(title, body, askerLevel, directory) {
  var text = (String(title || '') + ' ' + String(body || '')).toLowerCase();
  var unsafe = heuristicSafety(text);
  if (unsafe) return unsafeResult(unsafe);

  var kw = keywords(title, 5);
  if (kw.length < 3) kw = keywords(text, 5);
  var dir = directoryToNative(directory);
  var experts = fallbackExperts(text, kw, askerLevel, dir, 5);
  experts = ensureGradStudent(experts, text, kw, askerLevel, dir);
  return AnalyzeResult.make({
    safe: true,
    safetyReason: null,
    space: 'STUDENT',
    department: null,
    tags: kw.length ? kw : ['general'],
    experts: experts,
  });
}

/** Ranks directory members by 3·tagOverlap + 2·deptMatch + 1·levelProximity + 0.1·reputation. */
function fallbackExperts(text, kw, askerLevel, dir, max) {
  var kwSet = {};
  kw.forEach(function (k) { kwSet[k] = true; });
  var scored = [];
  dir.forEach(function (d) {
    // Overlap per tag: 1 when the whole tag phrase is in the post, else the fraction of its words that are keywords.
    var matched = [];
    var overlap = 0;
    d.tags.forEach(function (tag) {
      var t = String(tag).toLowerCase();
      var hit = text.indexOf(t) >= 0 ? 1 : 0;
      if (!hit) {
        var tw = t.split(/\s+/).filter(function (w) { return w.length > 1; });
        var n = tw.filter(function (w) { return kwSet[w]; }).length;
        hit = tw.length ? n / tw.length : 0;
      }
      if (hit > 0) {
        overlap += hit;
        matched.push(t);
      }
    });
    var deptMatch = d.department && text.indexOf(String(d.department).toLowerCase()) >= 0 ? 1 : 0;
    if (!matched.length && !deptMatch) return;
    var prox = Rank.levelProximity(askerLevel, d.level);
    var raw = 3 * overlap + 2 * deptMatch + 1 * prox + 0.1 * (d.reputation || 0);
    var reason = matched.length ? 'Matched on: ' + matched.slice(0, 3).join(', ') : 'Matched on: ' + d.department;
    scored.push({ memberId: d.id, raw: raw, reason: reason });
  });
  scored.sort(function (a, b) { return b.raw - a.raw; });
  return scored.slice(0, max).map(function (s) {
    return ExpertSuggestion.make({ memberId: s.memberId, score: Math.min(100, Math.round(s.raw * 10)), reason: s.reason });
  });
}

function unsafeResult(reason) {
  return AnalyzeResult.make({
    safe: false,
    safetyReason: reason,
    space: 'STUDENT',
    department: null,
    tags: [],
    experts: [],
  });
}

function normalizeTags(raw) {
  var out = [];
  var seen = {};
  (Array.isArray(raw) ? raw : []).forEach(function (t) {
    if (t === null || t === undefined) return;
    var s = String(t).toLowerCase().trim().replace(/^#/, '').replace(/\s+/g, ' ');
    if (!s || s.length > 40 || seen[s] || out.length >= 5) return;
    seen[s] = true;
    out.push(s);
  });
  return out;
}

/**
 * Validates parsed LLM output against the contract. Returns an {@link AnalyzeResult}, or null when the output is
 * unusable (the caller then falls back).
 */
function validateAnalysis(parsed, title, body, askerLevel, dir, aliases) {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  var text = (String(title || '') + ' ' + String(body || '')).toLowerCase();

  var safe = parsed.safe;
  if (typeof safe === 'string') safe = safe.toLowerCase() !== 'false';
  if (typeof safe !== 'boolean') return null;
  if (!safe) {
    var reason = parsed.safety_reason || parsed.safetyReason;
    reason = reason ? String(reason).trim() : 'This post was blocked by the safety check.';
    if (SELF_HARM_RE.test(text) && reason.indexOf('CAPS') < 0) reason = reason + ' ' + CAPS_LINE;
    return unsafeResult(reason);
  }
  // The model said safe, but an unmistakable self-harm / cheating / doxxing request still blocks.
  var guard = heuristicSafety(text);
  if (guard) return unsafeResult(guard);

  var space = String(parsed.space || '').toUpperCase().trim().replace(/S$/, '');
  if (space === 'STUDENTS') space = 'STUDENT';
  if (SPACES.indexOf(space) < 0) return null;

  var department = parsed.department ? String(parsed.department).trim() : null;
  if (department && (department.toLowerCase() === 'null' || department.toLowerCase() === 'none')) department = null;

  var tags = normalizeTags(parsed.tags);
  if (tags.length < 3) {
    keywords(title + ' ' + body, 5).forEach(function (k) {
      if (tags.length < 3 && tags.indexOf(k) < 0) tags.push(k);
    });
  }

  var known = {};
  dir.forEach(function (d) { known[d.id] = true; });
  var experts = [];
  var seen = {};
  (Array.isArray(parsed.experts) ? parsed.experts : []).forEach(function (e) {
    if (!e || experts.length >= 5) return;
    var id = str(e.member_id || e.memberId || e.id);
    if (id && aliases && aliases[id]) id = aliases[id];
    if (!id || !known[id] || seen[id]) return;
    seen[id] = true;
    var score = Number(e.score);
    if (isNaN(score)) score = 50;
    experts.push(
      ExpertSuggestion.make({
        memberId: id,
        score: Math.max(0, Math.min(100, Math.round(score))),
        reason: truncateWords(e.reason || 'Relevant expertise for this question', 15).replace(/[\s;,:.\-–—]+$/, ''),
      })
    );
  });
  // A safe question with no usable experts still gets the deterministic ranking.
  if (!experts.length) experts = fallbackExperts(text, tags.concat(keywords(title, 5)), askerLevel, dir, 5);
  experts = ensureGradStudent(experts, text, tags, askerLevel, dir);

  return AnalyzeResult.make({
    safe: true,
    safetyReason: null,
    space: space,
    department: department,
    tags: tags,
    experts: experts,
  });
}

var RESEARCH_RE = /\b(research|lab|labs|phd|grad school|graduate school|thesis|publish)/i;

/**
 * Level proximity guarantee: an undergraduate research / grad-school question gets at least one PhD or MS student
 * when one in the directory has a real tag or department fit (deterministic ranking), replacing the lowest expert.
 */
function ensureGradStudent(experts, text, tags, askerLevel, dir) {
  if (String(askerLevel || '').toUpperCase() !== 'UG' || !RESEARCH_RE.test(text)) return experts;
  var levelById = {};
  dir.forEach(function (d) { levelById[d.id] = String(d.level || '').toUpperCase(); });
  var isGrad = function (id) { return levelById[id] === 'PHD' || levelById[id] === 'MS'; };
  if (experts.some(function (e) { return isGrad(e.memberId); })) return experts;
  var grads = dir.filter(function (d) { return isGrad(d.id); });
  var candidates = fallbackExperts(text, tags, askerLevel, grads, 1);
  if (!candidates.length) return experts;
  var c = candidates[0];
  var add = ExpertSuggestion.make({
    memberId: c.memberId,
    score: Math.min(c.score, experts.length ? experts[experts.length - 1].score : c.score),
    reason: truncateWords(c.reason, 10) + ' · grad student near your level',
  });
  return experts.length >= 5 ? experts.slice(0, 4).concat([add]) : experts.concat([add]);
}

function analyzePost(title, body, askerLevel, directory) {
  var dir = directoryToNative(directory);
  var aliases = {};
  var userPrompt = analyzeUserPrompt(title, body, askerLevel, dir, aliases);
  var parsed = callLlmJson(ANALYZE_SYSTEM_PROMPT, userPrompt, ANALYZE_TIMEOUT_MS, 600);
  var result = null;
  try {
    result = validateAnalysis(parsed, title, body, askerLevel, dir, aliases);
  } catch (e) {
    log().warn('analyzePost validation failed: {}', String((e && e.message) || e));
    result = null;
  }
  return result || fallbackAnalyze(title, body, askerLevel, directory);
}

// ---------------------------------------------------------------------------------------------------------------
// refineQuestion
// ---------------------------------------------------------------------------------------------------------------

var REFINE_SYSTEM_PROMPT =
  'You rewrite rough questions for BoilerConnect, a Purdue University Q&A forum. Rewrite the user\'s text into a ' +
  'clear, polite, academic-toned question. Keep the original meaning, do not invent facts, names, courses, or ' +
  'details the user did not give. Return ONLY JSON: {"title": string (a question, at most 80 characters), ' +
  '"body": string (at most 120 words, first person, may ask 1-2 focused sub-questions)}. No markdown.';

function refineFallback(text) {
  var t = String(text || '').trim();
  return RefinedQuestion.make({ title: t.replace(/\s+/g, ' ').substring(0, 80), body: t });
}

function refineQuestion(text) {
  var t = String(text || '').trim();
  if (!t) return RefinedQuestion.make({ title: '', body: '' });
  var parsed = callLlmJson(REFINE_SYSTEM_PROMPT, 'TEXT: ' + t, REFINE_TIMEOUT_MS, 400);
  if (!parsed || typeof parsed !== 'object' || !parsed.title || !String(parsed.title).trim()) return refineFallback(t);
  var body = parsed.body ? truncateWords(parsed.body, 120) : t;
  return RefinedQuestion.make({ title: truncateChars(parsed.title, 80), body: body });
}

// ---------------------------------------------------------------------------------------------------------------
// draftColdEmails
// ---------------------------------------------------------------------------------------------------------------

var EMAIL_SYSTEM_PROMPT =
  'You draft cold emails for a Purdue community member who is reaching out to Purdue experts about a question. ' +
  'Write ONE email per expert. Each email must: greet the expert by name (use "Professor <last name>" for ' +
  'faculty), reference something concrete from that expert\'s bio or tags and the reason they were matched, ' +
  'state the question briefly, make a small, specific ask (e.g. a few pointers or a 15-minute chat), be polite ' +
  'and under 150 words, and end with a sign-off using the sender\'s real full name exactly as given. Do not ' +
  'invent facts about the sender or the expert. Return ONLY a JSON array: ' +
  '[{"member_id": string, "subject": string (≤ 80 characters), "body": string}]. No markdown.';

function templateEmail(m, post, actor) {
  var e = m.expert;
  var greet = String(e.role) === 'FACULTY' ? 'Professor ' + lastName(e.name) : e.name;
  return {
    subject: 'Purdue question: ' + truncateChars(post.title, 60),
    body:
      'Hi ' + greet + ',\n\n' +
      'My name is ' + actor.name + ' and I am ' + actorDescription(actor) + '. BoilerConnect suggested you as an ' +
      'expert on my question' + (m.reason ? ' (' + m.reason + ')' : '') + ':\n\n"' + post.title + '"\n\n' +
      'If you have a few minutes, I would be grateful for any pointers or a short chat.\n\n' +
      'Thank you for your time,\n' + actor.name,
  };
}

function lastName(name) {
  var w = words(name);
  return w.length ? w[w.length - 1] : String(name || '');
}

function actorDescription(actor) {
  var role = String(actor.role || '');
  var level = String(actor.level || '');
  var dept = actor.department ? ' in ' + actor.department : '';
  if (role === 'FACULTY') return 'a Purdue faculty member' + dept;
  if (role === 'ALUMNI') return 'a Purdue alum' + (actor.employer ? ' now at ' + actor.employer : '');
  var lvl = level === 'UG' ? 'an undergraduate' : level === 'MS' ? 'a master\'s student' : level === 'PHD' ? 'a PhD student' : 'a student';
  return lvl + ' at Purdue' + dept;
}

function draftColdEmails(actorId, postId) {
  var posts = Post.fetch({ filter: Filter.eq('id', postId), include: 'id, title, body, author.id', limit: 1 }).objs;
  if (!posts || !posts.length) throw new Error('Post not found');
  var post = posts[0];
  if (!post.author || post.author.id !== actorId) throw new Error('Only the author can draft cold emails for this post.');
  var actors = ForumMember.fetch({
    filter: Filter.eq('id', actorId),
    include: 'id, name, email, role, level, department, employer',
    limit: 1,
  }).objs;
  if (!actors || !actors.length) throw new Error('Member not found');
  var actor = actors[0];

  var matches = [];
  forEachItem(
    ExpertMatch.fetch({
      filter: Filter.eq('post.id', postId),
      include: 'id, rank, reason, expert.id, expert.name, expert.email, expert.role, expert.level, ' +
        'expert.department, expert.employer, expert.bio, expert.tags',
      order: 'rank',
      limit: 5,
    }).objs,
    function (m) { if (m.expert && m.expert.id) matches.push(m); }
  );
  if (!matches.length) return [];

  var expertsJson = matches.map(function (m) {
    var tags = [];
    forEachItem(m.expert.tags, function (t) { tags.push(String(t)); });
    return JSON.stringify({
      member_id: m.expert.id,
      name: m.expert.name,
      role: str(m.expert.role),
      level: str(m.expert.level),
      department: m.expert.department || null,
      employer: m.expert.employer || null,
      tags: tags,
      bio: m.expert.bio ? String(m.expert.bio).substring(0, 300) : null,
      matched_because: m.reason || null,
    });
  });
  var userPrompt =
    'SENDER: ' + actor.name + ' (' + actorDescription(actor) + ')\n' +
    'QUESTION TITLE: ' + post.title + '\n' +
    'QUESTION BODY: ' + truncateWords(post.body || '', 150) + '\n' +
    'EXPERTS (one JSON object per line):\n' + expertsJson.join('\n');

  var parsed = callLlmJson(EMAIL_SYSTEM_PROMPT, userPrompt, EMAIL_TIMEOUT_MS, 2000);
  if (parsed && !Array.isArray(parsed) && Array.isArray(parsed.emails)) parsed = parsed.emails;
  var byId = {};
  if (Array.isArray(parsed)) {
    parsed.forEach(function (d) {
      var id = d && str(d.member_id || d.memberId);
      if (id && d.subject && d.body && !byId[id]) byId[id] = d;
    });
  }

  return matches.map(function (m) {
    var d = byId[m.expert.id];
    var draft = d
      ? { subject: truncateChars(d.subject, 100), body: String(d.body).trim() }
      : templateEmail(m, post, actor);
    // Emails reveal identity: always signed with the actor's real name.
    if (draft.body.indexOf(actor.name) < 0) draft.body = draft.body + '\n\n' + actor.name;
    return EmailDraft.make({
      memberId: m.expert.id,
      name: m.expert.name,
      email: m.expert.email,
      subject: draft.subject,
      body: draft.body,
    });
  });
}
