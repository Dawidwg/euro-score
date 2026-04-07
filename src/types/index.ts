export type PointScale = number[];

export type PresentationMode = 'all-together' | 'top-separated' | 'one-by-one';

export interface Participant {
  id: string;
  flagCode: string; 
  name: string;     
}

export interface Jury {
  id: string;
  flagCode: string;
  name: string;
  votes: Record<string, number>; 
}

export interface Scoreboard {
  id: string;
  title: string;
  pointScale: PointScale;
  presentationMode: PresentationMode;
  participants: Participant[];
  juries: Jury[];
  createdAt: number;
}