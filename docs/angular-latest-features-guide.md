# Angular Latest Features Guide (17-20) 🚀

This guide covers the latest Angular features from version 17 to 20, focusing on practical implementation within the Zoolandingpage project using ngx-angora-css.

## 📚 Control Flow Features (@if, @for, @switch, @defer)

### @if Directive - Conditional Rendering

Replace `*ngIf` with the new `@if` control flow for better performance and readability.

```typescript
// ✅ New @if syntax - Recommended
@Component({
  template: `
    @if (user.isLoggedIn) {
      <div class="ank-p-16px ank-bg-success ank-color-white ank-borderRadius-8px">
        Welcome back, {{ user.name }}!
      </div>
    } @else if (user.isGuest) {
      <div class="ank-p-16px ank-bg-info ank-color-white ank-borderRadius-8px">
        Welcome, Guest! Please consider signing up.
      </div>
    } @else {
      <div class="ank-p-16px ank-bg-warning ank-color-white ank-borderRadius-8px">
        Please log in to continue.
      </div>
    }
  `
})
export class UserStatusComponent {
  user = signal({
    isLoggedIn: false,
    isGuest: true,
    name: 'John Doe'
  });
}

// ❌ Old *ngIf syntax - Avoid
@Component({
  template: `
    <div *ngIf="user.isLoggedIn; else guestTemplate">
      Welcome back, {{ user.name }}!
    </div>
    <ng-template #guestTemplate>
      <div *ngIf="user.isGuest; else loginTemplate">
        Welcome, Guest!
      </div>
      <ng-template #loginTemplate>
        Please log in to continue.
      </ng-template>
    </ng-template>
  `
})
```

### @for Directive - Optimized Loops

Replace `*ngFor` with `@for` for better performance and built-in tracking.

```typescript
// ✅ New @for syntax with tracking - Recommended
@Component({
  template: `
    <div class="ank-display-grid ank-gridTemplateColumns-repeatSD3COM1frED ank-gap-20px">
      @for (feature of features; track feature.id) {
        <div class="ank-p-20px ank-bg-white ank-borderRadius-12px ank-boxShadow-0__4px__6px__rgbaSD0COM0COM0COM0_1ED">
          <h3 class="ank-fontSize-20px ank-fontWeight-600 ank-marginBottom-12px">
            {{ feature.title }}
          </h3>
          <p class="ank-color-gray-600 ank-lineHeight-1_5">
            {{ feature.description }}
          </p>
        </div>
      } @empty {
        <div class="ank-textAlign-center ank-p-40px ank-color-gray-500">
          No features available yet.
        </div>
      }
    </div>
  `
})
export class FeatureListComponent {
  features = signal([
    { id: 1, title: 'Fast Loading', description: 'Lightning fast page loads' },
    { id: 2, title: 'Responsive', description: 'Works on all devices' },
    { id: 3, title: 'SEO Ready', description: 'Optimized for search engines' }
  ]);
}

// ❌ Old *ngFor syntax - Avoid
@Component({
  template: `
    <div *ngFor="let feature of features; trackBy: trackByFn">
      {{ feature.title }}
    </div>
  `
})
```

### @switch Directive - Multiple Conditions

Replace `*ngSwitch` with `@switch` for cleaner conditional rendering.

```typescript
// ✅ New @switch syntax - Recommended
@Component({
  template: `
    <div class="ank-p-20px ank-borderRadius-8px">
      @switch (userRole) { @case ('admin') {
      <div class="ank-bg-red-100 ank-color-red-800">
        <h3>Admin Dashboard</h3>
        <p>Full system access</p>
      </div>
      } @case ('editor') {
      <div class="ank-bg-blue-100 ank-color-blue-800">
        <h3>Editor Panel</h3>
        <p>Content management access</p>
      </div>
      } @case ('viewer') {
      <div class="ank-bg-green-100 ank-color-green-800">
        <h3>Viewer Mode</h3>
        <p>Read-only access</p>
      </div>
      } @default {
      <div class="ank-bg-gray-100 ank-color-gray-800">
        <h3>Welcome</h3>
        <p>Please select your role</p>
      </div>
      } }
    </div>
  `,
})
export class RoleBasedComponent {
  userRole = signal<'admin' | 'editor' | 'viewer' | null>(null);
}
```

### @defer Directive - Advanced Lazy Loading

Use `@defer` for sophisticated lazy loading with triggers and placeholders.

```typescript
// ✅ Advanced defer with multiple triggers and states
@Component({
  template: `
    <div class="ank-minHeight-100vh ank-p-20px">
      <!-- Critical above-the-fold content -->
      <section class="ank-marginBottom-40px">
        <h1 class="ank-fontSize-48px ank-fontWeight-bold ank-textAlign-center">Welcome to Our Landing Page</h1>
      </section>

      <!-- Defer heavy analytics dashboard until viewport -->
      @defer (on viewport; prefetch on idle) {
      <app-analytics-dashboard class="ank-marginBottom-40px" />
      } @placeholder (minimum 100ms) {
      <div class="ank-p-40px ank-bg-gray-100 ank-borderRadius-12px ank-textAlign-center">
        <div
          class="ank-w-48px ank-h-48px ank-border-4px__solid__gray-300 ank-borderTop-blue-500 ank-borderRadius-50per ank-animate-spin ank-margin-0__auto ank-marginBottom-16px"
        ></div>
        <p class="ank-color-gray-600">Loading analytics...</p>
      </div>
      } @error {
      <div class="ank-p-20px ank-bg-red-100 ank-color-red-800 ank-borderRadius-8px ank-textAlign-center">
        <p>Failed to load analytics. Please try again later.</p>
        <button class="ank-mt-12px ank-px-16px ank-py-8px ank-bg-red-600 ank-color-white ank-borderRadius-4px">
          Retry
        </button>
      </div>
      } @loading (minimum 200ms; after 100ms) {
      <div class="ank-p-20px ank-textAlign-center">
        <div class="ank-animate-pulse">
          <div class="ank-h-32px ank-bg-gray-300 ank-borderRadius-4px ank-marginBottom-12px"></div>
          <div class="ank-h-24px ank-bg-gray-300 ank-borderRadius-4px ank-marginBottom-8px"></div>
          <div class="ank-h-24px ank-bg-gray-300 ank-borderRadius-4px ank-w-75per"></div>
        </div>
      </div>
      }

      <!-- Defer testimonials until user interaction -->
      @defer (on interaction; prefetch when userRole === 'premium') {
      <app-testimonials-section />
      } @placeholder {
      <div class="ank-p-32px ank-border-2px__dashed__gray-300 ank-borderRadius-8px ank-textAlign-center">
        <p class="ank-color-gray-500">Click to load customer testimonials</p>
      </div>
      }

      <!-- Defer heavy contact form until timer -->
      @defer (on timer(3s); prefetch on hover) {
      <app-contact-form />
      } @placeholder {
      <div class="ank-p-20px ank-bg-blue-50 ank-borderRadius-8px">
        <p class="ank-color-blue-700">Contact form will appear in a moment...</p>
      </div>
      }
    </div>
  `,
})
export class HomePage {
  userRole = signal<'premium' | 'basic'>('basic');
}
```

### Defer Triggers Reference

```typescript
// Available defer triggers:
@defer (on idle) { } // When browser is idle
@defer (on immediate) { } // Immediately
@defer (on timer(5s)) { } // After specific time
@defer (on viewport) { } // When enters viewport
@defer (on interaction) { } // On user interaction
@defer (on hover) { } // On mouse hover

// Conditional triggers:
@defer (when condition) { } // When condition is true
@defer (prefetch when condition) { } // Prefetch when true

// Combined triggers:
@defer (on viewport; prefetch on idle) { }
@defer (on interaction; prefetch when isLoggedIn) { }
```

## 🎯 Signals API (Angular 17+)

### Signal-based State Management

Replace traditional reactive patterns with Signals for better performance.

```typescript
// ✅ Modern Signal-based component - Recommended
@Component({
  template: `
    <div class="ank-p-20px">
      <h2 class="ank-marginBottom-16px">User Profile</h2>

      @if (isLoading()) {
      <div class="ank-textAlign-center">Loading...</div>
      } @else {
      <div class="ank-p-16px ank-bg-white ank-borderRadius-8px">
        <p><strong>Name:</strong> {{ user().name }}</p>
        <p><strong>Email:</strong> {{ user().email }}</p>
        <p><strong>Posts:</strong> {{ userPosts().length }}</p>
        <p><strong>Total Likes:</strong> {{ totalLikes() }}</p>
      </div>
      }

      <button
        class="ank-mt-16px ank-px-16px ank-py-8px ank-bg-blue-500 ank-color-white ank-borderRadius-4px"
        (click)="loadUserData()"
        [disabled]="isLoading()"
      >
        Refresh Data
      </button>
    </div>
  `,
})
export class UserProfileComponent {
  // Writable signals
  private user = signal({ name: '', email: '', id: 0 });
  private userPosts = signal<Post[]>([]);
  private isLoading = signal(false);

  // Computed signals - automatically update when dependencies change
  protected totalLikes = computed(() => this.userPosts().reduce((sum, post) => sum + post.likes, 0));

  // Expose read-only signals
  protected readonly user$ = this.user.asReadonly();
  protected readonly userPosts$ = this.userPosts.asReadonly();
  protected readonly isLoading$ = this.isLoading.asReadonly();

  constructor(private userService: UserService) {}

  async loadUserData(): Promise<void> {
    this.isLoading.set(true);

    try {
      const [userData, postsData] = await Promise.all([this.userService.getUser(), this.userService.getUserPosts()]);

      this.user.set(userData);
      this.userPosts.set(postsData);
    } catch (error) {
      console.error('Failed to load user data:', error);
    } finally {
      this.isLoading.set(false);
    }
  }

  // Signal effects for side effects
  constructor() {
    effect(() => {
      const currentUser = this.user();
      if (currentUser.id) {
        console.log(`User ${currentUser.name} loaded`);
        // Analytics tracking
        this.analytics.track('user_profile_viewed', { userId: currentUser.id });
      }
    });
  }
}

type Post = {
  id: number;
  title: string;
  likes: number;
};
```

### Signal Forms Integration

```typescript
// ✅ Signal-based form handling
@Component({
  template: `
    <form (ngSubmit)="onSubmit()" class="ank-maxWidth-500px ank-margin-0__auto">
      <div class="ank-marginBottom-16px">
        <label class="ank-display-block ank-marginBottom-8px">Email</label>
        <input
          type="email"
          [value]="email()"
          (input)="email.set($any($event.target).value)"
          class="ank-width-100per ank-p-12px ank-border-1px__solid__gray-300 ank-borderRadius-4px"
          [class.ank-border-red-500]="emailError()"
        />
        @if (emailError()) {
        <p class="ank-color-red-500 ank-fontSize-14px ank-mt-4px">{{ emailError() }}</p>
        }
      </div>

      <button
        type="submit"
        [disabled]="!isFormValid()"
        class="ank-px-24px ank-py-12px ank-bg-blue-500 ank-color-white ank-borderRadius-4px"
        [class.ank-opacity-50]="!isFormValid()"
      >
        Submit
      </button>
    </form>
  `,
})
export class SignalFormComponent {
  // Form signals
  email = signal('');

  // Computed validation
  emailError = computed(() => {
    const emailValue = this.email();
    if (!emailValue) return 'Email is required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
      return 'Invalid email format';
    }
    return '';
  });

  isFormValid = computed(() => !this.emailError());

  onSubmit(): void {
    if (this.isFormValid()) {
      console.log('Form submitted:', this.email());
    }
  }
}
```

## 🛠️ Standalone Components (Angular 17+)

### Fully Standalone Architecture

```typescript
// ✅ Modern standalone component - Recommended
@Component({
  selector: 'app-hero-section',
  imports: [CommonModule, FormsModule],
  template: `
    <section class="ank-minHeight-100vh ank-display-flex ank-alignItems-center ank-justifyContent-center ank-p-20px">
      <div class="ank-textAlign-center ank-maxWidth-800px">
        <h1
          class="ank-fontSize-32px ank-fontSize-md-48px ank-fontSize-lg-56px ank-fontWeight-bold ank-marginBottom-24px"
        >
          {{ title() }}
        </h1>

        @if (subtitle()) {
        <p class="ank-fontSize-18px ank-fontSize-md-20px ank-color-gray-600 ank-marginBottom-32px">
          {{ subtitle() }}
        </p>
        } @for (button of buttons(); track button.id) {
        <button
          class="ank-px-32px ank-py-16px ank-marginRight-16px ank-marginBottom-16px ank-borderRadius-8px ank-fontSize-16px ank-fontWeight-600"
          [class]="
            button.variant === 'primary' ? 'ank-bg-blue-500 ank-color-white' : 'ank-bg-gray-200 ank-color-gray-800'
          "
          (click)="onButtonClick(button)"
        >
          {{ button.text }}
        </button>
        }
      </div>
    </section>
  `,
})
export class HeroSectionComponent {
  title = input.required<string>();
  subtitle = input<string>();
  buttons = input<Array<{ id: string; text: string; variant: 'primary' | 'secondary' }>>();

  buttonClick = output<{ id: string; text: string }>();

  onButtonClick(button: any): void {
    this.buttonClick.emit(button);
  }
}

// ✅ Usage in parent component
@Component({
  template: `
    <app-hero-section
      title="Welcome to Our Service"
      subtitle="Transform your business with our solutions"
      [buttons]="heroButtons()"
      (buttonClick)="handleHeroAction($event)"
    />
  `,
})
export class HomePage {
  heroButtons = signal([
    { id: 'cta', text: 'Get Started', variant: 'primary' as const },
    { id: 'learn', text: 'Learn More', variant: 'secondary' as const },
  ]);

  handleHeroAction(button: { id: string; text: string }): void {
    console.log('Hero button clicked:', button);
  }
}
```

## 🎨 New Input/Output API (Angular 17.1+)

### Modern Input/Output Syntax

```typescript
// ✅ New input/output API - Recommended
@Component({
  selector: 'app-product-card',
  template: `
    <div class="ank-p-20px ank-bg-white ank-borderRadius-12px ank-boxShadow-0__4px__6px__rgbaSD0COM0COM0COM0_1ED">
      @if (product(); as prod) {
        <img
          [src]="prod.image"
          [alt]="prod.name"
          class="ank-width-100per ank-height-200px ank-objectFit-cover ank-borderRadius-8px ank-marginBottom-16px"
        >

        <h3 class="ank-fontSize-20px ank-fontWeight-600 ank-marginBottom-8px">
          {{ prod.name }}
        </h3>

        <p class="ank-color-gray-600 ank-marginBottom-16px">
          {{ prod.description }}
        </p>

        <div class="ank-display-flex ank-justifyContent-between ank-alignItems-center">
          <span class="ank-fontSize-24px ank-fontWeight-bold ank-color-green-600">
            ${{ prod.price }}
          </span>

          <button
            class="ank-px-20px ank-py-10px ank-bg-blue-500 ank-color-white ank-borderRadius-6px"
            [disabled]="isLoading()"
            (click)="onAddToCart()"
          >
            @if (isLoading()) {
              Adding...
            } @else {
              Add to Cart
            }
          </button>
        </div>
      }
    </div>
  `
})
export class ProductCardComponent {
  // Required input with validation
  product = input.required<Product>();

  // Optional input with default value
  showDiscount = input(false);

  // Computed input transformation
  discountedPrice = computed(() => {
    const prod = this.product();
    return this.showDiscount() ? prod.price * 0.9 : prod.price;
  });

  // Output events
  addToCart = output<Product>();
  viewDetails = output<{ productId: string; source: string }>();

  // Internal state
  isLoading = signal(false);

  async onAddToCart(): Promise<void> {
    this.isLoading.set(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      this.addToCart.emit(this.product());
    } catch (error) {
      console.error('Failed to add to cart:', error);
    } finally {
      this.isLoading.set(false);
    }
  }
}

type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
};

// ❌ Old @Input/@Output syntax - Avoid
@Component({
  template: `...`
})
export class OldProductCardComponent {
  @Input({ required: true }) product!: Product;
  @Input() showDiscount = false;
  @Output() addToCart = new EventEmitter<Product>();
}
```

## 🔄 View Transitions API (Angular 17+)

### Smooth Page Transitions

```typescript
// ✅ View transitions setup
@Component({
  template: `
    <div class="ank-minHeight-100vh">
      @if (currentView() === 'home') {
      <div style="view-transition-name: main-content" class="ank-p-20px">
        <h1 class="ank-fontSize-48px ank-fontWeight-bold">Home Page</h1>
        <button
          class="ank-mt-20px ank-px-24px ank-py-12px ank-bg-blue-500 ank-color-white ank-borderRadius-6px"
          (click)="navigateToAbout()"
        >
          Go to About
        </button>
      </div>
      } @else if (currentView() === 'about') {
      <div style="view-transition-name: main-content" class="ank-p-20px">
        <h1 class="ank-fontSize-48px ank-fontWeight-bold">About Page</h1>
        <button
          class="ank-mt-20px ank-px-24px ank-py-12px ank-bg-green-500 ank-color-white ank-borderRadius-6px"
          (click)="navigateToHome()"
        >
          Go to Home
        </button>
      </div>
      }
    </div>
  `,
  styles: [
    `
      ::view-transition-old(main-content),
      ::view-transition-new(main-content) {
        animation-duration: 0.3s;
        animation-timing-function: ease-in-out;
      }

      ::view-transition-old(main-content) {
        animation-name: slideOutLeft;
      }

      ::view-transition-new(main-content) {
        animation-name: slideInRight;
      }

      @keyframes slideOutLeft {
        to {
          transform: translateX(-100%);
          opacity: 0;
        }
      }

      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `,
  ],
})
export class ViewTransitionComponent {
  currentView = signal<'home' | 'about'>('home');

  navigateToAbout(): void {
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        this.currentView.set('about');
      });
    } else {
      this.currentView.set('about');
    }
  }

  navigateToHome(): void {
    if (document.startViewTransition) {
      document.startViewTransition(() => {
        this.currentView.set('home');
      });
    } else {
      this.currentView.set('home');
    }
  }
}
```

## 📱 Material 3 Design Integration (Angular 18+)

### Modern Material Design

```typescript
// ✅ Material 3 with Angular standalone
@Component({
  selector: 'app-material-form',
  imports: [MatButtonModule, MatInputModule, MatCardModule],
  template: `
    <mat-card class="ank-maxWidth-500px ank-margin-0__auto">
      <mat-card-header>
        <mat-card-title>Contact Form</mat-card-title>
      </mat-card-header>

      <mat-card-content class="ank-p-24px">
        <form class="ank-display-flex ank-flexDirection-column ank-gap-16px">
          <mat-form-field appearance="outline">
            <mat-label>Name</mat-label>
            <input matInput [value]="name()" (input)="name.set($any($event.target).value)" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Email</mat-label>
            <input matInput type="email" [value]="email()" (input)="email.set($any($event.target).value)" />
            @if (emailError()) {
            <mat-error>{{ emailError() }}</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Message</mat-label>
            <textarea matInput rows="4" [value]="message()" (input)="message.set($any($event.target).value)"></textarea>
          </mat-form-field>
        </form>
      </mat-card-content>

      <mat-card-actions align="end" class="ank-p-16px">
        <button mat-button type="button">Cancel</button>
        <button mat-raised-button color="primary" [disabled]="!isFormValid()" (click)="onSubmit()">Send Message</button>
      </mat-card-actions>
    </mat-card>
  `,
})
export class MaterialFormComponent {
  name = signal('');
  email = signal('');
  message = signal('');

  emailError = computed(() => {
    const emailValue = this.email();
    return emailValue && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue) ? 'Please enter a valid email' : '';
  });

  isFormValid = computed(() => this.name() && this.email() && this.message() && !this.emailError());

  onSubmit(): void {
    if (this.isFormValid()) {
      console.log('Form submitted:', {
        name: this.name(),
        email: this.email(),
        message: this.message(),
      });
    }
  }
}
```

## 🔧 Built-in Utilities (Angular 19+)

### Resource API and async handling

```typescript
// ✅ Resource API for async data
@Component({
  template: `
    <div class="ank-p-20px">
      @if (userResource.status() === 'pending') {
      <div class="ank-textAlign-center">
        <div
          class="ank-animate-spin ank-w-32px ank-h-32px ank-border-4px__solid__gray-300 ank-borderTop-blue-500 ank-borderRadius-50per"
        ></div>
      </div>
      } @else if (userResource.status() === 'resolved') {
      <div class="ank-p-16px ank-bg-green-100 ank-borderRadius-8px">
        <h3>{{ userResource.value()?.name }}</h3>
        <p>{{ userResource.value()?.email }}</p>
      </div>
      } @else if (userResource.status() === 'rejected') {
      <div class="ank-p-16px ank-bg-red-100 ank-borderRadius-8px">
        <p>Error: {{ userResource.error() }}</p>
        <button
          class="ank-mt-12px ank-px-16px ank-py-8px ank-bg-red-600 ank-color-white ank-borderRadius-4px"
          (click)="userResource.reload()"
        >
          Retry
        </button>
      </div>
      }
    </div>
  `,
})
export class ResourceExampleComponent {
  userResource = resource<User, number>({
    request: () => this.userId(),
    loader: ({ request: userId }) => this.userService.getUser(userId),
  });

  userId = signal(1);

  constructor(private userService: UserService) {}
}
```

## 🚀 Performance Optimizations (Angular 20+)

### OnPush with Signals

```typescript
// ✅ OnPush strategy with signals
@Component({
  selector: 'app-optimized-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="ank-p-20px">
      <div class="ank-marginBottom-16px">
        <input
          type="text"
          [value]="searchTerm()"
          (input)="searchTerm.set($any($event.target).value)"
          placeholder="Search items..."
          class="ank-width-100per ank-p-12px ank-border-1px__solid__gray-300 ank-borderRadius-4px"
        />
      </div>

      <div class="ank-display-grid ank-gridTemplateColumns-repeatSDautoCOMminmaxSD250pxCOM1frEDED ank-gap-16px">
        @for (item of filteredItems(); track item.id) {
        <div class="ank-p-16px ank-bg-white ank-borderRadius-8px ank-boxShadow-0__2px__4px__rgbaSD0COM0COM0COM0_1ED">
          <h4 class="ank-fontSize-18px ank-fontWeight-600">{{ item.name }}</h4>
          <p class="ank-color-gray-600">{{ item.description }}</p>
          <span
            class="ank-display-inline-block ank-mt-8px ank-px-8px ank-py-4px ank-bg-blue-100 ank-color-blue-800 ank-borderRadius-4px ank-fontSize-12px"
          >
            {{ item.category }}
          </span>
        </div>
        } @empty {
        <div class="ank-textAlign-center ank-p-40px ank-color-gray-500">No items found</div>
        }
      </div>
    </div>
  `,
})
export class OptimizedListComponent {
  items = signal<Item[]>([]);
  searchTerm = signal('');

  // Computed signal automatically memoizes results
  filteredItems = computed(() => {
    const term = this.searchTerm().toLowerCase();
    return this.items().filter(
      item => item.name.toLowerCase().includes(term) || item.description.toLowerCase().includes(term)
    );
  });

  constructor() {
    // Load data once
    this.loadItems();
  }

  private async loadItems(): Promise<void> {
    const items = await fetch('/api/items').then(r => r.json());
    this.items.set(items);
  }
}

type Item = {
  id: number;
  name: string;
  description: string;
  category: string;
};
```

## 📋 Best Practices Summary

### 1. Use Modern Control Flow

- Always use `@if`, `@for`, `@switch` instead of structural directives
- Implement `@defer` for non-critical content
- Use proper `@loading`, `@error`, and `@placeholder` states

### 2. Embrace Signals

- Replace reactive forms with signal-based state
- Use `computed()` for derived state
- Implement `effect()` for side effects

### 3. Standalone Architecture

- Create all components as standalone
- Use the new `input()` and `output()` APIs
- Avoid NgModules where possible

### 4. Performance First

- Use OnPush change detection with signals
- Implement proper lazy loading with `@defer`
- Leverage computed signals for memoization

### 5. Type Safety

- Use strict TypeScript configuration
- Define proper types for all inputs/outputs
- Leverage generic types for reusable components

This guide ensures the Zoolandingpage project uses the latest Angular features while maintaining compatibility with ngx-angora-css and following modern development practices.
