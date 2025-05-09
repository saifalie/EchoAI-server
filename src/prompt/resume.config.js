// analyzeResumeFn.js
export const analyzeResumeFn = {
    name: 'analyzeResume',
    description: 'Produce JSON with overall summary, technical details, and resume improvement recommendations.',
    parameters: {
      type: 'object',
      properties: {
        overallSummary: {
          type: 'string',
          description: 'A concise high‑level summary of the candidate’s resume'
        },
        technicalDetails: {
          type: 'string',
          description: 'Details of skills, projects, and experience summary'
        },
        recommendations: {
          type: 'string',
          description: 'Concrete improvements and mistakes for making the resume stronger'
        }
      },
      required: ['overallSummary', 'technicalDetails', 'recommendations']
    }
  };
  

  