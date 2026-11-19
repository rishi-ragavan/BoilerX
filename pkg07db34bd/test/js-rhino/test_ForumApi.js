/*
 * ForumApi tests (Lane A): anonymity stripping, EXPERTS_ONLY visibility, 🎯 flair, reply grouping, membership gate.
 * Creates its own uniquely-named rows (never depends on data/ seed) and tears them down.
 */
var filename = 'test_ForumApi.js';

describe(filename, function () {
  var P = 'tst_' + Math.floor(Math.random() * 1e9).toString(16) + '_';

  beforeAll(function () {
    this.ctx = TestApi.createContext(filename);
    this.ids = {
      student: P + 'student',
      outsider: P + 'outsider',
      faculty: P + 'faculty',
      alum: P + 'alum',
      fakeAlum: P + 'fakealum',
      publicPost: P + 'post_public',
      otherPost: P + 'post_other',
      secretPost: P + 'post_secret',
      articlePost: P + 'post_article',
      expertReply: P + 'reply_expert',
      studentReply: P + 'reply_student',
    };
    var ids = this.ids;
    var now = DateTime.now();

    TestApi.createBatchEntity(this.ctx, 'ForumMember', [
      { id: ids.student, name: 'Tess Student', email: 'tess@purdue.edu', role: 'STUDENT', level: 'UG',
        verified: true, department: 'Economics', tags: ['investing'], badges: ['CLUB_PRESIDENT'], anonByDefault: true },
      { id: ids.outsider, name: 'Otto Outsider', email: 'otto@purdue.edu', role: 'STUDENT', level: 'UG',
        verified: true, department: 'Biology', tags: ['biology'], badges: [], anonByDefault: true },
      { id: ids.faculty, name: 'Prof. Fiona Testwell', email: 'ftestwell@purdue.edu', role: 'FACULTY',
        level: 'FACULTY', verified: true, department: 'Finance', tags: ['stock market'], badges: ['PROFESSOR'],
        anonByDefault: true },
      { id: ids.alum, name: 'Alan Alum', email: 'aalum@alumni.purdue.edu', role: 'ALUMNI', level: 'ALUMNI',
        verified: true, department: 'Finance', employer: 'Google', tags: ['internships'], badges: [] },
      { id: ids.fakeAlum, name: 'Faye Fake', email: 'faye@gmail.com', role: 'ALUMNI', level: 'ALUMNI',
        verified: false, department: 'CS', employer: 'Startup', tags: [], badges: [] },
    ]);
    TestApi.createBatchEntity(this.ctx, 'Post', [
      { id: ids.publicPost, author: { id: ids.student }, postType: 'QUESTION', title: 'Public finance question',
        body: 'b', visibility: 'PUBLIC', space: 'FACULTY', department: 'Finance', tags: ['stock market'],
        isAnonymous: true, createdAt: now },
      { id: ids.otherPost, author: { id: ids.student }, postType: 'QUESTION', title: 'Another thread',
        body: 'b', visibility: 'PUBLIC', space: 'STUDENT', tags: ['campus life'], isAnonymous: true, createdAt: now },
      { id: ids.secretPost, author: { id: ids.student }, postType: 'QUESTION', title: 'Experts-only question',
        body: 'b', visibility: 'EXPERTS_ONLY', space: 'FACULTY', department: 'Finance', tags: ['grad school'],
        isAnonymous: true, createdAt: now },
      { id: ids.articlePost, author: { id: ids.alum }, postType: 'ARTICLE', title: 'Alum article', body: 'b',
        visibility: 'PUBLIC', space: 'ALUMNI', tags: ['internships'], isAnonymous: false, createdAt: now },
    ]);
    TestApi.createBatchEntity(this.ctx, 'ExpertMatch', [
      { id: P + 'm1', post: { id: ids.publicPost }, expert: { id: ids.faculty }, rank: 1, score: 90, reason: 'r' },
      { id: P + 'm2', post: { id: ids.secretPost }, expert: { id: ids.faculty }, rank: 1, score: 90, reason: 'r' },
    ]);
    TestApi.createBatchEntity(this.ctx, 'Reply', [
      // The student replies FIRST in time; the professor's answer must still be listed above it.
      { id: ids.studentReply, post: { id: ids.publicPost }, author: { id: ids.student }, body: 'thanks!',
        isAnonymous: true, createdAt: now.minusMinutes(10) },
      { id: ids.expertReply, post: { id: ids.publicPost }, author: { id: ids.faculty }, body: 'expert answer',
        isAnonymous: true, createdAt: now },
    ]);
    TestApi.waitForSetup(this.ctx);

    var self = this;
    this.publicDetail = ForumApi.getPost(ids.outsider, ids.publicPost);
    this.otherDetail = ForumApi.getPost(ids.outsider, ids.otherPost);
    this.articleDetail = ForumApi.getPost(ids.outsider, ids.articlePost);
    this.replyById = {};
    this.replyOrder = [];
    this.publicDetail.replies.each(function (r) {
      self.replyById[r.id] = r;
      self.replyOrder.push(r.id + ':' + r.authorGroup);
    });
    this.memberIds = ForumApi.listMembers().mapToStr(function (m) { return m.id; });
    this.feedIds = ForumApi.feed(ids.outsider, 'foryou', null).mapToStr(function (p) { return p.id; });
    this.inboxIds = ForumApi.inbox(ids.faculty).mapToStr(function (p) { return p.id; });
    this.unverifiedPost = ForumApi.createPost(ids.fakeAlum, NewPostInput.make({ title: 'Should be refused' }));
    this.studentArticle = ForumApi.createPost(ids.student, NewPostInput.make({ title: 'x', postType: 'ARTICLE' }));
    this.facultyQuestion = ForumApi.createPost(ids.faculty, NewPostInput.make({ title: 'A professor asking' }));
    this.facultyView = ForumApi.getPost(ids.faculty, ids.publicPost);
  });

  afterAll(function () {
    TestApi.teardown(this.ctx);
  });

  describe('anonymity stripping', function () {
    it('shows a student author as "Boiler " + 4 hex chars (no #)', function () {
      expect(this.publicDetail.post.author.displayName).toMatch(/^Boiler [0-9a-f]{4}$/);
    });

    it('never serializes a student author id, name, or email', function () {
      var json = JSON.stringify(this.publicDetail.post.toJson());
      ['Tess Student', 'tess@purdue.edu', this.ids.student].forEach(function (secret) {
        expect(json.indexOf(secret)).withContext('leaked ' + secret).toBe(-1);
      });
    });

    it('hides badges of anonymous authors', function () {
      expect(this.publicDetail.post.author.badges ? this.publicDetail.post.author.badges.length : 0).toBe(0);
    });

    it('keeps the same student handle within a thread (post author == their reply)', function () {
      expect(this.replyById[this.ids.studentReply].author.displayName).toBe(this.publicDetail.post.author.displayName);
    });

    it('gives the same student a different handle in another thread', function () {
      expect(this.otherDetail.post.author.displayName).not.toBe(this.publicDetail.post.author.displayName);
    });

    it('shows an anonymous faculty reply as "Faculty · {department}" (never "Verified")', function () {
      expect(this.replyById[this.ids.expertReply].author.displayName).toBe('Faculty · Finance');
    });

    it('never serializes an anonymous faculty id, name, or email', function () {
      var json = JSON.stringify(this.replyById[this.ids.expertReply].toJson());
      ['Testwell', 'ftestwell@purdue.edu', this.ids.faculty].forEach(function (secret) {
        expect(json.indexOf(secret)).withContext('leaked ' + secret).toBe(-1);
      });
    });

    it('shows a non-anonymous alum by name', function () {
      expect(this.articleDetail.post.author.displayName).toBe('Alan Alum');
    });
  });

  describe('tagged-expert anonymity', function () {
    it('never lists tagged experts to other viewers', function () {
      expect(this.publicDetail.post.experts ? this.publicDetail.post.experts.length : 0).toBe(0);
    });

    it('never serializes a tagged expert id or name to other viewers', function () {
      var json = JSON.stringify(this.publicDetail.post.toJson());
      ['Testwell', this.ids.faculty].forEach(function (secret) {
        expect(json.indexOf(secret)).withContext('leaked ' + secret).toBe(-1);
      });
    });

    it('still reports how many experts were tagged', function () {
      expect(this.publicDetail.post.expertCount).toBe(1);
    });

    it('gives a matched expert only their own entry', function () {
      expect(this.facultyView.post.experts.mapToStr(function (e) { return e.memberId; }).toJson()).toEqual([
        this.ids.faculty,
      ]);
    });
  });

  describe('reply grouping', function () {
    it("lists professors' answers above student responses, regardless of time", function () {
      expect(this.replyOrder).toEqual([this.ids.expertReply + ':FACULTY', this.ids.studentReply + ':STUDENT']);
    });
  });

  describe('EXPERTS_ONLY visibility', function () {
    it('keeps EXPERTS_ONLY posts out of the feed', function () {
      expect(this.feedIds.contains(this.ids.secretPost)).toBeFalse();
    });

    it('still shows PUBLIC questions in the feed', function () {
      expect(this.feedIds.contains(this.ids.publicPost)).toBeTrue();
    });

    it('refuses getPost for a member who is neither author nor matched expert', function () {
      var ids = this.ids;
      expect(function () { ForumApi.getPost(ids.outsider, ids.secretPost); }).toThrow();
    });

    it('allows getPost for a matched expert', function () {
      expect(ForumApi.getPost(this.ids.faculty, this.ids.secretPost).post.id).toBe(this.ids.secretPost);
    });

    it('allows getPost for the author', function () {
      expect(ForumApi.getPost(this.ids.student, this.ids.secretPost).post.isMine).toBeTrue();
    });

    it('lists EXPERTS_ONLY posts in the matched expert inbox', function () {
      expect(this.inboxIds.contains(this.ids.secretPost)).toBeTrue();
    });
  });

  describe('🎯 Expert flair', function () {
    it('flairs a reply from a matched expert with the post department', function () {
      expect(this.replyById[this.ids.expertReply].author.flair).toBe('🎯 Expert: Finance');
    });

    it('does not flair a reply from a non-expert', function () {
      expect(this.replyById[this.ids.studentReply].author.flair).toBeFalsy();
    });

    it('marks the viewer as matched expert on posts they were matched to', function () {
      expect(ForumApi.getPost(this.ids.faculty, this.ids.publicPost).post.viewerIsMatchedExpert).toBeTrue();
    });
  });

  describe('membership gate and permissions', function () {
    it('only lists verified Purdue members', function () {
      expect(this.memberIds.contains(this.ids.fakeAlum)).toBeFalse();
    });

    it('admits @purdue.edu students', function () {
      expect(Verify.check('x@purdue.edu', 'STUDENT').verified).toBeTrue();
    });

    it('admits @alumni.purdue.edu as ALUMNI', function () {
      expect(Verify.check('x@alumni.purdue.edu', 'STUDENT').role).toBe('ALUMNI');
    });

    it('does not admit a non-Purdue alum email', function () {
      expect(Verify.check('x@gmail.com', 'ALUMNI').verified).toBeFalse();
    });

    it('refuses createPost from a member who never passed the gate', function () {
      expect(this.unverifiedPost.ok).toBeFalse();
    });

    it('refuses an ARTICLE from a student', function () {
      expect(this.studentArticle.ok).toBeFalse();
    });

    it('refuses a QUESTION from faculty', function () {
      expect(this.facultyQuestion.error).toBe('Faculty can publish articles, but cannot ask questions.');
    });
  });
});
