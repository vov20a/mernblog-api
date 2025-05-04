const Post = require('../models/Post');
const mongoose = require('mongoose');

async function userLikesOfPosts(user) {
  let likesPosts = [];
  likesPosts = await Post.aggregate([
    { $project: { likes: true } },
    { $unwind: '$likes' },
    { $match: { 'likes.usersArray': user._id } },
  ]);

  const arr = [];
  for (let obj of likesPosts) {
    for (let i = 0; i < obj.likes.usersArray.length; ++i) {
      obj.likes.usersArray[i] = obj.likes.usersArray[i].toString();
    }
    if (obj.likes.usersArray.includes(user._id.toString())) {
      const index = obj.likes.usersArray.indexOf(user._id.toString());
      if (index > -1) {
        // only splice array when item is found
        obj.likes.usersArray.splice(index, 1); // 2nd parameter means remove one item only
      }
      obj.likes.count = obj.likes.count - 1;
      arr.push(obj);
    }
  }
  for (let obj of arr) {
    const post = await Post.findById(obj._id).exec();
    if (post._id.toString() === obj._id.toString()) {
      post.likes = { count: obj.likes.count, usersArray: obj.likes.usersArray };
      for (let i = 0; i < post.likes.usersArray.length; ++i) {
        obj.likes.usersArray[i] = new mongoose.Types.ObjectId(post.likes.usersArray[i]);
      }
      // console.log(post.likes);
      const savedPost = await post.save();
    }
  }
}
module.exports = userLikesOfPosts;
