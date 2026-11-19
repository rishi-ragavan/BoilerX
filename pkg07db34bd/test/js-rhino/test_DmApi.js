/*
 * DmApi tests (Lane D): only FACULTY start DMs (and only on posts they were tagged on), participants-only access,
 * conversation reuse, and anonymity on both sides (no names, no memberIds in any DM view).
 * Creates its own uniquely-named rows (never depends on data/ seed) and tears them down.
 */
var filename = 'test_DmApi.js';

describe(filename, function () {
  var P = 'tst_dm_' + Math.floor(Math.random() * 1e9).toString(16) + '_';

  function errorOf(fn) {
    try {
      fn();
    } catch (e) {
      return String(e.message || e);
    }
    return null;
  }

  beforeAll(function () {
    this.ctx = TestApi.createContext(filename);
    var ids = (this.ids = {
      student: P + 'student',
      outsider: P + 'outsider',
      faculty: P + 'faculty',
      otherFaculty: P + 'faculty2',
      alum: P + 'alum',
      post: P + 'post',
      alumPost: P + 'post_alum',
      secretPost: P + 'post_secret',
      replyStudent: P + 'reply_student',
      replyProf: P + 'reply_prof',
      replyElsewhere: P + 'reply_elsewhere',
    });
    var now = DateTime.now();
    TestApi.createBatchEntity(this.ctx, 'ForumMember', [
      { id: ids.student, name: 'Zelda Uniquestudent', email: 'zelda@purdue.edu', role: 'STUDENT', verified: true, department: 'Economics', tags: [], anonByDefault: true },
      { id: ids.outsider, name: 'Otto Outsider', email: 'otto2@purdue.edu', role: 'STUDENT', verified: true, department: 'Biology', tags: [], anonByDefault: true },
      { id: ids.faculty, name: 'Prof. Quentin Uniqueprof', email: 'quniq@purdue.edu', role: 'FACULTY',
        verified: true, department: 'Finance', tags: ['stock market'],
        anonByDefault: false },
      { id: ids.otherFaculty, name: 'Prof. Untagged', email: 'untagged@purdue.edu', role: 'FACULTY',
        verified: true, department: 'Physics', tags: [] },
      { id: ids.alum, name: 'Ava Uniquealum', email: 'ava@alumni.purdue.edu', role: 'ALUMNI', verified: true, department: 'Finance', employer: 'Google', tags: [] },
    ]);
    TestApi.createBatchEntity(this.ctx, 'Post', [
      { id: ids.post, author: { id: ids.student }, postType: 'QUESTION', title: 'DM test question', body: 'b',
        visibility: 'PUBLIC', space: 'EXPERTS', department: 'Finance', isAnonymous: true,
        createdAt: now },
      // Posted NON-anonymously on purpose: DMs must still never show the alum's name.
      { id: ids.alumPost, author: { id: ids.alum }, postType: 'QUESTION', title: 'Alum named question', body: 'b',
        visibility: 'PUBLIC', space: 'ALUMNI', isAnonymous: false, createdAt: now },
      { id: ids.secretPost, author: { id: ids.student }, postType: 'QUESTION', title: 'Experts-only DM question',
        body: 'b', visibility: 'EXPERTS_ONLY', space: 'EXPERTS', department: 'Finance', isAnonymous: true,
        createdAt: now },
    ]);
    TestApi.createBatchEntity(this.ctx, 'Reply', [
      { id: ids.replyStudent, post: { id: ids.post }, author: { id: ids.outsider }, body: 'A student reply',
        isAnonymous: true, createdAt: now },
      { id: ids.replyProf, post: { id: ids.post }, author: { id: ids.otherFaculty }, body: 'A professor reply',
        isAnonymous: true, createdAt: now },
      { id: ids.replyElsewhere, post: { id: ids.alumPost }, author: { id: ids.outsider }, body: 'Elsewhere',
        isAnonymous: true, createdAt: now },
    ]);
    TestApi.createBatchEntity(this.ctx, 'ExpertMatch', [
      { id: P + 'm1', post: { id: ids.post }, expert: { id: ids.faculty }, rank: 1, score: 90, reason: 'r' },
      { id: P + 'm2', post: { id: ids.alumPost }, expert: { id: ids.faculty }, rank: 1, score: 80, reason: 'r' },
      // A matched STUDENT expert still cannot start a DM.
      { id: P + 'm3', post: { id: ids.post }, expert: { id: ids.outsider }, rank: 2, score: 70, reason: 'r' },
      { id: P + 'm4', post: { id: ids.secretPost }, expert: { id: ids.faculty }, rank: 1, score: 90, reason: 'r' },
    ]);
    // Rows created through the API (not TestApi) are removed by filter.
    TestApi.addExternalTeardownFilter(this.ctx, "startsWith(sender.id, '" + P + "')", 'Message', 1000);
    TestApi.addExternalTeardownFilter(this.ctx, "startsWith(initiator.id, '" + P + "')", 'Conversation', 1000);

    this.conv = DmApi.startConversation(ids.faculty, ids.post, 'Hello from the Finance department');
  });

  afterAll(function () {
    TestApi.teardown(this.ctx);
  });

  it('rejects a student starting a conversation, even a matched one', function () {
    var err = errorOf(function () { DmApi.startConversation(this.ids.outsider, this.ids.post, 'hi'); }.bind(this));
    expect(err).toContain('Only professors can start private messages.');
    err = errorOf(function () { DmApi.startConversation(this.ids.student, this.ids.post, 'hi'); }.bind(this));
    expect(err).toContain('Only professors can start private messages.');
  });

  it('rejects an alum starting a conversation', function () {
    var err = errorOf(function () { DmApi.startConversation(this.ids.alum, this.ids.post, 'hi'); }.bind(this));
    expect(err).toContain('Only professors can start private messages.');
  });

  it('rejects an untagged professor on an experts-only question they cannot see', function () {
    var err = errorOf(function () { DmApi.startConversation(this.ids.otherFaculty, this.ids.secretPost, 'hi'); }.bind(this));
    expect(err).toContain('Post not found.');
  });

  it('rejects an empty message', function () {
    // The platform rejects a blank `!string` before our own check runs; either way it must fail.
    var err = errorOf(function () { DmApi.startConversation(this.ids.faculty, this.ids.post, '   '); }.bind(this));
    expect(err).toBeTruthy();
  });

  it('creates the conversation with the post author as recipient and reuses it', function () {
    expect(this.conv.id).toBeTruthy();
    expect(this.conv.postTitle).toBe('DM test question');
    var again = DmApi.startConversation(this.ids.faculty, this.ids.post, 'Follow-up');
    expect(again.id).toBe(this.conv.id);
    expect(Conversation.fetchCount({ filter: Filter.eq('initiator.id', this.ids.faculty).and().eq('post.id', this.ids.post) })).toBe(1);
    var studentList = DmApi.listConversations(this.ids.student);
    expect(studentList.length).toBe(1);
    expect(studentList[0].id).toBe(this.conv.id);
    expect(studentList[0].lastMessage).toBe('Follow-up');
  });

  it('lets the recipient reply and marks isMine per viewer', function () {
    var m = DmApi.sendMessage(this.ids.student, this.conv.id, 'Thank you!');
    expect(m.isMine).toBe(true);
    var profThread = DmApi.getConversation(this.ids.faculty, this.conv.id);
    var last = profThread[profThread.length - 1];
    expect(last.body).toBe('Thank you!');
    expect(last.isMine).toBe(false);
    expect(profThread[0].isMine).toBe(true);
  });

  it('blocks non-participants from reading, sending, or listing', function () {
    var ids = this.ids;
    var conv = this.conv;
    expect(errorOf(function () { DmApi.sendMessage(ids.outsider, conv.id, 'hey'); })).toContain('Conversation not found');
    expect(errorOf(function () { DmApi.getConversation(ids.outsider, conv.id); })).toContain('Conversation not found');
    expect(errorOf(function () { DmApi.sendMessage(ids.otherFaculty, conv.id, 'hey'); })).toContain('Conversation not found');
    expect(DmApi.listConversations(ids.outsider).length).toBe(0);
  });

  it("never shows the student's name to the professor", function () {
    var list = DmApi.listConversations(this.ids.faculty);
    var json = JSON.stringify(list.map(function (c) { return c.toJson(); }));
    expect(json).not.toContain('Zelda');
    expect(json).not.toContain('Uniquestudent');
    expect(json).not.toContain(this.ids.student);
    expect(json).not.toContain('CLUB_PRESIDENT');
    var mine = list.filter(function (c) { return c.id === this.conv.id; }.bind(this))[0];
    expect(mine.otherParty.isAnonymous).toBe(true);
    expect(mine.otherParty.memberId).toBeFalsy();
    expect(mine.otherParty.displayName).toMatch(/^Boiler [0-9a-f]{4}$/);
  });

  it("uses the same student handle as the thread (ForumApi.getPost)", function () {
    var detail = ForumApi.getPost(this.ids.faculty, this.ids.post);
    var list = DmApi.listConversations(this.ids.faculty);
    var mine = list.filter(function (c) { return c.id === this.conv.id; }.bind(this))[0];
    expect(mine.otherParty.displayName).toBe(detail.post.author.displayName);
  });

  it("never shows the professor's name to the student (always 'Purdue professor', Expert tag)", function () {
    var list = DmApi.listConversations(this.ids.student);
    var json = JSON.stringify(list.map(function (c) { return c.toJson(); }));
    expect(json).not.toContain('Quentin');
    expect(json).not.toContain('Uniqueprof');
    expect(json).not.toContain(this.ids.faculty);
    expect(json).not.toContain('PROFESSOR');
    expect(list[0].otherParty.displayName + '|' + list[0].otherParty.tag + '|' + list[0].otherParty.flair).toBe('Purdue professor|Expert|Finance');
    expect(list[0].otherParty.isAnonymous).toBe(true);
  });

  it('message views carry no sender identity', function () {
    var thread = DmApi.getConversation(this.ids.student, this.conv.id);
    var json = JSON.stringify(thread.map(function (m) { return m.toJson(); }));
    expect(json).not.toContain(this.ids.faculty);
    expect(json).not.toContain(this.ids.student);
  });

  it('refuses a DM to an alum asker (professors only message students)', function () {
    var err = errorOf(function () { DmApi.startConversation(this.ids.faculty, this.ids.alumPost, 'Hi alum'); }.bind(this));
    expect(err).toContain('only start private messages with students');
  });

  describe('starting from a reply in the thread, and ending', function () {
    beforeAll(function () {
      var ids = this.ids;
      // Professor clicks the handle of a student who REPLIED in the thread → DM.
      this.replyConv = DmApi.startConversation(ids.faculty, ids.post, 'About your reply', ids.replyStudent);
      this.threadReplyHandle = null;
      var self = this;
      ForumApi.getPost(ids.faculty, ids.post).replies.each(function (r) {
        if (r.id === ids.replyStudent) self.threadReplyHandle = r.author.displayName;
      });
      this.outsiderList = DmApi.listConversations(ids.outsider).mapToStr(function (c) { return c.id; });
      // Any professor who can see a public thread can start a DM (no tagging needed).
      this.anyProf = DmApi.startConversation(ids.otherFaculty, ids.post, 'Happy to help too');
      this.wrongPostErr = errorOf(function () { DmApi.startConversation(ids.faculty, ids.post, 'x', ids.replyElsewhere); });
      this.profReplyErr = errorOf(function () { DmApi.startConversation(ids.faculty, ids.post, 'x', ids.replyProf); });
      this.studentEndErr = errorOf(function () { DmApi.endConversation(ids.outsider, self.replyConv.id); });
      this.ended = DmApi.endConversation(ids.faculty, this.replyConv.id);
      this.studentSendErr = errorOf(function () { DmApi.sendMessage(ids.outsider, self.replyConv.id, 'one more'); });
      this.profSendErr = errorOf(function () { DmApi.sendMessage(ids.faculty, self.replyConv.id, 'one more'); });
      this.endedReadable = DmApi.getConversation(ids.outsider, this.replyConv.id).length;
      this.restarted = DmApi.startConversation(ids.faculty, ids.post, 'Starting fresh', ids.replyStudent);
    });

    it('messages the student who wrote the reply', function () {
      expect(this.outsiderList.contains(this.replyConv.id)).toBe(true);
    });

    it("shows that student by the same handle as their reply in the thread", function () {
      expect(this.replyConv.otherParty.displayName).toBe(this.threadReplyHandle);
    });

    it('lets any professor start a DM from a public thread', function () {
      expect(this.anyProf.id).toBeTruthy();
    });

    it('refuses a reply id from a different post', function () {
      expect(this.wrongPostErr).toContain('Reply not found on this post.');
    });

    it("refuses to DM a professor's reply", function () {
      expect(this.profReplyErr).toContain('only start private messages with students');
    });

    it('lets only the professor who started it end the conversation', function () {
      expect(this.studentEndErr).toContain('Only the professor who started this conversation can end it.');
    });

    it('marks the conversation ended', function () {
      expect(this.ended.ended + '|' + this.ended.canEnd).toBe('true|false');
    });

    it('blocks the student from sending after it ended', function () {
      expect(this.studentSendErr).toContain('This conversation has ended.');
    });

    it('blocks the professor from sending after it ended', function () {
      expect(this.profSendErr).toContain('This conversation has ended.');
    });

    it('keeps an ended conversation readable', function () {
      expect(this.endedReadable).toBeGreaterThan(0);
    });

    it('starts a new conversation instead of reopening an ended one', function () {
      expect(this.restarted.id).not.toBe(this.replyConv.id);
    });

    it('shows the professor an end option on an open conversation', function () {
      expect(this.restarted.canEnd).toBe(true);
    });
  });
});
