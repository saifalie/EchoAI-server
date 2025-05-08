import vision from '@google-cloud/vision'
import { VISION_FILE_NAME } from '../../secrets.js'

const client  = new vision.ImageAnnotatorClient({
    keyFilename: VISION_FILE_NAME
})

export default client
