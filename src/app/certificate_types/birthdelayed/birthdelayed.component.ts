import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-birthdelayed.component',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './birthdelayed.component.html',
  styleUrl: './birthdelayed.component.css',
})
export class BirthdelayedComponent {
 documentForm: FormGroup;
  file1: File | null = null;
    file2: File | null = null;
  
    constructor(private fb: FormBuilder, private http: HttpClient) {
      this.documentForm = this.fb.group({
        name: ['', [Validators.required, Validators.maxLength(50)]]
      });
    }
  
    documentType = 'Death Certificate';
  
    get f() {
      return this.documentForm.controls;
    }
  
    onFileSelected(event: any, fileNumber: number) {
      if (event.target.files.length > 0) {
        if (fileNumber === 1) {
          this.file1 = event.target.files[0];
        } else if (fileNumber === 2) {
          this.file2 = event.target.files[0];
        }
      }
    }
  
    submitDocumentRequest() {
      if (this.documentForm.invalid) {
        this.documentForm.markAllAsTouched();
        return;
      }
  
      const token = localStorage.getItem('token'); // get token from localStorage
      if (!token) {
        alert('You are not logged in!');
        return;
      }
  
      const headers = new HttpHeaders({
        Authorization: `Bearer ${token}`
      });
  
      const formData = new FormData();
      formData.append('name', this.documentForm.value.name);
      formData.append('document_type', this.documentType);
  
      if (this.file1) formData.append('files', this.file1, this.file1.name);
      if (this.file2) formData.append('files', this.file2, this.file2.name);
  
      this.http.post('http://localhost:4000/api/document_request', formData, { headers })
        .subscribe({
          next: (res: any) => {
            alert('Document request submitted successfully! Request ID: ' + res.requestId);
            this.documentForm.reset();
            this.file1 = null;
            this.file2 = null;
          },
          error: (err: any) => {
            if (err.status === 401) {
              alert('Unauthorized! Please log in again.');
            } else {
              alert('Failed to submit document request. Error: ' + (err.error?.message || err.message));
            }
          }
        });
    }
  }