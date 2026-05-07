import { Component, OnInit } from '@angular/core';
import { TodoService } from '../../services/todo.service';
import { TodoItem } from '../../models/todo-item';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';



@Component({
  selector: 'app-todo-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './todo-list.html',
  styleUrl: './todo-list.css'
})

export class TodoList implements OnInit {
  items: TodoItem[] = [];
  what_to_do = '';
  due_date = '';
  priority = 'Medium';
  category = 'General';
  statusFilter = 'all';

  constructor(private todoService: TodoService) {}

  ngOnInit(): void {
    this.loadItems();
  }

  loadItems(): void {
    this.todoService.getItems().subscribe(data => {
      this.items = data;
    });
  }

    addItem(): void {
    if (!this.what_to_do.trim()) return;

    this.todoService.addItem({
        what_to_do: this.what_to_do,
        due_date: this.due_date,
        priority: this.priority,
        category: this.category
    }).subscribe(() => {
        this.what_to_do = '';
        this.due_date = '';
        this.priority = 'Medium';
        this.category = 'General';
        this.loadItems();
    });
    }

  markDone(id: number): void {
    this.todoService.markDone(id).subscribe(() => {
      this.loadItems();
    });
  }

  deleteItem(id: number): void {
    this.todoService.deleteItem(id).subscribe(() => {
      this.loadItems();
    });
  }

    get filteredItems(): TodoItem[] {
        if (this.statusFilter === 'all') {
            return this.items;
        }
        return this.items.filter(item => item.status === this.statusFilter);
    }

    translatedText = '';
targetLanguage = 'mk';

translateTask(): void {
  if (!this.what_to_do.trim()) {
    this.translatedText = 'Please enter text to translate.';
    return;
  }

  this.todoService.translateTask(this.what_to_do, this.targetLanguage)
    .subscribe({
      next: (res: any) => {
        this.translatedText = res.translated;
      },
      error: (err) => {
        console.error('Translation failed:', err);
        this.translatedText = 'Translation failed.';
      }
    });
}

    enhanceTask(): void {

  if (!this.what_to_do.trim()) return;

  this.todoService
    .enhanceTask(this.what_to_do)
    .subscribe({

      next: (res: any) => {

        this.what_to_do = res.improved_task;

        this.priority = res.priority;

        this.category = res.category;
      },

      error: (err) => {
        console.error("AI enhancement failed:", err);
      }
    });
}
    activeTab = 'active';

    get activeItems(): TodoItem[] {
    return this.items.filter(item => item.status !== 'done');
    }

    get historyItems(): TodoItem[] {
    return this.items.filter(item => item.status === 'done');
    }

    get completedToday(): number {
  const today = new Date().toDateString();

  return this.historyItems.filter(item =>
    item.completed_at &&
    new Date(item.completed_at).toDateString() === today
  ).length;
}

get completedThisWeek(): number {
  const now = new Date();
  const weekAgo = new Date();
  weekAgo.setDate(now.getDate() - 7);

  return this.historyItems.filter(item =>
    item.completed_at &&
    new Date(item.completed_at) >= weekAgo
  ).length;
}

get completedThisMonth(): number {
  const now = new Date();

  return this.historyItems.filter(item => {
    if (!item.completed_at) return false;

    const completedDate = new Date(item.completed_at);

    return (
      completedDate.getMonth() === now.getMonth() &&
      completedDate.getFullYear() === now.getFullYear()
    );
  }).length;
}
}