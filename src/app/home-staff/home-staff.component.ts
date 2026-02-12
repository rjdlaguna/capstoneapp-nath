import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-home-staff',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './home-staff.component.html',
  styleUrls: ['./home-staff.component.css']
})
export class HomeStaffComponent implements OnInit {
  pending: any[] = [];
  under_review: any[] = [];
  approved: any[] = [];
  denied: any[] = [];

  // ---------- STATISTICS ----------
  stats = {
    approved: { today: 0, week: 0, month: 0 },
    denied: { today: 0, week: 0, month: 0 }
  };

  constructor(private http: HttpClient, private router: Router) {}

  ngOnInit() {
    this.fetchDocumentRequests();
  }

  fetchDocumentRequests() {
  const token = localStorage.getItem('token'); // must store it on login

  if (!token) {
    console.error('No token found. User might not be logged in.');
    return;
  }

  this.http.get<any[]>('http://localhost:4000/api/document_request', {
    headers: { Authorization: `Bearer ${token}` }
  }).subscribe({
    next: (data) => {
      console.log('Raw API data:', data);

      // Only include active (archived = 0)
      const activeData = data.filter(d => d.archived === 0);

      // Split data by status
      this.pending = activeData.filter(d => d.status === 'pending');
      this.under_review = activeData.filter(d => d.status === 'under_review');
      this.approved = activeData.filter(d => d.status === 'approved');
      this.denied = activeData.filter(d => d.status === 'denied');

      // Calculate stats
      this.calculateStats(data);
    },
    error: (err) => console.error('Failed to fetch document requests', err)
  });
}


  calculateStats(data: any[]) {
    const now = new Date();

    const processedData = data.filter(d => d.status === 'approved');
    const deniedData = data.filter(d => d.status === 'denied');

    this.stats.approved.today = processedData.filter(d =>
      this.isSameDay(new Date(d.updated_at || d.date_created), now)
    ).length;

    this.stats.approved.week = processedData.filter(d =>
      this.isSameWeek(new Date(d.updated_at || d.date_created), now)
    ).length;

    this.stats.approved.month = processedData.filter(d =>
      this.isSameMonth(new Date(d.updated_at || d.date_created), now)
    ).length;

    this.stats.denied.today = deniedData.filter(d =>
      this.isSameDay(new Date(d.updated_at || d.date_created), now)
    ).length;

    this.stats.denied.week = deniedData.filter(d =>
      this.isSameWeek(new Date(d.updated_at || d.date_created), now)
    ).length;

    this.stats.denied.month = deniedData.filter(d =>
      this.isSameMonth(new Date(d.updated_at || d.date_created), now)
    ).length;
  }

  // ---------- HELPER FUNCTIONS ----------
  isSameDay(a: Date, b: Date) {
    return a.toDateString() === b.toDateString();
  }

  isSameWeek(a: Date, b: Date) {
    const oneDay = 24 * 60 * 60 * 1000;
    return Math.abs(a.getTime() - b.getTime()) / oneDay < 7;
  }

  isSameMonth(a: Date, b: Date) {
    return a.getMonth() === b.getMonth() &&
           a.getFullYear() === b.getFullYear();
  }

  // ---------- NAVIGATION ----------
  viewRequestDetail(request: any) {
    this.router.navigate(['/request-detail', request.RequestID]);
  }

  viewInProcessDetail(request: any) {
    this.router.navigate(['/process-request', request.RequestID]);
  }
}
