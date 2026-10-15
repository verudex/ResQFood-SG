const express = require('express');
const { queryManualRAG } = require('../controllers/ragController');

const router = express.Router();

router.post('/ask', queryManualRAG);

module.exports = router;
