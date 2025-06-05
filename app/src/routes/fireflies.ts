
// workaround for sveltekit
// because loclstorage isn't present during server side rendering
if(!globalThis.localStorage){
    // @ts-ignore
    globalThis.localStorage = {
        getItem: () => null,
        setItem: () => {}
    }
}

let currentDarkMode = globalThis.localStorage.getItem('darkMode') === 'true';

function pollDarkMode(callback: () => void){
    const isDarkMode = globalThis.localStorage.getItem('darkMode') === 'true';
    if (isDarkMode !== currentDarkMode) {
        currentDarkMode = isDarkMode;
        callback();
    }
    setTimeout(() => {
        pollDarkMode(callback);
    }, 100);
}

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
    public isBlue: boolean;

    constructor(container: HTMLElement) {
        this.container = container;
        this.size = Math.random() * 2 + 2; // Random size between 2-4px
        this.isBlue = Math.random() > 0.5; // Randomly determine if this is a blue firefly
        
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
        
        // Start with full brightness
        this.brightness = 1;
        this.updateBrightness();
        
        // Start the animation
        this.animate();
        
        // Listen for dark mode changes in localStorage
        pollDarkMode(() => {
            // randomly change firefly colors as a random tidbit
            this.isBlue = Math.random() > 0.5;
            this.updateBrightness();
        });
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
    
    public updateBrightness(): void {
        // Check localStorage for dark mode status
        const isDarkMode = localStorage.getItem('darkMode') === 'true';
        
        // Configure colors based on firefly type and dark mode
        let glowColor;
        let backgroundColor;
        const glowSize = this.size * (isDarkMode ? 3 : 2);
        const glowIntensity = this.brightness;
        
        if (this.isBlue) {
            // Blue firefly
            glowColor = `rgba(42, 148, 230, ${glowIntensity})`;
            backgroundColor = 'rgba(42, 148, 230, 0.7)';
            this.element.classList.add('blue-firefly'); // to be able to filter easily
        } else {
            // Yellow firefly
            glowColor = `rgba(255, 255, 150, ${glowIntensity})`;
            backgroundColor = 'rgba(255, 255, 150, 0.7)';
        }
        
        // Apply styles directly based on current dark mode state
        this.element.style.backgroundColor = backgroundColor;
        this.element.style.boxShadow = `0 0 ${glowSize}px ${glowSize / 2}px ${glowColor}`;
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
        
        // Create fireflies
        this.createFireflies();
        
        // Listen for dark mode changes
        window.addEventListener('storage', (e) => {
            if (e.key === 'darkMode' && this.fireflies.length > 0) {
                // Update all fireflies when dark mode changes
                this.fireflies.forEach(firefly => {
                    firefly.isBlue = Math.random() > 0.5;
                    firefly.updateBrightness();
                });
            }
        });
    }
    
    private createFireflies(): void {
        if (!this.container) return;
        
        for (let i = 0; i < this.count; i++) {
            this.fireflies.push(new FireFly(this.container));
        }
    }
    
    public destroy(): void {
        this.fireflies.forEach(firefly => firefly.destroy());
        this.fireflies = [];
    }
}

export default FireFlies;
