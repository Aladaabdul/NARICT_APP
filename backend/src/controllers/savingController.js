const savingModel = require("../models/savingModel");
const userModel = require("../models/userModel");
const validation = require("../config/validations");



// Make deposit function
const makeSaving = async function(req, res) {

    if (req.user.role !== "admin") {
        return res.status(403).json({error: "Access denied!"})
    }

    const { ipssNumber, amount } = req.body

    if (!amount || !ipssNumber) {
        return res.status(400).json({error: "amount and ipssNumber are required"})
    }

    try {

        if (typeof amount !== "number" || amount <= 0) {
            return res.status(400).json({error: "Invalid deposit amount"})
        }

        const User = await userModel.findOne({ipssNumber: ipssNumber});

        if (!User) return res.status(404).json({message: "No user found by this ipssNumber"})

        const saving = await savingModel.findOneAndUpdate(
            { ipssNumber },
            {
                $inc: { totalAmount: amount },
                $set: { lastUpdated: Date.now() },
                $setOnInsert: { userId: User._id, ipssNumber: ipssNumber },
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

    if (req.user.role !== "admin") {
        return res.status(403).json({error: "Access denied!"})
    }

    const { ipssNumber, amount } = req.body


    if (!amount || !ipssNumber) {
        return res.status(400).json({error: "amount and ipssNumber are required"})
    }

    try {

        if (typeof amount !== "number" || amount <= 0) {
            return res.status(400).json({error: "Invalid withdrawal amount"})
        }

        let saving = await savingModel.findOne({ ipssNumber })

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

    if (req.user.role !== "user") {
        return res.status(403).json({error: "Access denied!"})
    }

    const userId = req.user.id

    if (!userId) return res.status(400).json({error: "Access denied"})

    try {

        let saving = await savingModel
            .findOne({userId})
            .select({ transaction: { $slice: -20 } });

        if (!saving) {
            return res.status(404).json({error: "No saving found for this user"})
        }

        res.status(200).json({
            message: "User transactions retrieved successfully",
            transactions: saving.transaction
        })

    }
    catch (error) {
        console.log(error)
        return res.status(500).json({error: "Server Error"})
    }
}


// Users get their saving
const getSaving = async function(req, res) {

    if (req.user.role !== "user") {
        return res.status(403).json({error: "Access denied!"})
    }

    const userId = req.user.id;
    
    if (!userId) return res.status(400).json({error: "Access denied"})
    
    try {
    
        const saving = await savingModel.findOne({userId: userId}).select("-transaction")
    
        if (!saving) {
            return res.status(404).json({message: "No savng found for this user"})
        }
    
        return res.status(200).json({
            message: "User saving retrieved successfully",
            saving: saving
        })
    
    } catch (error) {
        console.log(error)
        return res.status(500).json({error: "Unable to retrieve user saving"})
    }
};


// Get user saving function using user ipssNumber by admin
const getUserSaving = async function(req, res) {

    if (req.user.role !== "admin") {
        return res.status(403).json({error: "Access denied!"})
    }

    const valid = validation.ValidateIpss(req.body)

    if (valid.error) return res.status(400).json({
        error: valid.error.details.map(detail => detail.message)
    })

    const { ipssNumber } = req.body;

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


// Get 20 recently created savings
const getAllSavings = async function(req, res) {

    if (req.user.role !== "admin") {
        return res.status(403).json({error: "Access denied"})
    }

    try {

        const savings = await savingModel.aggregate([

            { $sort: { lastUpdated: -1 } },
            { $limit: 20 },

            {
                $lookup: {
                    from: "users",
                    localField: "userId",
                    foreignField: "_id",
                    as: "user"
                }
            },

            { $unwind: "$user" },
            
            {
                $addFields: {
                    latestTransaction: { $arrayElemAt: [{ $sortArray: { input: "$transaction", sortBy: { date: -1 } } }, 0] }
                }
            },

            {
                $project: {
                    _id: 1,
                    ipssNumber: 1,
                    "user.fullName": 1,
                    lastUpdated: 1,
                    totalAmount: 1,
                    userId: 1,
                    transaction: { $cond: { if: { $gt: [{ $size: "$transaction" }, 0] }, then: ["$latestTransaction"], else: [] } }
                }
            }
        ]);

        if (!savings || savings.length === 0) {
            return res.status(404).json({message: "No saving found"})
        }

        return res.status(200).json({savings: savings})

    } catch (error) {
        console.log(error)
        return res.status(500).json({message: "Unable to get savings"})
    }
}



module.exports = {
    makeSaving,
    withdrawSaving,
    getTransactions,
    getUserSaving,
    getSaving,
    getAllSavings
}