import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL || '/api' });

export const getProperties = (params, signal) => api.get('/properties', { params, signal });
export const getStats = () => api.get('/stats');
export const getLines = () => api.get('/lines');
export const startCrawl = (line) => api.post('/crawl', line ? { line } : {});
