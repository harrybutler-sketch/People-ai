# Signal Monitoring Tool (LinkedIn & News Scraper)

A premium, highly interactive dashboard built to identify and monitor sales and business development signals for **People4.ai**. The tool collects post data from LinkedIn and news channels using **Apify**, classifies and scores signals by sales relevance, and auto-generates custom outreach pitches.

## Key Features
- **Aesthetic Dashboard**: A gorgeous slate-dark interface with glassmorphism layout, responsive search/filtering, and dynamic metric summaries.
- **Dual-Mode System**:
  - *Simulation/Demo Mode*: Loads high-quality, pre-defined signals for People4.ai to demonstrate utility instantly.
  - *Live Connection Mode*: Integrates directly with the **Apify API** to run, monitor, and retrieve results from scraper actors.
- **Relevance Scoring**: Rates signals (High, Medium, Low) based on tailored keyphrases (e.g. data sourcing, RLHF, synthetic datasets, AI model training).
- **Outreach Assistant**: Generates customized pitch templates tailored to each specific company, contact, and scraped signal context.
- **Privacy-First**: Your Apify API Token is stored strictly inside your browser's local storage (`localStorage`).

---

## Getting Started

### 1. Run Locally
Since this is a client-side static application, you can run it without any local dependencies or build pipelines:
- Simply open the `index.html` file in any web browser.
- Alternatively, run a local development server in the directory:
  ```bash
  python3 -m http.server 8000
  ```
  And navigate to `http://localhost:8000`.

### 2. Deploy to Vercel
Deploying is simple:
1. Initialize a Git repository in the project folder:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```
2. Create a new repository on GitHub and push the code:
   ```bash
   git remote add origin <your-github-repo-url>
   git branch -M main
   git push -u origin main
   ```
3. Go to [Vercel](https://vercel.com) and import your Git repository.
4. Select the default options. Vercel will recognize the static project and deploy it instantly.

---

## Hooking up Apify

To run live scrapes:
1. Sign up/Log in to [Apify](https://apify.com).
2. Retrieve your personal API Token from your **Apify Console > Settings > Integrations** (keep this token confidential).
3. Search and subscribe to the following actors in the Apify Store:
   - **LinkedIn Post Scraper** (e.g. `apify/linkedin-post-scraper` or `vdrmota/linkedin-post-scraper`)
   - **Google News Scraper** (e.g. `apify/google-news-scraper`)
4. Input your Apify Token into the **Integrations** tab in this dashboard, and click **Connect**.
5. You can now launch scrapes, view log statuses, and fetch dataset results directly from this UI!

---

## Signal Criteria for People4.ai
The tool classifies opportunities based on three types of triggers:
1. **AI Model Development**: Mentions of training foundation models, fine-tuning LLMs, scaling training compute, etc.
2. **Data Sourcing / Sourcing Queries**: Hiring data annotators, seeking suppliers for image/audio/video training sets, licensing custom data.
3. **Data Catalogues / Dataset Discussions**: Questions or debates about human-labeled vs. synthetic datasets, licensing, custom panel studies, or data compliance.
