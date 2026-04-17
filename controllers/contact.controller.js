/**
 * Contact Controller
 *
 * POST /api/contact
 * Accepts collaboration / idea submissions from the landing page.
 * Submissions are logged to the console and can be forwarded to an email
 * address by setting CONTACT_EMAIL in .env (wire up nodemailer / SendGrid
 * there when ready — this controller intentionally keeps no hard dependency
 * on any mail library so the server starts without one configured).
 */

const VALID_TYPES = ['collaboration', 'idea', 'other'];

const submit = async (req, res) => {
  const { name, email, type, message } = req.body ?? {};

  // ── Validation ──────────────────────────────────────────────────────────
  const errors = [];
  if (!name    || typeof name    !== 'string' || !name.trim())    errors.push('name is required');
  if (!email   || typeof email   !== 'string' || !email.trim())   errors.push('email is required');
  if (!type    || !VALID_TYPES.includes(type))                    errors.push(`type must be one of: ${VALID_TYPES.join(', ')}`);
  if (!message || typeof message !== 'string' || !message.trim()) errors.push('message is required');

  // Basic email format check
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    errors.push('email format is invalid');
  }

  // Length guards
  if (name    && name.trim().length    > 120)  errors.push('name must be under 120 characters');
  if (message && message.trim().length > 2000)  errors.push('message must be under 2000 characters');

  if (errors.length) {
    return res.status(400).json({ error: 'Validation failed', details: errors });
  }

  const submission = {
    name:      name.trim(),
    email:     email.trim().toLowerCase(),
    type,
    message:   message.trim(),
    submittedAt: new Date().toISOString(),
    ip: req.ip,
  };

  // ── Log ─────────────────────────────────────────────────────────────────
  console.log('[Contact] New submission:');
  console.log(`  From   : ${submission.name} <${submission.email}>`);
  console.log(`  Type   : ${submission.type}`);
  console.log(`  Message: ${submission.message.slice(0, 120)}${submission.message.length > 120 ? '…' : ''}`);
  console.log(`  At     : ${submission.submittedAt}`);

  // ── Email forwarding (configure CONTACT_EMAIL in .env to enable) ────────
  // TODO: wire up nodemailer / SendGrid here when ready.
  // Example:
  //   if (process.env.CONTACT_EMAIL) {
  //     await mailer.send({ to: process.env.CONTACT_EMAIL, subject: `[BooneTunes] ${type}`, ... });
  //   }

  return res.status(200).json({ message: 'Received — thanks for reaching out!' });
};

module.exports = { submit };
