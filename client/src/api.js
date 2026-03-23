import axios from 'axios';

const api = axios.create({ baseURL: 'http://localhost:4000/api' });

export const getProperties = (params) => api.get('/properties', { params });
export const getStats = () => api.get('/stats');
export const getLines = () => api.get('/lines');
export const startCrawl = (line) => api.post('/crawl', line ? { line } : {});
