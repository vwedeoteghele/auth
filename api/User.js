const express = require('express')
const router = express.Router()
const User = require('../models/User')
const UserVerification = require('../models/UserVerification')
const PasswordReset = require('./../models/passwordReset')
const bcrypt = require('bcrypt')
const nodemailer = require('nodemailer')
const {v4: uuidv4} = require('uuid')
require('dotenv').config()
const path = require('path')

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
const currentUrl = "http://localhost:3000"
const uniqueString = uuidv4() + _id

//mail options
 const mailOptions = {
  from: process.env.AUTH_EMAIL,
  to: email,
  subject: "verify your email",
  html: `<p>Verify your email address to complete the signup and login into your account</p><p>This link <b>expires in 6 hours</b></p><p>Press <a href=${currentUrl + "/user/verify/" + _id + "/" + uniqueString}>Here</a> to proceed</p>`
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


const sendResetEmail = ({_id, email}, url, res) => {
  const resetString =uuidv4() + _id
  PasswordReset.deleteMany({userId: _id})
  .then(() => {
    //mail options
 const mailOptions = {
  from: process.env.AUTH_EMAIL,
  to: email,
  subject: "Reset your password",
  html: `<p>We heard you lost access to your account, we got your back on this. Click on the link below to reset your password</p><p>This link <b>expires in 60 minutes</b></p><p>Press <a href=${url + "/" + _id + "/" + resetString}>Here</a> to proceed</p>`
 }

bcrypt.hash(resetString, 10)
.then(hashedString => {
  const passwordReset = new PasswordReset({
    userId: _id,
    resetString: hashedString,
    createdAt: Date.now(),
    expiresAt: Date.now() + 3600000
  })

  passwordReset.save()
  .then(() => {
    transporter.sendMail(mailOptions)
    .then(() => {
      res.status(201)
      .json({
        status: "PENDING",
        message: "reset password email sent"
      })
    })
    .catch(err => {
      console.log(err);
      res.status(400).json({
        status: "FAILED",
        message: "Reset email failed!"
      })
    })  
  })
  .catch(err => {
    console.log(err);
    res.status(400).json({
      status: "FAILED",
      message: "Error occurred"
    })
  })
})
.catch(err => {
  console.log(err);
  res.status(400).json({
    status: "FAILED",
    message: "Error occurred"
  })
})


  })
  .catch(err => {
    console.log(err);
    res.status(400).json({
      status: "FAILED",
      message: "Error occurred"
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

router.get('/verify/:userId/:uniqueString', (req, res) => {
  const {userId, uniqueString} = req.params
  UserVerification.findOne({userId})
  .then((result) => {
    console.log(result);
    if(result) {
      User.updateOne({_id: userId}, {verified: true})
      .then(() => {
        UserVerification.deleteMany({userId})
        .then(() => {
          console.log("got here static");
          res.sendFile(path.join(__dirname, './../views/verified.html'))
        })
        .catch(err => {
          console.log("got here failed delte");

          console.log(err);
          const message = "An error occured while checking your identity"
          res.sendFile(path.join(__dirname, './../views/notVerified.html'));
        })
      })
      .catch((err) => {
        console.log(err)
        const message = "An error occured while checking your identity"
        res.sendFile(path.join(__dirname, './../views/notVerified.html'));
      })
      
    } else {
      console.log("got here failed delte null");
      const message = "An error occured while checking your identity"
      res.sendFile(path.join(__dirname, './../views/notVerified.html'));
   
    }
  })
  .catch((err) => {
    console.log("got here failed delte last");

    console.log(err);
    const message = "An error occured while checking your identity"
    res.sendFile(path.join(__dirname, './../views/notVerified.html'));
  })
})


router.get('/verify/:userId', (req, res) => {
  console.log("zgot here");
const {userId, uniqueString} = req.params
console.log({userId, uniqueString} );
UserVerification.findOne({userId})
.then((result) => {
  if(result) {
    User.updateOne({_id: userId}, {verified: true})
    .then(() => {
      UserVerification.deleteMany({userId})
      .then(() => {
        res.sendFile(path.join(__dirname, './../views/verified.html'))
      })
      .catch(err => {
        console.log(err);
        const message = "An error occured while checking your identity"
        res.redirect(`/user/verified/error=true&message=${message}`)
      })
    })
    .catch((err) => {
      console.log(err)
      const message = "An error occured while checking your identity"
      res.redirect(`/user/verified/error=true&message=${message}`)
    })
    
  } else {

    const message = "An error occured while checking your identity"
    res.redirect(`/user/verified/error=true&message=${message}`)
  }
})
.catch((err) => {
  console.log(err);
  const message = "An error occured while checking your identity"
  res.redirect(`/user/verified/error=true&message=${message}`)
  })
})

router.get('/verified', (req, res) => {
  
  res.sendFile(path.join(__dirname, './../views/verified.html'))
})

router.get('/notVerified', (req, res) => {
  res.sendFile(path.join(__dirname, './../views/notVerified.html'))

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
        if(!data.verified) {
          res.status(400).json({
            status: "FAILED",
            message: "Please verify your account"
          })
        }
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

router.post('/requestPasswordReset', (req, res) => {

  const {email} = req.body
  let redirectUrl = 'http://localhost:3000/rpassword'
  User.findOne({email})
  .then((result) => {
    if(result && result.verified) {
      sendResetEmail(result, redirectUrl, res)
    } else {
      res.status(400).json({
        status: "FAILED",
        message: "There is no user with email or user is not verified"
      })
    }
  })
  .catch((err) => {
    console.log(err);
    res.status(400).json({
      status: "FAILED",
      message: "Error occurred"
    })
  })
})

router.post('/resetPassword', (req, res) => {

  const {userId, resetString, newPassword} = req.body

  PasswordReset.findOne({userId})
  then(result => {
    if(result) {
      if(result.expiredAt < Date.now()) {
        PasswordReset.deleteOne({userId})
        .then(() => {
          res.status(400).json({
            status: "FAILED",
            message: "The link has expired, Please generate a new reset password link"
          })
        })
        .catch(err => {
          console.log(err);
          res.status(400).json({
            status: "FAILED",
            message: "Error occurred"
          })
        })
      } else {
        const hashedString = result.resetString
        bcrypt.compare(hashedString, resetString)
        .then(bcryptResult => {
          if(bcryptResult) {
            bcrypt.hash(newPassword, 10)
            .then(newHashedPassword => {
              User.updateOne({_id: userId}, {password: newHashedPassword})
              .then(() => {
                PasswordReset.deleteMany({userId})
                .then(() => {
                  res.status(200)
                  .json({
                    status: "SUCCESS",
                    message: "password has successfully been updated"
                  })
                })
                .catch(err => {
                  res.status(400).json({
                    status: "FAILED",
                    message: "An Error occurred"
                  })
                })
              })
              .catch(err => {
                res.status(400).json({
                  status: "FAILED",
                  message: "An Error occurred"
                })
              })
            })
            .catch(err => {
              res.status(400).json({
                status: "FAILED",
                message: "An Error occurred"
              })
            })
          } else {
            res.status(400).json({
              status: "FAILED",
              message: "An Error occurred"
            })
          }
        })
        .catch(err => {
          res.status(400).json({
            status: "FAILED",
            message: "An Error occurred"
          })
        })
      }

     
    } else {
      res.status(400).json({
        status: "FAILED",
        message: "Error occurred"
      })
    }
  })
  .catch(err => {
    console.log(err);
    res.status(400).json({
      status: "FAILED",
      message: "Error occurred"
    })
  })
})

module.exports = router