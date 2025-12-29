# Changelog

All notable changes to the Ledgerly project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Tagging System** - Complete transaction tagging functionality
  - Tag entity with color-coded labels and descriptions
  - Many-to-many relationship between transactions and tags
  - Tag CRUD operations (create, read, update, delete, restore)
  - Tag merge capability to combine duplicate tags
  - Tag search and autocomplete
  - Soft delete with restore functionality
  - Tag usage statistics and analytics
- **Tag Management UI**
  - TagInput component with autocomplete and create-on-the-fly
  - TagManager component for full tag management
  - Tag color picker
  - Merge mode for combining tags
  - Visual tag chips with custom colors
- **Tag Analytics**
  - Spending by tag aggregation
  - Tag trends over time (monthly)
  - Category breakdown per tag
  - Tag comparison charts
  - Tag insights summary with period selection
  - Bar charts and pie charts for visualization
  - Tag insights dashboard page
- **Transaction Enhancements**
  - Multi-tag support for transactions
  - Tag filtering in transaction list
  - Tag display in transaction forms
  - Tag IDs in transaction DTOs
- **Navigation Updates**
  - Tags management page (/tags)
  - Tag Insights page (/tag-insights)
  - Navigation menu items with emoji icons
- **Database**
  - Created `dbo.tags` table with indexes
  - Created `dbo.transaction_tags` junction table
  - Migration for tag schema (1735431600000-AddTagsAndTransactionTags)
- **Documentation**
  - Comprehensive tagging system documentation (TAGGING_SYSTEM.md)
  - API endpoint documentation for tags
  - Database schema documentation for tags
  - Usage examples and best practices
- Comprehensive project documentation
  - Architecture guide with system design and security patterns
  - Complete API reference with all endpoints
  - Database schema documentation with ERD
  - Deployment guide for multiple platforms
  - Development guide with workflows and best practices
  - Contributing guidelines
  - Troubleshooting guide

### Changed
- Updated Transaction entity to support many-to-many tags relationship
- Enhanced transaction service to handle tag operations
- Updated transaction controller to support tag filtering
- Modified TransactionForm component to include TagInput
- Updated main README with improved structure and documentation links

### Security
- Documented security best practices
- Identified need for rate limiting implementation (future enhancement)

---

## How to Update This Changelog

When making changes to the project, update this file with:

### Categories
- **Added** for new features
- **Changed** for changes in existing functionality
- **Deprecated** for soon-to-be removed features
- **Removed** for now removed features
- **Fixed** for any bug fixes
- **Security** for vulnerability fixes

### Example Entry

```markdown
## [1.2.0] - 2024-03-15

### Added
- Transaction filtering by date range
- Export transactions to CSV
- New budget carryover feature

### Changed
- Improved authentication flow with refresh token rotation
- Updated UI with new color scheme

### Fixed
- Fixed CORS issue with API endpoints
- Resolved memory leak in transaction service

### Security
- Implemented rate limiting for authentication endpoints
- Updated dependencies to patch security vulnerabilities
```

### Version Numbers

Follow semantic versioning:
- **Major version** (1.0.0 -> 2.0.0): Breaking changes
- **Minor version** (1.0.0 -> 1.1.0): New features, backward compatible
- **Patch version** (1.0.0 -> 1.0.1): Bug fixes, backward compatible

### Release Process

1. Update CHANGELOG.md with all changes
2. Update version in package.json files
3. Create git tag: `git tag -a v1.2.0 -m "Release v1.2.0"`
4. Push tag: `git push origin v1.2.0`
5. Create GitHub release with changelog excerpt

---

## Template for New Releases

```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- 

### Changed
- 

### Deprecated
- 

### Removed
- 

### Fixed
- 

### Security
- 
```
