/*
 * Verify — Purdue email verification rules (Lane A).
 */

function check(email, role) {
  var e = String(email || '').trim().toLowerCase();
  var r = String(role || '').toUpperCase();

  if (/@alumni\.purdue\.edu$/.test(e)) {
    return VerifyResult.make({ verified: true, role: 'ALUMNI', label: 'Verified alum' });
  }
  if (/@purdue\.edu$/.test(e) && (r === 'STUDENT' || r === 'FACULTY')) {
    return VerifyResult.make({
      verified: true,
      role: r,
      label: r === 'FACULTY' ? 'Verified faculty' : 'Verified student',
    });
  }
  if (r === 'ALUMNI') {
    return VerifyResult.make({ verified: false, role: 'ALUMNI', label: 'Unverified alum' });
  }
  return VerifyResult.make({ verified: false, role: r || null, label: 'Not a Purdue email' });
}
