/*
 * Rank — feed ranking (Lane A).
 */

function hotScore(replies, expertReplies, hoursSincePost) {
  var h = Math.max(0, hoursSincePost || 0);
  return ((replies || 0) + 2 * (expertReplies || 0) + 1) / Math.pow(h + 2, 1.5);
}
