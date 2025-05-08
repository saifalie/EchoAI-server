

import { User } from '../models/user.model.js';
import { ApiResponse } from '../utils/api-response.js';
import { CustomError } from '../utils/custom-error.js';

export const handleRegister = async (req, res, next) => {
    const { username, email, password } = req.body;
    console.log('register user details:',username,email,password);
    
    if (!username || !email || !password) {
      return next(new CustomError('Provide username, email & password', 400)); 
    }
  
    try {
      // prevent duplicate email
      if (await User.findOne({ email })) {
        console.log('email already registered');
        
        return res.status(409).json(new ApiResponse(409, {}, 'Email already registered'));
      }
      const newUser = await User.create({ username, email, password });
      console.log('register successfullly');
      
      return res.status(201).json(new ApiResponse(201, newUser, 'Registered successfully'));
    } catch (err) {
      console.error('Registration error:', err);
      return next(new CustomError('Failed to register user', 500, err)); 
    }
  };

  export const handleLogin = async (req, res, next) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return next(new CustomError('Provide email & password', 400)); 
    }
  
    try {
      const user = await User.findOne({ email });
      if (!user) {
        console.log('user not found');
        
        return res.status(404).json(new ApiResponse(404, {}, 'User not found'));
      }
      if (user.password !== password) {
        console.log('wrong password');
        
        return res.status(401).json(new ApiResponse(401, {}, 'Wrong password'));
      }
      console.log('login succussfully');
      
      return res.status(200).json(new ApiResponse(200, user, 'Login successful'));
    } catch (err) {
      console.error('Login error:', err);
      return next(new CustomError('Failed to login user', 500, err)); 
    }
  };

export const getUser = async (req , res ) => {
    try {
      const userId = req.user.id;
      const user = await User.findById(userId).select('-password'); 
      if (!user) {
        console.log('user notr found');
        
        return res
          .status(404)
          .json(new ApiResponse(404, {}, 'User not found'));
      }
      // return the user data
      return res
        .status(200)
        .json(new ApiResponse(200, user, 'User fetched successfully'));
    } catch (err) {
      console.error('Failed to get user data:', err);
      // This will get picked up by your error handler
      throw new CustomError('Failed to get user data', 500, err);
    }
  };