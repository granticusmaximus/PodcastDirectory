import Parser from 'rss-parser';

const parser = new Parser();

export interface ParsedEpisode {
    title: string;
    description?: string;
    audioUrl: string;
    duration?: number;
    publishedDate?: string;
    guid?: string;
}

export async function parsePodcastFeed(feedUrl: string): Promise<ParsedEpisode[]> {
    try {
        const feed = await parser.parseURL(feedUrl);

        return feed.items.map((item) => ({
            title: item.title || 'Untitled Episode',
            description: item.contentSnippet || item.content || undefined,
            audioUrl: item.enclosure?.url || '',
            duration: item.itunes?.duration ? parseDuration(item.itunes.duration) : undefined,
            publishedDate: item.pubDate,
            guid: item.guid || item.link,
        })).filter(ep => ep.audioUrl); // Only return episodes with audio
    } catch (error) {
        console.error('Error parsing RSS feed:', error);
        throw new Error('Failed to parse podcast feed');
    }
}

function parseDuration(duration: string): number {
    // Duration can be in format: "HH:MM:SS", "MM:SS", or just seconds
    if (!duration) return 0;

    // If it's already a number
    if (!isNaN(Number(duration))) {
        return Number(duration);
    }

    const parts = duration.split(':').map(Number);

    if (parts.length === 3) {
        // HH:MM:SS
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
        // MM:SS
        return parts[0] * 60 + parts[1];
    }

    return 0;
}
