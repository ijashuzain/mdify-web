# **mdify \- Web Application Project Specification**

# **Subtitle**

Technical and product requirements for a lightweight, link-based Markdown sharing platform.

# **Project Overview**

**mdify** is a sleek, web-based platform designed for seamless creation, rendering, and instant sharing of Markdown documents via unique public URLs. The goal of mdify is to remove friction from sharing plain-text documents, technical notes, snippets, and documentation, providing users with a distraction-free environment that prioritizes content readability and ultra-fast loading times.

## **Target Audience**

* **Developers & Tech Lead:** Sharing quick technical specifications, code snippets, or API notes.  
* **Content Creators & Writers:** Drafting and sharing plain-text articles, draft documentation, or blog posts.  
* **Students & Researchers:** Publishing notes, reading lists, and collaborative outlines cleanly.

---

# **Core Features**

## **Instant Creation & Editing**

* **Dual-Mode Editor:** Side-by-side or togglable Editor and Live Preview modes.  
* **Auto-Save:** Drafts persist locally in browser storage before explicit publishing.  
* **Syntax Highlighting:** Real-time formatting for code blocks, lists, headings, blockquotes, and tables.

## **One-Click Sharing & Publishing**

* **Unique Link Generation:** Generates a short, readable URL upon publishing (e.g., `mdify.app/doc/x9k2pL`).  
* **Read-Only Viewer Mode:** Clean, distraction-free view dedicated to link recipients.  
* **Raw Content Export:** Viewers can quickly copy the raw Markdown string or download the `.md` file.

## **Document Controls**

* **Access Control:** Public access by default, with optional unlisted/passcode protection.  
* **Expiry Options:** Optional automatic expiration for links (e.g., 24 hours, 7 days, or permanent).

---

# **Tech Stack**

The architecture leverages modern web technology to guarantee cross-platform compatibility, speedy rendering, and real-time backend functionality.

| Layer | Technology | Purpose |
| :---- | :---- | :---- |
| **Frontend Framework** | React | Provides a responsive, unified codebase for consistent web rendering across mobile and desktop. |
| **Backend & Storage** | Django \+ Postgres |  |
| **Markdown Parsing** |  |  |
| **Hosting & CDN** | VPS | Will share VPS details |

---

# **User Interface Design**

The visual design of **mdify** must strictly follow a **clean, minimalist visual aesthetic heavily inspired by Notion**. It should emphasize generous white space, soft neutral tones, crisp typography, and an invisible interface that lets content take center stage.

## **Design Principles**

* **Notion-Inspired Canvas:** Off-white/subtle gray background tones (`#F7F6F3` light mode canvas, `#37352F` primary body text) with no harsh borders or high-contrast saturated primary colors.  
* **Typography Focus:** A clean sans-serif typeface family with tuned line-heights and scaled heading sizes to maximize readability.  
* **Subtle Controls:** Floating action bars, minimal iconography, and subdued toolbars that fade or remain low-profile until hovered.  
* **Frameless Layout:** Uncluttered margins with central text column alignment designed for optimal reading width (max 720px \- 800px readable line length).

---

# **Future Enhancements**

* **Custom Domain Mapping:** Allow power users to attach custom domains or subdomains to published pages.  
* **Collaborative Editing:** Real-time multi-user editing powered by WebSockets/CRDTs.  
* **Custom Themes:** User-selected typography themes (Serif, Mono, Sans) and customizable CSS overrides for published links.  
* **Analytics Dashboard:** Light-weight page-view analytics for document authors.

