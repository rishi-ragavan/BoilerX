// Data Fusion: one evidence row (paper, position, award, venture, course, degree) → ExpertExperience (Lane E).
data = {
  name: 'SourceExpertExperience-ExpertExperience',
  source: 'SourceExpertExperience',
  target: 'ExpertExperience',
  projection: {
    id: experienceId,
    profile: { id: profileId },
    kind: experienceKind,
    title: title,
    organization: organization,
    year: year,
    url: url,
    rank: displayRank,
  },
};
