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
    episode?: Episode;
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

export interface SearchResult extends Podcast { }
