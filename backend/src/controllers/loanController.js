const loanModel = require("../models/loanModel");
const userModel = require("../models/userModel");
const { calculateLoanInterest } = require("../config/loanInterest");
const validation = require("../config/validations");




// get Loan terms Function
const calculateLoanTerms = async function (req, res) {

    if (req.user.role !== 'admin') {
        return res.status(403).json({message: "Access denied!"})
    }
    
    const { amount, term_month, ipssNumber } = req.body;

    if (!amount || !term_month || !ipssNumber) {
    return res.status(400).json({error: "amount, term_month and ipssNumber are required"})
    }
    
    try {
    
        if (typeof amount !== "number" || amount <= 0 || typeof term_month !== "number" || term_month <= 0) {
            return res.status(400).json({error: "Invalid loan amount or term_month"})
        }
        
        const loans = await loanModel.find({ ipssNumber })

        const activeLoan = loans.some(loan => loan.status !== 'paid')

        if (activeLoan) {
            return res.status(400).json({
                error: "You still have an active loan! Please pay up to take another Loan"
            })
        }

        const loanTerms = calculateLoanInterest(amount, term_month);

        return res.status(200).json({
            message: "Loan terms",
            loanTerms: loanTerms
        })
    } 
    catch (error) {
        console.log(error);
        return res.status(500).json({error: "Unable to get loan terms"})
    }
}

// Create a new loan function
const createLoan = async function (req, res) {

    const { amount, term_month, ipssNumber } = req.body;

    if (req.user.role !== 'admin') {
        return res.status(403).json({message: "Access denied!"})
    }

    if (!amount || !term_month || !ipssNumber) {
    return res.status(400).json({error: "amount, term_month and ipssNumber are required"})
    }
    
    try {
    
        if (typeof amount !== "number" || amount <= 0 || typeof term_month !== "number" || term_month <= 0) {
            return res.status(400).json({error: "Invalid loan amount or term_month"})
        }
        
        const user = await userModel.findOne({ ipssNumber })

        if (!user) return res.status(404).json({message: "No user found by this ipssNumber"})

        const loans = await loanModel.find({ ipssNumber })

        const activeLoan = loans.some(loan => loan.status !== 'paid')

        if (activeLoan) {
            return res.status(400).json({
                error: "You still have an active loan! Please pay up to take another Loan"
            })
        }

        const loanTerms = calculateLoanInterest(amount, term_month);

        const loan = new loanModel({
            userId: user._id,
            fullName: user.fullName,
            ipssNumber: user.ipssNumber,
            amount,
            term_month,
            status: "active",
            totalInterest: loanTerms.totalInterest,
            interestAmount: loanTerms.interestAmount,
            repaymentAmount: loanTerms.repaymentAmount,
            recurringFee: loanTerms.recurringFee,
            finalPayment: loanTerms.finalPayment,
            monthlyInstallment: loanTerms.installments
        })

        await loan.save();

        return res.status(200).json({
            message: "Loan created successfully",
            loan: loan
        })
    } 
    catch (error) {
        console.log(error);
        return res.status(500).json({error: "Unable to create loan"})
    }
}


// Get User Active Loan
const getActiveLoan = async function (req, res) {

    if (req.user.role !== 'user') {
        return res.status(403).json({message: "Access denied! Login with a user account"})
    }

    const userId = req.user.id;

    if (!userId) return res.status(400).json({error: "Access denied"})

    try {

        const loan = await loanModel.findOne({userId: userId, status: "active"})

        if (!loan) {
            return res.status(404).json({message: "No active loan found"})
        }

        return res.status(200).json({
            message: "Active loan retrieved successfully",
            activeLoan: loan
        })

    } catch (error) {
        console.log(error)
        return res.status(500).json({error: "Unable to retrieve user loan"})
    }
}


// Get user active loan by admin using user ipssNumber
const getUserActiveLoan = async function (req, res) {

    if (req.user.role !== 'admin') {
        return res.status(403).json({message: "Access denied"})
    }

    const valid = validation.ValidateIpss(req.body)

    if (valid.error) return res.status(400).json({
        error: valid.error.details.map(detail => detail.message)
    })

    const  { ipssNumber } = req.body;

    try {

        const user = await userModel.findOne({ ipssNumber })

        if (!user) return res.status(404).json({message: "No user found by this ipssNumber"})

        const loan = await loanModel.findOne({ipssNumber: ipssNumber, status: 'active'})

        if (!loan) {
            return res.status(404).json({
                message: "No active loan found for user with this ipssNumber"
            })
        }

        return res.status(200).json({
            message: "Active loan retrieved successfully",
            activeLoan: loan
        })

    } catch(error) {
        console.log(error)
        return res.status(500).json({error: "Unable to retrieve user loan"})
    }

}

// Get all user loan (Both paid and active) by admin using user ipssNumber
const getAllUserLoan = async function (req, res) {

    if (req.user.role !== 'admin') {
        return res.status(403).json({message: "Access denied"})
    }
    
    const valid = validation.ValidateIpss(req.body)

    if (valid.error) return res.status(400).json({
        error: valid.error.details.map(detail => detail.message)
    })

    const  { ipssNumber } = req.body;

    try {

        const user = await userModel.findOne({ ipssNumber })

        if (!user) return res.status(404).json({message: "No user found by this ipssNumber"})

        const loan = await loanModel.find({ipssNumber: ipssNumber})

        if (!loan || loan.length === 0) {
            return res.status(404).json({
                message: "No loan found for user with this ipssNumber"
            })
        }

        return res.status(200).json({
            message: "Loan retrieved successfully",
            activeLoan: loan
        })

    } catch(error) {
        console.log(error)
        return res.status(500).json({error: "Unable to retrieve user loan"})
    }

}


module.exports = {
    calculateLoanTerms,
    createLoan,
    getActiveLoan,
    getUserActiveLoan,
    getAllUserLoan
}

