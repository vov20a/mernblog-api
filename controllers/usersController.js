const User = require('../models/User');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const cloudinary = require('cloudinary');
const bcrypt = require('bcrypt');
const ApiUsersFeatures = require('../utils/apiUsersFeatures.js');
const userLikesOfPosts = require('../utils/userLikesOfPosts.js');
const {
  copyArray,
  treeComms,
  baseCommsOfUser,
  leftCommsOfUser,
} = require('../utils/userCommentsToDelete.js');

// @desc Get all users
// @route GET /users
// @access Private
const getUsers = async (req, res) => {
  // Get all users from MongoDB

  const usersCount = await User.countDocuments().lean();
  const users = await User.find().select('-password').lean();

  // If no users
  if (usersCount === undefined || users === undefined) {
    return res.status(400).json({ message: 'No users found' });
  }

  res.status(200).json({ users, usersCount, message: 'Users ready' });
};
// @desc Get all users
// @route GET /users/all
// @access Private
const getAllUsers = async (req, res) => {
  // Get all users from MongoDB
  const resultPerPage = 4;
  const usersCount = await User.countDocuments();

  const apiFeature = new ApiUsersFeatures(User.find(), req.query).search().filter();

  let users = await apiFeature.queryArr;

  // If no users
  if (users === undefined) {
    return res.status(400).json({ message: 'No users found' });
  }

  let filteredUsersCount = users.length;

  //если на page>1 нет users
  if (req.query.page > 1 && users.length <= resultPerPage * (req.query.page - 1)) {
    return res.status(400).json({ message: 'PageError' });
  }

  apiFeature.pagination(resultPerPage);

  users = await apiFeature.queryArr.clone();

  return res.status(200).json({
    users,
    usersCount,
    resultPerPage,
    filteredUsersCount,
  });
};
// @desc Create new user
// @route POST /users
// @access Private
const createNewUser = async (req, res) => {
  // return res.status(403).json({ message: 'No access' });
  // Create  new user-only 'Author' or 'Admin'
  if (!req.roles.includes('Author') && !req.roles.includes('Admin')) {
    return res.status(403).json({ message: 'No access' });
  }

  const { username, email, password, roles, avatar } = req.body;

  // Confirm data
  if (!username || !email || !password || !roles.length) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  // Check for duplicate username
  const duplicate = await User.findOne({ username })
    .collation({ locale: 'en', strength: 2 })
    .lean()
    .exec();

  if (duplicate) {
    return res.status(409).json({ message: 'Duplicate username' });
  }
  // Check for duplicate email
  const duplicateEmail = await User.findOne({ email }).lean().exec();

  if (duplicateEmail) {
    return res.status(409).json({ message: 'Duplicate email' });
  }

  //==========cloudinary==============

  let imagesLinks = undefined;

  if (!avatar) {
    imagesLinks = {
      public_id: 'blog/avatars/Profile_ecifnt',
      url: 'https://res.cloudinary.com/dutlb6kju/image/upload/v1746370966/blog/avatars/Profile_ecifnt.png',
    };
  } else {
    try {
      const result = await cloudinary.v2.uploader.upload(avatar, {
        folder: 'blog/avatars',
        width: 150,
        crop: 'scale',
      });

      imagesLinks = {
        public_id: result.public_id,
        url: result.secure_url,
      };
    } catch (error) {
      console.log(error);
      return res.status(400).json({ message: 'Cloudinary error' });
    }
  }

  // Hash password
  const hashedPwd = await bcrypt.hash(password, 10); // salt rounds

  const userObject = { username, email, password: hashedPwd, roles, avatar: imagesLinks };

  // Create and store new user
  const user = await User.create(userObject);

  if (user) {
    res.status(201).json({ message: `New user ${username} created` });
  } else {
    res.status(400).json({ message: 'Invalid user data received' });
  }
};

// @desc Update a user
// @route PATCH /users
// @access Private
const updateUser = async (req, res) => {
  // return res.status(403).json({ message: 'No access' });
  // Create  new user-only 'Author' or 'Admin'
  if (!req.roles.includes('Author') && !req.roles.includes('Admin')) {
    return res.status(403).json({ message: 'No access' });
  }

  const { id, username, email, roles, password, avatar } = req.body;

  // Confirm data
  if (!id || !username || !email || !Array.isArray(roles) || !roles.length) {
    return res.status(400).json({ message: 'All fields except password  are required' });
  }

  // Does the user exist to update?
  const user = await User.findById(id).exec();

  if (!user) {
    return res.status(400).json({ message: 'User not found' });
  }

  // Check for duplicate username
  const duplicate = await User.findOne({ username })
    .collation({ locale: 'en', strength: 2 })
    .lean()
    .exec();

  // Check for duplicate email
  const duplicateEmail = await User.findOne({ email }).lean().exec();

  // Allow updates to the original user
  if (
    (duplicate && duplicate?._id.toString() !== id) ||
    (duplicateEmail && duplicateEmail?._id.toString() !== id)
  ) {
    return res.status(409).json({ message: 'Duplicate username or email' });
  }

  //==========cloudinary==============

  let imageLinks = undefined;

  if (typeof avatar === 'string') {
    try {
      if (user.avatar.public_id !== 'blog/avatars/Profile_ecifnt') {
        await cloudinary.v2.uploader.destroy(user.avatar.public_id);
      }

      const result = await cloudinary.v2.uploader.upload(avatar, {
        folder: 'blog/avatars',
        width: 150,
        crop: 'scale',
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

  user.username = username;
  user.email = email;
  user.roles = roles;
  user.avatar = avatar ? imageLinks : user.avatar;

  if (password) {
    // Hash password
    user.password = await bcrypt.hash(password, 10); // salt rounds
  }

  const updatedUser = await user.save();

  res.json({ message: `${updatedUser.username}  updated` });
};

// @desc Update a password of user
// @route PATCH /users/password
// @access Private
const updateUserPassword = async (req, res) => {
  // return res.status(403).json({ message: 'No access' });

  const { id, password } = req.body;

  // Confirm data
  if (!id || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  // Does the user exist to update?
  const user = await User.findById(id).exec();

  if (!user) {
    return res.status(400).json({ message: 'User not found' });
  }

  user.password = await bcrypt.hash(password, 10); // salt rounds

  await user.save();

  res.json({ message: `Password ${user.username}  updated` });
};

// @desc Update a avatar of user
// @route PATCH /users/avatar
// @access Private
const updateUserAvatar = async (req, res) => {
  // return res.status(403).json({ message: 'No access' });

  const { id, avatar } = req.body;

  // Confirm data
  if (!id || !avatar) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  // Does the user exist to update?
  const user = await User.findById(id).exec();

  if (!user) {
    return res.status(400).json({ message: 'User not found' });
  }

  //==========cloudinary==============

  let imagesLinks = undefined;

  if (typeof avatar === 'string') {
    try {
      if (user.avatar.public_id !== 'blog/avatars/Profile_ecifnt') {
        await cloudinary.v2.uploader.destroy(user.avatar.public_id);
      }

      const result = await cloudinary.v2.uploader.upload(avatar, {
        folder: 'blog/avatars',
        width: 150,
        crop: 'scale',
      });

      imagesLinks = {
        public_id: result.public_id,
        url: result.secure_url,
      };
    } catch (error) {
      console.log(error);
      return res.status(400).json({ message: 'Cloudinary error' });
    }
  }

  user.avatar = imagesLinks;

  await user.save();

  res.json({ message: `Avatar ${user.username}  updated` });
};

// @desc Delete a user
// @route DELETE /users
// @access Private
const deleteUser = async (req, res) => {
  const { id } = req.body;
  // console.log(id);
  // return res.status(400).json({ message: 'User ID Required' });

  // Confirm data
  if (!id) {
    return res.status(400).json({ message: 'User ID Required' });
  }
  // Does the user exist to delete?
  const user = await User.findById(id).exec();
  // console.log(user._id.toString());
  if (!user) {
    return res.status(400).json({ message: 'User not found' });
  }
  //посты с его комм удаляем ручками
  const userPosts = await Post.find({ user: user._id }).exec();
  if (userPosts.length > 0) {
    return res.status(403).json({ message: 'Forbidden.User has posts' });
  }

  //likes других постов  удаляемм программно-userId из [],count--
  try {
    userLikesOfPosts(user);
  } catch (error) {
    console.log(error);
    return res.status(400).json({ message: `Error likes of post` });
  }

  //comms других постов с их детьми удаляемм программно
  const allComments = await Comment.find().lean();
  const copy = copyArray(allComments);
  const commTree = treeComms(copy);
  const baseComms = baseCommsOfUser(commTree, user);

  const { childrenArr, childrenChildArr } = leftCommsOfUser(commTree, user);
  const allCommentsForDelete = baseComms.concat(childrenArr).concat(childrenChildArr);

  // console.log(allCommentsForDelete.length);
  for (let obj of allCommentsForDelete) {
    try {
      // console.log(obj._id);
      await Comment.deleteOne({ _id: obj._id });
    } catch (error) {
      console.log(error);
      return res.status(400).json({ message: 'Error delete comment' });
    }
  }

  //likes других comms  удаляемм программно-userId из [],count--
  const arrOnlyId = [];
  for (let obj of allCommentsForDelete) {
    arrOnlyId.push(obj._id);
  }
  const commentsWithoutUserComments = copy.filter((i) => !arrOnlyId.includes(i._id));
  // console.log(commentsWithoutUserComments);
  // return res.status(400).json({ message: 'User ID Required' });

  const foundLikes = commentsWithoutUserComments.reduce((acc, item) => {
    if (item.likes.usersArray.includes(user._id.toString())) {
      item.likes.count = --item.likes.count;
      const index = item.likes.usersArray.indexOf(user._id.toString());
      if (index > -1) {
        // only splice array when item is found
        item.likes.usersArray.splice(index, 1); // 2nd parameter means remove one item only
      }
      acc.push(item);
    }
    return acc;
  }, []);

  // console.log(JSON.stringify(foundLikes));

  for (let obj of foundLikes) {
    try {
      // console.log(obj);
      const commForUpdateLikes = await Comment.findById(obj._id).exec();

      if (commForUpdateLikes) {
        commForUpdateLikes.likes = obj.likes;
        // console.log(commForUpdateLikes);
        await commForUpdateLikes.save();
      }
    } catch (error) {
      console.log(error);
      return res.status(400).json({ message: 'Error update comment likes' });
    }
  }

  if (user.avatar && user.avatar.public_id !== 'blog/avatars/Profile_ecifnt') {
    try {
      await cloudinary.v2.uploader.destroy(user.avatar.public_id);
    } catch (error) {
      console.log(error);
      return res.status(400).json({ message: 'Cloudinary error' });
    }
  }

  const result = await user.deleteOne();

  res.status(200).json({ message: `${result.username} deleted` });
};

module.exports = {
  getUsers,
  getAllUsers,
  createNewUser,
  updateUser,
  updateUserPassword,
  updateUserAvatar,
  deleteUser,
};
