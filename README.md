# Sparrow CRM 🐦

[![Version](https://img.shields.io/badge/version-1.0.0-blue)](https://github.com/your-username/your-repo/releases/latest)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)
[![Tech](https://img.shields.io/badge/tech-Vanilla_JS-yellow)](https://github.com/your-username/your-repo)

Sparrow CRM is a private, portable, and powerful "offline-first" Customer Relationship Management application. It exists as a single HTML file that runs locally in your web browser, requiring no installation, no server, and no internet connection.

Our vision is to empower users with full control over their own data, offering a secure and lightweight alternative to expensive, cloud-based CRM platforms.

---

## ➡️ Download the Latest Version

You can download the ready-to-use `sparrow-crm.html` file directly from our latest release.

**[Download Sparrow CRM v1.0.0 (MVP) Here](YOUR_DOWNLOAD_LINK_HERE)**

*(**Instruction:** Replace `YOUR_DOWNLOAD_LINK_HERE` with the direct link to the `sparrow_offline_crm(v24.018).html` file in your GitHub releases.)*

---

## Core Philosophy

Sparrow CRM is built on three key principles:

*   ✅ **Privacy First:** Your data is your business. All of your contact information, notes, and tasks are stored *inside* the `.html` file itself. It is never sent to a server, tracked, or analyzed.
*   ✅ **Completely Portable:** The entire CRM (application + your data) is a single file. You can save it on your computer, a USB drive, or in your private cloud storage. Backing up is as simple as copying a file.
*   ✅ **No Cost, Ever:** This is a free, open-source tool. There are no subscriptions, no hidden fees, and no "pro" versions.

## Key Features (Version 1.0.0)

This version includes all the core functionality you need to manage your contacts effectively.

#### Data Management
*   **CSV Import & Update:** Easily import your contacts from any CSV file. Sparrow intelligently updates existing contacts or adds new ones without overwriting your data with blank cells.
*   **Import Tagging:** Add a tag (e.g., "Leads 2024", "Networking Event") during the import process to easily filter contacts by their source.
*   **Seamless Saving:** In compatible browsers (like Chrome and Edge), Sparrow can ask for permission to save changes directly back to your original `.html` file.
*   **Manual Save Fallback:** For other browsers (like Firefox or Safari), you will be prompted to download a new, updated file to save your changes.
*   **Data Export:** Export your contacts, tasks, or activities to a clean CSV file at any time.

#### Contact Management
*   **Contact Gallery:** View all your contacts as cards in a searchable and filterable gallery.
*   **Detailed Contact View:** Click any contact to open a modal with all their information, related tasks, activities, and relationships in one place.
*   **Inline Editing:** Click on almost any field to edit it directly in the contact view for a fast, fluid workflow.
*   **Custom Fields & Sections:** Go to the Settings page to create, reorder, hide, and manage all of your data fields. You can also group them into custom-named sections.
*   **Contact Relationships:** Link two contacts together with a descriptive label (e.g., "Spouse", "Referred by", "Manager").

#### Productivity
*   **Task Management:** Create tasks with due dates, either globally or linked to specific contacts.
*   **Activity Logging:** Log activities like calls, meetings, or emails against a contact to maintain a complete history of your interactions.

## Getting Started (for Users)

Using Sparrow CRM is as easy as 1-2-3:

1.  **Download:** [Download the `sparrow-crm.html` file](YOUR_DOWNLOAD_LINK_HERE) from the link above.
2.  **Open:** Open the downloaded file in a modern web browser like Chrome, Firefox, Edge, or Safari.
3.  **Import:** Drag and drop your first contacts CSV file onto the welcome screen, or click the button to select it.

That's it! The application will load your contacts, and you can begin managing them immediately. **Remember to save your file when you're done!**

## How It Works (A Peek Under the Hood)

Sparrow CRM achieves its portability by storing all of your data inside a special `<script>` tag within the HTML file itself. When you save, the application reads the current HTML, updates the data inside that script tag with your new information, and then provides the complete new HTML file for you to save.

*   **File System Access API (Chrome/Edge):** For the best experience, the app uses this modern browser API. It allows you to grant the webpage permission to edit its own file directly on your computer. This enables a seamless "auto-save" like experience.
*   **Blob-based Download (Firefox/Safari):** In browsers that don't support the above API, saving works by creating the new file content in memory and triggering a standard browser download. You then save this new file, replacing your old one.

## Support the Project

If you find Sparrow CRM useful, please consider supporting its development. It helps motivate continued improvements and new features!

<a href="https://buymeacoffee.com/burnsdevelopment" target="_blank">
    <img src="https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png" alt="Buy Me A Coffee" style="height: 41px !important;width: 174px !important;">
</a>

## License

This project is licensed under the **MIT License**. See the [LICENSE](./LICENSE) file for details.
