/*
 * ExpertApi — Lane E. Read-only evidence for the profile page (see ExpertApi.c3typ).
 */

function profile(memberId) {
  var profiles = ExpertProfile.fetch({
    filter: Filter.eq('member.id', memberId),
    include: 'id, headline, sourceUrls, emailSource, isDemoAccount, harvestedAt',
    limit: 1,
  }).objs;
  if (!profiles || !profiles.length) return null;
  var p = profiles[0];

  var items = ExpertExperienceView.arrayBuilder();
  var rows = ExpertExperience.fetch({
    filter: Filter.eq('profile.id', p.id),
    include: 'kind, title, organization, year, url, rank',
    order: 'rank',
    limit: 20,
  }).objs;
  if (rows) {
    rows.each(function (x) {
      items.add(ExpertExperienceView.make({
        kind: x.kind ? String(x.kind) : null,
        title: x.title,
        organization: x.organization,
        year: x.year,
        url: x.url,
      }));
    });
  }
  return ExpertProfileView.make({
    memberId: memberId,
    headline: p.headline,
    sourceUrls: p.sourceUrls || [],
    emailSource: p.emailSource,
    isDemoAccount: !!p.isDemoAccount,
    harvestedAt: p.harvestedAt,
    experiences: items.build(),
  });
}
