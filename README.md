# FixNGo 

> **Live Production App:** [https://fixngo-419142040910.asia-southeast1.run.app/](https://fixngo-419142040910.asia-southeast1.run.app/)  
> **Interactive Sandbox (AI Studio):** [https://ai.studio/apps/2b415104-3946-4453-a4c6-0a5c36822352](https://ai.studio/apps/2b415104-3946-4453-a4c6-0a5c36822352)

FixNGo is an AI-powered municipal issue reporting, automated dispatching, and resolution verification platform. Built with React, Vite, Tailwind CSS, Supabase, and Google Gemini AI, it closes the loop between civic engagement and public works management.

---

##  Key Features

* **AI Smart Dispatch**: Automatically categorizes issues (e.g., Roadwork, Sanitation, Dead Streetlight), rates safety severity level (1-10), and extracts actionable instructions using Google Gemini.
* **Spatial Deduplication Check**: Prevents spam by automatically grouping duplicate user reports submitted within proximity of each other.
* **Citizen Gamification Hub**: Encourages civic contribution by rewarding active citizens with points and ranks for verified repairs.
* **Real-Time Operational Map**: A high-fidelity, unified map for municipal admins and resolvers to visualize dispatches and status changes instantly.
* **Impact Metric Engine**: Translates civic repairs into real KPIs like *Total Impact Score*, *City Health %*, and *Active Response Time* computed on the fly.

---

##  Quick Start

Follow these steps to run the application locally on your computer.

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Create a .env.local file in the root directory:
```bash
GEMINI_API_KEY=your_gemini_api_key
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Start Development Server
```bash
npm run dev
```

### Live Pitch Demo Presets (1-Click Simulators)
* **During your presentation, use the Guided Simulator Controller in the dashboard to showcase the end-to-end municipal pipeline seamlessly, bypassing manual UI forms:**
* **[REPORT]: Dispatches a simulated high-quality roadwork report on MG Road, calling the AI pipeline and placing a hazard pin on the map.**
* **[CLAIM]: Locates the latest reported issue in the database and assigns it instantly to the logged-in municipal resolver (status shifts to CLAIMED / In Progress).**
* **[VERIFY]: Simulates asphalt cold-mix repair notes, uploads an after-repair verification photo, triggers Gemini AI QA inspection, and closes the ticket as RESOLVED.**
* **[Reset & Cleanup]: Reverts the database state back to a clean slate, deleting all simulated mock tickets instantly.**
