/** 用户自定义标签，打在字体家族（css_font_family）上 */
export interface Tag {
  id: string;
  name: string;
  created_at: number;
}

export interface FamilyTag {
  family: string;
  tag_id: string;
}
