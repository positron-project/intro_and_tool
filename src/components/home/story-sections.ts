export interface StorySectionItem {
  id: string
  label: string
}

export const STORY_SECTIONS: StorySectionItem[] = [
  { id: 'story-hero', label: '首页' },
  { id: 'story-about', label: '关于我们' },
  { id: 'story-offer', label: '作品展示' },
  { id: 'story-picks', label: '小组推荐' },
  { id: 'story-blog', label: '小组博客' },
  { id: 'story-join', label: '加入我们' },
]
