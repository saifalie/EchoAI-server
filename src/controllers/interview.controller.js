import { Type } from "@google/genai";
import ai from "../config/gemini.js";
import  aaClient  from "../config/assemblyAI.js";
import cloudinary from "../config/cloudinary.js";

export const prepareInterviewQuestions = async (req, res) => {
    try {
      const { company, role, questionType } = req.body;
  
      // Call Gemini to generate 5 questions
      const prompt = `Generate 5 ${questionType} interview questions for a ${role} position at ${company}.`;
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: { 
          responseMimeType: 'application/json',
          responseSchema:{
            type:Type.ARRAY,
            items:{
              type:Type.OBJECT,
              properties:{
                question:{
                  type:Type.STRING
                }
              },
              required:['question']
            }
          }
        }
      });

      const parts = response.candidates[0].content.parts;
      const jsonString = parts.map(p => p.text).join('');

      let questionsArray;
      try {
        questionsArray = JSON.parse(jsonString);
      } catch (error) {
        console.error('Failed to parse questions JSON:', error, jsonString);
        return res.status(500).json({ error: 'Invalid JSON from Gemini' });
      }

      const questions = questionsArray.map(item => item.question);

      return res.status(200).json({
        questions
      });
    } catch (error) {
      console.error('Error generating questions:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
};

// export const handleQnaUpload = async(req,res)=>{
//   console.log('Received files:', req.files.map(f => ({
//       field: f.fieldname,
//       name:  f.originalname,
//       size:  f.size
//     })));
// }

  export const handleQnaUpload = async (req, res) => {
    try {
      console.log("Starting QnA upload process...");
      
      // Debug request body and files
      console.log(`Request body:`, JSON.stringify({
        questions: req.body.questions ? 'exists' : 'missing'
      }));
      
      console.log(`Files received: ${req.files ? req.files.length : 0}`);
      
      // Get questions from request body
      let questions;
      try {
        questions = JSON.parse(req.body.questions);
        console.log(`Parsed ${questions.length} questions`);
      } catch (error) {
        console.error("Failed to parse questions:", error);
        return res.status(400).json({ error: 'Invalid questions format' });
      }
      
      // Get the uploaded audio files
      const files = req.files || [];
      if (!files.length) {
        return res.status(400).json({ error: 'No audio files uploaded' });
      }
      
      // Fetch user data with resume
      const user = await User.findById(req.user.id).populate('resume');
      console.log(`User ${req.user.id} fetched, resume exists: ${!!user?.resume}`);
      
      if (!user?.resume) {
        return res.status(404).json({ error: 'User resume not found' });
      }
      
      // Get technical details from resume
      const techDetails = user.resume.technical || '';
      
      // Process each audio file with AssemblyAI - First upload to Cloudinary
      const transcripts = [];
      for (let i = 0; i < files.length; i++) {
        try {
          console.log(`Processing file ${i+1}/${files.length}, size: ${files[i].size} bytes`);
          
          // First upload to Cloudinary (as a temporary solution)
          console.log(`Uploading file ${i+1} to Cloudinary...`);
          const uploadResult = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
              { resource_type: 'auto', folder: 'interview_audio' },
              (error, result) => {
                console.log('inside result: ',result);
                
                if (error) {
                  console.error("Cloudinary upload failed:", error);
                  reject(error);
                } else {
                    console.log('file uploaded to the cloudinary');
                    
                  resolve(result);
                }
              }
            );
            
            // Pipe the buffer to the upload stream
            uploadStream.end(files[i].buffer);
          });
          
          console.log(`File ${i+1} uploaded to Cloudinary: ${uploadResult.secure_url}`);
          
          // Then use the URL with AssemblyAI
          console.log(`Transcribing file ${i+1} with AssemblyAI...`);
          let transcription = await aaClient.transcripts.transcribe({
            audio_url: uploadResult.secure_url,
            language_code: 'en' // Specify language if needed
          });
          
          // Wait for transcription to complete
          transcription = await aaClient.transcripts.waitUntilReady(transcription.id);
          
          // Add transcription text to our array
          transcripts.push(transcription.text);
          console.log(`Transcription ${i+1} complete`);
        } catch (transcriptError) {
          console.error(`Error transcribing file ${i+1}:`, transcriptError);
          // Add placeholder for failed transcription
          transcripts.push("[Transcription failed]");
        }
      }
      
      // Ensure we have consistent data
      console.log(`Final transcript count: ${transcripts.length}, questions count: ${questions.length}`);
      
      // Create the prompt for Gemini analysis
      console.log("Creating Gemini prompt...");
      const prompt = `
        You are an expert interview coach specializing in technical interviews.
        
        Candidate's technical skills: ${techDetails}
        
        Below are interview questions and the candidate's verbal responses (transcribed from audio).
        For each Q&A pair, provide:
        1. A concise strength/weakness analysis (2-3 sentences)
        2. Specific suggestions to improve the response (2-3 points)
        3. A one-sentence overall rating on a scale of 1-10
        
        ${questions.map((q, i) => `Q: ${q}\nA: ${transcripts[i] || "[No response]"}`).join('\n\n')}
        
        Format your response as a JSON array where each object has these properties:
        - question: the interview question
        - rating: concise rating (e.g., "7/10 - Good overall with room for improvement")
        - analysis: strengths and weaknesses of the response
        - suggestions: specific improvement tips
      `;
      
      // Use Gemini to analyze the responses
      console.log("Calling Gemini API...");
      const response = await ai.models.generateContent({
        model: 'gemini-2.0-flash-exp',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                question:    { type: Type.STRING },
                rating:      { type: Type.STRING },
                analysis:    { type: Type.STRING },
                suggestions: { type: Type.STRING }
              },
              required: ['question','rating','analysis','suggestions']
            }
          }
        }
      });
      
      // Extract and parse the JSON response
      const jsonText = response.candidates[0].content.parts.map(p => p.text).join('');
      console.log("Parsing Gemini response...");
      const reviews = JSON.parse(jsonText);
      
      console.log(`Generated ${reviews.length} review items`);
      
      // Return the analysis to the client
      return res.json({ 
        success: true,
        reviews,
        questionCount: questions.length,
        transcriptCount: transcripts.length
      });
      
    } catch (error) {
      console.error('QnA upload error:', error);
      res.status(500).json({ 
        error: 'Failed to process Q&A', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  };

//   export const handleQnaUpload = async (req, res) => {
//     try {
//       // Parse questions from the request body
//       const questions = JSON.parse(req.body.questions);
      
//       // Get the uploaded audio files
//       const files = req.files['answers'] || [];
//       if (!files.length) {
//         return res.status(400).json({ error: 'No audio files uploaded' });
//       }
      
//       // Fetch user data with resume
//       const user = await User.findById(req.user.id).populate('resume');
//       if (!user?.resume) {
//         return res.status(404).json({ error: 'User resume not found' });
//       }
      
//       // Get technical details from resume
//       const techDetails = user.resume.techincal || '';
      
//       // Process each audio file with AssemblyAI
//       const transcripts = [];
//       for (let i = 0; i < files.length; i++) {
//         try {
//           console.log(`Transcribing audio file ${i+1}/${files.length}...`);
          
//           // Send to AssemblyAI for transcription
//           let transcription = await aaClient.transcripts.transcribe({ 
//             audio: files[i].buffer,
//             language_code: 'en' // Specify language if needed
//           });
          
//           // Wait for transcription to complete
//           transcription = await aaClient.transcripts.waitUntilReady(transcription.id);
          
//           // Add transcription text to our array
//           transcripts.push(transcription.text);
//           console.log(`Transcription ${i+1} complete`);
//         } catch (transcriptError) {
//           console.error(`Error transcribing file ${i+1}:`, transcriptError);
//           // Add placeholder for failed transcription
//           transcripts.push("[Transcription failed]");
//         }
//       }
      
//       // Ensure we have the same number of transcripts as questions
//       if (transcripts.length !== questions.length) {
//         console.warn(`Warning: Mismatch between questions (${questions.length}) and transcripts (${transcripts.length})`);
//       }
      
//       // Create the prompt for Gemini analysis
//       const prompt = `
//         You are an expert interview coach specializing in technical interviews.
        
//         Candidate's technical skills: ${techDetails}
        
//         Below are interview questions and the candidate's verbal responses (transcribed from audio).
//         For each Q&A pair, provide:
//         1. A concise strength/weakness analysis (2-3 sentences)
//         2. Specific suggestions to improve the response (2-3 points)
//         3. A one-sentence overall rating on a scale of 1-10
        
//         ${questions.map((q, i) => `Q: ${q}\nA: ${transcripts[i] || "[No response]"}`).join('\n\n')}
        
//         Format your response as a JSON array where each object has these properties:
//         - question: the interview question
//         - rating: concise rating (e.g., "7/10 - Good overall with room for improvement")
//         - analysis: strengths and weaknesses of the response
//         - suggestions: specific improvement tips
//       `;
      
//       // Use Gemini to analyze the responses
//       const response = await ai.models.generateContent({
//         model: 'gemini-2.0-flash-exp',
//         contents: [{ role: 'user', parts: [{ text: prompt }] }],
//         config: {
//           responseMimeType: 'application/json',
//           responseSchema: {
//             type: Type.ARRAY,
//             items: {
//               type: Type.OBJECT,
//               properties: {
//                 question:    { type: Type.STRING },
//                 rating:      { type: Type.STRING },
//                 analysis:    { type: Type.STRING },
//                 suggestions: { type: Type.STRING }
//               },
//               required: ['question','rating','analysis','suggestions']
//             }
//           }
//         }
//       });
      
//       // Extract and parse the JSON response
//       const jsonText = response.candidates[0].content.parts.map(p => p.text).join('');
//       const reviews = JSON.parse(jsonText);
      
//       // Return the analysis to the client
//       return res.json({ 
//         success: true,
//         reviews,
//         questionCount: questions.length,
//         transcriptCount: transcripts.length
//       });
      
//     } catch (error) {
//       console.error('QnA upload error:', error);
//       res.status(500).json({ 
//         error: 'Failed to process Q&A', 
//         details: error.message,
//         stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
//       });
//     }
//   };


// export const handleQnaUpload =  async(req,res)=>{
//     try {
//         const questions = JSON.parse(req.body.questions)

//         const files =  req.files['answers'] || []
//         if(!files.length){
//             return res.status(400).json({error: 'No audio files upload'})
//         }

//         const user = await User.findById(req.user.id).populate('resume')

//         if(!user?.resume){
//             return res.status(404).json({error:'User resume not found'})
//         }

//         const techDetails = user.resume.techincal
        
//         const transcripts = [];
//         for (const file of files) {
//           let tx = await aaClient.transcripts.transcribe({ audio: file.buffer });          
//           tx = await aaClient.transcripts.waitUntilReady(tx.id);                           
//           transcripts.push(tx.text);
//         }

//            // const transcripts = [];
//     // for (const file of files) {
//     //   const up = await cloudinary.uploader.upload_stream(
//     //     { resource_type: 'auto', folder: 'qa_audio' }, 
//     //     (err, result) => { if (err) throw err; return result; }
//     //   ).end(file.buffer);                                                                   // :contentReference[oaicite:7]{index=7}
//     //   let tx = await aaClient.transcripts.transcribe({ audio: up.secure_url });           // :contentReference[oaicite:8]{index=8}
//     //   tx = await aaClient.transcripts.waitUntilReady(tx.id);
//     //   transcripts.push(tx.text);
//     // }


//     const prompt = `
//     You are an expert interview coach. 
//     Given these technical skills: ${techDetails}
//     And these Q&A pairs:
//     ${questions.map((q,i) => `Q: ${q}\nA: ${transcripts[i]}`).join('\n\n')}
//     For each, provide:
//       1. a brief strength/weakness analysis,
//       2. suggestions to improve,
//       3. a one‑sentence overall rating.
//     Return JSON array [{ question, rating, analysis, suggestions }].
//   `;

//   const resp = await ai.models.generateContent({
//     model: 'gemini-2.0-flash-exp',
//     contents: [{ role: 'user', parts: [{ text: prompt }] }],
//     config: {
//       responseMimeType: 'application/json',
//       responseSchema: {
//         type: Type.ARRAY,
//         items: {
//           type: Type.OBJECT,
//           properties: {
//             question:    { type: Type.STRING },
//             rating:      { type: Type.STRING },
//             analysis:    { type: Type.STRING },
//             suggestions: { type: Type.STRING }
//           },
//           required: ['question','rating','analysis','suggestions']
//         }
//       }
//     }
//   });

//   console.log('gemini-data',resp.candidates[0].content.parts);
  

//   const json = resp.candidates[0].content.parts.map(p => p.text).join('');
//     const reviews = JSON.parse(json);

//     return res.json({ reviews });
//     } catch (error) {
//         console.error('QnA upload error', error);
//         res.status(500).json({ error: 'Failed to process Q&A', details: error.message });
//     }
// }