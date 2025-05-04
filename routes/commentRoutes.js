const express = require('express');
const router = express.Router();
const commentsController = require('../controllers/commentsController');
const verifyJWT = require('../middlewares/verifyJWT');

router.use(verifyJWT);
router.route('/all').get(commentsController.getAllComments);
router.route('/like/:id').patch(commentsController.updateLikeComments);

router
  .route('/')
  .get(commentsController.getComments)
  .post(commentsController.createNewComment)
  .patch(commentsController.updateComment)
  .delete(commentsController.deleteComment);

module.exports = router;
