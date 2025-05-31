const Video = require('../models/Video');

// @desc Get all videos
// @route GET /videos
// @access Public
const getVideos = async (req, res) => {
  // return res.status(400).json({ message: 'Invalid post data received' });
  // Get all users from MongoDB
  const videosCount = await Video.countDocuments().lean();

  let sort = '{"createdAt":-1}';

  const { query } = req.query;

  let search = query
    ? {
        title: {
          $regex: query,
          $options: 'i',
        },
      }
    : {};

  const videos = await Video.find(search).sort(JSON.parse(sort)).lean();

  // If no posts
  if (videosCount === undefined || videos === undefined) {
    return res.status(400).json({ message: 'Videos undefined' });
  }

  res.status(200).json({ videos, videosCount, message: 'Videos ready' });
};

// @desc get single video
// @route GET /videos/param
// @access Private
const getSingleVideo = async (req, res) => {
  // return res.status(403).json({ message: 'No access' });
  if (!req.roles.includes('Author') && !req.roles.includes('Admin')) {
    return res.status(403).json({ message: 'No access' });
  }

  const { param: videoId } = req.params;

  // Confirm data
  if (!videoId) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  // console.log(postId);
  let video = undefined;
  try {
    video = await Video.findOneAndUpdate(
      {
        _id: videoId,
      },
      {
        $inc: { views: 1 },
      },
      {
        returnDocument: 'after',
      },
    ).lean();
  } catch (err) {
    console.log(err);
    res.status(400).json({
      message: 'Не удалось получить видео',
    });
  }

  if (!video) {
    return res.status(400).json({ message: 'No data found' });
  }
  return res.status(200).json({ video, message: 'Video received' });
};

// @desc Create new video
// @route POST /videos
// @access Private
const createNewVideo = async (req, res) => {
  // return res.status(403).json({ message: 'No access' });
  // Create  new post-only 'Author' or 'Admin'
  if (!req.roles.includes('Author') && !req.roles.includes('Admin')) {
    return res.status(403).json({ message: 'No access' });
  }
  const { title, youtubeId } = req.body;
  // Confirm data
  if (!title || !youtubeId) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  // Check for duplicate title
  const duplicate = await Video.findOne({ title })
    .collation({ locale: 'en', strength: 2 })
    .lean()
    .exec();
  if (duplicate) {
    return res.status(409).json({ message: 'Duplicate title' });
  }

  const videoObject = { title, videoUrl: `https://www.youtube.com/embed/${youtubeId}` };
  // Create and store new post
  const video = await Video.create(videoObject);
  if (video) {
    res.status(201).json({ message: `${youtubeId} created` });
  } else {
    res.status(400).json({ message: 'Invalid video data received' });
  }
};

// @desc Update a video
// @route PATCH /videos
// @access Private
const updateVideo = async (req, res) => {
  // console.log(req.body.tags);
  // return res.status(403).json({ message: 'No access' });
  // Create  new user-only 'Author' or 'Admin'
  if (!req.roles.includes('Author') && !req.roles.includes('Admin')) {
    return res.status(403).json({ message: 'No access' });
  }
  const { id, title, youtubeId } = req.body;
  // Confirm data
  if (!id || !title || !youtubeId) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  // Does the post exist to update?
  const video = await Video.findById(id).exec();
  if (!video) {
    return res.status(400).json({ message: 'Video not found' });
  }
  // Check for duplicate title
  const duplicate = await Video.findOne({ title })
    .collation({ locale: 'en', strength: 2 })
    .lean()
    .exec();
  // Allow updates to the original user
  if (duplicate && duplicate?._id.toString() !== id) {
    return res.status(409).json({ message: 'Duplicate title' });
  }

  video.title = title;
  video.videoUrl = `https://www.youtube.com/embed/${youtubeId}`;

  const updatedVideo = await video.save();
  res.json({ message: `${youtubeId}  updated` });
};

// @desc Delete a video
// @route DELETE /videos
// @access Private
const deleteVideo = async (req, res) => {
  // console.log(id);
  // return res.status(400).json({ message: 'Post ID Required' });
  // Delete  video-only 'Author' or 'Admin'
  if (!req.roles.includes('Author') && !req.roles.includes('Admin')) {
    return res.status(403).json({ message: 'No access' });
  }
  const { id } = req.body;
  // Confirm data
  if (!id) {
    return res.status(400).json({ message: 'Video ID Required' });
  }

  // Does the video exist to delete?
  const video = await Video.findById(id).exec();
  // console.log(post);

  if (!video) {
    return res.status(400).json({ message: 'Video not found!!!' });
  }

  const result = await video.deleteOne();
  res.status(200).json({ message: `Video deleted` });
};

module.exports = { getVideos, getSingleVideo, createNewVideo, updateVideo, deleteVideo };
