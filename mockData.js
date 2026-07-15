const MOCK_SIGNALS = [
  {
    id: "mock-1",
    source: "linkedin",
    author: "Elena Rostova",
    title: "Director of LLM Research at Nuance Health",
    company: "Nuance Health AI",
    companySize: "100-250",
    funding: "Series B ($35M)",
    text: "We are starting a new project training a specialized medical vision-language model for radiology diagnostics. Synthetic data is not cutting it for clinical accuracy. Does anyone have recommendations for vendors who can source high-quality, compliance-aware clinical image datasets and run expert clinician reviews? Need to ensure full consent and HIPPA-compliant pipelines.",
    timestamp: "2 hours ago",
    url: "https://linkedin.com/posts/elena-rostova-medical-vlm-data",
    relevance: "high",
    category: "Data Sourcing",
    keywords: ["clinical image", "vendors", "source", "consent", "datasets"],
    suggestedPitch: `Hi Elena,

I saw your post about training a specialized medical vision-language model and your need for compliance-aware clinical image datasets. 

At People4.ai, we specialize in medical and specialist data studies. We source and curate clinically-licensed multimodal datasets (including radiology and cardiac data) with full compliance and consent management end-to-end. We routinely work with expert clinicians for validation.

Would you be open to a quick 10-minute chat this week to see if we can support your radiology model training?

Best,
[Your Name]
People4.ai`
  },
  {
    id: "mock-2",
    source: "news",
    author: "TechCrunch",
    title: "Aura Robotics raises $42M to build the next generation of warehouse autonomous agents",
    company: "Aura Robotics",
    companySize: "50-100",
    funding: "Series A ($42M)",
    text: "Aura Robotics announced today that it has raised $42 million in Series A funding. The startup focuses on developing complex multimodal foundation models that combine video inputs and robotic actuator feedback. CEO Marcus Thorne stated, 'The bottleneck is no longer compute; it is getting high-quality, real-world human demonstration video data of manual warehouse tasks to train our behavior cloning models.'",
    timestamp: "5 hours ago",
    url: "https://techcrunch.com/2026/07/aura-robotics-series-a-42m",
    relevance: "high",
    category: "AI Model Development",
    keywords: ["multimodal foundation models", "video inputs", "human demonstration video", "train"],
    suggestedPitch: `Hi Marcus,

Congratulations on the Series A funding! 

I read TechCrunch's coverage of Aura Robotics' launch, particularly your note on the bottleneck of high-quality human demonstration video data for your behavior cloning models. 

People4.ai specializes in sourcing and curating custom research-based multimodal datasets, including human action video recordings, with consent and rigorous quality assurance. We can build custom collection studies tailored specifically to your warehouse task requirements.

Let me know if you'd be open to discussing how we can help accelerate your model training.

Best,
[Your Name]
People4.ai`
  },
  {
    id: "mock-3",
    source: "linkedin",
    author: "David Chen",
    title: "VP of Product at SpeechFlow",
    company: "SpeechFlow",
    companySize: "20-50",
    funding: "Seed ($4.5M)",
    text: "Quick question for the AI community: has anyone successfully used synthetic audio datasets to train speech emotion recognition models? We are hitting a wall where synthetic voices lack the subtle micro-intonations of real human frustration and empathy. Looks like we need to spin up a custom recording panel of real people. Any platform suggestions?",
    timestamp: "1 day ago",
    url: "https://linkedin.com/posts/davidchen-speechflow-synthetic-audio",
    relevance: "high",
    category: "Dataset Discussion",
    keywords: ["synthetic audio", "train", "custom recording panel", "human frustration"],
    suggestedPitch: `Hi David,

Saw your query about synthetic audio datasets for speech emotion recognition. You've hit a common bottleneck—synthetic voices often strip out the rich micro-intonations (frustration, empathy) crucial for emotion models.

People4.ai has extensive experience building custom research-based audio data studies. We manage participant recruitment, consent, and high-fidelity speech recording protocols to deliver diverse, natural conversational datasets.

I'd love to share some insights on how we solved similar emotional speech collection tasks. Let me know if you're free for a quick call.

Best,
[Your Name]
People4.ai`
  },
  {
    id: "mock-4",
    source: "news",
    author: "VentureBeat",
    title: "LanguageGen releases OpenTranslate-V2 but highlights data fatigue issues",
    company: "LanguageGen",
    companySize: "250-500",
    funding: "Series C ($120M)",
    text: "LanguageGen today open-sourced its new translation model, OpenTranslate-V2. While boasting state-of-the-art results for major European languages, the developers noted that low-resource languages (such as Swahili, Tagalog, and regional dialects) show minimal improvement. 'The lack of diverse, high-quality, human-translated parallel text datasets remains the primary barrier,' the release notes stated.",
    timestamp: "1 day ago",
    url: "https://venturebeat.com/2026/07/languagegen-opentranslate-v2-data-fatigue",
    relevance: "medium",
    category: "Dataset Discussion",
    keywords: ["human-translated parallel text", "datasets", "low-resource languages"],
    suggestedPitch: `Hi [Founder/Contact],

I read VentureBeat's piece on LanguageGen's release of OpenTranslate-V2 and the data bottlenecks you've encountered for low-resource languages.

At People4.ai, we specialize in curating custom multilingual and multimodal datasets. We have global participant networks that allow us to recruit native speakers for rare dialects and low-resource languages, executing translation and localization studies under strict quality assurance frameworks.

Would you be open to discussing how we can help expand your parallel text coverage for the next iteration of OpenTranslate?

Best,
[Your Name]
People4.ai`
  },
  {
    id: "mock-5",
    source: "linkedin",
    author: "Sarah Jenkins",
    title: "Co-Founder & CTO at SmartSight",
    company: "SmartSight AI",
    companySize: "10-20",
    funding: "Seed ($2M)",
    text: "Our autonomous checkout systems are ready, but we need to train the model to recognize diverse customer hand gestures (picking, returning, placing in basket) from overhead angles. We tried scraping YouTube but the quality and framing are terrible. We need custom video datasets of people simulating grocery shopping. Who does custom collection projects?",
    timestamp: "2 days ago",
    url: "https://linkedin.com/posts/sarah-jenkins-smartsight-gestures",
    relevance: "high",
    category: "Data Sourcing",
    keywords: ["train", "custom video datasets", "custom collection projects", "model"],
    suggestedPitch: `Hi Sarah,

Your checkout gesture model challenges sound very familiar—commercial checkout environments require extremely specific camera angles and physical setups that public data just can't duplicate.

People4.ai specializes in bespoke custom research-based data studies. We can design and execute a video collection campaign simulating grocery shopping, recruiting participants across demographics, managing full consent, and delivering structured, high-definition action datasets.

Would love to share how we handle grocery/retail tracking collection setup. Let me know if you're free for a quick chat.

Best,
[Your Name]
People4.ai`
  },
  {
    id: "mock-6",
    source: "linkedin",
    author: "Robert Vance",
    title: "Senior VP of Engineering at SafeDrive",
    company: "SafeDrive Systems",
    companySize: "500+",
    funding: "Public",
    text: "Looking for recommendations for synthetic sensor data companies. We are modeling edge cases for lidar and radar in extreme winter weather conditions (e.g., blizzard, icy roads). Curious how synthetic datasets compare to real-world collected datasets for sensor fusion calibration.",
    timestamp: "3 days ago",
    url: "https://linkedin.com/posts/robertvance-safedrive-synthetic-sensor",
    relevance: "medium",
    category: "Dataset Discussion",
    keywords: ["synthetic sensor data", "synthetic datasets", "real-world collected datasets"],
    suggestedPitch: `Hi Robert,

Saw your post discussing synthetic vs. real-world sensor datasets for winter weather lidar/radar calibration. 

While synthetic datasets are great for path planning, sensor fusion models frequently fail without real-world telemetry to calibrate edge cases. People4.ai specializes in sourcing and curating specialist datasets, and we have the capacity to coordinate custom physical data collection runs (including specific cold-weather/extreme environmental settings) to provide authentic validation data.

Let's connect to discuss how a hybrid real/synthetic strategy might optimize SafeDrive's calibration.

Best,
[Your Name]
People4.ai`
  },
  {
    id: "mock-7",
    source: "news",
    author: "AI Insider",
    title: "Enterprise AI shifts focus to custom dataset curation over raw model scaling",
    company: "Enterprise AI Inc.",
    companySize: "1000+",
    funding: "Enterprise",
    text: "At the global AI conference yesterday, a panel of enterprise leaders agreed that model architecture has become commoditized. The real moat is domain-specific custom training data. Companies like FinanceFlow and HealthMap shared that 80% of their AI budget is shifting towards hiring expert annotators and contracting with custom data providers to build proprietary datasets.",
    timestamp: "4 days ago",
    url: "https://aiinsider.com/enterprise-ai-shifts-to-custom-dataset-curation",
    relevance: "medium",
    category: "AI Model Development",
    keywords: ["custom training data", "custom data providers", "proprietary datasets", "annotators"],
    suggestedPitch: `Hi [Contact Name],

I saw the recent coverage in AI Insider regarding the shift towards domain-specific custom datasets as the new proprietary moat.

People4.ai is built precisely for this shift. We act as a specialist, compliance-aware data infrastructure partner for enterprise teams, delivering custom research-based studies and off-the-shelf datasets with end-to-end consent management and expert human feedback.

I'd love to share how we partner with enterprise teams to establish robust data moats. Let me know if you have time for a brief introduction next week.

Best,
[Your Name]
People4.ai`
  },
  {
    id: "mock-8",
    source: "linkedin",
    author: "Kenji Tanaka",
    title: "Chief AI Scientist at CyberNet",
    company: "CyberNet Tech",
    companySize: "50-100",
    funding: "Series A ($12M)",
    text: "Just released a paper on fine-tuning LLMs for cybersecurity vulnerability detection. The hardest part was building a clean, human-labelled dataset of code snippets showcasing actual security exploits and their patched equivalents. Shoutout to our internal dev team for spending hundreds of hours labeling. Looking for automated tools to scale this next.",
    timestamp: "5 days ago",
    url: "https://linkedin.com/posts/kenji-tanaka-cybernet-security-fine-tuning",
    relevance: "medium",
    category: "AI Model Development",
    keywords: ["fine-tuning LLMs", "human-labelled dataset", "labeling"],
    suggestedPitch: `Hi Kenji,

Congratulations on the publication of your cybersecurity vulnerability fine-tuning paper! Building code exploit datasets is a massive hurdle.

While automated tools are helpful, cybersecurity models require highly expert human feedback (RLHF) to avoid false positives. People4.ai specializes in sourcing and curating specialist datasets and setting up custom studies with vetted software engineers and security experts to annotate code at scale.

We could help you scale your labeling pipeline without consuming your core engineering resources. Let me know if you'd like to discuss further.

Best,
[Your Name]
People4.ai`
  }
];
