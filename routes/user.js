const express = require('express');
const router = express.Router();

// Controllers
const {
  signup,
  login,
  changePassword,
  verifyEmail,
} = require("../controllers/auth");

// Resetpassword controllers
const {
    resetPasswordToken,
    resetPassword,
} = require('../controllers/resetPassword');


// Middleware
const { auth, isAdmin } = require('../middleware/auth');
const { getAllStudents, getAllInstructors } = require('../controllers/profile');


// Routes for Login, Signup, and Authentication

// ********************************************************************************************************
//                                      Authentication routes
// ********************************************************************************************************
router.get("/verify-email", verifyEmail);
// Route for user signup
router.post('/signup', signup);

// Route for user login
router.post('/login', login);

// Route for Changing the password
router.post('/changepassword', auth, changePassword);



// ********************************************************************************************************
//                                      Reset Password
// ********************************************************************************************************

// Route for generating a reset password token
router.post('/reset-password-token', resetPasswordToken);

// Route for resetting user's password after verification
router.post("/reset-password", resetPassword)


// ********************************************************************************************************
//                                     Only for Admin - getAllStudents 
// ********************************************************************************************************
router.get("/all-students", auth, isAdmin, getAllStudents)


// ********************************************************************************************************
router.get("/all-instructors", auth, getAllInstructors)



module.exports = router
