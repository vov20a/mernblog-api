const express = require('express');
const router = express.Router();
const postsController = require('../controllers/postsController');
const verifyJWT = require('../middlewares/verifyJWT');

router.route('/all').get(postsController.getAllPosts);
router.route('/').get(postsController.getPosts);

router.use(verifyJWT);

router.route('/users').get(postsController.getPostsByPopularUsers);
router.route('/tags').get(postsController.getTagsOfPosts);
router.route('/:param').get(postsController.getPostsByParam);
router.route('/single/:param').get(postsController.getSinglePost);
router.route('/cats/:param').get(postsController.getCategoriesPosts);
router.route('/likes/:id').patch(postsController.updateLikesPost);

router
  .route('/')
  .post(postsController.createNewPost)
  .patch(postsController.updatePost)
  .delete(postsController.deletePost);

module.exports = router;
