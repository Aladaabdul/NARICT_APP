const userModel = require("../models/userModel");
const bcrypt = require("bcryptjs");
require("dotenv").config();
const uuid = require("uuid")
const nodemailer = require("nodemailer")
const jwt = require("jsonwebtoken");
const validation = require("../config/validations");
const { generatePassword } = require("../config/password")

const secretKey = process.env.SECRET_KEY


// Create An admin function
const registerAdmin = async function (req, res) {

    const valid = validation.ValidateUserData(req.body, "admin")

    if (valid.error) return res.status(400).json({
        error: valid.error.details.map(detail => detail.message)})

    const { fullName, email, password } = req.body;

    const MAX_ADMINS = process.env.MAX_ADMINS || 3

    try {
        
        const existingAdmin = await userModel.find({
            $or: [{role: "admin"}, {email}]})

        const adminCount = existingAdmin.filter(admin => admin.role === 'admin').length
        
        if (existingAdmin.some(admin => admin.email === email)) {
            return res.status(403).json({error: "Email already registered. Login Instead"})
        }
        
        if (adminCount >= MAX_ADMINS) {

            return res.status(403).json({message: `Admin account can't exceed ${MAX_ADMINS}`})
        }

        const hashedpassword = await bcrypt.hash(password, 10)

        const user = new userModel({
            fullName,
            role: "admin",
            email,
            password: hashedpassword
        })

        await user.save();

        return res.status(201).json({message: "Admin account register successfully"})
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ error: "Duplicate entry detected." });
        }
        console.log(error)
        return res.status(500).json({error: "Admin resgistration unsuccessful"})
    }

}



// Register user by an admin function
const registerUser = async function (req, res) {

    const valid = validation.ValidateUserData(req.body, "user")

    if (valid.error) return res.status(400).json({
        error: valid.error.details.map(detail => detail.message)})

    const { fullName, ipssNumber, email } = req.body

    if (req.user.role !== 'admin') {
        return res.status(403).json({message: 'Access denied'});
    }

    try {

        const query = {
            $or: [{ email }]
        };
        
        // Only add ipssNumber check if it exists in the request
        if (req.body.ipssNumber) {
            query.$or.push({ ipssNumber: req.body.ipssNumber });
        }
        
        const existingUser = await userModel.findOne(query);

        if (existingUser) {
            return res.status(403).json({message: "User with this email or ipssNumber already exist"})
        }

        const tempPassword = generatePassword();

        const hashedpassword = await bcrypt.hash(tempPassword, 10)

        const user = new userModel({
            fullName,
            ipssNumber,
            role: "user",
            email,
            password: hashedpassword
        })

        
        // Sending User Login details Logic
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL,
                pass:process.env.PASSWORD
                
            }
        })
        
        const mailOptions = {
            from: process.env.EMAIL,
            to: email,
            subject: 'LOGIN DETAILS',
            html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2>Login details</h2>
            <p>Hello, ${fullName}</p>
            <p>Your Login Details are:</p>
            <p>Email: ${email}</p>
            <p>Password: ${tempPassword}</p>
            <p>Login Into The Website To Change Your Password</p>
            <p>Thank you,<br>NARICT SAVINGS AND LOAN SCHEME</p>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 40px 0;">
            </div>
            `
        }
        
        transporter.sendMail(mailOptions, async (error, info) => {
            if (error) {
                console.log(error);
                return res.status(500).json({ message: "Failed to send user login details" });
            }
        
            await user.save();

            return res.status(201).json({
            message: `User account register successful. Login details sent to Email address: ${email}`,
            tempPassord: tempPassword
        });

    })

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
    
    const { password, email } = req.body

    try {

        const existingUser = await userModel.findOne({email})

        if (!existingUser) return res.status(404).json({message: "No user found by this Email. Sign up!"})

        const comparePassword =  await bcrypt.compare(password, existingUser.password)

        if (!comparePassword) return res.status(400).json({message: "Incorrect password or email provided"})

        const token = jwt.sign({id: existingUser.id, role: existingUser.role, email: existingUser.email}, secretKey, {expiresIn: '1hr'})

        return res.status(200).json({
            message: "Login Successfully",
            token
        })
    }
    catch (error) {
        console.log(error)
        return res.status(500).json({message: "Login Unsuccessful"})
    }
}


// Change password function
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


// Forgot password function
const forgotPassword = async function (req, res) {

    const valid = validation.ValidateForgotPassword(req.body)

    if (valid.error) return res.status(400).json({
        error: valid.error.details.map(detail => detail.message)
    })

    const { email } = req.body;

    try{

        const existingUser = await userModel.findOne({email})

        if (!existingUser) {
            return res.status(404).json({error: "No user found by this email"})
        }

        
        if (existingUser) {
            const token = uuid.v4();
            existingUser.resetToken = token;
            existingUser.resetTokenExpires = Date.now() + 3600000;

            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL,
                    pass:process.env.PASSWORD

                }
            })

            const mailOptions = {
                from: process.env.EMAIL,
                to: existingUser.email,
                subject: `${existingUser.fullName}, Reset Your Password for Your Account`,
                html: `
                <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                  <h2>Password Reset </h2>
                  <p>Hello, ${existingUser.fullName}</p>
                  <p>You have requested to reset your password. Click on the button below to proceed:</p>
                  <a href="http://localhost:3000/reset-password?token=${token}" 
                     style="display: inline-block; padding: 10px 20px; font-size: 16px; color: #fff; background-color: #007BFF; text-decoration: none; border-radius: 5px;">
                     Reset Password
                  </a>
                  <p>If you did not request a password reset, please ignore this email.</p>
                  <p>Thank you,<br>NARICT SAVINGS AND LOAN SCHEME</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 40px 0;">
                </div>
            `
            };

            transporter.sendMail(mailOptions,  async (error, info) => {
                if (error) {
                    console.log(error);
                    return res.status(500).json({ message: "Failed to send password reset email" });
                }

                await existingUser.save()

                return res.status(200).json({ message: 'Password reset email sent successfully' });
            });
        }

    } catch (error) {
        console.log(error)
    }
}


// Reset password function
const resetPassword = async function (req, res) {

    const valid = validation.ValidateResetData(req.body);

    if (valid.error) return res.status(400).json({
        error: valid.error.details.map(detail => detail.message)
    })

    const { token, newPassword} = req.body;

    try {

        const existingUser = await userModel.findOne({
            resetToken: token,
            resetTokenExpires: { $gt: Date.now() }
        })

        if (!existingUser) return res.status(400).json({error: "Invalid or expired token"})

        const hashedpassword = await bcrypt.hash(newPassword, 10)
        existingUser.password = hashedpassword
        existingUser.resetToken = undefined
        existingUser.resetTokenExpires = undefined

        await existingUser.save()

        return res.status(200).json({message: "Password changed successfully"})

    } catch (error) {
        console.log(error)
    }
}


// Search user function using query parameter
const searchUser =  async function (req, res) {

    if (req.user.role !== "admin") {
        return res.status(403).json({error: "Access denied!"})
    }

    const { fullName, ipssNumber, email } = req.query;

    try {

        const filter = {};

        if (ipssNumber) filter.ipssNumber = ipssNumber;
        if (email) filter.email = email;
        if (fullName) filter.fullName = { $regex: fullName, $options: "i" };

        const user = await userModel
            .findOne( filter )
            .select("-password -resetToken -resetTokenExpires")

        if (!user) return res.status(404).json({error: "No user found"})
        
        return res.status(200).json({user: user})

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
    forgotPassword,
    resetPassword,
    searchUser
}