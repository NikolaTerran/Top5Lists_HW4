const auth = require('../auth')
const User = require('../models/user-model')
const bcrypt = require('bcryptjs')

getLoggedIn = async (req, res) => {
    auth.verify(req, res, async function () {
        const loggedInUser = await User.findOne({ _id: req.userId });
        return res.status(200).json({
            loggedIn: true,
            user: {
                firstName: loggedInUser.firstName,
                lastName: loggedInUser.lastName,
                email: loggedInUser.email
            }
        }).send();
    })
}

registerUser = async (req, res) => {
    try {
        const { firstName, lastName, email, password, passwordVerify } = req.body;
        if (!firstName || !lastName || !email || !password || !passwordVerify) {
            return res
                .status(400)
                .json({ errorMessage: "Please enter all required fields." });
        }
        if (password.length < 8) {
            return res
                .status(400)
                .json({
                    errorMessage: "Please enter a password of at least 8 characters."
                });
        }
        if (password !== passwordVerify) {
            return res
                .status(400)
                .json({
                    errorMessage: "Please enter the same password twice."
                })
        }
        const existingUser = await User.findOne({ email: email });
        if (existingUser) {
            return res
                .status(400)
                .json({
                    success: false,
                    errorMessage: "An account with this email address already exists."
                })
        }

        const saltRounds = 10;
        const salt = await bcrypt.genSalt(saltRounds);
        const passwordHash = await bcrypt.hash(password, salt);

        const newUser = new User({
            firstName, lastName, email, passwordHash
        });
        const savedUser = await newUser.save();

        // LOGIN THE USER
        const token = auth.signToken(savedUser);

        await res.cookie("token", token, {
            httpOnly: true,
            secure: true,
            sameSite: "none"
        }).status(200).json({
            success: true,
            user: {
                firstName: savedUser.firstName,
                lastName: savedUser.lastName,
                email: savedUser.email
            }
        }).send();
    } catch (err) {
        console.error(err);
        res.status(500).send();
    }
}

loginUser = async (req, res) => {
    try{
        User.findOne({ email: req.body.email }, async function(err,user) {
            if(err) throw err
            const { email, password } = req.body
            if (!email || !password) {
                return res
                    .status(400)
                    .json({ errorMessage: "Please enter all required fields." })
                    .send()
            }
            if (!user){
                return res
                    .status(400)
                    .json({errorMessage: "The email doesn't exist." })
                    .send()
            }
            const isMatch = await bcrypt.compare(password, user.passwordHash)
            if(isMatch){
                const token = auth.signToken(user)
                await res.cookie("token", token, {
                    httpOnly: true,
                    secure: true,
                    sameSite: "none"
                }).status(200).json({
                    success: true,
                    user: {
                        firstName: user.firstName,
                        lastName: user.lastName,
                        email: user.email
                    }
                }).send()
            }else{
                return res
                .status(400)
                .json({
                    success: false,
                    errorMessage: "Incorrect password or email address"
                }).send()
            }
        })
    }catch(err){
        console.error(err);
        res.status(500).send();
    }
}

module.exports = {
    getLoggedIn,
    registerUser,
    loginUser
}