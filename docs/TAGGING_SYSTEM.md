# Tagging System Documentation

## Overview

The Ledgerly tagging system allows users to organize and analyze transactions using flexible, user-defined tags. Tags provide a powerful way to group transactions across different categories, accounts, and time periods for better financial insights.

## Features

### 1. Tag Management
- **Create Tags**: Create custom tags with names, colors, and descriptions
- **Edit Tags**: Update tag names, colors, and descriptions
- **Delete Tags**: Soft delete tags (can be restored)
- **Merge Tags**: Combine multiple tags into one
- **Restore Tags**: Recover soft-deleted tags
- **Search Tags**: Quick search with autocomplete

### 2. Transaction Tagging
- **Multi-Tag Support**: Add multiple tags to any transaction
- **Tag Input Component**: Autocomplete dropdown with create-on-the-fly functionality
- **Tag Display**: Visual tag chips with custom colors
- **Tag Filtering**: Filter transactions by one or more tags

### 3. Tag Analytics
- **Spending by Tag**: See total spending for each tag
- **Tag Trends**: Track spending patterns over time (monthly)
- **Category Breakdown**: View which categories are used within each tag
- **Tag Comparison**: Compare spending across multiple tags
- **Insights Summary**: Overview of tag usage and spending
- **Visual Charts**: Bar charts and pie charts for better visualization

## API Endpoints

### Tag CRUD Operations

#### Create Tag
```http
POST /tags
Content-Type: application/json

{
  "name": "Vacation",
  "color": "#3B82F6",
  "description": "Holiday expenses"
}
```

#### Get All Tags
```http
GET /tags?includeDeleted=false
```

#### Get Tags with Usage Count
```http
GET /tags/with-usage
```

#### Search Tags
```http
GET /tags/search?q=vacation
```

#### Get Tag by ID
```http
GET /tags/:id
```

#### Get Tag Statistics
```http
GET /tags/:id/stats
```

#### Update Tag
```http
PUT /tags/:id
Content-Type: application/json

{
  "name": "Summer Vacation",
  "color": "#10B981",
  "description": "Summer holiday expenses"
}
```

#### Delete Tag (Soft Delete)
```http
DELETE /tags/:id
```

#### Restore Tag
```http
PUT /tags/:id/restore
```

#### Hard Delete Tag
```http
DELETE /tags/:id/hard
```

#### Merge Tags
```http
POST /tags/merge
Content-Type: application/json

{
  "sourceTagIds": ["tag-id-1", "tag-id-2"],
  "targetTagId": "target-tag-id"
}
```

#### Bulk Delete Tags
```http
POST /tags/bulk-delete
Content-Type: application/json

{
  "tagIds": ["tag-id-1", "tag-id-2", "tag-id-3"]
}
```

### Tag Analytics

#### Get Spending by Tag
```http
GET /tags/analytics/spending?from=2024-01-01&to=2024-12-31&tagIds=tag-id-1,tag-id-2
```

#### Get Tag Trends
```http
GET /tags/analytics/trends/:tagId?months=6
```

#### Get Category Breakdown by Tag
```http
GET /tags/analytics/category-breakdown/:tagId?from=2024-01-01&to=2024-12-31
```

#### Compare Tag Spending
```http
GET /tags/analytics/compare?tagIds=tag-id-1,tag-id-2&from=2024-01-01&to=2024-12-31
```

#### Get Tag Insights Summary
```http
GET /tags/analytics/summary?from=2024-01-01&to=2024-12-31
```

### Transaction Endpoints with Tag Support

#### Create Transaction with Tags
```http
POST /transactions
Content-Type: application/json

{
  "accountId": "account-id",
  "categoryId": "category-id",
  "amount": "100.00",
  "description": "Dinner at restaurant",
  "transactionDate": "2024-01-15",
  "tagIds": ["tag-id-1", "tag-id-2"]
}
```

#### Get Transactions with Tag Filter
```http
GET /transactions?tagIds=tag-id-1,tag-id-2&from=2024-01-01&to=2024-12-31
```

#### Update Transaction Tags
```http
PUT /transactions/:id
Content-Type: application/json

{
  "tagIds": ["new-tag-id-1", "new-tag-id-2"]
}
```

## Database Schema

### Tags Table (`dbo.tags`)
```sql
CREATE TABLE dbo.tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  userId UUID NOT NULL REFERENCES dbo.users(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  normalizedName VARCHAR(50), -- For case-insensitive search
  color VARCHAR(20) DEFAULT '#3B82F6',
  description TEXT,
  isDeleted BOOLEAN DEFAULT false,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tags_user_id ON dbo.tags(userId);
CREATE INDEX idx_tags_name ON dbo.tags(name);
CREATE INDEX idx_tags_normalized_name ON dbo.tags(normalizedName);
```

### Transaction Tags Junction Table (`dbo.transaction_tags`)
```sql
CREATE TABLE dbo.transaction_tags (
  transactionId UUID NOT NULL REFERENCES dbo.transactions(id) ON DELETE CASCADE,
  tagId UUID NOT NULL REFERENCES dbo.tags(id) ON DELETE CASCADE,
  PRIMARY KEY (transactionId, tagId)
);

CREATE INDEX idx_transaction_tags_transaction_id ON dbo.transaction_tags(transactionId);
CREATE INDEX idx_transaction_tags_tag_id ON dbo.transaction_tags(tagId);
```

## Frontend Components

### TagInput Component
A reusable component for selecting tags in forms:
```tsx
import TagInput from "@/components/TagInput";

<TagInput
  value={tagIds}
  onChange={(tagIds) => setTagIds(tagIds)}
  placeholder="Add tags..."
/>
```

**Features**:
- Autocomplete dropdown
- Create tags on-the-fly
- Visual tag chips with colors
- Keyboard navigation (Enter, Backspace, Escape)
- Click outside to close

### TagManager Component
Full tag management interface:
```tsx
import TagManager from "@/components/TagManager";

<TagManager onClose={() => setShowManager(false)} />
```

**Features**:
- CRUD operations for tags
- Merge mode for combining tags
- Usage statistics
- Color picker
- Search and filter

## Usage Examples

### Example 1: Creating a Tag
```typescript
import { createTag } from "@/services/tags";

const newTag = await createTag({
  name: "Work Expenses",
  color: "#3B82F6",
  description: "All work-related expenses"
});
```

### Example 2: Adding Tags to a Transaction
```typescript
import { createTransaction } from "@/services/transactions";

await createTransaction({
  accountId: "account-123",
  categoryId: "category-456",
  amount: "50.00",
  description: "Team lunch",
  transactionDate: "2024-01-15",
  tagIds: ["work-tag-id", "food-tag-id"]
});
```

### Example 3: Filtering Transactions by Tags
```typescript
import { getFilterTransactions } from "@/services/transactions";

const transactions = await getFilterTransactions({
  tagIds: ["vacation-tag-id"],
  from: "2024-06-01",
  to: "2024-08-31"
});
```

### Example 4: Getting Tag Analytics
```typescript
import { getSpendingByTag, getTagTrends } from "@/services/tags";

// Get spending summary for all tags this month
const spendingData = await getSpendingByTag({
  from: dayjs().startOf("month").format("YYYY-MM-DD"),
  to: dayjs().endOf("month").format("YYYY-MM-DD")
});

// Get 6-month trend for a specific tag
const trends = await getTagTrends("vacation-tag-id", 6);
```

### Example 5: Merging Tags
```typescript
import { mergeTags } from "@/services/tags";

// Merge "Holiday" and "Vacation" into "Travel"
await mergeTags({
  sourceTagIds: ["holiday-tag-id", "vacation-tag-id"],
  targetTagId: "travel-tag-id"
});
```

## Best Practices

### 1. Tag Naming
- Use clear, descriptive names
- Keep names short (under 20 characters for better UI display)
- Use consistent naming conventions (e.g., all lowercase or title case)
- Avoid special characters

### 2. Tag Organization
- Create tags for recurring themes (e.g., "Business", "Personal", "Gift")
- Use tags to complement categories, not replace them
- Merge duplicate or similar tags regularly
- Archive unused tags instead of deleting them

### 3. Color Coding
- Use consistent colors for related tags
- Choose high-contrast colors for better visibility
- Use the default color palette for common tag types

### 4. Tag Usage
- Tag transactions immediately for better tracking
- Use multiple tags when appropriate (e.g., "Work" + "Travel")
- Review tag usage monthly to identify patterns
- Clean up unused tags quarterly

### 5. Performance
- Limit tag selection to 5-10 tags per transaction
- Use tag filtering with date ranges for better query performance
- Archive old tags instead of keeping them active

## Migration Guide

### Running the Migration
```bash
# Navigate to backend directory
cd ledgerly-api

# Run migration
npm run migration:run
```

### Rollback Migration
```bash
# Revert the tag migration
npm run migration:revert
```

## Troubleshooting

### Common Issues

#### 1. Tags Not Appearing in Dropdown
- **Cause**: Tags might be soft-deleted
- **Solution**: Check `includeDeleted` parameter or restore deleted tags

#### 2. CSRF Token Error When Creating Tags
- **Cause**: CSRF token not initialized
- **Solution**: Ensure `initCsrf()` is called before POST requests (handled automatically by axios interceptor)

#### 3. Tag Merge Fails
- **Cause**: Target tag is in source tags list
- **Solution**: Ensure target tag is different from source tags

#### 4. Duplicate Tag Error
- **Cause**: Tag with same name already exists (case-insensitive)
- **Solution**: Check existing tags before creating new ones

#### 5. Tag Analytics Not Loading
- **Cause**: No transactions with tags in selected period
- **Solution**: Verify transactions have tags and date range is correct

## Future Enhancements

### Planned Features
1. **Tag Templates**: Pre-defined tag sets for common use cases
2. **Tag Rules**: Auto-tag transactions based on rules
3. **Tag Hierarchy**: Parent-child tag relationships
4. **Tag Sharing**: Share tags between users (for families/teams)
5. **Smart Suggestions**: AI-powered tag suggestions based on transaction description
6. **Tag Reports**: Exportable PDF reports grouped by tags
7. **Tag Budgets**: Set spending limits per tag
8. **Tag Goals**: Financial goals associated with tags

### API Improvements
1. Bulk tag operations (create/update/delete multiple tags)
2. Tag import/export functionality
3. Tag usage analytics API
4. Tag recommendation engine
5. Advanced filtering with tag combinations (AND/OR logic)

## Support

For issues or questions about the tagging system:
1. Check this documentation first
2. Review the API Reference documentation
3. Check the troubleshooting section
4. Create an issue on GitHub with details

## Changelog

### Version 1.0.0 (2024-12-29)
- Initial release of tagging system
- Tag CRUD operations
- Transaction tagging
- Tag analytics and insights
- Tag management UI
- Tag insights dashboard with charts
