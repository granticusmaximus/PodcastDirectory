import db from './database';
import type { Episode, User, QueueItem, ListeningHistory, Favorite } from './database';

// Episode operations
export const episodeDB = {
    // Get all episodes for a podcast
    getByPodcastId: (podcastId: number) => {
        const stmt = db.prepare('SELECT * FROM episodes WHERE podcast_id = ? ORDER BY published_date DESC');
        return stmt.all(podcastId) as Episode[];
    },

    // Get episode by ID
    getById: (id: number) => {
        const stmt = db.prepare('SELECT * FROM episodes WHERE id = ?');
        return stmt.get(id) as Episode | undefined;
    },

    // Add episode
    add: (episode: Episode) => {
        const stmt = db.prepare(`
      INSERT INTO episodes (podcast_id, title, description, audio_url, duration, published_date, transcript_url, guid)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
        const info = stmt.run(
            episode.podcast_id,
            episode.title,
            episode.description || null,
            episode.audio_url,
            episode.duration || null,
            episode.published_date || null,
            episode.transcript_url || null,
            episode.guid || null
        );
        return info.lastInsertRowid;
    },

    // Bulk add episodes
    addMany: (episodes: Episode[]) => {
        const stmt = db.prepare(`
      INSERT OR IGNORE INTO episodes (podcast_id, title, description, audio_url, duration, published_date, transcript_url, guid)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
        const insertMany = db.transaction((eps: Episode[]) => {
            for (const ep of eps) {
                stmt.run(
                    ep.podcast_id,
                    ep.title,
                    ep.description || null,
                    ep.audio_url,
                    ep.duration || null,
                    ep.published_date || null,
                    ep.transcript_url || null,
                    ep.guid || null
                );
            }
        });
        insertMany(episodes);
    }
};

// User operations
export const userDB = {
    // Get user by ID
    getById: (id: number) => {
        const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
        return stmt.get(id) as User | undefined;
    },

    // Get user by email
    getByEmail: (email: string) => {
        const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
        return stmt.get(email) as User | undefined;
    },

    // Get user by username
    getByUsername: (username: string) => {
        const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
        return stmt.get(username) as User | undefined;
    },

    // Add user
    add: (user: User) => {
        const stmt = db.prepare(`
      INSERT INTO users (email, password_hash, username, display_name, avatar_url, bio)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
        const info = stmt.run(
            user.email,
            user.password_hash,
            user.username,
            user.display_name || null,
            user.avatar_url || null,
            user.bio || null
        );
        return info.lastInsertRowid;
    },

    // Update user
    update: (id: number, user: Partial<User>) => {
        const fields = [];
        const values = [];

        if (user.display_name !== undefined) {
            fields.push('display_name = ?');
            values.push(user.display_name);
        }
        if (user.avatar_url !== undefined) {
            fields.push('avatar_url = ?');
            values.push(user.avatar_url);
        }
        if (user.bio !== undefined) {
            fields.push('bio = ?');
            values.push(user.bio);
        }
        if (user.twitter_handle !== undefined) {
            fields.push('twitter_handle = ?');
            values.push(user.twitter_handle);
        }
        if (user.facebook_id !== undefined) {
            fields.push('facebook_id = ?');
            values.push(user.facebook_id);
        }
        if (user.instagram_handle !== undefined) {
            fields.push('instagram_handle = ?');
            values.push(user.instagram_handle);
        }

        if (fields.length === 0) return;

        values.push(id);
        const stmt = db.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`);
        return stmt.run(...values);
    }
};

// Queue operations
export const queueDB = {
    // Get user's queue
    getByUserId: (userId: number) => {
        const stmt = db.prepare(`
      SELECT q.*, e.* 
      FROM queue q
      JOIN episodes e ON q.episode_id = e.id
      WHERE q.user_id = ?
      ORDER BY q.position ASC
    `);
        return stmt.all(userId) as QueueItem[];
    },

    // Add to queue
    add: (userId: number, episodeId: number) => {
        // Get the max position
        const maxStmt = db.prepare('SELECT MAX(position) as max_pos FROM queue WHERE user_id = ?');
        const result = maxStmt.get(userId) as { max_pos: number | null };
        const position = (result.max_pos || 0) + 1;

        const stmt = db.prepare(`
      INSERT INTO queue (user_id, episode_id, position)
      VALUES (?, ?, ?)
    `);
        const info = stmt.run(userId, episodeId, position);
        return info.lastInsertRowid;
    },

    // Update positions (for reordering)
    updatePositions: (userId: number, items: { id: number; position: number }[]) => {
        const stmt = db.prepare('UPDATE queue SET position = ? WHERE id = ? AND user_id = ?');
        const updateMany = db.transaction((updates: { id: number; position: number }[]) => {
            for (const item of updates) {
                stmt.run(item.position, item.id, userId);
            }
        });
        updateMany(items);
    },

    // Remove from queue
    remove: (id: number, userId: number) => {
        const stmt = db.prepare('DELETE FROM queue WHERE id = ? AND user_id = ?');
        return stmt.run(id, userId);
    },

    // Clear queue
    clear: (userId: number) => {
        const stmt = db.prepare('DELETE FROM queue WHERE user_id = ?');
        return stmt.run(userId);
    }
};

// Listening history operations
export const historyDB = {
    // Get user's listening history
    getByUserId: (userId: number) => {
        const stmt = db.prepare(`
      SELECT h.*, e.*
      FROM listening_history h
      JOIN episodes e ON h.episode_id = e.id
      WHERE h.user_id = ?
      ORDER BY h.last_played DESC
    `);
        return stmt.all(userId) as ListeningHistory[];
    },

    // Update or create history entry
    upsert: (userId: number, episodeId: number, progress: number, completed: boolean) => {
        const stmt = db.prepare(`
      INSERT INTO listening_history (user_id, episode_id, progress, completed, last_played)
      VALUES (?, ?, ?, ?, datetime('now'))
      ON CONFLICT(user_id, episode_id) DO UPDATE SET
        progress = excluded.progress,
        completed = excluded.completed,
        last_played = excluded.last_played
    `);
        return stmt.run(userId, episodeId, progress, completed ? 1 : 0);
    },

    // Get progress for specific episode
    getProgress: (userId: number, episodeId: number) => {
        const stmt = db.prepare('SELECT * FROM listening_history WHERE user_id = ? AND episode_id = ?');
        return stmt.get(userId, episodeId) as ListeningHistory | undefined;
    }
};

// Favorites operations
export const favoriteDB = {
    // Get user's favorites
    getByUserId: (userId: number) => {
        const stmt = db.prepare(`
      SELECT f.*, p.*
      FROM favorites f
      JOIN podcasts p ON f.podcast_id = p.id
      WHERE f.user_id = ?
      ORDER BY f.created_at DESC
    `);
        return stmt.all(userId) as Favorite[];
    },

    // Add favorite
    add: (userId: number, podcastId: number) => {
        const stmt = db.prepare(`
      INSERT INTO favorites (user_id, podcast_id)
      VALUES (?, ?)
    `);
        const info = stmt.run(userId, podcastId);
        return info.lastInsertRowid;
    },

    // Remove favorite
    remove: (userId: number, podcastId: number) => {
        const stmt = db.prepare('DELETE FROM favorites WHERE user_id = ? AND podcast_id = ?');
        return stmt.run(userId, podcastId);
    },

    // Check if favorite exists
    exists: (userId: number, podcastId: number) => {
        const stmt = db.prepare('SELECT COUNT(*) as count FROM favorites WHERE user_id = ? AND podcast_id = ?');
        const result = stmt.get(userId, podcastId) as { count: number };
        return result.count > 0;
    }
};
