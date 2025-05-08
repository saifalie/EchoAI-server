import dotenv from 'dotenv'

dotenv.config({
    path: '.env'
})

export const PORT = process.env.PORT || 7000
export const DB_URL = process.env.DB_URL 
export const CLOUDINARY_CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME
export const CLOUDINARY_API_KEY = process.env.CLOUDINARY_API_KEY
export const CLOUDINARY_API_SECRET = process.env.CLOUDINARY_API_SECRET
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY
export const VISION_FILE_NAME = process.env.VISION_FILE_NAME