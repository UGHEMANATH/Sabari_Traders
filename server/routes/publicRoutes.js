const express = require('express');
const { getPublicBrands, getPublicBranches } = require('../controllers/publicController');

const router = express.Router();

router.get('/brands', getPublicBrands);
router.get('/branches', getPublicBranches);

module.exports = router;
