import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ToastService } from './toast.service';
@Component({
  selector: 'app-toast-host',
  standalone: true,
  imports: [CommonModule],
  // Externalized template & styles
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.scss'],
})
export class ToastComponent {
  constructor(public service: ToastService) {}
}
