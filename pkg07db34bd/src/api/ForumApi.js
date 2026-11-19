/*
 * ForumApi — BoilerConnect forum data surface (Lane A).
 *
 * Every method returns VIEW types only. Anonymous items never carry the author's id, name, or email.
 * Everyone on the platform is a verified Purdue member, so no view says "verified". There are no likes.
 */

var MEMBER_FIELDS = 'id, name, email, role, level, verified, department, employer, bio, tags, badges, anonByDefault, reputation';
var AUTHOR_INCLUDE = ['name', 'role', 'level', 'verified', 'department', 'employer', 'badges'];
var POST_INCLUDE =
  'id, postType, title, body, visibility, space, department, tags, isAnonymous, createdAt, author.id, ' +
  AUTHOR_INCLUDE.map(function (f) { return 'author.' + f; }).join(', ');
var FEED_LIMIT = 200;
/** Feed tab → space. Aliases accepted so the UI can say "Professors". */
var SPACE_TABS = {
  students: 'STUDENT', student: 'STUDENT',
  faculty: 'FACULTY', professors: 'FACULTY',
  alumni: 'ALUMNI',
};
/** Reply grouping on a post: professors above, then alumni, then students. */
var GROUP_ORDER = { FACULTY: 0, ALUMNI: 1, STUDENT: 2 };

// ---------------------------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------------------------

function str(v) {
  return v === null || v === undefined ? null : String(v);
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

function levelLabel(level) {
  var l = str(level);
  return l === 'PHD' ? 'PhD' : l === 'UG' ? 'Undergrad' : l === 'MS' ? 'MS' : l;
}

function roleLabelOf(m) {
  var role = str(m.role);
  if (role === 'FACULTY') return 'Faculty' + (m.department ? ' · ' + m.department : '');
  if (role === 'ALUMNI') {
    return 'Alum' + (m.employer ? ' · ' + m.employer : m.department ? ' · ' + m.department : '');
  }
  return levelLabel(m.level) + (m.department ? ' · ' + m.department : '');
}

/** Students are always anonymous; faculty/alumni follow the item's flag. */
function effectiveAnon(member, isAnonymous) {
  return str(member.role) === 'STUDENT' ? true : !!isAnonymous;
}

function authorView(member, postId, isAnonymous, flair) {
  var anon = effectiveAnon(member, isAnonymous);
  if (anon) {
    var role = str(member.role);
    var display;
    if (role === 'FACULTY') display = 'Faculty' + (member.department ? ' · ' + member.department : '');
    else if (role === 'ALUMNI') display = 'Alum' + (member.employer ? ' · ' + member.employer : '');
    else display = anonStudentHandle(member.id, postId);
    return AuthorView.make({
      displayName: display,
      // The handle already says Faculty/Alum; only the student handle needs a role label.
      roleLabel: role === 'STUDENT' ? 'Student' : null,
      badges: [],
      isAnonymous: true,
      flair: flair || null,
      memberId: null,
    });
  }
  return AuthorView.make({
    displayName: member.name,
    roleLabel: roleLabelOf(member),
    badges: member.badges || [],
    isAnonymous: false,
    flair: flair || null,
    memberId: member.id,
  });
}

function memberView(m) {
  return MemberView.make({
    id: m.id,
    name: m.name,
    role: str(m.role),
    level: str(m.level),
    department: m.department,
    employer: m.employer,
    bio: m.bio,
    tags: m.tags || [],
    badges: m.badges || [],
    reputation: m.reputation || 0,
    anonByDefault: str(m.role) === 'STUDENT' ? true : !!m.anonByDefault,
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
  return !!expertIdSet(matches)[actorId];
}

function hoursSince(dt) {
  if (!dt) return 0;
  return DateTime.deltaSeconds(dt, DateTime.now()) / 3600;
}

/** Serializes loaded posts → [{view, hot}] with all counts and viewer flags. */
function buildPostViews(posts, actorId) {
  var ids = posts.map(function (p) { return p.id; });
  var matches = matchesByPost(ids);
  var replies = repliesByPost(ids);

  return posts.map(function (p) {
    var pm = matches[p.id] || [];
    var experts = pm;
    var expertSet = expertIdSet(experts);
    var replyAuthors = replies[p.id] || [];
    var expertReplies = replyAuthors.filter(function (a) { return expertSet[a]; }).length;

    // Anonymity: never publish WHO was tagged (it would de-anonymize anonymous expert replies). Everyone gets the
    // count; a matched expert additionally gets their own entry ("why you were tagged").
    var expertViews = ExpertView.arrayBuilder();
    experts.forEach(function (m) {
      if (m.expert.id !== actorId) return;
      expertViews.add(
        ExpertView.make({
          memberId: m.expert.id,
          name: m.expert.name,
          roleLabel: roleLabelOf(m.expert),
          department: m.expert.department,
          reason: m.reason,
          score: m.score,
          badges: m.expert.badges || [],
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
      tags: p.tags || [],
      createdAt: p.createdAt,
      author: authorView(p.author, p.id, p.isAnonymous, null),
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
  var ids = [];
  each(
    ExpertMatch.fetch({ filter: Filter.eq('expert.id', actorId), include: 'id, post.id', limit: 500 }).objs,
    function (m) { if (ids.indexOf(m.post.id) < 0) ids.push(m.post.id); }
  );
  if (!ids.length) return PostView.arrayBuilder().build();
  var posts = toNativePosts(
    Post.fetch({
      filter: Filter.intersects('id', strArray(ids)).and().eq('postType', 'QUESTION'),
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
  var expertSet = expertIdSet(matches);
  var flairLabel = post.department || (post.tags && post.tags.length ? post.tags[0] : 'this topic');

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
  // Professors' answers first, then alumni, then students; oldest first within each group.
  replies = replies
    .map(function (r, i) { return { r: r, g: GROUP_ORDER[str(r.author.role)], i: i }; })
    .sort(function (a, b) { return a.g - b.g || a.i - b.i; }) // explicit tie-break keeps chronological order
    .map(function (x) { return x.r; });

  var rb = ReplyView.arrayBuilder();
  replies.forEach(function (r) {
    var flair = expertSet[r.author.id] ? '🎯 Expert: ' + flairLabel : null;
    rb.add(
      ReplyView.make({
        id: r.id,
        body: r.body,
        createdAt: r.createdAt,
        author: authorView(r.author, post.id, r.isAnonymous, flair),
        authorGroup: str(r.author.role),
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
  var postType = 'QUESTION';
  if (role === 'FACULTY') {
    return CreatePostResult.make({ ok: false, error: 'Faculty answer questions but cannot post them.' });
  }
  var visibility = String(input.visibility || 'PUBLIC').toUpperCase() === 'EXPERTS_ONLY' ? 'EXPERTS_ONLY' : 'PUBLIC';
  if (!input.title || !String(input.title).trim()) return CreatePostResult.make({ ok: false, error: 'Title is required.' });

  // 1. Expert directory: everyone except the author.
  var dir = DirectoryEntry.arrayBuilder();
  var known = {};
  each(ForumMember.fetch({ filter: Filter.ne('id', actorId), include: MEMBER_FIELDS, limit: 500 }).objs, function (m) {
    known[m.id] = true;
    dir.add(
      DirectoryEntry.make({
        memberId: m.id,
        role: str(m.role),
        level: str(m.level),
        department: m.department,
        tags: m.tags || [],
        badges: m.badges || [],
        bio: m.bio ? String(m.bio).substring(0, 120) : null,
        reputation: m.reputation || 0,
      })
    );
  });

  // 2. AI pipeline (Lane B owns the body; signature is frozen).
  var result = AiPipeline.analyzePost(input.title, input.body || '', str(actor.level), dir.build());
  if (!result || result.safe === false) {
    return CreatePostResult.make({
      ok: false,
      error: (result && result.safetyReason) || 'This post was blocked by the safety check.',
    });
  }

  var space = ['STUDENT', 'FACULTY', 'ALUMNI'].indexOf(str(result.space)) >= 0 ? str(result.space) : 'STUDENT';
  var isAnon = role === 'STUDENT' ? true : input.isAnonymous === null || input.isAnonymous === undefined ? !!actor.anonByDefault : !!input.isAnonymous;

  // 3. Save the post.
  var saved = Post.make({
    author: { id: actorId },
    postType: postType,
    title: String(input.title).trim(),
    body: input.body || '',
    visibility: visibility,
    space: space,
    department: result.department || null,
    tags: result.tags || [],
    isAnonymous: isAnon,
    createdAt: DateTime.now(),
  }).create();

  // 4. ExpertMatch rows (validated: known member, not the author, max 5, no duplicates).
  {
    var seen = {};
    var rows = ExpertMatch.arrayBuilder();
    var rank = 0;
    each(result.experts, function (e) {
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
  }

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
  ForumMember.make({ id: actorId, reputation: (actor.reputation || 0) + 1 }).merge();

  var isExpert = !!expertIdSet(matches)[actorId];
  var flairLabel = post.department || (post.tags && post.tags.length ? post.tags[0] : 'this topic');
  return ReplyView.make({
    id: r.id,
    body: String(body).trim(),
    createdAt: DateTime.now(),
    author: authorView(actor, post.id, anon, isExpert ? '🎯 Expert: ' + flairLabel : null),
    authorGroup: str(actor.role),
    isMine: true,
  });
}
