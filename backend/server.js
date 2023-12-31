const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();

// Start the server
const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Server running on port ${port}`));

// Body parser middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Enable CORS for all routes
app.use(cors());

// MongoDB configuration
const mongoURI = "mongodb://127.0.0.1:27017/bugetpal";
mongoose
  .connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("Budget Pal Account DB connected"))
  .catch((err) => {
    console.error("Budget Pal Account DB connection error:", err);
    process.exit(1); // Terminate the server on connection error
  });

// Define a middleware function to verify the token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  jwt.verify(
    token,
    "78f15b5705f3cd8d8c39ec495b9ac2f6637bf215eaf3dbf02e9f7549320a483b",
    (err, decodedToken) => {
      if (err) {
        return res.status(401).json({ error: "Invalid token" });
      }

      req.userId = decodedToken.userId;
      next();
    }
  );
};

// Create a schema and model for the user
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  phone: String,
  password: String,
});

const User = mongoose.model("User", userSchema);

// Define a route to handle form submissions for signup
app.post("/api/signup", (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!name || !email || !password || !phone) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) {
      console.error("Failed to hash password:", err);
      return res.status(500).json({ error: "Failed to save user" });
    }

    const newUser = new User({
      name,
      email,
      phone,
      password: hashedPassword,
    });

    newUser
      .save()
      .then((user) => {
        res.json(user);
      })
      .catch((err) => {
        if (err.code === 11000) {
          res.status(400).json({ error: "Email already exists" });
        } else {
          console.log(err);
          res.status(500).json({ error: "Failed to save user" });
        }
      });
  });
});

app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Missing email or password" });
  }

  User.findOne({ email })
    .then((user) => {
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      bcrypt.compare(password, user.password).then((passwordMatch) => {
        if (!passwordMatch) {
          return res.status(401).json({ error: "Invalid email or password" });
        }

        const token = jwt.sign(
          { userId: user._id },
          "78f15b5705f3cd8d8c39ec495b9ac2f6637bf215eaf3dbf02e9f7549320a483b"
        );

        // res.json({ token });
      });

      Transaction.find({ userId: user._id })
        .then((transactions) => {
          const token = jwt.sign(
            { userId: user._id },
            "78f15b5705f3cd8d8c39ec495b9ac2f6637bf215eaf3dbf02e9f7549320a483b"
          );

          res.json({ token, transactions });
        })
        .catch((err) => {
          console.error(err);
          res.status(500).json({ error: err.message });
        });
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.message });
    });
});

//Schema to store Transactions
const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  description: String,
  amount: Number,
  date: { type: Date, default: Date.now },
});

const Transaction = mongoose.model("Transaction", transactionSchema);

// Route to create a new transaction
app.post("/api/transactions", verifyToken, (req, res) => {
  const { description, amount } = req.body;

  const newTransaction = new Transaction({
    userId: req.userId,
    description,
    amount,
  });

  newTransaction
    .save()
    .then((transaction) => {
      res.json(transaction);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.message });
    });
});

// Route to retrieve a user's transactions
app.get("/api/transactions", verifyToken, (req, res) => {
  Transaction.find({ userId: req.userId })
    .then((transactions) => {
      res.json(transactions);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.message });
    });
});
