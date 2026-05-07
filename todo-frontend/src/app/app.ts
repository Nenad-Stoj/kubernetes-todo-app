import { Component } from '@angular/core';
import { TodoList } from './components/todo-list/todo-list';
import { Login } from './components/login/login';
import { AuthService } from './services/auth.service';
import { CommonModule } from '@angular/common';
import { Profile } from './components/profile/profile';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [TodoList, Login, Profile, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  activePage = 'tasks';

  constructor(public authService: AuthService) {}

  logout(): void {
    this.authService.logout();
    window.location.reload();
  }
}