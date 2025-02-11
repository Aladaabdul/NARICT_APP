const loanModel = require("../models/loanModel");
const userModel = require("../models/userModel");
const { calculateLoanInterest } = require("../config/loanInterest");




// get Loan terms Function
const calculateLoanTerms = async function (req, res) {
    
    const { amount, term_month } = req.body;

    const userId = req.user.id;

    if (!amount || !term_month) {
    return res.status(400).json({error: "amount and term_month are required"})
    }
    
    try {
    
        if (typeof amount !== "number" || amount <= 0 || typeof term_month !== "number" || term_month <= 0) {
            return res.status(400).json({error: "Invalid loan amount or term_month"})
        }
        
        const loans = await loanModel.find({ userId })

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


const createLoan = async function (req, res) {

    const { amount, term_month } = req.body;

    if (req.user.role !== 'user') {
        return res.status(403).json({message: "Access denied! Login with a user account"})
    }

    const userId = req.user.id;

    if (!amount || !term_month) {
    return res.status(400).json({error: "amount and term_month are required"})
    }
    
    try {
    
        if (typeof amount !== "number" || amount <= 0 || typeof term_month !== "number" || term_month <= 0) {
            return res.status(400).json({error: "Invalid loan amount or term_month"})
        }

        const user = await userModel.findOne({_id: userId})

        if (!user) return res.status(404).json({error: "No user found"})
        
        const loans = await loanModel.find({ userId })

        const activeLoan = loans.some(loan => loan.status !== 'paid')

        if (activeLoan) {
            return res.status(400).json({
                error: "You still have an active loan! Please pay up to take another Loan"
            })
        }

        const loanTerms = calculateLoanInterest(amount, term_month);

        const loan = new loanModel({
            userId: userId,
            fullName: user.fullName,
            ipssNumber: user.ipssNumber,
            amount,
            term_month,
            status: "active",
            totalInterest: loanTerms.totalInterest,
            interestAmount: loanTerms.interestAmount,
            repaymentAmount: loanTerms.repaymentAmount,
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


module.exports = {
    calculateLoanTerms,
    createLoan
}

