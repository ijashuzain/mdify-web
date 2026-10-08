# **Domain Acquisition Strategy: mdify**

This guide outlines the practical options for securing a web address for the **mdify** application, ranging from zero-cost community subdomains to custom top-level domains (TLDs).

---

# **1\. Free Domain Options**

For an open-source or developer-focused JavaScript tool like **mdify**, community-maintained subdomains offer a zero-cost, highly reputable identity without hosting overhead.

## **Claiming a `.js.org` Subdomain**

The `js.org` project provides free subdomains for JavaScript-related projects hosted via GitHub Pages, Vercel, Netlify, or similar platforms.

### **Step-by-Step Process**

1. **Verify Eligibility**  
   * The project must be JavaScript-focused (Markdown tool fits naturally).  
   * The project must have a working deployment (e.g., hosted on GitHub Pages or Vercel).  
   * Content must be non-commercial, open-source, or developer-oriented.  
2. **Prepare Your Repository**  
   * Ensure your application code is public on GitHub.  
   * Configure your build pipeline to serve the production app at the root URL.  
3. **Fork the `js.org` Repository**  
   * Navigate to the official GitHub repository (`js-org/js.org`).  
   * Create a fork of the repository to your GitHub account.  
4. **Add Your Subdomain Record**  
   * Locate the `cnames_active.js` file in the root directory.  
   * Add your entry alphabetically to avoid merge conflicts:"mdify": "your-username.github.io",  
   * *Note: If using Vercel or Netlify, point to their respective target CNAMEs as specified in the `js.org` documentation.*  
5. **Configure Custom Domain in Hosting Provider**  
   * In your GitHub repository settings under **Pages** (or Vercel domain settings), set the custom domain to `mdify.js.org`.  
6. **Submit a Pull Request**  
   * Commit your changes with a clear message (e.g., `Add mdify.js.org`).  
   * Open a Pull Request against the main `js.org` repository.  
   * Automated checks will validate your formatting. Once approved by a maintainer, the DNS record will propagate within a few hours.

---

# **2\. Budget-Friendly Developer TLDs**

If you prefer a standalone custom domain, developer-focused Top-Level Domains (TLDs) offer strong branding, built-in security features, and predictable annual costs.

## **Recommended TLDs with Flat Renewal Rates**

| TLD | Average Year 1 | Flat Renewal Rate | Best Use Case | Security Feature |
| :---- | :---- | :---- | :---- | :---- |
| **.dev** | \~\$12 \- \$15 | \~\$12 \- \$15 / yr | Developer tools, web utilities | HSTS Preloaded (Requires HTTPS) |
| **.app** | \~\$14 \- \$16 | \~\$14 \- \$16 / yr | Web apps, Progressive Web Apps | HSTS Preloaded (Requires HTTPS) |
| **.io** | \~\$32 \- \$40 | \~\$32 \- \$40 / yr | Tech startups, SaaS tools | Standard |

*Key Advantage:* Both `.dev` and `.app` are operated by Google Registry and enforce HSTS (HTTP Strict Transport Security) by default, ensuring your users always connect over HTTPS. Their renewal rates remain stable without steep price jumps after the first year.

---

# **3\. Cheapest First-Year Options & Renewal Warnings**

Promotional pricing can make certain TLDs extremely cheap upfront, but renewal fees can lead to unexpected costs later.

## **First-Year Pricing vs. Long-Term Costs**

| TLD | Year 1 Promo Price | Standard Renewal Price | Price Increase Factor |
| :---- | :---- | :---- | :---- |
| **.xyz** | \~\$1.00 \- \$2.00 | \~\$13.00 \- \$16.00 / yr | \~8x \- 13x |
| **.site** | \~\$1.00 \- \$3.00 | \~\$25.00 \- \$35.00 / yr | \~10x \- 25x |
| **.online** | \~\$1.00 \- \$2.00 | \~\$30.00 \- \$40.00 / yr | \~20x \- 30x |
| **.tech** | \~\$2.00 \- \$5.00 | \~\$40.00 \- \$50.00 / yr | \~10x \- 20x |

## **Important Considerations**

* **Renewal Shock:** Registrar discounts heavily target the first year. Setting up auto-renew without reviewing the standard pricing can result in standard renewal fees that are up to 30 times higher than the entry cost.  
* **Brand Perception:** Ultra-cheap TLDs (like `.site` or `.online`) are sometimes associated with higher spam rates, which can impact initial user trust unless paired with strong branding.

---

# **4\. Recommendation for MVP Launch**

For the initial launch of **mdify**, the following phased approach balances cost efficiency, developer credibility, and long-term brand equity:

1. **Phase 1 (Immediate MVP): Claim `mdify.js.org`**  
   * **Cost:** \$0  
   * **Reasoning:** It carries instant authority within the JavaScript community, requires no maintenance fees, and cleanly matches the app's functionality.  
2. **Phase 2 (Growth / Commercialization): Secure `mdify.dev`**  
   * **Cost:** \~\$12/year flat rate  
   * **Reasoning:** If the application expands beyond a free utility into a broader product, transition to `mdify.dev`. It provides an affordable, professional, and secure dedicated domain with predictable annual expenses.

