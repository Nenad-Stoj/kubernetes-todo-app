import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class ProfileService {

  private apiUrl = 'http://34.134.224.128:3000/api';

  constructor(private http: HttpClient) {}

  private getHeaders() {
    return {
      Authorization: `Bearer ${localStorage.getItem('token')}`
    };
  }

  getProfile() {
    return this.http.get<any>(
      `${this.apiUrl}/profile`,
      { headers: this.getHeaders() }
    );
  }

  updateLanguage(language: string) {
    return this.http.put<any>(
      `${this.apiUrl}/profile/language`,
      { preferred_language: language },
      { headers: this.getHeaders() }
    );
  }

  uploadImage(file: File) {
    const formData = new FormData();

    formData.append('image', file);

    return this.http.post<any>(
      `${this.apiUrl}/profile/image`,
      formData,
      { headers: this.getHeaders() }
    );
  }

  getLeaderboard() {
    return this.http.get<any[]>(
      `${this.apiUrl}/leaderboard`,
      { headers: this.getHeaders() }
    );
  }
}