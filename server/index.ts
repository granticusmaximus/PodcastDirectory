import express, { Request, Response } from 'express';
import cors from 'cors';
import { podcastDB, Podcast } from './database';
import { episodeDB, queueDB, historyDB, userDB, favoriteDB } from './database-extended';
import { parsePodcastFeed } from './rss-parser';
import axios from 'axios';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const app = express();
const PORT = 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased limit for base64 images
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Authentication endpoints
app.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
        const { username, email, password } = req.body;

        // Validate input
        if (!username || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        // Check if user exists
        const existingUser = userDB.getByEmail(email);
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        const existingUsername = userDB.getByUsername(username);
        if (existingUsername) {
            return res.status(400).json({ error: 'Username already taken' });
        }

        // Hash password
        const password_hash = await bcrypt.hash(password, 10);

        // Create user
        const userId = userDB.add({
            email,
            password_hash,
            username,
            display_name: username
        });

        // Generate token
        const token = jwt.sign({ userId, email, username }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            token,
            user: {
                id: userId,
                email,
                username,
                display_name: username
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        // Validate input
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user
        const user = userDB.getByEmail(email);
        if (!user || !user.password_hash) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password
        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Generate token
        const token = jwt.sign({ userId: user.id, email: user.email, username: user.username }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                display_name: user.display_name,
                avatar_url: user.avatar_url
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Update user profile
app.put('/api/users/:userId', async (req: Request, res: Response) => {
    console.log('PUT /api/users/:userId called with userId:', req.params.userId);
    console.log('Request body:', req.body);

    try {
        const userId = parseInt(req.params.userId as string);
        const { display_name, avatar_url, bio, twitter_handle, facebook_id, instagram_handle } = req.body;

        userDB.update(userId, {
            display_name,
            avatar_url,
            bio,
            twitter_handle,
            facebook_id,
            instagram_handle
        });

        // Get updated user
        const updatedUser = userDB.getById(userId);

        res.json({
            message: 'Profile updated successfully',
            user: {
                id: updatedUser?.id,
                email: updatedUser?.email,
                username: updatedUser?.username,
                display_name: updatedUser?.display_name,
                avatar_url: updatedUser?.avatar_url,
                bio: updatedUser?.bio,
                twitter_handle: updatedUser?.twitter_handle,
                facebook_id: updatedUser?.facebook_id,
                instagram_handle: updatedUser?.instagram_handle
            }
        });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

// Search iTunes/Apple Podcasts API
app.get('/api/search', async (req: Request, res: Response) => {
    try {
        const { term, limit = 20 } = req.query;

        if (!term) {
            return res.status(400).json({ error: 'Search term is required' });
        }

        const response = await axios.get('https://itunes.apple.com/search', {
            params: {
                term,
                media: 'podcast',
                entity: 'podcast',
                limit
            }
        });

        interface iTunesResult {
            collectionName?: string;
            trackName?: string;
            artistName?: string;
            description?: string;
            primaryGenreName?: string;
            feedUrl?: string;
            artworkUrl600?: string;
            artworkUrl100?: string;
            collectionId?: number;
        }

        const podcasts = response.data.results.map((item: iTunesResult) => ({
            title: item.collectionName || item.trackName,
            author: item.artistName,
            description: item.description,
            category: item.primaryGenreName || 'General',
            feed_url: item.feedUrl,
            image_url: item.artworkUrl600 || item.artworkUrl100,
            itunes_id: item.collectionId?.toString()
        }));

        res.json(podcasts);
    } catch (error) {
        console.error('Error searching podcasts:', error);
        res.status(500).json({ error: 'Failed to search podcasts' });
    }
});

// Get all podcasts from local database
app.get('/api/podcasts', (req: Request, res: Response) => {
    try {
        const podcasts = podcastDB.getAll();
        res.json(podcasts);
    } catch (error) {
        console.error('Error fetching podcasts:', error);
        res.status(500).json({ error: 'Failed to fetch podcasts' });
    }
});

// Get podcasts by category
app.get('/api/podcasts/category/:category', (req: Request, res: Response) => {
    try {
        const { category } = req.params;
        const categoryStr = Array.isArray(category) ? category[0] : category;
        const podcasts = podcastDB.getByCategory(categoryStr);
        res.json(podcasts);
    } catch (error) {
        console.error('Error fetching podcasts by category:', error);
        res.status(500).json({ error: 'Failed to fetch podcasts' });
    }
});

// Search local database
app.get('/api/podcasts/search', (req: Request, res: Response) => {
    try {
        const { q } = req.query;

        if (!q) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        const podcasts = podcastDB.search(q as string);
        res.json(podcasts);
    } catch (error) {
        console.error('Error searching podcasts:', error);
        res.status(500).json({ error: 'Failed to search podcasts' });
    }
});

// Get podcast by ID
app.get('/api/podcasts/:id', (req: Request, res: Response) => {
    try {
        const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const id = parseInt(idParam);
        const podcast = podcastDB.getById(id);

        if (!podcast) {
            return res.status(404).json({ error: 'Podcast not found' });
        }

        res.json(podcast);
    } catch (error) {
        console.error('Error fetching podcast:', error);
        res.status(500).json({ error: 'Failed to fetch podcast' });
    }
});

// Add podcast to local database
app.post('/api/podcasts', (req: Request, res: Response) => {
    try {
        const podcast: Podcast = req.body;

        if (!podcast.title || !podcast.category) {
            return res.status(400).json({ error: 'Title and category are required' });
        }

        const id = podcastDB.add(podcast);
        res.status(201).json({ id, message: 'Podcast added successfully' });
    } catch (error: unknown) {
        console.error('Error adding podcast:', error);
        if (error && typeof error === 'object' && 'code' in error && error.code === 'SQLITE_CONSTRAINT') {
            res.status(409).json({ error: 'Podcast already exists in database' });
        } else {
            res.status(500).json({ error: 'Failed to add podcast' });
        }
    }
});

// Update podcast
app.put('/api/podcasts/:id', (req: Request, res: Response) => {
    try {
        const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const id = parseInt(idParam);
        const podcast: Partial<Podcast> = req.body;

        podcastDB.update(id, podcast);
        res.json({ message: 'Podcast updated successfully' });
    } catch (error) {
        console.error('Error updating podcast:', error);
        res.status(500).json({ error: 'Failed to update podcast' });
    }
});

// Delete podcast
app.delete('/api/podcasts/:id', (req: Request, res: Response) => {
    try {
        const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const id = parseInt(idParam);
        podcastDB.delete(id);
        res.json({ message: 'Podcast deleted successfully' });
    } catch (error) {
        console.error('Error deleting podcast:', error);
        res.status(500).json({ error: 'Failed to delete podcast' });
    }
});

// Get all categories
app.get('/api/categories', (req: Request, res: Response) => {
    try {
        const categories = podcastDB.getCategories();
        res.json(categories);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ error: 'Failed to fetch categories' });
    }
});

// Get episodes for a podcast (parse RSS feed)
app.get('/api/podcasts/:id/episodes', async (req: Request, res: Response) => {
    try {
        const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const podcastId = parseInt(idParam);

        // First check if we have episodes in DB
        const existingEpisodes = episodeDB.getByPodcastId(podcastId);
        if (existingEpisodes.length > 0) {
            return res.json(existingEpisodes);
        }

        // If no episodes, fetch from RSS feed
        const podcast = podcastDB.getById(podcastId);
        if (!podcast || !podcast.feed_url) {
            return res.status(404).json({ error: 'Podcast or feed URL not found' });
        }

        const parsedEpisodes = await parsePodcastFeed(podcast.feed_url);

        // Save episodes to database
        const episodes = parsedEpisodes.map(ep => ({
            podcast_id: podcastId,
            title: ep.title,
            description: ep.description,
            audio_url: ep.audioUrl,
            duration: ep.duration,
            published_date: ep.publishedDate,
            guid: ep.guid
        }));

        episodeDB.addMany(episodes);

        // Fetch and return saved episodes
        const savedEpisodes = episodeDB.getByPodcastId(podcastId);
        res.json(savedEpisodes);
    } catch (error) {
        console.error('Error fetching episodes:', error);
        res.status(500).json({ error: 'Failed to fetch episodes' });
    }
});

// Queue endpoints
app.get('/api/queue/:userId', (req: Request, res: Response) => {
    try {
        const userIdParam = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
        const userId = parseInt(userIdParam);
        const queue = queueDB.getByUserId(userId);
        res.json(queue);
    } catch (error) {
        console.error('Error fetching queue:', error);
        res.status(500).json({ error: 'Failed to fetch queue' });
    }
});

app.post('/api/queue', (req: Request, res: Response) => {
    try {
        const { userId, episodeId } = req.body;
        const id = queueDB.add(userId, episodeId);
        res.status(201).json({ id, message: 'Added to queue' });
    } catch (error) {
        console.error('Error adding to queue:', error);
        res.status(500).json({ error: 'Failed to add to queue' });
    }
});

app.put('/api/queue/reorder', (req: Request, res: Response) => {
    try {
        const { userId, items } = req.body;
        queueDB.updatePositions(userId, items);
        res.json({ message: 'Queue reordered' });
    } catch (error) {
        console.error('Error reordering queue:', error);
        res.status(500).json({ error: 'Failed to reorder queue' });
    }
});

app.delete('/api/queue/:id', (req: Request, res: Response) => {
    try {
        const idParam = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const id = parseInt(idParam);
        const { userId } = req.body;
        queueDB.remove(id, userId);
        res.json({ message: 'Removed from queue' });
    } catch (error) {
        console.error('Error removing from queue:', error);
        res.status(500).json({ error: 'Failed to remove from queue' });
    }
});

app.delete('/api/queue/clear', (req: Request, res: Response) => {
    try {
        const { userId } = req.body;
        queueDB.clear(userId);
        res.json({ message: 'Queue cleared' });
    } catch (error) {
        console.error('Error clearing queue:', error);
        res.status(500).json({ error: 'Failed to clear queue' });
    }
});

// Listening history endpoints
app.post('/api/history', (req: Request, res: Response) => {
    try {
        const { userId, episodeId, progress, completed } = req.body;
        historyDB.upsert(userId, episodeId, progress, completed);
        res.json({ message: 'Progress saved' });
    } catch (error) {
        console.error('Error saving progress:', error);
        res.status(500).json({ error: 'Failed to save progress' });
    }
});

app.get('/api/history/:userId', (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.params.userId as string);
        const history = historyDB.getByUserId(userId);

        // Enrich with episode details
        const enrichedHistory = history.map(item => {
            const episode = episodeDB.getById(item.episode_id);
            return {
                ...item,
                episode,
                last_listened_at: item.last_played
            };
        });

        res.json(enrichedHistory);
    } catch (error) {
        console.error('Error fetching history:', error);
        res.status(500).json({ error: 'Failed to fetch history' });
    }
});

// Favorites endpoints
app.get('/api/favorites/:userId', (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.params.userId as string);
        const favorites = favoriteDB.getByUserId(userId);
        res.json(favorites);
    } catch (error) {
        console.error('Error fetching favorites:', error);
        res.status(500).json({ error: 'Failed to fetch favorites' });
    }
});

app.post('/api/favorites', (req: Request, res: Response) => {
    try {
        const { userId, podcastId } = req.body;
        const id = favoriteDB.add(userId, podcastId);
        res.json({ id, message: 'Added to favorites' });
    } catch (error) {
        console.error('Error adding favorite:', error);
        res.status(500).json({ error: 'Failed to add favorite' });
    }
});

app.delete('/api/favorites/:userId/:podcastId', (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.params.userId as string);
        const podcastId = parseInt(req.params.podcastId as string);
        favoriteDB.remove(userId, podcastId);
        res.json({ message: 'Removed from favorites' });
    } catch (error) {
        console.error('Error removing favorite:', error);
        res.status(500).json({ error: 'Failed to remove favorite' });
    }
});

app.get('/api/favorites/:userId/:podcastId/check', (req: Request, res: Response) => {
    try {
        const userId = parseInt(req.params.userId as string);
        const podcastId = parseInt(req.params.podcastId as string);
        const exists = favoriteDB.exists(userId, podcastId);
        res.json({ isFavorite: exists });
    } catch (error) {
        console.error('Error checking favorite:', error);
        res.status(500).json({ error: 'Failed to check favorite' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
