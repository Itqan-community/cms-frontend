import type { ContentDiffEntryOut, ContentRowComment } from '../models/content-review.models';

const approvals = new Map<string, Set<string>>();
const comments = new Map<string, ContentRowComment[]>();
let commentId = 1;

function approvalKey(versionId: number, rowKey: string): string {
  return `${versionId}:${rowKey}`;
}

function commentListKey(versionId: number, rowKey: string): string {
  return `${versionId}:${rowKey}`;
}

export function mockApproveRow(versionId: number, rowKey: string): void {
  const key = approvalKey(versionId, rowKey);
  if (!approvals.has(key)) approvals.set(key, new Set());
  approvals.get(key)!.add(rowKey);
}

export function mockIsRowApproved(versionId: number, rowKey: string): boolean {
  return approvals.get(approvalKey(versionId, rowKey))?.has(rowKey) ?? false;
}

export function mockListRowComments(versionId: number, rowKey: string): ContentRowComment[] {
  return [...(comments.get(commentListKey(versionId, rowKey)) ?? [])];
}

export function mockAddRowComment(
  versionId: number,
  rowKey: string,
  body: string,
  authorName = 'Reviewer'
): ContentRowComment {
  const key = commentListKey(versionId, rowKey);
  const list = comments.get(key) ?? [];
  const comment: ContentRowComment = {
    id: commentId++,
    version_id: versionId,
    row_key: rowKey,
    author_id: 1,
    author_name: authorName,
    body,
    created_at: new Date().toISOString(),
  };
  list.push(comment);
  comments.set(key, list);
  return comment;
}

export function mockApplyApprovalsToDiff(
  versionId: number,
  rows: ContentDiffEntryOut[]
): ContentDiffEntryOut[] {
  return rows.map((r) => ({
    ...r,
    approved: mockIsRowApproved(versionId, r.row_key),
    comments_count: mockListRowComments(versionId, r.row_key).length,
  }));
}
