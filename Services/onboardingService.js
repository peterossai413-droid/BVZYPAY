require('dotenv').config();
const axios = require('axios');
const Customer = require('../Models/userModel'); // ✅ Corrected import

// --- createFintech ---
const createFintech = async (req, res) => {
  try {
    const { firstName, lastName, email, bvn, nin } = req.body;

    const config = {
      method: 'post',
      url: 'https://nibssbyphoenix.onrender.com/api/fintech/onboard',
      headers: { 'Content-Type': 'application/json' },
      data: { name: `${firstName} ${lastName}`, email }
    };

    const response = await axios.request(config);

    if (response.data.status === 'success') {
      const customer = new Customer({
        firstName,
        lastName,
        email,
        bvn,
        nin,
        verified: true
      });

      await customer.save();
      return res.status(201).json({
        message: 'Customer onboarded successfully',
        customer
      });
    } else {
      return res.status(400).json({
        message: 'Onboarding failed at external API',
        details: response.data
      });
    }
  } catch (error) {
    console.error("Onboarding error:", error.message);
    res.status(500).json({
      error: "Onboarding failed",
      details: error.response ? error.response.data : error.message
    });
  }
};

// --- createExternalAccount ---
const createExternalAccount = async (req, res) => {
  try {
    const { kycType, kycID, dob } = req.body;

    if (!kycType || !kycID || !dob) {
      return res.status(400).json({ error: "kycType, kycID, and dob are required" });
    }

    const config = {
      method: 'post',
      url: 'https://nibssbyphoenix.onrender.com/api/account/create',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.NIBSS_API_KEY}`
      },
      data: { kycType, kycID, dob }
    };

    const response = await axios.request(config);

    return res.status(201).json({
      message: "External account created successfully",
      data: response.data
    });
  } catch (error) {
    console.error("External API error:", error.message);
    return res.status(500).json({
      error: "Failed to create external account",
      details: error.response ? error.response.data : error.message
    });
  }
};

// --- loginFintech ---
const loginFintech = async () => {
  const apiKey = process.env.API_KEY; // ✅ moved to .env
  const apiSecret = process.env.API_SECRET;

  if (!apiSecret || !apiKey) {
    throw new Error("API_KEY and API_SECRET are required in environment.");
  }

  const data = JSON.stringify({ apiKey, apiSecret });

  const config = {
    method: 'post',
    url: 'https://nibssbyphoenix.onrender.com/api/auth/token',
    headers: { 'Content-Type': 'application/json' },
    data
  };

  try {
    const response = await axios.request(config);
    console.log("Login successful:", JSON.stringify(response.data));
    return response.data;
  } catch (error) {
    console.error("Login failed:", error.message);
    throw error;
  }
};

// --- insertBvn ---
const insertBvn = async (bvnData) => {
  const token = process.env.AUTH_TOKEN;
  if (!token) throw new Error("AUTH_TOKEN is required in environment.");

  const config = {
    method: 'post',
    url: 'https://nibssbyphoenix.onrender.com/api/insertBvn',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    data: JSON.stringify(bvnData)
  };

  try {
    const response = await axios.request(config);
    console.log("BVN inserted successfully:", JSON.stringify(response.data));
    return response.data;
  } catch (error) {
    console.error("Error inserting BVN:", error.message);
    throw error;
  }
};

// --- createNin ---
const createNin = async (ninData) => {
  const token = process.env.AUTH_TOKEN;
  if (!token) throw new Error("AUTH_TOKEN is required in environment.");

  const config = {
    method: 'post',
    url: 'https://nibssbyphoenix.onrender.com/api/insertNin',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    data: JSON.stringify(ninData)
  };

  try {
    const response = await axios.request(config);
    console.log("NIN inserted successfully:", JSON.stringify(response.data));
    return response.data;
  } catch (error) {
    console.error("Error inserting NIN:", error.message);
    throw error;
  }
};

// --- validateBvn ---
const validateBvn = async (bvn) => {
  const token = process.env.AUTH_TOKEN;
  if (!token) throw new Error("AUTH_TOKEN is required in environment.");

  const config = {
    method: 'post',
    url: 'https://nibssbyphoenix.onrender.com/api/validateBvn',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    data: JSON.stringify({ bvn })
  };

  try {
    const response = await axios.request(config);
    console.log("BVN validation response:", JSON.stringify(response.data));
    return response.data;
  } catch (error) {
    console.error("Error validating BVN:", error.message);
    throw error;
  }
};

// --- transferFunds ---
const transferFunds = async (transferData) => {
  const token = process.env.AUTH_TOKEN;
  if (!token) throw new Error("AUTH_TOKEN is required in environment.");

  const config = {
    method: 'post',
    url: 'https://nibssbyphoenix.onrender.com/api/transfer',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    data: JSON.stringify(transferData)
  };

  try {
    const response = await axios.request(config);
    console.log("Funds transferred successfully:", JSON.stringify(response.data));
    return response.data;
  } catch (error) {
    console.error("Error transferring funds:", error.message);
    throw error;
  }
};

// --- transactionStatus ---
const transactionStatus = async (transactionId) => {
  const token = process.env.AUTH_TOKEN;
  if (!token) throw new Error("AUTH_TOKEN is required in environment.");

  const config = {
    method: 'get',
    url: `https://nibssbyphoenix.onrender.com/api/transaction/${transactionId}`,
    headers: { 'Authorization': `Bearer ${token}` }
  };

  try {
    const response = await axios.request(config);
    console.log("Transaction status:", JSON.stringify(response.data));
    return response.data;
  } catch (error) {
    console.error("Error fetching transaction status:", error.message);
    throw error;
  }
};

// ✅ Export all functions together
module.exports = {
  createFintech,
  createExternalAccount,
  loginFintech,
  insertBvn,
  createNin,
  validateBvn,
  transferFunds,
  transactionStatus
};
