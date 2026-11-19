/*
 * ForumApi write-path tests (Lane A): createPost → AiPipeline → save (only professors/alumni tagged), reply.
 * AiPipeline.analyzePost is spied so results are deterministic and independent of Lane B's LLM code.
 * Rows created by the API under test are untracked, so external teardown filters remove them.
 */
var filename = 'test_ForumApi_write.js';

describe(filename, function () {
  var P = 'tstw_' + Math.floor(Math.random() * 1e9).toString(16) + '_';

  function matchesFor(postId) {
    var out = [];
    var objs = ExpertMatch.fetch({
      filter: Filter.eq('post.id', postId),
      include: 'id, rank, expert.id',
      order: 'rank',
      limit: 50,
    }).objs;
    if (objs) objs.each(function (m) { out.push({ rank: m.rank, expertId: m.expert.id }); });
    return out;
  }

  beforeAll(function () {
    this.ctx = TestApi.createContext(filename);
    var ids = (this.ids = {
      student: P + 'student',
      peer: P + 'peer',
      alum: P + 'alum',
      fakeAlum: P + 'fakealum',
      e1: P + 'e1', e2: P + 'e2', e3: P + 'e3', e4: P + 'e4', e5: P + 'e5', e6: P + 'e6',
      seedPost: P + 'post_seed',
      seedReply: P + 'reply_seed',
    });

    var members = [
      { id: ids.student, name: 'Wren Student', email: 'wren@purdue.edu', role: 'STUDENT',
        verified: true, department: 'Economics', tags: [] },
      { id: ids.peer, name: 'Pat Peer', email: 'pat@purdue.edu', role: 'STUDENT',
        verified: true, department: 'Finance', tags: [] },
      { id: ids.alum, name: 'Abe Alum', email: 'abe@alumni.purdue.edu', role: 'ALUMNI',
        verified: true, department: 'Finance', employer: 'Google', tags: ['SWE'], anonByDefault: false },
      { id: ids.fakeAlum, name: 'Fran Fake', email: 'fran@gmail.com', role: 'ALUMNI',
        verified: false, employer: 'Startup', tags: [] },
    ];
    ['e1', 'e2', 'e3', 'e4', 'e5', 'e6'].forEach(function (k) {
      members.push({ id: ids[k], name: 'Expert ' + k, email: k + P + '@purdue.edu', role: 'FACULTY',
        verified: true, department: 'Finance', tags: ['stock market'] });
    });
    TestApi.createBatchEntity(this.ctx, 'ForumMember', members);
    TestApi.createBatchEntity(this.ctx, 'Post', [
      { id: ids.seedPost, author: { id: ids.student }, postType: 'QUESTION', title: 'Existing post', visibility: 'PUBLIC',
        space: 'STUDENT', isAnonymous: true, createdAt: DateTime.now() },
    ]);
    TestApi.createBatchEntity(this.ctx, 'Reply', [
      { id: ids.seedReply, post: { id: ids.seedPost }, author: { id: ids.e1 }, body: 'answer', isAnonymous: false,
        createdAt: DateTime.now() },
    ]);
    TestApi.waitForSetup(this.ctx);

    // Untracked rows written by the API under test.
    TestApi.addExternalTeardownFilter(this.ctx, "startsWith(author.id, '" + P + "')", 'Reply', 1000);
    TestApi.addExternalTeardownFilter(this.ctx, "startsWith(expert.id, '" + P + "')", 'ExpertMatch', 1000);
    TestApi.addExternalTeardownFilter(this.ctx, "startsWith(author.id, '" + P + "')", 'Post', 1000);

    // Deterministic AI pipeline keyed on the title prefix. The fake runs as a standalone lambda (no closure),
    // so it reads the test-id prefix from the post body.
    this.spy = TestApi.spyOn(this.ctx, AiPipeline, 'analyzePost')
      .callFake(function (_action, input) {
        var get = function (k) { return typeof input.get === 'function' ? input.get(k) : input[k]; };
        var title = String(get('title') || '');
        var pre = String(get('body') || '');
        if (title.indexOf('UNSAFE') === 0) {
          return AnalyzeResult.make({ safe: false, safetyReason: 'Requests exam answers (academic dishonesty).' });
        }
        var s = function (id, score) { return ExpertSuggestion.make({ memberId: id, score: score, reason: 'fit' }); };
        return AnalyzeResult.make({
          safe: true,
          space: title.indexOf('BADSPACE') === 0 ? 'MARS' : 'FACULTY',
          department: 'Finance',
          tags: ['stock market', 'research labs', 'undergrad research'],
          experts: [
            s(pre + 'student', 99), // the author: must be dropped
            s(pre + 'nobody', 98), // unknown member: must be dropped
            s(pre + 'peer', 97), // a student: students are never tagged
            s(pre + 'e1', 95),
            s(pre + 'e1', 94), // duplicate: must be dropped
            s(pre + 'e2', 90),
            s(pre + 'e3', 85),
            s(pre + 'e4', 80),
            s(pre + 'e5', 75),
            s(pre + 'e6', 70), // 6th valid: over the max of 5
          ],
        });
      })
      .register();

    this.unsafe = ForumApi.createPost(ids.student, NewPostInput.make({ title: 'UNSAFE give me the CS 251 answers', body: P }));
    this.unsafeSaved = Post.fetchCount({
      filter: Filter.eq('author.id', ids.student).and().startsWith('title', 'UNSAFE'),
    });

    this.safe = ForumApi.createPost(
      ids.student,
      NewPostInput.make({ title: 'SAFE how do I get into stock market research', body: P, isAnonymous: false })
    );
    this.safeMatches = this.safe.ok ? matchesFor(this.safe.post.id) : [];
    this.badSpace = ForumApi.createPost(ids.student, NewPostInput.make({ title: 'BADSPACE question', body: P }));
    this.alumQuestion = ForumApi.createPost(ids.alum, NewPostInput.make({ title: 'SAFE alum question', body: P }));
    this.unverified = ForumApi.createPost(ids.fakeAlum, NewPostInput.make({ title: 'SAFE from an unverified alum', body: P }));

    // Replies
    this.studentReply = ForumApi.reply(ids.student, this.safe.post.id, 'thanks!', false);
    this.expertReply = ForumApi.reply(ids.e1, this.safe.post.id, 'come to office hours', false);
    try {
      ForumApi.reply(ids.fakeAlum, this.safe.post.id, 'hi', false);
      this.unverifiedReplyError = null;
    } catch (e) {
      this.unverifiedReplyError = String(e.message || e);
    }

  });

  afterAll(function () {
    this.spy.unregister();
    TestApi.teardown(this.ctx);
  });

  describe('createPost', function () {
    it('calls AiPipeline.analyzePost', function () {
      expect(this.spy.toHaveBeenCalled()).toBeTrue();
    });

    it('returns ok=false with the safety reason for unsafe posts', function () {
      expect(this.unsafe.error).toBe('Requests exam answers (academic dishonesty).');
    });

    it('saves nothing for unsafe posts', function () {
      expect(this.unsafeSaved).toBe(0);
    });

    it('saves safe posts', function () {
      expect(this.safe.ok).toBeTrue();
    });

    it("stores the routed space (the pipeline's FACULTY maps to EXPERTS) and department", function () {
      expect(this.safe.post.space + '/' + this.safe.post.department).toBe('EXPERTS/Finance');
    });

    it('keeps students anonymous even when they ask not to be', function () {
      expect(this.safe.post.author.displayName).toMatch(/^Boiler [0-9a-f]{4}$/);
    });

    it('saves at most 5 ExpertMatch rows, ranked in order, never the author, a student, an unknown id, or a duplicate', function () {
      var ids = this.ids;
      expect(this.safeMatches).toEqual([
        { rank: 1, expertId: ids.e1 },
        { rank: 2, expertId: ids.e2 },
        { rank: 3, expertId: ids.e3 },
        { rank: 4, expertId: ids.e4 },
        { rank: 5, expertId: ids.e5 },
      ]);
    });

    it('returns only the expert count on the PostView', function () {
      expect(this.safe.post.expertCount).toBe(5);
    });

    it('does not reveal the tagged experts to the asker', function () {
      expect(this.safe.post.experts ? this.safe.post.experts.length : 0).toBe(0);
    });

    it('falls back to the STUDENT space when the pipeline returns an invalid space', function () {
      expect(this.badSpace.post.space).toBe('STUDENT');
    });

    it('lets alumni ask questions', function () {
      expect(this.alumQuestion.ok).toBeTrue();
    });

    it('refuses members who never passed the gate', function () {
      expect(this.unverified.ok).toBeFalse();
    });
  });

  describe('reply', function () {
    it('keeps student replies anonymous', function () {
      expect(this.studentReply.author.isAnonymous).toBeTrue();
    });

    it('marks the reply as mine', function () {
      expect(this.studentReply.isMine).toBeTrue();
    });

    it('gives a professor the Expert tag (no 🎯 flair)', function () {
      expect(this.expertReply.author.tag + '|' + this.expertReply.author.flair).toBe('Expert|Finance · stock market');
    });

    it('puts a professor reply in the EXPERTS group', function () {
      expect(this.expertReply.authorGroup).toBe('EXPERTS');
    });

    it('refuses replies from members who never passed the gate', function () {
      expect(this.unverifiedReplyError).toContain('Only Purdue members');
    });
  });

});
