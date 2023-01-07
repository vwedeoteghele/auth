const express = require('express')
const router = express.Router()
const User = require('../models/User')
const UserVerification = require('../models/UserVerification')
const bcrypt = require('bcrypt')
const nodemailer = require('nodemailer')
const {v4: uuidv4} = require('uuid')
require('dotenv').config()

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.AUTH_EMAIL,
    pass: process.env.AUTH_PASS
  }
})

transporter.verify((error, success) => {
  if(error) {
    console.log(error);
  } else {
    console.log("ready for message")
    console.log(success)
  }
})

//function to send email for verification
const sendVerificationEmail = ({_id, email}, res) => {
const currentUrl = "http://localhost/5000"
const uniqueString = uuidv4 + _id

//mail options
 const mailOptions = {
  from: process.env.AUTH_EMAIL,
  to: email,
  subject: "verify your email",
  html: `<p>Verify your email address to complete the signup and login into your account</p><p>This link <b>expires in 6 hours</b></p><p>Press <a href=${currentUrl + "user/verify/" + _id + "/" + uniqueString}>Here</a> to proceed</p>`
 }

 const saltRounds = 10
 bcrypt.hash(uniqueString, saltRounds)
 .then((hashedUniqueString) => {
  const newUserVerification = new UserVerification({
    userId: _id,
    uniqueString: hashedUniqueString,
    createdAt: Date.now(),
    expiresAt: Date.now() + 21600000
  })

  newUserVerification.save()
  .then((result) => {
    transporter.sendMail(mailOptions)
    .then(() => {
      res.status(200).json({
        status: "PENDING",
        message: "verification mail sent"
      })
    })
    .catch((err) => {
      console.log(err)
      res.status(400).json({
        status: "FAILED",
        message: "Error Occurred!"
      })
    })
  })
  .catch((err) => {
    console.log(err);
    res.status(400).json({
      status: "FAILED",
      message: "Error Occurred!"
    })
  })
 })
 .catch((err) => {
  console.log(err)
  res.status(400).json({
    status: "FAILED",
    message: "Error Occurred!"
  })
 })
}






router.post('/signup', (req, res) => {
  let {name, email, password, dateOfBirth} = req.body
  // console.log({name, email, password, dateOfBirth} );
  name = name.trim()
  email = email.trim()
  password = password.trim()
  dateOfBirth = dateOfBirth.trim()

  if(name === "" || password === "" || email === "" || dateOfBirth === "") {
    res.status(400).json({
      status: "FAILED",
      message: "Empty input fields"
    })
  } else if(!/^[a-zA-z]*$/.test(name)) {
      res.status(400).json({
        status: "FAILED",
        message: "Invalid name input"
    }) 
  } else if(!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
      res.status(400).json({
        status: "FAILED",
        message: "Invalid email input"
    }) 
  } else if(!new Date(dateOfBirth).getTime()) {
      res.status(400).json({
        status: "FAILED",
        message: "Invalid Date"
    }) 
  } else if(password.length < 8) {
      res.status(400).json({
        status: "FAILED",
        message: "Password to short"
    }) 
  } else {
     User.findOne({email})
    .then((result) => {
      if(result) {
          res.status(400).json({
            status: "FAILED",
            message: "User with the provided email already Exists"
        }) 
      } else {
        //persist user to db
        //first hash passoword using bcrypt
        const saltRounds = 10
        bcrypt.hash(password, saltRounds)
        .then((hashPassword) => {
          const newUser = new User({
            name,
            email,
            dateOfBirth,
            password: hashPassword
          })
          newUser.save()
            .then((result) => {
              sendVerificationEmail(result, res)
            //   res.status(201).json({
            //     status: "SUCCESS",
            //     message: "Signup successful",
            //     data: result
            // })
          })
          .catch((err) => {
              console.log(err);
              res.status(400).json({
                status: "FAILED",
                message: "Error persisting user to database"
            })
          })
        })
        .catch((err) => {
          console.log(err);
            res.status(400).json({
              status: "FAILED",
              message: "error while hashing password"
          })
        })

      }

    })
    .catch((err) => {
      console.log(err)
        res.status(400).json({
          status: "FAILED",
          message: "An Error occurred while checking for existing user"
      }) 
    })
  }
})

router.post('/login', (req, res) => {
  let {email, password} = req.body
  email = email.trim()
  password = password.trim()
  if(email === "" || password === "") {
    res.status(400).json({
      status: "FAILED",
      message: "Empty credential supplied"
    })
  } else {
    console.log({email, password});

    User.findOne({email})
    .then((data) => {
      console.log(data);
      if(data) {
        
        const hashedPassword = data.password

        bcrypt.compare(password, hashedPassword)
        .then((result) => {
          if(result) {
            res.status(201).json({
              status: "SUCCESS",
              message: "login successful",
              data: data
            })
          }
        })
        .catch((err) => {
          res.status(400).json({
            status: "FAILED",
            message: "Error occur with bcryt"
          })
        })
      } else {
        res.status(400).json({
          status: "FAILED",
          message: "email or password incorrect"
        })
      }
    })
    .catch((err) => {
      console.log(err);
      res.status(400).json({
        status: "FAILED",
        message: "Error occur while verifying user, try again"
      })
    })
  }
})

module.exports = router