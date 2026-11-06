export class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

export const handleDuplicateFieldsDB = (err) => {
  // err.keyValue is normally populated, but be defensive: a malformed duplicate
  // error would otherwise throw here and mask the original problem.
  const field = Object.keys(err.keyValue ?? {})[0];
  if (!field) {
    return new AppError('That value already exists. Please use another value.', 400);
  }
  const value = err.keyValue[field];
  const message = `${field} '${value}' already exists. Please use another value.`;
  
  // Return 409 Conflict for ISBN duplicates as it's a resource conflict
  const statusCode = field === 'isbn' ? 409 : 400;
  return new AppError(message, statusCode);
};

export const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data: ${errors.join('. ')}`;
  return new AppError(message, 400);
};

// Connectivity failures (e.g. Atlas rejecting the TLS handshake) are an outage,
// not a bug in the request; keep the raw OpenSSL text out of the UI.
const DB_UNAVAILABLE = /^Mongo(ose)?(Network|NetworkTimeout|ServerSelection|PoolCleared)Error$/;
export const handleDBUnavailable = (err) => {
  console.error('Database unavailable:', err.name, err.message);
  return new AppError('Database is temporarily unavailable. Please try again shortly.', 503);
};

export const handleJWTError = () =>
  new AppError('Invalid token. Please log in again.', 401);

export const handleJWTExpiredError = () =>
  new AppError('Your token has expired. Please log in again.', 401);

export const sendErrorDev = (err, res) => {
  res.status(err.statusCode).json({
    success: false,
    error: err,
    message: err.message,
    stack: err.stack,
  });
};

export const sendErrorProd = (err, res) => {
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
  } else {
    console.error('ERROR:', err);
    res.status(500).json({
      success: false,
      message: 'Something went wrong',
    });
  }
};

export const globalErrorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Translate known database/JWT errors in every environment, so development
  // shows the same status codes and readable messages as production.
  let error = err;
  if (err.name === 'CastError') error = handleCastErrorDB(err);
  if (err.code === 11000) error = handleDuplicateFieldsDB(err);
  if (err.name === 'ValidationError') error = handleValidationErrorDB(err);
  if (err.name === 'JsonWebTokenError') error = handleJWTError();
  if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();
  if (DB_UNAVAILABLE.test(err.name)) error = handleDBUnavailable(err);

  if (process.env.NODE_ENV === 'development') {
    if (error !== err) error.stack = err.stack;
    sendErrorDev(error, res);
  } else {
    sendErrorProd(error, res);
  }
};

export const notFound = (req, res, next) => {
  const err = new AppError(`Route ${req.originalUrl} not found`, 404);
  next(err);
};