const Comment = require('../models/Comment');
const ApiCommentsFeatures = require('../utils/apiCommentsFeatures.js');

// @desc Get all comms
// @route GET /comments
// @access Private
const getComments = async (req, res) => {
  // Get all comms from MongoDB

  const commentsCount = await Comment.countDocuments().lean();
  const comments = await Comment.find().populate('post').populate('user').lean();

  // If no comms
  if (commentsCount === undefined || comments === undefined) {
    return res.status(400).json({ message: 'No comments found' });
  }

  res.status(200).json({ comments, commentsCount, message: 'Comments ready' });
};
// @desc Get all comms
// @route GET /comments/all
// @access Private
const getAllComments = async (req, res) => {
  //   // Get all comms from MongoDB
  const resultPerPage = 8;
  const commentsCount = await Comment.countDocuments();
  const apiFeature = new ApiCommentsFeatures(Comment.find(), req.query).search().filter();
  let comments = await apiFeature.queryArr;
  // If no comms
  if (comments === undefined) {
    return res.status(400).json({ message: 'No comments found' });
  }
  let filteredCommentsCount = comments.length;

  //если на page>1 нет comms
  if (req.query.page > 1 && comments.length <= resultPerPage * (req.query.page - 1)) {
    return res.status(400).json({ message: 'PageError' });
  }

  apiFeature.pagination(resultPerPage);
  comments = await apiFeature.queryArr.clone();
  return res.status(200).json({
    comments,
    commentsCount,
    resultPerPage,
    filteredCommentsCount,
  });
};
// @desc Create new comm
// @route POST /comments
// @access Private
const createNewComment = async (req, res) => {
  // return res.status(403).json({ message: 'No access' });
  // post and user -id:string
  const { text, post, user, parentComment } = req.body;

  // Confirm data
  if (!text || !post || !user) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  const parent_id = parentComment === '' ? null : parentComment;

  const likes = {
    count: 0,
    usersArray: [user],
  };

  // Check for duplicate username
  const duplicateText = await Comment.findOne({ text })
    .collation({ locale: 'en', strength: 2 })
    .lean()
    .exec();

  let newText = undefined;

  if (duplicateText) {
    newText = text + ' [ErrCode ' + (+new Date()).toString(16) + ']';

    // return res.status(409).json({ message: 'Duplicate text' });
  }

  const commObject = { text: newText ?? text, post, user, parentComment: parent_id, likes };
  const comment = await Comment.create(commObject);

  if (comment) {
    res.status(201).json({ message: `Comment  created` });
  } else {
    res.status(400).json({ message: 'Invalid comment data received' });
  }
};

// @desc Update like comm
// @route PATCH /comments/like/:id
// @access Private
const updateLikeComments = async (req, res) => {
  // return res.status(403).json({ message: 'No access' });
  const { likeAuthor } = req.body;
  const { id } = req.params;
  // Confirm data
  if (!id || !likeAuthor) {
    return res.status(400).json({ message: 'All fields  are required' });
  }
  // Does the comm exist to update?
  const foundComment = await Comment.findById(id).exec();
  if (!foundComment) {
    return res.status(400).json({ message: 'Comment not found' });
  }

  let likes = undefined;
  const foundArr = foundComment.likes.usersArray;

  if (foundArr.includes(likeAuthor)) {
    return res.status(403).json({ message: 'Forbidden like' });
  } else {
    let arr = foundArr;
    arr = [likeAuthor, ...arr];
    likes = {
      count: ++foundComment.likes.count,
      usersArray: arr,
    };
  }

  foundComment.likes = likes;
  // Update comm
  const comment = await foundComment.save();
  if (comment) {
    res.status(201).json({ message: `Like Comment added` });
  } else {
    res.status(400).json({ message: 'Invalid like data received' });
  }
};

// @desc Update a comm
// @route PATCH /comments
// @access Private

const updateComment = async (req, res) => {
  // return res.status(403).json({ message: 'No access' });
  // Create  new user-only 'Admin'
  if (!req.roles.includes('Admin')) {
    return res.status(403).json({ message: 'No access' });
  }
  const { id, text, post, user, parentComment } = req.body;
  // Confirm data
  if (!id || !text || !post || !user) {
    return res.status(400).json({ message: 'All fields  are required' });
  }

  // Does the comm exist to update?
  const foundComment = await Comment.findById(id).exec();
  if (!foundComment) {
    return res.status(400).json({ message: 'Comment not found' });
  }

  const parent_id = parentComment === '' ? null : parentComment;

  const likes = {
    count: 0,
    usersArray: [user],
  };

  foundComment.text = text;
  foundComment.post = post;
  foundComment.user = user;
  foundComment.parentComment = parent_id;
  foundComment.likes = likes;
  // Update comm
  const comment = await foundComment.save();
  if (comment) {
    res.status(201).json({ message: `Comment updated` });
  } else {
    res.status(400).json({ message: 'Invalid comment data received' });
  }
};

// @desc Delete a comm
// @route DELETE /comments
// @access Private
const deleteComment = async (req, res) => {
  // return res.status(400).json({ message: 'Invalid comment data received' });
  const { id } = req.body;

  // Confirm data
  if (!id) {
    return res.status(400).json({ message: 'Comment ID Required' });
  }
  // Does the user exist to delete?
  const comment = await Comment.findById(id).exec();
  if (!comment) {
    return res.status(400).json({ message: 'Comment not found' });
  }
  // Does the comm still have child-comment?
  const child = await Comment.findOne({ parentComment: comment._id }).lean().exec();
  // console.log(child);
  if (child) {
    return res.status(400).json({ message: 'Forbidden.Comment has child' });
  }

  const result = await comment.deleteOne();
  if (result) {
    return res.status(200).json({ message: `Comment deleted` });
  }
  return res.status(404).json({ message: `Invalid Comment Data` });
};

module.exports = {
  getComments,
  getAllComments,
  createNewComment,
  updateLikeComments,
  updateComment,
  deleteComment,
};
