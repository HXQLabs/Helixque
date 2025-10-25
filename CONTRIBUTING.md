![Helixque Contributing](assets/contributing_guidelines.png)

Thank you for your interest in contributing to Helixque! This document provides guidelines for contributing to the project.

---

> \[!IMPORTANT]  
> - If an issue is assigned to you, please complete it **before requesting another one**.  
> - A person can be assigned a **maximum of two issues** at a time to ensure fair distribution among all participants.


## ⭐ Before You Start

1. **Starring the repository is mandatory** before contributing.  
   This helps the project grow and shows your support.  

2. **Join our Discord server** for discussions, questions, and faster PR approvals:  
   👉 [Join the Discord Server](https://discord.gg/dQUh6SY9Uk)

   ⚠️ Please note: To quickly get your PRs reviewed and merged, you must be a member of our Discord server.  

3. **Pull Request Policy on Discord**  
   - Before raising a PR, **check the `#pull-request` channel** to ensure there isn’t already an open PR for the same issue.  
   - If no one is working on it, go ahead and raise your PR and mention it in the channel.

---

### Keeping Your Branch Up-to-Date

Please ensure your local branch is **synced with the latest  `develop` branch** before making changes or opening a Pull Request (PR).  
This helps avoid unnecessary merge conflicts and ensures a smooth review process.

⚠️**Note**:
- 🚀 Please raise PRs **only to the `develop` branch**.  
- 📷 For faster reviews and merges, include a **recording or screenshot** (depending on the issue) that demonstrates the fix.  
- 🏗️ Before opening a PR, run `npm run build` and ensure the project builds successfully **without errors**.  
- ✅ Only raise a PR once the build passes.  
- 🔗 When raising the PR, please **reference the issue number** it addresses.  


### Merge Conflicts

- Project maintainers are **not responsible** if your PR is blocked due to merge conflicts.  
- It is **your responsibility** to update your branch and resolve conflicts before requesting a merge.

---

## Getting Started

1. Fork the repository
2. Clone your fork locally
3. Follow the setup instructions in the main README
4. Create a new branch for your feature/fix

## Development Setup

1. **Install dependencies for both frontend and backend**:
   ```bash
   # Backend
   cd backend && npm install
   
   # Frontend  
   cd ../frontend && npm install
   ```

2. **Start development servers**:
   ```bash
   # Terminal 1 - Backend
   cd backend && npm run dev
   
   # Terminal 2 - Frontend
   cd frontend && npm run dev
   ```

## Code Style

- Follow existing TypeScript and React patterns
- Use meaningful variable and function names
- Add comments for complex logic
- Ensure code is properly formatted

## Testing Your Changes

1. Test both frontend and backend functionality
2. Verify WebRTC connections work properly
3. Test edge cases like disconnections and reconnections
4. Ensure responsive design works on different screen sizes

## Submitting Changes

1. Commit your changes with clear, descriptive messages
2. Push to your fork
3. Create a Pull Request with:
   - Clear description of changes
   - Screenshots/videos for UI changes
   - Testing notes

## Areas for Contribution

- UI/UX improvements
- Performance optimizations
- Additional WebRTC features
- Mobile responsiveness
- Accessibility improvements
- Documentation updates
- Bug fixes

## Questions?

Feel free to open an issue for questions or discussion about potential contributions.
