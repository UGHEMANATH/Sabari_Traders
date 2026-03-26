const express = require('express');
const { getBrands, createBrand, updateBrand } = require('../controllers/brandController');
const { isAuthenticated, isOwner } = require('../middleware/auth');

const router = express.Router();

router.use(isAuthenticated);

router.route('/')
    .get(getBrands)
    .post(isOwner, createBrand);

router.route('/:id')
    .put(isOwner, updateBrand);

module.exports = router;
