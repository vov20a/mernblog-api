const Post = require('../models/Post');
const Comment = require('../models/Comment');
const cloudinary = require('cloudinary');
const ApiPostsFeatures = require('../utils/apiPostsFeatures.js');

// @desc Get all posts
// @route GET /posts
// @access Public
const getPosts = async (req, res) => {
  // return res.status(400).json({ message: 'Invalid post data received' });
  // Get all users from MongoDB
  const postsCount = await Post.countDocuments().lean();

  const limit = req.query?.limit ?? undefined;
  let sort = req.query?.sort;
  let order = req.query?.order;
  sort = sort ? `{"${sort}": ${order} }` : '{"createdAt":-1}';

  const posts = await Post.find()
    .sort(JSON.parse(sort))
    .limit(limit)
    .populate('category')
    .populate('user', { password: false })
    .lean();

  // If no posts
  if (postsCount === undefined || posts === undefined) {
    return res.status(400).json({ message: 'No posts found' });
  }

  res.status(200).json({ posts, postsCount, message: 'Posts ready' });
};
// @desc Get all users
// @route GET /users/all
// @access Public
const getAllPosts = async (req, res) => {
  // return res.status(400).json({ message: 'Invalid post data received' });
  let resultPerPage = 4;
  const postsCount = await Post.countDocuments().lean();

  let apiFeature = undefined;
  let posts = undefined;
  if (req.query.mode === 'home') {
    resultPerPage = 4;
    apiFeature = new ApiPostsFeatures(
      Post.find({
        $and: [{ tags: { $ne: ['$home_banner&'] } }, { tags: { $ne: ['$big_post&'] } }],
      })
        .populate('category')
        .populate('user', { password: false }),
      req.query,
    );
    posts = await apiFeature.queryArr;
  } else {
    apiFeature = new ApiPostsFeatures(Post.find(), req.query).search().filter();
    posts = await apiFeature.queryArr.populate('category').populate('user', { password: false });
  }

  // If no users
  if (posts === undefined) {
    return res.status(400).json({ message: 'No posts found' });
  }
  let filteredPostsCount = posts.length;
  //если на page>1 нет постов
  if (req.query.page > 1 && posts.length < resultPerPage * (req.query.page - 1)) {
    // console.log(posts.length);
    // console.log(req.query.page);
    return res.status(400).json({ message: 'PageError' });
  }

  apiFeature.pagination(resultPerPage);

  posts = await apiFeature.queryArr.clone();
  return res.status(200).json({
    posts,
    postsCount,
    resultPerPage,
    filteredPostsCount,
  });
};
// @desc Get posts by popular Author(to have the most number of posts)
// @route GET /posts/users
// @access Private
const getPostsByPopularUsers = async (req, res) => {
  // return res.status(400).json({ message: 'Invalid post data received' });
  const result = await Post.aggregate([
    { $group: { _id: '$user', postsCount: { $sum: 1 } } },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'users',
      },
    },
    {
      $sort: { postsCount: -1 },
    },
    {
      $limit: 3,
    },
  ]);

  // If no posts
  if (result === undefined) {
    return res.status(400).json({ message: 'No posts found' });
  }

  // res.status(200).json({ posts, postsCount, message: 'Posts ready' });
  res.status(200).json(result);
};

// @desc Get posts by Category,by Tags
// @route GET /posts/:param
// @access Private
const getPostsByParam = async (req, res) => {
  // return res.status(400).json({ message: 'Invalid post data received' });

  const resultPerPage = 6;

  const { param } = req.params;

  // Confirm data
  if (!param) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  let apiFeature = undefined;
  let posts = undefined;
  let postsCount = undefined;

  if (param.includes(' CID')) {
    postsCount = await Post.countDocuments({ category: param.replace(' CID', '') }).lean();
    apiFeature = new ApiPostsFeatures(Post.find({ category: param.replace(' CID', '') }), req.query)
      .search()
      .filter();
    posts = await apiFeature.queryArr.populate('category').populate('user', { password: false });
  } else if (param.includes(' UID')) {
    postsCount = await Post.countDocuments({ user: param.replace(' UID', '') }).lean();
    apiFeature = new ApiPostsFeatures(Post.find({ user: param.replace(' UID', '') }), req.query)
      .search()
      .filter();
    posts = await apiFeature.queryArr.populate('category').populate('user', { password: false });
  } else if (param.includes(' TID')) {
    postsCount = await Post.countDocuments({ tags: param.replace(' TID', '') }).lean();
    apiFeature = new ApiPostsFeatures(Post.find({ tags: param.replace(' TID', '') }), req.query)
      .search()
      .filter();
    posts = await apiFeature.queryArr.populate('category').populate('user', { password: false });
  }

  // If no users
  if (posts === undefined) {
    return res.status(400).json({ message: 'No posts found' });
  }
  let filteredPostsCount = posts.length;
  //если на page>1 нет постов
  if (req.query.page > 1 && posts.length <= resultPerPage * (req.query.page - 1)) {
    return res.status(400).json({ message: 'PageError' });
  }

  apiFeature.pagination(resultPerPage);

  posts = await apiFeature.queryArr.clone();
  return res.status(200).json({
    posts,
    postsCount,
    resultPerPage,
    filteredPostsCount,
  });
};

// @desc Get some tags of posts
// @route GET /posts/tags
// @access Private
const getTagsOfPosts = async (req, res) => {
  // return res.status(400).json({ message: 'Invalid post data received' });
  const tagsPosts = await Post.aggregate([
    { $project: { tags: true } },
    { $unwind: '$tags' },
    { $group: { _id: '$tags' } },
    { $sort: { _id: 1 } },
  ]);
  const tags = [];
  for (let obj of tagsPosts) {
    if (obj._id !== '' && obj._id !== ' ') {
      tags.push(obj._id);
    }
  }

  const likesPosts = await Post.aggregate([
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'users',
      },
    },
    // {
    //   $lookup: {
    //     from: 'categories',
    //     localField: 'category',
    //     foreignField: '_id',
    //     as: 'categories',
    //   },
    // },
    {
      $project: {
        title: true,
        imageUrl: true,
        users: true,
        category: true,
        createdAt: true,
        maxCount: { $max: '$likes.count' },
      },
    },
    {
      $sort: { maxCount: -1 },
    },
    {
      $limit: 3,
    },
  ]);

  const likes = [];
  for (let obj of likesPosts) {
    obj._id = obj._id.toString();
    imageUrl = obj.imageUrl.url;
    likes.push({
      id: obj._id,
      imageUrl,
      title: obj.title,
      createdAt: obj.createdAt,
      user: obj.users[0].username,
      category: obj.category,
      maxCount: obj.maxCount,
    });
  }

  // const tags = arr.sort((a, b) => a.localeCompare(b));

  if (!tags.length) {
    return res.status(400).json({ message: 'No tags received' });
  }
  return res.status(200).json({ tags, likes });
};

// @desc get many posts of all children Categories
// @route GET /posts/cats/param
// @access Private
const getCategoriesPosts = async (req, res) => {
  // return res.status(403).json({ message: 'No access' });
  //cats -[] of children Categories
  const { param: cats } = req.params;
  // console.log('cats', cats);
  // Confirm data
  if (!cats) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  let posts = [];
  for (let cat of cats.split(',')) {
    const arr = await Post.find({ category: cat })
      .populate('category')
      .populate('user', { password: false })
      .lean();

    posts = [...posts].concat(arr);
  }
  // console.log(posts.length);

  if (!posts.length) {
    return res.status(400).json({ message: 'No posts received' });
  }
  return res.status(200).json({ posts, message: 'Posts received' });
};

// @desc get single post
// @route GET /posts/single/param
// @access Private
const getSinglePost = async (req, res) => {
  // return res.status(403).json({ message: 'No access' });
  const { param: postId } = req.params;
  const { comm } = req.query;

  // Confirm data
  if (!postId) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  // console.log(postId);
  let post = undefined;
  let comments = undefined;

  if (comm === 'only_comm') {
    comments = await Comment.find({ post: postId }).populate('user').lean();
    post = await Post.find().populate('category').populate('user', { password: false }).lean();
  } else {
    comments = await Comment.find().lean();
    try {
      post = await Post.findOneAndUpdate(
        {
          _id: postId,
        },
        {
          $inc: { views: 1 },
        },
        {
          returnDocument: 'after',
        },
      )
        .populate('category')
        .populate('user', { password: false })
        .lean();
    } catch (err) {
      console.log(err);
      res.status(400).json({
        message: 'Не удалось получить статью',
      });
    }
  }

  if (!post || !comments) {
    return res.status(400).json({ message: 'No data found' });
  }
  return res.status(200).json({ post, comments, message: 'Post received' });
};

// @desc Create new post
// @route POST /posts
// @access Private
const createNewPost = async (req, res) => {
  // return res.status(403).json({ message: 'No access' });
  // Create  new post-only 'Author' or 'Admin'
  if (!req.roles.includes('Author') && !req.roles.includes('Admin')) {
    return res.status(403).json({ message: 'No access' });
  }
  const { title, text, category, tags, user, imageUrl } = req.body;
  // Confirm data
  if (!title || !text || !category || !tags.length || !user || !imageUrl) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  // Check for duplicate title
  const duplicate = await Post.findOne({ title })
    .collation({ locale: 'en', strength: 2 })
    .lean()
    .exec();
  if (duplicate) {
    return res.status(409).json({ message: 'Duplicate title' });
  }
  // Check for duplicate email
  const duplicateText = await Post.findOne({ text }).lean().exec();
  if (duplicateText) {
    return res.status(409).json({ message: 'Duplicate text' });
  }
  //==========cloudinary==============
  let imageLinks = undefined;
  try {
    if (imageUrl) {
      const result = await cloudinary.v2.uploader.upload(imageUrl, {
        folder: 'blog/posts',
      });
      imageLinks = {
        public_id: result.public_id,
        url: result.secure_url,
      };
    }
  } catch (error) {
    console.log(error);
    return res.status(400).json({ message: 'Cloudinary error' });
  }

  const likes = { count: 0, usersArray: [user] };

  const postObject = { title, text, tags, category, user, imageUrl: imageLinks, likes };
  // Create and store new post
  const post = await Post.create(postObject);
  if (post) {
    res.status(201).json({ message: `${post.title} created` });
  } else {
    res.status(400).json({ message: 'Invalid post data received' });
  }
};
// @desc Update likes of post
// @route PATCH /posts/likes/:id
// @access Private
const updateLikesPost = async (req, res) => {
  // return res.status(403).json({ message: 'No access' });
  const { id } = req.params;
  const { userId } = req.query;

  // Confirm data
  if (!id || !userId) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  const post = await Post.findById(id).exec();

  let likes = post.likes;
  if (likes.usersArray.includes(userId)) {
    return res.status(403).json({ message: 'Forbidden like' });
  }
  likes.count = ++likes.count;
  let arr = likes.usersArray;
  arr = [userId, ...arr];
  likes.usersArray = arr;
  post.likes = likes;

  const updatedPost = await post.save();
  res.json({ message: `Like post  added` });
};

// @desc Update a post
// @route PATCH /posts
// @access Private
const updatePost = async (req, res) => {
  // console.log(req.body.tags);
  // return res.status(403).json({ message: 'No access' });
  // Create  new user-only 'Author' or 'Admin'
  if (!req.roles.includes('Author') && !req.roles.includes('Admin')) {
    return res.status(403).json({ message: 'No access' });
  }
  const { id, title, text, category, tags, user, imageUrl } = req.body;
  // Confirm data
  if (!id || !title || !text || !category || !tags.length || !user) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  // Does the post exist to update?
  const post = await Post.findById(id).exec();
  if (!post) {
    return res.status(400).json({ message: 'Post not found' });
  }
  // Check for duplicate title
  const duplicate = await Post.findOne({ title })
    .collation({ locale: 'en', strength: 2 })
    .lean()
    .exec();
  // Check for duplicate text
  const duplicateText = await Post.findOne({ text }).lean().exec();
  // Allow updates to the original user
  if (
    (duplicate && duplicate?._id.toString() !== id) ||
    (duplicateText && duplicateText?._id.toString() !== id)
  ) {
    return res.status(409).json({ message: 'Duplicate title or text' });
  }
  if (tags.includes('')) {
    return res.status(409).json({ message: 'Error tags' });
  }

  //==========cloudinary==============

  let imageLinks = undefined;

  if (typeof imageUrl === 'string' && imageUrl !== null) {
    try {
      await cloudinary.v2.uploader.destroy(post.imageUrl.public_id);
      const result = await cloudinary.v2.uploader.upload(imageUrl, {
        folder: 'blog/posts',
      });
      imageLinks = {
        public_id: result.public_id,
        url: result.secure_url,
      };
    } catch (error) {
      console.log(error);
      return res.status(400).json({ message: 'Cloudinary error' });
    }
  }

  const likes = { count: 0, usersArray: [user] };

  post.text = text;
  post.title = title;
  post.category = category;
  post.user = user;
  post.tags = tags;
  post.imageUrl = imageUrl ? imageLinks : post.imageUrl;
  post.likes = likes;

  const updatedPost = await post.save();
  res.json({ message: `${updatedPost.title}  updated` });
};

// @desc Delete a post
// @route DELETE /posts
// @access Private
const deletePost = async (req, res) => {
  const { id } = req.body;
  // console.log(id);
  // return res.status(400).json({ message: 'Post ID Required' });
  // Confirm data
  if (!id) {
    return res.status(400).json({ message: 'Post ID Required' });
  }

  // Does the post exist to delete?
  const post = await Post.findById(id).exec();
  // console.log(post);

  if (!post) {
    return res.status(400).json({ message: 'Post not found!!!' });
  }

  const postComments = await Comment.find({ post: post._id }).lean();
  if (postComments.length > 0) {
    const resultDelete = await Comment.deleteMany({ post: post._id });
    if (!resultDelete.deletedCount) {
      return res.status(403).json({ message: 'Wrong with comments' });
    }
  }
  // return res.status(400).json({ message: 'Post ID Required' });

  try {
    if (post.imageUrl.public_id !== undefined) {
      await cloudinary.v2.uploader.destroy(post.imageUrl.public_id);
    }
  } catch (error) {
    console.log(error);
    return res.status(400).json({ message: 'Cloudinary error' });
  }
  const result = await post.deleteOne();
  res.status(200).json({ message: `${result.title} deleted` });
};

module.exports = {
  getPosts,
  getAllPosts,
  getPostsByPopularUsers,
  getPostsByParam,
  getTagsOfPosts,
  getCategoriesPosts,
  getSinglePost,
  createNewPost,
  updateLikesPost,
  updatePost,
  deletePost,
};
