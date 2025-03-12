const userModel = require("../models/userModel");
const savingModel = require("../models/savingModel");
const loanModel = require("../models/loanModel");
const bcrypt = require("bcryptjs");
require("dotenv").config();
const uuid = require("uuid")
const nodemailer = require("nodemailer")
const jwt = require("jsonwebtoken");
const validation = require("../config/validations");
const passwordConfig = require("../config/password")

const secretKey = process.env.SECRET_KEY


// Create An admin function
const registerAdmin = async function (req, res) {

    const valid = validation.ValidateUserData(req.body, "admin")

    if (valid.error) return res.status(400).json({
        error: valid.error.details.map(detail => detail.message)})

    const { fullName, ipssNumber, phoneNumber } = req.body;

    const MAX_ADMINS = process.env.MAX_ADMINS || 3

    try {
        
        const existingUser = await userModel.findOne({
            $or: [{ipssNumber}, {phoneNumber}]
        })

        if (existingUser) {
            return res.status(403).json({error: "User with provided ipssNumber or phone Number already exist"})
        }
        
        const existingAdmin = await userModel.find({role: "admin"});

        const adminCount = existingAdmin.filter(admin => admin.role === 'admin').length
        
        if (adminCount >= MAX_ADMINS) {

            return res.status(403).json({message: `Admin account can't exceed ${MAX_ADMINS}`})
        }

        const hashedpassword = await bcrypt.hash(phoneNumber, 10)

        const user = new userModel({
            fullName,
            role: "admin",
            ipssNumber,
            phoneNumber,
            password: hashedpassword
        })

        await user.save();

        return res.status(201).json({message: "Admin account register successfully"})
    } catch (error) {
        console.log(error)
        return res.status(500).json({error: "Admin resgistration unsuccessful"})
    }

}



// Register user by an admin function
const registerUser = async function (req, res) {

    const valid = validation.ValidateUserData(req.body, "user")

    if (req.user.role !== 'admin') {
        return res.status(403).json({message: 'Access denied'});
    }

    if (valid.error) return res.status(400).json({
        error: valid.error.details.map(detail => detail.message)})

    const { fullName, ipssNumber, phoneNumber } = req.body

    try {

        const existingUser = await userModel.findOne({
            $or: [{ipssNumber}, {phoneNumber}]
        })

        if (existingUser) {
            return res.status(403).json({error: "User with provided ipssNumber or phone Number already exist"})
        }

        // const tempPassword = passwordConfig.generatePassword();

        const hashedpassword = await bcrypt.hash(phoneNumber, 10)

        const user = new userModel({
            fullName,
            ipssNumber,
            role: "user",
            phoneNumber,
            password: hashedpassword
        })

        await user.save();

        return res.status(201).json({message: "User account register successfully"})

    } catch (error) {
        console.log(error)
        return res.status(500).json({"error": "User registration unsuccessful"})
    }
}


// Login function
const loginUser = async function (req, res) {

    const valid = validation.ValidateLoginData(req.body)

    if (valid.error) return res.status(400).json({
        error: valid.error.details.map(detail => detail.message)})
    
    const { password, ipssNumber } = req.body

    try {

        const existingUser = await userModel.findOne({ ipssNumber })

        if (!existingUser) return res.status(404).json({message: "No user found by this ipssNumber. Sign up!"})

        const comparePassword =  await bcrypt.compare(password, existingUser.password)

        if (!comparePassword) return res.status(400).json({message: "Incorrect password or ipssNumber provided"})

        const token = jwt.sign({id: existingUser.id, role: existingUser.role, email: existingUser.email}, secretKey, {expiresIn: '1hr'})

        return res.status(200).json({
            message: "Login Successfully",
            role: existingUser.role,
            fullName: existingUser.fullName,
            token
        })
    }
    catch (error) {
        console.log(error)
        return res.status(500).json({message: "Login Unsuccessful"})
    }
}


// Change password by user function
const changePassword = async function (req, res) {

    const valid = validation.ValidateChangePassword(req.body)

    if (valid.error) return res.status(400).json({
        error: valid.error.details.map(detail => detail.message)})

    const { oldPassword, newPassword } = req.body;

    const userId = req.user.id;

    if (!userId) {
        return res.status(403).json({error: "Access denied!"})
    }

    try {
        const existingUser = await userModel.findOne({_id: userId})

        if (!existingUser) {
            return res.status(404).json({error: "User not found"})
        }

        const comparePassword = await bcrypt.compare(oldPassword, existingUser.password)

        if (!comparePassword) {
            return res.status(403).json({error: "Old password does not match! Input correct Password"})
        }

        const hashedpassword = await bcrypt.hash(newPassword, 10)
        existingUser.password = hashedpassword;
        await existingUser.save();

        return res.status(200).json({message: "Password changed successfully"})

    } catch (error) {
        console.log(error)
        return res.status(500).json({message: "Unable to change password"})
    }
}

// Commented out to allow admin to reset users password

// // Forgot password function
// const forgotPassword = async function (req, res) {

//     const valid = validation.ValidateForgotPassword(req.body)

//     if (valid.error) return res.status(400).json({
//         error: valid.error.details.map(detail => detail.message)
//     })

//     const { email } = req.body;

//     try{

//         const existingUser = await userModel.findOne({email})

//         if (!existingUser) {
//             return res.status(404).json({error: "No user found by this email"})
//         }

        
//         if (existingUser) {
//             const token = uuid.v4();
//             existingUser.resetToken = token;
//             existingUser.resetTokenExpires = Date.now() + 3600000;

//             const transporter = nodemailer.createTransport({
//                 service: 'gmail',
//                 auth: {
//                     user: process.env.EMAIL,
//                     pass:process.env.PASSWORD

//                 }
//             })

//             const mailOptions = {
//                 from: process.env.EMAIL,
//                 to: existingUser.email,
//                 subject: `${existingUser.fullName}, Reset Your Password for Your Account`,
//                 html: `
//                 <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
//                   <h2>Password Reset </h2>
//                   <p>Hello, ${existingUser.fullName}</p>
//                   <p>You have requested to reset your password. Click on the button below to proceed:</p>
//                   <a href="http://localhost:3000/reset-password?token=${token}" 
//                      style="display: inline-block; padding: 10px 20px; font-size: 16px; color: #fff; background-color: #007BFF; text-decoration: none; border-radius: 5px;">
//                      Reset Password
//                   </a>
//                   <p>If you did not request a password reset, please ignore this email.</p>
//                   <p>Thank you,<br>NARICT SAVINGS AND LOAN SCHEME</p>
//                 <hr style="border: 0; border-top: 1px solid #eee; margin: 40px 0;">
//                 </div>
//             `
//             };

//             transporter.sendMail(mailOptions,  async (error, info) => {
//                 if (error) {
//                     console.log(error);
//                     return res.status(500).json({ message: "Failed to send password reset email" });
//                 }

//                 await existingUser.save()

//                 return res.status(200).json({ message: 'Password reset email sent successfully' });
//             });
//         }

//     } catch (error) {
//         console.log(error)
//     }
// }


// // Reset password function
// const resetPassword = async function (req, res) {

//     const valid = validation.ValidateResetData(req.body);

//     if (valid.error) return res.status(400).json({
//         error: valid.error.details.map(detail => detail.message)
//     })

//     const { token, newPassword} = req.body;

//     try {

//         const existingUser = await userModel.findOne({
//             resetToken: token,
//             resetTokenExpires: { $gt: Date.now() }
//         })

//         if (!existingUser) return res.status(400).json({error: "Invalid or expired token"})

//         const hashedpassword = await bcrypt.hash(newPassword, 10)
//         existingUser.password = hashedpassword
//         existingUser.resetToken = undefined
//         existingUser.resetTokenExpires = undefined

//         await existingUser.save()

//         return res.status(200).json({message: "Password changed successfully"})

//     } catch (error) {
//         console.log(error)
//     }
// }


// Reset user password by an Admin function
const resetPassword = async function (req, res) {

    if (req.user.role !== "admin") {
        return res.status(403).json({error: "Access denied!"})
    }

    const valid = validation.ValidateResetData(req.body);

    if (valid.error) return res.status(400).json({
        error: valid.error.details.map(detail => detail.message)
    })

    const { ipssNumber, newPassword } = req.body;

    try {

        const existingUser = await userModel.findOne({ ipssNumber })

        if (!existingUser) {
            return res.status(404).json({message: "No user found with this ipssNumber"})
        }

        const hashedpassword = await bcrypt.hash(newPassword, 10);
        existingUser.password = hashedpassword;

        await existingUser.save()

        return res.status(200).json({message: "User password reset successful"})

    } catch (error) {
        console.log(error)
        return res.status(500).json({message: "Unable to reset user password"})
    }
}


// Search user function using query parameter
const searchUser =  async function (req, res) {

    if (req.user.role !== "admin") {
        return res.status(403).json({error: "Access denied!"})
    }

    const { fullName, ipssNumber} = req.query;

    try {

        const filter = {};

        if (ipssNumber) filter.ipssNumber = ipssNumber;
        if (fullName) filter.fullName = { $regex: fullName, $options: "i" };

        const user = await userModel
            .findOne( filter )
            .select("-password -resetToken -resetTokenExpires")

        if (!user) return res.status(404).json({error: "No user found"})

        const [saving, activeLoan] = await Promise.all([
            savingModel.findOne(
                { userId: user._id },
                { transaction: { $slice: -1 }, totalAmount: 1 }
            ),
            loanModel.findOne({ userId: user._id, status: "approved" })
        ]);
        
        return res.status(200).json({
        user: user,
        totalSaving: saving ? saving.totalAmount : 0,
        LastSavingTransaction: saving ? saving.transaction : [],
        approvedLoan: activeLoan || null
    });

    } catch (error) {
        console.log(error)
        return res.status(500).json({error: "Unable to get user"})
    }
};


// Get list of users details 
const getUsers = async function (req, res) {

    if (req.user.role !== "admin") {
        return res.status(403).json({error: "Access denied!"})
    }

    try {

        const users = await userModel
            .find({role: { $ne: "admin"} })
            .sort({ createdAt: -1 })
            .limit(20)
            .select("-password -resetToken -resetTokenExpires")

        if (!users || users.length === 0) {
            return res.status(404).json({message: "No user found"})
        }

         // Fetch total savings and active loans for each user in parallel
         const userDetails = await Promise.all(
            users.map(async (user) => {
                const [saving, activeLoan] = await Promise.all([
                    savingModel.findOne(
                        { userId: user._id },
                        { transaction: { $slice: -1 }, totalAmount: 1 }
                    ),
                    loanModel.findOne({ userId: user._id, status: "approved" })
                ]);

                return {
                    ...user.toObject(), // Convert Mongoose document to plain object
                    totalSaving: saving ? saving.totalAmount : 0,
                    lastSavingTransaction: saving ? saving.transaction : [],
                    approvedLoan: activeLoan || null,
                };
            })
        );

        return res.status(200).json({users: userDetails})

    } catch (error) {
        console.log(error)
        return res.status(500).json({error: "Unable to get users"})
    }
}


// Get user info using ipssNumber
const getUserInfo = async function (req, res) {

    if (req.user.role !== "admin") {
        return res.status(403).json({error: "Access denied!"})
    }

    const { ipssNumber } = req.body

    try {

        const user = await userModel
            .findOne({ ipssNumber })
            .select("-password -resetToken -resetTokenExpires")

        if (!user) return res.status(404).json({error: "No user found"})

        const [saving, activeLoan] = await Promise.all([
            savingModel.findOne(
                { userId: user._id },
                { transaction: { $slice: -1 }, totalAmount: 1 }
            ),
            loanModel.findOne({ userId: user._id, status: "approved" })
        ]);
        
        return res.status(200).json({
        user: user,
        totalSaving: saving ? saving.totalAmount : 0,
        lastSavingTransaction: saving ? saving.transaction : [],
        approvedLoan: activeLoan || null
    });

    } catch (error) {
        console.log(error)
        return res.status(500).json({error: "Unable to get user"})
    }
}


module.exports = {

    registerAdmin,
    registerUser,
    loginUser,
    changePassword,
    resetPassword,
    searchUser,
    getUsers,
    getUserInfo
}