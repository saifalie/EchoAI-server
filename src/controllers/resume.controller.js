
// controllers/resume.controller.js - Debug Version
import { Type } from "@google/genai";
import cloudinary from "../config/cloudinary.js";
import ai from "../config/gemini.js";
import visionClient from '../config/visionClient.js';
import { Resume } from "../models/resume.model.js";
import { User } from "../models/user.model.js";
import { bufferToBase64 } from "../utils/bufferToBase64.js";

export const handleResumeUploadAndAnalyzation = async (req, res) => {
  try {
    console.log("Starting resume upload process...");
    
    // Debug req.file
    console.log('📦 req.file structure:', JSON.stringify({
      originalname: req.file?.originalname,
      mimetype: req.file?.mimetype,
      size: req.file?.size,
      buffer: req.file?.buffer ? 'Buffer exists' : 'No buffer'
    }));

    // Check if file exists
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    console.log("Converting to data URI...");
    // 1) Convert buffer → base64 Data URI
    const dataUri = bufferToBase64(req.file);
    console.log("Data URI created successfully");

    console.log("Uploading to Cloudinary...");
    // 2) Upload to Cloudinary
    const uploadResult = await cloudinary.uploader.upload(dataUri, {
      folder: 'resumes',
      resource_type: 'image',
    });

    const imageUrl = uploadResult.secure_url;
    console.log("Cloudinary upload success. URL:", imageUrl);

    console.log("Starting OCR process...");
    // 3) OCR via Google Vision
    const [ocrResult] = await visionClient.documentTextDetection(imageUrl);
    const extractedText = ocrResult.fullTextAnnotation?.text || '';
    console.log("OCR complete. Text length:", extractedText.length);
    
    if (!extractedText) {
      throw new Error('No text extracted from the image');
    }

    console.log("Starting Gemini analysis...");
    // 4) Call Gemini with very simple prompt
    // Debug the response format first
    // const response = await ai.models.generateContent({
    //   model: 'gemini-2.0-flash-exp',
    //   contents: [{ role: 'user', parts: [{ text: `Analyze this resume: ${extractedText.substring(0, 500)}...` }] }]
    // });

    const response =  await ai.models.generateContent({
        model:'gemini-2.0-flash-exp',
        contents: [{ role: 'user', parts: [{ text: `Analyze this resume: ${extractedText.substring(0, 500)}...` }] }],
        config:{
            responseMimeType: 'application/json',
            responseSchema:{
                type:Type.OBJECT,
                properties:{
                    overallSummary:{
                        type:Type.STRING
                    },
                    technicalDetails:{
                        type:Type.STRING
                    },
                    recommendations:{
                        type:Type.STRING,
                    }
                },
                required:['overallSummary','technicalDetails','recommendations'],
                propertyOrdering: ['overallSummary','technicalDetails','recommendations']
                
            }
        }
    })


const text = response.candidates[0].content.parts
  .map(p => p.text)
  .join('');

  console.log('gemini-data',text);


  
  const parts = response.candidates[0].content.parts;
  const jsonString = parts.map(p => p.text).join('');
  const analysis = JSON.parse(jsonString);

  const { overallSummary, technicalDetails, recommendations } = analysis;

  
    

    


    // const overallSummary = data[0].text
    // const technicalDetails = data[1].text
    // const recommendations = data[2].text

    console.log("Creating database entry...");
    // 5) Save the Resume doc
    const resume = await Resume.create({
      url: imageUrl,
      text: extractedText,
      summary: overallSummary,
      technical: technicalDetails,
      recommendation: recommendations
    });

    console.log("Attaching resume to user...");
    // 6) Attach resume to user
    await User.findByIdAndUpdate(
      req.user.id,
      { resume: resume._id },
      { new: true }
    );

    console.log("All steps completed successfully!");
    // 7) Return results
    return res.json({
      imageUrl,
      extractedText: extractedText.substring(0, 500) + "...", // Truncate for response
      overallSummary,
      technicalDetails,
      recommendations
    });

  } catch (error) {
    console.error('upload/OCR error:', error);
    // More detailed error logging
    if (error.response) {
      console.error('Error response data:', error.response.data);
      console.error('Error response status:', error.response.status);
    }
    return res.status(500).json({ error: 'Upload or OCR failed', details: error.message });
  }
};





//-------------------------------------


// import cloudinary from "../config/cloudinary.js";
// import ai from "../config/gemini.js";
// import visionClient from '../config/visionClient.js';
// import { Resume } from "../models/resume.model.js";
// import { User } from "../models/user.model.js";
// import { bufferToBase64 } from "../utils/bufferToBase64.js";
// import {analyzeResumeFn} from "../prompt/resume.config.js";

// export const handleResumeUploadAndAnalyzation = async (req, res) => {
//   try {
//     console.log("Starting resume upload process...");
    
//     // Validate file input
//     if (!req.file || !req.file.buffer) {
//       return res.status(400).json({ error: 'No file uploaded or invalid file format' });
//     }

//     // Convert to data URI with proper MIME type
//     const dataUri = bufferToBase64(req.file);

//     // Cloudinary upload with format handling
//     const uploadResult = await cloudinary.uploader.upload(dataUri, {
//       folder: 'resumes',
//       resource_type: 'auto',
//       allowed_formats: ['png', 'jpg', 'jpeg', 'pdf'],
//       quality_analysis: true
//     });
    
//     const imageUrl = uploadResult.secure_url;
//     console.log("Cloudinary upload success:", imageUrl);

//     // Google Vision OCR with buffer
//     const [ocrResult] = await visionClient.documentTextDetection({
//       image: { content: req.file.buffer }
//     });
    
//     const extractedText = ocrResult.fullTextAnnotation?.text || '';
//     console.log("OCR extracted text length:", extractedText.length);
    
//     if (!extractedText) {
//       throw new Error('No text extracted from document');
//     }

//     const response = await ai.models.generateContent({
//         model: "gemini-2.0-flash",
//         contents: [{
//           role: "user",
//           parts: [{
//             text: `Analyze this resume: ${extractedText.substring(0, 30000)}`
//           }]
//         }],
//         config: {
//           responseMimeType: "application/json",
//           responseSchema: {
//             type: Type.OBJECT,
//             properties: {
//               overallSummary: {
//                 type: Type.STRING,
//                 description: "Concise high-level resume summary"
//               },
//               technicalDetails: {
//                 type: Type.STRING,
//                 description: "Technical skills and experience details"
//               },
//               recommendations: {
//                 type: Type.STRING,
//                 description: "Concrete improvement suggestions"
//               }
//             },
//             required: ["overallSummary", "technicalDetails", "recommendations"],
//             propertyOrdering: ["overallSummary", "technicalDetails", "recommendations"]
//           }
//         }
//       });

//       console.log('gemini-response-',response);
      
  
    //   // Parse JSON response
    //   const result = await response.response;
    //   const analysis = JSON.parse(result.text());
      
    //   if (!analysis.overallSummary || !analysis.technicalDetails || !analysis.recommendations) {
    //     throw new Error('Invalid analysis structure from Gemini');
    //   }
  
    // // Validate response structure
    // const requiredFields = ['overallSummary', 'technicalDetails', 'recommendations'];
    // if (!requiredFields.every(field => field in args)) {
    //   throw new Error('Missing required analysis fields in Gemini response');
    // }

    // // Database operations
    // const resume = await Resume.create({
    //   url: imageUrl,
    //   text: extractedText,
    //   summary: args.overallSummary,
    //   technical: args.technicalDetails,
    //   recommendation: args.recommendations
    // });

    // await User.findByIdAndUpdate(
    //   req.user.id,
    //   { $set: { resume: resume._id } },
    //   { new: true, runValidators: true }
    // );

    // // Response formatting
    // return res.json({
    //   success: true,
    //   imageUrl,
    //   analysis: {
    //     summary: args.overallSummary,
    //     technical: args.technicalDetails,
    //     recommendations: args.recommendations
    //   },
    //   textPreview: extractedText.substring(0, 500) + "..."
    // });

//   } catch (error) {
//     console.error('Error in resume processing:', error);
    
//     // Cloudinary cleanup on error
//     if (uploadResult?.public_id) {
//       await cloudinary.uploader.destroy(uploadResult.public_id)
//         .catch(e => console.error('Cleanup error:', e));
//     }

//     return res.status(500).json({ 
//       success: false,
//       error: 'Resume processing failed',
//       details: error.message,
//       ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
//     });
//   }
// };

//-------------------------------------

// import cloudinary from "../config/cloudinary.js";
// import ai from "../config/gemini.js";
// import visionClient from '../config/visionClient.js';
// import { Resume } from "../models/resume.model.js";
// import { User } from "../models/user.model.js";
// import { bufferToBase64 } from "../utils/bufferToBase64.js";
// import analyzeResumeFn from "../prompt/resume.config.js";

// export const handleResumeUploadAndAnalyzation = async (req, res) => {
//   try {
//     console.log("Starting resume upload process...");
//     if (!req.file) {
//       return res.status(400).json({ error: 'No file uploaded' });
//     }

//     // Convert to data URI
//     const dataUri = bufferToBase64(req.file);

//     // Upload to Cloudinary
//     const uploadResult = await cloudinary.uploader.upload(dataUri, {
//       folder: 'resumes',
//       resource_type: 'image',
//     });
//     const imageUrl = uploadResult.secure_url;

//     // OCR via Google Vision
//     const [ocrResult] = await visionClient.documentTextDetection(imageUrl);
//     const extractedText = ocrResult.fullTextAnnotation?.text || '';
//     if (!extractedText) {
//       throw new Error('No text extracted from the image');
//     }

//     // Call Gemini with resume-analysis function
//     const response = await ai.models.generateContent({
//       model: 'gemini-1.5-flash',
//       contents: [
//         { role: 'user', parts: [{ text: extractedText }] }
//       ],
//       tools: [{ functionDeclarations: [analyzeResumeFn] }],
//       toolConfig: { functionCall: { name: 'analyzeResume' } }
//     });

//     // Extract function call payload
//     const fnCall = response.functionCalls?.[0];
//     if (!fnCall) throw new Error('No function call in Gemini response');
//     const args = typeof fnCall.args === 'string'
//       ? JSON.parse(fnCall.args)
//       : fnCall.args;

//     const { overallSummary, technicalDetails, recommendations } = args;

//     // Save to database
//     const resume = await Resume.create({
//       url: imageUrl,
//       text: extractedText,
//       summary: overallSummary,
//       technical: technicalDetails,
//       recommendation: recommendations
//     });

//     // Attach resume to user
//     await User.findByIdAndUpdate(req.user.id, { resume: resume._id }, { new: true });

//     // Return detailed response
//     return res.json({
//       imageUrl,
//       extractedText,
//       overallSummary,
//       technicalDetails,
//       recommendations
//     });

//   } catch (error) {
//     console.error('upload/OCR error:', error);
//     return res.status(500).json({ error: 'Upload or OCR failed', details: error.message });
//   }
// };




// // controllers/resume.controller.js - Debug Version
// import cloudinary from "../config/cloudinary.js";
// import ai from "../config/gemini.js";
// import visionClient from '../config/visionClient.js';
// import { Resume } from "../models/resume.model.js";
// import { User } from "../models/user.model.js";
// import { bufferToBase64 } from "../utils/bufferToBase64.js";

// export const handleResumeUploadAndAnalyzation = async (req, res) => {
//   try {
//     console.log("Starting resume upload process...");
    
//     // Debug req.file
//     console.log('📦 req.file structure:', JSON.stringify({
//       originalname: req.file?.originalname,
//       mimetype: req.file?.mimetype,
//       size: req.file?.size,
//       buffer: req.file?.buffer ? 'Buffer exists' : 'No buffer'
//     }));

//     // Check if file exists
//     if (!req.file) {
//       return res.status(400).json({ error: 'No file uploaded' });
//     }

//     console.log("Converting to data URI...");
//     // 1) Convert buffer → base64 Data URI
//     const dataUri = bufferToBase64(req.file);
//     console.log("Data URI created successfully");

//     console.log("Uploading to Cloudinary...");
//     // 2) Upload to Cloudinary
//     const uploadResult = await cloudinary.uploader.upload(dataUri, {
//       folder: 'resumes',
//       resource_type: 'image',
//     });

//     const imageUrl = uploadResult.secure_url;
//     console.log("Cloudinary upload success. URL:", imageUrl);

//     console.log("Starting OCR process...");
//     // 3) OCR via Google Vision
//     const [ocrResult] = await visionClient.documentTextDetection(imageUrl);
//     const extractedText = ocrResult.fullTextAnnotation?.text || '';
//     console.log("OCR complete. Text length:", extractedText.length);
    
//     if (!extractedText) {
//       throw new Error('No text extracted from the image');
//     }

//     console.log("Starting Gemini analysis...");
//     // 4) Call Gemini with very simple prompt
//     // Debug the response format first
//     const response = await ai.models.generateContent({
//       model: 'gemini-1.5-flash',
//       contents: [{ role: 'user', parts: [{ text: `Analyze this resume: ${extractedText.substring(0, 500)}...` }] }]
//     });
    
//     // Log the entire response structure to understand format
//     console.log("Gemini response structure:", JSON.stringify(response, null, 2));
    
//     // Create very basic sections - no parsing needed
//     const overallSummary = "Resume analyzed successfully";
//     const technicalDetails = "Technical skills extracted from the resume";
//     const recommendations = "Resume looks good";

//     console.log("Creating database entry...");
//     // 5) Save the Resume doc
//     const resume = await Resume.create({
//       url: imageUrl,
//       text: extractedText,
//       summary: overallSummary,
//       technical: technicalDetails,
//       recommendation: recommendations
//     });

//     console.log("Attaching resume to user...");
//     // 6) Attach resume to user
//     await User.findByIdAndUpdate(
//       req.user.id,
//       { resume: resume._id },
//       { new: true }
//     );

//     console.log("All steps completed successfully!");
//     // 7) Return results
//     return res.json({
//       imageUrl,
//       extractedText: extractedText.substring(0, 500) + "...", // Truncate for response
//       overallSummary,
//       technicalDetails,
//       recommendations
//     });

//   } catch (error) {
//     console.error('upload/OCR error:', error);
//     // More detailed error logging
//     if (error.response) {
//       console.error('Error response data:', error.response.data);
//       console.error('Error response status:', error.response.status);
//     }
//     return res.status(500).json({ error: 'Upload or OCR failed', details: error.message });
//   }
// };