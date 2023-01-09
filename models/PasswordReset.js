const mongoose = require('mongoose')

const passwordResetSchema = new mongoose.Schema({
  userId: String,
  resetString: String,
  createdAt: Date,
  expiresAt: Date
})

const PasswordReset = mongoose.model('passwordReset', passwordResetSchema)

module.exports = PasswordReset