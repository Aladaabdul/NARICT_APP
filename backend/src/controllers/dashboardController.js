const userModel = require("../models/userModel");
const loanModel = require("../models/loanModel");
const savingModel = require("../models/savingModel");
const { sendGeneralStatsXlsxFile } = require("../config/fileResponse");



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


const generalStats = async function (req, res) {

    if (req.user.role !== "admin") {
        return res.status(403).json({error: "Access denied!"})
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

        const [users, savings, loans] = await Promise.all([

            userModel.aggregate([

                { 
                    $match: {
                        ...matchStage,
                        role: { $ne: "admin" }
                    }
                },
                { $sort: { createdAt: -1 } },

                {
                    $project: {
                        fullName: 1,
                        role: 1,
                        ipssNumber: 1,
                        phoneNumber: 1,
                        email: 1,
                        createdAt: 1
                    }
                }
            ]),
            savingModel.aggregate([

                { $match: matchStage },
                { $sort: { lastUpdated: -1 } },

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
                    $project: {
                        _id: 1,
                        ipssNumber: 1,
                        "user.fullName": 1,
                        lastUpdated: 1,
                        totalAmount: 1,
                        userId: 1,
                        transaction: 1
                    }
                }
            ]),
            loanModel.aggregate([
            
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
            ])
        ])

        const totalUsers = users.length;

        const totalSavingsAmount = savings.reduce((sum, s) => sum + (s.totalAmount || 0), 0);

        const activeLoansCount = loans.filter(l => l.status === "approved").length;

        const completedLoansCount = loans.filter(l => l.status === "completed").length;

        summary = {
            totalUsers,
            totalSavingsAmount,
            activeLoansCount,
            completedLoansCount
        }

        const baseName = `general_stats_${now.toISOString().slice(0,10)}`

        return await sendGeneralStatsXlsxFile(res, {
            summary,
            users,
            savings,
            loans
        }, baseName);

    } catch (error) {
        console.error(error)
        return res.status(500).json({ message: "Unable get general stats" })
    }
}


module.exports = {

    userDashboard,
    adminDashboard,
    generalStats
}