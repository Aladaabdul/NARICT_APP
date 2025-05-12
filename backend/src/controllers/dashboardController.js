const userModel = require("../models/userModel");
const loanModel = require("../models/loanModel");
const savingModel = require("../models/savingModel");



const userDashboard = async function (req, res) {

    if (req.user.role !== "user") {
        return res.status(403).json({message: "Access denied!"})
    }
    
    const userId = req.user.id;

    try {

        const user = await userModel
            .findOne({ _id: userId })
            .select("-password -resetToken -resetTokenExpires");

        const [saving, activeLoan] = await Promise.all([
            savingModel.findOne(
                { userId: user._id },
                { transaction: { $slice: -1 }, totalAmount: 1 }
            ),
            loanModel.findOne({ userId: user._id, status: "approved" })
        ]);

        const unpaidMonths = activeLoan ? activeLoan.monthlyInstallment.filter(installment => installment.paid === false).length: 0

        return res.status(200).json({
            totalSaving: saving ? saving.totalAmount : 0,
            LastSavingTransaction: saving ? saving.transaction : [],
            approvedLoanBalance: activeLoan ? activeLoan.repaymentAmount : 0,
            approvedLoanRecurringFee: activeLoan ? activeLoan.recurringFee: 0,
            approvedLoanFinalPayment: activeLoan ? activeLoan.finalPayment: 0,
            approvedLoanUnpaidMonths: unpaidMonths
        });

    } catch (error) {
        console.log(error)
        return res.status(500).json({message: "An error occured"})
    }
}


const adminDashboard = async function (req, res) {

    if (req.user.role !== "admin") {
        return res.status(403).json({message: "Access denied!"})
    }

    try {

        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth() + 1;

        const totalSavingsResult = await savingModel.aggregate([
            { $group: { _id: null, totalSavings: { $sum: "$totalAmount" } } }
        ]);

        const totalSavings = totalSavingsResult.length ? totalSavingsResult[0].totalSavings : 0;

        const totalApprovedLoans = await loanModel.countDocuments({ status: "approved" });

        const totalUsers = await userModel.countDocuments({ role: "user" });

        const monthlyRevenueResult = await loanModel.aggregate([
            {
                $match: {
                    status: { $in: ["approved", "completed"] },
                    $expr: {
                        $and: [
                            { $eq: [{ $year: "$createdAt" }, currentYear] },
                            { $eq: [{ $month: "$createdAt" }, currentMonth] }
                        ]
                    }
                }
            },
            {
                $group: {
                    _id: null,
                    monthlyRevenue: { $sum: "$totalInterestAmount" }
                }
            }
        ]);

        const currentMonthRevenue = monthlyRevenueResult.length ? monthlyRevenueResult[0].monthlyRevenue : 0;

        const yearlyRevenueResult = await loanModel.aggregate([
            {
                $match: {
                    status: { $in: ["approved", "completed"] },
                    $expr: { $eq: [{ $year: "$createdAt" }, currentYear] }
                }
            },
            {
                $group: {
                    _id: null,
                    yearlyRevenue: { $sum: "$totalInterestAmount" }
                }
            }
        ]);

        const currentYearRevenue = yearlyRevenueResult.length ? yearlyRevenueResult[0].yearlyRevenue : 0;

        const monthNames = [
            "January", "February", "March", "April", "May", "June",
            "July", "August", "September", "October", "November", "December"
        ];
        const currentMonthName = monthNames[currentMonth - 1];

        return res.status(200).json({
            totalSavings,
            totalApprovedLoans,
            totalUsers,
            monthlyRevenue: { [currentMonthName]: currentMonthRevenue },
            yearlyRevenue: { [currentYear]: currentYearRevenue }
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "An error occured" });
    }
}


module.exports = {

    userDashboard,
    adminDashboard
}