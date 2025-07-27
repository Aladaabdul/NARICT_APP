const express = require("express")
const dashboardController = require("../controllers/dashboardController");
const { authenticateUser } = require("../config/auth");


const dashboardRouter = express.Router();


dashboardRouter.get('/user', authenticateUser, dashboardController.userDashboard);
dashboardRouter.get('/admin', authenticateUser, dashboardController.adminDashboard);
dashboardRouter.get('/general-stats', authenticateUser, dashboardController.generalStats);


module.exports = dashboardRouter;