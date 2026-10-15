const express = require('express');
const { parseDonation } = require('../controllers/donationController');

const router = express.Router();

router.post('/parse', parseDonation);

module.exports = router;
