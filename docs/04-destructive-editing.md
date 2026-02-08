# SCCA Destructive Editing

> Extracted from the SCCA v2.0 Canonical Specification

## Why Destructive

Most chat systems are append-only. Edit = add "edited" flag. Problems:
- Users feel they cannot correct mistakes (old version visible)
- Context windows fill with irrelevant old messages
- AI responses based on outdated context become useless

SCCA acknowledges conversations are **living documents**. Edit message #5 = everything after it was based on the old version and is now invalid.

## User Experience

1. User clicks **Edit** on a message
2. UI enters edit mode with textarea
3. User saves changes
4. Warning: *"This will delete all messages after this point and regenerate the response. This action cannot be undone."*
5. Confirm → immediate truncation + regeneration
6. **No undo. No view history. Old messages are gone.**

This simplicity is intentional. It matches how people think about editing.

## Server Implementation

```
Transaction:
  1. Lock conversation row (prevent concurrent modifications)
  2. Find target message in encrypted array
  3. Create new encrypted blob (same sequence number, new timestamp)
  4. Truncate array: keep messages before + including edited one
  5. Update database with shorter array
  6. Broadcast "conversation-truncated" to all clients
  7. Begin AI regeneration automatically
```

The deleted messages are not archived. Not logged separately. They **cease to exist**, freeing storage immediately.

## Delete Operation

Similar to edit but simpler:
1. Find target message
2. Remove it and all subsequent messages
3. Update database
4. Broadcast truncation
5. No auto-regeneration (unless explicitly requested)

## Race Condition Prevention

The server locks the conversation row during edit/delete operations. If two edits arrive simultaneously, the second one waits for the first to complete. This prevents corrupted state.
