const express = require('express');
const router  = express.Router();
const { getProfile, updateProfile, changePassword, deleteAccount } = require('../controllers/userController');

router.get('/profile',  getProfile);
router.put('/profile',  updateProfile);
router.put('/password', changePassword);
router.delete('/account', deleteAccount);

module.exports = router;
