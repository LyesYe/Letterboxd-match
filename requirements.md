# Product Requirements Document (PRD): Letterboxd Movie Matcher

## 1. Project Overview
**Name:** Letterboxd Movie Matcher (Placeholder)
**Objective:** A web app that takes one or multiple Letterboxd usernames and recommends a movie based on their public watchlists.
**Budget:** $0. Must use free tiers for hosting and APIs.

## 2. Core Features
*   **Dynamic User Input:** 
    *   Support for 1, 2, or multiple usernames.
    *   An "Add Friend" button to dynamically create more input fields.
*   **Matching Logic:**
    *   **Single User:** If only one username is entered, the app picks a random movie from their personal watchlist.
    *   **Multiple Users:** 
        *   **Intersection:** Movies present on *all* entered watchlists.
        *   **Union:** A combined pool of all movies from all entered watchlists.
*   **Recommendation Engine:** 
    *   Randomly selects one movie from the calculated pool.
    *   **Session Memory:** The app must track "seen" recommendations during a session to ensure the "Reroll" button never suggests the same movie twice until the list is exhausted or the page is refreshed.
*   **Result Display:** 
    *   High-quality Movie Poster, Title, Release Year, Synopsis, and Letterboxd/TMDB rating.
*   **Interactive Controls:** 
    *   "Reroll" button for a new suggestion from the same pool.

## 3. Design & UI/UX Requirements
*   **Aesthetic:** Classy, neat, and cinematic.
*   **Color Palette:** Letterboxd-inspired (Dark Grey `#14181C`, Green `#00E054`, Orange `#FF8000`, Blue `#40BCF4`).
*   **Responsiveness:** Must work perfectly on mobile and desktop (mobile-first approach).

## 4. Technical Architecture & Stack
**Note to Claude:** Select the most efficient modern stack (e.g., Next.js, Tailwind CSS) that fits within free hosting tiers (Vercel, Netlify).

*   **Data Fetching:** 
    *   Since Letterboxd lacks a public API, use web scraping (Cheerio/BeautifulSoup) or public RSS feeds to pull watchlist data.
    *   Use the **TMDB API** (Free Tier) for movie metadata and posters.
*   **State Management:** Use local state or session storage to track the "previously recommended" list to prevent duplicates.

## 5. Implementation Phases
1.  **Phase 1:** UI setup with dynamic input fields and Letterboxd styling.
2.  **Phase 2:** Multi-user scraper logic to fetch and aggregate watchlists.
3.  **Phase 3:** Integration with TMDB API.
4.  **Phase 4:** Logic for Intersection/Union and "No-Repeat" session tracking.
5.  **Phase 5:** Polish, animations, and error handling.

## 6. Pro-Tip for Claude
When coding the "Intersection" logic for 3+ users, remind Claude to handle the scenario where the intersection is empty (e.g., "No movies found in common. Try 'Union' mode instead!").
