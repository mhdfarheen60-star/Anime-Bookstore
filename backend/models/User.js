import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email'],
    },
    // Optional for accounts created through Google sign-in; those authenticate
    // with googleId instead and have no local password until they set one.
    password: {
      type: String,
      required: [
        function () {
          return !this.googleId;
        },
        'Password is required',
      ],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
      select: false,
    },
    username: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
      match: [/^[a-z0-9_]+$/, 'Username can only contain lowercase letters, numbers, and underscores'],
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
    },
    avatar: String,
    role: {
      type: String,
      enum: ['customer', 'admin'],
      default: 'customer',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    phone: String,
    // Books the user has saved for later. Kept as a plain id list; updates use
    // $addToSet / $pull so repeated clicks can never create duplicates.
    wishlist: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Book',
      },
    ],
  },
  {
    timestamps: true,
  }
);

userSchema.index({ role: 1 });

// Async hooks must not take `next` in Mongoose 9; returning the promise is enough.
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  // Google-only accounts have no password to match against.
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.googleId;
  return obj;
};

const User = mongoose.model('User', userSchema);
export default User;