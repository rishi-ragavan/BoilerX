/*
 * DmApi — Lane D owns this file.
 *
 * STEP 0 STUB: returns hard-coded sample data of the right view types so the UI can be built. Only the
 * DM_INITIATOR_ROLES rule is real. Lane D replaces the bodies with Conversation / Message persistence
 * (reading ForumMember / Post / ExpertMatch directly on the server is fine). Signatures are frozen.
 */

var DM_INITIATOR_ROLES = ['FACULTY'];

function sampleOtherParty() {
  return AuthorView.make({
    displayName: 'Boiler #a3f1',
    roleLabel: 'Verified Student',
    badges: [],
    isAnonymous: true,
    flair: null,
    memberId: null,
  });
}

function listConversations(actorId) {
  var b = ConversationView.arrayBuilder();
  b.add(
    ConversationView.make({
      id: 'sample_conversation_1',
      otherParty: sampleOtherParty(),
      postTitle: 'How do I get into stock market research as an undergrad?',
      lastMessage: 'Happy to point you to a few lab openings this semester.',
      createdAt: DateTime.now().minusHours(3),
    })
  );
  return b.build();
}

function getConversation(actorId, conversationId) {
  var b = MessageView.arrayBuilder();
  b.add(
    MessageView.make({
      id: 'sample_message_1',
      body: 'Happy to point you to a few lab openings this semester.',
      createdAt: DateTime.now().minusHours(3),
      isMine: false,
    })
  );
  b.add(
    MessageView.make({
      id: 'sample_message_2',
      body: 'Thank you so much! Which ones would you recommend?',
      createdAt: DateTime.now().minusHours(2),
      isMine: true,
    })
  );
  return b.build();
}

function startConversation(actorId, postId, body) {
  var actor = ForumMember.fetch({ filter: Filter.eq('id', actorId), include: 'id, role', limit: 1 }).objs;
  if (!actor || !actor.length) throw new Error('Unknown member: ' + actorId);
  if (DM_INITIATOR_ROLES.indexOf(String(actor[0].role)) < 0) {
    throw new Error('Only faculty can start a private conversation.');
  }
  return ConversationView.make({
    id: 'sample_conversation_new',
    otherParty: sampleOtherParty(),
    postTitle: 'Sample post ' + postId,
    lastMessage: body,
    createdAt: DateTime.now(),
  });
}

function sendMessage(actorId, conversationId, body) {
  return MessageView.make({ id: 'sample_message_new', body: body, createdAt: DateTime.now(), isMine: true });
}
