const express = require("express");
const userController = require("../controllers/userController");
const { authenticateUser } = require("../config/auth");

const userRouter = express.Router();


userRouter.post('/register/admin', userController.registerAdmin);
userRouter.post('/register', authenticateUser, userController.registerUser);
userRouter.post('/login', userController.loginUser);
userRouter.post('/changePassword', authenticateUser, userController.changePassword);
userRouter.post('/forgotPassword', userController.forgotPassword);
userRouter.post('/resetPassword', userController.resetPassword)

module.exports = userRouter