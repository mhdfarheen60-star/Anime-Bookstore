import mongoose from 'mongoose';

// Messages submitted through the public contact form. They are stored so the
// store team can read and answer them from the admin panel.
const contactMessageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email'],
      maxlength: [254, 'Email cannot exceed 254 characters'],
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      minlength: [10, 'Message must be at least 10 characters'],
      maxlength: [5000, 'Message cannot exceed 5000 characters'],
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

contactMessageSchema.index({ createdAt: -1 });

const ContactMessage = mongoose.model('ContactMessage', contactMessageSchema);
export default ContactMessage;
