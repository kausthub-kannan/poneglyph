export type NodeStatus   = 'draft' | 'researched' | 'verified';
export type NodeRelation = 'supports' | 'contradicts' | 'elaborates';
export type NodeRole     = 'foundational' | 'tangential';

export interface NodeFrontmatter {
  title:             string;
  status:            NodeStatus;
  relation_to_parent: NodeRelation;
  role:              NodeRole;
  confidence:        number;
  created:           string;
  query:             string;
  parent_nodes:      string[];
  sources:           string[];
}

export interface SourceEntry {
  key:       string;
  title:     string;
  authors:   string;
  year:      number;
  journal:   string;
  hIndex:    number;
  doiOrLink: string;
}

export interface AgentNodePayload {
  filename:    string;
  frontmatter: NodeFrontmatter;
  body:        string;
  sources:     SourceEntry[];
}

export interface NoteContext {
    title: string;
    content: string;
}

export interface IdeaResult {
    primaryTitle: string;
    parentTitles: string[];
    llmOutput: string;
}