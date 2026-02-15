import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-my-requests',
  standalone: true,
  templateUrl: './my-requests.component.html',
  styleUrls: ['./my-requests.component.css'],
  imports: [CommonModule]
})
export class MyRequestsComponent implements OnInit {
  requests: any[] = [];
  historyMap: { [key: number]: any[] } = {};
  historyVisibility: { [key: number]: boolean } = {}; // Track which histories are visible
  isLoading: boolean = true;
  loadingHistory: { [key: number]: boolean } = {}; // Track loading state per request

  constructor(private authService: AuthService) {}

  ngOnInit() {
    this.fetchRequests();
  }

  // ========== FETCH REQUESTS ==========
  fetchRequests() {
    this.isLoading = true;
    this.authService.getMyRequests().subscribe({
      next: (res) => {
        this.requests = res;
        console.log('Fetched requests:', this.requests);
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Failed to fetch requests', err);
        this.isLoading = false;
      }
    });
  }

  // ========== VIEW/HIDE HISTORY TOGGLE ==========
  viewHistory(requestId: number) {
    // Toggle visibility
    this.historyVisibility[requestId] = !this.historyVisibility[requestId];

    // If showing history and haven't fetched yet, fetch it
    if (this.historyVisibility[requestId] && !this.historyMap[requestId]) {
      this.fetchHistory(requestId);
    }
  }

  // ========== FETCH HISTORY ==========
  private fetchHistory(requestId: number) {
    this.loadingHistory[requestId] = true;
    this.authService.getRequestHistory(requestId).subscribe({
      next: (res) => {
        this.historyMap[requestId] = res;
        console.log('Fetched history for request', requestId, res);
        this.loadingHistory[requestId] = false;
      },
      error: (err) => {
        console.error('Failed to fetch history for request', requestId, err);
        this.loadingHistory[requestId] = false;
      }
    });
  }

  // ========== DOWNLOAD FILE ==========
  downloadFile(requestId: number, filePath: string) {
    this.authService.downloadRequestFile(requestId).subscribe({
      next: (blob) => {
        const link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = filePath.split('/').pop() || `request-${requestId}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(link.href);
        console.log('File downloaded successfully');
      },
      error: (err) => console.error('Failed to download file', err)
    });
  }

  // ========== HELPER METHODS ==========
  isHistoryVisible(requestId: number): boolean {
    return this.historyVisibility[requestId] || false;
  }

  isHistoryLoading(requestId: number): boolean {
    return this.loadingHistory[requestId] || false;
  }
}