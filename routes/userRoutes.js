const express = require('express');
const router = express.Router();
const usersController = require('../controllers/usersController');
const verifyJWT = require('../middlewares/verifyJWT');

router.use(verifyJWT);

router.route('/all').get(usersController.getAllUsers);
router.route('/password').patch(usersController.updateUserPassword);
router.route('/avatar').patch(usersController.updateUserAvatar);

router
  .route('/')
  .get(usersController.getUsers)
  .post(usersController.createNewUser)
  .patch(usersController.updateUser)
  .delete(usersController.deleteUser);

module.exports = router;
