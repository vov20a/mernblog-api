const Currency = require('../models/Currency');
const Category = require('../models/Currency');

// @desc Get all Currencies
// @route GET /currencies
// @access Private
const getAllCurrencies = async (req, res) => {
  // Get all currencies from MongoDB
  const currencies = await Currency.find().lean();

  // If no currencies
  if (!currencies?.length) {
    return res.status(400).json({ message: 'No currencies found' });
  }
  res.status(200).json(currencies);
};

// @desc Get one Currency
// @route GET /currencies/:id
// @access Public
const getOneCurrencyById = async (req, res) => {
  const { id } = req.params;
  // Confirm data
  if (!id) {
    return res.status(400).json({ message: 'ID field is required' });
  }
  const currency = await Currency.findById(id).lean();
  // If no currency
  if (!currency) {
    return res.status(400).json({ message: 'No currency found' });
  }
  res.status(200).json(currency);
};

// @desc Create new Currency
// @route POST /currencies
// @access Private
const createNewCurrency = async (req, res) => {
  // Create and store new currency-only 'Manager' or 'Admin'
  if (!req.roles.includes('Manager') || !req.roles.includes('Admin')) {
    return res.status(403).json({ message: 'No access' });
  }
  const { title, code, value, base } = req.body;
  // Confirm data
  if (!title || !code || !value) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  // Check for duplicate currency
  const duplicate = await Currency.findOne({ title })
    .collation({ locale: 'en', strength: 2 })
    .lean()
    .exec();
  if (duplicate) {
    return res.status(409).json({ message: 'Duplicate currency' });
  }
  // Check for duplicate code
  const duplicateCode = await Currency.findOne({ code }).lean().exec();
  if (duplicateCode) {
    return res.status(409).json({ message: 'Duplicate code currency' });
  }

  if (base === true) {
    const duplicateBase = await Currency.findOne({ base }).lean().exec();
    if (duplicateBase) {
      return res.status(409).json({ message: 'Duplicate base===true currency' });
    }
  }

  const currencyObject = base ? { title, code, value, base } : { title, code, value };

  const currency = await Category.create(currencyObject);
  if (currency) {
    //created
    res.status(201).json({ message: `New currency ${title}  created` });
  } else {
    res.status(400).json({ message: 'Invalid currency data received' });
  }
};

// @desc Update a currency
// @route PATCH /currencies
// @access Private
const updateCurrency = async (req, res) => {
  // Update product-only 'Manager' or 'Admin'
  if (!req.roles.includes('Manager') || !req.roles.includes('Admin')) {
    return res.status(403).json({ message: 'No access' });
  }
  const { id, title, code, value, base } = req.body;
  // console.log(id, code, title, value, base);

  // Confirm data
  if (!id || !title || !code || !value || base === undefined) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  // Does the currency exist to update?
  const currency = await Currency.findById(id).exec();
  if (!currency) {
    return res.status(400).json({ message: 'Currency not found' });
  }
  // Check for duplicate title
  const duplicate = await Category.findOne({ title })
    .collation({ locale: 'en', strength: 2 })
    .lean()
    .exec();
  // Allow updates to the original category
  if (duplicate && duplicate?._id.toString() !== id) {
    return res.status(409).json({ message: 'Duplicate title' });
  }
  // Check for duplicate code
  const duplicateCode = await Currency.findOne({ code }).lean().exec();
  if (duplicateCode && duplicateCode?._id.toString() !== id) {
    return res.status(409).json({ message: 'Duplicate code currency' });
  }

  if (base === true) {
    const duplicateBase = await Currency.findOne({ base }).lean().exec();
    if (duplicateBase && duplicateBase?._id.toString() !== id) {
      return res.status(409).json({ message: 'Duplicate base===true currency' });
    }
  }

  currency.title = title;
  currency.code = code;
  currency.value = value;
  currency.base = base;
  const updatedCurrency = await currency.save();
  res.json({ message: `${updatedCurrency.title}  updated` });
};

// @desc Update a value of currency
// @route PATCH /currencies/values
// @access Public
const updateCurrencyValues = async (req, res) => {
  // Update product-only 'Manager' or 'Admin'
  // if (!req.roles.includes('Manager') || !req.roles.includes('Admin')) {
  //   return res.status(403).json({ message: 'No access' });
  // }
  const { values } = req.body;

  // Confirm data
  if (!Array.isArray(values)) {
    return res.status(400).json({ message: 'Values is required and array' });
  }

  values.forEach(async function (item) {
    // Does the currency exist to update?
    const currency = await Currency.findOne({ title: item[0] }).exec();
    if (!currency) {
      return res.status(400).json({ message: 'Currency not found' });
    }

    currency.value = item[1];
    await currency.save();
  });

  res.json({ message: `Currency values  updated` });
};

// @desc Delete a Currency
// @route DELETE /currencies
// @access Private
const deleteCurrency = async (req, res) => {
  // Delete product-only 'Manager' or 'Admin'
  if (!req.roles.includes('Manager') || !req.roles.includes('Admin')) {
    return res.status(403).json({ message: 'No access' });
  }

  const { id } = req.body;
  // Confirm data
  if (!id) {
    return res.status(400).json({ message: 'Currency ID Required' });
  }

  // Does the Currency exist to delete?
  const currency = await Currency.findById(id).exec();
  if (!currency) {
    return res.status(400).json({ message: 'Currency not found' });
  }
  //Does the Currency has base=true?-not delete?
  if (currency.base) {
    return res.status(400).json({ message: `${currency.title} is the base Currency` });
  }

  const result = await currency.deleteOne();

  const reply = `Currency ${result.title} deleted`;

  res.json(reply);
};

module.exports = {
  getAllCurrencies,
  getOneCurrencyById,
  createNewCurrency,
  updateCurrency,
  updateCurrencyValues,
  deleteCurrency,
};
