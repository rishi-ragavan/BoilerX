/*
 * ExpertHarvest — Lane E. Researches ExpertLead rows from public sources and lands CSVs in the Data Fusion feeds.
 * See ExpertHarvest.c3typ for the contract.
 */

var PURDUE_OPENALEX_ID = 'I219193219';
var OPENALEX = 'https://api.openalex.org';
var PAGE_TEXT_LIMIT = 7000;
var PROFILE_TIMEOUT_MS = 45000;
var MAX_EXPERIENCES = 8;
var EXPERIENCE_KINDS = ['PUBLICATION', 'POSITION', 'AWARD', 'VENTURE', 'TEACHING', 'EDUCATION'];

function log() {
  return Logger.for('ExpertHarvest');
}

function str(v) {
  return v === null || v === undefined ? null : String(v);
}

function each(c3arr, fn) {
  if (!c3arr) return;
  if (typeof c3arr.each === 'function') c3arr.each(fn);
  else for (var i = 0; i < c3arr.length; i++) fn(c3arr[i], i);
}

// ---------------------------------------------------------------------------------------------------------------
// Web + OpenAlex
// ---------------------------------------------------------------------------------------------------------------

/** GET a URL; returns the body text or null (never throws). */
function httpGet(url) {
  try {
    var resp = HttpRequest.make({ url: url, method: 'GET' }).sendSync();
    var text = resp ? resp.string() : null;
    return text ? String(text) : null;
  } catch (e) {
    log().warn('GET {} failed: {}', url, String((e && e.message) || e).substring(0, 200));
    return null;
  }
}

function getJson(url) {
  var text = httpGet(url);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (e) {
    return null;
  }
}

/** Visible text of an HTML page: drops scripts, styles, nav chrome, and tags; collapses whitespace. */
function htmlToText(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<(nav|header|footer)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?>|<\/(p|div|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&rsquo;|&lsquo;/g, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"')
    .replace(/&ndash;|&mdash;/g, '-')
    .replace(/&[a-z]+;/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

/** OpenAlex author (id + topics), from the lead's id or a name search restricted to Purdue. */
function openAlexAuthor(lead) {
  var fields = 'id,display_name,works_count,cited_by_count,topics,last_known_institutions';
  if (lead.openAlexId) return getJson(OPENALEX + '/authors/' + encodeURIComponent(lead.openAlexId) + '?select=' + fields);
  if (str(lead.role) !== 'FACULTY') return null;
  var res = getJson(
    OPENALEX + '/authors?search=' + encodeURIComponent(lead.name) + '&filter=last_known_institutions.id:' +
      PURDUE_OPENALEX_ID + '&per_page=1&select=' + fields
  );
  return res && res.results && res.results.length ? res.results[0] : null;
}

/** Most-cited and most-recent works of an OpenAlex author (deduplicated). */
function openAlexWorks(authorId) {
  var out = [];
  var seen = {};
  ['cited_by_count:desc', 'publication_date:desc'].forEach(function (sort) {
    var res = getJson(
      OPENALEX + '/works?filter=author.id:' + authorId + '&sort=' + sort +
        '&per_page=5&select=id,title,publication_year,doi,primary_location,cited_by_count'
    );
    each(res && res.results, function (w) {
      if (!w || !w.title || seen[w.id]) return;
      seen[w.id] = true;
      var venue = w.primary_location && w.primary_location.source && w.primary_location.source.display_name;
      out.push({
        title: w.title,
        year: w.publication_year || null,
        venue: venue || null,
        url: w.doi || w.id,
        cites: w.cited_by_count || 0,
      });
    });
  });
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// Email (published only, never guessed)
// ---------------------------------------------------------------------------------------------------------------

function slug(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/^(prof\.?|dr\.?)\s+/, '')
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.+|\.+$/g, '');
}

function lastNameOf(name) {
  var w = String(name || '').trim().split(/\s+/);
  return w.length ? w[w.length - 1].toLowerCase().replace(/[^a-z]/g, '') : '';
}

/**
 * The person's published Purdue email from the raw page HTML: an address on `purdue.edu` (or `alumni.purdue.edu`
 * for alumni) whose local part contains their last name. Returns {email, source} or a `.demo` placeholder.
 */
function chooseEmail(lead, pages) {
  var last = lastNameOf(lead.name);
  var alumni = str(lead.role) === 'ALUMNI';
  var strict = alumni ? /^[a-z0-9._%+-]+@alumni\.purdue\.edu$/ : /^[a-z0-9._%+-]+@purdue\.edu$/;
  var published = [];
  pages.forEach(function (p) {
    (String(p.html || '').match(/[A-Za-z0-9._%+-]+@(?:[A-Za-z0-9-]+\.)*purdue\.edu/g) || []).forEach(function (e) {
      published.push({ email: e.toLowerCase(), host: p.host });
    });
  });
  var mine = published.filter(function (p) { return last && p.email.split('@')[0].indexOf(last) >= 0; });
  var usable = mine.filter(function (p) { return strict.test(p.email); });
  if (usable.length) return { email: usable[0].email, source: 'Published on ' + usable[0].host };
  var placeholder = slug(lead.name) + '.demo@' + (alumni ? 'alumni.purdue.edu' : 'purdue.edu');
  var note = mine.length ? ' (published contact: ' + mine[0].email + ')' : '';
  return { email: placeholder, source: 'Placeholder: no public ' + (alumni ? 'alumni ' : '') + 'Purdue email' + note };
}

// ---------------------------------------------------------------------------------------------------------------
// Profile writing (built-in LLM, sources only)
// ---------------------------------------------------------------------------------------------------------------

var PROFILE_SYSTEM_PROMPT =
  'You build expert profiles for BoilerConnect, a Purdue Q&A forum that tags professors and alumni on student ' +
  'questions. Use ONLY facts stated in SOURCES; never invent titles, papers, dates, employers, or awards. Return ' +
  'ONLY JSON: {"headline": string (at most 90 characters, e.g. "Assistant Professor of CS; directs the SCALE ' +
  'Robotics Lab"), "bio": string (2 sentences, third person, at most 280 characters, the most specific facts ' +
  'first), "tags": [3-4 lowercase expertise areas a student question could match, e.g. "robot learning", ' +
  '"explainable ai"; for founders or practitioners use career areas such as "startups"], "experiences": ' +
  '[{"kind": "PUBLICATION"|"POSITION"|"AWARD"|"VENTURE"|"TEACHING"|"EDUCATION", "title": string, ' +
  '"organization": string|null, "year": integer|null, "url": string|null}] (at most 8, most relevant to a ' +
  'student first; for PUBLICATION copy the title and url exactly from the OpenAlex list)}. Minified JSON on one line.';

function profileUserPrompt(lead, pages, author, works) {
  var parts = [
    'PERSON: ' + lead.name,
    'ROLE: ' + str(lead.role) + (lead.department ? ' · ' + lead.department : '') + (lead.employer ? ' · ' + lead.employer : ''),
  ];
  pages.forEach(function (p, i) {
    parts.push('SOURCE ' + (i + 1) + ' (' + p.url + '):\n' + p.text.substring(0, PAGE_TEXT_LIMIT));
  });
  if (author) {
    var topics = [];
    each(author.topics, function (t, i) { if (topics.length < 6) topics.push(t.display_name); });
    parts.push(
      'OPENALEX: ' + author.display_name + ', ' + (author.works_count || 0) + ' works, ' +
        (author.cited_by_count || 0) + ' citations. Topics: ' + topics.join('; ')
    );
    parts.push(
      'OPENALEX WORKS (one JSON object per line):\n' +
        works.map(function (w) { return JSON.stringify(w); }).join('\n')
    );
  }
  return parts.join('\n\n');
}

function clampText(s, max) {
  var t = String(s || '').replace(/\s+/g, ' ').trim();
  return t.length <= max ? t : t.substring(0, max - 1).replace(/\s+\S*$/, '') + '…';
}

/** Validates the LLM profile; falls back to the page text + OpenAlex data when the LLM output is unusable. */
function buildProfile(lead, pages, author, works) {
  var parsed = null;
  try {
    var text = AiPipeline.Llm.completeJson(
      PROFILE_SYSTEM_PROMPT,
      profileUserPrompt(lead, pages, author, works),
      PROFILE_TIMEOUT_MS,
      1600
    );
    parsed = text ? JSON.parse(String(text)) : null;
  } catch (e) {
    log().warn('Profile LLM failed for {}: {}', lead.name, String((e && e.message) || e).substring(0, 200));
  }

  var tags = [];
  (parsed && Array.isArray(parsed.tags) ? parsed.tags : []).forEach(function (t) {
    var s = String(t || '').toLowerCase().replace(/[;#]/g, ' ').replace(/\s+/g, ' ').trim();
    if (s && s.length <= 40 && tags.indexOf(s) < 0 && tags.length < 4) tags.push(s);
  });
  if (!tags.length && author) {
    each(author.topics, function (t) { if (tags.length < 3) tags.push(String(t.display_name).toLowerCase()); });
  }

  var experiences = [];
  (parsed && Array.isArray(parsed.experiences) ? parsed.experiences : []).forEach(function (x) {
    if (!x || !x.title || experiences.length >= MAX_EXPERIENCES) return;
    var kind = String(x.kind || '').toUpperCase();
    if (EXPERIENCE_KINDS.indexOf(kind) < 0) return;
    var year = parseInt(x.year, 10);
    experiences.push({
      kind: kind,
      title: clampText(x.title, 200),
      organization: x.organization ? clampText(x.organization, 120) : null,
      year: isNaN(year) ? null : year,
      url: x.url && /^https?:\/\//.test(String(x.url)) ? String(x.url) : null,
    });
  });
  if (!experiences.length) {
    works.slice(0, 4).forEach(function (w) {
      experiences.push({ kind: 'PUBLICATION', title: clampText(w.title, 200), organization: w.venue, year: w.year, url: w.url });
    });
  }

  var primaryText = pages.length ? pages[0].text : '';
  return {
    headline: clampText((parsed && parsed.headline) || lead.name + (lead.department ? ' · ' + lead.department : ''), 90),
    bio: clampText((parsed && parsed.bio) || primaryText.substring(0, 280), 400),
    tags: tags,
    experiences: experiences,
    usedLlm: !!parsed,
  };
}

// ---------------------------------------------------------------------------------------------------------------
// CSV landing
// ---------------------------------------------------------------------------------------------------------------

var PROFILE_COLUMNS = [
  'member_id', 'profile_id', 'lead_id', 'display_name', 'email', 'email_source', 'member_role', 'department',
  'employer', 'bio', 'tags', 'headline', 'source_urls', 'open_alex_id', 'harvested_at',
];
var EXPERIENCE_COLUMNS = ['experience_id', 'profile_id', 'experience_kind', 'title', 'organization', 'year', 'url', 'display_rank'];

function csvCell(v) {
  if (v === null || v === undefined) return '';
  var s = String(v).replace(/\r?\n/g, ' ');
  return /[",]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

function csv(columns, rows) {
  var lines = [columns.join(',')];
  rows.forEach(function (r) {
    lines.push(columns.map(function (c) { return csvCell(r[c]); }).join(','));
  });
  return lines.join('\n') + '\n';
}

/** Writes CSV text as a `text/csv` file into a feed's inbox and returns its URL. */
function landCsv(feedName, fileName, text) {
  var inbox = String(FileSourceCollection.forName(feedName).inboxUrl());
  if (inbox.charAt(inbox.length - 1) !== '/') inbox += '/';
  var url = inbox + fileName;
  FileSystem.makeFile(url).withField('contentType', 'text/csv').writeString(text);
  return url;
}

function stamp() {
  return String(DateTime.now().toString()).replace(/[^0-9]/g, '').substring(0, 14);
}

function memberIdFor(lead) {
  var last = lastNameOf(lead.name);
  return 'bc_member_' + (str(lead.role) === 'ALUMNI' ? 'alum_' : 'fac_') + last;
}

// ---------------------------------------------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------------------------------------------

function loadLeads(leadIds) {
  var filter = leadIds && leadIds.length
    ? Filter.intersects('id', leadIds)
    : Filter.eq('status', ExpertLead.Status.PENDING);
  var out = [];
  each(
    ExpertLead.fetch({
      filter: filter,
      include: 'id, name, role, department, employer, seedUrls, openAlexId, displayName, status',
      order: 'id',
      limit: 50,
    }).objs,
    function (l) { out.push(l); }
  );
  return out;
}

function researchLead(lead) {
  var pages = [];
  each(lead.seedUrls, function (u) {
    var html = httpGet(String(u));
    if (!html) return;
    var host = String(u).replace(/^https?:\/\//, '').split('/')[0].replace(/^www\./, '');
    pages.push({ url: String(u), host: host, html: html, text: htmlToText(html) });
  });
  if (!pages.length) throw new Error('No source page could be read');

  var author = openAlexAuthor(lead);
  var authorId = author && author.id ? String(author.id).split('/').pop() : null;
  var works = authorId ? openAlexWorks(authorId) : [];
  var profile = buildProfile(lead, pages, author, works);
  var email = chooseEmail(lead, pages);

  var urls = pages.map(function (p) { return p.url; });
  if (authorId) urls.push('https://openalex.org/' + authorId);
  return { pages: pages, authorId: authorId, works: works, profile: profile, email: email, urls: urls };
}

function harvest(leadIds) {
  var ids = [];
  each(leadIds, function (id) { ids.push(String(id)); });
  var leads = loadLeads(ids);
  var profileRows = [];
  var experienceRows = [];
  var results = ExpertHarvest.LeadResult.arrayBuilder();
  var leadUpdates = [];
  var now = DateTime.now();

  leads.forEach(function (lead) {
    var memberId = memberIdFor(lead);
    var profileId = 'bc_expert_' + lastNameOf(lead.name);
    try {
      var r = researchLead(lead);
      profileRows.push({
        member_id: memberId,
        profile_id: profileId,
        lead_id: lead.id,
        display_name: lead.displayName || lead.name,
        email: r.email.email,
        email_source: r.email.source,
        member_role: str(lead.role),
        department: lead.department,
        employer: lead.employer,
        bio: r.profile.bio,
        tags: r.profile.tags.join(';'),
        headline: r.profile.headline,
        source_urls: r.urls.join(' '),
        open_alex_id: r.authorId,
        harvested_at: now.toString(),
      });
      r.profile.experiences.forEach(function (x, i) {
        experienceRows.push({
          experience_id: profileId + '_' + ('0' + (i + 1)).slice(-2),
          profile_id: profileId,
          experience_kind: x.kind,
          title: x.title,
          organization: x.organization,
          year: x.year,
          url: x.url,
          display_rank: i + 1,
        });
      });
      var note = 'Read ' + r.pages.map(function (p) { return p.host; }).join(', ') +
        (r.authorId ? ' + OpenAlex ' + r.authorId + ' (' + r.works.length + ' works)' : '') +
        (r.profile.usedLlm ? '; profile written by LLM' : '; LLM unavailable, used source text');
      results.add(ExpertHarvest.LeadResult.make({
        leadId: lead.id, name: lead.name, memberId: memberId, ok: true, note: note,
        email: r.email.email, emailSource: r.email.source, tags: r.profile.tags,
        experienceCount: r.profile.experiences.length,
      }));
      leadUpdates.push(ExpertLead.make({ id: lead.id, status: ExpertLead.Status.HARVESTED, harvestNote: note }));
    } catch (e) {
      var msg = String((e && e.message) || e).substring(0, 300);
      log().warn('Harvest failed for {}: {}', lead.name, msg);
      results.add(ExpertHarvest.LeadResult.make({ leadId: lead.id, name: lead.name, memberId: memberId, ok: false, note: msg }));
      leadUpdates.push(ExpertLead.make({ id: lead.id, status: ExpertLead.Status.FAILED, harvestNote: msg }));
    }
  });

  var ts = stamp();
  var profileUrl = profileRows.length ? landCsv(ExpertHarvest.PROFILE_FEED, 'expert_profiles_' + ts + '.csv', csv(PROFILE_COLUMNS, profileRows)) : null;
  var experienceUrl = experienceRows.length
    ? landCsv(ExpertHarvest.EXPERIENCE_FEED, 'expert_experience_' + ts + '.csv', csv(EXPERIENCE_COLUMNS, experienceRows))
    : null;
  if (leadUpdates.length) ExpertLead.mergeBatch(leadUpdates);

  return ExpertHarvest.Result.make({
    profileFileUrl: profileUrl,
    experienceFileUrl: experienceUrl,
    profileRows: profileRows.length,
    experienceRows: experienceRows.length,
    leads: results.build(),
  });
}

function loadFeeds() {
  [ExpertHarvest.PROFILE_FEED, ExpertHarvest.EXPERIENCE_FEED].forEach(function (name) {
    FileSourceCollection.forName(name).process(DataIntegSpec.make({ process: true }));
  });
  return feedStatus();
}

function feedStatus() {
  var b = ExpertHarvest.FeedStatus.arrayBuilder();
  [ExpertHarvest.PROFILE_FEED, ExpertHarvest.EXPERIENCE_FEED].forEach(function (name) {
    each(
      SourceStatus.fetch({
        filter: Filter.startsWith('id', name + '_'),
        include: 'id, state, count, successful, failed, firstError',
        order: 'descending(meta.updated)',
        limit: 5,
      }).objs,
      function (s) {
        b.add(ExpertHarvest.FeedStatus.make({
          feed: name,
          fileStatusId: s.id,
          state: str(s.state),
          count: s.count || 0,
          successful: s.successful || 0,
          failed: s.failed || 0,
          firstError: s.firstError ? String(s.firstError.message || s.firstError).substring(0, 300) : null,
        }));
      }
    );
  });
  return b.build();
}
