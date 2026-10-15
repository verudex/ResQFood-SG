const express = require('express');
const { mockSingpassLogin } = require('../controllers/authController');

const router = express.Router();

router.post('/mock-singpass', mockSingpassLogin);

module.exports = router;
