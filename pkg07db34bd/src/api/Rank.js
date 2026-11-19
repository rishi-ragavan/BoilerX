/*
 * Rank — feed ranking + level proximity (Lane A).
 */

var LEVEL_ORDER = { UG: 0, MS: 1, PHD: 2, FACULTY: 3, ALUMNI: 3 };

function hotScore(replies, expertReplies, hoursSincePost) {
  var h = Math.max(0, hoursSincePost || 0);
  return ((replies || 0) + 2 * (expertReplies || 0) + 1) / Math.pow(h + 2, 1.5);
}

function levelProximity(askerLevel, expertLevel) {
  var a = LEVEL_ORDER[String(askerLevel || 'UG').toUpperCase()];
  var b = LEVEL_ORDER[String(expertLevel || 'UG').toUpperCase()];
  if (a === undefined || b === undefined) return 0;
  // An expert should be at or above the asker; one or two steps up is ideal (UG → MS/PhD).
  var d = b - a;
  if (d === 1 || d === 2) return 1;
  if (d === 0 || d === 3) return 0.5;
  return 0;
}
