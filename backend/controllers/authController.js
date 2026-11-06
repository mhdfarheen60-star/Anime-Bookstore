import { OAuth2Client } from 'google-auth-library';
import User from '../models/User.js';
import { generateToken, setTokenCookie, clearTokenCookie } from '../utils/generateToken.js';
import { generateCsrfToken, setCsrfCookie, clearCsrfCookie } from '../utils/csrf.js';
import { AppError } from '../middleware/errorMiddleware.js';
import { saveAvatarImage, deleteAvatarFile } from '../utils/avatarStorage.js';

const googleClient = new OAuth2Client({ clientId: process.env.GOOGLE_CLIENT_ID });

const register = async (req, res, next) => {
  try {
    const { name, email, password, username, bio } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return next(new AppError('Email already registered. Please log in.', 400));
    }

    if (username) {
      const existingUsername = await User.findOne({ username: username.toLowerCase() });
      if (existingUsername) {
        return next(new AppError('Username is already taken. Please choose another.', 400));
      }
    }

    const user = await User.create({
      name,
      email,
      password,
      username: username ? username.toLowerCase() : undefined,
      bio,
      role: 'customer',
    });

    const token = generateToken(user._id);
    setTokenCookie(res, token);
    const csrfToken = generateCsrfToken();
    setCsrfCookie(res, csrfToken);

    res.status(201).json({
      success: true,
      message: 'Account created successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          username: user.username,
          bio: user.bio,
          role: user.role,
        },
        csrfToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return next(new AppError('Please provide email and password', 400));
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return next(new AppError('Invalid email or password', 401));
    }

    if (!user.isActive) {
      return next(new AppError('Account is deactivated. Contact support.', 401));
    }

    const token = generateToken(user._id);
    setTokenCookie(res, token);
    const csrfToken = generateCsrfToken();
    setCsrfCookie(res, csrfToken);

    res.json({
      success: true,
      message: 'Logged in successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        csrfToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Exchanges a Google Identity Services ID token for our own session. The token
// is verified against GOOGLE_CLIENT_ID, so a credential minted for another app
// is rejected.
const googleLogin = async (req, res, next) => {
  try {
    const { credential } = req.body;
    const clientId = process.env.GOOGLE_CLIENT_ID;

    if (!clientId) {
      return next(new AppError('Google sign-in is not configured', 503));
    }

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: clientId });
      payload = ticket.getPayload();
    } catch (error) {
      // Surface the underlying Google failure for debugging while keeping the
      // user-facing message friendly and the status consistent.
      console.error('Google sign-in token verification failed:', error?.message || error);
      return next(new AppError('Google sign-in failed. Please try again.', 401));
    }

    const { sub: googleId, email, email_verified: emailVerified, name, picture } = payload;
    if (!email || !emailVerified) {
      return next(new AppError('Your Google account email is not verified', 401));
    }

    const normalizedEmail = email.toLowerCase();
    let user = await User.findOne({ googleId }).select('+googleId');
    let isNew = false;

    if (!user) {
      user = await User.findOne({ email: normalizedEmail }).select('+googleId');
      if (user) {
        // Existing email/password account: link it to this Google identity.
        user.googleId = googleId;
        if (!user.avatar && picture) user.avatar = picture;
        await user.save({ validateModifiedOnly: true });
      } else {
        user = await User.create({
          name: (name || normalizedEmail.split('@')[0]).slice(0, 50).padEnd(2, '.'),
          email: normalizedEmail,
          googleId,
          avatar: picture,
          role: 'customer',
        });
        isNew = true;
      }
    }

    if (!user.isActive) {
      return next(new AppError('Account is deactivated. Contact support.', 401));
    }

    const token = generateToken(user._id);
    setTokenCookie(res, token);
    const csrfToken = generateCsrfToken();
    setCsrfCookie(res, csrfToken);

    res.status(isNew ? 201 : 200).json({
      success: true,
      message: isNew ? 'Account created successfully' : 'Logged in successfully',
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar,
        },
        csrfToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    clearTokenCookie(res);
    clearCsrfCookie(res);
    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return next(new AppError('User not found', 404));
    }
    // Echo the existing CSRF cookie back (or mint a fresh one) so the SPA can
    // restore its CSRF token after a full page reload.
    const csrfToken = req.cookies?.csrfToken || generateCsrfToken();
    if (!req.cookies?.csrfToken) setCsrfCookie(res, csrfToken);
    res.json({
      success: true,
      data: {
        csrfToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          username: user.username,
          bio: user.bio,
          role: user.role,
          avatar: user.avatar,
          address: user.address,
          phone: user.phone,
          isActive: user.isActive,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Shape returned by the profile endpoints.
const profileResponse = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email,
  username: user.username,
  bio: user.bio,
  role: user.role,
  address: user.address,
  phone: user.phone,
  avatar: user.avatar,
});

const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, address, username, bio, avatar } = req.body;

    if (username) {
      const normalizedUsername = username.toLowerCase();
      const existingUsername = await User.findOne({
        username: normalizedUsername,
        _id: { $ne: req.user._id },
      });
      if (existingUsername) {
        return next(new AppError('Username is already taken. Please choose another.', 400));
      }
    }

    const current = await User.findById(req.user._id);
    if (!current) {
      return next(new AppError('User not found', 404));
    }

    // An empty username or avatar clears the field. Username is unique and
    // sparse, so it must be removed rather than stored as "".
    const $set = {};
    const $unset = {};
    if (name !== undefined) $set.name = name;
    if (phone !== undefined) $set.phone = phone;
    if (address !== undefined) $set.address = address;
    if (bio !== undefined) $set.bio = bio;
    if (username !== undefined) {
      if (username) $set.username = username.toLowerCase();
      else $unset.username = 1;
    }
    if (avatar !== undefined) {
      if (avatar) $set.avatar = avatar;
      else $unset.avatar = 1;
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set, ...(Object.keys($unset).length && { $unset }) },
      { new: true, runValidators: true }
    );

    if (current.avatar !== user.avatar) {
      await deleteAvatarFile(current.avatar);
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: profileResponse(user) },
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/auth/avatar  (body: raw image bytes, Content-Type: image/*)
const uploadAvatar = async (req, res, next) => {
  try {
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      return next(new AppError('No image received. Choose a JPEG, PNG, WebP or GIF file.', 400));
    }
    const user = await User.findById(req.user._id);
    if (!user) {
      return next(new AppError('User not found', 404));
    }

    const previous = user.avatar;
    user.avatar = await saveAvatarImage(req.body);
    await user.save();
    await deleteAvatarFile(previous);

    res.status(201).json({
      success: true,
      message: 'Profile picture updated',
      data: { user: profileResponse(user) },
    });
  } catch (error) {
    if (error.statusCode === 400) return next(new AppError(error.message, 400));
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return next(new AppError('Please provide all password fields', 400));
    }

    if (newPassword !== confirmPassword) {
      return next(new AppError('Passwords do not match', 400));
    }

    if (newPassword.length < 8) {
      return next(new AppError('New password must be at least 8 characters', 400));
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!user.password) {
      return next(new AppError('This account signs in with Google and has no password to change', 400));
    }
    if (!(await user.comparePassword(currentPassword))) {
      return next(new AppError('Current password is incorrect', 401));
    }

    user.password = newPassword;
    await user.save();

    const token = generateToken(user._id);
    setTokenCookie(res, token);
    const csrfToken = generateCsrfToken();
    setCsrfCookie(res, csrfToken);

    res.json({
      success: true,
      message: 'Password changed successfully',
      data: { csrfToken },
    });
  } catch (error) {
    next(error);
  }
};

export { register, login, googleLogin, logout, getMe, updateProfile, uploadAvatar, changePassword };