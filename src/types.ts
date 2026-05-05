export type NodeStatus   = 'draft' | 'researched' | 'verified';
export type NodeRelation = 'supports' | 'contradicts' | 'elaborates';
export type NodeRole     = 'foundational' | 'tangential';

export interface NodeFrontmatter {
  title:             string;
  status:            NodeStatus;
  relation_to_parent: NodeRelation;
  role:              NodeRole;
  confidence:        number;          // 0.0 – 1.0, agent-assigned
  created:           string;          // YYYY-MM-DD
  query:             string;
  parent_nodes:      string[];
  sources:           string[];        // keys into SOURCES.md
}

export interface SourceEntry {
  key:       string;   // e.g. smith2021
  title:     string;
  authors:   string;
  year:      number;
  journal:   string;
  hIndex:    number;
  doiOrLink: string;
}

/** Shape of what the agent returns via write_research_node tool */
export interface AgentNodePayload {
  filename:    string;
  frontmatter: NodeFrontmatter;
  body:        string;
  sources:     SourceEntry[];
}