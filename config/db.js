const mongoose = require('mongoose')
console.log(process.env.MONGO_URI);
const mongoDB = mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log("Db connected");
})
.catch((err) => {
  console.log(err);
})

module.exports = mongoDB