const User = require('../Models/userModel');
const Account = require('../Models/accountModel');
const Transaction = require('../Models/transactionModel');
const generateAccountNumber = require('../utlity/accountGenerator');

const createAccount = async (req, res) => {
  try {
    const { firstName, lastName, email, password, kycType, kycID } = req.body;
    if (!firstName || !lastName || !email || !password || !kycType || !kycID) return res.status(400).json({ error: 'All fields are required' });
    if (!['bvn', 'nin'].includes(String(kycType).toLowerCase())) return res.status(400).json({ error: 'KYC type must be BVN or NIN' });
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ error: 'An account with this email already exists' });
    const user = await User.create({ firstName, lastName, email: email.toLowerCase(), password, kycType: String(kycType).toLowerCase(), kycID });
    const accountNumber = generateAccountNumber();
    const account = await Account.create({ user: user._id, accountNumber, balance: 15000 });
    res.status(201).json({ message: 'Account created successfully', user: { id: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email }, account });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create account', details: error.message });
  }
};

const getMyAccount = async (req, res) => {
  try {
    const account = await Account.findOne({ user: req.user._id }).populate('user', 'firstName lastName email');
    if (!account) return res.status(404).json({ error: 'Account not found' });
    res.json({ account });
  } catch (error) { res.status(500).json({ error: 'Failed to fetch account' }); }
};

const checkBalance = async (req, res) => {
  try {
    const account = await Account.findOne({ _id: req.params.accountId, user: req.user._id });
    if (!account) return res.status(404).json({ error: 'Account not found' });
    res.json({ balance: account.balance });
  } catch (error) { res.status(500).json({ error: 'Failed to fetch balance' }); }
};

const getTransactionHistory = async (req, res) => {
  try {
    const account = await Account.findOne({ _id: req.params.accountId, user: req.user._id });
    if (!account) return res.status(404).json({ error: 'Account not found' });
    const transactions = await Transaction.find({ account: account._id }).sort({ createdAt: -1 }).limit(30);
    res.json({ transactions });
  } catch (error) { res.status(500).json({ error: 'Failed to fetch transactions' }); }
};

const transferFunds = async (req, res) => {
  try {
    const { toAccountNumber, amount, note } = req.body;
    const noteText = String(note || '').trim().slice(0, 60);
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return res.status(400).json({ error: 'Enter a valid transfer amount' });
    if (!/^\d{10}$/.test(String(toAccountNumber || ''))) return res.status(400).json({ error: 'Enter a valid 10-digit account number' });
    const fromAccount = await Account.findOne({ user: req.user._id });
    const toAccount = await Account.findOne({ accountNumber: String(toAccountNumber) });
    if (!fromAccount || !toAccount) return res.status(404).json({ error: 'Destination account not found' });
    if (String(fromAccount._id) === String(toAccount._id)) return res.status(400).json({ error: 'Choose a different destination account' });
    if (fromAccount.balance < value) return res.status(400).json({ error: 'Insufficient funds' });
    fromAccount.balance -= value;
    toAccount.balance += value;
    await fromAccount.save();
    await toAccount.save();
    await Transaction.create([
      { account: fromAccount._id, type: 'debit', amount: value, description: `Transfer to ${toAccount.accountNumber}${noteText ? ' · ' + noteText : ''}` },
      { account: toAccount._id, type: 'credit', amount: value, description: `Transfer from ${fromAccount.accountNumber}` }
    ]);
    res.json({ message: 'Transfer successful', balance: fromAccount.balance });
  } catch (error) { res.status(500).json({ error: 'Transfer failed', details: error.message }); }
};

const getTransactionStatus = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.transactionId);
    if (!transaction) return res.status(404).json({ error: 'Transaction not found' });
    const account = await Account.findOne({ _id: transaction.account, user: req.user._id });
    if (!account) return res.status(403).json({ error: 'Not authorized for this transaction' });
    res.json({ status: transaction.status, transaction });
  } catch (error) { res.status(500).json({ error: 'Failed to fetch transaction status' }); }
};

const getAccounts = async (req, res) => {
  try {
    const account = await Account.findOne({ user: req.user._id }).populate('user', 'firstName lastName email');
    res.json({ accounts: account ? [account] : [] });
  } catch (error) { res.status(500).json({ error: 'Failed to fetch accounts' }); }
};

const getNameEnquiry = async (req, res) => {
  try {
    const account = await Account.findOne({ accountNumber: req.params.accountNumber }).populate('user', 'firstName lastName');
    if (!account || !account.user) return res.status(404).json({ error: 'Account not found' });
    res.json({ name: `${account.user.firstName} ${account.user.lastName}` });
  } catch (error) { res.status(500).json({ error: 'Failed to fetch name enquiry' }); }
};

const getPreviousTransfers = async (req, res) => {
  try {
    const account = await Account.findOne({ _id: req.params.accountId, user: req.user._id });
    if (!account) return res.status(404).json({ error: 'Account not found' });
    const transactions = await Transaction.find({ account: account._id, type: 'debit' }).sort({ createdAt: -1 }).limit(8);
    res.json({ previousAccounts: transactions.map(tx => tx.description.replace('Transfer to ', '')) });
  } catch (error) { res.status(500).json({ error: 'Failed to fetch previous transfers' }); }
};

module.exports = { createAccount, getMyAccount, checkBalance, getTransactionHistory, transferFunds, getTransactionStatus, getAccounts, getNameEnquiry, getPreviousTransfers };



