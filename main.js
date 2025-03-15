import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';
import { mkdir, writeFile } from 'fs/promises';
import * as path from 'path';
import createDOMPurify from 'dompurify';
import TurndownService from 'turndown';

// main configs
const config = {
    sessionCookieName: 'MoodleSession',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36 OPR/117.0.0.0',
    courseUrl: 'https://www.moodle.aau.dk/course/view.php?id=55124',
    downloadDirectories: {
        images: 'images',
        exercises: 'exercises'
    }
};

// Session config
const sessionId = "efg188uq7vqquv34gmm2v4od2g";
const basicHeaders = {
    'Cookie': `${config.sessionCookieName}=${sessionId}`,
    'User-Agent': config.userAgent
};

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

class MoodleFetchError extends Error {
    constructor(message, statusCode) {
        super(message);
        this.name = 'MoodleFetchError';
    }
}

class ImageDownloadError extends Error {
    constructor(message,  imageUrl) {
        super(message);
        this.name = 'ImageDownloadError';
    }
}

// get all lecture links
async function getAllExersiseLinks() {
    return fetch(config.courseUrl, { method: 'GET', headers: basicHeaders })
        .then(response => {
            if (!response.ok) throw new MoodleFetchError(`HTTP error! status: ${response.status}`, response.status);
            return response.text();
        })
        .then(html => {
            // parse html w jsdom
            const dom = new JSDOM(html);
            const document = dom.window.document;

            const exerciseData = Array.from(
                document.querySelectorAll('[data-activityname="Exercises"] a'))
                .map(link => ({
                    url: link.href,
                    text: link.textContent.trim(),
                    id: link.closest('.activity-wrapper').dataset.id
                }))
                .filter((item, index, self) =>      // remove duplicates
                    index === self.findIndex(t => t.url === item.url));

            return exerciseData;
        });
}

// To trim newlines and adjust heading levels
function formatMarkdown(markdown) {
    return markdown
        // Remove extra newlines
        .replace(/\n{3,}/g, '\n')
        // Convert #### to ##
        .replace(/^#### /gm, '## ')
        // Remove trailing whitespace
        .replace(/[ \t]+\n/g, '')
        // Remove empty lines at start/end
        .trim();
}

async function getExercisePage(url) {
    return fetch(url, { method: 'GET', headers: basicHeaders })
    .then(response => {
        if (!response.ok) throw new MoodleFetchError(`HTTP error! status: ${response.status}`, response.status);
        return response.text();
    })
    .then(html => {
        // get DOM
        const dom = new JSDOM(html);
        const document = dom.window.document;
        
        // find main content from class "main-content" role "main"
        const mainContent = document.querySelector('.main-content[role="main"]');
        if (!mainContent) throw new MoodleFetchError('Main content not found');

        // find all images
        const images = Array.from(mainContent.querySelectorAll('img'));
        const imageUrls = images.map(img => img.src);

        // map of original URLs to local paths
        const imageMap = new Map(imageUrls.map(url => [
            url,
            path.join(config.downloadDirectories.images, path.basename(url))
        ]));

        // Replace image URLs in `content` with local paths (e.g. "images/abc.png" in the returned object)
        let content = mainContent.innerHTML;
        for (const [originalUrl, localPath] of imageMap) {
            content = content.replace(originalUrl, `![Image](${localPath})`);
        }

        const dompurify = createDOMPurify(dom.window);
        content = dompurify.sanitize(content);
        const converter = new TurndownService({
            headingStyle: 'atx',
            hr: '---',
            bulletstyle: '-',
            codeBlockStyle: 'fenced',
            keepDefaultPadding: false,
            padding: 0
        });

        content = converter.turndown(content);
        content = formatMarkdown(content);

        return {
            content,
            imageUrls: Array.from(imageMap.keys()),
            imageLocalPaths: Array.from(imageMap.values())
        };
    });
}

async function downloadImage(imageUrl, localPath) {
    const response = await fetch(imageUrl, { method: 'GET', headers: basicHeaders });
    if (!response.ok) throw new ImageDownloadError(`HTTP error! status: ${response.status}`, imageUrl);

    const arrayBuffer = await response.arrayBuffer();
    const fileStream = await writeFile(localPath, Buffer.from(arrayBuffer));
    console.log(`\tDownloaded image: ${path.basename(imageUrl)}`);
    return fileStream;
}

async function downloadImages(imageUrls, localPaths) {
    await mkdir(config.downloadDirectories.images, { recursive: true });
    const downloadPromises = imageUrls.map((url, index) =>
        downloadImage(url, localPaths[index]));

    const result = await Promise.allSettled(downloadPromises);
    const errors = result.filter(p => p.status === 'rejected');

    if (errors.length > 0) {
        console.warn(`${errors.length} images failed to download`);
        errors.forEach(p => console.error(p.reason.message));
    }

    return result.every(p => p.status === 'fulfilled');
}

async function main() {
    try {
        console.log('Starting exercise download...');

        const exercises = await getAllExersiseLinks();
        console.log(`Found ${exercises.length} exercises`);
        
        for (const exercise of exercises) {
            console.log(`Processing exercise: ${exercise.text}`);
            
            const pageData = await getExercisePage(exercise.url);
            if (!(await downloadImages(pageData.imageUrls, pageData.imageLocalPaths))) {
                console.warn(`Some images failed to download for ${exercise.text}`);
            }
            const mdPath = path.join(config.downloadDirectories.exercises, `${exercise.id}.md`);
            await mkdir(path.dirname(mdPath), { recursive: true });

            const mdContent = `# ${exercise.text}\n\n${pageData.content}`;
            await writeFile(mdPath, mdContent, 'utf-8');
            
            console.log(`Saved exercise content: ${exercise.text}`);
        }
        console.log('All exercises downloaded successfully');
    } catch (error) {
        console.error('Error in main function:', error);
        throw error;
    }
}

main().catch(console.error);