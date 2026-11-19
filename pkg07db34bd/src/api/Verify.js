/*
 * Verify — Purdue email verification rules (Lane A).
 */

function check(email, role) {
  var e = String(email || '').trim().toLowerCase();
  var r = String(role || '').toUpperCase();

  if (/@alumni\.purdue\.edu$/.test(e)) {
    return VerifyResult.make({ verified: true, role: 'ALUMNI', label: 'Purdue alum' });
  }
  if (/@purdue\.edu$/.test(e) && (r === 'STUDENT' || r === 'FACULTY')) {
    return VerifyResult.make({
      verified: true,
      role: r,
      label: r === 'FACULTY' ? 'Purdue faculty' : 'Purdue student',
    });
  }
  if (r === 'ALUMNI') {
    return VerifyResult.make({ verified: false, role: 'ALUMNI', label: 'Alumni must sign up with an @alumni.purdue.edu email' });
  }
  return VerifyResult.make({ verified: false, role: r || null, label: 'Sign up with your @purdue.edu email' });
}
