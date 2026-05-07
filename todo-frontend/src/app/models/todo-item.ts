export interface TodoItem {
  id: number;
  what_to_do: string;
  due_date: string;
  status: string;
  priority: string;
  category: string;
  completed_at?: string;
}