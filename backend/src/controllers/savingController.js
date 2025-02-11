const savingModel = require("../models/savingModel");
const userModel = require("../models/userModel");



// Make deposit function
const makeSaving = async function(req, res) {

    const { amount } = req.body

    if (req.user.role !== "user") {
        return res.status(403).json({error: "Access denied! Login With User Account"})
    }

    if (!amount) {
        return res.status(400).json({error: "amount is required"})
    }

    const userId = req.user.id

    if (!userId) return res.status(400).json({error: "Access denied"})

    try {

        if (typeof amount !== "number" || amount <= 0) {
            return res.status(400).json({error: "Invalid deposit amount"})
        }

        const User = await userModel.findOne({_id: userId});

        const saving = await savingModel.findOneAndUpdate(
            { userId },
            {
                $inc: { totalAmount: amount },
                $set: { lastUpdated: Date.now() },
                $setOnInsert: { userId, ipssNumber: User.ipssNumber },
                $push: { transaction: { type: "deposit", amount, date: Date.now() } }
            },
            { new: true, upsert: true }
        );

        return res.status(200).json({
            message: "Deposit successful",
            totalSavings: saving.totalAmount
        })
    }
    catch (error) {
        console.log("Error during saving", error)
        return res.status(500).json({error: "Server Error"})
    }
}


// Withdraw saving function
const withdrawSaving = async function(req, res) {

    const { amount } = req.body

    if (req.user.role !== "user") {
        return res.status(403).json({error: "Access denied! Login With User Account"})
    }

    if (!amount) {
        return res.status(400).json({error: "amount is required"})
    }

    const userId = req.user.id

    if (!userId) return res.status(400).json({error: "Access denied"})

    try {

        if (typeof amount !== "number" || amount <= 0) {
            return res.status(400).json({error: "Invalid withdrawal amount"})
        }

        let saving = await savingModel.findOne({userId})

        if (!saving) {
            return res.status(404).json({error: "No saving found for this user"})
        }

        if (saving.totalAmount < amount) {
            return res.status(400).json({
                message: "Insufficient savings",
                currentSavings: saving.totalAmount
            })
        }

        saving.totalAmount -= amount
        saving.lastUpdated = Date.now()
        saving.transaction.push({ type: "withdrawal", amount: amount, date: Date.now()})

        await saving.save();

        return res.status(200).json({
            message: "Withdrawal successful",
            remainingSavings: saving.totalAmount
        })
    } 
    catch (error) {
        console.log("Error during withdrawal", error)
        return res.status(500).json({error: "Server Error"})
    }
}


// Get user transaction function
const getTransactions = async function(req, res) {

    const userId = req.user.id

    try {

        let saving = await savingModel.findOne({userId})

        if (!saving) {
            return res.status(404).json({error: "No saving found for this user"})
        }

        res.status(200).json({
            message: "User transactions retrieved successfully",
            transaction: saving.transaction
        })

    }
    catch (error) {
        console.log(error)
        return res.status(500).json({error: "Server Error"})
    }
}


// Get user saving function
const getUserSaving = async function(req, res) {

    const { ipssNumber } = req.body;

    if (!ipssNumber) {
        return res.status(400).json({error: "ipssNumber is required"})
    }

    if (req.user.role !== "admin") {
        return res.status(403).json({error: "Access denied!"})
    }

    try {

        let saving = await savingModel.findOne({ ipssNumber })

        if (!saving) {
            return res.status(404).json({error: "No saving found for this user"})
        }

        res.status(200).json({
            message: "User saving retrieved successfully",
            saving: saving
        })

    }
    catch (error) {
        console.log(error)
        return res.status(500).json({error: "Server Error"})
    }
}




module.exports = {
    makeSaving,
    withdrawSaving,
    getTransactions,
    getUserSaving
}