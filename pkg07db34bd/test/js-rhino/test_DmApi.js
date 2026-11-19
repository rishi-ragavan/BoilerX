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
    ]);
    TestApi.createBatchEntity(this.ctx, 'ExpertMatch', [
      { id: P + 'm1', post: { id: ids.post }, expert: { id: ids.faculty }, rank: 1, score: 90, reason: 'r' },
      { id: P + 'm2', post: { id: ids.alumPost }, expert: { id: ids.faculty }, rank: 1, score: 80, reason: 'r' },
      // A matched STUDENT expert still cannot start a DM.
      { id: P + 'm3', post: { id: ids.post }, expert: { id: ids.outsider }, rank: 2, score: 70, reason: 'r' },
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

  it('rejects a professor who was not tagged on the post', function () {
    var err = errorOf(function () { DmApi.startConversation(this.ids.otherFaculty, this.ids.post, 'hi'); }.bind(this));
    expect(err).toContain('tagged');
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

  it('shows an alum asker as "Purdue alum" (Alumni tag) even if they posted under their name', function () {
    var conv = DmApi.startConversation(this.ids.faculty, this.ids.alumPost, 'Hi alum');
    var json = JSON.stringify(conv.toJson());
    expect(json).not.toContain('Ava');
    expect(conv.otherParty.displayName + '|' + conv.otherParty.tag).toBe('Purdue alum|Alumni');
    expect(conv.otherParty.memberId).toBeFalsy();
  });
});
