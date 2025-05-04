const User = require('../models/User');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cloudinary = require('cloudinary');

// @desc Login
// @route POST /auth
// @access Public
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  const foundUser = await User.findOne({ email }).exec();

  if (!foundUser) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const match = await bcrypt.compare(password, foundUser.password);

  if (!match) return res.status(401).json({ message: 'Unauthorized' });

  const accessToken = jwt.sign(
    {
      UserInfo: {
        username: foundUser.username,
        email: foundUser.email,
        roles: foundUser.roles,
        avatarUrl: foundUser.avatar.url,
        id: foundUser.id,
      },
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: '15m' },
  );

  const refreshToken = jwt.sign(
    {
      username: foundUser.username,
      email: foundUser.email,
      roles: foundUser.roles,
      avatarUrl: foundUser.avatar.url,
      id: foundUser.id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: '30d' },
  );

  // Create secure cookie with refresh token
  res.cookie('jwt', refreshToken, {
    httpOnly: true, //accessible only by web server
    secure: true, //https
    sameSite: 'None', //cross-site cookie
    maxAge: 30 * 24 * 60 * 60 * 1000, //cookie expiry: set to match rT
  });

  // Send accessToken containing username and roles
  res.json({ accessToken });
};

// @desc Register
// @route POST /register
// @access Public
const register = async (req, res) => {
  const { username, email, password, avatar } = req.body;

  // Confirm data
  if (!username || !email || !password) {
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
      public_id: 'blog/avatars/hfd7xpap9t1n8keqbthl',
      url: 'https://res.cloudinary.com/dutlb6kju/image/upload/v1745523090/blog/avatars/hfd7xpap9t1n8keqbthl.png',
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

  let userObject;

  userObject = { username, email, password: hashedPwd, roles: ['User'], avatar: imagesLinks };

  // Create and store new user
  const user = await User.create(userObject);

  if (!user) {
    res.status(400).json({ message: 'Invalid user data received' });
  }

  const accessToken = jwt.sign(
    {
      UserInfo: {
        username: user.username,
        email: user.email,
        roles: user.roles,
        avatarUrl: user.avatar.url,
        id: user.id,
      },
    },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: '15m' },
  );

  const refreshToken = jwt.sign(
    {
      username: user.username,
      email: user.email,
      roles: user.roles,
      avatarUrl: user.avatar.url,
      id: user.id,
    },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: '30d' },
  );

  // Create secure cookie with refresh token
  res.cookie('jwt', refreshToken, {
    httpOnly: true, //accessible only by web server
    secure: true, //https
    sameSite: 'None', //cross-site cookie
    maxAge: 30 * 24 * 60 * 60 * 1000, //cookie expiry: set to match rT
  });

  if (user) {
    //created
    res.status(201).json({ accessToken, message: `${user.username} registered` });
  }
};

// @desc Refresh
// @route GET /auth/refresh
// @access Public - because access token has expired
const refresh = (req, res) => {
  const cookies = req.cookies;
  // console.log('cookie', cookies);
  if (!cookies?.jwt) return res.status(401).json({ message: 'Unauthorized' });

  const refreshToken = cookies.jwt;

  jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, async (err, decoded) => {
    if (err) return res.status(403).json({ message: 'Forbidden' });

    const foundUser = await User.findOne({
      username: decoded.username,
      email: decoded.email,
    }).exec();

    if (!foundUser) return res.status(401).json({ message: 'Unauthorized' });

    const accessToken = jwt.sign(
      {
        UserInfo: {
          username: foundUser.username,
          email: foundUser.email,
          roles: foundUser.roles,
          avatarUrl: foundUser.avatar.url,
          id: foundUser.id,
        },
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: '15m' },
    );

    res.json({ accessToken });
  });
};

// @desc Logout
// @route POST /auth/logout
// @access Public - just to clear cookie if exists
const logout = (req, res) => {
  const cookies = req.cookies;
  if (!cookies?.jwt) return res.sendStatus(204); //No content
  res.clearCookie('jwt', { httpOnly: true, sameSite: 'None', secure: true });
  res.json({ message: 'Cookie cleared' });
};

module.exports = {
  login,
  register,
  refresh,
  logout,
};
