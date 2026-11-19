/*
 * DmApi — BoilerConnect private messages (Lane D).
 *
 * Rules (§1.4 + lead "Product rules"):
 *  - Only roles in DM_INITIATOR_ROLES (FACULTY) can START a conversation, from a thread they can see, and only with
 *    a STUDENT: the question's asker or the author of one of its replies (the professor clicks the handle → DM).
 *    Students and alumni can never start one.
 *  - Either participant can reply inside an open conversation; nobody else can read or write it.
 *  - Only the professor who started it can END it (endedAt); an ended conversation is read-only and is never
 *    reopened — starting again creates a new conversation.
 *  - Anonymity — product rule: no real names ever reach the frontend. BOTH sides are anonymous in every view:
 *      · a student asker is "Boiler xxxx" (FNV-1a(memberId + postId), the same handle ForumApi shows on that
 *        thread); an alum asker is "Alum · {employer}";
 *      · the professor is always "Purdue professor" (Expert tag + department), never their name.
 *    AuthorView.memberId is null for every anonymous party. MessageView carries no sender.
 */

var DM_INITIATOR_ROLES = ['FACULTY'];
var MAX_BODY = 2000;
var MAX_CONVERSATIONS = 200;
var MAX_MESSAGES = 1000;

// Names are never loaded here: nothing in a DM view may carry one.
var MEMBER_FIELDS = 'id, role, department, employer';
var CONVERSATION_FIELDS =
  'id, createdAt, endedAt, post.id, post.title, ' +
  'initiator.id, initiator.role, initiator.department, initiator.employer, ' +
  'recipient.id, recipient.role, recipient.department, recipient.employer';

// ---------------------------------------------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------------------------------------------

function str(v) {
  return v === null || v === undefined ? null : String(v);
}

/** 32-bit FNV-1a → hex. Must stay identical to ForumApi.shortHash so DM handles match the thread's handles. */
function shortHash(s) {
  var h = 0x811c9dc5;
  for (var i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = ((h << 24) + h * 0x193) >>> 0;
  }
  return ('00000000' + h.toString(16)).slice(-8);
}

function anonStudentHandle(memberId, scopeId) {
  return 'Boiler ' + shortHash(String(memberId) + String(scopeId)).substring(0, 4);
}

function anonymousParty(displayName, tag, flair) {
  return AuthorView.make({
    displayName: displayName,
    tag: tag || null,
    flair: flair || null,
    isAnonymous: true,
    memberId: null,
  });
}

/** The professor (initiator) as the asker sees them: "Purdue professor" with the Expert tag and their department. */
function expertParty(member) {
  return anonymousParty('Purdue professor', 'Expert', member.department || null);
}

/** The asker (recipient) as the professor sees them: always anonymous, matching their handle on the post. */
function askerParty(member, conv) {
  var role = str(member.role);
  var postId = conv.post && conv.post.id ? conv.post.id : conv.id;
  if (role === 'STUDENT') return anonymousParty(anonStudentHandle(member.id, postId), null, null);
  if (role === 'ALUMNI') return anonymousParty('Purdue alum', 'Alumni', null);
  return expertParty(member);
}

function otherPartyFor(conv, actorId) {
  return conv.initiator.id === actorId ? askerParty(conv.recipient, conv) : expertParty(conv.initiator);
}

function requireMember(id) {
  if (!id) throw new Error('actorId is required');
  var res = ForumMember.fetch({ filter: Filter.eq('id', id), include: MEMBER_FIELDS, limit: 1 });
  if (!res.objs || !res.objs.length) throw new Error('Unknown member: ' + id);
  return res.objs[0];
}

function cleanBody(body) {
  var b = body === null || body === undefined ? '' : String(body).trim();
  if (!b) throw new Error('Message cannot be empty.');
  if (b.length > MAX_BODY) throw new Error('Message is too long (max ' + MAX_BODY + ' characters).');
  return b;
}

function loadConversation(conversationId) {
  var res = Conversation.fetch({ filter: Filter.eq('id', conversationId), include: CONVERSATION_FIELDS, limit: 1 });
  return res.objs && res.objs.length ? res.objs[0] : null;
}

function isParticipant(conv, actorId) {
  return conv.initiator.id === actorId || conv.recipient.id === actorId;
}

/** Loads a conversation the actor participates in; same error for "missing" and "not yours" (no probing). */
function requireOwnConversation(conversationId, actorId) {
  var conv = conversationId ? loadConversation(conversationId) : null;
  if (!conv || !isParticipant(conv, actorId)) throw new Error('Conversation not found.');
  return conv;
}

function conversationView(conv, actorId, lastMessage, lastAt) {
  var ended = !!conv.endedAt;
  return ConversationView.make({
    id: conv.id,
    otherParty: otherPartyFor(conv, actorId),
    postTitle: conv.post && conv.post.title ? conv.post.title : null,
    lastMessage: lastMessage || null,
    createdAt: lastAt || conv.createdAt || null,
    ended: ended,
    endedAt: conv.endedAt || null,
    canEnd: !ended && conv.initiator.id === actorId,
  });
}

function requireOpen(conv) {
  if (conv.endedAt) throw new Error('This conversation has ended.');
}

function latestMessage(conversationId) {
  var res = Message.fetch({
    filter: Filter.eq('conversation.id', conversationId),
    include: 'id, body, createdAt',
    order: 'descending(createdAt)',
    limit: 1,
  }).objs;
  return res && res.length ? res[0] : null;
}

function messageView(msg, actorId) {
  return MessageView.make({
    id: msg.id,
    body: msg.body,
    createdAt: msg.createdAt,
    isMine: !!(msg.sender && msg.sender.id === actorId),
  });
}

function strArray(values) {
  var b = ArrayType.ofStr().makeBuilder();
  values.forEach(function (v) { b.add(v); });
  return b.build();
}

/**
 * Datetimes are persisted at 1-second precision, so two messages sent within a second would tie. Keep each
 * conversation strictly ordered by stamping a new message at least 1s after the conversation's latest one.
 */
function nextMessageTime(conversationId) {
  var now = DateTime.now();
  var last = Message.fetch({
    filter: Filter.eq('conversation.id', conversationId),
    include: 'createdAt',
    order: 'descending(createdAt)',
    limit: 1,
  }).objs;
  if (last && last.length && last[0].createdAt) {
    var lastAt = last[0].createdAt;
    if (new Date(String(now)).getTime() <= new Date(String(lastAt)).getTime()) return lastAt.plusSeconds(1);
  }
  return now;
}

function createMessage(conversationId, senderId, body) {
  return Message.make({
    conversation: { id: conversationId },
    sender: { id: senderId },
    body: body,
    createdAt: nextMessageTime(conversationId),
  }).create();
}

// ---------------------------------------------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------------------------------------------

function listConversations(actorId) {
  requireMember(actorId);
  var res = Conversation.fetch({
    filter: Filter.eq('initiator.id', actorId).or().eq('recipient.id', actorId),
    include: CONVERSATION_FIELDS,
    limit: MAX_CONVERSATIONS,
  });
  var convs = res.objs || [];
  var b = ConversationView.arrayBuilder();
  if (!convs.length) return b.build();

  // Latest message per conversation (messages newest first).
  var ids = [];
  for (var i = 0; i < convs.length; i++) ids.push(convs[i].id);
  var msgs = Message.fetch({
    filter: Filter.intersects('conversation.id', strArray(ids)),
    include: 'id, body, createdAt, conversation.id',
    order: 'descending(createdAt)',
    limit: MAX_MESSAGES,
  }).objs || [];
  var latest = {};
  for (var j = 0; j < msgs.length; j++) {
    var m = msgs[j];
    var cid = m.conversation && m.conversation.id;
    if (cid && !latest[cid]) latest[cid] = m;
  }

  var rows = [];
  for (var k = 0; k < convs.length; k++) {
    var c = convs[k];
    var last = latest[c.id];
    var at = last ? last.createdAt : c.createdAt;
    rows.push({ conv: c, last: last, at: at, ts: at ? new Date(String(at)).getTime() : 0 });
  }
  rows.sort(function (a, z) { return z.ts - a.ts; });
  rows.forEach(function (r) {
    b.add(conversationView(r.conv, actorId, r.last ? r.last.body : null, r.at));
  });
  return b.build();
}

function getConversation(actorId, conversationId) {
  requireMember(actorId);
  requireOwnConversation(conversationId, actorId);
  var msgs = Message.fetch({
    filter: Filter.eq('conversation.id', conversationId),
    include: 'id, body, createdAt, sender.id',
    order: 'ascending(createdAt)',
    limit: MAX_MESSAGES,
  }).objs || [];
  var b = MessageView.arrayBuilder();
  for (var i = 0; i < msgs.length; i++) b.add(messageView(msgs[i], actorId));
  return b.build();
}

function startConversation(actorId, postId, body, replyId) {
  var actor = requireMember(actorId);
  if (DM_INITIATOR_ROLES.indexOf(str(actor.role)) < 0) {
    throw new Error('Only professors can start private messages.');
  }
  var text = cleanBody(body);

  var posts = Post.fetch({ filter: Filter.eq('id', postId), include: 'id, title, visibility, author.id', limit: 1 }).objs;
  if (!posts || !posts.length) throw new Error('Post not found.');
  var post = posts[0];

  // The professor must be able to see the thread: an experts-only question is visible only to the tagged.
  if (str(post.visibility) === 'EXPERTS_ONLY') {
    var tagged = ExpertMatch.fetchCount({ filter: Filter.eq('post.id', postId).and().eq('expert.id', actorId) });
    if (!tagged) throw new Error('Post not found.');
  }

  // The student: the author of the clicked reply (on this post), else the asker.
  var recipientId;
  if (replyId) {
    var replies = Reply.fetch({ filter: Filter.eq('id', replyId), include: 'id, post.id, author.id', limit: 1 }).objs;
    if (!replies || !replies.length || !replies[0].post || replies[0].post.id !== postId) {
      throw new Error('Reply not found on this post.');
    }
    recipientId = replies[0].author && replies[0].author.id;
  } else {
    recipientId = post.author && post.author.id;
  }
  if (!recipientId) throw new Error('There is no one to message here.');
  if (recipientId === actorId) throw new Error('You cannot message yourself.');
  var recipient = requireMember(recipientId);
  if (str(recipient.role) !== 'STUDENT') throw new Error('Professors can only start private messages with students.');

  // Continue the open (initiator, recipient, post) conversation if there is one; never reopen an ended one.
  var convId = null;
  var mine = Conversation.fetch({
    filter: Filter.eq('initiator.id', actorId).and().eq('recipient.id', recipientId).and().eq('post.id', postId),
    include: 'id, endedAt',
    limit: 50,
  }).objs;
  if (mine) mine.each(function (c) { if (!convId && !c.endedAt) convId = c.id; });
  if (!convId) {
    convId = Conversation.make({
      post: { id: postId },
      initiator: { id: actorId },
      recipient: { id: recipientId },
      createdAt: DateTime.now(),
    }).create().id;
  }
  var msg = createMessage(convId, actorId, text);
  return conversationView(loadConversation(convId), actorId, text, msg.createdAt || DateTime.now());
}

function sendMessage(actorId, conversationId, body) {
  requireMember(actorId);
  var conv = requireOwnConversation(conversationId, actorId);
  requireOpen(conv);
  var text = cleanBody(body);
  var msg = createMessage(conversationId, actorId, text);
  return MessageView.make({ id: msg.id, body: text, createdAt: msg.createdAt || DateTime.now(), isMine: true });
}

function endConversation(actorId, conversationId) {
  requireMember(actorId);
  var conv = requireOwnConversation(conversationId, actorId);
  if (conv.initiator.id !== actorId) throw new Error('Only the professor who started this conversation can end it.');
  if (!conv.endedAt) {
    Conversation.make({ id: conv.id, endedAt: DateTime.now() }).merge();
    conv = loadConversation(conv.id);
  }
  var last = latestMessage(conv.id);
  return conversationView(conv, actorId, last ? last.body : null, last ? last.createdAt : conv.createdAt);
}
