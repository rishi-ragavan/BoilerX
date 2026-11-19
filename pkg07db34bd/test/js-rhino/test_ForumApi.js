/*
 * ForumApi read-path tests (Lane A): anonymity, tags (Expert / Alumni) + flair, no topic tags, no 🎯 flair,
 * tagged-expert privacy, spaces, reply grouping by the post's space, EXPERTS_ONLY visibility, "Questions for you"
 * (professors + alumni only), and the membership gate.
 * Creates its own uniquely-named rows (never depends on data/ seed) and tears them down.
 */
var filename = 'test_ForumApi.js';

describe(filename, function () {
  var P = 'tst_' + Math.floor(Math.random() * 1e9).toString(16) + '_';

  function order(detail) {
    var out = [];
    detail.replies.each(function (r) { out.push(r.id + ':' + r.authorGroup); });
    return out;
  }

  beforeAll(function () {
    this.ctx = TestApi.createContext(filename);
    var ids = (this.ids = {
      student: P + 'student',
      outsider: P + 'outsider',
      faculty: P + 'faculty',
      alum: P + 'alum',
      fakeAlum: P + 'fakealum',
      publicPost: P + 'post_public',
      otherPost: P + 'post_other',
      secretPost: P + 'post_secret',
      alumPost: P + 'post_alum',
      expertReply: P + 'reply_expert',
      alumReply: P + 'reply_alum',
      studentReply: P + 'reply_student',
      sExpert: P + 's_expert',
      sStudent: P + 's_student',
      aStudent: P + 'a_student',
      aExpert: P + 'a_expert',
      aAlum: P + 'a_alum',
    });
    var now = DateTime.now();

    TestApi.createBatchEntity(this.ctx, 'ForumMember', [
      { id: ids.student, name: 'Tess Student', email: 'tess@purdue.edu', role: 'STUDENT', verified: true,
        department: 'Economics', tags: [], anonByDefault: true },
      { id: ids.outsider, name: 'Otto Outsider', email: 'otto@purdue.edu', role: 'STUDENT', verified: true,
        department: 'Biology', tags: [], anonByDefault: true },
      { id: ids.faculty, name: 'Prof. Fiona Testwell', email: 'ftestwell@purdue.edu', role: 'FACULTY', verified: true,
        department: 'Finance', tags: ['stock market', 'asset pricing'], anonByDefault: true },
      { id: ids.alum, name: 'Alan Alum', email: 'aalum@alumni.purdue.edu', role: 'ALUMNI', verified: true,
        department: 'Finance', employer: 'Google', tags: ['SWE'] },
      { id: ids.fakeAlum, name: 'Faye Fake', email: 'faye@gmail.com', role: 'ALUMNI', verified: false,
        department: 'CS', employer: 'Startup', tags: [] },
    ]);
    TestApi.createBatchEntity(this.ctx, 'Post', [
      { id: ids.publicPost, author: { id: ids.student }, postType: 'QUESTION', title: 'Public finance question',
        body: 'b', visibility: 'PUBLIC', space: 'EXPERTS', department: 'Finance', isAnonymous: true, createdAt: now },
      { id: ids.otherPost, author: { id: ids.student }, postType: 'QUESTION', title: 'Another thread', body: 'b',
        visibility: 'PUBLIC', space: 'STUDENT', department: 'Economics', isAnonymous: true, createdAt: now },
      { id: ids.secretPost, author: { id: ids.student }, postType: 'QUESTION', title: 'Experts-only question',
        body: 'b', visibility: 'EXPERTS_ONLY', space: 'EXPERTS', department: 'Finance', isAnonymous: true,
        createdAt: now },
      { id: ids.alumPost, author: { id: ids.alum }, postType: 'QUESTION', title: 'Alum question', body: 'b',
        visibility: 'PUBLIC', space: 'ALUMNI', isAnonymous: false, createdAt: now },
    ]);
    TestApi.createBatchEntity(this.ctx, 'ExpertMatch', [
      { id: P + 'm1', post: { id: ids.publicPost }, expert: { id: ids.faculty }, rank: 1, score: 90, reason: 'r' },
      { id: P + 'm2', post: { id: ids.secretPost }, expert: { id: ids.faculty }, rank: 1, score: 90, reason: 'r' },
      // A (legacy) match on a student: students still get no "Questions for you".
      { id: P + 'm3', post: { id: ids.alumPost }, expert: { id: ids.outsider }, rank: 1, score: 50, reason: 'r' },
    ]);
    TestApi.createBatchEntity(this.ctx, 'Reply', [
      // Experts space: posted student → alum → professor; must list professor, alum, student.
      { id: ids.studentReply, post: { id: ids.publicPost }, author: { id: ids.student }, body: 'thanks!',
        isAnonymous: true, createdAt: now.minusMinutes(10) },
      { id: ids.alumReply, post: { id: ids.publicPost }, author: { id: ids.alum }, body: 'industry view',
        isAnonymous: true, createdAt: now.minusMinutes(5) },
      { id: ids.expertReply, post: { id: ids.publicPost }, author: { id: ids.faculty }, body: 'expert answer',
        isAnonymous: true, createdAt: now },
      // Student space: professor replied first in time; the student must still be listed first.
      { id: ids.sExpert, post: { id: ids.otherPost }, author: { id: ids.faculty }, body: 'x', isAnonymous: true,
        createdAt: now.minusMinutes(10) },
      { id: ids.sStudent, post: { id: ids.otherPost }, author: { id: ids.outsider }, body: 'x', isAnonymous: true,
        createdAt: now },
      // Alumni space: student, professor, then alum in time; must list alum, professor, student.
      { id: ids.aStudent, post: { id: ids.alumPost }, author: { id: ids.outsider }, body: 'x', isAnonymous: true,
        createdAt: now.minusMinutes(10) },
      { id: ids.aExpert, post: { id: ids.alumPost }, author: { id: ids.faculty }, body: 'x', isAnonymous: true,
        createdAt: now.minusMinutes(5) },
      { id: ids.aAlum, post: { id: ids.alumPost }, author: { id: ids.alum }, body: 'x', isAnonymous: true,
        createdAt: now },
    ]);
    TestApi.waitForSetup(this.ctx);

    var self = this;
    this.publicDetail = ForumApi.getPost(ids.outsider, ids.publicPost);
    this.otherDetail = ForumApi.getPost(ids.outsider, ids.otherPost);
    this.alumDetail = ForumApi.getPost(ids.outsider, ids.alumPost);
    this.replyById = {};
    this.publicDetail.replies.each(function (r) { self.replyById[r.id] = r; });

    var feedIds = function (tab, dept) {
      return ForumApi.feed(ids.outsider, tab, dept || null).mapToStr(function (p) { return p.id; });
    };
    this.feedIds = feedIds('foryou');
    this.studentSpace = feedIds('students');
    this.alumniSpace = feedIds('alumni');
    this.expertsSpace = feedIds('experts');
    this.studentSpaceEcon = feedIds('students', 'Economics');
    this.studentSpaceBio = feedIds('students', 'Biology');

    var members = {};
    ForumApi.listMembers().each(function (m) { members[m.id] = m; });
    this.members = members;
    this.facultyInbox = ForumApi.inbox(ids.faculty).mapToStr(function (p) { return p.id; });
    this.studentInbox = ForumApi.inbox(ids.outsider);
    this.facultyView = ForumApi.getPost(ids.faculty, ids.publicPost);
    this.unverifiedPost = ForumApi.createPost(ids.fakeAlum, NewPostInput.make({ title: 'Should be refused' }));
    this.articleAttempt = ForumApi.createPost(ids.student, NewPostInput.make({ title: 'x', postType: 'ARTICLE' }));
    this.facultyQuestion = ForumApi.createPost(ids.faculty, NewPostInput.make({ title: 'A professor asking' }));
  });

  afterAll(function () {
    TestApi.teardown(this.ctx);
  });

  describe('anonymity', function () {
    it('shows a student author as "Boiler " + 4 hex chars', function () {
      expect(this.publicDetail.post.author.displayName).toMatch(/^Boiler [0-9a-f]{4}$/);
    });

    it('never serializes a student author id, name, or email', function () {
      var json = JSON.stringify(this.publicDetail.post.toJson());
      ['Tess Student', 'tess@purdue.edu', this.ids.student].forEach(function (secret) {
        expect(json.indexOf(secret)).withContext('leaked ' + secret).toBe(-1);
      });
    });

    it('gives the same student a different handle in another thread', function () {
      expect(this.otherDetail.post.author.displayName).not.toBe(this.publicDetail.post.author.displayName);
    });

    it('shows an anonymous professor as "Purdue professor"', function () {
      expect(this.replyById[this.ids.expertReply].author.displayName).toBe('Purdue professor');
    });

    it('never serializes an anonymous professor id, name, or email', function () {
      var json = JSON.stringify(this.replyById[this.ids.expertReply].toJson());
      ['Testwell', 'ftestwell@purdue.edu', this.ids.faculty].forEach(function (secret) {
        expect(json.indexOf(secret)).withContext('leaked ' + secret).toBe(-1);
      });
    });
  });

  describe('tags and flair', function () {
    it('tags professors "Expert"', function () {
      expect(this.replyById[this.ids.expertReply].author.tag).toBe('Expert');
    });

    it('gives professors a department + research-interest flair', function () {
      expect(this.replyById[this.ids.expertReply].author.flair).toBe('Finance · stock market, asset pricing');
    });

    it('tags alumni "Alumni"', function () {
      expect(this.alumDetail.post.author.tag).toBe('Alumni');
    });

    it('gives a named alum a career-role flair with their employer', function () {
      expect(this.alumDetail.post.author.flair).toBe('SWE · Google');
    });

    it('drops the employer from an anonymous alum flair', function () {
      expect(this.replyById[this.ids.alumReply].author.flair).toBe('SWE');
    });

    it('gives students no tag', function () {
      expect(this.publicDetail.post.author.tag).toBeFalsy();
    });

    it('gives students no flair', function () {
      expect(this.replyById[this.ids.studentReply].author.flair).toBeFalsy();
    });

    it('never shows a 🎯 expert flair on replies', function () {
      expect(JSON.stringify(this.publicDetail.toJson()).indexOf('🎯')).toBe(-1);
    });

    it('sends no topic tags on posts', function () {
      expect(this.publicDetail.post.toJson().tags).toBeUndefined();
    });
  });

  describe('members', function () {
    it('only lists verified Purdue members', function () {
      expect(this.members[this.ids.fakeAlum]).toBeUndefined();
    });

    it('gives students no expertise', function () {
      expect(this.members[this.ids.student].tags ? this.members[this.ids.student].tags.length : 0).toBe(0);
    });

    it('labels professors "Expert · {department}" in the persona switcher', function () {
      expect(this.members[this.ids.faculty].roleLabel).toBe('Expert · Finance');
    });

    it('has no level, badges, or reputation', function () {
      var json = this.members[this.ids.faculty].toJson();
      expect([json.level, json.badges, json.reputation]).toEqual([undefined, undefined, undefined]);
    });
  });

  describe('tagged-expert privacy', function () {
    it('never lists tagged experts to other viewers', function () {
      expect(this.publicDetail.post.experts ? this.publicDetail.post.experts.length : 0).toBe(0);
    });

    it('still reports how many experts were tagged', function () {
      expect(this.publicDetail.post.expertCount).toBe(1);
    });

    it('gives a tagged professor only their own entry', function () {
      expect(this.facultyView.post.experts.mapToStr(function (e) { return e.memberId; }).toJson()).toEqual([
        this.ids.faculty,
      ]);
    });
  });

  describe('reply grouping by space', function () {
    it('lists professors first in the Experts space, then alumni, then students', function () {
      expect(order(this.publicDetail)).toEqual([
        this.ids.expertReply + ':EXPERTS', this.ids.alumReply + ':ALUMNI', this.ids.studentReply + ':STUDENT',
      ]);
    });

    it('lists students first in the Student space', function () {
      expect(order(this.otherDetail)).toEqual([this.ids.sStudent + ':STUDENT', this.ids.sExpert + ':EXPERTS']);
    });

    it('lists alumni first in the Alumni space', function () {
      expect(order(this.alumDetail)).toEqual([
        this.ids.aAlum + ':ALUMNI', this.ids.aExpert + ':EXPERTS', this.ids.aStudent + ':STUDENT',
      ]);
    });
  });

  describe('spaces', function () {
    it('shows a post only in the space it was routed to', function () {
      expect(this.studentSpace.contains(this.ids.publicPost)).toBeFalse();
    });

    it('shows the routed post in its own space', function () {
      expect(this.expertsSpace.contains(this.ids.publicPost)).toBeTrue();
    });

    it('shows an alumni-space question in the Alumni space', function () {
      expect(this.alumniSpace.contains(this.ids.alumPost)).toBeTrue();
    });

    it('shows every space in For You', function () {
      expect(this.feedIds.contains(this.ids.alumPost)).toBeTrue();
    });

    it('applies the department filter in any space', function () {
      expect(this.studentSpaceEcon.contains(this.ids.otherPost)).toBeTrue();
    });

    it('excludes other departments when filtering a space', function () {
      expect(this.studentSpaceBio.contains(this.ids.otherPost)).toBeFalse();
    });
  });

  describe('EXPERTS_ONLY visibility', function () {
    it('keeps EXPERTS_ONLY posts out of the feed', function () {
      expect(this.feedIds.contains(this.ids.secretPost)).toBeFalse();
    });

    it('refuses getPost for a member who is neither author nor tagged', function () {
      var ids = this.ids;
      expect(function () { ForumApi.getPost(ids.outsider, ids.secretPost); }).toThrow();
    });

    it('allows getPost for a tagged professor', function () {
      expect(ForumApi.getPost(this.ids.faculty, this.ids.secretPost).post.id).toBe(this.ids.secretPost);
    });

    it('allows getPost for the author', function () {
      expect(ForumApi.getPost(this.ids.student, this.ids.secretPost).post.isMine).toBeTrue();
    });
  });

  describe('Questions for you', function () {
    it('lists the questions a professor was tagged on (incl. EXPERTS_ONLY)', function () {
      expect(this.facultyInbox.contains(this.ids.secretPost)).toBeTrue();
    });

    it('is always empty for students', function () {
      expect(this.studentInbox.length).toBe(0);
    });

    it('marks the viewer as tagged on posts they were matched to', function () {
      expect(this.facultyView.post.viewerIsMatchedExpert).toBeTrue();
    });
  });

  describe('membership gate and permissions', function () {
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

    it('refuses anything but a question (no articles)', function () {
      expect(this.articleAttempt.error).toBe('Only questions can be posted.');
    });

    it('refuses a question from a professor', function () {
      expect(this.facultyQuestion.error).toBe('Experts answer questions but cannot post them.');
    });
  });
});
