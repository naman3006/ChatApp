import { generateToken } from "../lib/utils.js";
import User from "../models/User.js";
import bcrypt from "bcryptjs"
import cloudinary from "../lib/cloudinary.js"
// import User from "../models/User.js";

//Signup a new user
export const signup = async (req,res)=>{

    const {fullName,email,password,bio} = req.body;

    try {
        if(!fullName || !email || !password || !bio) {
            return res.json({success:false, message:"Missing Details"});
        }
        const user = await User.findOne({email});
        if(user) {
            return res.json({success:false, message:"Account already exists "});
        }
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password,salt);
        const newUser = await User.create({
            fullName,email,password:hashedPassword,bio
        })
        const token = generateToken(newUser._id)
        res.json({success:true,userData:newUser,token,message:"Account created successfully"})
    }
    catch(err) {
        console.log(err.message)
        res.json({success:false,message:err.message})
    }
}




export const login = async (req, res) => {
  try {
      const { email, password } = req.body;
      const userData = await User.findOne({ email });
      if (!userData) {
          return res.json({ success: false, message: "Invalid credentials" });
      }

      const isPasswordCorrect = await bcrypt.compare(password, userData.password);

      if (!isPasswordCorrect) {
          return res.json({ success: false, message: "Invalid credentials" });
      }

      // Use userData instead of newUser
      const token = generateToken(userData._id);

      res.json({
          success: true,
          userData,
          token,
          message: "Login successful"
      });
  } catch (err) {
      console.log(err.message);
      res.json({ success: false, message: err.message });
  }
};
//controller to check if user is authenticated
export const checkAuth=(req,res)=>{
    res.json({success:true,user:req.user})

}

//controller to update user profile details

export const updateProfile = async (req,res)=>{
    try{
        const {profilePic,bio,fullName} = req.body;
        const userId = req.user._id;
        let updatedUser;

        if(!profilePic) {
            updatedUser = await User.findByIdAndUpdate(userId,{bio,fullName},{new:true});
        }
        else {
            const upload = await cloudinary.uploader.upload(profilePic);

            updatedUser = await User.findByIdAndUpdate(userId,{profilePic:upload.secure_url,bio, fullName},{new:true})
        }
        res.json({success:true,user:updatedUser})
    }
    catch(err) {
        console.log(err.message)
        res.json({success:false,message:err.message})

    }
}


// server/controllers/UserController.js


// Example controller functions
export const registerUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const newUser = new User({ username, email, password });
    await newUser.save();

    res.status(201).json({ message: "User registered successfully", user: newUser });
  } catch (err) {
    console.error("Register error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || user.password !== password) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    res.json({ message: "Login successful", user });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
