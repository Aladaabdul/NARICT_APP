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

        const user = await userModel.findOne({ ipssNumber })

        if (!user) return res.status(404).json({message: "No user found by this ipssNumber"})
        
        const loans = await loanModel.find({ ipssNumber })

        const hasPendingLoan = loans.some(loan => loan.status === "pending");
        const approvedLoan = loans.find(loan => loan.status === "approved");

        if (hasPendingLoan) {
            return res.status(400).json({
                error: "You have a pending loan! Please wait for approval or rejection before requesting another loan."
            });
        }

        let loanTerms;
        let totalAmount = amount;

        if (approvedLoan) {
            totalAmount += approvedLoan.repaymentAmount;
        }

        loanTerms = calculateLoanInterest(totalAmount, term_month);

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
        
        const user = await userModel.findOne({ ipssNumber })

        if (!user) return res.status(404).json({message: "No user found by this ipssNumber"})

        const loans = await loanModel.find({ userId: user._id })

        const hasPendingLoan = loans.some(loan => loan.status === "pending");
        const approvedLoan = loans.find(loan => loan.status === "approved");

        if (hasPendingLoan) {
            return res.status(400).json({
                error: "You have a pending loan! Please wait for approval or rejection before requesting another loan."
            });
        }

        let totalAmount = amount;
        let loanTerms;
        let loanStatus = "pending"

        if (approvedLoan) {
            totalAmount += approvedLoan.repaymentAmount;
            approvedLoan.monthlyInstallment.forEach(installment => installment.paid = true)
            approvedLoan.status = "completed"
            await approvedLoan.save();
            loanStatus = "approved";
        }

        loanTerms = calculateLoanInterest(totalAmount, term_month);

        const loan = new loanModel({
            userId: user._id,
            fullName: user.fullName,
            ipssNumber: user.ipssNumber,
            amount,
            term_month,
            status: loanStatus,
            totalInterest: loanTerms.totalInterest,
            interestAmount: loanTerms.interestAmount,
            totalInterestAmount: loanTerms.totalInterestAmount,
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


const updateLoanStatus = async function (req, res) {

    if (req.user.role !== 'admin') {
        return res.status(403).json({message: "Access denied!"})
    }

    const { ipssNumber, status } = req.body;

    if (!["approved", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid status. Status must be 'approved' or 'rejected' " });
    }

    try {

        const userPendingLoan = await loanModel.findOneAndUpdate(
            { ipssNumber, status: "pending" },
            { status: status },
            { new: true }
        )

        if (!userPendingLoan) {
            return res.status(400).json({message: "No pending loan found to update"})
        }

        return res.status(200).json({
            message: `Loan status updated to '${status}' successfully`,
            updatedLoan: userPendingLoan
        })

    } catch (error) {
        console.log(error);
        return res.status(500).json({message: "Unable to update loan status"})
    }
};


// Get all loan by status
const getLoansByStatus = async function (req, res) {

    if (req.user.role !== "admin") {
        return res.status(403).json({ message: "Access denied!" })
    }
    
    const { status } = req.body;

    if (!["approved", "rejected", "pending", "completed"].includes(status)) {
        return res.status(400).json({
             message: "Invalid status. Status must be 'approved' or 'rejected' or 'pending', 'completed' " 
        });
    }

    try {

        const Loans = await loanModel
            .find({ status: status })
            .sort({ createdAt: -1 })

        if (!Loans || Loans.length === 0) {
            return res.status(404).json({message: `No ${status} loans found`})
        }

        return res.status(201).json({
            message: `${status} Loans`,
            Loans
        });

    } catch (error) {
        console.log(error)
        return res.status(500).json({message: `Unable to get ${status} loan`})
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

        const loan = await loanModel.findOne({userId: userId, status: "approved"})

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

        const loan = await loanModel.findOne({ipssNumber: ipssNumber, status: 'approved'})

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

// Get all user loan history by admin using user ipssNumber
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
            Loans: loan
        })

    } catch(error) {
        console.log(error)
        return res.status(500).json({error: "Unable to retrieve user loan"})
    }

}

// Repayment function
const loanRepayment = async function (req, res) {

    if (req.user.role !== "admin") {
        return res.status(403).json({message: "Access denied"})
    }

    const { ipssNumber, amount } = req.body;

    if (!amount || !ipssNumber) {
        return res.status(400).json({error: "amount and ipssNumber are required"})
    }

    if (typeof amount !== "number" || amount <= 0) {
        return res.status(400).json({error: "Invalid amount"})
    }

    try {

        const user = await userModel.findOne({ ipssNumber })

        if (!user) return res.status(404).json({message: "No user found by this ipssNumber"})

        const loan = await loanModel.findOne({ ipssNumber, status: "approved" })

        if (!loan) {
            return res.status(404).json({
                message: "No active loan found for user with this ipssNumber"
            })
        }

        let remainingPayment = amount

        // sort installments
        loan.monthlyInstallment.sort((a,b) => a.month - b.month)

        for (let installment of loan.monthlyInstallment) {

            if (remainingPayment <= 0) break;

            if (installment.paid) continue;

            if (remainingPayment >= installment.amount) {
                remainingPayment -= installment.amount
                installment.paid = true;
            }
            else {
                installment.amount -= remainingPayment;
                remainingPayment = 0;
            }
        }

        loan.repaymentAmount -= amount
        if (loan.repaymentAmount <= 0) {
            loan.repaymentAmount = 0;
            loan.status = "completed"
        }

        await loan.save();

        return res.status(200).json({
            message: "Payment successful",
            balance: loan.repaymentAmount,
            installments: loan.monthlyInstallment
        })
    }
    catch(error) {
        console.log(error)
        return res.status(500).json({error: "Unable to make payment"})
    }
}


const checkMonthlyInstallment = async function (req, res) {

    let updatedLoans = [];

    const loans = await loanModel.find({status: "approved"});

    for (let loan of loans) {

        const today = new Date();
        const loanStartDate = new Date(loan.createdAt)

        const dayOfMonth = today.getDate();
        const createdDay = loanStartDate.getDate();

        const monthsPassed = 
            (today.getFullYear() - loanStartDate.getFullYear()) * 12 + 
            (today.getMonth() - loanStartDate.getMonth())

        if (monthsPassed < 1 || dayOfMonth < createdDay) continue

        loan.monthlyInstallment.sort((a,b) => a.month - b.month)

        const currentInstallment = loan.monthlyInstallment.find(
            (inst) => inst.month === monthsPassed
        )

        if (currentInstallment && !currentInstallment.paid && !currentInstallment.penaltyApplied) {

            const penalty = loan.recurringFee * 0.05
            const lastIndex = loan.monthlyInstallment.length - 1
            loan.monthlyInstallment[lastIndex].amount += penalty
            loan.totalInterestAmount += penalty
            loan.finalPayment += penalty
            loan.repaymentAmount += penalty
            currentInstallment.penaltyApplied = true;
    
            await loan.save();
            updatedLoans.push({
                loanId: loan._id,
                newTotal: loan.repaymentAmount
            });
        }
    }
    return res.status(200).json({
        message: "Penalties applied successfully",
        updatedLoans: updatedLoans
    })
}




module.exports = {
    calculateLoanTerms,
    createLoan,
    getActiveLoan,
    getUserActiveLoan,
    getAllUserLoan,
    loanRepayment,
    checkMonthlyInstallment,
    updateLoanStatus,
    getLoansByStatus
}

