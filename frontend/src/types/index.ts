export interface User {
  id: string;
  username: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
  points_balance?: number;
  created_at: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'file';
  created_at: string;
  read_at?: string;
  sender?: User;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  avatar_url?: string;
  last_message?: Message;
  unread_count: number;
  participants: User[];
  created_at: string;
}

export interface PointTransaction {
  id: string;
  user_id: string;
  amount: number;
  transaction_type: 'earn' | 'redeem' | 'bonus' | 'penalty';
  description: string;
  created_at: string;
}

export interface EngagementScore {
  overall_score: number;
  two_way_participation: number;
  response_time: number;
  conversation_continuity: number;
  message_length: number;
  interaction_variety: number;
  message_uniqueness: number;
  points_awarded: number;
}
