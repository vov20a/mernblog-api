const express = require('express');
const router = express.Router();
const currenciesController = require('../controllers/currenciesController');
const verifyJWT = require('../middlewares/verifyJWT');

router.route('/').get(currenciesController.getAllCurrencies);

router.route('/:id').get(currenciesController.getOneCurrencyById);

router.use(verifyJWT);

router
  .route('/')
  .post(currenciesController.createNewCurrency)
  .patch(currenciesController.updateCurrency)
  .delete(currenciesController.deleteCurrency);

router.route('/values').patch(currenciesController.updateCurrencyValues);

module.exports = router;
