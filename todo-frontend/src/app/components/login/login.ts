import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  username = '';
  password = '';
  error = '';

  constructor(private authService: AuthService) {}

  login(): void {
    this.authService.login(this.username, this.password).subscribe({
      next: (res: any) => {
        this.authService.saveToken(res.token);
        window.location.reload();
      },
      error: () => {
        this.error = 'Invalid username or password';
      }
    });
  }

  register(): void {
    this.authService.register(this.username, this.password).subscribe({
      next: () => {
        this.login();
      },
      error: () => {
        this.error = 'Registration failed';
      }
    });
  }
}