const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// ================== User Schema ==================
const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName:  { type: String, required: true },
  email:     { type: String, required: true, unique: true },
  password:  { type: String, required: true }, // for login

  // KYC properties required by external API
  kycType:       { type: String, unique: true, sparse: true },
  kycID:       { type: String, unique: true, sparse: true }, 

  verified:  { type: Boolean, default: false }, // must be true before account creation
  createdAt: { type: Date, default: Date.now }
});

// Hash password before saving
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return ;
  this.password = await bcrypt.hash(this.password, 10);
});

// Method to compare password during login
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);


module.exports =  User;


