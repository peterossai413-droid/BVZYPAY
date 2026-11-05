const mongoose = require('mongoose');


// ================== Account Schema ==================
const accountSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true, 
    unique: true // one account per user
  },
  accountNumber: { type: String, required: true, unique: true },
  balance: { type: Number, default: 15000 }, // pre-funded with ₦15,000
  createdAt: { type: Date, default: Date.now }
});
const Account = mongoose.model('Account', accountSchema);
module.exports = Account;

