import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-birth',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './birth.component.html',
  styleUrls: ['./birth.component.css']
})
export class BirthComponent {
  documentForm: FormGroup;
  selectedFile: File | null = null;

  constructor(private fb: FormBuilder, private http: HttpClient) {
    this.documentForm = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(50)]]
    });
  }

  documentType = 'Birth Certificate';

  get f() {
    return this.documentForm.controls;
  }

  onFileSelected(event: any) {
    if (event.target.files.length > 0) {
      this.selectedFile = event.target.files[0];
    }
  }

  submitDocumentRequest() {
    if (this.documentForm.invalid) {
      this.documentForm.markAllAsTouched();
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      alert('You are not logged in. Please log in first.');
      return;
    }

    const formData = new FormData();
    formData.append('name', this.documentForm.value.name);
    formData.append('document_type', this.documentType);
    if (this.selectedFile) {
      formData.append('file', this.selectedFile, this.selectedFile.name);
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    this.http.post('http://localhost:4000/api/document_request', formData, { headers })
      .subscribe({
        next: (res: any) => {
          alert('Document request submitted successfully! Request ID: ' + res.id);
          this.documentForm.reset();
          this.selectedFile = null;
        },
        error: err => {
          if (err.status === 401) {
            alert('Unauthorized! Please log in again.');
          } else {
            alert('Failed to submit document request. Error: ' + (err.error?.message || err.message));
          }
        }
      });
  }
}
