# MoodleScrapper

MoodleScrapper is a Node.js application that scrapes exercise content from a Moodle course page and saves it as Markdown files. It also downloads images associated with the exercises.

## Features

- Fetches exercise links from a Moodle course page.
- Downloads exercise content and images.
- Converts HTML content to Markdown format.
- Saves exercise content as Markdown files.

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)

## Installation

1. Clone the repository:

    ```sh
    git clone git@github.com:FireDemon290304/MoodleScrapper.git
    cd MoodleScrapper
    ```

2. Install the dependencies:

    ```sh
    npm install
    ```

## Configuration

Update the `config` object in `main.js` with your Moodle session ID and course URL:

```javascript
const config = {
    sessionCookieName: 'MoodleSession',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/132.0.0.0 Safari/537.36 OPR/117.0.0.0',
    courseUrl: 'https://www.moodle.aau.dk/course/view.php?id=55124',
    downloadDirectories: {
        images: 'images',
        exercises: 'exercises'
    }
};

const sessionId = "your_moodle_session_id";
```

Make sure to replace `your_moodle_session_id` with your actual Moodle session ID in the [main.js](http://_vscodecontentref_/5) file.

## Usage

Run the application:

```bash
node [main.js](http://_vscodecontentref_/0)
```

The application will log the progress of downloading `exercises` and `images`. The downloaded content will be saved in the exercises and images directories.

## Project Structure

```md
.gitignore
[main.js](http://_vscodecontentref_/1)
[package.json](http://_vscodecontentref_/2)
[README.md](http://_vscodecontentref_/3)
[todo.md](http://_vscodecontentref_/4)
exercises/
images/
```

- `main.js`: Main script for scraping and downloading content.
- `package.json`: Project metadata and dependencies.
- `README.md`: Project documentation.
- `todo.md`: List of tasks and improvements.
- `exercises/`: Directory where exercise Markdown files are saved.
- `images/`: Directory where downloaded images are saved.

## License

This project is licensed under the ISC License.
