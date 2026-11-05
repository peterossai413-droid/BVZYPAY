const mongoose = require('mongoose');
const transactionSchema = new mongoose.Schema({
  account: { type: mongoose.Schema.Types.ObjectId, ref: 'Account', required: true },
  type: { type: String, enum: ['debit', 'credit'], required: true },
  amount: { type: Number, required: true, min: 0 },
  description: { type: String, required: true },
  status: { type: String, enum: ['pending', 'successful', 'failed'], default: 'successful' },
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Transaction', transactionSchema);
