class FireFly {
    private element: HTMLDivElement;
    private container: HTMLElement;
    private x: number;
    private y: number;
    private targetX: number = 0; // Initialize to fix TS error
    private targetY: number = 0; // Initialize to fix TS error
    private speedX: number;
    private speedY: number;
    private size: number;
    private brightness: number;
    private animationFrame: number | null = null;

    constructor(container: HTMLElement) {
        this.container = container;
        this.size = Math.random() * 2 + 2; // Random size between 2-4px
        
        // Create the firefly element
        this.element = document.createElement('div');
        this.element.className = 'firefly';
        this.element.style.position = 'absolute';
        this.element.style.width = `${this.size}px`;
        this.element.style.height = `${this.size}px`;
        this.element.style.borderRadius = '50%';
        this.element.style.transition = 'opacity 1s ease-in-out, box-shadow 1s ease-in-out';
        this.element.style.zIndex = '-1000';
        this.container.appendChild(this.element);
        
        // Initialize position randomly within the container
        const rect = container.getBoundingClientRect();
        this.x = Math.random() * rect.width;
        this.y = Math.random() * rect.height;
        this.updatePosition();
        
        // Set random movement parameters
        this.speedX = Math.random() * 0.5 + 0.1;
        this.speedY = Math.random() * 0.5 + 0.1;
        this.setNewTarget();
        
        // Start with random brightness
        this.brightness = 1;
        this.updateBrightness();
        
        // Start the animation
        this.animate();
    }
    
    private setNewTarget(): void {
        const rect = this.container.getBoundingClientRect();
        this.targetX = Math.random() * rect.width;
        this.targetY = Math.random() * rect.height;
    }
    
    private updatePosition(): void {
        this.element.style.left = `${this.x}px`;
        this.element.style.top = `${this.y}px`;
    }
    
    private updateBrightness(): void {
        // Style for light mode: subtle glow
        const lightModeColor = `rgba(255, 255, 150, ${this.brightness})`;  
        
        // Style for dark mode: stronger glow
        const darkModeColor = `rgba(255, 255, 150, ${this.brightness})`;  
        
        // Set the styles with different classes for light/dark mode
        this.element.style.backgroundColor = 'rgba(255, 255, 236, 1)';
        this.element.style.boxShadow = `0 0 ${this.size * 2}px ${this.size}px ${lightModeColor}`;
        
        // Add a CSS class that will be targeted by dark mode styles
        this.element.classList.add('dark-mode-glow');
        
        // Add css variable for dark mode styling
        this.element.style.setProperty('--glow-color', darkModeColor);
        this.element.style.setProperty('--glow-size', `${this.size * 3}px`);
    }
    
    private moveTowardsTarget(): void {
        // Calculate distance to target
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // If close to target, set a new one
        if (distance < 5) {
            this.setNewTarget();
        }
        
        // Move towards target
        this.x += dx * this.speedX * 0.02;
        this.y += dy * this.speedY * 0.02;
        this.updatePosition();
    }
    
    private animate = (): void => {
        this.moveTowardsTarget();
        this.animationFrame = requestAnimationFrame(this.animate);
    }
    
    public destroy(): void {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        if (this.element && this.element.parentNode) {
            this.element.parentNode.removeChild(this.element);
        }
    }
}

class FireFlies {
    private container: HTMLElement | null = null;
    private fireflies: FireFly[] = [];
    private count: number = 3;
    
    constructor(containerSelector: string, count: number = 3) {
        const container = document.querySelector(containerSelector);
        if (!container) {
            console.error('Fireflies container not found:', containerSelector);
            return;
        }
        
        this.container = container as HTMLElement;
        this.count = count;
        
        // Make the container position relative if it's not positioned
        const position = window.getComputedStyle(this.container).position;
        if (position === 'static') {
            this.container.style.position = 'relative';
        }
        
        this.createFireflies();
        this.addDarkModeStyles();
    }
    
    private createFireflies(): void {
        if (!this.container) return;
        
        for (let i = 0; i < this.count; i++) {
            this.fireflies.push(new FireFly(this.container));
        }
    }
    
    private addDarkModeStyles(): void {
        const styleTag = document.createElement('style');
        styleTag.textContent = `
            .dark .dark-mode-glow, :global(.dark) .dark-mode-glow {
                background-color: rgba(255, 255, 100, 0.3) !important;
                box-shadow: 0 0 var(--glow-size) calc(var(--glow-size) / 2) var(--glow-color) !important;
            }
        `;
        document.head.appendChild(styleTag);
    }
    
    public destroy(): void {
        this.fireflies.forEach(firefly => firefly.destroy());
        this.fireflies = [];
    }
}

export default FireFlies;
