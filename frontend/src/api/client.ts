import axios from 'axios';

const client = axios.create({
  baseURL: 'http://localhost:8000/api',
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    const detail = err.response?.data?.detail;
    if (detail) {
      return Promise.reject(new Error(detail));
    }
    return Promise.reject(err);
  },
);

export default client;
