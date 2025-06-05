import axios from 'axios';

//const BASE_URL = 'http://localhost:8000';
const BASE_URL = `${window.location.origin}/pipeline/api`;
//const BASE_URL = 'https://horizonrelevance.com/pipeline/api';

export const callBackend = async (endpoint, method = 'GET', data = {}) => {
    try {
        const config = {
            method,
            url: `${BASE_URL}${endpoint}`,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        // Only attach 'data' for POST/PUT/PATCH
        if (['POST', 'PUT', 'PATCH'].includes(method.toUpperCase())) {
            config.data = data;
        }

        const response = await axios(config);
        return response.data;
    } catch (error) {
        console.error('API call failed:', error);
        return { error: 'Failed to call backend' };
    }
};
