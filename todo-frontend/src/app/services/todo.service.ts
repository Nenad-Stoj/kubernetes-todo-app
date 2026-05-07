import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TodoItem } from '../models/todo-item';

@Injectable({
  providedIn: 'root'
})
export class TodoService {
  private apiUrl = 'http://34.134.224.128:3000/api/items';

  constructor(private http: HttpClient) {}


private getHeaders() {
  return {
    Authorization: `Bearer ${localStorage.getItem('token')}`
  };
}

 getItems() {
  return this.http.get<TodoItem[]>(this.apiUrl, {
    headers: this.getHeaders()
  });
}

addItem(item: Partial<TodoItem>) {
  return this.http.post<TodoItem>(this.apiUrl, item, {
    headers: this.getHeaders()
  });
}

markDone(id: number) {
  return this.http.put(`${this.apiUrl}/${id}`, {}, {
    headers: this.getHeaders()
  });
}

deleteItem(id: number) {
  return this.http.delete(`${this.apiUrl}/${id}`, {
    headers: this.getHeaders()
  });
}

  translateTask(text: string, targetLanguage: string) {
  return this.http.post<any>('http://34.134.224.128:3000/api/translate', {
    text,
    targetLanguage
  });
}

  enhanceTask(task: string) {
    return this.http.post<any>('http://34.134.224.128:3000/api/enhance-task', {
        task
    });
    }
}