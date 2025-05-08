import cloudinary from "../config/cloudinary.js"
import ai from "../config/gemini.js"
import visionClient from '../config/visionClient.js'
import analyzeResumeFn from "../prompt/resume.config.js"
import { bufferToBase64 } from "../utils/bufferToBase64.js"



export const handleResumeUploadAndAnalyzation = async(req,res)=>{
    try {

        // 1) Convert buffer → base64 Data URI

        const dataUri = bufferToBase64(req.file)
        // const mime = req.file.mimetype
        // const b64 =  req.file.buffer.toString('base64')
        // const dataUri = `data:${mime};base64,${b64}`

        // 2) Upload to Cloudinary via uploader.upload (returns a promise) 
        const uploadResult = await cloudinary.uploader.upload(dataUri,{
            folder:'resumes',
            resource_type: 'image'
        })

        const imageUrl = uploadResult.secure_url

        // 3) Run OCR on the Cloudinary URL (documentTextDetection for full‑page)
        const [ocrResult] = await visionClient.documentTextDetection(imageUrl)
        const extractedText = ocrResult.fullTextAnnotation?.text || ''


        //  Call Gemini 
        const response = await ai.models.generateContent({
            model: 'gemini-1.5-flash',
            contents:[
                {role: 'user', parts:[{text:extractedText}]}
            ],
            systemInstruction:{
                role: 'system',
                parts:[{
                    text:'You are a resume-analysis assistant. Return three sections: Overall Summary, Technical Details, Recommendations.'
                }]
            },
            config: { tools: [ {functionDeclarations: [analyzeResumeFn]}]}

        })

        // Extract the JSON from the function call

        const fnCall = response.functionCalls?.[0]
        console.log(response.functionCalls);
        
        if (!fnCall) throw new Error('No function call in Gemini response');

        const rawArgs = fnCall.args;
        console.log('fnCall.args type:', typeof fnCall.args, fnCall.args);


         // Only parse if it’s a string; otherwise use it directly
        const parsedArgs = typeof rawArgs === 'string'
        ? JSON.parse(rawArgs)
         : rawArgs;


       const { overallSummary, technicalDetails, recommendations } = parsedArgs

       return res.json({ imageUrl, extractedText, overallSummary,technicalDetails,recommendations });





        
    } catch (error) {
        console.error('upload/OCR error: ',error);
        res.status(500).json({error:'Upload or OCR failed'})
        
    }
}

const handleOCR =  async ()=>{

}