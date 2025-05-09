// utils/bufferToBase64.js

export const bufferToBase64 = (file) => {
    // Check if file exists and has buffer
    if (!file || !file.buffer) {
      throw new Error('Invalid file object');
    }
    
    // Convert buffer to base64 string
    const base64String = file.buffer.toString('base64');
    
    // Create the data URI based on mimetype
    return `data:${file.mimetype};base64,${base64String}`;
  };