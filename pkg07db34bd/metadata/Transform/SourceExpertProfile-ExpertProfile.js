// Data Fusion: one researched expert row → its public-record evidence record (Lane E).
data = {
  name: 'SourceExpertProfile-ExpertProfile',
  source: 'SourceExpertProfile',
  target: 'ExpertProfile',
  transformer: function (srcObj) {
    var urls = String(srcObj.sourceUrls || '')
      .split(/\s+/)
      .filter(function (u) { return u.length > 0; });
    return [
      ExpertProfile.make({
        id: srcObj.profileId,
        member: { id: srcObj.memberId },
        lead: srcObj.leadId ? { id: srcObj.leadId } : null,
        headline: srcObj.headline,
        sourceUrls: urls,
        openAlexId: srcObj.openAlexId || null,
        emailSource: srcObj.emailSource,
        isDemoAccount: true,
        harvestedAt: srcObj.harvestedAt ? DateTime.fromString(srcObj.harvestedAt) : DateTime.now(),
      }),
    ];
  },
};
