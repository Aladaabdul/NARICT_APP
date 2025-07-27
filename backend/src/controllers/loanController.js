const loanModel = require("../models/loanModel");
const userModel = require("../models/userModel");
const { calculateLoanInterest } = require("../config/loanInterest");
const validation = require("../config/validations");
const { sendLoanXlsxFile } = require("../config/fileResponse");




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
            approvedLoan.monthlyInstallment.forEach(installment => installment.paidAt = Date.now())
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
            { status: status, updatedAt: Date.now() },
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
            .sort({ updatedAt: -1 })

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
                installment.paidAt = Date.now()
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
        
        loan.updatedAt = Date.now()

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
            currentInstallment.penaltyAppliedAt = Date.now()
            loan.updatedAt = Date.now();
    
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



const getLoanStats = async function(req, res) {

    if (req.user.role !== "admin") {
        return res.status(403).json({error: "Access denied"})
    }

    try {

        const now = new Date();

        const { range } = req.query; // e.g. "today", "week", "month"

        let startDate, endDate;

        switch (range) {

        case "today":
            startDate = new Date(); startDate.setHours(0, 0, 0, 0);
            endDate = new Date(); endDate.setHours(23, 59, 59, 999);
            break;

        case "week":
            startDate = new Date(now); startDate.setDate(now.getDate() - now.getDay());
            startDate.setHours(0, 0, 0, 0);
            endDate = new Date(startDate); endDate.setDate(startDate.getDate() + 6);
            endDate.setHours(23, 59, 59, 999);
            break;

        case "month":
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            endDate.setHours(23, 59, 59, 999);
            break;

        default:
            startDate = null; endDate = null;
        }

        const matchStage = {};
        if (startDate && endDate) {
            matchStage.updatedAt = { $gte: startDate, $lte: endDate };
        }

        const loans = await loanModel.aggregate([

            { $match: matchStage },
            { $sort: { updatedAt: -1 } },
            

            {
                $project: {
                    _id: 1,
                    createdAt: 1,
                    ipssNumber: 1,
                    fullName: 1,
                    amount: 1,
                    term_month: 1,
                    status: 1,
                    totalInterestAmount: 1,
                    repaymentAmount: 1,
                    updatedAt: 1,
                    recurringFee: 1,
                    finalPayment: 1
                }
            }
        ]);

        if (!loans || loans.length === 0) {
            return res.status(404).json({message: "No loan found"})
        }

        const baseName = `loans_stats_${now.toISOString().slice(0,10)}`

        return await sendLoanXlsxFile(res, loans, baseName);

    } catch (error) {
        console.log(error)
        return res.status(500).json({message: "Unable to get loans stats"})
    }
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
    getLoansByStatus,
    getLoanStats
}

