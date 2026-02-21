import { type PlatformDetector, cleanTitle, make, parseNum, isReadingManga } from '../helpers';

export const mangaBatDetector: PlatformDetector = {
    platform: 'mangabat',
    matches: [/mangabat\.com\/chapter\//],
    detect() {
        const metaTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? '';
        const title = cleanTitle(metaTitle.split('|')[0] || metaTitle.split('-')[0]);
        const progress = parseNum(location.pathname.split('/').pop()?.replace('ep-', '') ?? '0');

        if (!isReadingManga() || !title || progress <= 0) return null;
        return make('mangabat', title, progress, 'manga');
    },
};

export const mangakakalotDetector: PlatformDetector = {
    platform: 'mangakakalot',
    matches: [/mangakakalot\.com\/chapter\//, /chapmanganato\.to\/manga-/],
    detect() {
        // Breadcrumb: Home > Manga Title > Chapter X
        const breadcrumbs = document.querySelectorAll('.breadcrumb p a, .panel-breadcrumb a, .breadcrumb-item a');
        const titleEl = breadcrumbs[breadcrumbs.length - 2] || breadcrumbs[1];
        const chapterEl = breadcrumbs[breadcrumbs.length - 1];

        const title = cleanTitle(titleEl?.textContent?.trim() ?? '');
        const progress = parseNum(chapterEl?.textContent ?? '');

        if (!isReadingManga() || !title) return null;
        return make('mangakakalot', title, progress, 'manga');
    },
};

export const tcbScansDetector: PlatformDetector = {
    platform: 'tcbscans',
    matches: [/tcbscans\.\w+\/chapters\//],
    detect() {
        // TODO: TCB Scans for One Piece etc — verify selectors
        const title = cleanTitle(document.querySelector('h1, .chapter-title')?.textContent?.trim() ?? '');
        const progress = parseNum(location.pathname.match(/chapters\/([\d.]+)/)?.[1] ?? '0');

        if (!isReadingManga() || !title) return null;
        return make('tcbscans', title, progress, 'manga');
    },
};

export const weebCentralDetector: PlatformDetector = {
    platform: 'weebcentral',
    matches: [/weebcentral\.com\/chapters\//],
    detect() {
        // WeebCentral has a top navigation bar. Back to Series button contains real title.
        const seriesLinks = Array.from(document.querySelectorAll('a[href*="/series/"]')) as HTMLAnchorElement[];
        const seriesBtn = seriesLinks.find(a => a.href.match(/\/series\/[0-9A-Z]{10,}/i));

        let title = cleanTitle(seriesBtn?.textContent?.trim() ?? '');

        // If seriesBtn fails, fallback
        if (!title || title.match(/^Chapter\s*\d+/i) || title.toLowerCase() === 'random') {
            const ogTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? '';
            title = cleanTitle(ogTitle.split(' | ')[0] ?? '');

            if (!title || title.match(/^Chapter\s*\d+/i)) {
                title = cleanTitle(document.title.split(/Chapter\s*\d+/i)[0].trim());
            }
        }

        const progressMatch = document.title?.match(/Chapter\s*([\d.]+)/i);
        const progress = parseFloat(progressMatch?.[1] ?? '0');

        if (!isReadingManga() || !title || progress <= 0) return null;
        return make('weebcentral', title, progress, 'manga');
    },
};
