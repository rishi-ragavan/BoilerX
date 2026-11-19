/*
 * ForumApi — BoilerConnect forum data surface (Lane A).
 *
 * Every method returns VIEW types only. Anonymous items never carry the author's id, name, or email.
 * Product rules (lead):
 *  - Members are only Professor (role FACULTY, tag "Expert"), Alumni (tag "Alumni"), or Student (no tag).
 *    No levels, badges, reputation, or likes. Students have no expertise.
 *  - Flair: professors show department + research interests; alumni show a broad career role (SWE, Product Manager…).
 *  - Only professors and alumni are tagged on questions, so only they have "Questions for you".
 *  - Tagging happens only in the Experts and Alumni spaces. Student-space questions never tag or show experts.
 *  - Posts carry no topic tags. Replies are grouped by category, and the post's own space's category comes first.
 */

var MEMBER_FIELDS = 'id, name, email, role, verified, department, employer, bio, tags, anonByDefault';
var AUTHOR_INCLUDE = ['name', 'role', 'verified', 'department', 'employer', 'tags'];
var POST_INCLUDE =
  'id, postType, title, body, visibility, space, department, isAnonymous, createdAt, author.id, ' +
  AUTHOR_INCLUDE.map(function (f) { return 'author.' + f; }).join(', ');
var FEED_LIMIT = 200;
/** Feed tab → space. `faculty` / `professors` are kept as aliases of the Experts space. */
var SPACE_TABS = {
  students: 'STUDENT', student: 'STUDENT',
  experts: 'EXPERTS', faculty: 'EXPERTS', professors: 'EXPERTS',
  alumni: 'ALUMNI',
};
/** Reply groups (ReplyView#authorGroup) in their default order; the post's own space's group is moved first. */
var GROUPS = ['EXPERTS', 'ALUMNI', 'STUDENT'];
var ROLE_GROUP = { FACULTY: 'EXPERTS', ALUMNI: 'ALUMNI', STUDENT: 'STUDENT' };
var SPACE_GROUP = { EXPERTS: 'EXPERTS', ALUMNI: 'ALUMNI', STUDENT: 'STUDENT' };
/** Pipeline space → stored space. Accepts the old `FACULTY` value as an alias of EXPERTS. */
var SPACE_ALIASES = { STUDENT: 'STUDENT', EXPERTS: 'EXPERTS', EXPERT: 'EXPERTS', FACULTY: 'EXPERTS', ALUMNI: 'ALUMNI' };
/** Only these roles can be tagged on a question (and so have "Questions for you"). */
var TAGGABLE_ROLES = ['FACULTY', 'ALUMNI'];
/** Only questions in these spaces tag experts. Student-space questions are peer-to-peer: no one is tagged. */
var TAGGING_SPACES = ['EXPERTS', 'ALUMNI'];

function spaceTags(space) {
  return TAGGING_SPACES.indexOf(str(space)) >= 0;
}

// ---------------------------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------------------------

function str(v) {
  return v === null || v === undefined ? null : String(v);
}

function list(c3arr) {
  var out = [];
  if (c3arr) c3arr.each(function (x) { if (x !== null && x !== undefined && String(x)) out.push(String(x)); });
  return out;
}

/** 32-bit FNV-1a → hex. Deterministic per (member, post); not linkable across posts. */
function shortHash(s) {
  var h = 0x811c9dc5;
  for (var i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = ((h << 24) + h * 0x193) >>> 0;
  }
  return ('00000000' + h.toString(16)).slice(-8);
}

function anonStudentHandle(memberId, postId) {
  return 'Boiler ' + shortHash(String(memberId) + String(postId)).substring(0, 4);
}

/** "Expert" for professors, "Alumni" for alumni, null for students. */
function tagOf(m) {
  var role = str(m.role);
  return role === 'FACULTY' ? 'Expert' : role === 'ALUMNI' ? 'Alumni' : null;
}

/**
 * Professors: "Finance · stock market, asset pricing" (department + research interests).
 * Alumni: "Quant Trader" (broad career role), plus " · {employer}" only when they post under their name.
 * Students: none (students have no expertise).
 */
function flairOf(m, anon) {
  var role = str(m.role);
  var tags = list(m.tags);
  if (role === 'FACULTY') {
    var parts = [];
    if (m.department) parts.push(m.department);
    if (tags.length) parts.push(tags.join(', '));
    return parts.length ? parts.join(' · ') : null;
  }
  if (role === 'ALUMNI') {
    var p = [];
    if (tags.length) p.push(tags.join(', '));
    if (!anon && m.employer) p.push(m.employer);
    return p.length ? p.join(' · ') : null;
  }
  return null;
}

/** Summary used by the persona switcher / own profile: "Expert · Finance", "Alumni · Google", "Student". */
function roleLabelOf(m) {
  var role = str(m.role);
  if (role === 'FACULTY') return 'Expert' + (m.department ? ' · ' + m.department : '');
  if (role === 'ALUMNI') return 'Alumni' + (m.employer ? ' · ' + m.employer : '');
  return 'Student';
}

/** Students are always anonymous; professors/alumni follow the item's flag. */
function effectiveAnon(member, isAnonymous) {
  return str(member.role) === 'STUDENT' ? true : !!isAnonymous;
}

function authorView(member, postId, isAnonymous) {
  var anon = effectiveAnon(member, isAnonymous);
  var role = str(member.role);
  var display;
  if (!anon) display = member.name;
  else if (role === 'FACULTY') display = 'Purdue professor';
  else if (role === 'ALUMNI') display = 'Purdue alum';
  else display = anonStudentHandle(member.id, postId);
  return AuthorView.make({
    displayName: display,
    tag: tagOf(member),
    flair: flairOf(member, anon),
    isAnonymous: anon,
    memberId: anon ? null : member.id,
  });
}

function memberView(m) {
  var role = str(m.role);
  return MemberView.make({
    id: m.id,
    name: m.name,
    role: role,
    department: m.department,
    employer: m.employer,
    bio: m.bio,
    tags: role === 'STUDENT' ? [] : m.tags || [],
    anonByDefault: role === 'STUDENT' ? true : !!m.anonByDefault,
    tag: tagOf(m),
    flair: flairOf(m, false),
    roleLabel: roleLabelOf(m),
  });
}

function loadMember(id) {
  if (!id) return null;
  var res = ForumMember.fetch({ filter: Filter.eq('id', id), include: MEMBER_FIELDS, limit: 1 });
  return res.objs && res.objs.length ? res.objs[0] : null;
}

/** Verification is recomputed from the email + role rules (§1.4), never trusted from the stored flag alone. */
function isVerified(m) {
  return !!m.verified && Verify.check(m.email, str(m.role)).verified;
}

function requireMember(id) {
  var m = loadMember(id);
  if (!m) throw new Error('Unknown member: ' + id);
  return m;
}

function strArray(values) {
  var b = ArrayType.ofStr().makeBuilder();
  values.forEach(function (v) { b.add(v); });
  return b.build();
}

function each(objs, fn) {
  if (objs) objs.each(fn);
}

/** Expert matches for a set of posts → { postId: [match...] } (sorted by rank). */
function matchesByPost(postIds) {
  var out = {};
  if (!postIds.length) return out;
  var res = ExpertMatch.fetch({
    filter: Filter.intersects('post.id', strArray(postIds)),
    include:
      'id, rank, score, reason, post.id, expert.id, ' +
      AUTHOR_INCLUDE.map(function (f) { return 'expert.' + f; }).join(', '),
    order: 'rank',
    limit: 2000,
  });
  each(res.objs, function (m) {
    var pid = m.post.id;
    (out[pid] = out[pid] || []).push(m);
  });
  return out;
}

function repliesByPost(postIds) {
  var out = {};
  if (!postIds.length) return out;
  var res = Reply.fetch({
    filter: Filter.intersects('post.id', strArray(postIds)),
    include: 'id, post.id, author.id',
    limit: 2000,
  });
  each(res.objs, function (r) {
    (out[r.post.id] = out[r.post.id] || []).push(r.author.id);
  });
  return out;
}

function expertIdSet(matches) {
  var s = {};
  (matches || []).forEach(function (m) { s[m.expert.id] = true; });
  return s;
}

function canView(post, actorId, matches) {
  if (str(post.visibility) !== 'EXPERTS_ONLY') return true;
  if (post.author && post.author.id === actorId) return true;
  return spaceTags(post.space) && !!expertIdSet(matches)[actorId];
}

function hoursSince(dt) {
  if (!dt) return 0;
  return DateTime.deltaSeconds(dt, DateTime.now()) / 3600;
}

/** Group → sort index for a post: its own space's category first, then the rest in GROUPS order. */
function groupRankFor(space) {
  var first = SPACE_GROUP[str(space)] || 'EXPERTS';
  var order = [first].concat(GROUPS.filter(function (g) { return g !== first; }));
  var rank = {};
  order.forEach(function (g, i) { rank[g] = i; });
  return rank;
}

/** Serializes loaded posts → [{view, hot}] with counts and viewer flags. */
function buildPostViews(posts, actorId) {
  var ids = posts.map(function (p) { return p.id; });
  var matches = matchesByPost(ids);
  var replies = repliesByPost(ids);

  return posts.map(function (p) {
    // Student-space questions never tag experts (any legacy match rows are ignored).
    var experts = spaceTags(p.space) ? matches[p.id] || [] : [];
    var expertSet = expertIdSet(experts);
    var replyAuthors = replies[p.id] || [];
    var expertReplies = replyAuthors.filter(function (a) { return expertSet[a]; }).length;

    // Anonymity: never publish WHO was tagged. Everyone gets the count; a tagged viewer also gets their own entry.
    var expertViews = ExpertView.arrayBuilder();
    experts.forEach(function (m) {
      if (m.expert.id !== actorId) return;
      expertViews.add(
        ExpertView.make({
          memberId: m.expert.id,
          name: m.expert.name,
          tag: tagOf(m.expert),
          department: m.expert.department,
          reason: m.reason,
          score: m.score,
        })
      );
    });

    var view = PostView.make({
      id: p.id,
      postType: str(p.postType),
      title: p.title,
      body: p.body,
      visibility: str(p.visibility) || 'PUBLIC',
      space: str(p.space),
      department: p.department,
      createdAt: p.createdAt,
      author: authorView(p.author, p.id, p.isAnonymous),
      experts: expertViews.build(),
      expertCount: experts.length,
      replyCount: replyAuthors.length,
      isMine: p.author.id === actorId,
      viewerIsMatchedExpert: !!expertSet[actorId],
    });
    return { view: view, hot: Rank.hotScore(replyAuthors.length, expertReplies, hoursSince(p.createdAt)) };
  });
}

function toNativePosts(objs) {
  var out = [];
  each(objs, function (p) { out.push(p); });
  return out;
}

function toViewArray(items) {
  var b = PostView.arrayBuilder();
  items.forEach(function (i) { b.add(i.view); });
  return b.build();
}

/** Bio + evidence characters per directory entry sent to the AI pipeline. */
var DIRECTORY_BIO_CHARS = 420;

/**
 * Lane E: top evidence items per member from {@link ExpertProfile} / {@link ExpertExperience} →
 * { memberId: "Directs ...; RSS 2022 paper: ..." }. Members without a profile are absent.
 */
function expertEvidence(memberIds) {
  var out = {};
  if (!memberIds.length) return out;
  var memberByProfile = {};
  var profileIds = [];
  each(
    ExpertProfile.fetch({ filter: Filter.intersects('member.id', strArray(memberIds)), include: 'id, headline, member.id', limit: 500 }).objs,
    function (p) {
      memberByProfile[p.id] = p.member.id;
      profileIds.push(p.id);
      if (p.headline) out[p.member.id] = [String(p.headline)];
    }
  );
  if (!profileIds.length) return out;
  each(
    ExpertExperience.fetch({
      filter: Filter.intersects('profile.id', strArray(profileIds)),
      include: 'title, organization, year, kind, rank, profile.id',
      order: 'rank',
      limit: 2000,
    }).objs,
    function (x) {
      var mid = memberByProfile[x.profile.id];
      var items = (out[mid] = out[mid] || []);
      if (items.length >= 5) return;
      var where = [x.organization, x.year].filter(function (v) { return v; }).join(' ');
      items.push(String(x.kind).toLowerCase() + ' "' + x.title + '"' + (where ? ' (' + where + ')' : ''));
    }
  );
  Object.keys(out).forEach(function (k) { out[k] = out[k].join('; '); });
  return out;
}

function loadPost(postId) {
  var res = Post.fetch({ filter: Filter.eq('id', postId), include: POST_INCLUDE, limit: 1 });
  return res.objs && res.objs.length ? res.objs[0] : null;
}

// ---------------------------------------------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------------------------------------------

function listMembers() {
  var b = MemberView.arrayBuilder();
  // Only verified Purdue members are on the platform.
  each(ForumMember.fetch({ filter: Filter.eq('verified', true), include: MEMBER_FIELDS, order: 'name', limit: 500 }).objs, function (m) {
    b.add(memberView(m));
  });
  return b.build();
}

function getMember(id) {
  return memberView(requireMember(id));
}

function feed(actorId, tab, dept) {
  var t = String(tab || 'foryou').toLowerCase();
  var filter = Filter.eq('visibility', 'PUBLIC');
  if (SPACE_TABS[t]) {
    // A space: every PUBLIC question the AI routed there. All spaces behave identically.
    filter = filter.and().eq('space', SPACE_TABS[t]);
  }
  // 'foryou' (default): every PUBLIC post in every space.
  if (dept) filter = filter.and().eq('department', dept);

  var posts = toNativePosts(
    Post.fetch({ filter: filter, include: POST_INCLUDE, order: 'descending(createdAt)', limit: FEED_LIMIT }).objs
  );
  var items = buildPostViews(posts, actorId);
  items.sort(function (a, b) { return b.hot - a.hot; });
  return toViewArray(items);
}

function inbox(actorId) {
  var actor = requireMember(actorId);
  // Students are never tagged, so they have no "Questions for you".
  if (TAGGABLE_ROLES.indexOf(str(actor.role)) < 0) return PostView.arrayBuilder().build();
  var ids = [];
  each(
    ExpertMatch.fetch({ filter: Filter.eq('expert.id', actorId), include: 'id, post.id', limit: 500 }).objs,
    function (m) { if (ids.indexOf(m.post.id) < 0) ids.push(m.post.id); }
  );
  if (!ids.length) return PostView.arrayBuilder().build();
  var posts = toNativePosts(
    Post.fetch({
      filter: Filter.intersects('id', strArray(ids)).and().eq('postType', 'QUESTION')
        .and().intersects('space', strArray(TAGGING_SPACES)),
      include: POST_INCLUDE,
      order: 'descending(createdAt)',
      limit: FEED_LIMIT,
    }).objs
  );
  return toViewArray(buildPostViews(posts, actorId));
}

function getPost(actorId, postId) {
  var post = loadPost(postId);
  if (!post) throw new Error('Post not found');
  var matches = matchesByPost([post.id])[post.id] || [];
  if (!canView(post, actorId, matches)) throw new Error('This post is only visible to its author and matched experts.');

  var postView = buildPostViews([post], actorId)[0].view;

  var replies = [];
  each(
    Reply.fetch({
      filter: Filter.eq('post.id', post.id),
      include:
        'id, body, isAnonymous, createdAt, author.id, ' +
        AUTHOR_INCLUDE.map(function (f) { return 'author.' + f; }).join(', '),
      order: 'createdAt',
      limit: 500,
    }).objs,
    function (r) { replies.push(r); }
  );
  // The post's own category answers first (Experts space → professors first, Alumni space → alumni first,
  // Student space → students first); the other categories follow, each grouped; oldest first within a group.
  var groupRank = groupRankFor(post.space);
  replies = replies
    .map(function (r, i) { return { r: r, g: groupRank[ROLE_GROUP[str(r.author.role)]], i: i }; })
    .sort(function (a, b) { return a.g - b.g || a.i - b.i; }) // explicit tie-break keeps chronological order
    .map(function (x) { return x.r; });

  var rb = ReplyView.arrayBuilder();
  replies.forEach(function (r) {
    rb.add(
      ReplyView.make({
        id: r.id,
        body: r.body,
        createdAt: r.createdAt,
        author: authorView(r.author, post.id, r.isAnonymous),
        authorGroup: ROLE_GROUP[str(r.author.role)],
        isMine: r.author.id === actorId,
      })
    );
  });
  return PostDetailView.make({ post: postView, replies: rb.build() });
}

function createPost(actorId, input) {
  var actor = requireMember(actorId);
  var role = str(actor.role);
  if (!isVerified(actor)) return CreatePostResult.make({ ok: false, error: 'Only Purdue members can post.' });

  if (input.postType && String(input.postType).toUpperCase() !== 'QUESTION') {
    return CreatePostResult.make({ ok: false, error: 'Only questions can be posted.' });
  }
  if (role === 'FACULTY') {
    return CreatePostResult.make({ ok: false, error: 'Experts answer questions but cannot post them.' });
  }
  var visibility = String(input.visibility || 'PUBLIC').toUpperCase() === 'EXPERTS_ONLY' ? 'EXPERTS_ONLY' : 'PUBLIC';
  if (!input.title || !String(input.title).trim()) return CreatePostResult.make({ ok: false, error: 'Title is required.' });

  // 1. Expert directory: only professors and alumni can be tagged (never the author, never students).
  var dir = DirectoryEntry.arrayBuilder();
  var known = {};
  var members = [];
  each(
    ForumMember.fetch({
      filter: Filter.ne('id', actorId).and().intersects('role', strArray(TAGGABLE_ROLES)),
      include: MEMBER_FIELDS,
      limit: 500,
    }).objs,
    function (m) { members.push(m); }
  );
  // Lane E: public-record evidence (papers, positions, ventures) so match reasons can cite real work.
  var evidence = expertEvidence(members.map(function (m) { return m.id; }));
  members.forEach(function (m) {
    known[m.id] = true;
    var bio = m.bio ? String(m.bio) : '';
    if (evidence[m.id]) bio = (bio ? bio + ' ' : '') + 'Evidence: ' + evidence[m.id];
    dir.add(
      DirectoryEntry.make({
        memberId: m.id,
        role: str(m.role),
        department: m.department,
        employer: m.employer,
        tags: m.tags || [],
        bio: bio ? bio.substring(0, DIRECTORY_BIO_CHARS) : null,
      })
    );
  });

  // 2. AI pipeline (Lane B owns the body). The 3rd argument is the asker's role (STUDENT or ALUMNI).
  var result = AiPipeline.analyzePost(input.title, input.body || '', role, dir.build());
  if (!result || result.safe === false) {
    return CreatePostResult.make({
      ok: false,
      error: (result && result.safetyReason) || 'This post was blocked by the safety check.',
    });
  }

  var space = SPACE_ALIASES[String(result.space || '').toUpperCase()] || 'STUDENT';
  // Nobody is tagged in the Student space, so an "experts only" question there would be visible to no one but the
  // author: it is posted publicly instead.
  if (!spaceTags(space)) visibility = 'PUBLIC';
  var isAnon = role === 'STUDENT' ? true : input.isAnonymous === null || input.isAnonymous === undefined ? !!actor.anonByDefault : !!input.isAnonymous;

  // 3. Save the post (no topic tags).
  var saved = Post.make({
    author: { id: actorId },
    postType: 'QUESTION',
    title: String(input.title).trim(),
    body: input.body || '',
    visibility: visibility,
    space: space,
    department: result.department || null,
    isAnonymous: isAnon,
    createdAt: DateTime.now(),
  }).create();

  // 4. ExpertMatch rows, only in the Experts and Alumni spaces (validated: a known professor/alum, not the author,
  //    max 5, no duplicates). Student-space questions tag no one.
  var seen = {};
  var rows = ExpertMatch.arrayBuilder();
  var rank = 0;
  each(spaceTags(space) ? result.experts : null, function (e) {
    if (rank >= 5 || !e || !known[e.memberId] || e.memberId === actorId || seen[e.memberId]) return;
    seen[e.memberId] = true;
    rank++;
    rows.add(
      ExpertMatch.make({
        post: { id: saved.id },
        expert: { id: e.memberId },
        rank: rank,
        score: Math.max(0, Math.min(100, e.score || 0)),
        reason: e.reason,
      })
    );
  });
  if (rank > 0) ExpertMatch.createBatch(rows.build());

  return CreatePostResult.make({ ok: true, post: buildPostViews([loadPost(saved.id)], actorId)[0].view });
}

function reply(actorId, postId, body, isAnonymous) {
  var actor = requireMember(actorId);
  if (!isVerified(actor)) throw new Error('Only Purdue members can reply.');
  if (!body || !String(body).trim()) throw new Error('Reply cannot be empty.');
  var post = loadPost(postId);
  if (!post) throw new Error('Post not found');
  var matches = matchesByPost([post.id])[post.id] || [];
  if (!canView(post, actorId, matches)) throw new Error('This post is only visible to its author and matched experts.');

  var anon =
    str(actor.role) === 'STUDENT'
      ? true
      : isAnonymous === null || isAnonymous === undefined
      ? !!actor.anonByDefault
      : !!isAnonymous;
  var r = Reply.make({
    post: { id: post.id },
    author: { id: actorId },
    body: String(body).trim(),
    isAnonymous: anon,
    createdAt: DateTime.now(),
  }).create();

  return ReplyView.make({
    id: r.id,
    body: String(body).trim(),
    createdAt: DateTime.now(),
    author: authorView(actor, post.id, anon),
    authorGroup: ROLE_GROUP[str(actor.role)],
    isMine: true,
  });
}
