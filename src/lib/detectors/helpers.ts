import type { DetectedMedia, MediaType, PlatformType } from '@/lib/types';

// ─── Detector Interface ───────────────────────────────────────────────────────

export interface PlatformDetector {
    platform: PlatformType;
    /** URL patterns this detector handles */
    matches: RegExp[];
    detect(): DetectedMedia | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function text(selector: string): string {
    return document.querySelector(selector)?.textContent?.trim() ?? '';
}

export function parseNum(str: string): number {
    return parseFloat(str.replace(/[^0-9.]/g, '')) || 0;
}

export function make(platform: PlatformType, title: string, progress: number, type: MediaType): DetectedMedia {
    return { platform, title, progress, type, url: location.href };
}

export function cleanTitle(title: string): string {
    if (!title) return '';
    return title
        // Strip prefixed actions (e.g. "Read Bastard" -> "Bastard")
        .replace(/^\s*(?:Read|Watch|Free|Download)\s+/i, '')
        // Only strip suffix after | – — if it looks like a site name / boilerplate
        .replace(/\s*[|]\s*(?:Watch|Read|Free|Online|HD|Sub|Dub|Streaming|Anime|Manga|Episode|Ep).*$/i, '')
        .replace(/\s*[-–—]\s*(?:Watch|Read|Free|Online|HD|Sub|Dub|Streaming|Episode|Ep)\s.*$/i, '')
        // Strip chapter/episode progress labels at end
        .replace(/\s+(?:Chapter|Ch|Ep|Episode|Vol|Volume)\s*\d+.*$/i, '')
        .replace(/\s+Read\s+Online.*$/i, '')
        .trim();
}

export function isReadingManga(): boolean {
    // 1. Explicit Reader Container is the most reliable
    // If we're inside one of these, we're definitely reading a chapter
    const explicitReader = document.querySelector('#reader, .reader, #chapter-images, .images-container, .viewer, .read-container, #v-reader, .page-break, .reading-content, .container-chapter, .chapter-content');
    if (explicitReader) return true;

    // 2. URL strongly suggests we're in a chapter page
    const url = location.href;
    if (/\/chapter[-_]?\d+/i.test(url)) return true;
    if (/\/ch[-_]?\d+/i.test(url)) return true;
    if (/\/read[-_]?online\//i.test(url)) return true;
    if (/[?&]chapter=\d+/i.test(url)) return true;

    // 3. Fallback: Image count inside a container normally associated with reading content
    // We do NOT want to count images globally or we'll trigger on index pages
    const readerImages = document.querySelectorAll('#reader img, .chapter-content img, .read-content img, .page-break img, .reading-content img, .blocks-gallery-item img, .entry-content img');
    if (readerImages.length > 3) return true;

    // 4. Broader Fallback: Check if there's a huge sequence of images in a generic app container
    // Useful for sites that just use <div id="app"><img><img><img></div>
    const genericContainers = Array.from(document.querySelectorAll('#app, .app, #__layout, .container, main, #manga-page'));
    for (const container of genericContainers) {
        if (container.querySelectorAll('img').length > 5) {
            // High confidence it's a chapter if it has 6+ images grouped tightly
            return true;
        }
    }

    // WeebCentral specific: reader has many images inside main or a specific ID
    if (location.hostname.includes('weebcentral') && location.pathname.includes('/chapters/')) {
        return document.querySelectorAll('img').length > 5;
    }

    return false;
}

export function isWatchingAnime(): boolean {
    // 1. Explicit player element already in DOM (most reliable)
    if (document.querySelector(
        'video, iframe[src*="player"], iframe[src*="embed"], ' +
        '#player, .player, #video-player, .video-content, ' +
        '.video-js, .jw-video, [class*="player-container"], [id*="player"]'
    )) return true;

    // 2. URL strongly suggests a watch/episode page (handles SPAs before player loads)
    const url = location.href;
    if (/\/watch\//i.test(url)) return true;
    if (/\/episode\//i.test(url)) return true;
    if (/[?&]ep=\d/i.test(url)) return true;
    if (/-episode-\d/i.test(url)) return true;
    if (/\/ep\//i.test(url)) return true;
    if (/\/stream\//i.test(url)) return true;

    return false;
}
