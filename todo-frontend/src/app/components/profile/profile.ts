import { Component, OnInit } from '@angular/core';
import { ProfileService } from '../../services/profile.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.html'
})
export class Profile implements OnInit {

  profile: any;
  leaderboard: any[] = [];
  selectedLanguage = 'mk';

  constructor(private profileService: ProfileService) {}

  ngOnInit(): void {
    this.loadProfile();
    this.loadLeaderboard();
  }

  loadProfile(): void {
    this.profileService.getProfile().subscribe((res: any) => {
      this.profile = res;
      this.selectedLanguage = res.preferred_language || 'mk';
    });
  }

  saveLanguage(): void {
    this.profileService
      .updateLanguage(this.selectedLanguage)
      .subscribe((res: any) => {
        this.profile = res;
      });
  }

  uploadImage(event: any): void {
    const file = event.target.files[0];

    if (!file) return;

    this.profileService.uploadImage(file)
      .subscribe((res: any) => {
        this.profile = res;
      });
  }

  loadLeaderboard(): void {
    this.profileService
      .getLeaderboard()
      .subscribe((res: any) => {
        this.leaderboard = res;
      });
  }
}