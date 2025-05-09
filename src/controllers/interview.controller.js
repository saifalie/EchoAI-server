import { Type } from "@google/genai";
import ai from "../config/gemini.js";
import aaClient from "../config/assemblyAI.js";
import cloudinary from "../config/cloudinary.js";
import { User } from "../models/user.model.js";
import { Review } from "../models/review.model.js";
import { Qna } from "../models/qna.model.js";

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
      
      // Process each audio file with AssemblyAI - First upload to Cloudinary
      const transcripts = [];
      for (let i = 0; i < files.length; i++) {
        try {
          console.log(`Processing file ${i+1}/${files.length}, size: ${files[i].size} bytes`);
          
          // First upload to Cloudinary
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
            language_code: 'en'
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
      
      // Create the prompt for Gemini analysis
      console.log("Creating Gemini prompt...");
      const prompt = `
        You are an expert interview coach specializing in technical interviews.
        
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
      console.log("Reviews generated:", reviews);
      
      // Create QnA documents
      const qnaPromises = questions.map(async (question, index) => {
        return await Qna.create({
          question: question,
          answer: transcripts[index] || "[No response]",
          feedback: reviews[index].analysis,
          idealAnswer: reviews[index].suggestions
        });
      });
      
      const qnaDocuments = await Promise.all(qnaPromises);
      const qnaIds = qnaDocuments.map(doc => doc._id);
      
      // Calculate overall scores and feedback
      const ratings = reviews.map(r => parseInt(r.rating.split('/')[0]));
      const averageScore = (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1);
      
      // Create the review document
      const review = await Review.create({
        feedback: `Overall interview performance score: ${averageScore}/10`,
        score: averageScore.toString(),
        compliment: "You participated in all questions and provided responses",
        strength: reviews.map(r => r.analysis.split('.')[0]), // Take first sentence of each analysis
        improvement: reviews.map(r => r.suggestions),
        qna: qnaIds,
        companyBased: {
          text: "Based on the responses provided",
          score: Math.round(averageScore)
        },
        roleBased: {
          text: "Technical interview assessment",
          score: Math.round(averageScore)
        },
        oneLiner: `Interview performance rated at ${averageScore}/10 with areas for improvement identified`,
        suggestions: [
          {
            title: "Practice Technical Communication",
            link: "https://www.coursera.org/learn/technical-communication"
          }
        ]
      });

      // Update user's history with the new review
      await User.findByIdAndUpdate(
        req.user.id,
        { $push: { history: review._id } },
        { new: true }
      );
      
      // Return the analysis to the client
      return res.json({ 
        success: true,
        reviewId: review._id,
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