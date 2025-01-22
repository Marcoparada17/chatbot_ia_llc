const axios = require('axios');

const API_KEY = 'fCTnt7U8y58EuaYArnG93Jdf4zdANa-eRNKxq32Hugc';

const headers = {
  'Content-Type': 'application/json',
  'X-API-Key': API_KEY
};

async function analyzeBatch() {
  try {
    // Start batch processing
    const batchResponse = await axios.post('https://api.dedge.pro/process_wallet_batch', {
      wallet_addresses: ['7Rv8Sbh5LnvqSQ6C6tSXQ3abGLNBdhBsXXMteJxs79Kt', 'CKmk4jPwnMh9w5opokdWjrkwoGgAiftoP2r4xxnEfmn']
    }, { headers });

    const taskId = batchResponse.data.task_id;

    // Poll status until complete
    while (true) {
      const statusResponse = await axios.get(
        `https://api.dedge.pro/batch_status/${taskId}`,
        { headers }
      );
      
      const statusData = statusResponse.data;
      
      if (statusData.status === 'processing') {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        continue;
      }
      
      if (statusData.status === 'completed') {
        console.log('Processing complete!');
        console.log('Results:', statusData.results);
        break;
      }
      
      if (statusData.status === 'error') {
        console.error('Error occurred:', statusData.error);
        break;
      }
    }
  } catch (error) {
    if (error.response) {
      if (error.response.status === 429) {
        console.error('Rate limit exceeded. Please wait before making more requests.');
      } else if (error.response.status === 403) {
        console.error('Invalid API key');
      } else {
        console.error('Error:', error.response.data);
      }
    }
  }
}

analyzeBatch()