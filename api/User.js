const express = require('express')
const router = express.Router()
const User = require('../models/User')
const bcrypt = require('bcrypt')

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
              res.status(201).json({
                status: "SUCCESS",
                message: "Signup successful",
                data: result
            })
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

module.exports = router