// Data Fusion: one researched expert row → the BoilerConnect account (Lane E). `tags` arrives `;`-separated.
data = {
  name: 'SourceExpertProfile-ForumMember',
  source: 'SourceExpertProfile',
  target: 'ForumMember',
  transformer: function (srcObj) {
    var tags = String(srcObj.tags || '')
      .split(';')
      .map(function (t) { return t.trim(); })
      .filter(function (t) { return t.length > 0; });
    return [
      ForumMember.make({
        id: srcObj.memberId,
        name: srcObj.displayName,
        email: srcObj.email,
        role: srcObj.memberRole,
        verified: true,
        department: srcObj.department || null,
        employer: srcObj.employer || null,
        bio: srcObj.bio,
        tags: tags,
        anonByDefault: false,
      }),
    ];
  },
};
