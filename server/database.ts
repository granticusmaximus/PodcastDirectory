import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const db = new Database(path.join(__dirname, 'podcasts.db'));

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS podcasts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author TEXT,
    description TEXT,
    category TEXT NOT NULL,
    feed_url TEXT,
    image_url TEXT,
    itunes_id TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS episodes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    podcast_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    audio_url TEXT NOT NULL,
    duration INTEGER,
    published_date DATETIME,
    transcript_url TEXT,
    guid TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (podcast_id) REFERENCES podcasts(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    twitter_handle TEXT,
    facebook_id TEXT,
    instagram_handle TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    used INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    episode_id INTEGER NOT NULL,
    position INTEGER NOT NULL,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS listening_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    episode_id INTEGER NOT NULL,
    progress INTEGER DEFAULT 0,
    completed BOOLEAN DEFAULT 0,
    last_played DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (episode_id) REFERENCES episodes(id) ON DELETE CASCADE,
    UNIQUE(user_id, episode_id)
  );

  CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    podcast_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (podcast_id) REFERENCES podcasts(id) ON DELETE CASCADE,
    UNIQUE(user_id, podcast_id)
  );

  CREATE INDEX IF NOT EXISTS idx_category ON podcasts(category);
  CREATE INDEX IF NOT EXISTS idx_itunes_id ON podcasts(itunes_id);
  CREATE INDEX IF NOT EXISTS idx_podcast_episodes ON episodes(podcast_id);
  CREATE INDEX IF NOT EXISTS idx_episode_guid ON episodes(guid);
  CREATE INDEX IF NOT EXISTS idx_user_queue ON queue(user_id);
  CREATE INDEX IF NOT EXISTS idx_user_history ON listening_history(user_id);
  CREATE INDEX IF NOT EXISTS idx_user_favorites ON favorites(user_id);
`);

export interface Podcast {
    id?: number;
    title: string;
    author?: string;
    description?: string;
    category: string;
    feed_url?: string;
    image_url?: string;
    itunes_id?: string;
    created_at?: string;
}

export interface Episode {
    id?: number;
    podcast_id: number;
    title: string;
    description?: string;
    audio_url: string;
    duration?: number;
    published_date?: string;
    transcript_url?: string;
    guid?: string;
    created_at?: string;
}

export interface User {
    id?: number;
    email: string;
    password_hash?: string;
    username: string;
    display_name?: string;
    avatar_url?: string;
    bio?: string;
    twitter_handle?: string;
    facebook_id?: string;
    instagram_handle?: string;
    created_at?: string;
}

export interface QueueItem {
    id?: number;
    user_id: number;
    episode_id: number;
    position: number;
    added_at?: string;
}

export interface ListeningHistory {
    id?: number;
    user_id: number;
    episode_id: number;
    progress: number;
    completed: boolean;
    last_played?: string;
}

export interface Favorite {
    id?: number;
    user_id: number;
    podcast_id: number;
    created_at?: string;
}

export const podcastDB = {
    // Get all podcasts
    getAll: () => {
        const stmt = db.prepare('SELECT * FROM podcasts ORDER BY created_at DESC');
        return stmt.all() as Podcast[];
    },

    // Get podcasts by category
    getByCategory: (category: string) => {
        const stmt = db.prepare('SELECT * FROM podcasts WHERE category = ? ORDER BY created_at DESC');
        return stmt.all(category) as Podcast[];
    },

    // Search podcasts
    search: (query: string) => {
        const stmt = db.prepare(`
      SELECT * FROM podcasts 
      WHERE title LIKE ? OR description LIKE ? OR author LIKE ?
      ORDER BY created_at DESC
    `);
        const searchTerm = `%${query}%`;
        return stmt.all(searchTerm, searchTerm, searchTerm) as Podcast[];
    },

    // Get podcast by ID
    getById: (id: number) => {
        const stmt = db.prepare('SELECT * FROM podcasts WHERE id = ?');
        return stmt.get(id) as Podcast | undefined;
    },

    // Add podcast
    add: (podcast: Podcast) => {
        const stmt = db.prepare(`
      INSERT INTO podcasts (title, author, description, category, feed_url, image_url, itunes_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
        const info = stmt.run(
            podcast.title,
            podcast.author || null,
            podcast.description || null,
            podcast.category,
            podcast.feed_url || null,
            podcast.image_url || null,
            podcast.itunes_id || null
        );
        return info.lastInsertRowid;
    },

    // Update podcast
    update: (id: number, podcast: Partial<Podcast>) => {
        const fields = [];
        const values = [];

        if (podcast.title !== undefined) {
            fields.push('title = ?');
            values.push(podcast.title);
        }
        if (podcast.author !== undefined) {
            fields.push('author = ?');
            values.push(podcast.author);
        }
        if (podcast.description !== undefined) {
            fields.push('description = ?');
            values.push(podcast.description);
        }
        if (podcast.category !== undefined) {
            fields.push('category = ?');
            values.push(podcast.category);
        }
        if (podcast.feed_url !== undefined) {
            fields.push('feed_url = ?');
            values.push(podcast.feed_url);
        }
        if (podcast.image_url !== undefined) {
            fields.push('image_url = ?');
            values.push(podcast.image_url);
        }

        if (fields.length === 0) return;

        values.push(id);
        const stmt = db.prepare(`UPDATE podcasts SET ${fields.join(', ')} WHERE id = ?`);
        return stmt.run(...values);
    },

    // Delete podcast
    delete: (id: number) => {
        const stmt = db.prepare('DELETE FROM podcasts WHERE id = ?');
        return stmt.run(id);
    },

    // Get all unique categories
    getCategories: () => {
        const stmt = db.prepare('SELECT DISTINCT category FROM podcasts ORDER BY category');
        return stmt.all() as { category: string }[];
    }
};

export default db;
