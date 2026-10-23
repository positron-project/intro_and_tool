type DraftNotice = {
  candidate?: { savedAt: number } | null
  status: string
  restore: () => void
  discard: () => void
}

export function LocalDraftNotice({ draft }: { draft: DraftNotice }) {
  if (draft.candidate)
    return (
      <div className="admin-note-card local-draft-notice" role="status">
        <div>
          <strong>发现未提交的本地草稿</strong>
          <p>保存于 {new Date(draft.candidate.savedAt).toLocaleString('zh-CN')}。恢复会替换当前表单内容。</p>
          <button type="button" className="secondary-button admin-small-button" onClick={draft.restore}>
            恢复草稿
          </button>{' '}
          <button type="button" className="text-button" onClick={draft.discard}>
            丢弃旧草稿
          </button>
        </div>
      </div>
    )
  return draft.status ? (
    <p className="local-draft-status" role="status">
      {draft.status}
    </p>
  ) : null
}
import './LocalDraftNotice.css'
