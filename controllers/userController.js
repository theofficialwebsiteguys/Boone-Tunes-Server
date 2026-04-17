const bcrypt = require('bcryptjs');
const { User } = require('../models');

const SALT_ROUNDS = 12;

/**
 * GET /api/users/profile
 * Returns the full profile for the authenticated user.
 */
const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ['id', 'email', 'displayName', 'spotifyId', 'googleId', 'passwordHash', 'createdAt'],
    });
    if (!user) return res.status(404).json({ error: 'User not found.' });

    res.json({
      id:               user.id,
      email:            user.email,
      displayName:      user.displayName,
      hasPassword:      !!user.passwordHash,
      spotifyConnected: !!user.spotifyId,
      googleConnected:  !!user.googleId,
      createdAt:        user.createdAt,
    });
  } catch (err) {
    console.error('[Users] getProfile error:', err.message);
    res.status(500).json({ error: 'Failed to fetch profile.' });
  }
};

/**
 * PUT /api/users/profile
 * Body: { displayName? }
 */
const updateProfile = async (req, res) => {
  const { displayName } = req.body;

  if (displayName !== undefined && typeof displayName !== 'string') {
    return res.status(400).json({ error: 'Display name must be a string.' });
  }

  const trimmed = typeof displayName === 'string' ? displayName.trim() : undefined;
  if (trimmed !== undefined && trimmed.length > 60) {
    return res.status(400).json({ error: 'Display name must be 60 characters or fewer.' });
  }

  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    await user.update({ displayName: trimmed || null });

    res.json({
      id:          user.id,
      email:       user.email,
      displayName: user.displayName,
      createdAt:   user.createdAt,
    });
  } catch (err) {
    console.error('[Users] updateProfile error:', err.message);
    res.status(500).json({ error: 'Failed to update profile.' });
  }
};

/**
 * PUT /api/users/password
 * Body: { currentPassword, newPassword }
 */
const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required.' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters.' });
  }

  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    if (!user.passwordHash) {
      return res.status(400).json({ error: 'This account uses social login and does not have a password.' });
    }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await user.update({ passwordHash });

    res.json({ message: 'Password updated successfully.' });
  } catch (err) {
    console.error('[Users] changePassword error:', err.message);
    res.status(500).json({ error: 'Failed to change password.' });
  }
};

/**
 * DELETE /api/users/account
 * Body: { password? } — required only if the account has a password hash.
 */
const deleteAccount = async (req, res) => {
  const { password } = req.body ?? {};

  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found.' });

    if (user.passwordHash) {
      if (!password) {
        return res.status(400).json({ error: 'Your password is required to delete your account.' });
      }
      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: 'Incorrect password.' });
      }
    }

    await user.destroy();
    res.json({ message: 'Account deleted.' });
  } catch (err) {
    console.error('[Users] deleteAccount error:', err.message);
    res.status(500).json({ error: 'Failed to delete account.' });
  }
};

module.exports = { getProfile, updateProfile, changePassword, deleteAccount };
