import { type PlatformDetector, cleanTitle, make, parseNum, isReadingManga } from '../helpers';

/**
 * Generic Manga Detector for various engines (Madara, MangaStream, etc.)
 * Handles sites like: MangaSee, Bato.to, Asura, Flame, and all Aidoku community sources.
 *
 * To add a new site: just add its URL pattern to the `matches` array below.
 */
export const genericMangaDetector: PlatformDetector = {
    platform: 'generic_manga',
    matches: [
        /mangasee123\.com\/read-online\//,
        /mangalife\.us\/read-online\//,
        /bato\.to\/chapter\//,
        /asuracomic\.net\/series\/.+\/chapter\//,
        /flamecomics\.(com|xyz)\/.+-chapter-/,
        /readm\.org\/manga\/.+\/.+\//,
        /mangabuddy\.com\/.+\/chapter-/,
        /copymanga\.site\/h5\/details\/manga\//,
        /2026copy\.com/,
        /guya\.moe\/read\/manga\//,
        /dynastyscans\.com\/chapters\//,
        /mangapark\.net\/title\/.+\/.+/,
        // Aidoku Sources - English & Global
        /promanga\.net/, /silentquill\.net/, /batcave\.biz/, /comix\.to/, /hivetoons\.org/,
        /manga\.madokami\.al/, /magustoon\.org/, /mangabats\.com/, /mangadistrict\.com/, /mangago\.me/,
        /mangakakalot\.gg/, /manganato\.gg/, /nelomanga\.net/, /mangaread\.org/, /mangasect\.net/,
        /mangatx\.cc/, /manhuagold\.top/, /manhuaplus\.org/, /manhwax\.top/, /novelbuddy\.com/,
        /nyxscans\.com/, /qiscans\.org/, /readcomiconline\.li/, /rizzfables\.com/, /tcbonepiecechapters\.com/,
        /toonily\.(com|me)/, /vortexscans\.org/, /webtoon\.xyz/, /weebcentral\.com/, /mangafire\.to/,
        /nhentai\.net/, /cubari\.moe/, /xbat\.si/,
        // Aidoku Sources - Regional (ID, FR, ES, RU, JA)
        /kanzenin\.info/, /komiksin\.net/, /komiktap\.info/, /komiku\.asia/, /mangasusuku\.com/,
        /manhwalist02\.site/, /natsu\.tv/, /bigsolo\.org/, /sushiscan\.net/, /catharsisworld\.dig-it\.info/,
        /eternalmangas\.org/, /flowermanga\.net/, /mangalivre\.tv/, /hentailib\.me/, /mangalib\.me/,
        /ranobelib\.me/, /slashlib\.me/, /mangaworld\.(mx|net)/, /comic-action\.com/, /comic-days\.com/,
        /manga\.io\.vn/, /manga1000\.top/, /mangamura\.net/, /manga\.nicovideo\.jp/, /raw1001\.net/,
        /rawfree\.at/, /rawkuma\.net/, /rawkuro\.net/, /rawotaku\.com/, /shonenjumpplus\.com/,
        // Aidoku Sources - China & Vietnam
        /go-manga\.com/, /pretty-frank\.com/, /up-manga\.com/, /cmangax12\.com/, /cuutruyen\.net/,
        /dilib\.vn/, /foxtruyen2\.com/, /nettruyenviet1\.com/, /manhua3q\.com/, /truyenqq(no|\.online)/,
        /zettruyen\.space/, /baozimh\.com/, /bilimanga\.net/, /boylove\.cc/,
        /godamh\.com/, /happymh\.com/, /mangabz\.com/, /manhuagui\.com/, /mycomic\.com/,
        /manhuabika\.com/, /manga2026\.com/, /wnacg\.com/, /zaimanhua\.com/,
    ],
    detect() {
        // 1. Breadcrumb priority for series title (usually "Series > Chapter")
        const breadcrumbTitle = document.querySelector('.breadcrumb a:nth-last-child(2), .panel-breadcrumb a:nth-last-child(2), .breadcrumb-item:nth-last-child(2) a')?.textContent?.trim();
        const metaTitle = document.querySelector('meta[property="og:title"]')?.getAttribute('content') ?? '';

        // 2. Try to find chapter/progress — PRIORITIZE URL
        const segments = location.pathname.split('/').filter(Boolean);
        const lastSegment = segments[segments.length - 1];
        let progressMatch = location.pathname.match(/\/view\/[^\/]+\/([\d.]+)/i)
            || location.pathname.match(/chapter[-_]([\d.]+)/i)
            || location.href.match(/chapter\/([\d.]+)/i)
            || location.href.match(/ch[-_]?([\d.]+)/i)
            || (lastSegment && /^\d+(?:\.\d+)?$/.test(lastSegment) ? [null, lastSegment] : null);

        // Fallback to DOM parsing with broader selectors
        let rawText = '';
        if (!progressMatch) {
            // Document title is the most reliable non-URL indicator of the CURRENT viewing page
            // We allow text before "Chapter" to catch formats like "One Piece - Chapter 123"
            let titleMatch = document.title.match(/Chapter\s*([\d.]+)/i) || document.title.match(/Ch\.\s*([\d.]+)/i);
            if (titleMatch) {
                progressMatch = titleMatch;
                rawText = document.title;
            } else {
                const searchSelectors = [
                    'select option:checked', '.current-chapter', '#chapter-heading', '.chapter-title',
                    'button.active', '.navbar .active', '.chapter-info',
                    '.chapter-selector', '.dropdown-toggle', 'h1', 'h2'
                ];
                for (const sel of searchSelectors) {
                    const el = document.querySelector(sel);
                    const m = el?.textContent?.match(/Chapter\s*([\d.]+)/i) || el?.textContent?.match(/Ch\.\s*([\d.]+)/i);
                    if (m) {
                        progressMatch = m;
                        rawText = el!.textContent!;
                        break;
                    }
                }
            }

            // If still nothing, scan any element that mentions "Chapter"
            if (!progressMatch) {
                const anyChapter = Array.from(document.querySelectorAll('button, span, a, p, div')).find(el => el.textContent?.match(/Chapter\s*\d+/i) || el.textContent?.match(/Ch\.\s*\d+/i));
                if (anyChapter) {
                    progressMatch = anyChapter.textContent!.match(/Chapter\s*([\d.]+)/i) || anyChapter.textContent!.match(/Ch\.\s*([\d.]+)/i);
                    rawText = anyChapter.textContent!;
                }
            }
        } // <-- ADDED MISSING CLOSING BRACE

        let progress = 0;
        if (progressMatch) {
            progress = parseFloat(progressMatch[1] || progressMatch[0] || '0');
        } else {
            progress = parseNum(rawText);
        }

        // 3. Clean title — prefer breadcrumb if it doesn't look like a chapter label
        let title = '';
        if (breadcrumbTitle && !breadcrumbTitle.match(/^Chapter\s*\d+/i)) {
            title = breadcrumbTitle;
        } else {
            const domTitle = document.querySelector('.series-title, .manga-title, .title, #series-title')?.textContent?.trim() || '';
            const fallbackMeta = metaTitle.split(' - ')[0].split(' | ')[0].trim();
            // If DOM title literally is just "Chapter X", explicitly throw it away
            title = domTitle && !domTitle.match(/^Chapter\s*\d+/i) ? domTitle : fallbackMeta;
        }

        title = cleanTitle(title);

        if (!isReadingManga() || progress <= 0 || !title) return null;

        const lowercaseTitle = title.toLowerCase();
        const junk = [
            'chapter 1', 'home', 'manga', 'manhua', 'manhwa', 'weeb central', 'community manga',
            'manga online', 'read manga', 'read manga online', 'free manga', 'read comics',
            'komik', 'komik online', 'baca komik', 'baca manga', 'manga free', 'read free manga'
        ];
        if (junk.includes(lowercaseTitle) || lowercaseTitle.length < 2) return null;

        console.log(`[Tsugi] Generic Manga Detection: Title="${title}", Progress=${progress}`);
        return make('generic_manga', title, progress, 'manga');
    },
};
