const express = require('express');
const router = express.Router();
const videosController = require('../controllers/videosController');
const verifyJWT = require('../middlewares/verifyJWT');

router.route('/').get(videosController.getVideos);

router.use(verifyJWT);

router.route('/:param').get(videosController.getSingleVideo);

router
  .route('/')
  .post(videosController.createNewVideo)
  .patch(videosController.updateVideo)
  .delete(videosController.deleteVideo);

module.exports = router;
