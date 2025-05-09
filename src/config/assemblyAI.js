import { AssemblyAI } from "assemblyai";
import { ASSEMBLY_AI_KEY } from "../../secrets.js";


const aaClient = new AssemblyAI({apiKey:ASSEMBLY_AI_KEY})
// Log AssemblyAI initialization
console.log('AssemblyAI client initialized');

export default aaClient