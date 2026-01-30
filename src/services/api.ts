import axios from 'axios';
import type { Podcast } from '../types/podcast';

const API_URL = 'http://localhost:3001/api';

export const searchOnline = async (term: string, limit = 20): Promise<Podcast[]> => {
    const response = await axios.get(`${API_URL}/search`, {
        params: { term, limit }
    });
    return response.data;
};

export const getAllPodcasts = async (): Promise<Podcast[]> => {
    const response = await axios.get(`${API_URL}/podcasts`);
    return response.data;
};

export const getPodcastsByCategory = async (category: string): Promise<Podcast[]> => {
    const response = await axios.get(`${API_URL}/podcasts/category/${category}`);
    return response.data;
};

export const searchLocalPodcasts = async (query: string): Promise<Podcast[]> => {
    const response = await axios.get(`${API_URL}/podcasts/search`, {
        params: { q: query }
    });
    return response.data;
};

export const getPodcastById = async (id: number): Promise<Podcast> => {
    const response = await axios.get(`${API_URL}/podcasts/${id}`);
    return response.data;
};

export const addPodcast = async (podcast: Podcast): Promise<{ id: number }> => {
    const response = await axios.post(`${API_URL}/podcasts`, podcast);
    return response.data;
};

export const updatePodcast = async (id: number, podcast: Partial<Podcast>): Promise<void> => {
    await axios.put(`${API_URL}/podcasts/${id}`, podcast);
};

export const deletePodcast = async (id: number): Promise<void> => {
    await axios.delete(`${API_URL}/podcasts/${id}`);
};

export const getCategories = async (): Promise<string[]> => {
    const response = await axios.get(`${API_URL}/categories`);
    return response.data.map((c: { category: string }) => c.category);
};
