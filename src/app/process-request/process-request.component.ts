import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-process-request',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  templateUrl: './process-request.component.html',
  styleUrls: ['./process-request.component.css']
})
export class ProcessRequestComponent implements OnInit {
  requestId!: number;
  request: any;
  loading = true;
  errorMessage = '';
  showDenyModal = false;

  denialOptions = [
    { key: 'blurry', label: 'Blurry', details: '', selected: false },
    { key: 'incomplete', label: 'Incomplete', details: '', selected: false },
    { key: 'unauthorized', label: 'Unauthorized', details: '', selected: false },
    { key: 'other', label: 'Other', details: '', selected: false }
  ];

  backendUrl = 'http://localhost:4000';

  constructor(private route: ActivatedRoute, private router: Router, private http: HttpClient) {}

  ngOnInit() {
    this.requestId = +this.route.snapshot.paramMap.get('id')!;
    this.fetchRequestDetail();
  }

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('You are not logged in!');
      throw new Error('Unauthorized');
    }
    return new HttpHeaders({ Authorization: 'Bearer ' + token });
  }

  fetchRequestDetail() {
    this.loading = true;
    const headers = this.getAuthHeaders();

    this.http.get<any>(this.backendUrl + '/api/document_request/' + this.requestId, { headers })
      .subscribe({
        next: (data) => {
          this.request = data;
          console.log('Loaded request (process view):', this.request);

          if (this.request?.file_path) {
            this.request.fileUrls = this.request.file_path
              .split(',')
              .map((p: string) => this.backendUrl + '/' + p.trim());
          } else {
            this.request.fileUrls = [];
          }

          this.loading = false;
        },
        error: (err) => {
          console.error('Failed to load document request:', err);
          this.errorMessage = 'Failed to load document request.';
          this.loading = false;
        }
      });
  }

  approveRequest() {
    if (!confirm('Approve this request?')) return;

    let headers: HttpHeaders;
    try { 
      headers = this.getAuthHeaders(); 
    } catch { 
      return; 
    }

    this.http.post(this.backendUrl + '/api/document_request/' + this.requestId + '/approved', {}, { headers })
      .subscribe({
        next: () => {
          console.log('Request approved successfully');
          alert('Request approved!');
          this.router.navigate(['/home-staff']);
        },
        error: (err) => {
          console.error('Failed to approve request:', err);
          alert('Failed to approve request.');
        }
      });
  }

  denyRequest() {
    this.showDenyModal = true;
    this.denialOptions.forEach(opt => {
      opt.details = '';
      opt.selected = false;
    });
  }

  toggleReason(event: any, option: any) {
    option.selected = event.target.checked;
  }

  confirmDeny() {
    const selected = this.denialOptions.filter(opt => opt.selected);
    if (selected.length === 0) {
      alert('Please select at least one reason.');
      return;
    }

    const reasonStrings = selected.map(opt => opt.label + (opt.details ? ': ' + opt.details : ''));
    const finalReason = reasonStrings.join('; ');

    let headers: HttpHeaders;
    try { 
      headers = this.getAuthHeaders(); 
    } catch { 
      return; 
    }

    this.http.put(
      this.backendUrl + '/api/document_request/' + this.requestId + '/deny',
      { reason: finalReason },
      { headers }
    ).subscribe({
      next: () => {
        console.log('Request denied successfully');
        alert('Request denied');
        this.showDenyModal = false;
        this.denialOptions.forEach(opt => opt.selected = false);
        this.router.navigate(['/home-staff']);
      },
      error: (err) => {
        console.error('Failed to deny request:', err);
        alert('Failed to deny request.');
      }
    });
  }

  cancelDeny() {
    this.showDenyModal = false;
    this.denialOptions.forEach(opt => opt.selected = false);
  }
}