<script lang="ts">
    import { onMount } from 'svelte';
    import { browser } from '$app/environment';
    import { afterNavigate } from '$app/navigation';

    let canvas: HTMLCanvasElement;
    let ctx: CanvasRenderingContext2D | null;
    let isDarkMode = false;
    let animationFrameId: number;

    // Constants for density and size
    const DOT_DENSITY = 0.01; // dots per square pixel
    const MIN_RADIUS = 0.5;
    const MAX_RADIUS = 1.5;

    interface Dot {
        x: number;
        y: number;
        radius: number;
        opacity: number;
        isLight: boolean; // whether it's a lighter dot or a darker dot (for dark mode contrast)
    }

    let dots: Dot[] = [];

    function generateDots(width: number, height: number) {
        dots = [];
        const numDots = Math.floor(width * height * DOT_DENSITY);
        
        for (let i = 0; i < numDots; i++) {
            dots.push({
                x: Math.random() * width,
                y: Math.random() * height,
                radius: MIN_RADIUS + Math.random() * (MAX_RADIUS - MIN_RADIUS),
                opacity: 0.1 + Math.random() * 0.4, // Base opacity to be scaled based on mode
                isLight: Math.random() > 0.8 // 20% chance of being a lighter dot (used in dark mode)
            });
        }
    }

    function checkDarkMode() {
        if (!browser) return false;
        return document.documentElement.classList.contains('dark');
    }

    function draw() {
        if (!ctx || !canvas) return;

        const width = canvas.width;
        const height = canvas.height;

        ctx.clearRect(0, 0, width, height);

        // Update dark mode state
        isDarkMode = checkDarkMode();

        for (const dot of dots) {
            ctx.beginPath();
            ctx.arc(dot.x, dot.y, dot.radius, 0, Math.PI * 2);
            
            if (isDarkMode) {
                if (dot.isLight) {
                    ctx.fillStyle = `rgba(255, 255, 255, ${dot.opacity * 0.125})`;
                } else {
                    ctx.fillStyle = `rgba(0, 0, 0, ${dot.opacity * 0.75})`;
                }
            } else {
                ctx.fillStyle = `rgba(0, 0, 0, ${dot.opacity * 0.2})`;
            }
            
            ctx.fill();
        }
    }

    function resize() {
        if (!canvas) return;
        
        const dpr = window.devicePixelRatio || 1;
        const container = canvas.parentElement;
        if (!container) return;
        
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        
        ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.scale(dpr, dpr);
        }
        
        generateDots(width, height);
        draw();
    }

    // the canvas keeps its explicit height across client-side navigation, so a
    // tall page (e.g. the feed) would leave phantom scroll space on shorter
    // pages - re-measure once the new page has rendered
    afterNavigate(() => {
        requestAnimationFrame(resize);
    });

    onMount(() => {
        if (!browser) return;

        resize();
        window.addEventListener('resize', resize);
        
        // Use MutationObserver to watch for dark mode changes on the html element
        const observer = new MutationObserver(() => {
            draw();
        });
        
        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class']
        });

        return () => {
            window.removeEventListener('resize', resize);
            observer.disconnect();
        };
    });
</script>

<canvas
    bind:this={canvas}
    class="absolute inset-0 pointer-events-none z-0"
    aria-hidden="true"
></canvas>
